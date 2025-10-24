"use client";

import React, { useState } from "react";

interface ClaimRewardButtonProps {
  goalId: string;
  onRewardClaimed?: (result: any) => void;
  className?: string;
  disabled?: boolean;
}

export default function ClaimRewardButton({
  goalId,
  onRewardClaimed,
  className = "",
  disabled = false
}: ClaimRewardButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleClaimReward = async () => {
    if (disabled || isLoading) return;

    setIsLoading(true);
    
    try {
      // TODO: Implement actual reward claiming logic
      // This would involve:
      // 1. Calling smart contract to claim rewards
      // 2. Updating backend with claim status
      // 3. Handling transaction confirmation
      
      console.log(`Claiming reward for goal: ${goalId}`);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Dummy success response
      const result = {
        success: true,
        txHash: '0x' + Math.random().toString(16).substr(2, 64),
        rewardAmount: Math.random() * 0.1 + 0.01, // Random reward between 0.01-0.11 ETH
        claimedAt: new Date().toISOString()
      };
      
      // Show success message
      alert(`Reward claimed successfully! TX: ${result.txHash.slice(0, 10)}...`);
      
      // Call callback if provided
      if (onRewardClaimed) {
        onRewardClaimed(result);
      }
      
    } catch (error) {
      console.error('Error claiming reward:', error);
      alert('Failed to claim reward. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleClaimReward}
      disabled={disabled || isLoading}
      className={`
        px-4 py-2 rounded-lg font-semibold transition-all duration-200
        flex items-center gap-2 min-w-[140px] justify-center
        ${disabled 
          ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
          : 'bg-green-600 hover:bg-green-700 text-white hover:scale-105'
        }
        ${className}
      `}
    >
      {isLoading ? (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          <span>Claiming...</span>
        </>
      ) : (
        <>
          <span>🎁</span>
          <span>Claim Reward</span>
        </>
      )}
    </button>
  );
}