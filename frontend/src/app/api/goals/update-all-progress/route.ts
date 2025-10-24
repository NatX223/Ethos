import { NextRequest, NextResponse } from 'next/server';
import { progressService } from '@/lib/services/progressService';

/**
 * POST /api/goals/update-all-progress - Update progress for all active goals (admin/cron endpoint)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { adminKey } = body;

    // Simple admin key check (in production, use proper authentication)
    if (adminKey !== process.env.ADMIN_API_KEY) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    // Update progress for all active goals
    const results = await progressService.updateAllActiveGoals();

    return NextResponse.json({
      success: true,
      message: `Batch update completed. Updated ${results.length} goals.`,
      data: {
        updatedGoals: results,
        totalUpdated: results.length,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error in batch progress update:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update all goals progress',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}