"use client";

import React from "react";
import { motion } from "framer-motion";
import { useActiveAccount } from "thirdweb/react";

// Mock data - replace with real data from your backend
const mockUserData = {
  totalChallenges: 12,
  totalAmountLocked: 4.8,
  leaderboardRank: 7,
  basename: null, // Will show address if no basename
  challenges: [
    {
      id: 1,
      name: "Run a Marathon",
      description: "Complete a full 26.2 mile marathon race",
      dueDate: "2024-12-15",
      amountLocked: 1.2,
      status: "ongoing",
    },
    {
      id: 2,
      name: "30-Day Coding Streak",
      description: "Code for at least 1 hour every day for 30 days",
      dueDate: "2024-11-30",
      amountLocked: 0.8,
      status: "completed",
    },
    {
      id: 3,
      name: "Read 12 Books",
      description: "Read 12 books by the end of the year",
      dueDate: "2024-12-31",
      amountLocked: 2.0,
      status: "ongoing",
    },
    {
      id: 4,
      name: "Learn Spanish",
      description: "Complete intermediate Spanish course",
      dueDate: "2024-10-01",
      amountLocked: 0.8,
      status: "unfinished",
    },
  ],
};

function MetricCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-dark border border-accent/30 rounded-xl p-6 shadow-lg"
    >
      <h3 className="text-zinc-400 text-sm font-medium mb-2">{title}</h3>
      <div className="text-accent text-2xl font-bold mb-1">{value}</div>
      {subtitle && <p className="text-zinc-500 text-xs">{subtitle}</p>}
    </motion.div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const statusStyles = {
    ongoing: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    completed: "bg-green-500/20 text-green-400 border-green-500/30",
    cancelled: "bg-red-500/20 text-red-400 border-red-500/30",
    unfinished: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  };

  return (
    <span
      className={`px-2 py-1 rounded-full text-xs font-medium border ${
        statusStyles[status as keyof typeof statusStyles]
      }`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function ChallengeCard({ challenge }: { challenge: any }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-dark border border-accent/30 rounded-xl p-6 shadow-lg hover:border-accent/50 transition-colors"
    >
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-accent font-semibold text-lg">{challenge.name}</h3>
        <StatusBadge status={challenge.status} />
      </div>

      <p className="text-zinc-300 text-sm mb-4 line-clamp-2">
        {challenge.description}
      </p>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-zinc-400">Due Date:</span>
          <div className="text-zinc-200 font-medium">
            {new Date(challenge.dueDate).toLocaleDateString()}
          </div>
        </div>
        <div>
          <span className="text-zinc-400">Amount Locked:</span>
          <div className="text-accent font-medium">
            {challenge.amountLocked} ETH
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function Dashboard() {
  // const account = useActiveAccount();

  // if (!account) {
  //   return (
  //     <div className="min-h-screen bg-gradient-to-b from-primary to-dark flex items-center justify-center">
  //       <div className="text-center">
  //         <h1 className="text-accent text-3xl font-bold mb-4">Connect Your Wallet</h1>
  //         <p className="text-zinc-300 mb-8">Please connect your wallet to view your dashboard</p>
  //         <a href="/" className="bg-accent text-dark font-semibold rounded-lg px-6 py-3 hover:scale-105 transition-transform">
  //           Go Back Home
  //         </a>
  //       </div>
  //     </div>
  //   );
  // }

  // const displayName = mockUserData.basename || `${account.address?.slice(0, 6)}...${account.address?.slice(-4)}`;

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary to-dark">
      {/* Header */}
      <div className="bg-dark/80 backdrop-blur border-b border-accent/30">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-accent text-3xl font-bold">Dashboard</h1>
              <p className="text-zinc-300 mt-1">
                Welcome back, {"displayName"}
              </p>
            </div>
            <a
              href="/"
              className="text-zinc-300 hover:text-accent transition-colors"
            >
              ← Back to Home
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Metrics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Total Challenges"
            value={mockUserData.totalChallenges}
            subtitle="All time"
          />
          <MetricCard
            title="Amount Locked"
            value={`${mockUserData.totalAmountLocked} ETH`}
            subtitle="All time"
          />
          <MetricCard
            title="Leaderboard Rank"
            value={`#${mockUserData.leaderboardRank}`}
            subtitle="Global ranking"
          />
          <MetricCard
            title="Success Rate"
            value="67%"
            subtitle="Completed challenges"
          />
        </div>

        {/* Challenges Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-accent text-2xl font-bold">Your Challenges</h2>
            <a
              href="/create"
              className="bg-accent text-dark font-semibold rounded-lg px-4 py-2 hover:scale-105 transition-transform"
            >
              Create New Challenge
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {mockUserData.challenges.map((challenge) => (
              <ChallengeCard key={challenge.id} challenge={challenge} />
            ))}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="bg-dark border border-accent/30 rounded-xl p-6 shadow-lg">
          <h3 className="text-accent text-xl font-bold mb-4">Quick Stats</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-green-400 text-2xl font-bold">2</div>
              <div className="text-zinc-400 text-sm">Completed</div>
            </div>
            <div>
              <div className="text-blue-400 text-2xl font-bold">2</div>
              <div className="text-zinc-400 text-sm">Ongoing</div>
            </div>
            <div>
              <div className="text-orange-400 text-2xl font-bold">1</div>
              <div className="text-zinc-400 text-sm">Unfinished</div>
            </div>
            <div>
              <div className="text-red-400 text-2xl font-bold">0</div>
              <div className="text-zinc-400 text-sm">Cancelled</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
