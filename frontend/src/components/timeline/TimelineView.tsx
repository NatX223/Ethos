'use client';

import { useState, useEffect } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { PulseThread } from './PulseThread';
import { Snapcast } from './Snapcast';
import { BranchingMemory } from './BranchingMemory';
import { TimelineData } from '~/types/timeline';
import { Cast } from '~/types/timeline';
import { Button } from '~/components/ui/Button';
import { Input } from '~/components/ui/input';
import { Dialog } from "@headlessui/react";
import { db } from '~/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';
import { ArrowLeftIcon } from 'lucide-react';
import { CastCard } from './CastCard';
import { useWalletClient } from 'wagmi';
import { createPublicClient, http, parseEther } from 'viem';
import { tradeCoin, TradeParameters } from '@zoralabs/coins-sdk';
import { base } from 'viem/chains';

interface TimelineViewProps {
  timelineId: string;
}

// Minimal ABI for claim
const claimAbi = [
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "claim",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

function ClaimEarnings({ rewardManager }: { rewardManager: string }) {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  async function handleClaim() {
    setLoading(true);
    setSuccess('');
    setError('');
    try {
      if (!walletClient || !address) throw new Error('Wallet not connected');
      const amt = amount.trim();
      if (!amt || isNaN(Number(amt)) || Number(amt) <= 0) throw new Error('Enter a valid amount');
      const tx = await walletClient.writeContract({
        address: rewardManager as `0x${string}`,
        abi: claimAbi,
        functionName: 'claim',
        args: [parseEther(amt)],
        account: address,
      });
      setSuccess('Claim transaction sent!');
      setAmount('');
    } catch (e: any) {
      setError(e.message || 'Error claiming earnings');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Input
          type="number"
          min="0"
          placeholder="Amount to claim"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          className="w-1/2"
        />
        <Button
          variant="primary"
          onClick={handleClaim}
          disabled={loading}
          className="w-1/2"
        >
          {loading ? 'Claiming...' : 'Claim'}
        </Button>
      </div>
      {success && <div className="text-green-600 text-sm">{success}</div>}
      {error && <div className="text-red-600 text-sm">{error}</div>}
    </div>
  );
}

export function TimelineView({ timelineId }: TimelineViewProps) {
  const [timeline, setTimeline] = useState<any>(null);
  const [casts, setCasts] = useState<Cast[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExchangeOpen, setIsExchangeOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [isClaimOpen, setIsClaimOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [stats, setStats] = useState({
    allocation: '0%',
    earnings: 'Ξ 0',
    marketCap: '$0',
    balance: '0'
  });
  const { scrollY } = useScroll();
  const coverHeight = useTransform(scrollY, [0, 300], [300, 200]);
  const { address } = useAccount();
  const router = useRouter();
  const { data: walletClient } = useWalletClient();
  const [txLoading, setTxLoading] = useState(false);
  const [txError, setTxError] = useState<string | null>(null);
  const [txSuccess, setTxSuccess] = useState<string | null>(null);
  const publicClient = createPublicClient({ chain: base, transport: http('https://mainnet.base.org') });

  useEffect(() => {
    async function fetchTimelineAndCasts() {
      setLoading(true);
      try {
        // Fetch timeline doc
        const timelineRef = doc(db, 'timelines', timelineId);
        const timelineSnap = await getDoc(timelineRef);
        if (!timelineSnap.exists()) {
          setTimeline(null);
          setLoading(false);
          return;
        }
        const timelineData = timelineSnap.data();
        setTimeline({ ...timelineData, id: timelineId });

        // Fetch casts from our API endpoint
        const res = await fetch(`/api/timelines/casts?timelineid=${timelineId}`);
        if (!res.ok) {
          throw new Error('Failed to fetch casts');
        }
        const data = await res.json();
        setCasts(data.casts);
      } catch (error) {
        console.error('Error fetching timeline and casts:', error);
        // Handle error appropriately
      } finally {
        setLoading(false);
      }
    }
    fetchTimelineAndCasts();
  }, [timelineId]);

  // Fetch user stats when timeline and user address are available
  useEffect(() => {
    async function fetchUserStats() {
      if (!timeline || !address || !timeline.rewardManager || !timeline.coinAddress) {
        return;
      }

      try {
        const response = await fetch(
          `/api/timelines/${timelineId}/user-stats?userAddress=${address}&rewardManager=${timeline.rewardManager}&coinAddress=${timeline.coinAddress}`
        );
        
        if (response.ok) {
          const data = await response.json();
          setStats({
            allocation: data.supporterAllocation,
            earnings: `Ξ ${data.earnings.toFixed(4)}`,
            marketCap: `$${data.marketCap.toLocaleString()}`,
            balance: data.balance.toFixed(4)
          });
        }
      } catch (error) {
        console.error('Error fetching user stats:', error);
      }
    }

    fetchUserStats();
  }, [timeline, address, timelineId]);

  // Add effect to clear success message after 3 seconds
  useEffect(() => {
    if (txSuccess) {
      const timer = setTimeout(() => setTxSuccess(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [txSuccess]);

  const handleBuy = async () => {
    if (!walletClient || !address || !timeline?.coinAddress || !amount) return;
    setTxLoading(true);
    setTxError(null);
    setTxSuccess(null);
    try {
      const account = walletClient.account || address;
      const tradeParameters: TradeParameters = {
        sell: {
          type: 'erc20',
          address: '0x1111111111166b7FE7bd91427724B487980aFc69', // ZORA
        },
        buy: {
          type: 'erc20',
          address: timeline.coinAddress,
        },
        amountIn: parseEther(amount),
        slippage: 0.04,
        sender: address,
      };
      await tradeCoin({ tradeParameters, walletClient, account, publicClient });
      setTxSuccess('Buy transaction successful!');
    } catch (err: any) {
      setTxError(err.message || 'Transaction failed');
    } finally {
      setTxLoading(false);
    }
  };

  const handleSell = async () => {
    if (!walletClient || !address || !timeline?.coinAddress || !amount) return;
    setTxLoading(true);
    setTxError(null);
    setTxSuccess(null);
    try {
      const account = walletClient.account || address;
      const tradeParameters: TradeParameters = {
        sell: {
          type: 'erc20',
          address: timeline.coinAddress,
        },
        buy: {
          type: 'erc20',
          address: '0x1111111111166b7FE7bd91427724B487980aFc69', // ZORA
        },
        amountIn: parseEther(amount),
        slippage: 0.04,
        sender: address,
      };
      await tradeCoin({ tradeParameters, walletClient, account, publicClient, validateTransaction: false });
      setTxSuccess('Sell transaction successful!');
    } catch (err: any) {
      setTxError(err.message || 'Transaction failed');
    } finally {
      setTxLoading(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!timeline) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold font-clash mb-2">Timeline Not Found</h1>
          <p className="text-gray-600">The timeline you are looking for does not exist.</p>
        </div>
      </div>
    );
  }

  // Replace getTemplateComponent with template switch and pass casts to timeline
  const getTemplateComponent = () => {
    const timelineWithCasts = { ...timeline, casts };
    switch (timeline.template) {
      case 'pulse-thread':
        return <PulseThread timeline={timelineWithCasts} />;
      case 'snapcast':
        return <Snapcast timeline={timelineWithCasts} />;
      case 'branching-memory':
        return <BranchingMemory timeline={timelineWithCasts} />;
      default:
        // fallback: show a simple list with media
        return (
          <div className="space-y-6">
            {casts.map((cast) => (
              <div key={cast.hash} className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-start space-x-3 mb-2">
                  <img
                    src={timeline.creator?.pfp_url || ''}
                    alt={timeline.creator?.username || ''}
                    className="w-10 h-10 rounded-full"
                  />
                  <div>
                    <span className="font-medium">{timeline.creator?.display_name || ''}</span>
                    <span className="text-gray-500 ml-2">@{timeline.creator?.username || ''}</span>
                    <span className="text-gray-400 text-sm ml-2">{new Date(cast.timestamp).toLocaleDateString()}</span>
                  </div>
                </div>
                <p className="mb-2 text-gray-700">{cast.text}</p>
                {cast.media && cast.media.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {cast.media.map((media, idx) => (
                      media.type.startsWith('image') ? (
                        <img key={idx} src={media.url} alt="cast media" className="max-w-xs rounded-lg" />
                      ) : media.type.startsWith('video') ? (
                        <video key={idx} src={media.url} controls className="max-w-xs rounded-lg" />
                      ) : null
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        );
    }
  };

  // Feed-style component for mobile
  const getMobileFeed = () => (
    <div className="flex flex-col gap-6">
      {casts.map((cast) => (
        <CastCard key={cast.hash} cast={cast} />
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Back Button */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
      <ArrowLeftIcon className="w-7 h-7 text-primary absolute top-6 left-6 cursor-pointer" onClick={() => router.back()} />
      </div>
      {/* Header Section */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-full bg-primary/20 overflow-hidden">
              <img src={timeline.creator?.pfp_url || ''} alt={timeline.creator?.username || ''} className="w-full h-full object-cover" />
            </div>
            <div>
              <p className="font-medium">@{timeline.creator?.username || ''}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Cover Section */}
      <motion.section
        style={{ height: coverHeight }}
        className="relative w-full overflow-hidden"
      >
        <img
          src={timeline.coverImage}
          alt={timeline.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/60 to-transparent">
          <h1 className="text-4xl font-bold font-clash text-white drop-shadow-lg">
            {timeline.name}
          </h1>
        </div>
      </motion.section>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Timeline Content */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm p-8">
              {/* Show feed on mobile, template on desktop */}
              <div className="block lg:hidden">
                {getMobileFeed()}
              </div>
              <div className="hidden lg:block">
                {getTemplateComponent()}
              </div>
            </div>
          </div>

          {/* Stats and Exchange Panel */}
          <div className="space-y-6">
            {/* Stats Panel (Desktop) */}
            <div className="hidden lg:block bg-white rounded-xl shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-primary/20">
                <span className="text-gray-600">Supporter Allocation</span>
                <span className="font-semibold">{stats.allocation}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-primary/20">
                <span className="text-gray-600">Earnings</span>
                <span className="font-semibold">{stats.earnings}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-primary/20">
                <span className="text-gray-600">Market Cap</span>
                <span className="font-semibold">{stats.marketCap}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-primary/20">
                <span className="text-gray-600">Your Balance</span>
                <span className="font-semibold">{stats.balance}</span>
              </div>
              {/* Claim Earnings (Desktop) */}
              {timeline.rewardManager && (
                <div className="pt-4">
                  <ClaimEarnings rewardManager={timeline.rewardManager} />
                </div>
              )}
            </div>
            {/* Exchange Panel (Desktop) */}
            <div className="hidden lg:block bg-white/80 backdrop-blur-sm rounded-xl shadow-sm p-6 border border-primary/20">
              <h3 className="text-lg font-semibold mb-4">Trade Timeline</h3>
              <div className="space-y-4">
                <Input
                  type="number"
                  placeholder="Enter amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
                <div className="grid grid-cols-2 gap-4">
                <Button variant="primary" className="w-full" onClick={handleBuy} disabled={txLoading}>Buy</Button>
                <Button variant="secondary" className="w-full" onClick={handleSell} disabled={txLoading}>Sell</Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Details Button */}
      <button
        onClick={() => setIsStatsOpen(true)}
        className="fixed bottom-24 right-6 lg:hidden bg-primary text-white rounded-full px-6 py-3 shadow-lg"
      >
        Details
      </button>

      {/* Mobile Exchange Button */}
      <button
        onClick={() => setIsExchangeOpen(true)}
        className="fixed bottom-6 right-6 lg:hidden bg-gradient-primary text-white rounded-full px-6 py-3 shadow-lg"
      >
        Trade
      </button>

      {/* Mobile Exchange Modal */}
      <Dialog
        open={isExchangeOpen}
        onClose={() => setIsExchangeOpen(false)}
        className="relative z-50"
      >
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" aria-hidden="true" />
        <div className="fixed inset-0 flex items-end justify-center p-4">
          <Dialog.Panel className="w-full max-w-md bg-white rounded-t-xl p-6">
            <Dialog.Title className="text-lg font-semibold mb-4">Trade Timeline</Dialog.Title>
            <div className="space-y-4">
              <Input
                type="number"
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <div className="grid grid-cols-2 gap-4">
              <Button variant="primary" className="w-full" onClick={handleBuy} disabled={txLoading}>Buy</Button>
              <Button variant="secondary" className="w-full" onClick={handleSell} disabled={txLoading}>Sell</Button>
              </div>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>

      {/* Stats Modal (Mobile) */}
      <Dialog
        open={isStatsOpen}
        onClose={() => setIsStatsOpen(false)}
        className="relative z-50"
      >
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" aria-hidden="true" />
        <div className="fixed inset-0 flex items-end justify-center p-4">
          <Dialog.Panel className="w-full max-w-md bg-white rounded-t-xl p-6">
            <Dialog.Title className="text-lg font-semibold mb-4">Timeline Details</Dialog.Title>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-primary/20">
                <span className="text-gray-600">Supporter Allocation</span>
                <span className="font-semibold">{stats.allocation}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-primary/20">
                <span className="text-gray-600">Earnings</span>
                <span className="font-semibold">{stats.earnings}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-primary/20">
                <span className="text-gray-600">Market Cap</span>
                <span className="font-semibold">{stats.marketCap}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-primary/20">
                <span className="text-gray-600">Your Balance</span>
                <span className="font-semibold">{stats.balance}</span>
              </div>
              {/* Claim Earnings (Mobile, in details dialog) */}
              {timeline.rewardManager && (
                <div className="pt-4">
                  <ClaimEarnings rewardManager={timeline.rewardManager} />
                </div>
              )}
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </div>
  );
} 