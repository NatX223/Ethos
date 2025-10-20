import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { getCoin } from "@zoralabs/coins-sdk";
import { base } from "viem/chains";

const rewardManagerABI = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "percentageShares",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }, 
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "user",
        "type": "address"
      }
    ],
    "name": "getUserEarnings",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

// Basic ERC20 ABI for balanceOf
const erc20ABI = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "balanceOf",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

export async function GET(
  request: Request
) {
  try {
    const { searchParams } = new URL(request.url);
    const userAddress = searchParams.get('userAddress');
    const rewardManager = searchParams.get('rewardManager');
    const coinAddress = searchParams.get('coinAddress');

    if (!userAddress || !rewardManager || !coinAddress) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Initialize provider for Base Sepolia
    const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');

    // Get supporter allocation
    const rewardManagerContract = new ethers.Contract(rewardManager, rewardManagerABI, provider);
    const shares = await rewardManagerContract.percentageShares(userAddress);
    const supporterAllocation = Number(shares) / 100; // Convert from 10000 to percentage

    // Get user earnings
    const earnings = await rewardManagerContract.getUserEarnings(userAddress);
    const earningsInEth = Number(ethers.formatEther(earnings));

    // Get market cap from Zora SDK
    const coinResponse = await getCoin({
      address: coinAddress,
      chain: base.id
    });
    const marketCap = coinResponse.data?.zora20Token?.marketCap || 0;

    // Get user's coin balance
    const coinContract = new ethers.Contract(coinAddress, erc20ABI, provider);
    const balance = await coinContract.balanceOf(userAddress);
    const balanceInEth = Number(ethers.formatEther(balance));

    return NextResponse.json({
      supporterAllocation: `${supporterAllocation}%`,
      earnings: earningsInEth,
      marketCap,
      balance: balanceInEth
    });

  } catch (error) {
    console.error('Error fetching user stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user stats' },
      { status: 500 }
    );
  }
} 