import { NextResponse } from 'next/server';
import { db } from '~/lib/firebase';
import { collection, addDoc, doc, getDocs, query, where, deleteDoc } from 'firebase/firestore';

interface ChallengeData {
  title: string;
  description: string;
  category: string;
  type: string;
  metric: number;
  deadline: Date;
  authorAddress: string;
  username: string;
  platform: string;
}

async function getUnusedChallengeMarkets() {
  const q = query(collection(db, 'challengeMarkets'), where('initialized', '==', false));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const docSnap = snapshot.docs[0];
  return { id: docSnap.id, ...docSnap.data() };
}

export async function POST(request: Request) {
  try {
    console.log('Challenge creation started');
    const formData = await request.formData();
    const challengeData: ChallengeData = JSON.parse(formData.get('challengeData') as string);
    console.log('Received challengeData:', challengeData);

    // --- ChallengeMarket logic start ---
    console.log('ChallengeMarket logic: Looking for unused contract...');
    const challengeMarket = await getUnusedChallengeMarkets();
    if (!challengeMarket || !('address' in challengeMarket)) {
      console.error('No unused ChallengeMarkets contract available');
      throw new Error('No unused ChallengeMarkets contract available');
    }
    const challengeMarketAddress = (challengeMarket as { id: string; address: string }).address;
    console.log('Selected ChallengeMarkets address:', challengeMarketAddress);

    // 4. Remove used challenge market doc
    try {
      await deleteDoc(doc(db, 'challengeMarkets', challengeMarket.id));
      console.log('Deleted used ChallengeMarkets doc:', challengeMarket.id);
    } catch (err) {
      console.error('Error deleting ChallengeMarkets doc:', err);
    }
    // --- ChallengeMarkets logic end ---

    // 4. Save challenge to Firestore with metadata URL
    const challengeDoc = {
      title: challengeData.title,
      description: challengeData.description,
      details: {
        category: challengeData.category,
        type: challengeData.type,
        metric: challengeData.metric,
        marketAddress: challengeMarketAddress,
        deadline: challengeData.deadline,
      },
      author: {
        authorAddress: challengeData.authorAddress,
        username: challengeData.username,
        platform: challengeData.platform,
      },
    };

    let docRef;
    try {
      docRef = await addDoc(collection(db, 'challenges'), challengeDoc);
      console.log('challenge doc created:', docRef.id);
    } catch (err) {
      console.error('Error creating challenge doc:', err);
      throw err;
    }

    console.log('Challenge creation completed successfully', docRef.id);
    return NextResponse.json({
      challengeId: docRef.id,      
      challengeMarket: challengeMarketAddress
    });
  } catch (error) {
    console.error('Error creating challenge:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Failed to create challenge', details: errorMessage },
      { status: 500 }
    );
  }
} 