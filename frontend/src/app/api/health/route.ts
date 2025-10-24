import { NextRequest, NextResponse } from 'next/server';
import { firebaseService } from '@/lib/services/firebaseService';

/**
 * GET /api/health - Health check endpoint
 */
export async function GET(request: NextRequest) {
  try {
    // Test Firebase connection
    await firebaseService.getCollection('_health').doc('test').set({
      timestamp: new Date(),
      status: 'connected'
    });

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      services: {
        firebase: 'connected',
        api: 'operational'
      }
    });

  } catch (error) {
    console.error('❌ Health check failed:', error);
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      services: {
        firebase: 'error',
        api: 'operational'
      }
    }, { status: 500 });
  }
}