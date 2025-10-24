import { NextRequest, NextResponse } from 'next/server';
import { firebaseService } from '@/lib/services/firebaseService';

// GoalAddress interface for TypeScript
interface GoalAddress {
  id?: string;
  address: string;
  isUsed?: boolean;
}

/**
 * GET /api/goals/contract-address - Get a goal contract address from the goalAddresses collection
 */
export async function GET(request: NextRequest) {
  try {
    // Query the goalAddresses collection to get one contract address
    const goalAddresses = await firebaseService.queryDocuments<GoalAddress>('goalAddresses', (collection) =>
      collection.limit(1)
    );

    if (goalAddresses.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No goal contract addresses found'
      }, { status: 404 });
    }

    // Get the first contract address
    const contractData: GoalAddress = goalAddresses[0];

    return NextResponse.json({
      success: true,
      data: {
        contractAddress: contractData.address,
      }
    });

  } catch (error) {
    console.error('❌ Error fetching goal contract address:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch goal contract address',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}