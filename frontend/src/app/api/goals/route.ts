import { NextRequest, NextResponse } from 'next/server';
import { firebaseService } from '@/lib/services/firebaseService';
import { optional } from 'zod';
import { string } from 'zod';
import { z } from 'zod/v4-mini';
import { z } from 'zod/v4-mini';
import { z } from 'zod/v4-mini';
import { z } from 'zod/v4-mini';
import { z } from 'zod/v4-mini';
import { z } from 'zod/v4-mini';
import { z } from 'zod/v4-mini';
import { z } from 'zod/v4-mini';
import { z } from 'zod/v4-mini';
import { z } from 'zod/v4-mini';
import { z } from 'zod/v4-mini';
import { z } from 'zod/v4-mini';
import { z } from 'zod/v4-mini';
import { z } from 'zod/v4-mini';
import { z } from 'zod/v4-mini';
import { z } from 'zod/v4-mini';
import { z } from 'zod/v4-mini';

// GoalAddress interface for TypeScript
interface GoalAddress {
  id?: string;
  address: string;
  isUsed?: boolean;
}

// Goal interface for TypeScript
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

// Validation schema for creating a goal
const createGoalSchema = z.object({
  title: z.string()
    .min(3, 'Title must be at least 3 characters long')
    .max(100, 'Title cannot exceed 100 characters'),

  description: z.string()
    .max(500, 'Description cannot exceed 500 characters')
    .optional(),

  category: z.enum(['fitness', 'productivity', 'onchain'], {
    errorMap: () => ({ message: 'Category must be one of: fitness, productivity, onchain' })
  }),

  type: z.enum(['commit', 'volume', 'pnl', 'distance', 'calories', 'streak'], {
    errorMap: () => ({ message: 'Type must be one of: commit, volume, pnl, distance, calories, streak' })
  }),

  targetValue: z.number()
    .positive('Target value must be a positive number'),

  lockAmount: z.number()
    .positive('Lock amount must be a positive number'),

  currency: z.enum(['ETH']).default('ETH'),

  deadline: z.string()
    .or(z.date())
    .refine((date) => {
      const parsedDate = new Date(date);
      return parsedDate > new Date();
    }, 'Deadline must be in the future'),

  userAddress: z.string()
    .regex(/^0x[a-fA-F0-9]{40}$/, 'User address must be a valid Ethereum address'),

  contractAddress: z.string()
    .regex(/^0x[a-fA-F0-9]{40}$/, 'Contract address must be a valid Ethereum address'),

  txHash: z.string()
    .regex(/^0x[a-fA-F0-9]{64}$/, 'Transaction hash must be a valid Ethereum transaction hash'),

  dataSource: z.object({
    type: z.enum(['github', 'strava', 'onchain', 'manual']),
    config: z.record(z.any()).optional()
  }).optional()
});

/**
 * POST /api/goals - Create a new goal
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    const result = createGoalSchema.safeParse(body);
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

    // Check if user address already has an active goal with the same title
    const existingGoals = await firebaseService.queryDocuments<Goal>('goals', (collection) =>
      collection
        .where('userAddress', '==', value.userAddress.toLowerCase())
        .where('title', '==', value.title)
        .where('status', '==', 'active')
    );

    if (existingGoals.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'You already have an active goal with this title'
      }, { status: 409 });
    }

    // Check if transaction hash already exists
    const existingTxGoals = await firebaseService.queryDocuments<Goal>('goals', (collection) =>
      collection.where('txHash', '==', value.txHash)
    );

    if (existingTxGoals.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'A goal with this transaction hash already exists'
      }, { status: 409 });
    }

    // Prepare goal data
    const goalData: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'> = {
      title: value.title,
      description: value.description || '',
      category: value.category,
      type: value.type,
      targetValue: value.targetValue,
      currentValue: 0,
      lockAmount: value.lockAmount,
      currency: value.currency || 'ETH',
      deadline: new Date(value.deadline),
      userAddress: value.userAddress.toLowerCase(),
      contractAddress: value.contractAddress,
      txHash: value.txHash,
      status: 'active',
      dataSource: value.dataSource || { type: 'manual' }
    };

    // Create the goal document
    const goalId = await firebaseService.createDocument('goals', goalData);

    // Delete the used contract address from goalAddresses collection
    try {
      const contractAddresses = await firebaseService.queryDocuments<GoalAddress>('goalAddresses', (collection) =>
        collection.where('address', '==', value.contractAddress)
      );

      if (contractAddresses.length > 0) {
        const contractDoc = contractAddresses[0];
        if (contractDoc.id) {
          await firebaseService.deleteDocument('goalAddresses', contractDoc.id);
          console.log(`✅ Deleted used contract address: ${value.contractAddress}`);
        }
      }
    } catch (deleteError) {
      console.warn('⚠️ Failed to delete contract address, but goal was created:', deleteError);
    }

    // Fetch the created goal to return complete data
    const createdGoal = await firebaseService.getDocument<Goal>('goals', goalId);

    console.log(`✅ Goal created successfully: ${goalId} for user ${value.userAddress}`);

    return NextResponse.json({
      success: true,
      message: 'Goal created successfully',
      data: {
        goalId,
        goal: createdGoal
      }
    }, { status: 201 });

  } catch (error) {
    console.error('❌ Error creating goal:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create goal',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}