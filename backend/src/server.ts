import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from './services/logger.js';
import { monitoring } from './services/monitoring.js';
import { monitoringMiddleware, createMonitoringRoutes } from './middleware/monitoring.js';
// Fallback middleware definitions
const fallbackRequestLogger = (req: any, res: any, next: any) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
  next();
};

const fallbackErrorHandler = (err: any, req: any, res: any, next: any) => {
  console.error('Error:', err.message);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Server Error'
  });
};

const fallbackCorsOptions = {
  origin: true,
  credentials: true,
  optionsSuccessStatus: 200
};
import { CronJobManager } from './services/cronJobManager.js';

// Load environment variables
dotenv.config();

logger.info('Starting server initialization', {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 3000,
  logLevel: process.env.LOG_LEVEL || 'INFO'
});

// Initialize Firebase Admin
let CREDENTIALS;
try {
  logger.debug('Initializing Firebase credentials');
  
  const credBase64 = process.env.CRED;
  if (!credBase64) {
    throw new Error('CRED environment variable is not set');
  }
  
  CREDENTIALS = JSON.parse(
    Buffer.from(credBase64, 'base64').toString('utf-8')
  );
  
  logger.info('Firebase credentials parsed successfully');
} catch (error) {
  logger.logError(error as Error, undefined, { context: 'Firebase credentials initialization' });
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(CREDENTIALS),
});

logger.info('Firebase Admin initialized successfully');

// Initialize Firestore
export const db = getFirestore();
logger.info('Firestore initialized successfully');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Initialize cron jobs
let cronManager: CronJobManager;

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  if (cronManager) {
    await cronManager.stopAllJobs();
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  if (cronManager) {
    await cronManager.stopAllJobs();
  }
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.logError(error, undefined, { context: 'Uncaught exception' });
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled promise rejection', {
    reason: reason instanceof Error ? reason.message : reason,
    stack: reason instanceof Error ? reason.stack : undefined,
    promise: promise.toString()
  });
});

// Start server
async function startServer() {
  try {
    // Load middleware
    let errorHandler = fallbackErrorHandler;
    let requestLogger = fallbackRequestLogger;
    let corsOptions = fallbackCorsOptions;

    try {
      const middleware = await import('./middleware/auth.js');
      errorHandler = middleware.errorHandler;
      requestLogger = middleware.requestLogger;
      corsOptions = middleware.corsOptions;
      logger.info('Custom middleware loaded successfully');
    } catch (error) {
      logger.warn('Failed to load custom middleware, using fallback', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Apply middleware
    app.use(cors(corsOptions));
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true }));
    app.use(requestLogger);
    app.use(monitoringMiddleware);
    
    logger.debug('Middleware applied successfully');

    // Health check endpoint (basic)
    app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0'
      });
    });

    // Monitoring endpoints
    app.use('/api/monitoring', createMonitoringRoutes());
    logger.debug('Monitoring endpoints configured');

    // API Routes - Load routes dynamically if they exist
    const loadRoute = async (routePath: string, routeName: string) => {
      const possiblePaths = [
        `./routes/${routeName}.ts`,
        `./routes/${routeName}.js`
      ];
      
      for (const path of possiblePaths) {
        try {
          const { default: routes } = await import(path);
          app.use(routePath, routes);
          logger.info('Route loaded successfully', {
            routePath,
            filePath: path
          });
          return;
        } catch (error) {
          logger.debug('Route file not found', {
            routePath,
            filePath: path,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
      logger.warn('Route not found', { routePath });
    };

    // Load available routes
    await Promise.all([
      loadRoute('/api/auth', 'auth'),
      loadRoute('/api/users', 'users'), 
      loadRoute('/api/goals', 'goals'),
      loadRoute('/api/oauth', 'oauth')
    ]);

    // 404 handler
    app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        error: 'Route not found'
      });
    });

    // Error handling middleware
    app.use(errorHandler);

    // Test Firebase connection
    logger.debug('Testing Firebase connection');
    await db.collection('_health').doc('test').set({
      timestamp: new Date(),
      status: 'connected'
    });
    logger.info('Firebase Firestore connected successfully');

    // Initialize and start cron jobs
    logger.debug('Initializing cron jobs');
    cronManager = new CronJobManager();
    await cronManager.initializeJobs();
    logger.info('Cron jobs initialized successfully');

    // Start Express server
    app.listen(PORT, () => {
      logger.info('Server started successfully', {
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        healthCheck: `http://localhost:${PORT}/health`,
        monitoring: `http://localhost:${PORT}/api/monitoring/health`,
        logLevel: process.env.LOG_LEVEL || 'INFO'
      });
    });

  } catch (error) {
    logger.logError(error as Error, undefined, { context: 'Server startup' });
    process.exit(1);
  }
}

// Start the server
startServer();

export default app;