import { VercelRequest, VercelResponse } from '@vercel/node';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

// Load environment variables
dotenv.config();

// Initialize Firebase Admin (only once)
if (!admin.apps.length) {
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
    throw error;
  }

  admin.initializeApp({
    credential: admin.credential.cert(CREDENTIALS),
  });
}

// Initialize Firestore
export const db = getFirestore();

// Create Express app
const app = express();

// Apply middleware
app.use(cors({
  origin: true,
  credentials: true,
  optionsSuccessStatus: 200
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    platform: 'vercel'
  });
});

// Load routes dynamically
const loadRoute = async (routePath: string, routeName: string) => {
  try {
    const { default: routes } = await import(`../dist/routes/${routeName}.js`);
    app.use(routePath, routes);
    console.log(`✅ Loaded route: ${routePath}`);
  } catch (error) {
    console.log(`⚠️ Route not found: ${routePath}`);
  }
};

// Initialize routes
Promise.all([
  loadRoute('/api/users', 'users'), 
  loadRoute('/api/goals', 'goals'),
  loadRoute('/api/oauth', 'oauth'),
  loadRoute('/api/admin', 'admin')
]).then(() => {
  console.log('✅ Routes initialized');
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

// Error handling middleware
app.use((err: any, req: any, res: any, next: any) => {
  console.error('Error:', err.message);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Server Error'
  });
});

// Export for Vercel
export default (req: VercelRequest, res: VercelResponse) => {
  return app(req, res);
};