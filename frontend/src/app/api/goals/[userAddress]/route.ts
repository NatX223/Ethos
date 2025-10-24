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
 * GET /api/goals/[userAddress] - Get all goals for a user
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { userAddress: string } }
) {
  try {
    const { userAddress } = params;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = searchParams.get('limit') || '20';
    const offset = searchParams.get('offset') || '0';

    // Validate Ethereum address
    if (!/^0x[a-fA-F0-9]{40}$/.test(userAddress)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid Ethereum address format'
      }, { status: 400 });
    }

    // Build query
    let queryBuilder = (collection: any) => {
      let query = collection.where('userAddress', '==', userAddress.toLowerCase());

      if (status && typeof status === 'string') {
        query = query.where('status', '==', status);
      }

      return query
        .orderBy('createdAt', 'desc')
        .limit(parseInt(limit))
        .offset(parseInt(offset));
    };

    const goals = await firebaseService.queryDocuments<Goal>('goals', queryBuilder);

    return NextResponse.json({
      success: true,
      data: {
        goals,
        count: goals.length,
        userAddress: userAddress.toLowerCase()
      }
    });

  } catch (error) {
    console.error('❌ Error fetching goals:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch goals',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}