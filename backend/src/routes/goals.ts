import express from 'express';
import Joi from 'joi';
import { firebaseService } from '../services/firebaseService.js';
import { ethers } from 'ethers';

const router = express.Router();

// GoalAddress interface for TypeScript
interface GoalAddress {
  id?: string;
  address: string;
  isUsed: boolean;
  createdAt?: Date;
}

// Goal interface for TypeScript
interface Goal {
  id?: string;
  title: string;
  description?: string;
  category: 'fitness' | 'coding' | 'reading' | 'health' | 'productivity' | 'learning' | 'other';
  type: 'daily' | 'weekly' | 'monthly' | 'one-time' | 'streak';
  metric: string;
  targetValue: number;
  currentValue: number;
  lockAmount: number;
  currency: 'ETH' | 'USDC';
  deadline: Date;
  userAddress: string;
  status: 'active' | 'completed' | 'failed' | 'pending_verification' | 'cancelled';
  contractAddress?: string;
  dataSource?: {
    type: 'github' | 'strava' | 'manual';
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

// Validation schema for creating a goal
const createGoalSchema = Joi.object({
  title: Joi.string()
    .min(3)
    .max(100)
    .required()
    .messages({
      'string.min': 'Title must be at least 3 characters long',
      'string.max': 'Title cannot exceed 100 characters',
      'any.required': 'Title is required'
    }),

  description: Joi.string()
    .max(500)
    .optional()
    .messages({
      'string.max': 'Description cannot exceed 500 characters'
    }),

  category: Joi.string()
    .valid('fitness', 'coding', 'reading', 'health', 'productivity', 'learning', 'other')
    .required()
    .messages({
      'any.only': 'Category must be one of: fitness, coding, reading, health, productivity, learning, other',
      'any.required': 'Category is required'
    }),

  type: Joi.string()
    .valid('daily', 'weekly', 'monthly', 'one-time', 'streak')
    .required()
    .messages({
      'any.only': 'Type must be one of: daily, weekly, monthly, one-time, streak',
      'any.required': 'Type is required'
    }),

  metric: Joi.string()
    .min(2)
    .max(50)
    .required()
    .messages({
      'string.min': 'Metric must be at least 2 characters long',
      'string.max': 'Metric cannot exceed 50 characters',
      'any.required': 'Metric is required'
    }),

  targetValue: Joi.number()
    .positive()
    .required()
    .messages({
      'number.positive': 'Target value must be a positive number',
      'any.required': 'Target value is required'
    }),

  lockAmount: Joi.number()
    .positive()
    .required()
    .messages({
      'number.positive': 'Lock amount must be a positive number',
      'any.required': 'Lock amount is required'
    }),

  currency: Joi.string()
    .valid('ETH', 'USDC')
    .default('ETH')
    .messages({
      'any.only': 'Currency must be either ETH or USDC'
    }),

  deadline: Joi.date()
    .greater('now')
    .required()
    .messages({
      'date.greater': 'Deadline must be in the future',
      'any.required': 'Deadline is required'
    }),

  userAddress: Joi.string()
    .pattern(/^0x[a-fA-F0-9]{40}$/)
    .required()
    .messages({
      'string.pattern.base': 'User address must be a valid Ethereum address',
      'any.required': 'User address is required'
    }),

  dataSource: Joi.object({
    type: Joi.string()
      .valid('github', 'strava', 'manual')
      .required(),
    config: Joi.object().optional()
  }).optional()
});

/**
 * GET /api/goals/get-contract-address
 * Get the next available goal contract address
 */
router.get('/get-contract-address', async (req, res) => {
  const startTime = Date.now();
  
  try {
    // Get the first available goal address from goalAddresses collection
    const availableAddresses = await firebaseService.queryDocuments<GoalAddress>('goalAddresses', (collection) =>
      collection.where('isUsed', '==', false).limit(1)
    );

    if (availableAddresses.length === 0) {
      
      return res.status(503).json({
        success: false,
        error: 'No available goal contracts. Please try again later.'
      });
    }

    const goalAddress = availableAddresses[0];

    res.json({
      success: true,
      data: {
        contractAddress: goalAddress.address,
        addressId: goalAddress.id
      }
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      error: 'Failed to get contract address',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

/**
 * POST /api/goals/create-with-contract
 * Create a new goal after successful blockchain transaction
 */
router.post('/create-with-contract', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const {
      title,
      description,
      category,
      type,
      metric,
      targetValue,
      lockAmount,
      currency,
      deadline,
      userAddress,
      contractAddress,
      addressId,
      txHash,
      dataSource
    } = req.body;
    // Validate required fields
    const createGoalWithContractSchema = Joi.object({
      title: Joi.string().min(3).max(100).required(),
      description: Joi.string().max(500).optional(),
      category: Joi.string().valid('fitness', 'coding', 'reading', 'health', 'productivity', 'learning', 'other').required(),
      type: Joi.string().valid('daily', 'weekly', 'monthly', 'one-time', 'streak').required(),
      metric: Joi.string().min(2).max(50).required(),
      targetValue: Joi.number().positive().required(),
      lockAmount: Joi.number().positive().required(),
      currency: Joi.string().valid('ETH', 'USDC').default('ETH'),
      deadline: Joi.date().greater('now').required(),
      userAddress: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
      contractAddress: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
      addressId: Joi.string().required(),
      txHash: Joi.string().pattern(/^0x[a-fA-F0-9]{64}$/).required(),
      dataSource: Joi.object({
        type: Joi.string().valid('github', 'strava', 'manual').required(),
        config: Joi.object().optional()
      }).optional()
    });

    const { error, value } = createGoalWithContractSchema.validate(req.body);
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

    // Verify transaction on blockchain
    const provider = new ethers.JsonRpcProvider(process.env.TESTNET_PROVIDER_URL);
    
    try {
      const receipt = await provider.getTransactionReceipt(value.txHash);
      
      if (!receipt) {        
        return res.status(400).json({
          success: false,
          error: 'Transaction not found or not confirmed'
        });
      }

      if (receipt.status !== 1) {        
        return res.status(400).json({
          success: false,
          error: 'Transaction failed on blockchain'
        });
      }

      // Verify the transaction was to the correct contract address
      if (receipt.to?.toLowerCase() !== value.contractAddress.toLowerCase()) {        
        return res.status(400).json({
          success: false,
          error: 'Transaction was not sent to the specified contract address'
        });
      }

    } catch (blockchainError) {      
      return res.status(400).json({
        success: false,
        error: 'Failed to verify transaction on blockchain'
      });
    }

    // Check if user address already has an active goal with the same title
    const existingGoals = await firebaseService.queryDocuments<Goal>('goals', (collection) =>
      collection
        .where('userAddress', '==', value.userAddress.toLowerCase())
        .where('title', '==', value.title)
        .where('status', '==', 'active')
    );

    if (existingGoals.length > 0) {
      console.log(`❌ Goal creation failed: User ${value.userAddress} already has an active goal with title ${value.title}`);
      return res.status(409).json({
        success: false,
        error: 'You already have an active goal with this title'
      });
    }

    // Convert deadline to blockchain timestamp (Unix timestamp)
    const deadlineTimestamp = Math.floor(new Date(value.deadline).getTime() / 1000);

    // Prepare goal data
    const goalData: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'> = {
      title: value.title,
      description: value.description || '',
      category: value.category,
      type: value.type,
      metric: value.metric,
      targetValue: value.targetValue,
      currentValue: 0,
      lockAmount: value.lockAmount,
      currency: value.currency || 'ETH',
      deadline: new Date(value.deadline),
      userAddress: value.userAddress.toLowerCase(),
      status: 'active',
      contractAddress: value.contractAddress,
      dataSource: value.dataSource || { type: 'manual' },
      verificationResult: {
        achieved: false,
        actualValue: 0,
        verifiedAt: new Date(),
        txHash: value.txHash,
        verificationMethod: 'blockchain'
      }
    };

    // Create the goal document
    const goalId = await firebaseService.createDocument('goals', goalData);

    // Mark the goal address as used and delete it from available addresses
    await firebaseService.deleteDocument('goalAddresses', value.addressId);

    // Fetch the created goal to return complete data
    const createdGoal = await firebaseService.getDocument<Goal>('goals', goalId);

    console.log(`✅ Goal created successfully with contract: ${goalId} for user ${value.userAddress} at ${value.contractAddress}`);

    res.status(201).json({
      success: true,
      message: 'Goal created successfully with blockchain integration',
      data: {
        goalId,
        goal: createdGoal,
        contractAddress: value.contractAddress,
        txHash: value.txHash
      }
    });

  } catch (error) {
    console.error('❌ Error creating goal with contract:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create goal with contract',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

/**
 * POST /api/goals
 * Create a new goal (legacy endpoint - kept for backward compatibility)
 */
router.post('/', async (req, res) => {
  try {
    // Validate request body
    const { error, value } = createGoalSchema.validate(req.body);
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

    // Check if user address already has an active goal with the same title
    const existingGoals = await firebaseService.queryDocuments<Goal>('goals', (collection) =>
      collection
        .where('userAddress', '==', value.userAddress.toLowerCase())
        .where('title', '==', value.title)
        .where('status', '==', 'active')
    );

    if (existingGoals.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'You already have an active goal with this title'
      });
    }

    // Prepare goal data
    const goalData: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'> = {
      title: value.title,
      description: value.description || '',
      category: value.category,
      type: value.type,
      metric: value.metric,
      targetValue: value.targetValue,
      currentValue: 0,
      lockAmount: value.lockAmount,
      currency: value.currency || 'ETH',
      deadline: new Date(value.deadline),
      userAddress: value.userAddress.toLowerCase(),
      status: 'active',
      dataSource: value.dataSource || { type: 'manual' }
    };

    // Create the goal document
    const goalId = await firebaseService.createDocument('goals', goalData);

    // Fetch the created goal to return complete data
    const createdGoal = await firebaseService.getDocument<Goal>('goals', goalId);

    console.log(`✅ Goal created successfully: ${goalId} for user ${value.userAddress}`);

    res.status(201).json({
      success: true,
      message: 'Goal created successfully',
      data: {
        goalId,
        goal: createdGoal
      }
    });

  } catch (error) {
    console.error('❌ Error creating goal:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create goal',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

/**
 * GET /api/goals/latest
 * Get the latest goals created across all users
 */
router.get('/latest', async (req, res) => {
  try {
    const {
      limit = '20',
      offset = '0',
      category,
      status = 'active',
      timeframe = '7d'
    } = req.query;

    // Validate query parameters
    const limitNum = parseInt(limit as string);
    const offsetNum = parseInt(offset as string);

    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({
        success: false,
        error: 'Limit must be a number between 1 and 100'
      });
    }

    if (isNaN(offsetNum) || offsetNum < 0) {
      return res.status(400).json({
        success: false,
        error: 'Offset must be a non-negative number'
      });
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
          return res.status(400).json({
            success: false,
            error: 'Timeframe must be one of: 1d, 3d, 7d, 30d, all'
          });
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
        if (!validCategories.includes(category as string)) {
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

    res.json({
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
    res.status(500).json({
      success: false,
      error: 'Failed to fetch latest goals',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

/**
 * GET /api/goals/trending
 * Get trending goals based on recent activity and completion rates
 */
router.get('/trending', async (req, res) => {
  try {
    const { limit = '10', category } = req.query;
    const limitNum = parseInt(limit as string);

    if (isNaN(limitNum) || limitNum < 1 || limitNum > 50) {
      return res.status(400).json({
        success: false,
        error: 'Limit must be a number between 1 and 50'
      });
    }

    // Get goals from the last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const queryBuilder = (collection: any) => {
      let query = collection.where('createdAt', '>=', thirtyDaysAgo);

      if (category && category !== 'all') {
        query = query.where('category', '==', category);
      }

      return query.orderBy('createdAt', 'desc').limit(100); // Get more to analyze
    };

    const recentGoals = await firebaseService.queryDocuments<Goal>('goals', queryBuilder);

    // Calculate trending metrics
    const goalMetrics = new Map<string, {
      title: string;
      category: string;
      count: number;
      completionRate: number;
      averageLockAmount: number;
      totalLockAmount: number;
      recentCreations: number;
    }>();

    recentGoals.forEach(goal => {
      const key = `${goal.title.toLowerCase()}_${goal.category}`;

      if (!goalMetrics.has(key)) {
        goalMetrics.set(key, {
          title: goal.title,
          category: goal.category,
          count: 0,
          completionRate: 0,
          averageLockAmount: 0,
          totalLockAmount: 0,
          recentCreations: 0
        });
      }

      const metrics = goalMetrics.get(key)!;
      metrics.count++;
      metrics.totalLockAmount += goal.lockAmount;

      // Count recent creations (last 7 days)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      if (goal.createdAt >= sevenDaysAgo) {
        metrics.recentCreations++;
      }

      // Calculate completion rate
      if (goal.status === 'completed') {
        metrics.completionRate++;
      }
    });

    // Calculate final metrics and sort by trending score
    const trendingGoals = Array.from(goalMetrics.entries())
      .map(([key, metrics]) => {
        metrics.averageLockAmount = metrics.totalLockAmount / metrics.count;
        metrics.completionRate = (metrics.completionRate / metrics.count) * 100;

        // Trending score: recent activity + completion rate + popularity
        const trendingScore =
          (metrics.recentCreations * 3) +
          (metrics.completionRate * 0.5) +
          (metrics.count * 1) +
          (Math.log(metrics.averageLockAmount + 1) * 2);

        return {
          ...metrics,
          trendingScore
        };
      })
      .sort((a, b) => b.trendingScore - a.trendingScore)
      .slice(0, limitNum);

    res.json({
      success: true,
      data: {
        trendingGoals,
        metadata: {
          analysisTimeframe: '30 days',
          totalGoalsAnalyzed: recentGoals.length,
          categories: [...new Set(recentGoals.map(g => g.category))],
          generatedAt: new Date().toISOString()
        }
      }
    });

  } catch (error) {
    console.error('❌ Error fetching trending goals:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch trending goals',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

/**
 * GET /api/goals/:userAddress
 * Get all goals for a user
 */
router.get('/:userAddress', async (req, res) => {
  try {
    const { userAddress } = req.params;
    const { status, limit = '20', offset = '0' } = req.query;

    // Validate Ethereum address
    if (!/^0x[a-fA-F0-9]{40}$/.test(userAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Ethereum address format'
      });
    }

    // Build query
    let queryBuilder = (collection: any) => {
      let query = collection.where('userAddress', '==', userAddress.toLowerCase());

      if (status && typeof status === 'string') {
        query = query.where('status', '==', status);
      }

      return query
        .orderBy('createdAt', 'desc')
        .limit(parseInt(limit as string))
        .offset(parseInt(offset as string));
    };

    const goals = await firebaseService.queryDocuments<Goal>('goals', queryBuilder);

    res.json({
      success: true,
      data: {
        goals,
        count: goals.length,
        userAddress: userAddress.toLowerCase()
      }
    });

  } catch (error) {
    console.error('❌ Error fetching goals:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch goals',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

/**
 * GET /api/goals/goal/:goalId
 * Get a specific goal by ID
 */
router.get('/goal/:goalId', async (req, res) => {
  try {
    const { goalId } = req.params;

    const goal = await firebaseService.getDocument<Goal>('goals', goalId);

    if (!goal) {
      return res.status(404).json({
        success: false,
        error: 'Goal not found'
      });
    }

    res.json({
      success: true,
      data: { goal }
    });

  } catch (error) {
    console.error('❌ Error fetching goal:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch goal',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

/**
 * PUT /api/goals/:goalId/progress
 * Update goal progress (manual update)
 */
router.put('/:goalId/progress', async (req, res) => {
  try {
    const { goalId } = req.params;
    const { currentValue, userAddress } = req.body;

    // Validate input
    if (typeof currentValue !== 'number' || currentValue < 0) {
      return res.status(400).json({
        success: false,
        error: 'Current value must be a non-negative number'
      });
    }

    if (!userAddress || !/^0x[a-fA-F0-9]{40}$/.test(userAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Valid user address is required'
      });
    }

    // Get the goal
    const goal = await firebaseService.getDocument<Goal>('goals', goalId);
    if (!goal) {
      return res.status(404).json({
        success: false,
        error: 'Goal not found'
      });
    }

    // Verify ownership
    if (goal.userAddress !== userAddress.toLowerCase()) {
      return res.status(403).json({
        success: false,
        error: 'You can only update your own goals'
      });
    }

    // Check if goal is still active
    if (goal.status !== 'active') {
      return res.status(400).json({
        success: false,
        error: 'Can only update progress for active goals'
      });
    }

    // Update progress
    await firebaseService.updateDocument('goals', goalId, {
      currentValue,
      updatedAt: new Date()
    });

    // Check if goal is completed
    let newStatus = goal.status;
    if (currentValue >= goal.targetValue) {
      newStatus = 'completed';
      await firebaseService.updateDocument('goals', goalId, {
        status: newStatus,
        verificationResult: {
          achieved: true,
          actualValue: currentValue,
          verifiedAt: new Date(),
          verificationMethod: 'manual'
        }
      });
    }

    res.json({
      success: true,
      message: 'Goal progress updated successfully',
      data: {
        goalId,
        currentValue,
        targetValue: goal.targetValue,
        status: newStatus,
        completed: currentValue >= goal.targetValue
      }
    });

  } catch (error) {
    console.error('❌ Error updating goal progress:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update goal progress',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

export default router;