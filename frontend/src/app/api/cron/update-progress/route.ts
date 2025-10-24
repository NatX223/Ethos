import { NextRequest, NextResponse } from 'next/server';
import { progressService } from '@/lib/services/progressService';

/**
 * GET /api/cron/update-progress - Cron endpoint for Vercel Cron to update all active goals
 * This endpoint should be called by Vercel Cron or external cron service
 */
export async function GET(request: NextRequest) {
  try {
    // Verify the request is from Vercel Cron (optional security check)
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    console.log('🔄 Running scheduled progress update via cron...');
    const startTime = Date.now();

    // Update progress for all active goals
    const results = await progressService.updateAllActiveGoals();

    const duration = Date.now() - startTime;
    console.log(`✅ Scheduled progress update completed in ${duration}ms. Updated ${results.length} goals.`);

    // Log summary of updates
    if (results.length > 0) {
      const completedGoals = results.filter(r => r.isCompleted).length;
      const githubGoals = results.filter(r => r.dataSource === 'github').length;
      const stravaGoals = results.filter(r => r.dataSource === 'strava').length;
      const onchainGoals = results.filter(r => r.dataSource === 'onchain').length;

      console.log(`📊 Update summary:
        - Total updated: ${results.length}
        - Completed: ${completedGoals}
        - GitHub goals: ${githubGoals}
        - Strava goals: ${stravaGoals}
        - Onchain goals: ${onchainGoals}`);
    }

    return NextResponse.json({
      success: true,
      message: `Cron update completed. Updated ${results.length} goals.`,
      data: {
        updatedGoals: results.length,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString(),
        summary: {
          total: results.length,
          completed: results.filter(r => r.isCompleted).length,
          github: results.filter(r => r.dataSource === 'github').length,
          strava: results.filter(r => r.dataSource === 'strava').length,
          onchain: results.filter(r => r.dataSource === 'onchain').length
        }
      }
    });

  } catch (error) {
    console.error('❌ Error in cron progress update:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update goals progress',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}

/**
 * POST /api/cron/update-progress - Alternative endpoint for manual triggers
 */
export async function POST(request: NextRequest) {
  return GET(request);
}