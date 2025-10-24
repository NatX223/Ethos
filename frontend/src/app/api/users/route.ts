import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { firebaseService } from '@/lib/services/firebaseService';

// User interface for TypeScript
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

// Validation schema for user signup
const signupSchema = z.object({
  walletAddress: z.string()
    .regex(/^0x[a-fA-F0-9]{40}$/, 'Wallet address must be a valid Ethereum address'),

  profile: z.object({
    displayName: z.string()
      .min(2, 'Display name must be at least 2 characters')
      .max(50, 'Display name cannot exceed 50 characters')
      .optional(),

    email: z.string()
      .email('Please provide a valid email address')
      .optional(),

    bio: z.string()
      .max(200, 'Bio cannot exceed 200 characters')
      .optional()
  }).optional(),

  preferences: z.object({
    timezone: z.string().default('UTC').optional(),
    currency: z.enum(['ETH', 'USDC']).default('ETH').optional(),
    notifications: z.boolean().default(true).optional(),
    privacy: z.object({
      showProfile: z.boolean().default(true),
      showGoals: z.boolean().default(true),
      showProgress: z.boolean().default(true)
    }).optional()
  }).optional()
});

/**
 * POST /api/users - Create a new user account
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    const result = signupSchema.safeParse(body);
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

    const walletAddress = value.walletAddress.toLowerCase();

    // Check if user already exists
    const existingUser = await firebaseService.getDocument<EthosUser>('ethosuser', walletAddress);
    if (existingUser) {
      return NextResponse.json({
        success: false,
        error: 'User already exists',
        message: 'An account with this wallet address already exists'
      }, { status: 409 });
    }

    // Prepare user data
    const userData: Omit<EthosUser, 'id' | 'createdAt' | 'updatedAt'> = {
      walletAddress,
      profile: {
        displayName: value.profile?.displayName || '',
        email: value.profile?.email || '',
        bio: value.profile?.bio || '',
        avatar: ''
      },
      connectedAccounts: {
        github: {
          username: '',
          userId: '',
          isActive: false
        },
        strava: {
          username: '',
          athleteId: '',
          isActive: false
        }
      },
      preferences: {
        notifications: value.preferences?.notifications ?? true,
        timezone: value.preferences?.timezone || 'UTC',
        currency: value.preferences?.currency || 'ETH',
        privacy: {
          showProfile: value.preferences?.privacy?.showProfile ?? true,
          showGoals: value.preferences?.privacy?.showGoals ?? true,
          showProgress: value.preferences?.privacy?.showProgress ?? true
        }
      },
      stats: {
        totalGoals: 0,
        completedGoals: 0,
        failedGoals: 0,
        totalStaked: 0,
        totalEarned: 0,
        currentStreak: 0,
        longestStreak: 0
      },
      lastLoginAt: new Date()
    };

    // Create user document with wallet address as document ID
    await firebaseService.createDocument('ethosuser', userData, walletAddress);

    // Fetch the created user to return complete data
    const createdUser = await firebaseService.getDocument<EthosUser>('ethosuser', walletAddress);

    console.log(`✅ User created successfully: ${walletAddress}`);

    return NextResponse.json({
      success: true,
      message: 'User account created successfully',
      data: {
        user: createdUser
      }
    }, { status: 201 });

  } catch (error) {
    console.error('❌ Error creating user:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create user account',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}