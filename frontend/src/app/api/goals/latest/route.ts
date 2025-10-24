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
 * GET /api/goals/latest - Get the latest goals created across all users
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') || '20';
    const offset = searchParams.get('offset') || '0';
    const category = searchParams.get('category');
    const status = searchParams.get('status') || 'active';
    const timeframe = searchParams.get('timeframe') || '7d';

    // Validate query parameters
    const limitNum = parseInt(limit);
    const offsetNum = parseInt(offset);

    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return NextResponse.json({
        success: false,
        error: 'Limit must be a number between 1 and 100'
      }, { status: 400 });
    }

    if (isNaN(offsetNum) || offsetNum < 0) {
      return NextResponse.json({
        success: false,
        error: 'Offset must be a non-negative number'
      }, { status: 400 });
    }

    // Calculate timeframe filter
    let timeframeDate: Date | null = null;
    if (timeframe) {
      const now = new Date();
      switch (timeframe) {
        case '1d':
          timeframeDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '3d':
          timeframeDate = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
          break;
        case '7d':
          timeframeDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          timeframeDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case 'all':
          timeframeDate = null;
          break;
        default:
          return NextResponse.json({
            success: false,
            error: 'Timeframe must be one of: 1d, 3d, 7d, 30d, all'
          }, { status: 400 });
      }
    }

    // Build query with filters
    const queryBuilder = (collection: any) => {
      let query = collection;

      // Filter by status if provided
      if (status && status !== 'all') {
        query = query.where('status', '==', status);
      }

      // Filter by category if provided
      if (category && category !== 'all') {
        const validCategories = ['fitness', 'coding', 'reading', 'health', 'productivity', 'learning', 'other'];
        if (!validCategories.includes(category)) {
          throw new Error('Invalid category');
        }
        query = query.where('category', '==', category);
      }

      // Filter by timeframe if provided
      if (timeframeDate) {
        query = query.where('createdAt', '>=', timeframeDate);
      }

      // Order by creation date (newest first) and apply pagination
      return query
        .orderBy('createdAt', 'desc')
        .limit(limitNum)
        .offset(offsetNum);
    };

    const goals = await firebaseService.queryDocuments<Goal>('goals', queryBuilder);

    // Calculate statistics
    const stats = {
      totalReturned: goals.length,
      categories: {} as Record<string, number>,
      statuses: {} as Record<string, number>,
      totalLockAmount: 0,
      averageLockAmount: 0
    };

    goals.forEach(goal => {
      // Count by category
      stats.categories[goal.category] = (stats.categories[goal.category] || 0) + 1;

      // Count by status
      stats.statuses[goal.status] = (stats.statuses[goal.status] || 0) + 1;

      // Calculate lock amounts
      stats.totalLockAmount += goal.lockAmount;
    });

    if (goals.length > 0) {
      stats.averageLockAmount = stats.totalLockAmount / goals.length;
    }

    // Anonymize user addresses for privacy (show only first 6 and last 4 characters)
    const anonymizedGoals = goals.map(goal => ({
      ...goal,
      userAddress: `${goal.userAddress.substring(0, 6)}...${goal.userAddress.substring(38)}`,
      // Remove sensitive data
      verificationResult: goal.verificationResult ? {
        achieved: goal.verificationResult.achieved,
        actualValue: goal.verificationResult.actualValue,
        verifiedAt: goal.verificationResult.verifiedAt,
        verificationMethod: goal.verificationResult.verificationMethod
        // Exclude txHash for privacy
      } : undefined
    }));

    return NextResponse.json({
      success: true,
      data: {
        goals: anonymizedGoals,
        pagination: {
          limit: limitNum,
          offset: offsetNum,
          hasMore: goals.length === limitNum // Indicates there might be more
        },
        filters: {
          category: category || 'all',
          status: status || 'active',
          timeframe: timeframe || '7d'
        },
        statistics: stats
      }
    });

  } catch (error) {
    console.error('❌ Error fetching latest goals:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch latest goals',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}