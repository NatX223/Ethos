import { NextRequest, NextResponse } from 'next/server';
import { firebaseService } from '@/lib/services/firebaseService';

interface EthosUser {
  id?: string;
  walletAddress: string;
  profile: {
    displayName?: string;
    email?: string;
    avatar?: string;
    bio?: string;
  };
  connectedAccounts: {
    github?: {
      username?: string;
      userId?: string;
      accessToken?: string;
      refreshToken?: string;
      connectedAt?: Date;
      lastSyncAt?: Date;
      isActive: boolean;
    };
    strava?: {
      username?: string;
      athleteId?: string;
      accessToken?: string;
      refreshToken?: string;
      connectedAt?: Date;
      lastSyncAt?: Date;
      isActive: boolean;
    };
  };
  preferences: {
    notifications: boolean;
    timezone: string;
    currency: 'ETH' | 'USDC';
    privacy: {
      showProfile: boolean;
      showGoals: boolean;
      showProgress: boolean;
    };
  };
  stats: {
    totalGoals: number;
    completedGoals: number;
    failedGoals: number;
    totalStaked: number;
    totalEarned: number;
    currentStreak: number;
    longestStreak: number;
  };
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}

/**
 * GET /api/users/[walletAddress]/stats - Get user statistics
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { walletAddress: string } }
) {
  try {
    const { walletAddress } = params;

    // Validate Ethereum address
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid Ethereum address format'
      }, { status: 400 });
    }

    const normalizedAddress = walletAddress.toLowerCase();

    // Get user
    const user = await firebaseService.getDocument<EthosUser>('ethosuser', normalizedAddress);
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'User not found'
      }, { status: 404 });
    }

    // Get user's goals for real-time stats calculation
    const userGoals = await firebaseService.queryDocuments('goals', (collection) =>
      collection.where('userAddress', '==', normalizedAddress)
    );

    // Calculate real-time stats with proper typing
    const realTimeStats = {
      totalGoals: userGoals.length,
      completedGoals: userGoals.filter((g: any) => g.status === 'completed').length,
      failedGoals: userGoals.filter((g: any) => g.status === 'failed').length,
      activeGoals: userGoals.filter((g: any) => g.status === 'active').length,
      totalStaked: userGoals.reduce((sum: number, g: any) => sum + (g.lockAmount || 0), 0),
      // Add more calculations as needed
    };

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          ...user.stats,
          ...realTimeStats
        },
        lastUpdated: new Date()
      }
    });

  } catch (error) {
    console.error('❌ Error fetching user stats:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch user statistics',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}