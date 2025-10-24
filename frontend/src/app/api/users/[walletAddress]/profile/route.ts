import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
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

// Validation schema for user profile update
const updateProfileSchema = z.object({
  profile: z.object({
    displayName: z.string().min(2).max(50).optional(),
    email: z.string().email().optional(),
    bio: z.string().max(200).optional(),
    avatar: z.string().url().optional()
  }).optional(),

  preferences: z.object({
    timezone: z.string().optional(),
    currency: z.enum(['ETH', 'USDC']).optional(),
    notifications: z.boolean().optional(),
    privacy: z.object({
      showProfile: z.boolean().optional(),
      showGoals: z.boolean().optional(),
      showProgress: z.boolean().optional()
    }).optional()
  }).optional()
});

/**
 * PUT /api/users/[walletAddress]/profile - Update user profile
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { walletAddress: string } }
) {
  try {
    const { walletAddress } = params;
    const body = await request.json();

    // Validate Ethereum address
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid Ethereum address format'
      }, { status: 400 });
    }

    // Validate request body
    const result = updateProfileSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        details: result.error.errors.map(error => ({
          field: error.path.join('.'),
          message: error.message
        }))
      }, { status: 400 });
    }

    const value = result.data;

    const normalizedAddress = walletAddress.toLowerCase();

    // Check if user exists
    const existingUser = await firebaseService.getDocument<EthosUser>('ethosuser', normalizedAddress);
    if (!existingUser) {
      return NextResponse.json({
        success: false,
        error: 'User not found'
      }, { status: 404 });
    }

    // Prepare update data
    const updateData: any = {
      updatedAt: new Date()
    };

    if (value.profile) {
      updateData.profile = {
        ...existingUser.profile,
        ...value.profile
      };
    }

    if (value.preferences) {
      updateData.preferences = {
        ...existingUser.preferences,
        ...value.preferences
      };

      // Handle nested privacy object
      if (value.preferences.privacy) {
        updateData.preferences.privacy = {
          ...existingUser.preferences.privacy,
          ...value.preferences.privacy
        };
      }
    }

    // Update user document
    await firebaseService.updateDocument('ethosuser', normalizedAddress, updateData);

    // Fetch updated user
    const updatedUser = await firebaseService.getDocument<EthosUser>('ethosuser', normalizedAddress);

    console.log(`✅ User profile updated: ${walletAddress}`);

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user: updatedUser }
    });

  } catch (error) {
    console.error('❌ Error updating user profile:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update profile',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}