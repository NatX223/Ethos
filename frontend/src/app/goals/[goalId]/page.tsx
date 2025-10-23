"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import ProgressUpdateButton from "~/components/ProgressUpdateButton";

interface Goal {
  id: string;
  title: string;
  description?: string;
  category: 'fitness' | 'productivity' | 'onchain';
  type: 'commit' | 'volume' | 'pnl' | 'distance' | 'calories' | 'streak';
  targetValue: number;
  currentValue: number;
  lockAmount: number;
  currency: 'ETH';
  deadline: any; // Can be string, Firestore Timestamp, or Date
  userAddress: string;
  status: 'active' | 'completed' | 'failed' | 'pending_verification' | 'cancelled';
  contractAddress: string;
  txHash: string;
  dataSource?: {
    type: 'github' | 'strava' | 'onchain' | 'manual';
    config?: Record<string, any>;
  };
  verificationResult?: {
    achieved: boolean;
    actualValue: number;
    verifiedAt: string;
    txHash: string;
    verificationMethod: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
}

// Utility function to parse different date formats from Firestore
const parseFirestoreDate = (dateValue: any): Date => {
  if (typeof dateValue === 'string') {
    // ISO string from Firestore serialization
    return new Date(dateValue);
  } else if (dateValue && typeof dateValue === 'object') {
    // Check for Firestore Timestamp object with _seconds property
    if ('_seconds' in dateValue && typeof dateValue._seconds === 'number') {
      return new Date(dateValue._seconds * 1000);
    }
    // Check for Firestore Timestamp object with seconds property (alternative format)
    else if ('seconds' in dateValue && typeof dateValue.seconds === 'number') {
      return new Date(dateValue.seconds * 1000);
    }
    // Check if it has toDate method (Firestore Timestamp)
    else if (typeof dateValue.toDate === 'function') {
      return dateValue.toDate();
    }
  } else if (dateValue instanceof Date) {
    // Already a Date object
    return dateValue;
  }
  
  // Fallback: try to parse as Date
  return new Date(dateValue);
};

export default function GoalDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const goalId = params.goalId as string;

