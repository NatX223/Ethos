import { createConfig, http, WagmiProvider } from "wagmi";
import {
  base,
  degen,
  mainnet,
  optimism,
  unichain,
  baseSepolia,
} from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { farcasterFrame } from "@farcaster/frame-wagmi-connector";
import { coinbaseWallet, metaMask } from "wagmi/connectors";
import { APP_NAME, APP_ICON_URL, APP_URL } from "~/lib/constants";
import { useEffect, useState } from "react";
import { useConnect, useAccount, useReconnect } from "wagmi";
import React from "react";

// Custom hook for Coinbase Wallet detection and auto-connection
function useCoinbaseWalletAutoConnect() {
  const [isCoinbaseWallet, setIsCoinbaseWallet] = useState(false);
  const { connect, connectors } = useConnect();
  const { isConnected } = useAccount();

  useEffect(() => {
    // Check if we're running in Coinbase Wallet
    const checkCoinbaseWallet = () => {
      const isInCoinbaseWallet =
        window.ethereum?.isCoinbaseWallet ||
        window.ethereum?.isCoinbaseWalletExtension ||
        window.ethereum?.isCoinbaseWalletBrowser;
      setIsCoinbaseWallet(!!isInCoinbaseWallet);
    };

    checkCoinbaseWallet();
    window.addEventListener("ethereum#initialized", checkCoinbaseWallet);

    return () => {
      window.removeEventListener("ethereum#initialized", checkCoinbaseWallet);
    };
  }, []);

  useEffect(() => {
    // Auto-connect if in Coinbase Wallet and not already connected
    if (isCoinbaseWallet && !isConnected) {
      connect({ connector: connectors[1] }); // Coinbase Wallet connector
    }
  }, [isCoinbaseWallet, isConnected, connect, connectors]);

  return isCoinbaseWallet;
}

export const config = createConfig({
  chains: [baseSepolia, base, optimism, mainnet, degen, unichain],
  transports: {
    [baseSepolia.id]: http(process.env.TESTNET_PROVIDER_URL || "https://base-sepolia.drpc.org"),
    [base.id]: http("https://mainnet.base.org"),
    [optimism.id]: http(),
    [mainnet.id]: http(),
    [degen.id]: http(),
    [unichain.id]: http(),
  },
  connectors: [
    farcasterFrame(),
    coinbaseWallet({
      appName: APP_NAME,
      appLogoUrl: APP_ICON_URL,
      preference: "all",
    }),
    metaMask({
      dappMetadata: {
        name: APP_NAME,
        url: APP_URL,
      },
    }),
  ],
  ssr: true,
});

const queryClient = new QueryClient();

// Auto-reconnect hook for wallet persistence
function useAutoReconnect() {
  const { isConnected } = useAccount();
  const { reconnect } = useReconnect();

  useEffect(() => {
    // Try to reconnect on page load if not connected
    if (!isConnected) {
      reconnect();
    }
  }, [isConnected, reconnect]);
}

// Wrapper component that provides auto-reconnection
function WalletAutoConnect({ children }: { children: React.ReactNode }) {
  useCoinbaseWalletAutoConnect();
  useAutoReconnect();
  return <>{children}</>;
}

export default function Provider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config} reconnectOnMount={true}>
      <QueryClientProvider client={queryClient}>
        <WalletAutoConnect>{children}</WalletAutoConnect>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
