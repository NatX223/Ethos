// Example: frontend/src/app/api/goals/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { firebaseService } from '@/lib/services/firebaseService';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    
    let goals;
    if (userId) {
      goals = await firebaseService.queryDocuments('goals', (collection) =>
        collection.where('userId', '==', userId)
      );
    } else {
      goals = await firebaseService.queryDocuments('goals');
    }

    return NextResponse.json({
      success: true,
      data: goals
    });
  } catch (error) {
    console.error('Error fetching goals:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch goals' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.title || !body.userId) {
      return NextResponse.json(
        { success: false, error: 'Title and userId are required' },
        { status: 400 }
      );
    }

    const goalData = {
      ...body,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'active'
    };

    const goal = await firebaseService.createDocument('goals', goalData);
    
    return NextResponse.json({
      success: true,
      data: goal
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating goal:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create goal' },
      { status: 500 }
    );
  }
}