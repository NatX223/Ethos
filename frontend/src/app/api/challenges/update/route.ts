import { NextResponse } from 'next/server';
import { db } from '~/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';

export async function POST(
  request: Request,
) {
  try {
    const { timelineId, coinAddress } = await request.json();
    
    if (!coinAddress) {
      return NextResponse.json(
        { error: 'Coin address is required' },
        { status: 400 }
      );
    }

    console.log('Updating timeline with coin address:', {
      timelineId,
      coinAddress
    });

    const timelineRef = doc(db, 'timelines', timelineId);
    await updateDoc(timelineRef, {
      coinAddress,
      updatedAt: new Date().toISOString()
    });

    console.log('Timeline updated successfully');

    return NextResponse.json({
      success: true,
      timelineId: timelineId,
      coinAddress: coinAddress
    });
  } catch (error) {
    console.error('Error updating timeline:', error);
    return NextResponse.json(
      { error: 'Failed to update timeline' },
      { status: 500 }
    );
  }
} 