import { NextRequest, NextResponse } from 'next/server';
import { firebaseService } from '@/lib/services/firebaseService';
import { progressService } from '@/lib/services/progressService';

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
 * POST /api/goals/[goalId]/update-progress - Automatically update goal progress from data source
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { goalId: string } }
) {
  try {
    const { goalId } = params;
    const body = await request.json();
    const { userAddress } = body;

    // Validate user address if provided
    if (userAddress && !/^0x[a-fA-F0-9]{40}$/.test(userAddress)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid user address format'
      }, { status: 400 });
    }

    // Get the goal to verify ownership if userAddress is provided
    if (userAddress) {
      const goal = await firebaseService.getDocument<Goal>('goals', goalId);
      if (!goal) {
        return NextResponse.json({
          success: false,
          error: 'Goal not found'
        }, { status: 404 });
      }

      // Verify ownership
      if (goal.userAddress !== userAddress.toLowerCase()) {
        return NextResponse.json({
          success: false,
          error: 'You can only update your own goals'
        }, { status: 403 });
      }
    }

    // Update progress using the progress service
    const result = await progressService.updateGoalProgress(goalId);

    if (!result) {
      return NextResponse.json({
        success: false,
        error: 'Goal progress could not be updated. Goal may be inactive, expired, or use manual tracking.'
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Goal progress updated successfully',
      data: result
    });

  } catch (error) {
    console.error('❌ Error updating goal progress:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update goal progress',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}