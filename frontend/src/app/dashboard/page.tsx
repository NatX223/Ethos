"use client";

import React, { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { OAuthConnect } from "~/components/OAuthConnect";
import { useRouter, useSearchParams } from "next/navigation";

export default function Dashboard() {
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showOAuthStatus, setShowOAuthStatus] = useState(false);
  const [userExists, setUserExists] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  // Check if user exists and create if needed
  useEffect(() => {
    if (isConnected && address) {
      checkAndCreateUser();
    }
  }, [isConnected, address]);

  // Handle OAuth callback status
  useEffect(() => {
    const oauthProvider = searchParams.get('oauth');
    const status = searchParams.get('status');

    if (oauthProvider && status) {
      setShowOAuthStatus(true);
      
      if (status === 'success') {
        // Show success message
        setTimeout(() => {
          alert(`${oauthProvider} connected successfully!`);
          // Clean up URL parameters
          router.replace('/dashboard');
        }, 100);
      } else if (status === 'error') {
        // Show error message
        setTimeout(() => {
          alert(`Failed to connect ${oauthProvider}. Please try again.`);
          // Clean up URL parameters
          router.replace('/dashboard');
        }, 100);
      }
    }
  }, [searchParams, router]);

  const checkAndCreateUser = async () => {
    if (!address) return;

    try {
      // Check if user exists
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/${address}`);
      
      if (response.ok) {
        setUserExists(true);
      } else if (response.status === 404) {
        // User doesn't exist, create them
        setIsCreatingUser(true);
        
        const createResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/signup`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            walletAddress: address,
            profile: {
              displayName: `User ${address.slice(0, 6)}`,
            },
          }),
        });

        if (createResponse.ok) {
          setUserExists(true);
          console.log('User created successfully');
        } else {
          const errorData = await createResponse.json();
          console.error('Error creating user:', errorData);
        }
        
        setIsCreatingUser(false);
      }
    } catch (error) {
      console.error('Error checking/creating user:', error);
      setIsCreatingUser(false);
    }
  };

  if (!isConnected || !address) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-accent mb-4">Dashboard</h1>
          <p className="text-zinc-400 mb-6">Please connect your wallet to access the dashboard</p>
          <a
            href="/"
            className="bg-accent text-dark font-semibold rounded-lg px-6 py-3 transition hover:scale-105"
          >
            Go Home
          </a>
        </div>
      </div>
    );
  }

  if (isCreatingUser) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h1 className="text-2xl font-bold text-accent mb-4">Setting up your account...</h1>
          <p className="text-zinc-400">Please wait while we create your profile</p>
        </div>
      </div>
    );
  }

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
              <div className="flex items-center gap-2 bg-accent/10 border border-accent rounded-lg px-4 py-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-accent font-medium text-sm">
                  {address.slice(0, 6)}...{address.slice(-4)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-accent mb-2">Dashboard</h1>
          <p className="text-zinc-400">
            Manage your account settings and connected platforms
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Account Connections */}
          <div className="bg-dark border border-accent/30 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-accent mb-4">
              Connected Accounts
            </h2>
            <p className="text-zinc-400 text-sm mb-6">
              Connect your GitHub and Strava accounts to enable goal tracking and verification
            </p>
            <OAuthConnect onConnectionUpdate={() => {
              // Refresh any data that depends on connected accounts
              console.log('Account connections updated');
            }} />
          </div>

          {/* Account Info */}
          <div className="bg-dark border border-accent/30 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-accent mb-4">
              Account Information
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  Wallet Address
                </label>
                <div className="bg-dark border border-accent/20 rounded-lg px-3 py-2">
                  <code className="text-accent text-sm font-mono">
                    {address}
                  </code>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  Account Status
                </label>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="text-green-400 text-sm">Active</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-dark border border-accent/30 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-accent mb-4">
              Quick Actions
            </h2>
            <div className="space-y-3">
              <a
                href="/create"
                className="block w-full bg-accent text-dark font-semibold rounded-lg px-4 py-3 text-center transition hover:scale-105"
              >
                Create New Goal
              </a>
              <a
                href="/goals"
                className="block w-full bg-dark border border-accent text-accent font-semibold rounded-lg px-4 py-3 text-center transition hover:bg-accent/10"
              >
                View My Goals
              </a>
            </div>
          </div>

          {/* Stats Overview */}
          <div className="bg-dark border border-accent/30 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-accent mb-4">
              Stats Overview
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-accent">0</div>
                <div className="text-sm text-zinc-400">Active Goals</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-accent">0</div>
                <div className="text-sm text-zinc-400">Completed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-accent">0 ETH</div>
                <div className="text-sm text-zinc-400">Total Staked</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-accent">0 ETH</div>
                <div className="text-sm text-zinc-400">Total Earned</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}