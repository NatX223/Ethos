"use client";

import React, { useState } from "react";
import { useAccount } from "wagmi";

interface UpdateAllGoalsButtonProps {
  onProgressUpdated?: (results: any[]) => void;
  className?: string;
}

export default function UpdateAllGoalsButton({ 
  onProgressUpdated, 
  className = "" 
}: UpdateAllGoalsButtonProps) {
  const { address } = useAccount();
  const [isUpdating, setIsUpdating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  const updateAllGoals = async () => {
    if (!address) {
      setMessage("Please connect your wallet first");
      setIsError(true);
      return;
    }

    setIsUpdating(true);
    setMessage(null);
    setIsError(false);

    try {
      const response = await fetch(`/api/goals/user/${address}/update-progress`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to update goals");
      }

      const updatedCount = result.data.totalUpdated;
      setMessage(`Successfully updated ${updatedCount} goal${updatedCount !== 1 ? 's' : ''}!`);
      setIsError(false);

      // Call callback if provided
      if (onProgressUpdated) {
        onProgressUpdated(result.data.updatedGoals);
      }

      // Clear message after 3 seconds
      setTimeout(() => {
        setMessage(null);
      }, 3000);

    } catch (error: any) {
      console.error("Error updating goals:", error);
      setMessage(error.message || "Failed to update goals");
      setIsError(true);

      // Clear error message after 5 seconds
      setTimeout(() => {
        setMessage(null);
        setIsError(false);
      }, 5000);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={updateAllGoals}
        disabled={isUpdating || !address}
        className={`
          flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium
          transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed
          ${className || "bg-green-600 hover:bg-green-700 text-white"}
        `}
      >
        {isUpdating && (
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
        )}
        {isUpdating ? "Updating All Goals..." : "Update All My Goals"}
      </button>

      {message && (
        <div
          className={`
            text-sm p-2 rounded-lg
            ${
              isError
                ? "bg-red-500/20 border border-red-500/30 text-red-400"
                : "bg-green-500/20 border border-green-500/30 text-green-400"
            }
          `}
        >
          {message}
        </div>
      )}
    </div>
  );
}