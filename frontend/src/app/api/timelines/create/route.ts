import { NextResponse } from 'next/server';
import { db } from '~/lib/firebase';
import { collection, addDoc, doc, setDoc, getDocs, query, where, deleteDoc, updateDoc } from 'firebase/firestore';
import { ethers } from 'ethers';
import { PinataSDK } from 'pinata';
const rewardManagerABI = [
  {
    "inputs": [
      {
        "internalType": "address[]",
        "name": "addresses",
        "type": "address[]"
      },
      {
        "internalType": "uint256[]",
        "name": "percentages",
        "type": "uint256[]"
      }
    ],
    "name": "initialize",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
]

interface TimelineData {
  name: string;
  template: string;
  authorAddress: string;
  creator: {
    fid: string;
    username: string;
    display_name: string;
    pfp_url: string;
  };
  tags: string[];
  keywords: string[];
  supporterAllocation: string;
  coverImage?: string;
}

interface EngagementData {
  fid: string;
  likes: number;
  recasts: number;
  totalScore: number;
  allocation: number;
}

interface TimelineMetadata {
  name: string;
  description: string;
  image: string;
  properties: {
    category: string;
  };
}

const REWARD_MANAGER_PRIVATE_KEY = process.env.REWARD_MANAGER_PRIVATE_KEY!;
const PROVIDER_URL = 'https://mainnet.base.org';

const PINATA_JWT = process.env.PINATA_JWT!;
const PINATA_GATEWAY = process.env.PINATA_GATEWAY!;
const pinata = new PinataSDK({
  pinataJwt: PINATA_JWT,
  pinataGateway: PINATA_GATEWAY,
});

async function getUnusedRewardManager() {
  const q = query(collection(db, 'rewardmanagers'), where('initialized', '==', false));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const docSnap = snapshot.docs[0];
  return { id: docSnap.id, ...docSnap.data() };
}

async function getEthAddressForFid(fid: string | number) {
  const options = {
    method: 'GET',
    headers: {
      'x-api-key': process.env.NEYNAR_API_KEY!
    }
  };
  const response = await fetch(`https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`, options);
  if (!response.ok) throw new Error('Failed to fetch user profile');
  const data = await response.json();
  const user = data.users && data.users[0];
  if (user && user.verified_addresses && user.verified_addresses.eth_addresses && user.verified_addresses.eth_addresses.length > 0) {
    return user.verified_addresses.eth_addresses[0];
  }
  return null;
}

async function fetchCastReactions(castHash: string) {
  const options = {
    method: 'GET',
    headers: {
      'x-api-key': process.env.NEYNAR_API_KEY!
    }
  };

  const response = await fetch(
    `https://api.neynar.com/v2/farcaster/reactions/cast/?hash=${castHash}&limit=25&types=all`,
    options
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch reactions for cast ${castHash}`);
  }

  return response.json();
}

export async function POST(request: Request) {
  try {
    console.log('Timeline creation started');
    const formData = await request.formData();
    const timelineData: TimelineData = JSON.parse(formData.get('timelineData') as string);
    const coverImage = formData.get('coverImage') as File | null;
    console.log('Received timelineData:', timelineData);
    console.log('Received coverImage:', !!coverImage);

    // 1. Fetch casts based on keywords
    const searchQuery = timelineData.keywords.map(k => `"${k}"`).join(' | ');
    const encodedQuery = encodeURIComponent(searchQuery);
    console.log('Fetching casts with query:', searchQuery);
    const castsResponse = await fetch(
      `https://api.neynar.com/v2/farcaster/cast/search/?limit=25&q=${encodedQuery}&author_fid=${timelineData.creator.fid}`,
      {
        headers: {
          'x-api-key': process.env.NEYNAR_API_KEY!,
          'x-neynar-experimental': 'false'
        }
      }
    );
    if (!castsResponse.ok) {
      console.error('Failed to fetch casts:', castsResponse.status, await castsResponse.text());
      throw new Error('Failed to fetch casts');
    }
    const castsData = await castsResponse.json();
    const casts = castsData.result?.casts || [];
    console.log('Fetched casts:', casts.length);

    // 2. Calculate engagement and allocations
    const engagementMap = new Map<string, EngagementData>();
    for (const cast of casts) {
      try {
        const reactionsData = await fetchCastReactions(cast.hash);
        for (const reaction of reactionsData.reactions) {
          const fid = reaction.user.fid.toString();
          const current = engagementMap.get(fid) || { fid, likes: 0, recasts: 0, totalScore: 0, allocation: 0 };
          if (reaction.reaction_type === 'like') {
            current.likes += 1;
            current.totalScore += 1;
          } else if (reaction.reaction_type === 'recast') {
            current.recasts += 1;
            current.totalScore += 2;
          }
          engagementMap.set(fid, current);
        }
      } catch (error) {
        console.error(`Error fetching reactions for cast ${cast.hash}:`, error);
        continue;
      }
    }
    console.log('Engagement map:', Array.from(engagementMap.values()));
    const totalEngagement = Array.from(engagementMap.values()).reduce(
      (sum, data) => sum + data.totalScore,
      0
    );
    console.log('Total engagement score:', totalEngagement);
    const allocationCap = parseFloat(timelineData.supporterAllocation);
    const supporters = Array.from(engagementMap.values()).map(data => ({
      ...data,
      allocation: totalEngagement > 0 ? (data.totalScore / totalEngagement) * allocationCap : 0
    }));
    console.log('Supporters with allocations:', supporters);

    // --- RewardManager logic start ---
    console.log('RewardManager logic: Looking for unused contract...');
    const rewardManager = await getUnusedRewardManager();
    if (!rewardManager || !('address' in rewardManager)) {
      console.error('No unused RewardManager contract available');
      throw new Error('No unused RewardManager contract available');
    }
    const rewardManagerAddress = (rewardManager as { id: string; address: string }).address;
    console.log('Selected RewardManager address:', rewardManagerAddress);

    // 2. Get ETH addresses for supporters and author
    const supporterAddresses = [];
    const supporterPercentages = [];
    let totalPercent = 0;
    for (const supporter of supporters) {
      try {
        const ethAddress = await getEthAddressForFid(supporter.fid);
        if (ethAddress) {
          supporterAddresses.push(ethAddress);
          const percent = Math.round(supporter.allocation * 100); // convert to integer (e.g. 10000 = 100%)
          supporterPercentages.push(percent);
          totalPercent += percent;
          console.log(`Supporter ${supporter.fid} ETH: ${ethAddress}, percent: ${percent}`);
        } else {
          console.warn(`Supporter ${supporter.fid} has no ETH address`);
        }
      } catch (err) {
        console.error(`Error getting ETH address for supporter ${supporter.fid}:`, err);
      }
    }
    // Author address
    let authorEthAddress = null;
    try {
      authorEthAddress = await getEthAddressForFid(timelineData.creator.fid);
    } catch (err) {
      console.error('Error getting ETH address for author:', err);
    }
    if (!authorEthAddress) {
      console.error('Author has no verified ETH address');
      throw new Error('Author has no verified ETH address');
    }
    const authorPercent = 10000 - totalPercent;
    const addresses = [timelineData.authorAddress, ...supporterAddresses];
    const percentages = [authorPercent, ...supporterPercentages];
    console.log('Addresses for initialize:', addresses);
    console.log('Percentages for initialize:', percentages);

    // 3. Call initialize on RewardManager contract
    try {
      const provider = new ethers.JsonRpcProvider(PROVIDER_URL);
      const wallet = new ethers.Wallet(REWARD_MANAGER_PRIVATE_KEY, provider);
      const contract = new ethers.Contract(rewardManagerAddress, rewardManagerABI, wallet);
      console.log('Calling initialize on RewardManager contract...');
      const tx = await contract.initialize(addresses, percentages);
      console.log('Initialize tx sent:', tx.hash);
      await tx.wait();
      console.log('RewardManager initialized successfully');
    } catch (err) {
      console.error('Error initializing RewardManager contract:', err);
      throw err;
    }

    // 4. Remove used reward manager doc
    try {
      await deleteDoc(doc(db, 'rewardmanagers', rewardManager.id));
      console.log('Deleted used RewardManager doc:', rewardManager.id);
    } catch (err) {
      console.error('Error deleting RewardManager doc:', err);
    }
    // --- RewardManager logic end ---

    // --- Pinata IPFS upload for cover image ---
    let coverImageIpfsCid = '';
    let coverImageUrl = '';
    let coverImageIpfsUri = '';
    if (coverImage) {
      // Convert File to Buffer
      const arrayBuffer = await coverImage.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const fileName = coverImage.name;
      const file = new File([buffer], fileName, { type: coverImage.type });
      const upload = await pinata.upload.public.file(file);
      coverImageIpfsCid = upload.cid;
      coverImageUrl = `https://${PINATA_GATEWAY}/ipfs/${coverImageIpfsCid}`;
      coverImageIpfsUri = `ipfs://${coverImageIpfsCid}`;
    }

    // --- Pinata IPFS upload for metadata JSON ---
    const metadata: TimelineMetadata = {
      name: timelineData.name,
      description: `Farcaster Timeline - ${timelineData.name}`,
      image: coverImageIpfsUri,
      properties: {
        category: "social"
      }
    };
    const metadataBlob = new Blob([JSON.stringify(metadata, null, 2)], { type: 'application/json' });
    const metadataFile = new File([await metadataBlob.arrayBuffer()], `${timelineData.name}.json`, { type: 'application/json' });
    const metadataUpload = await pinata.upload.public.file(metadataFile);
    const metadataIpfsCid = metadataUpload.cid;
    const metadataIpfsUri = `ipfs://${metadataIpfsCid}`;

    // 4. Save timeline to Firestore with metadata URL
    const timelineDoc = {
      name: timelineData.name,
      template: timelineData.template,
      creator: timelineData.creator,
      coverImage: coverImageUrl,
      metadataUrl: metadataIpfsUri,
      tags: timelineData.tags,
      keywords: timelineData.keywords,
      supporterAllocation: timelineData.supporterAllocation,
      castHashes: casts.map((cast: any) => cast.hash),
      createdAt: new Date().toISOString(),
      totalSupporters: supporters.length,
      rewardManager: rewardManagerAddress
    };
    let docRef;
    try {
      docRef = await addDoc(collection(db, 'timelines'), timelineDoc);
      console.log('Timeline doc created:', docRef.id);
    } catch (err) {
      console.error('Error creating timeline doc:', err);
      throw err;
    }

    // 5. Save supporters in subcollection
    const supportersRef = collection(db, 'timelines', docRef.id, 'supporters');
    for (const supporter of supporters) {
      try {
        await setDoc(doc(supportersRef, supporter.fid), {
          likes: supporter.likes,
          recasts: supporter.recasts,
          totalScore: supporter.totalScore,
          allocation: supporter.allocation,
          lastUpdated: new Date().toISOString()
        });
        console.log(`Supporter ${supporter.fid} saved to subcollection`);
      } catch (err) {
        console.error(`Error saving supporter ${supporter.fid}:`, err);
      }
    }

    console.log('Timeline creation completed successfully', docRef.id);
    return NextResponse.json({
      timelineId: docRef.id,
      metadataUrl: metadataIpfsUri,
      rewardManager: rewardManagerAddress
    });
  } catch (error) {
    console.error('Error creating timeline:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Failed to create timeline', details: errorMessage },
      { status: 500 }
    );
  }
} 