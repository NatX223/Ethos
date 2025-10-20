"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useActiveAccount } from "thirdweb/react";

interface OAuthConnectProps {
  onConnectionUpdate?: () => void;
}

interface ConnectedAccount {
  github?: {
    username: string;
    isActive: boolean;
    connectedAt?: string;
  };
  strava?: {
    username: string;
    isActive: boolean;
    connectedAt?: string;
  };
}

export function OAuthConnect({ onConnectionUpdate }: OAuthConnectProps) {
  const account = useActiveAccount();
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [connectedAccounts, setConnectedAccounts] = useState<ConnectedAccount>({});

  // Fetch user's connected accounts
  React.useEffect(() => {
    if (account?.address) {
      fetchConnectedAccounts();
    }
  }, [account?.address]);

  const fetchConnectedAccounts = async () => {
    if (!account?.address) return;

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/${account.address}`);
      if (response.ok) {
        const data = await response.json();
        setConnectedAccounts(data.data.user.connectedAccounts || {});
      }
    } catch (error) {
      console.error('Error fetching connected accounts:', error);
    }
  };

  const initiateOAuth = async (provider: 'github' | 'strava') => {
    if (!account?.address) {
      alert('Please connect your wallet first');
      return;
    }

    setLoading(provider);
    setShowDropdown(false);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/oauth/initiate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider,
          walletAddress: account.address,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Redirect to OAuth provider
        window.location.href = data.data.authUrl;
      } else {
        throw new Error(data.error || 'Failed to initiate OAuth');
      }
    } catch (error) {
      console.error(`Error initiating ${provider} OAuth:`, error);
      alert(`Failed to connect ${provider}. Please try again.`);
    } finally {
      setLoading(null);
    }
  };

  const disconnectAccount = async (provider: 'github' | 'strava') => {
    if (!account?.address) return;

    setLoading(provider);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/oauth/disconnect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider,
          walletAddress: account.address,
        }),
      });

      const data = await response.json();

      if (data.success) {
        await fetchConnectedAccounts();
        onConnectionUpdate?.();
        alert(`${provider} account disconnected successfully`);
      } else {
        throw new Error(data.error || 'Failed to disconnect account');
      }
    } catch (error) {
      console.error(`Error disconnecting ${provider}:`, error);
      alert(`Failed to disconnect ${provider}. Please try again.`);
    } finally {
      setLoading(null);
    }
  };

  const providers = [
    {
      id: 'github' as const,
      name: 'GitHub',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
        </svg>
      ),
      color: 'text-gray-100',
      bgColor: 'bg-gray-800 hover:bg-gray-700',
    },
    {
      id: 'strava' as const,
      name: 'Strava',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.172" />
        </svg>
      ),
      color: 'text-orange-500',
      bgColor: 'bg-orange-600 hover:bg-orange-500',
    },
  ];

  if (!account?.address) {
    return (
      <div className="text-center p-4 bg-dark border border-accent/30 rounded-lg">
        <p className="text-zinc-400">Connect your wallet to link external accounts</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Connected Accounts Display */}
      <div className="space-y-3">
        {providers.map((provider) => {
          const isConnected = connectedAccounts[provider.id]?.isActive;
          const username = connectedAccounts[provider.id]?.username;

          return (
            <div
              key={provider.id}
              className="flex items-center justify-between p-4 bg-dark border border-accent/30 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div className={provider.color}>
                  {provider.icon}
                </div>
                <div>
                  <h3 className="text-zinc-100 font-medium">{provider.name}</h3>
                  {isConnected && username ? (
                    <p className="text-sm text-zinc-400">Connected as {username}</p>
                  ) : (
                    <p className="text-sm text-zinc-500">Not connected</p>
                  )}
                </div>
              </div>

              <div>
                {isConnected ? (
                  <button
                    onClick={() => disconnectAccount(provider.id)}
                    disabled={loading === provider.id}
                    className="px-4 py-2 text-sm bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading === provider.id ? 'Disconnecting...' : 'Disconnect'}
                  </button>
                ) : (
                  <button
                    onClick={() => initiateOAuth(provider.id)}
                    disabled={loading === provider.id}
                    className={`px-4 py-2 text-sm text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${provider.bgColor}`}
                  >
                    {loading === provider.id ? 'Connecting...' : 'Connect'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Connect Dropdown */}
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="w-full bg-accent text-dark font-semibold rounded-lg px-4 py-3 transition hover:scale-105 flex items-center justify-center gap-2"
        >
          Connect Account
          <svg
            className={`w-4 h-4 transition-transform ${
              showDropdown ? "rotate-180" : ""
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
          {showDropdown && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="absolute top-full mt-2 left-0 right-0 bg-dark border border-accent/30 rounded-lg shadow-lg overflow-hidden z-10"
            >
              <div className="p-2">
                <div className="text-accent text-sm font-medium px-3 py-2 border-b border-accent/20 mb-2">
                  Choose a platform to connect
                </div>
                {providers.map((provider) => {
                  const isConnected = connectedAccounts[provider.id]?.isActive;
                  
                  return (
                    <button
                      key={provider.id}
                      onClick={() => initiateOAuth(provider.id)}
                      disabled={isConnected || loading === provider.id}
                      className="w-full flex items-center gap-3 px-3 py-2 text-zinc-100 hover:bg-accent/10 rounded-md transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className={provider.color}>
                        {provider.icon}
                      </div>
                      <span className="font-medium">
                        {isConnected ? `${provider.name} (Connected)` : `Connect ${provider.name}`}
                      </span>
                      {loading === provider.id && (
                        <div className="ml-auto">
                          <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Click outside to close */}
        {showDropdown && (
          <div
            className="fixed inset-0 z-0"
            onClick={() => setShowDropdown(false)}
          />
        )}
      </div>
    </div>
  );
}