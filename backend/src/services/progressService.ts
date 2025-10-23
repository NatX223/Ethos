import { firebaseService } from './firebaseService.js';
import { githubService } from './githubService.js';

interface Goal {
  id?: string;
  title: string;
  description?: string;
  category: 'fitness' | 'productivity' | 'onchain';
  type: 'commit' | 'volume' | 'pnl' | 'distance' | 'calories' | 'streak';
  targetValue: number;
  currentValue: number;
  lockAmount: number;
  currency: 'ETH';
  deadline: Date;
  userAddress: string;
  status: 'active' | 'completed' | 'failed' | 'pending_verification' | 'cancelled';
  contractAddress: string;
  txHash: string;
  dataSource?: {
    type: 'github' | 'strava' | 'onchain' | 'manual';
    config?: Record<string, any>;
  };
  verificationResult?: {
    achieved: boolean;
    actualValue: number;
    verifiedAt: Date;
    txHash: string;
    verificationMethod: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

interface ProgressUpdateResult {
  goalId: string;
  previousValue: number;
  newValue: number;
  targetValue: number;
  isCompleted: boolean;
  dataSource: string;
  lastUpdated: Date;
}

interface EthosUser {
  id?: string; // This will be the Ethereum address
  walletAddress: string;
  profile: {
    displayName?: string;
    email?: string;
    avatar?: string;
    bio?: string;
  };
  connectedAccounts: {
    github?: {
      username?: string;
      userId?: string;
      accessToken?: string; // encrypted
      refreshToken?: string; // encrypted
      connectedAt?: Date;
      lastSyncAt?: Date;
      isActive: boolean;
    };
    strava?: {
      username?: string;
      athleteId?: string;
      accessToken?: string; // encrypted
      refreshToken?: string; // encrypted
      connectedAt?: Date;
      lastSyncAt?: Date;
      isActive: boolean;
    };
  };
  preferences: {
    notifications: boolean;
    timezone: string;
    currency: 'ETH' | 'USDC';
    privacy: {
      showProfile: boolean;
      showGoals: boolean;
      showProgress: boolean;
    };
  };
  stats: {
    totalGoals: number;
    completedGoals: number;
    failedGoals: number;
    totalStaked: number;
    totalEarned: number;
    currentStreak: number;
    longestStreak: number;
  };
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}

export class ProgressService {

  /**
   * Update progress for a specific goal
   */
  async updateGoalProgress(goalId: string): Promise<ProgressUpdateResult | null> {
    try {
      // Get the goal
      const goal = await firebaseService.getDocument<Goal>('goals', goalId);
      if (!goal) {
        throw new Error('Goal not found');
      }

      // Only update active goals
      if (goal.status !== 'active') {
        console.log(`Goal ${goalId} is not active (status: ${goal.status}), skipping update`);
        return null;
      }

      // Check if goal has expired
      if (new Date() > goal.deadline) {
        console.log(`Goal ${goalId} has expired, marking as failed`);
        await this.markGoalAsFailed(goalId);
        return null;
      }

      const previousValue = goal.currentValue;
      let newValue = previousValue;

      // Update progress based on data source
      if (goal.dataSource?.type === 'github' && goal.type === 'commit') {
        newValue = await this.updateGitHubCommitProgress(goal);
      } else if (goal.dataSource?.type === 'strava') {
        // TODO: Implement Strava progress tracking
        console.log('Strava progress tracking not yet implemented');
        return null;
      } else if (goal.dataSource?.type === 'onchain') {
        // TODO: Implement onchain progress tracking
        console.log('Onchain progress tracking not yet implemented');
        return null;
      } else {
        console.log(`Manual goals require manual progress updates`);
        return null;
      }

      // Update the goal in database
      const updateData: Partial<Goal> = {
        currentValue: newValue,
        updatedAt: new Date()
      };

      // Check if goal is completed
      const isCompleted = newValue >= goal.targetValue;
      if (isCompleted && goal.status === 'active') {
        updateData.status = 'completed';
        updateData.verificationResult = {
          achieved: true,
          actualValue: newValue,
          verifiedAt: new Date(),
          txHash: '', // Will be filled when smart contract is settled
          verificationMethod: goal.dataSource?.type || 'manual'
        };
      }

      await firebaseService.updateDocument('goals', goalId, updateData);

      console.log(`✅ Updated goal ${goalId}: ${previousValue} → ${newValue} (target: ${goal.targetValue})`);

      return {
        goalId,
        previousValue,
        newValue,
        targetValue: goal.targetValue,
        isCompleted,
        dataSource: goal.dataSource?.type || 'manual',
        lastUpdated: new Date()
      };

    } catch (error) {
      console.error(`❌ Error updating progress for goal ${goalId}:`, error);
      throw error;
    }
  }

  /**
   * Update GitHub commit progress for a goal
   */
  private async updateGitHubCommitProgress(goal: Goal): Promise<number> {
    try {
      // Get GitHub username from goal config or derive from user data

      // Try to get GitHub username from user profile
      const userProfile = await this.getUserGitHubProfile(goal.userAddress);
      const githubUsername = userProfile?.username;

      if (!githubUsername) {
        throw new Error('No GitHub username found for this goal');
      }

      // Get commit count since goal creation
      const commitCount = await githubService.getUserCommitCount(
        githubUsername,
        goal.createdAt,
        new Date() // Until now
      );

      return commitCount;

    } catch (error) {
      console.error(`Error updating GitHub commit progress:`, error);
      throw error;
    }
  }

  /**
   * Get user's GitHub profile from database
   */
  private async getUserGitHubProfile(userAddress: string): Promise<{ username: string } | null> {
    try {
      // Query user profiles using the EthosUser structure
      const userProfiles = await firebaseService.queryDocuments<EthosUser>('ethosuser', (collection) =>
        collection.where('walletAddress', '==', userAddress.toLowerCase())
      );

      if (userProfiles.length > 0) {
        const profile: EthosUser = userProfiles[0];
        const githubAccount = profile.connectedAccounts?.github;

        if (githubAccount?.isActive && githubAccount.username) {
          return {
            username: githubAccount.username
          };
        }
      }

      return null;
    } catch (error) {
      console.error('Error fetching user GitHub profile:', error);
      return null;
    }
  }

  /**
   * Mark goal as failed (expired)
   */
  private async markGoalAsFailed(goalId: string): Promise<void> {
    try {
      await firebaseService.updateDocument('goals', goalId, {
        status: 'failed',
        updatedAt: new Date()
      });
      console.log(`Goal ${goalId} marked as failed (expired)`);
    } catch (error) {
      console.error(`Error marking goal ${goalId} as failed:`, error);
    }
  }

  /**
   * Update progress for all active goals
   */
  async updateAllActiveGoals(): Promise<ProgressUpdateResult[]> {
    try {
      console.log('🔄 Starting batch progress update for all active goals...');

      // Get all active goals
      const activeGoals = await firebaseService.queryDocuments<Goal>('goals', (collection) =>
        collection.where('status', '==', 'active')
      );

      console.log(`Found ${activeGoals.length} active goals to update`);

      const results: ProgressUpdateResult[] = [];

      // Update each goal
      for (const goal of activeGoals) {
        try {
          if (goal.id) {
            const result = await this.updateGoalProgress(goal.id);
            if (result) {
              results.push(result);
            }
          }
        } catch (error) {
          console.error(`Error updating goal ${goal.id}:`, error);
          // Continue with other goals
        }
      }

      console.log(`✅ Batch update completed. Updated ${results.length} goals.`);
      return results;

    } catch (error) {
      console.error('❌ Error in batch progress update:', error);
      throw error;
    }
  }

  /**
   * Update progress for goals by user address
   */
  async updateUserGoals(userAddress: string): Promise<ProgressUpdateResult[]> {
    try {
      console.log(`🔄 Updating goals for user ${userAddress}...`);

      // Get user's active goals
      const userGoals = await firebaseService.queryDocuments<Goal>('goals', (collection) =>
        collection
          .where('userAddress', '==', userAddress.toLowerCase())
          .where('status', '==', 'active')
      );

      console.log(`Found ${userGoals.length} active goals for user ${userAddress}`);

      const results: ProgressUpdateResult[] = [];

      // Update each goal
      for (const goal of userGoals) {
        try {
          if (goal.id) {
            const result = await this.updateGoalProgress(goal.id);
            if (result) {
              results.push(result);
            }
          }
        } catch (error) {
          console.error(`Error updating goal ${goal.id}:`, error);
          // Continue with other goals
        }
      }

      console.log(`✅ Updated ${results.length} goals for user ${userAddress}`);
      return results;

    } catch (error) {
      console.error(`❌ Error updating goals for user ${userAddress}:`, error);
      throw error;
    }
  }
}

export const progressService = new ProgressService();