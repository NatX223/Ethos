"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { AnimatePresence } from "framer-motion";
import { useConnect, useAccount, useDisconnect, useSwitchChain } from "wagmi";
import { coinbaseWallet } from "wagmi/connectors";
import { baseSepolia } from "wagmi/chains";

// Wallet Connection Component using Coinbase Wallet
function WalletConnectButton() {
  const { connect, connectors, isPending } = useConnect();
  const { address, isConnected, chain } = useAccount();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const [showOptions, setShowOptions] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  // Auto-switch to Base Sepolia when wallet connects
  useEffect(() => {
    if (isConnected && chain && chain.id !== baseSepolia.id) {
      switchChain({ chainId: baseSepolia.id });
    }
  }, [isConnected, chain, switchChain]);

  // Auto-create user when wallet connects
  useEffect(() => {
    if (isConnected && address && !isCreatingUser) {
      createUserIfNeeded();
    }
  }, [isConnected, address]);

  const createUserIfNeeded = async () => {
    if (!address) return;

    try {
      // Check if user exists
      const checkResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/users/${address}`
      );

      if (checkResponse.status === 404) {
        // User doesn't exist, create them
        setIsCreatingUser(true);

        const createResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/users/signup`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              walletAddress: address,
              profile: {
                displayName: `User ${address.slice(0, 6)}`,
              },
            }),
          }
        );

        if (createResponse.ok) {
          console.log("User created successfully");
        } else {
          const errorData = await createResponse.json();
          console.error("Error creating user:", errorData);
        }

        setIsCreatingUser(false);
      }
    } catch (error) {
      console.error("Error creating user:", error);
      setIsCreatingUser(false);
    }
  };

  const connectCoinbaseWallet = () => {
    const coinbaseConnector = connectors.find(
      (connector) => connector.id === "coinbaseWalletSDK"
    );
    if (coinbaseConnector) {
      connect({ connector: coinbaseConnector });
    }
    setShowOptions(false);
  };

  const connectMetaMask = () => {
    const metaMaskConnector = connectors.find(
      (connector) => connector.id === "metaMask"
    );
    if (metaMaskConnector) {
      connect({ connector: metaMaskConnector });
    }
    setShowOptions(false);
  };

  const walletOptions = [
    {
      id: "coinbase",
      name: "Coinbase Wallet",
      onClick: connectCoinbaseWallet,
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.568 8.16c-.169-.171-.394-.267-.632-.267-.238 0-.463.096-.632.267l-1.071 1.071-1.071-1.071c-.169-.171-.394-.267-.632-.267-.238 0-.463.096-.632.267-.348.348-.348.916 0 1.264l1.071 1.071-1.071 1.071c-.348.348-.348.916 0 1.264.174.174.402.261.632.261.23 0 .458-.087.632-.261l1.071-1.071 1.071 1.071c.174.174.402.261.632.261.23 0 .458-.087.632-.261.348-.348.348-.916 0-1.264L13.536 12l1.071-1.071c.348-.348.348-.916 0-1.264z" />
        </svg>
      ),
    },
    {
      id: "metamask",
      name: "MetaMask",
      onClick: connectMetaMask,
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        </svg>
      ),
    },
  ];

  if (isConnected && address) {
    const isCorrectChain = chain?.id === baseSepolia.id;

    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 bg-accent/10 border border-accent rounded-lg px-4 py-2">
          <div
            className={`w-2 h-2 rounded-full ${
              isCreatingUser
                ? "bg-yellow-400 animate-pulse"
                : isCorrectChain
                ? "bg-green-400"
                : "bg-orange-400"
            }`}
          ></div>
          <div className="flex flex-col">
            <span className="text-accent font-medium text-sm">
              {isCreatingUser
                ? "Setting up..."
                : `${address.slice(0, 6)}...${address.slice(-4)}`}
            </span>
            {!isCreatingUser && (
              <span className="text-xs text-zinc-400">
                {isCorrectChain
                  ? "Base Sepolia"
                  : chain?.name || "Unknown Chain"}
              </span>
            )}
          </div>
        </div>
        {!isCreatingUser && !isCorrectChain && (
          <button
            onClick={() => switchChain({ chainId: baseSepolia.id })}
            className="text-orange-400 hover:text-orange-300 text-xs px-2 py-1 rounded transition-colors border border-orange-400/30"
            title="Switch to Base Sepolia"
          >
            Switch Network
          </button>
        )}
        {!isCreatingUser && (
          <button
            onClick={() => disconnect()}
            className="text-zinc-400 hover:text-zinc-200 text-sm px-2 py-1 rounded transition-colors"
            title="Disconnect"
          >
            ✕
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowOptions(!showOptions)}
        disabled={isPending}
        className="bg-accent text-dark font-semibold rounded-lg shadow px-5 py-2 transition hover:scale-105 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? "Connecting..." : "Connect Wallet"}
        <svg
          className={`w-4 h-4 transition-transform ${
            showOptions ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      <AnimatePresence>
        {showOptions && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full mt-2 right-0 bg-dark border border-accent/30 rounded-lg shadow-lg overflow-hidden z-10 min-w-[200px]"
          >
            <div className="p-2">
              <div className="text-accent text-sm font-medium px-3 py-2 border-b border-accent/20 mb-2">
                Choose your wallet
              </div>
              {walletOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={option.onClick}
                  disabled={isPending}
                  className="w-full flex items-center gap-3 px-3 py-2 text-zinc-100 hover:bg-accent/10 rounded-md transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="text-accent">{option.icon}</div>
                  <span className="font-medium">{option.name}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Click outside to close */}
      {showOptions && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowOptions(false)}
        />
      )}
    </div>
  );
}

// Navbar
function Navbar() {
  const { address, isConnected } = useAccount();

  return (
    <nav className="fixed top-0 left-0 w-full z-50 bg-dark/80 backdrop-blur border-b border-dark/60">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-3">
        <div className="text-accent font-bold text-2xl tracking-tight">
          Ethos
        </div>
        <div className="hidden md:flex items-center gap-8">
          <a
            href="#how"
            className="text-gray-100 hover:underline underline-offset-8 transition"
          >
            How It Works
          </a>
          <a
            href="#explore"
            className="text-gray-100 hover:underline underline-offset-8 transition"
          >
            Explore
          </a>
          {isConnected && (
            <a
              href="/dashboard"
              className="text-gray-100 hover:underline underline-offset-8 transition"
            >
              Dashboard
            </a>
          )}
          <div className="ml-4">
            <WalletConnectButton />
          </div>
        </div>
      </div>
    </nav>
  );
}

// Hero Section
function HeroSection() {
  const { address, isConnected } = useAccount();
  const words = [
    "Believe in Yourself? Then..",
    "Bet on Yourself, that's the Ethos",
  ];
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % words.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);
  return (
    <motion.section
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.7, ease: "easeOut" }}
      className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-b from-primary to-dark pt-24 pb-12 text-center"
    >
      <h1 className="text-accent font-extrabold text-4xl md:text-6xl drop-shadow-lg mb-6">
        <span className="inline-flex items-center">
          {" "}
          <span className="inline-block relative min-w-[7ch] ml-2">
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={words[index]}
                initial={{ y: 30, opacity: 0, rotateX: 90 }}
                animate={{ y: 0, opacity: 1, rotateX: 0 }}
                exit={{ y: -30, opacity: 0, rotateX: -90 }}
                transition={{ duration: 0.5 }}
                className="text-accent"
                style={{
                  position: "static",
                  left: "unset",
                  right: "unset",
                  display: "inline-block",
                }}
              >
                {words[index]}
              </motion.span>
            </AnimatePresence>
          </span>
        </span>
        .
      </h1>
      <p className="max-w-xl mx-auto text-zinc-100 text-lg md:text-2xl mb-8">
        Create goals, Believe in Yourself and Earn Rewards.
      </p>
      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <a
          href="/create"
          className="bg-accent text-dark font-bold rounded-xl px-8 py-4 text-lg shadow-lg hover:scale-105 transition-transform duration-300"
        >
          Start a Challenge
        </a>
        {isConnected && (
          <a
            href="/dashboard"
            className="bg-dark border-2 border-accent text-accent font-bold rounded-xl px-8 py-4 text-lg shadow-lg hover:scale-105 transition-transform duration-300"
          >
            Dashboard
          </a>
        )}
      </div>
    </motion.section>
  );
}

// How It Works
const steps = [
  {
    title: "Create a challenge",
    desc: "Set your goal, deadline, and proof requirements.",
  },
  {
    title: "Stake & Publish",
    desc: "Lock your ETH or USDC and make your challenge public.",
  },
  {
    title: "Complete & Earn",
    desc: "Achieve your goal and earn rewards if you succeed.",
  },
];
function HowItWorks() {
  return (
    <section id="how" className="bg-dark border-t-2 border-primary py-20 px-4">
      <h2 className="text-accent text-3xl md:text-4xl font-bold text-center mb-12">
        How It Works
      </h2>
      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
        {steps.map((step, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5, delay: i * 0.15 }}
            className="flex flex-col items-center bg-dark border border-accent/40 rounded-xl p-6 shadow-lg transition-all"
          >
            <div className="w-12 h-12 flex items-center justify-center bg-accent text-dark font-bold text-xl rounded-full mb-4 shadow">
              {i + 1}
            </div>
            <h3 className="text-lg font-semibold text-accent mb-2 text-center">
              {step.title}
            </h3>
            <p className="text-gray-100 text-center text-sm">{step.desc}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

// Featured Challenges
interface FeaturedGoal {
  id: string;
  title: string;
  description?: string;
  category: "fitness" | "productivity" | "onchain";
  type: string;
  targetValue: number;
  currentValue: number;
  lockAmount: number;
  currency: string;
  deadline: string;
  userAddress: string;
  status: string;
  createdAt: string;
}

function FeaturedChallenges() {
  const [challenges, setChallenges] = useState<FeaturedGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch latest goals from backend
  useEffect(() => {
    const fetchLatestGoals = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/goals/featured?limit=4`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch goals");
        }

        const result = await response.json();
        if (result.success && result.data?.goals) {
          setChallenges(result.data.goals);
        } else {
          throw new Error(result.error || "No goals found");
        }
      } catch (err: any) {
        console.error("Error fetching featured challenges:", err);
        setError(err.message);
        // Fallback to empty array to show "no challenges" state
        setChallenges([]);
      } finally {
        setLoading(false);
      }
    };

    fetchLatestGoals();
  }, []);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "fitness":
        return "🏃‍♂️";
      case "productivity":
        return "💻";
      case "onchain":
        return "⛓️";
      default:
        return "🎯";
    }
  };

  const formatDeadline = (deadline: string) => {
    try {
      const date = new Date(deadline);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return "Invalid date";
    }
  };

  const calculateProgress = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100);
  };

  const generateUserName = (address: string) => {
    // Generate a consistent name from the address
    const names = [
      "Alex",
      "Sarah",
      "Mike",
      "Emma",
      "David",
      "Lisa",
      "John",
      "Anna",
    ];
    const surnames = [
      "Chen",
      "Kim",
      "Johnson",
      "Wilson",
      "Lee",
      "Brown",
      "Davis",
      "Miller",
    ];

    // Use address to generate consistent index
    const addressNum = parseInt(address.slice(2, 6), 16);
    const nameIndex = addressNum % names.length;
    const surnameIndex =
      Math.floor(addressNum / names.length) % surnames.length;

    return `${names[nameIndex]} ${surnames[surnameIndex]}`;
  };

  const generateAvatar = (address: string) => {
    // Generate a consistent avatar from the address
    const avatars = [
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
      "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face",
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
      "https://randomuser.me/api/portraits/men/32.jpg",
      "https://randomuser.me/api/portraits/women/44.jpg",
      "https://randomuser.me/api/portraits/men/22.jpg",
      "https://randomuser.me/api/portraits/women/68.jpg",
    ];

    const addressNum = parseInt(address.slice(2, 6), 16);
    return avatars[addressNum % avatars.length];
  };

  if (loading) {
    return (
      <section
        id="explore"
        className="bg-gradient-to-b from-dark to-primary py-20 px-4"
      >
        <h2 className="text-accent text-3xl md:text-4xl font-bold text-center mb-12">
          Featured Challenges
        </h2>
        <div className="max-w-5xl mx-auto flex items-center justify-center">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
            <p className="text-accent text-lg">Loading challenges...</p>
          </div>
        </div>
      </section>
    );
  }

  if (error || challenges.length === 0) {
    return (
      <section
        id="explore"
        className="bg-gradient-to-b from-dark to-primary py-20 px-4"
      >
        <h2 className="text-accent text-3xl md:text-4xl font-bold text-center mb-12">
          Featured Challenges
        </h2>
        <div className="max-w-5xl mx-auto text-center">
          <div className="bg-dark border border-accent/30 rounded-xl p-8">
            <p className="text-zinc-400 text-lg mb-4">
              {error
                ? "Unable to load challenges"
                : "No active challenges found"}
            </p>
            <p className="text-zinc-500 mb-6">
              Be the first to create a challenge and inspire others!
            </p>
            <a
              href="/create"
              className="inline-block bg-accent text-dark font-semibold rounded-lg px-6 py-3 hover:scale-105 transition-transform"
            >
              Create Challenge
            </a>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      id="explore"
      className="bg-gradient-to-b from-dark to-primary py-20 px-4"
    >
      <h2 className="text-accent text-3xl md:text-4xl font-bold text-center mb-12">
        Featured Challenges
      </h2>
      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
        {challenges.map((challenge, i) => (
          <motion.div
            key={challenge.id}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5, delay: i * 0.15 }}
            className="bg-dark border border-accent rounded-xl p-6 shadow-lg flex flex-col gap-4 hover:scale-105 hover:shadow-accent/40 transition-transform duration-300"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center border-2 border-accent/30">
                <span className="text-lg">
                  {getCategoryIcon(challenge.category)}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-zinc-100 font-medium text-sm">
                  {generateUserName(challenge.userAddress)}
                </span>
                <span className="text-zinc-400 text-xs">
                  {challenge.userAddress}
                </span>
              </div>
            </div>

            <h3 className="text-accent font-bold text-xl mb-2">
              {challenge.title}
            </h3>

            {challenge.description && (
              <p className="text-zinc-300 text-sm mb-2 line-clamp-2">
                {challenge.description}
              </p>
            )}

            <div className="flex items-center justify-between text-zinc-100 text-sm mb-2">
              <span>
                Stake:{" "}
                <span className="font-semibold text-accent">
                  {challenge.lockAmount} {challenge.currency}
                </span>
              </span>
              <span>
                Deadline:{" "}
                <span className="font-semibold">
                  {formatDeadline(challenge.deadline)}
                </span>
              </span>
            </div>

            {/* Progress bar */}
            <div className="mb-3">
              <div className="flex justify-between items-center mb-1">
                <span className="text-zinc-400 text-xs">Progress</span>
                <span className="text-zinc-400 text-xs">
                  {challenge.currentValue}/{challenge.targetValue} (
                  {Math.round(
                    calculateProgress(
                      challenge.currentValue,
                      challenge.targetValue
                    )
                  )}
                  %)
                </span>
              </div>
              <div className="w-full bg-zinc-700 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-accent to-green-400 h-2 rounded-full transition-all"
                  style={{
                    width: `${calculateProgress(
                      challenge.currentValue,
                      challenge.targetValue
                    )}%`,
                  }}
                ></div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-zinc-400 text-xs capitalize">
                  {challenge.category}
                </span>
                <span className="text-zinc-500">•</span>
                <span className="text-zinc-400 text-xs capitalize">
                  {challenge.type}
                </span>
              </div>
              <a
                href={`/goals/${challenge.id}`}
                className="bg-accent text-dark rounded-lg px-4 py-2 font-semibold shadow hover:scale-105 transition text-sm"
              >
                View Details
              </a>
            </div>
          </motion.div>
        ))}
      </div>

      {challenges.length > 0 && (
        <div className="text-center mt-8">
          <a
            href="/goals"
            className="inline-block text-accent hover:text-accent/80 font-medium"
          >
            View All Challenges →
          </a>
        </div>
      )}
    </section>
  );
}

