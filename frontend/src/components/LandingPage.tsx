"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { AnimatePresence } from "framer-motion";
import { useConnect, useActiveAccount, useProfiles } from "thirdweb/react";
import { inAppWallet } from "thirdweb/wallets";
import { client } from "~/lib/thirdwebClient";

// Initialize wallet
const wallet = inAppWallet();

// Custom Wallet Connection Component with Multiple Auth Options
function WalletConnectButton() {
  const { connect } = useConnect();
  const account = useActiveAccount();
  const { data: profiles } = useProfiles({ client });
  const [showOptions, setShowOptions] = useState(false);

  useEffect(() => {
    if (account && profiles && profiles.length > 0) {
      console.log("Profile Type:", profiles[0].type);
      console.log("Email:", profiles[0].details?.email || "No email");
      console.log("Profile Details:", profiles[0]);
    }
  }, [account, profiles]);

  const connectWithStrategy = (strategy: any) => {
    connect(async () => {
      await wallet.connect({
        client,
        strategy,
      });
      return wallet;
    });
    setShowOptions(false);
  };

  const authOptions = [
    {
      strategy: "google",
      name: "Google",
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
      ),
    },
    {
      strategy: "github",
      name: "GitHub",
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
        </svg>
      ),
    },
    {
      strategy: "x",
      name: "X (Twitter)",
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
    },
  ];

  if (account) {
    return (
      <div className="flex items-center gap-2 bg-accent/10 border border-accent rounded-lg px-4 py-2">
        <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
        <span className="text-accent font-medium text-sm">
          {account.address?.slice(0, 6)}...{account.address?.slice(-4)}
        </span>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowOptions(!showOptions)}
        className="bg-accent text-dark font-semibold rounded-lg shadow px-5 py-2 transition hover:scale-105 flex items-center gap-2"
      >
        Connect Wallet
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
                Choose your login method
              </div>
              {authOptions.map((option) => (
                <button
                  key={option.strategy}
                  onClick={() => connectWithStrategy(option.strategy)}
                  className="w-full flex items-center gap-3 px-3 py-2 text-zinc-100 hover:bg-accent/10 rounded-md transition-colors text-left"
                >
                  <div className="text-accent">{option.icon}</div>
                  <span className="font-medium">
                    Continue with {option.name}
                  </span>
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
  const words = ["Yourself", "Your Faves", "The Best"];
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
          Bet on{" "}
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
      <a
        href="/create"
        className="bg-accent text-dark font-bold rounded-xl px-8 py-4 text-lg shadow-lg hover:scale-105 transition-transform duration-300"
      >
        Start a Challenge
      </a>
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
    title: "Stake ETH & Publish",
    desc: "Lock your ETH and make your challenge public.",
  },
  {
    title: "Others Bet",
    desc: "Friends and strangers bet on your success or failure.",
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
      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
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
const challenges = [
  {
    title: "Run a Marathon",
    Odds: "0.5",
    deadline: "2024-08-01",
    user: {
      name: "Alex Chen",
      avatar:
        "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
    },
  },
  {
    title: "30-Day Coding Streak",
    Odds: "0.8",
    deadline: "2024-07-15",
    user: {
      name: "Sarah Kim",
      avatar:
        "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face",
    },
  },
  {
    title: "Lose 10kg",
    Odds: "0.1",
    deadline: "2024-09-10",
    user: {
      name: "Mike Johnson",
      avatar:
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
    },
  },
  {
    title: "Read 12 Books",
    Odds: "0.5",
    deadline: "2024-12-31",
    user: {
      name: "Emma Wilson",
      avatar:
        "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
    },
  },
];
function FeaturedChallenges() {
  return (
    <section
      id="explore"
      className="bg-gradient-to-b from-dark to-primary py-20 px-4"
    >
      <h2 className="text-accent text-3xl md:text-4xl font-bold text-center mb-12">
        Featured Challenges
      </h2>
      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
        {challenges.map((ch, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5, delay: i * 0.15 }}
            className="bg-dark border border-accent rounded-xl p-6 shadow-lg flex flex-col gap-4 hover:scale-105 hover:shadow-accent/40 transition-transform duration-300"
          >
            <div className="flex items-center gap-3 mb-2">
              <img
                src={ch.user.avatar}
                alt={ch.user.name}
                className="w-10 h-10 rounded-full object-cover border-2 border-accent/30"
              />
              <span className="text-zinc-100 font-medium text-sm">
                {ch.user.name}
              </span>
            </div>
            <h3 className="text-accent font-bold text-xl mb-2">{ch.title}</h3>
            <div className="flex items-center justify-between text-zinc-100 text-sm mb-2">
              <span>
                Odds: <span className="font-semibold">{ch.Odds}</span>
              </span>
              <span>
                Deadline: <span className="font-semibold">{ch.deadline}</span>
              </span>
            </div>
            <a
              href={`/challenge/${i + 1}`}
              className="mt-auto bg-accent text-dark rounded-lg px-5 py-2 font-semibold shadow hover:scale-105 transition text-center"
            >
              Stake
            </a>
          </motion.div>
        ))}
      </div>
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
  const account = useActiveAccount();

  return (
    <section className="bg-primary text-dark py-20 px-4 text-center">
      <h2 className="text-3xl md:text-4xl font-extrabold mb-4">
        Ready to Stake on Your Success?
      </h2>
      <p className="text-lg md:text-xl mb-8">
        Join Ethos and turn challenges into wins.
      </p>
      {account ? (
        <button className="bg-dark text-accent rounded-full px-8 py-4 text-lg font-bold shadow-lg hover:scale-105 transition-transform duration-300">
          Launch App
        </button>
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