  const [goal, setGoal] = useState<Goal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isExpired: false
  });

  // Fetch goal data
  useEffect(() => {
    const fetchGoal = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/goals/goal/${goalId}`);
        
        if (!response.ok) {
          throw new Error('Goal not found');
        }

        const result = await response.json();
        if (result.success) {
          setGoal(result.data.goal);
        } else {
          throw new Error(result.error || 'Failed to fetch goal');
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (goalId) {
      fetchGoal();
    }
  }, [goalId]);

  // Calculate time left
  useEffect(() => {
    if (!goal) return;

    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      
      // Debug: Log the deadline format
      console.log('Deadline value:', goal.deadline);
      console.log('Deadline type:', typeof goal.deadline);
      
      // Parse the deadline using our utility function
      let deadlineDate: Date;
      try {
        deadlineDate = parseFirestoreDate(goal.deadline);
        console.log('Parsed deadline date:', deadlineDate);
      } catch (error) {
        console.error('Invalid deadline format:', goal.deadline, error);
        setTimeLeft({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          isExpired: true
        });
        return;
      }

      const deadlineTime = deadlineDate.getTime();

      // Check if we got a valid timestamp
      if (isNaN(deadlineTime)) {
        console.error('Invalid deadline format:', goal.deadline);
        setTimeLeft({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          isExpired: true
        });
        return;
      }

      const difference = deadlineTime - now;

      if (difference <= 0) {
        setTimeLeft({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          isExpired: true
        });
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeLeft({
        days,
        hours,
        minutes,
        seconds,
        isExpired: false
      });
    };

    // Calculate immediately
    calculateTimeLeft();

    // Update every second
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [goal]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-blue-400 bg-blue-500/20 border-blue-500/30';
      case 'completed':
        return 'text-green-400 bg-green-500/20 border-green-500/30';
      case 'failed':
        return 'text-red-400 bg-red-500/20 border-red-500/30';
      case 'cancelled':
        return 'text-gray-400 bg-gray-500/20 border-gray-500/30';
      default:
        return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'fitness':
        return '🏃‍♂️';
      case 'productivity':
        return '💻';
      case 'onchain':
        return '⛓️';
      default:
        return '🎯';
    }
  };

  const getProgressPercentage = () => {
    if (!goal) return 0;
    return Math.min((goal.currentValue / goal.targetValue) * 100, 100);
  };

  const handleProgressUpdate = (result: any) => {
    if (goal) {
      setGoal({
        ...goal,
        currentValue: result.newValue,
        status: result.isCompleted ? 'completed' : goal.status,
        updatedAt: new Date().toISOString()
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary to-dark flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
          <p className="text-accent text-lg">Loading goal...</p>
        </div>
      </div>
    );
  }

  if (error || !goal) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary to-dark flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-400 mb-4">Goal Not Found</h1>
          <p className="text-zinc-400 mb-6">{error || 'The goal you are looking for does not exist.'}</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-accent text-dark px-6 py-3 rounded-lg font-semibold hover:scale-105 transition-transform"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const isOwner = isConnected && address && goal.userAddress.toLowerCase() === address.toLowerCase();

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary to-dark py-10">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="text-accent hover:text-accent/80 mb-4 flex items-center gap-2"
          >
            ← Back
          </button>
          <h1 className="text-accent font-extrabold text-3xl md:text-4xl mb-2">
            Goal Details
          </h1>
        </div>

        {/* Main Goal Card */}
        <div className="bg-dark border border-accent/30 rounded-2xl p-8 shadow-lg mb-6">
          {/* Goal Header */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="text-4xl">{getCategoryIcon(goal.category)}</div>
              <div>
                <h2 className="text-accent font-bold text-2xl mb-1">{goal.title}</h2>
                <div className={`inline-flex px-3 py-1 rounded-full text-sm font-semibold border ${getStatusColor(goal.status)}`}>
                  {goal.status.charAt(0).toUpperCase() + goal.status.slice(1)}
                </div>
              </div>
            </div>
            {isOwner && goal.status === 'active' && (
              <ProgressUpdateButton
                goalId={goal.id}
                onProgressUpdated={handleProgressUpdate}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              />
            )}
          </div>

          {/* Description */}
          {goal.description && (
            <div className="mb-6">
              <p className="text-zinc-300 text-lg leading-relaxed">{goal.description}</p>
            </div>
          )}

          {/* Goal Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {/* Lock Amount */}
            <div className="bg-primary/20 rounded-lg p-4">
              <h3 className="text-accent font-semibold mb-2">Lock Amount</h3>
              <p className="text-2xl font-bold text-white">
                {goal.lockAmount} {goal.currency}
              </p>
            </div>

            {/* Category & Type */}
            <div className="bg-primary/20 rounded-lg p-4">
              <h3 className="text-accent font-semibold mb-2">Category & Type</h3>
              <p className="text-white capitalize">{goal.category}</p>
              <p className="text-zinc-400 capitalize">{goal.type}</p>
            </div>

            {/* Target Metric */}
            <div className="bg-primary/20 rounded-lg p-4">
              <h3 className="text-accent font-semibold mb-2">Target</h3>
              <p className="text-2xl font-bold text-white">{goal.targetValue}</p>
              <p className="text-zinc-400 capitalize">{goal.type}s</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-accent font-semibold">Progress</h3>
              <span className="text-zinc-400">
                {goal.currentValue} / {goal.targetValue} ({Math.round(getProgressPercentage())}%)
              </span>
            </div>
            <div className="w-full bg-zinc-700 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-accent to-green-400 h-3 rounded-full transition-all duration-500"
                style={{ width: `${getProgressPercentage()}%` }}
              ></div>
            </div>
          </div>

          {/* Deadline & Time Left */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Deadline */}
            <div className="bg-primary/20 rounded-lg p-4">
              <h3 className="text-accent font-semibold mb-2">Deadline</h3>
              <p className="text-white text-lg">
                {parseFirestoreDate(goal.deadline).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>

            {/* Time Left */}
            <div className="bg-primary/20 rounded-lg p-4">
              <h3 className="text-accent font-semibold mb-2">Time Left</h3>
              {timeLeft.isExpired ? (
                <p className="text-red-400 text-lg font-bold">Expired</p>
              ) : (
                <div className="flex gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">{timeLeft.days}</div>
                    <div className="text-xs text-zinc-400">Days</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">{timeLeft.hours}</div>
                    <div className="text-xs text-zinc-400">Hours</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">{timeLeft.minutes}</div>
                    <div className="text-xs text-zinc-400">Minutes</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">{timeLeft.seconds}</div>
                    <div className="text-xs text-zinc-400">Seconds</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Additional Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Data Source */}
          <div className="bg-dark border border-accent/30 rounded-lg p-6">
            <h3 className="text-accent font-semibold mb-4">Data Source</h3>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-accent/20 rounded-full flex items-center justify-center">
                {goal.dataSource?.type === 'github' && '🐙'}
                {goal.dataSource?.type === 'strava' && '🏃'}
                {goal.dataSource?.type === 'onchain' && '⛓️'}
              </div>
              <span className="text-white capitalize">{goal.dataSource?.type || 'Manual'}</span>
            </div>
          </div>

          {/* Contract Info */}
          <div className="bg-dark border border-accent/30 rounded-lg p-6">
            <h3 className="text-accent font-semibold mb-4">Contract</h3>
            <div className="space-y-2">
              <div>
                <span className="text-zinc-400 text-sm">Address:</span>
                <p className="text-white font-mono text-sm break-all">
                  {goal.contractAddress}
                </p>
              </div>
              <div>
                <span className="text-zinc-400 text-sm">Transaction:</span>
                <a
                  href={`https://basescan.org/tx/${goal.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:text-accent/80 font-mono text-sm break-all underline"
                >
                  {goal.txHash.slice(0, 10)}...{goal.txHash.slice(-8)}
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}