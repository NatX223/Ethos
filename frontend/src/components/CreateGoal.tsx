"use client";

import React, { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther } from "viem";
import { baseSepolia } from "wagmi/chains";

// Goal Contract ABI - only the initialize function
const GOAL_CONTRACT_ABI = [
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_deadline",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_target",
        "type": "uint256"
      }
    ],
    "name": "initialize",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  }
] as const;

interface CreateGoalProps {
  onGoalCreated?: (goalId: string) => void;
}

interface GoalFormData {
  title: string;
  description: string;
  category: 'fitness' | 'coding' | 'reading' | 'health' | 'productivity' | 'learning' | 'other';
  type: 'daily' | 'weekly' | 'monthly' | 'one-time' | 'streak';
  metric: string;
  targetValue: number;
  lockAmount: number;
  currency: 'ETH' | 'USDC';
  deadline: string;
  dataSource: {
    type: 'github' | 'strava' | 'manual';
    config?: Record<string, any>;
  };
}

export function CreateGoal({ onGoalCreated }: CreateGoalProps) {
  const { address, isConnected, chain } = useAccount();
  const { writeContract, data: hash, isPending: isWritePending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  const [formData, setFormData] = useState<GoalFormData>({
    title: '',
    description: '',
    category: 'fitness',
    type: 'one-time',
    metric: '',
    targetValue: 1,
    lockAmount: 0.01,
    currency: 'ETH',
    deadline: '',
    dataSource: { type: 'manual' }
  });

  const [contractAddress, setContractAddress] = useState<string>('');
  const [addressId, setAddressId] = useState<string>('');
  const [isGettingAddress, setIsGettingAddress] = useState(false);
  const [isCreatingGoal, setIsCreatingGoal] = useState(false);
  const [step, setStep] = useState<'form' | 'contract' | 'blockchain' | 'database' | 'complete'>('form');

  // Get available contract address
  const getContractAddress = async () => {
    if (!address) return;

    setIsGettingAddress(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/goals/get-contract-address`);
      const data = await response.json();

      if (data.success) {
        setContractAddress(data.data.contractAddress);
        setAddressId(data.data.addressId);
        setStep('contract');
      } else {
        throw new Error(data.error || 'Failed to get contract address');
      }
    } catch (error) {
      console.error('Error getting contract address:', error);
      alert('Failed to get contract address. Please try again.');
    } finally {
      setIsGettingAddress(false);
    }
  };

  // Initialize contract on blockchain
  const initializeContract = async () => {
    if (!contractAddress || !address) return;

    setStep('blockchain');

    try {
      // Convert deadline to Unix timestamp
      const deadlineTimestamp = Math.floor(new Date(formData.deadline).getTime() / 1000);
      
      // Convert target value to appropriate format (assuming it's a simple number for now)
      const targetValueBN = BigInt(Math.floor(formData.targetValue * 100)); // Multiply by 100 for precision
      
      // Convert lock amount to wei
      const lockAmountWei = parseEther(formData.lockAmount.toString());

      await writeContract({
        address: contractAddress as `0x${string}`,
        abi: GOAL_CONTRACT_ABI,
        functionName: 'initialize',
        args: [BigInt(deadlineTimestamp), targetValueBN],
        value: lockAmountWei,
      });

    } catch (error) {
      console.error('Error initializing contract:', error);
      alert('Failed to initialize contract. Please try again.');
      setStep('contract');
    }
  };

  // Create goal in database after successful blockchain transaction
  const createGoalInDatabase = async () => {
    if (!hash || !address) return;

    setStep('database');
    setIsCreatingGoal(true);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/goals/create-with-contract`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          userAddress: address,
          contractAddress,
          addressId,
          txHash: hash,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setStep('complete');
        onGoalCreated?.(data.data.goalId);
        alert('Goal created successfully!');
      } else {
        throw new Error(data.error || 'Failed to create goal in database');
      }
    } catch (error) {
      console.error('Error creating goal in database:', error);
      alert('Failed to create goal in database. Please contact support.');
    } finally {
      setIsCreatingGoal(false);
    }
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!formData.title || !formData.metric || !formData.deadline) {
      alert('Please fill in all required fields');
      return;
    }

    // Check if deadline is in the future
    if (new Date(formData.deadline) <= new Date()) {
      alert('Deadline must be in the future');
      return;
    }

    getContractAddress();
  };

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'targetValue' || name === 'lockAmount') {
      setFormData(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  // Auto-trigger database creation when transaction is confirmed
  React.useEffect(() => {
    if (isConfirmed && hash && step === 'blockchain') {
      createGoalInDatabase();
    }
  }, [isConfirmed, hash, step]);

  if (!isConnected || !address) {
    return (
      <div className="text-center p-8 bg-dark border border-accent/30 rounded-xl">
        <h2 className="text-xl font-bold text-accent mb-4">Create Your Goal</h2>
        <p className="text-zinc-400 mb-6">Connect your wallet to create a goal</p>
      </div>
    );
  }

  if (chain?.id !== baseSepolia.id) {
    return (
      <div className="text-center p-8 bg-dark border border-accent/30 rounded-xl">
        <h2 className="text-xl font-bold text-accent mb-4">Wrong Network</h2>
        <p className="text-zinc-400 mb-6">Please switch to Base Sepolia to create goals</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-dark border border-accent/30 rounded-xl">
      <h2 className="text-2xl font-bold text-accent mb-6">Create Your Goal</h2>

      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-8">
        {['form', 'contract', 'blockchain', 'database', 'complete'].map((stepName, index) => (
          <div key={stepName} className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              step === stepName 
                ? 'bg-accent text-dark' 
                : index < ['form', 'contract', 'blockchain', 'database', 'complete'].indexOf(step)
                  ? 'bg-green-500 text-white'
                  : 'bg-zinc-700 text-zinc-400'
            }`}>
              {index + 1}
            </div>
            {index < 4 && (
              <div className={`w-12 h-1 mx-2 ${
                index < ['form', 'contract', 'blockchain', 'database', 'complete'].indexOf(step)
                  ? 'bg-green-500'
                  : 'bg-zinc-700'
              }`} />
            )}
          </div>
        ))}
      </div>

      {step === 'form' && (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Goal Title *
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              className="w-full bg-dark border border-accent/20 rounded-lg px-3 py-2 text-zinc-100 focus:border-accent focus:outline-none"
              placeholder="e.g., Run 100km this month"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={3}
              className="w-full bg-dark border border-accent/20 rounded-lg px-3 py-2 text-zinc-100 focus:border-accent focus:outline-none"
              placeholder="Describe your goal in detail..."
            />
          </div>

          {/* Category and Type */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Category *
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className="w-full bg-dark border border-accent/20 rounded-lg px-3 py-2 text-zinc-100 focus:border-accent focus:outline-none"
                required
              >
                <option value="fitness">Fitness</option>
                <option value="coding">Coding</option>
                <option value="reading">Reading</option>
                <option value="health">Health</option>
                <option value="productivity">Productivity</option>
                <option value="learning">Learning</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Type *
              </label>
              <select
                name="type"
                value={formData.type}
                onChange={handleInputChange}
                className="w-full bg-dark border border-accent/20 rounded-lg px-3 py-2 text-zinc-100 focus:border-accent focus:outline-none"
                required
              >
                <option value="one-time">One-time</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="streak">Streak</option>
              </select>
            </div>
          </div>

          {/* Metric and Target */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Metric *
              </label>
              <input
                type="text"
                name="metric"
                value={formData.metric}
                onChange={handleInputChange}
                className="w-full bg-dark border border-accent/20 rounded-lg px-3 py-2 text-zinc-100 focus:border-accent focus:outline-none"
                placeholder="e.g., kilometers, commits, books"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Target Value *
              </label>
              <input
                type="number"
                name="targetValue"
                value={formData.targetValue}
                onChange={handleInputChange}
                min="0.01"
                step="0.01"
                className="w-full bg-dark border border-accent/20 rounded-lg px-3 py-2 text-zinc-100 focus:border-accent focus:outline-none"
                required
              />
            </div>
          </div>

          {/* Lock Amount and Deadline */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Lock Amount (ETH) *
              </label>
              <input
                type="number"
                name="lockAmount"
                value={formData.lockAmount}
                onChange={handleInputChange}
                min="0.001"
                step="0.001"
                className="w-full bg-dark border border-accent/20 rounded-lg px-3 py-2 text-zinc-100 focus:border-accent focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Deadline *
              </label>
              <input
                type="datetime-local"
                name="deadline"
                value={formData.deadline}
                onChange={handleInputChange}
                className="w-full bg-dark border border-accent/20 rounded-lg px-3 py-2 text-zinc-100 focus:border-accent focus:outline-none"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isGettingAddress}
            className="w-full bg-accent text-dark font-semibold rounded-lg px-6 py-3 transition hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGettingAddress ? 'Getting Contract Address...' : 'Create Goal'}
          </button>
        </form>
      )}

      {step === 'contract' && (
        <div className="text-center space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-accent mb-2">Contract Address Retrieved</h3>
            <p className="text-zinc-400 mb-4">Your goal will be deployed to:</p>
            <code className="bg-dark border border-accent/20 rounded px-3 py-2 text-accent text-sm">
              {contractAddress}
            </code>
          </div>
          
          <button
            onClick={initializeContract}
            disabled={isWritePending}
            className="bg-accent text-dark font-semibold rounded-lg px-6 py-3 transition hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isWritePending ? 'Initializing Contract...' : 'Initialize Contract'}
          </button>

          {writeError && (
            <p className="text-red-400 text-sm">
              Error: {writeError.message}
            </p>
          )}
        </div>
      )}

      {step === 'blockchain' && (
        <div className="text-center space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-accent mb-2">Blockchain Transaction</h3>
            {isConfirming ? (
              <div>
                <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-zinc-400">Waiting for transaction confirmation...</p>
                {hash && (
                  <p className="text-xs text-zinc-500 mt-2">
                    TX: {hash.slice(0, 10)}...{hash.slice(-8)}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-zinc-400">Transaction submitted, waiting for confirmation...</p>
            )}
          </div>
        </div>
      )}

      {step === 'database' && (
        <div className="text-center space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-accent mb-2">Creating Goal</h3>
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-zinc-400">Saving your goal to the database...</p>
          </div>
        </div>
      )}

      {step === 'complete' && (
        <div className="text-center space-y-6">
          <div>
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-accent mb-2">Goal Created Successfully!</h3>
            <p className="text-zinc-400 mb-4">Your goal has been created and deployed to the blockchain.</p>
            <div className="space-y-2 text-sm text-zinc-500">
              <p>Contract: {contractAddress}</p>
              {hash && <p>Transaction: {hash}</p>}
            </div>
          </div>
          
          <button
            onClick={() => {
              setStep('form');
              setFormData({
                title: '',
                description: '',
                category: 'fitness',
                type: 'one-time',
                metric: '',
                targetValue: 1,
                lockAmount: 0.01,
                currency: 'ETH',
                deadline: '',
                dataSource: { type: 'manual' }
              });
              setContractAddress('');
              setAddressId('');
            }}
            className="bg-accent text-dark font-semibold rounded-lg px-6 py-3 transition hover:scale-105"
          >
            Create Another Goal
          </button>
        </div>
      )}
    </div>
  );
}