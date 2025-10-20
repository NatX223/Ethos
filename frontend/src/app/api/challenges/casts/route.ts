import { NextRequest, NextResponse } from 'next/server';
import { db } from '~/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export interface Cast {
    hash: string;
    text: string;
    timestamp: string;
    media?: {
      type: 'image' | 'video';
      url: string;
    };
    stats: {
      likes: number;
      replies: number;
      recasts: number;
    };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('timelineid');
  try {
    // Get timeline doc to get cast hashes
    if (!id) {
      return NextResponse.json({ error: 'Timeline ID is required' }, { status: 400 });
    }
    const timelineRef = doc(db, 'timelines', id);
    const timelineSnap = await getDoc(timelineRef);
    
    if (!timelineSnap.exists()) {
      return NextResponse.json({ error: 'Timeline not found' }, { status: 404 });
    }

    const timelineData = timelineSnap.data();
    const castHashes: string[] = timelineData.castHashes || [];

    if (castHashes.length === 0) {
      return NextResponse.json({ casts: [] });
    }

    // Fetch casts from Neynar
    const apiKey = process.env.NEYNAR_API_KEY!;
    const options = {
      method: 'GET',
      headers: {
        'x-api-key': apiKey,
        'x-neynar-experimental': 'false',
      },
    };

    const res = await fetch(
      `https://api.neynar.com/v2/farcaster/casts/?casts=${encodeURIComponent(castHashes.join(','))}`,
      options
    );

    if (!res.ok) {
      throw new Error('Failed to fetch casts from Neynar');
    }

    const returnData = await res.json();
    const data = returnData.result;
    console.log(data);
    
    // Transform the response to only include what we need
    const casts: Cast[] = (data.casts || []).map((cast: any) => ({
      hash: cast.hash,
      text: cast.text,
      timestamp: cast.timestamp ? cast.timestamp.split('T')[0] : '',
      media: (cast.embeds || [])
        .filter((embed: any) => embed.url && (embed.metadata.content_type?.startsWith('image') || embed.metadata.content_type?.startsWith('video')))
        .map((embed: any) => ({
          url: embed.url,
          type: embed.metadata.content_type?.startsWith('image') ? 'image' : embed.metadata.content_type?.startsWith('video') ? 'video' : '',
        })),
        stats: {
            likes: cast.reactions?.likes_count || 0,
            recasts: cast.reactions?.recasts_count || 0,
            replies: cast.replies?.count || 0,
        },
    }));

    console.log(casts);
    return NextResponse.json({ casts });
  } catch (error) {
    console.error('Error fetching casts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch casts' },
      { status: 500 }
    );
  }
}