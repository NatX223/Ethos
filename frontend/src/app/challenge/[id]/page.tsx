'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useParams } from 'next/navigation';

// Mock data for the challenge
const mockChallenge = {
  id: '1',
  title: 'Run a Marathon',
  target: 'Complete a full marathon (42.2km) within 4 hours',
  challenger: {
    name: 'Alex Chen',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face'
  },
  stake: '1.5 ETH',
  deadline: '2024-08-01T00:00:00Z',
  odds: {
    for: 0.65, // 65% chance of success
    against: 0.35 // 35% chance of failure
  },
  stakerCount: 127,
  totalStaked: '45.2 ETH',
  description: 'I will complete a full marathon in under 4 hours. This will be my first marathon and I\'m training hard to achieve this goal. I\'ll provide GPS tracking and finish line photos as proof.',
  proofRequirements: [
    'GPS tracking data from the race',
    'Official finish time certificate',
    'Finish line photo with timestamp',
    'Race bib number verification'
  ]
};

function ChallengePage() {
  const params = useParams();
  const [timeLeft, setTimeLeft] = useState('');
  const [stakeAmount, setStakeAmount] = useState('');
  const [stakeDirection, setStakeDirection] = useState<'for' | 'against'>('for');
  const [isStaking, setIsStaking] = useState(false);

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const deadline = new Date(mockChallenge.deadline).getTime();
      const distance = deadline - now;

      if (distance > 0) {
        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`);
      } else {
        setTimeLeft('EXPIRED');
      }
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleStake = async () => {
    if (!stakeAmount || parseFloat(stakeAmount) <= 0) return;
    
    setIsStaking(true);
    // Simulate staking process
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsStaking(false);
    alert(`Successfully staked ${stakeAmount} ETH ${stakeDirection === 'for' ? 'for' : 'against'} the challenge!`);
  };

  const getPotentialReward = () => {
    if (!stakeAmount) return '0';
    const amount = parseFloat(stakeAmount);
    const odds = stakeDirection === 'for' ? mockChallenge.odds.for : mockChallenge.odds.against;
    return (amount / odds).toFixed(4);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary to-dark">
      {/* Header */}
      <div className="bg-dark/80 backdrop-blur border-b border-accent/20">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <a href="/" className="text-accent font-bold text-xl">← Back</a>
            <div className="text-zinc-100 text-sm">Challenge #{params.id}</div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          {/* Main Content Area */}
          <div className="xl:col-span-8 space-y-8">
            {/* Challenge Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-dark border border-accent/30 rounded-2xl p-8 shadow-lg"
            >
              <div className="flex items-start gap-6 mb-6">
                <img 
                  src={mockChallenge.challenger.avatar} 
                  alt={mockChallenge.challenger.name}
                  className="w-16 h-16 rounded-full object-cover border-2 border-accent/50"
                />
                <div className="flex-1">
                  <h1 className="text-accent font-bold text-3xl mb-2">{mockChallenge.title}</h1>
                  <p className="text-zinc-100 text-lg mb-2">by {mockChallenge.challenger.name}</p>
                  <p className="text-zinc-300 text-sm">{mockChallenge.target}</p>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="bg-dark border border-accent/20 rounded-xl p-4 text-center">
                  <div className="text-accent font-bold text-2xl">{mockChallenge.totalStaked}</div>
                  <div className="text-zinc-800 text-sm">Total Staked</div>
                </div>
                <div className="bg-dark border border-accent/20 rounded-xl p-4 text-center">
                  <div className="text-accent font-bold text-2xl">{mockChallenge.stakerCount}</div>
                  <div className="text-zinc-800 text-sm">Stakers</div>
                </div>
                <div className="bg-dark border border-accent/20 rounded-xl p-4 text-center">
                  <div className="text-accent font-bold text-2xl">{timeLeft}</div>
                  <div className="text-zinc-800 text-sm">Time Left</div>
                </div>
              </div>
            </motion.div>

            {/* Challenge Details */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              {/* Description */}
              <div className="bg-dark border border-accent/30 rounded-2xl p-6">
                <h3 className="text-accent font-bold text-xl mb-4">Challenge Description</h3>
                <p className="text-zinc-100 leading-relaxed">{mockChallenge.description}</p>
              </div>
            </motion.div>
          </div>

          {/* Staking Panel - Fixed on the right */}
          <div className="xl:col-span-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="sticky top-8"
            >
              <div className="bg-dark border border-accent/30 rounded-2xl p-6">
                <h3 className="text-accent font-bold text-xl mb-6">Place Your Stake</h3>

                {/* Live Odds */}
                <div className="mb-6">
                  <h4 className="text-zinc-100 font-semibold mb-3">Live Odds</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                      <span className="text-green-400 font-medium">For Success</span>
                      <span className="text-green-400 font-bold">{(mockChallenge.odds.for * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                      <span className="text-red-400 font-medium">Against Success</span>
                      <span className="text-red-400 font-bold">{(mockChallenge.odds.against * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                </div>

                {/* Stake Direction */}
                <div className="mb-6">
                  <h4 className="text-zinc-100 font-semibold mb-3">Stake Direction</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setStakeDirection('for')}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        stakeDirection === 'for'
                          ? 'border-green-500 bg-green-500/10 text-green-400'
                          : 'border-accent/30 text-gray-700 hover:border-green-500/50'
                      }`}
                    >
                      For Success
                    </button>
                    <button
                      onClick={() => setStakeDirection('against')}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        stakeDirection === 'against'
                          ? 'border-red-500 bg-red-500/10 text-red-400'
                          : 'border-accent/30 text-gray-700 hover:border-red-500/50'
                      }`}
                    >
                      Against Success
                    </button>
                  </div>
                </div>

                {/* Stake Amount */}
                <div className="mb-6">
                  <h4 className="text-zinc-100 font-semibold mb-3">Stake Amount (ETH)</h4>
                  <input
                    type="number"
                    value={stakeAmount}
                    onChange={(e) => setStakeAmount(e.target.value)}
                    placeholder="0.0"
                    min="0"
                    className="w-full bg-dark border border-accent/30 rounded-lg px-4 py-3 text-gray-500 placeholder-zinc-500 focus:outline-none focus:border-accent"
                  />
                </div>

                {/* Potential Reward */}
                {stakeAmount && (
                  <div className="mb-6 p-4 bg-accent/10 border border-accent/30 rounded-lg">
                    <div className="text-zinc-900 text-sm mb-1">Potential Reward</div>
                    <div className="text-accent font-bold text-xl">{getPotentialReward()} ETH</div>
                  </div>
                )}

                {/* Stake Button */}
                <button
                  onClick={handleStake}
                  disabled={!stakeAmount || isStaking}
                  className="w-full bg-accent text-dark font-bold rounded-xl px-6 py-4 text-lg shadow-lg hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {isStaking ? 'Staking...' : 'Place Stake'}
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChallengePage; 