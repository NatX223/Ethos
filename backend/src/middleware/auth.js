import jwt from 'jsonwebtoken';
import User from '../models/user.js';
import { logger } from '../services/logger.js';
import { v4 as uuidv4 } from 'uuid';

// Simple JWT authentication middleware
export const authenticateToken = async (req, res, next) => {
  const startTime = Date.now();
  
  try {
    logger.debug('Authentication attempt started', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.originalUrl,
      method: req.method
    });

    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      logger.logSecurityEvent('Missing authentication token', 'MEDIUM', {
        ip: req.ip,
        url: req.originalUrl,
        userAgent: req.get('User-Agent')
      });
      
      return res.status(401).json({ 
        success: false,
        error: 'Access token required' 
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    
    logger.debug('JWT token verified successfully', {
      userId: decoded.userId,
      tokenExp: new Date(decoded.exp * 1000)
    });
    
    // Find user by ID from token
    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      logger.logSecurityEvent('Authentication failed - user not found', 'HIGH', {
        userId: decoded.userId,
        ip: req.ip,
        url: req.originalUrl
      });
      
      return res.status(401).json({ 
        success: false,
        error: 'User not found' 
      });
    }

    // Attach user to request object
    req.user = user;
    
    const duration = Date.now() - startTime;
    logger.logPerformance('Authentication', duration, {
      userId: user._id,
      success: true
    });
    
    logger.info('User authenticated successfully', {
      userId: user._id,
      ip: req.ip,
      duration: `${duration}ms`
    });
    
    next();
    
  } catch (error) {
    const duration = Date.now() - startTime;
    
    if (error.name === 'JsonWebTokenError') {
      logger.logSecurityEvent('Invalid JWT token', 'HIGH', {
        error: error.message,
        ip: req.ip,
        url: req.originalUrl,
        duration: `${duration}ms`
      });
    } else if (error.name === 'TokenExpiredError') {
      logger.logSecurityEvent('Expired JWT token', 'MEDIUM', {
        error: error.message,
        ip: req.ip,
        url: req.originalUrl,
        duration: `${duration}ms`
      });
    } else {
      logger.logError(error, req, { context: 'Authentication middleware' });
    }
    
    return res.status(403).json({ 
      success: false,
      error: 'Invalid or expired token' 
    });
  }
};

// Optional: Middleware for routes that can work with or without authentication
export const optionalAuth = async (req, res, next) => {
  const startTime = Date.now();
  
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      logger.debug('Optional authentication attempt', {
        ip: req.ip,
        url: req.originalUrl
      });
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
      const user = await User.findById(decoded.userId).select('-password');
      
      if (user) {
        req.user = user;
        logger.debug('Optional authentication successful', {
          userId: user._id,
          duration: `${Date.now() - startTime}ms`
        });
      } else {
        logger.warn('Optional authentication failed - user not found', {
          userId: decoded.userId,
          duration: `${Date.now() - startTime}ms`
        });
      }
    }
    next();
  } catch (error) {
    // If token is invalid, just continue without user
    logger.debug('Optional authentication failed, continuing without user', {
      error: error.message,
      duration: `${Date.now() - startTime}ms`
    });
    next();
  }
};

// Generate JWT token (utility function)
export const generateToken = (userId) => {
  return jwt.sign(
    { userId }, 
    process.env.JWT_SECRET || 'fallback-secret', 
    { expiresIn: '30d' }
  );
};

// Simple request logger middleware
export const requestLogger = (req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
  next();
};

// Error handler middleware
export const errorHandler = (err, req, res, next) => {
  console.error('Error:', err.message);
  
  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(val => val.message);
    return res.status(400).json({
      success: false,
      error: messages.join(', ')
    });
  }
  
  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({
      success: false,
      error: `${field} already exists`
    });
  }
  
  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: 'Invalid token'
    });
  }
  
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: 'Token expired'
    });
  }

  // Default error
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Server Error'
  });
};

// CORS configuration
export const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow all origins in development
    if (process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    
    // In production, you can specify allowed origins
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://yourapp.com'
    ];
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};