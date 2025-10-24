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
 * GET /api/users/[walletAddress] - Get user profile by wallet address
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

    const user = await firebaseService.getDocument<EthosUser>('ethosuser', walletAddress.toLowerCase());

    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'User not found'
      }, { status: 404 });
    }

    // Remove sensitive data from response
    const publicUser = {
      ...user,
      connectedAccounts: {
        github: {
          username: user.connectedAccounts.github?.username || '',
          isActive: user.connectedAccounts.github?.isActive || false,
          connectedAt: user.connectedAccounts.github?.connectedAt
        },
        strava: {
          username: user.connectedAccounts.strava?.username || '',
          isActive: user.connectedAccounts.strava?.isActive || false,
          connectedAt: user.connectedAccounts.strava?.connectedAt
        }
      }
    };

    return NextResponse.json({
      success: true,
      data: { user: publicUser }
    });

  } catch (error) {
    console.error('❌ Error fetching user:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch user profile',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}