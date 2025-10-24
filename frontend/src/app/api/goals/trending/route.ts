import { NextRequest, NextResponse } from 'next/server';
import { firebaseService } from '@/lib/services/firebaseService';

interface Goal {
  id?: string;
  title: string;
  description?: string;
  category: 'fitness' | 'productivity' | 'onchain';
  type: 'commit' | 'volume' | 'pnl' | 'distance' | 'calories' | 'streak';
  targetValue: number;
  currentValue: number;
  lockAmount: number;
  currency: 'ETH';
  deadline: Date;
  userAddress: string;
  status: 'active' | 'completed' | 'failed' | 'pending_verification' | 'cancelled';
  contractAddress: string;
  txHash: string;
  dataSource?: {
    type: 'github' | 'strava' | 'onchain';
    config?: Record<string, any>;
  };
  verificationResult?: {
    achieved: boolean;
    actualValue: number;
    verifiedAt: Date;
    txHash: string;
    verificationMethod: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

/**
 * GET /api/goals/trending - Get trending goals based on recent activity and completion rates
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') || '10';
    const category = searchParams.get('category');
    
    const limitNum = parseInt(limit);

    if (isNaN(limitNum) || limitNum < 1 || limitNum > 50) {
      return NextResponse.json({
        success: false,
        error: 'Limit must be a number between 1 and 50'
      }, { status: 400 });
    }

    // Get goals from the last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const queryBuilder = (collection: any) => {
      let query = collection.where('createdAt', '>=', thirtyDaysAgo);

      if (category && category !== 'all') {
        query = query.where('category', '==', category);
      }

      return query.orderBy('createdAt', 'desc').limit(100); // Get more to analyze
    };

    const recentGoals = await firebaseService.queryDocuments<Goal>('goals', queryBuilder);

    // Calculate trending metrics
    const goalMetrics = new Map<string, {
      title: string;
      category: string;
      count: number;
      completionRate: number;
      averageLockAmount: number;
      totalLockAmount: number;
      recentCreations: number;
    }>();

    recentGoals.forEach(goal => {
      const key = `${goal.title.toLowerCase()}_${goal.category}`;

      if (!goalMetrics.has(key)) {
        goalMetrics.set(key, {
          title: goal.title,
          category: goal.category,
          count: 0,
          completionRate: 0,
          averageLockAmount: 0,
          totalLockAmount: 0,
          recentCreations: 0
        });
      }

      const metrics = goalMetrics.get(key)!;
      metrics.count++;
      metrics.totalLockAmount += goal.lockAmount;

      // Count recent creations (last 7 days)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      if (goal.createdAt >= sevenDaysAgo) {
        metrics.recentCreations++;
      }

      // Calculate completion rate
      if (goal.status === 'completed') {
        metrics.completionRate++;
      }
    });

    // Calculate final metrics and sort by trending score
    const trendingGoals = Array.from(goalMetrics.entries())
      .map(([key, metrics]) => {
        metrics.averageLockAmount = metrics.totalLockAmount / metrics.count;
        metrics.completionRate = (metrics.completionRate / metrics.count) * 100;

        // Trending score: recent activity + completion rate + popularity
        const trendingScore =
          (metrics.recentCreations * 3) +
          (metrics.completionRate * 0.5) +
          (metrics.count * 1) +
          (Math.log(metrics.averageLockAmount + 1) * 2);

        return {
          ...metrics,
          trendingScore
        };
      })
      .sort((a, b) => b.trendingScore - a.trendingScore)
      .slice(0, limitNum);

    return NextResponse.json({
      success: true,
      data: {
        trendingGoals,
        metadata: {
          analysisTimeframe: '30 days',
          totalGoalsAnalyzed: recentGoals.length,
          categories: [...new Set(recentGoals.map(g => g.category))],
          generatedAt: new Date().toISOString()
        }
      }
    });

  } catch (error) {
    console.error('❌ Error fetching trending goals:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch trending goals',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}