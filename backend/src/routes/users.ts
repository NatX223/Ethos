import express from 'express';
import Joi from 'joi';
import { firebaseService } from '../services/firebaseService.js';
// Removed unused import

const router = express.Router();

// User interface for TypeScript
interface EthosUser {
  id?: string; // This will be the Ethereum address
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
      accessToken?: string; // encrypted
      refreshToken?: string; // encrypted
      connectedAt?: Date;
      lastSyncAt?: Date;
      isActive: boolean;
    };
    strava?: {
      username?: string;
      athleteId?: string;
      accessToken?: string; // encrypted
      refreshToken?: string; // encrypted
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
const signupSchema = Joi.object({
  walletAddress: Joi.string()
    .pattern(/^0x[a-fA-F0-9]{40}$/)
    .required()
    .messages({
      'string.pattern.base': 'Wallet address must be a valid Ethereum address',
      'any.required': 'Wallet address is required'
    }),

  profile: Joi.object({
    displayName: Joi.string()
      .min(2)
      .max(50)
      .optional()
      .messages({
        'string.min': 'Display name must be at least 2 characters',
        'string.max': 'Display name cannot exceed 50 characters'
      }),

    email: Joi.string()
      .email()
      .optional()
      .messages({
        'string.email': 'Please provide a valid email address'
      }),

    bio: Joi.string()
      .max(200)
      .optional()
      .messages({
        'string.max': 'Bio cannot exceed 200 characters'
      })
  }).optional(),

  preferences: Joi.object({
    timezone: Joi.string()
      .default('UTC')
      .optional(),

    currency: Joi.string()
      .valid('ETH', 'USDC')
      .default('ETH')
      .optional(),

    notifications: Joi.boolean()
      .default(true)
      .optional(),

    privacy: Joi.object({
      showProfile: Joi.boolean().default(true),
      showGoals: Joi.boolean().default(true),
      showProgress: Joi.boolean().default(true)
    }).optional()
  }).optional()
});

// Validation schema for user profile update
const updateProfileSchema = Joi.object({
  profile: Joi.object({
    displayName: Joi.string().min(2).max(50).optional(),
    email: Joi.string().email().optional(),
    bio: Joi.string().max(200).optional(),
    avatar: Joi.string().uri().optional()
  }).optional(),

  preferences: Joi.object({
    timezone: Joi.string().optional(),
    currency: Joi.string().valid('ETH', 'USDC').optional(),
    notifications: Joi.boolean().optional(),
    privacy: Joi.object({
      showProfile: Joi.boolean().optional(),
      showGoals: Joi.boolean().optional(),
      showProgress: Joi.boolean().optional()
    }).optional()
  }).optional()
});

/**
 * POST /api/users/signup
 * Create a new user account
 */
router.post('/signup', async (req, res) => {
  try {
    // Validate request body
    const { error, value } = signupSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }))
      });
    }

    const walletAddress = value.walletAddress.toLowerCase();

    // Check if user already exists
    const existingUser = await firebaseService.getDocument<EthosUser>('ethosuser', walletAddress);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'User already exists',
        message: 'An account with this wallet address already exists'
      });
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

    res.status(201).json({
      success: true,
      message: 'User account created successfully',
      data: {
        user: createdUser
      }
    });

  } catch (error) {
    console.error('❌ Error creating user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create user account',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

/**
 * GET /api/users/:walletAddress
 * Get user profile by wallet address
 */
router.get('/:walletAddress', async (req, res) => {
  try {
    const { walletAddress } = req.params;

    // Validate Ethereum address
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Ethereum address format'
      });
    }

    const user = await firebaseService.getDocument<EthosUser>('ethosuser', walletAddress.toLowerCase());

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
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

    res.json({
      success: true,
      data: { user: publicUser }
    });

  } catch (error) {
    console.error('❌ Error fetching user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user profile',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

/**
 * PUT /api/users/:walletAddress/profile
 * Update user profile
 */
router.put('/:walletAddress/profile', async (req, res) => {
  try {
    const { walletAddress } = req.params;

    // Validate Ethereum address
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Ethereum address format'
      });
    }

    // Validate request body
    const { error, value } = updateProfileSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }))
      });
    }

    const normalizedAddress = walletAddress.toLowerCase();

    // Check if user exists
    const existingUser = await firebaseService.getDocument<EthosUser>('ethosuser', normalizedAddress);
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
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

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user: updatedUser }
    });

  } catch (error) {
    console.error('❌ Error updating user profile:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update profile',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

/**
 * POST /api/users/:walletAddress/login
 * Update last login timestamp
 */
router.post('/:walletAddress/login', async (req, res) => {
  try {
    const { walletAddress } = req.params;

    // Validate Ethereum address
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Ethereum address format'
      });
    }

    const normalizedAddress = walletAddress.toLowerCase();

    // Check if user exists
    const existingUser = await firebaseService.getDocument<EthosUser>('ethosuser', normalizedAddress);
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Update last login timestamp
    await firebaseService.updateDocument('ethosuser', normalizedAddress, {
      lastLoginAt: new Date(),
      updatedAt: new Date()
    });

    console.log(`✅ User login recorded: ${walletAddress}`);

    res.json({
      success: true,
      message: 'Login recorded successfully',
      data: {
        walletAddress: normalizedAddress,
        lastLoginAt: new Date()
      }
    });

  } catch (error) {
    console.error('❌ Error recording login:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to record login',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

/**
 * GET /api/users/:walletAddress/stats
 * Get user statistics
 */
router.get('/:walletAddress/stats', async (req, res) => {
  try {
    const { walletAddress } = req.params;

    // Validate Ethereum address
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Ethereum address format'
      });
    }

    const normalizedAddress = walletAddress.toLowerCase();

    // Get user
    const user = await firebaseService.getDocument<EthosUser>('ethosuser', normalizedAddress);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
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

    res.json({
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
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user statistics',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

export default router;