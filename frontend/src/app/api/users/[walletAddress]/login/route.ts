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
 * POST /api/users/[walletAddress]/login - Update last login timestamp
 */
export async function POST(
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

    // Check if user exists
    const existingUser = await firebaseService.getDocument<EthosUser>('ethosuser', normalizedAddress);
    if (!existingUser) {
      return NextResponse.json({
        success: false,
        error: 'User not found'
      }, { status: 404 });
    }

    // Update last login timestamp
    await firebaseService.updateDocument('ethosuser', normalizedAddress, {
      lastLoginAt: new Date(),
      updatedAt: new Date()
    });

    console.log(`✅ User login recorded: ${walletAddress}`);

    return NextResponse.json({
      success: true,
      message: 'Login recorded successfully',
      data: {
        walletAddress: normalizedAddress,
        lastLoginAt: new Date()
      }
    });

  } catch (error) {
    console.error('❌ Error recording login:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to record login',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}