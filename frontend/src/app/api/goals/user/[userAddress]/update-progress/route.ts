import { NextRequest, NextResponse } from 'next/server';
import { progressService } from '@/lib/services/progressService';

/**
 * POST /api/goals/user/[userAddress]/update-progress - Update progress for all goals of a specific user
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { userAddress: string } }
) {
  try {
    const { userAddress } = params;

    // Validate Ethereum address
    if (!/^0x[a-fA-F0-9]{40}$/.test(userAddress)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid Ethereum address format'
      }, { status: 400 });
    }

    // Update progress for all user goals
    const results = await progressService.updateUserGoals(userAddress);

    return NextResponse.json({
      success: true,
      message: `Updated progress for ${results.length} goals`,
      data: {
        updatedGoals: results,
        totalUpdated: results.length
      }
    });

  } catch (error) {
    console.error('❌ Error updating user goals progress:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update user goals progress',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}