"use client";

import React, { useState } from "react";
import { useAccount } from "wagmi";

interface ProgressUpdateButtonProps {
  goalId: string;
  onProgressUpdated?: (result: any) => void;
  className?: string;
}

export default function ProgressUpdateButton({ 
  goalId, 
  onProgressUpdated, 
  className = "" 
}: ProgressUpdateButtonProps) {
  const { address } = useAccount();
  const [isUpdating, setIsUpdating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  const updateProgress = async () => {
    if (!address) {
      setMessage("Please connect your wallet first");
      setIsError(true);
      return;
    }

    setIsUpdating(true);
    setMessage(null);
    setIsError(false);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/goals/${goalId}/update-progress`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userAddress: address,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to update progress");
      }

      setMessage("Progress updated successfully!");
      setIsError(false);

      // Call callback if provided
      if (onProgressUpdated) {
        onProgressUpdated(result.data);
      }

      // Clear message after 3 seconds
      setTimeout(() => {
        setMessage(null);
      }, 3000);

    } catch (error: any) {
      console.error("Error updating progress:", error);
      setMessage(error.message || "Failed to update progress");
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
        onClick={updateProgress}
        disabled={isUpdating || !address}
        className={`
          flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium
          transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed
          ${className || "bg-blue-600 hover:bg-blue-700 text-white"}
        `}
      >
        {isUpdating && (
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
        )}
        {isUpdating ? "Updating..." : "Update Progress"}
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