// Leaderboard Data
const leaderboard = [
  {
    name: "Alex Chen",
    avatar:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
    ethWon: 8.2,
  },
  {
    name: "Sarah Kim",
    avatar:
      "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face",
    ethWon: 7.5,
  },
  {
    name: "Mike Johnson",
    avatar:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
    ethWon: 6.9,
  },
  {
    name: "Emma Wilson",
    avatar:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
    ethWon: 6.1,
  },
  {
    name: "David Lee",
    avatar: "https://randomuser.me/api/portraits/men/32.jpg",
    ethWon: 5.7,
  },
];

function Leaderboard() {
  return (
    <section className="bg-dark border-t-2 border-primary py-16 px-4">
      <h2 className="text-accent text-3xl md:text-4xl font-bold text-center mb-10">
        Leaderboard
      </h2>
      <div className="max-w-2xl mx-auto">
        <div className="bg-dark border border-accent/30 rounded-2xl shadow-lg overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-primary/10">
                <th className="py-4 px-6 text-accent font-semibold text-lg">
                  #
                </th>
                <th className="py-4 px-6 text-accent font-semibold text-lg">
                  User
                </th>
                <th className="py-4 px-6 text-accent font-semibold text-lg text-right">
                  ETH Won
                </th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((user, i) => (
                <tr
                  key={user.name}
                  className="border-t border-accent/20 hover:bg-primary/10 transition"
                >
                  <td className="py-4 px-6 text-accent font-bold text-xl align-middle">
                    {i + 1}
                  </td>
                  <td className="py-4 px-6 flex items-center gap-4 align-middle">
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-10 h-10 rounded-full object-cover border-2 border-accent/30"
                    />
                    <span className="text-zinc-100 font-medium">
                      {user.name}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-accent font-bold text-lg text-right align-middle">
                    {user.ethWon}{" "}
                    <span className="text-zinc-400 font-normal text-base">
                      ETH
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

// Call To Action
function CallToAction() {
  const { address, isConnected } = useAccount();

  return (
    <section className="bg-primary text-dark py-20 px-4 text-center">
      <h2 className="text-3xl md:text-4xl font-extrabold mb-4">
        Ready to Stake on Your Success?
      </h2>
      <p className="text-lg md:text-xl mb-8">
        Join Ethos and turn challenges into wins.
      </p>
      {isConnected ? (
        <a
          href="/dashboard"
          className="bg-dark text-accent rounded-full px-8 py-4 text-lg font-bold shadow-lg hover:scale-105 transition-transform duration-300 inline-block"
        >
          Launch App
        </a>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <p className="text-base mb-2">Connect your wallet to get started</p>
          <WalletConnectButton />
        </div>
      )}
    </section>
  );
}

// Footer
function Footer() {
  return (
    <footer className="bg-black text-gray-100 text-center text-sm py-6">
      Built with <span className="text-blue-400">💙</span> by Ethos. All rights
      reserved.
    </footer>
  );
}

export function LandingPage() {
  return (
    <main className="bg-dark min-h-screen">
      <Navbar />
      <HeroSection />
      <HowItWorks />
      <FeaturedChallenges />
      <Leaderboard />
      <CallToAction />
      <Footer />
    </main>
  );
}
