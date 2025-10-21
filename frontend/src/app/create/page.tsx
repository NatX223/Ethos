"use client";

import React from "react";
import { useAccount } from "wagmi";
import { CreateGoal } from "~/components/CreateGoal";
import { useRouter } from "next/navigation";

export default function CreateGoalPage() {
  const { address, isConnected } = useAccount();
  const router = useRouter();

  const handleGoalCreated = (goalId: string) => {
    // Redirect to dashboard or goal detail page
    router.push(`/dashboard?goalCreated=${goalId}`);
  };

  return (
    <div className="min-h-screen bg-dark">
      {/* Navigation */}
      <nav className="border-b border-accent/30 bg-dark/80 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <a href="/" className="text-accent font-bold text-2xl tracking-tight">
              Ethos
            </a>
            <div className="flex items-center gap-4">
              <a
                href="/"
                className="text-gray-100 hover:underline underline-offset-8 transition"
              >
                Home
              </a>
              {isConnected && (
                <a
                  href="/dashboard"
                  className="text-gray-100 hover:underline underline-offset-8 transition"
                >
                  Dashboard
                </a>
              )}
              {isConnected && address && (
                <div className="flex items-center gap-2 bg-accent/10 border border-accent rounded-lg px-4 py-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="text-accent font-medium text-sm">
                    {address.slice(0, 6)}...{address.slice(-4)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-accent mb-2">Create Your Goal</h1>
          <p className="text-zinc-400">
            Set a goal, stake your commitment, and achieve your dreams
          </p>
        </div>

        <CreateGoal onGoalCreated={handleGoalCreated} />

        {/* How It Works */}
        <div className="mt-12 bg-dark border border-accent/30 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-accent mb-4">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="w-12 h-12 bg-accent text-dark rounded-full flex items-center justify-center font-bold text-lg mx-auto mb-2">
                1
              </div>
              <h3 className="font-medium text-zinc-100 mb-1">Fill Form</h3>
              <p className="text-sm text-zinc-400">Set your goal details and target</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-accent text-dark rounded-full flex items-center justify-center font-bold text-lg mx-auto mb-2">
                2
              </div>
              <h3 className="font-medium text-zinc-100 mb-1">Get Contract</h3>
              <p className="text-sm text-zinc-400">Receive a smart contract address</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-accent text-dark rounded-full flex items-center justify-center font-bold text-lg mx-auto mb-2">
                3
              </div>
              <h3 className="font-medium text-zinc-100 mb-1">Stake ETH</h3>
              <p className="text-sm text-zinc-400">Lock your commitment on blockchain</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-accent text-dark rounded-full flex items-center justify-center font-bold text-lg mx-auto mb-2">
                4
              </div>
              <h3 className="font-medium text-zinc-100 mb-1">Achieve</h3>
              <p className="text-sm text-zinc-400">Complete your goal and earn rewards</p>
            </div>
          </div>
        </div>

        {/* Benefits */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-dark border border-accent/30 rounded-xl p-6 text-center">
            <div className="text-accent text-2xl mb-2">🎯</div>
            <h3 className="font-semibold text-zinc-100 mb-2">Stay Accountable</h3>
            <p className="text-sm text-zinc-400">
              Financial commitment keeps you motivated to achieve your goals
            </p>
          </div>
          <div className="bg-dark border border-accent/30 rounded-xl p-6 text-center">
            <div className="text-accent text-2xl mb-2">🔒</div>
            <h3 className="font-semibold text-zinc-100 mb-2">Blockchain Security</h3>
            <p className="text-sm text-zinc-400">
              Your stakes are secured by smart contracts on Base Sepolia
            </p>
          </div>
          <div className="bg-dark border border-accent/30 rounded-xl p-6 text-center">
            <div className="text-accent text-2xl mb-2">💰</div>
            <h3 className="font-semibold text-zinc-100 mb-2">Earn Rewards</h3>
            <p className="text-sm text-zinc-400">
              Get your stake back plus rewards when you achieve your goals
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}