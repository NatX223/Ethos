"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useProfiles, useActiveAccount } from "thirdweb/react";
import { client } from "~/lib/thirdwebClient";

const typeOptions = {
  Productivity: ["Commit", "Streak"],
  Social: ["Engagement", "Follower"],
  Onchain: ["Volume"],
  Fitness: ["Distance", "Streak", "Calories"],
};

export default function CreateChallengePage() {
  const router = useRouter();
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

  const handleCreateChallenge = async () => {
    const account = useActiveAccount();
    const { data: profiles } = useProfiles({ client });
    if (!account) return;
    setIsLoading(true);
    try {
      // Prepare FormData with cover image and timeline data
      const formData = new FormData();
      const challengeData = {
        title: title,
        description: description,
        metric: metric,
        deadline: deadline,
        authorAddress: account.address,
        username: profiles?.[0]?.details?.email || account.address?.slice(0, 8) + "...",
        platform: profiles?.[0]?.type || "wallet",
      };
      formData.append("challengeData", JSON.stringify(challengeData));
      // Call backend API to handle uploads and timeline creation
      const response = await fetch("/api/challenges/create", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) throw new Error("Failed to create challenge");
      const { challengeId, challengeMarket } = await response.json();
      // Redirect to the timeline page
      router.push(`/challenge/${challengeId}`);
    } catch (error: any) {
      setErrorMsg(error.message || "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

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
              // TODO: handle create
              alert("Challenge created!");
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
                <option value="Social">Social</option>
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
              disabled={!isValid}
              className="w-full bg-accent text-dark font-bold rounded-xl px-6 py-4 text-lg shadow-lg hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 mt-10"
            >
              Create Challenge
            </button>
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
                    Your Username
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
