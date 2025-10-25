# Ethos
Base Batches 002 application

# Ethos - Stake with Purpose 🎯

## Table of Contents
- [Overview](#overview)
- [Problem Statement](#problem-statement) 
- [Solution](#solution)
- [How It Works](#how-it-works)
- [Technologies Used](#technologies-used)
- [Weekly Reward System](#weekly-reward-system)
- [Contract Flow Interaction](#contract-flow-interaction)
- [Contracts and Transactions](#contracts-and-transactions)
- [Setup and Deployment](#setup-and-deployment)
- [Production Deployment](#production-deployment)
- [Future Improvements](#future-improvements)
- [Acknowledgments](#acknowledgments)

---

## Overview

Ethos is a cross-chain staking and donation protocol that transforms traditional DeFi into a purpose-driven experience. Built for Base Ecosystem, Ethos enables users to stake assets while supporting goal achievement and charitable causes.

Our motto **"Bet on yourself, that's the ethos"** reflects our mission to make every financial transaction create positive social impact.

## Problem Statement

Many people struggle to stay consistent with their personal or fitness goals because there’s little accountability or tangible consequence for giving up midway.

## Solution

Ethos introduces a novel cross-chain protocol where:

- **Users lock ETH** to commit to personal goals
- **Automated verification** tracks progress using real-world data (GitHub, Strava, on-chain activity)
- **Reward distribution** rewards goal achievement by redistributing lock funds 
back to the community(from those that did not acheive their goals)

Our hybrid validation system combines backend efficiency with blockchain transparency, creating a seamless user experience while maintaining verifiable on-chain results.

## How It Works

### 1. User Onboarding & Goal Setting

User Flow:
1. Connect Base wallet/account
2. Deploy individual Goal contract
3. Initialize with deadline, target, and lock ETH
4. Wait for settlement at deadline or when the goal target is met

### 2. Smart Contract Architecture

![protocol architecture](/architecture.jpg)

### Technologies Used
```
Smart Contracts
Solidity 0.8.28 with OpenZeppelin ReentrancyGuard
BASE network deployment
Hardhat development framework
Backend & Infrastructure
Node.js with Express server
Firedtore database
REST APIs for external data integration
Setup and Deployment
Prerequisites
Node.js 16+
Git
Base wallet/account
```

### Weekly Reward System

Key Mechanics:
````
Weekly Tracking: Each goal is associated with a specific week

Winner Eligibility: Users who achieve 100% of targets become eligible for weekly rewards

Pool Funding: Funds from partially completed goals feed the weekly reward pool

Fair Distribution: Rewards distributed proportionally among weekly winners
````

## Contract Flow Interaction
```
User ────┐
         ├─► Goal.initialize() ──► Stake Base ETH & Set Target
         │
Settler ─┼─► Goal.settleGoal(score) ──┐
         │                           │
         │                           ├─► Success: 100% refund + Winner status
         │                           │
         │                           └─► Partial: Proportional refund + Funds to RewardManager
         │                                                                   │
         └─► RewardManager ──► Weekly reward distribution to winners ◄───────┘
```

## Contracts and Transactions

| **Contract**        | **Address**                                |
|---------------------|--------------------------------------------|
| **RewardManager**   | 0xc54FfB00e1C630f0D7a72ECBCDA043883a0f690e |
| **Goal Factory**    | 0xaCe5f44b583158201BF7F56320122D5d59A398Bf |
| **Goal Contract**   | 0xf368A0e667D84937be9e6A19Ef211dE454Cc88ae |

| **TX type**         | **TX example**                                                                                     |
|---------------------|----------------------------------------------------------------------------------------------------|
| **Deploy Goal**     | https://sepolia.basescan.org/tx/0x67e8a09a0a88c890428e4f5952b24631bb3ed37249ce6a24b95713a3fc40e4e3 |
| **Initialize Goal** | https://sepolia.basescan.org/tx/0xb86b066044b53fae53c80b2f646a51785322ad1057cdad4d917cadc19282d448 |
<!-- | **Settle Goal**     | https://basescan.org/tx/0x2fbe7296144752550939a15f3ac8d49b0f80d3df0b6498d9a81301a1abf7872f |
| **Claim Reward**    | https://basescan.org/tx/0x2fbe7296144752550939a15f3ac8d49b0f80d3df0b6498d9a81301a1abf7872f | -->


## Setup and Deployment
```
Prerequisites
Node.js 16+
Git
Ethereum wallet with testnet ETH
```
Local Development Setup

1. Clone Repository
```
git clone https://github.com/NatX223/Ethos.git
cd Ethos
```

2. Install Dependencies
```
cd contracts
npm install
```

3. Environment Configuration
```
cp .env.example .env
```

Update .env file:
```
# Network Configuration
ETH_RPC_URL=https://base-mainnet.alchemyapi.io/v2/your-key
DEPLOYER_PRIVATE_KEY=your-private-key

# Contract Addresses (update after deployment)
REWARD_MANAGER_ADDRESS=0x...
SETTLER_ADDRESS=0x...
OWNER_ADDRESS=0x...
```

4.Compile Contracts
```
npx hardhat compile
```

5. Deploy Contracts
```
# Deploy RewardManager first
npx hardhat run scripts/deployRewardManager.js --network base-mainnet

# Deploy Goal contracts via factory
npx hardhat run scripts/deployGoalFactory.js --network base-mainnet
```

6. Start Backend Services
```
cd backend
npm install
npm run dev
```

## Production Deployment

1. Verify Contracts
`
npx hardhat verify --network base-mainnet DEPLOYED_CONTRACT_ADDRESS
`

2. Update Frontend Configuration
```
// Update contract addresses in frontend config
export const CONTRACT_ADDRESSES = {
  rewardManager: '0x...',
  goalFactory: '0x...'
};
```

## Future Improvements

Short-term (Next 3-6 months)
```
Chainlink Integration: Automated score verification via Chainlink Functions
Multi-asset Support: USDC and other ERC-20 tokens alongside ETH
Advanced Goal Types: Support for fitness, coding, and learning metrics
Frontend Application: Complete dApp with goal tracking dashboard
```

Medium-term (6-12 months)
```
Flow Blockchain Integration: Cross-chain expansion to Flow ecosystem
DAO Governance: Community-controlled settler role and parameters
NFT Achievement Tokens: Soulbound NFTs for goal completion recognition
Social Features: Goal sharing, challenges, and community support
```

Long-term (12+ months)
```
Zero-Knowledge Proofs: Privacy-preserving goal verification
DeFi Integrations: Yield farming with social impact components
Enterprise Solutions: B2B applications for corporate wellness programs
Global Charity Partnerships: Direct integration with verified non-profits
```

Technical Enhancements

```
Gas Optimization: Improved contract efficiency for reduced transaction costs
Cross-chain Messaging: Seamless asset transfer between Ethereum and Flow
Advanced Oracles: Support for multiple data sources and complex validation
Mobile SDK: Developer tools for third-party application integration
```

## Acknowledgments

Inspiration & Research
```
stickK & Beeminder: For pioneering financial commitment contracts and proving their effectiveness
Behavioral Economics Research: Studies demonstrating 42% improvement in goal achievement with financial incentives
FlareSec Protocol: For innovative approaches to on-chain verification and multi-factor authentication
```

Technology Partners
```
Base Network: For providing scalable Ethereum L2 infrastructure and developer support
OpenZeppelin: For battle-tested smart contract libraries and security patterns
Chainlink: For decentralized oracle solutions enabling real-world data integration
Alchemy: For reliable blockchain infrastructure and developer tools
```
Community & Support
```
Base Batches 002 Hackathon Organizers & Judges: For providing the platform, resources, and valuable feedback
Early Adopters & Testers: For crucial feedback, bug reports, and feature suggestions
Open Source Community: For the incredible tools and libraries that make Ethos possible
```

Special Thanks
```
To the to base ecosystem for continuously pushing the boundaries of what's possible with blockchain technology, and to all the builders who believe that decentralized finance can be a powerful force for positive social change.
```

Built with ❤️ for a better Web3.
Ethos - Where your stake builds more than wealth. It builds purpose. 


© 2025 Ethos on base. All rights reserved.