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
 * GET /api/goals/goal/[goalId] - Get a specific goal by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { goalId: string } }
) {
  try {
    const { goalId } = params;

    const goal = await firebaseService.getDocument<Goal>('goals', goalId);

    if (!goal) {
      return NextResponse.json({
        success: false,
        error: 'Goal not found'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: { goal }
    });

  } catch (error) {
    console.error('❌ Error fetching goal:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch goal',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}