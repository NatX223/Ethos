import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
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
import { schedulerService } from './services/schedulerService.js';
import { deadlineService } from './services/deadlineService.js';

// Load environment variables
dotenv.config();

// Initialize Firebase Admin
let CREDENTIALS;
try {
  const credBase64 = process.env.CRED;
  if (!credBase64) {
    throw new Error('CRED environment variable is not set');
  }
  
  CREDENTIALS = JSON.parse(
    Buffer.from(credBase64, 'base64').toString('utf-8')
  );
} catch (error) {
  console.error('❌ Failed to parse Firebase credentials:', error);
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(CREDENTIALS),
});

// Initialize Firestore
export const db = getFirestore();

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Initialize cron jobs
let cronManager: CronJobManager;

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  if (cronManager) {
    await cronManager.stopAllJobs();
  }
  schedulerService.stop();
  deadlineService.stop();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  if (cronManager) {
    await cronManager.stopAllJobs();
  }
  schedulerService.stop();
  deadlineService.stop();
  process.exit(0);
});

// Start server
async function startServer() {
  try {
    // Load middleware
    let errorHandler = fallbackErrorHandler;
    let requestLogger = fallbackRequestLogger;
    let corsOptions: any = fallbackCorsOptions;

    try {
      const middleware = await import('./middleware/auth.js');
      errorHandler = middleware.errorHandler;
      requestLogger = middleware.requestLogger;
      corsOptions = middleware.corsOptions;
      console.log('✅ Loaded custom middleware');
    } catch (error) {
      console.log('⚠️  Using fallback middleware');
    }

    // Apply middleware
    app.use(cors(corsOptions));
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true }));
    app.use(requestLogger);

    // Health check endpoint
    app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0'
      });
    });

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
          console.log(`✅ Loaded route: ${routePath} (${path})`);
          return;
        } catch (error) {
          // Continue to next path
        }
      }
      console.log(`⚠️  Route not found: ${routePath}`);
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
    await db.collection('_health').doc('test').set({
      timestamp: new Date(),
      status: 'connected'
    });
    console.log('✅ Firebase Firestore connected successfully');

    // Initialize and start cron jobs
    cronManager = new CronJobManager();
    await cronManager.initializeJobs();
    console.log('✅ Cron jobs initialized');

    // Start goal progress scheduler
    schedulerService.start();
    console.log('✅ Goal progress scheduler started');

    // Start deadline checker
    deadlineService.start();
    console.log('✅ Deadline checker started');

    // Start Express server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`🔥 Environment: ${process.env.NODE_ENV || 'development'}`);
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

export default app;