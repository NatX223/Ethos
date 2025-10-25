import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

// Goal contract ABI - only the functions we need
const GOAL_CONTRACT_ABI = [
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "score",
        "type": "uint256"
      }
    ],
    "name": "settleGoal",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "isSettled",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "target",
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
    "inputs": [],
    "name": "author",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

export class BlockchainService {
  private provider: ethers.JsonRpcProvider;
  private signer: ethers.Wallet;

  constructor() {
    // Initialize provider (Base Sepolia)
    this.provider = new ethers.JsonRpcProvider('https://sepolia.base.org');

    // Initialize signer from environment variable
    const signerPrivateKey = process.env.SIGNER;
    if (!signerPrivateKey) {
      throw new Error('SIGNER private key not found in environment variables');
    }

    this.signer = new ethers.Wallet(signerPrivateKey, this.provider);
    console.log(`🔗 Blockchain service initialized with signer: ${this.signer.address}`);
  }

  /**
   * Settle a goal contract with the achieved score
   */
  async settleGoal(contractAddress: string, achievedScore: number): Promise<string> {
    try {
      console.log(`🎯 Settling goal contract ${contractAddress} with score: ${achievedScore}`);

      // Create contract instance
      const goalContract = new ethers.Contract(contractAddress, GOAL_CONTRACT_ABI, this.signer) as any;

      // Check if goal is already settled
      const isSettled = await goalContract.isSettled();
      if (isSettled) {
        throw new Error('Goal is already settled');
      }

      // Get the target value to verify
      const target = await goalContract.target();
      console.log(`Target: ${target}, Achieved: ${achievedScore}`);

      // Convert score to appropriate format (assuming it's already in the right units)
      const scoreInWei = ethers.parseUnits(achievedScore.toString(), 0); // No decimals for most goal types

      // Estimate gas
      const gasEstimate = await goalContract.settleGoal.estimateGas(scoreInWei);
      const gasLimit = gasEstimate * BigInt(120) / BigInt(100); // Add 20% buffer

      // Get current gas price
      const feeData = await this.provider.getFeeData();
      const gasPrice = feeData.gasPrice;

      console.log(`Gas estimate: ${gasEstimate}, Gas price: ${gasPrice}`);

      // Call settleGoal function
      const tx = await goalContract.settleGoal(scoreInWei, {
        gasLimit: gasLimit,
        gasPrice: gasPrice
      });

      console.log(`📝 Settlement transaction sent: ${tx.hash}`);

      // Wait for transaction confirmation
      const receipt = await tx.wait();

      if (receipt?.status === 1) {
        console.log(`✅ Goal settled successfully! Transaction: ${tx.hash}`);
        return tx.hash;
      } else {
        throw new Error('Transaction failed');
      }

    } catch (error) {
      console.error(`❌ Error settling goal contract ${contractAddress}:`, error);
      throw error;
    }
  }

  /**
   * Check if a goal contract is already settled
   */
  async isGoalSettled(contractAddress: string): Promise<boolean> {
    try {
      const goalContract = new ethers.Contract(contractAddress, GOAL_CONTRACT_ABI, this.provider) as any;
      return await goalContract.isSettled();
    } catch (error) {
      console.error(`Error checking settlement status for ${contractAddress}:`, error);
      return false;
    }
  }

  /**
   * Get goal contract details
   */
  async getGoalDetails(contractAddress: string): Promise<{
    target: bigint;
    author: string;
    isSettled: boolean;
  }> {
    try {
      const goalContract = new ethers.Contract(contractAddress, GOAL_CONTRACT_ABI, this.provider) as any;

      const [target, author, isSettled] = await Promise.all([
        goalContract.target(),
        goalContract.author(),
        goalContract.isSettled()
      ]);

      return {
        target,
        author,
        isSettled
      };
    } catch (error) {
      console.error(`Error getting goal details for ${contractAddress}:`, error);
      throw error;
    }
  }

  /**
   * Get signer address
   */
  getSignerAddress(): string {
    return this.signer.address;
  }
}

export const blockchainService = new BlockchainService();