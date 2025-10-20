import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const fid = searchParams.get('fid');
  if (!fid) {
    return NextResponse.json({ error: 'Missing fid' }, { status: 400 });
  }

  try {
    const options = {
      method: 'GET',
      headers: {
        'x-neynar-experimental': 'false',
        'x-api-key': process.env.NEYNAR_API_KEY!,
      },
    };
    const response = await fetch(
      `https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`,
      options
    );
    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch user profile' }, { status: response.status });
    }
    const data = await response.json();
    if (data.users && data.users.length > 0) {
      return NextResponse.json({ user: data.users[0] });
    }
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 