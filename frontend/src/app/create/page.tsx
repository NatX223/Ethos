"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { parseEther } from "viem";

const typeOptions = {
  Productivity: ["Commit", "Streak"],
  Onchain: ["Volume", "PnL"],
  Fitness: ["Distance", "Streak", "Calories"],
};

export default function CreateChallengePage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Productivity");
  const [type, setType] = useState(typeOptions["Productivity"][0]);
  const [metric, setMetric] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("ETH");
  const [deadline, setDeadline] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState(false);
  const [touched, setTouched] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [contractAddress, setContractAddress] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<string>("idle");
  const [goalId, setGoalId] = useState<string | null>(null);

  // Wagmi hooks for contract interaction
  const {
    writeContract,
    data: hash,
    error: writeError,
    isPending: isWritePending,
  } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash,
    });

  // Update type when category changes
  const handleCategoryChange = (e: React.ChangeEvent<{ value: unknown }>) => {
    setCategory(e.target.value as string);
    setType(typeOptions[e.target.value as keyof typeof typeOptions][0]);
  };

  // Amount validation function
  const validateAmount = (value: string): boolean => {
    if (!value.trim()) return false;
    // Check if it's a valid number or decimal
    const numberRegex = /^\d+(\.\d+)?$/;
    return numberRegex.test(value) && parseFloat(value) > 0;
  };

  // Handle amount input change with validation
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow empty string, digits, and one decimal point
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setAmount(value);
    }
  };

  // Validation
  const isValid =
    title.trim() &&
    description.trim() &&
    category &&
    type &&
    metric &&
    validateAmount(amount) &&
    deadline;

  const fetchContractAddress = async (): Promise<string | null> => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/goals/contract-address`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch contract address");
      }

      const result = await response.json();
      if (result.success && result.data?.contractAddress) {
        return result.data.contractAddress;
      }

      throw new Error("No contract address returned");
    } catch (error) {
      console.error("Error fetching contract address:", error);
      throw error;
    }
  };

  // Convert deadline to Unix timestamp (seconds)
  const convertDeadlineToTimestamp = (date: Date): bigint => {
    return BigInt(Math.floor(date.getTime() / 1000));
  };

  // Save goal to database
  const saveGoalToDatabase = async (
    transactionHash: string,
    contractAddr: string
  ) => {
    try {
      setCurrentStep("Saving goal to database...");

      const goalData = {
        title: title.trim(),
        description: description.trim(),
        category: category.toLowerCase(),
        type: type.toLowerCase(),
        targetValue: parseFloat(metric),
        lockAmount: parseFloat(amount),
        currency: currency,
        deadline: deadline.toISOString(),
        userAddress: address,
        contractAddress: contractAddr,
        txHash: transactionHash,
        dataSource: {
          type: "manual",
        },
      };

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/goals`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(goalData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save goal to database");
      }

      const result = await response.json();
      console.log("✅ Goal saved to database:", result.data.goalId);

      return result.data.goalId;
    } catch (error) {
      console.error("❌ Error saving goal to database:", error);
      throw error;
    }
  };

  // Call the smart contract initialize function
  const initializeContract = async (
    contractAddr: string,
    deadlineTimestamp: bigint,
    targetValue: bigint,
    lockAmountWei: bigint
  ) => {
    try {
      setCurrentStep("Initializing contract...");

      // Goal contract ABI for the initialize function
      const goalABI = [
        {
          inputs: [
            { internalType: "uint256", name: "_deadline", type: "uint256" },
            { internalType: "uint256", name: "_target", type: "uint256" },
          ],
          name: "initialize",
          outputs: [],
          stateMutability: "payable",
          type: "function",
        },
      ] as const;

      writeContract({
        address: contractAddr as `0x${string}`,
        abi: goalABI,
        functionName: "initialize",
        args: [deadlineTimestamp, targetValue],
        value: lockAmountWei,
      });
    } catch (error) {
      console.error("Error calling initialize:", error);
      throw error;
    }
  };

  const handleCreateGoal = async () => {
    if (!isConnected || !address) {
      setErrorMsg("Please connect your wallet first");
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setCurrentStep("Starting goal creation...");

    try {
      // Step 1: Fetch contract address from backend
      setCurrentStep("Fetching contract address...");
      console.log("🔄 Fetching contract address...");
      const fetchedContractAddress = await fetchContractAddress();

      if (!fetchedContractAddress) {
        throw new Error("No contract address available");
      }

      setContractAddress(fetchedContractAddress);
      console.log("✅ Contract address fetched:", fetchedContractAddress);

      // Step 2: Prepare contract parameters
      setCurrentStep("Preparing contract parameters...");
      const deadlineTimestamp = convertDeadlineToTimestamp(deadline);
      const targetValue = BigInt(parseFloat(metric));
      const lockAmountWei = parseEther(amount); // Convert ETH to wei

      console.log("Contract parameters:", {
        deadline: deadlineTimestamp.toString(),
        target: targetValue.toString(),
        value: lockAmountWei.toString(),
      });

      // Step 3: Initialize the smart contract
      setCurrentStep("Please confirm the transaction in your wallet...");
      await initializeContract(
        fetchedContractAddress,
        deadlineTimestamp,
        targetValue,
        lockAmountWei
      );
    } catch (error: any) {
      console.error("❌ Error creating goal:", error);
      setErrorMsg(error.message || "Failed to create goal. Please try again.");
      setCurrentStep("idle");
    } finally {
      if (!hash) {
        setIsLoading(false);
      }
    }
  };

  // Handle transaction confirmation
  React.useEffect(() => {
    if (hash) {
      setTxHash(hash);
      setCurrentStep("Transaction submitted. Waiting for confirmation...");
    }
  }, [hash]);

  React.useEffect(() => {
    if (isConfirmed && hash && contractAddress) {
      const handleTransactionConfirmed = async () => {
        try {
          console.log("✅ Goal contract initialized successfully!");
          console.log("Transaction hash:", hash);

          // Save goal to database
          const createdGoalId = await saveGoalToDatabase(hash, contractAddress);
          setGoalId(createdGoalId);

          setCurrentStep("Goal created successfully! Redirecting...");

          // Redirect to goal page after a short delay
          setTimeout(() => {
            router.push(`/goals/${createdGoalId}`);
          }, 2000);
        } catch (error: any) {
          console.error("❌ Error saving goal:", error);
          setErrorMsg(
            error.message ||
              "Goal contract created but failed to save to database"
          );
          setCurrentStep("Contract created but database save failed");
        } finally {
          setIsLoading(false);
        }
      };

      handleTransactionConfirmed();
    }
  }, [isConfirmed, hash, contractAddress, router]);

  React.useEffect(() => {
    if (writeError) {
      setErrorMsg(writeError.message || "Transaction failed");
      setCurrentStep("idle");
      setIsLoading(false);
    }
  }, [writeError]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary to-dark py-10">
      <div className="max-w-7xl mx-auto px-4 xl:px-0">
        <div className="mb-10">
          <h1 className="text-accent font-extrabold text-3xl md:text-4xl mb-2">
            Create a New Challenge
          </h1>
          <p className="text-zinc-200 text-lg">
            Set your goal and lock some ETH.
          </p>
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
          {/* Form */}
          <form
            className="xl:col-span-7 bg-dark border border-accent/30 rounded-2xl p-8 shadow-lg"
            onSubmit={(e) => {
              e.preventDefault();
              setTouched(true);
              if (!isValid) return;
              handleCreateGoal();
            }}
          >
            {/* Challenge Title */}
            <div className="mb-12">
              <label className="block text-accent font-semibold mb-2">
                Challenge Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Run a Marathon"
                className="w-full bg-dark border border-accent/30 rounded-lg px-4 py-3 text-gray-500 placeholder-zinc-500 focus:outline-none focus:border-accent"
                required
              />
            </div>
            {/* Description */}
            <div className="mb-12">
              <label className="block text-accent font-semibold mb-2">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your challenge and what you hope to achieve…"
                rows={4}
                className="w-full bg-dark border border-accent/30 rounded-lg px-4 py-3 text-gray-500 placeholder-zinc-500 focus:outline-none focus:border-accent"
                required
              />
            </div>
            {/* Category */}
            <div className="mb-12">
              <label className="block text-accent font-semibold mb-2">
                Category
              </label>
              <select
                value={category}
                onChange={handleCategoryChange}
                className="w-full bg-dark border border-accent/30 rounded-lg px-4 py-3 text-gray-500 focus:outline-none focus:border-accent"
                required
              >
                <option value="Productivity">Productivity</option>
                <option value="Onchain">Onchain</option>
                <option value="Fitness">Fitness</option>
              </select>
            </div>
            {/* Type */}
            <div className="mb-12">
              <label className="block text-accent font-semibold mb-2">
                Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full bg-dark border border-accent/30 rounded-lg px-4 py-3 text-gray-500 focus:outline-none focus:border-accent"
                required
              >
                {typeOptions[category as keyof typeof typeOptions].map(
                  (opt: string) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  )
                )}
              </select>
            </div>
            {/* Metric */}
            <div className="mb-12">
              <label className="block text-accent font-semibold mb-2">
                Metric
              </label>
              <input
                type="number"
                value={metric}
                onChange={(e) => setMetric(e.target.value)}
                placeholder="e.g. 30 (for 30 days, 30 commits, 100 followers, etc.)"
                min={1}
                className="w-full bg-dark border border-accent/30 rounded-lg px-4 py-3 text-gray-500 placeholder-zinc-500 focus:outline-none focus:border-accent"
                required
              />
            </div>
            {/* Amount to Stake */}
            <div className="mb-12">
              <label className="block text-accent font-semibold mb-2">
                Lock Amount
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={amount}
                  onChange={handleAmountChange}
                  placeholder="0.0"
                  className={`flex-1 bg-dark border rounded-lg px-4 py-3 text-gray-500 placeholder-zinc-500 focus:outline-none focus:border-accent ${
                    amount && !validateAmount(amount)
                      ? "border-red-500"
                      : "border-accent/30"
                  }`}
                  required
                />
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="bg-dark border border-accent/30 rounded-lg px-4 py-3 text-gray-500 focus:outline-none focus:border-accent min-w-[100px]"
                >
                  <option value="ETH">ETH</option>
                  <option value="USDC">USDC</option>
                </select>
              </div>
              {amount && !validateAmount(amount) && (
                <p className="text-red-400 text-sm mt-1">
                  Please enter a valid amount (numbers and decimals only)
                </p>
              )}
            </div>
            {/* Deadline */}
            <div className="mb-12">
              <label className="block text-accent font-semibold mb-2">
                Deadline
              </label>
              <input
                type="date"
                value={deadline.toISOString().split("T")[0]}
                onChange={(e) => setDeadline(new Date(e.target.value))}
                min={new Date().toISOString().split("T")[0]}
                className="w-full bg-dark border border-accent/30 rounded-lg px-4 py-3 text-gray-500 focus:outline-none focus:border-accent"
                required
              />
            </div>
            {/* Create Button */}
            <button
              type="submit"
              disabled={!isValid || isLoading || isWritePending || isConfirming}
              className="w-full bg-accent text-dark font-bold rounded-xl px-6 py-4 text-lg shadow-lg hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 mt-10"
            >
              {isLoading || isWritePending || isConfirming
                ? currentStep
                : "Create Goal"}
            </button>

            {errorMsg && (
              <div className="mt-4 p-4 bg-red-500/20 border border-red-500/30 rounded-lg">
                <p className="text-red-400 text-sm">{errorMsg}</p>
              </div>
            )}

            {contractAddress && (
              <div className="mt-4 p-4 bg-green-500/20 border border-green-500/30 rounded-lg">
                <p className="text-green-400 text-sm">
                  <strong>Contract Address:</strong> {contractAddress}
                </p>
              </div>
            )}

            {txHash && (
              <div className="mt-4 p-4 bg-blue-500/20 border border-blue-500/30 rounded-lg">
                <p className="text-blue-400 text-sm">
                  <strong>Transaction Hash:</strong>
                  <a
                    href={`https://basescan.org/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2 underline hover:text-blue-300"
                  >
                    {txHash.slice(0, 10)}...{txHash.slice(-8)}
                  </a>
                </p>
              </div>
            )}

            {isConfirmed && (
              <div className="mt-4 p-4 bg-green-500/20 border border-green-500/30 rounded-lg">
                <p className="text-green-400 text-sm">
                  ✅ <strong>Goal Created Successfully!</strong> Your smart
                  contract has been initialized and saved to database.
                  {goalId && (
                    <>
                      <br />
                      <strong>Goal ID:</strong> {goalId}
                    </>
                  )}
                </p>
              </div>
            )}
          </form>

          {/* Live Preview Card */}
          <div className="xl:col-span-5 flex items-start justify-center">
            <div className="w-full max-w-md bg-dark border border-accent/40 rounded-2xl p-8 shadow-lg mt-10 xl:mt-0">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold text-xl">
                  <span>👤</span>
                </div>
                <div>
                  <div className="text-gray-500 font-semibold text-lg">
                    {isConnected && address
                      ? `${address.slice(0, 6)}...${address.slice(-4)}`
                      : "Your Username"}
                  </div>
                  <div className="text-zinc-400 text-xs">Challenger</div>
                </div>
              </div>
              <h2 className="text-accent font-bold text-2xl mb-2 break-words min-h-[2.5rem]">
                {title || "Challenge Title"}
              </h2>
              <div className="text-zinc-300 text-sm mb-4 min-h-[3rem]">
                {description || "Challenge description will appear here."}
              </div>
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="bg-primary/30 text-accent px-3 py-1 rounded-full text-xs font-semibold">
                  {category}
                </span>
                <span className="bg-accent/20 text-accent px-3 py-1 rounded-full text-xs font-semibold">
                  {type}
                </span>
                {metric && (
                  <span className="bg-accent/10 text-accent px-3 py-1 rounded-full text-xs font-semibold">
                    Metric: {metric}
                  </span>
                )}
                {amount && validateAmount(amount) && (
                  <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-xs font-semibold">
                    Stake: {amount} {currency}
                  </span>
                )}
                {deadline && (
                  <span className="bg-accent/10 text-accent px-3 py-1 rounded-full text-xs font-semibold">
                    Deadline: {new Date(deadline).toLocaleString()}
                  </span>
                )}
              </div>
              <div className="text-zinc-400 text-xs">
                This is how your challenge will appear to others.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
