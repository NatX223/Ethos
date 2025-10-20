import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "imagedelivery.net",
      },
    ],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack: (config, { dev, isServer }) => {
    // Optimize webpack cache for large dependencies
    if (!dev && !isServer) {
      config.cache = {
        type: 'filesystem',
        maxMemoryGenerations: 1,
      };
    }
    
    // Optimize bundle splitting for Web3 libraries
    config.optimization = {
      ...config.optimization,
      splitChunks: {
        ...config.optimization.splitChunks,
        cacheGroups: {
          ...config.optimization.splitChunks?.cacheGroups,
          web3: {
            test: /[\\/]node_modules[\\/](@coinbase|thirdweb|wagmi|viem)[\\/]/,
            name: 'web3-libs',
            chunks: 'all',
            priority: 10,
          },
        },
      },
    };
    
    return config;
  },
};

export default nextConfig;
