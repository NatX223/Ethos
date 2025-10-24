import { progressService } from './progressService.js';
import { firebaseService } from './firebaseService.js';

interface Goal {
  id?: string;
  userAddress: string;
  status: string;
  updatedAt: Date;
  dataSource?: {
    type: 'github' | 'strava' | 'onchain' | 'manual';
  };
}

export class SmartUpdateService {
  private readonly UPDATE_COOLDOWN = 30 * 60 * 1000; // 30 minutes between updates per goal

  /**
   * Update user's goals only when they visit dashboard
   * This saves resources by updating only when needed
   */
  async updateUserGoalsOnDemand(userAddress: string): Promise<any> {
    try {
      console.log(`🎯 On-demand update requested for user: ${userAddress}`);

      // Get user's active goals
      const userGoals = await firebaseService.queryDocuments<Goal>('goals', (collection) =>
        collection
          .where('userAddress', '==', userAddress.toLowerCase())
          .where('status', '==', 'active')
      );

      if (userGoals.length === 0) {
        console.log(`No active goals found for user: ${userAddress}`);
        return { updated: 0, message: 'No active goals to update' };
      }

      // Filter goals that need updating (respect cooldown)
      const now = new Date();
      const goalsToUpdate = userGoals.filter(goal => {
        const lastUpdate = new Date(goal.updatedAt);
        const timeSinceUpdate = now.getTime() - lastUpdate.getTime();
        return timeSinceUpdate > this.UPDATE_COOLDOWN;
      });

      console.log(`Found ${goalsToUpdate.length}/${userGoals.length} goals that need updating`);

      if (goalsToUpdate.length === 0) {
        return { 
          updated: 0, 
          message: 'All goals recently updated (within 30 minutes)',
          totalGoals: userGoals.length
        };
      }

      // Update only the goals that need it
      const results = await progressService.updateUserGoals(userAddress);

      return {
        updated: results.length,
        totalGoals: userGoals.length,
        results: results.map(r => ({
          goalId: r.goalId,
          progress: `${r.newValue}/${r.targetValue}`,
          completed: r.isCompleted
        }))
      };

    } catch (error) {
      console.error(`❌ Error in on-demand update for user ${userAddress}:`, error);
      throw error;
    }
  }

  /**
   * Lightweight check for goals that are about to expire (next 24 hours)
   * This can run more frequently without heavy API calls
   */
  async checkUpcomingDeadlines(): Promise<any> {
    try {
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      // Find goals expiring in next 24 hours
      const upcomingGoals = await firebaseService.queryDocuments<Goal>('goals', (collection) =>
        collection
          .where('status', '==', 'active')
          .where('deadline', '>', now)
          .where('deadline', '<=', tomorrow)
      );

      console.log(`📅 Found ${upcomingGoals.length} goals expiring in next 24 hours`);

      // For these critical goals, do a final progress update
      const results = [];
      for (const goal of upcomingGoals) {
        if (goal.id) {
          try {
            const result = await progressService.updateGoalProgress(goal.id);
            if (result) results.push(result);
          } catch (error) {
            console.error(`Error updating critical goal ${goal.id}:`, error);
          }
        }
      }

      return {
        upcomingDeadlines: upcomingGoals.length,
        updated: results.length,
        results
      };

    } catch (error) {
      console.error('❌ Error checking upcoming deadlines:', error);
      throw error;
    }
  }

  /**
   * Batch update for specific goal types (more efficient)
   */
  async updateGoalsByType(dataSourceType: 'github' | 'strava'): Promise<any> {
    try {
      console.log(`🔄 Updating all ${dataSourceType} goals...`);

      const goals = await firebaseService.queryDocuments<Goal>('goals', (collection) =>
        collection
          .where('status', '==', 'active')
          .where('dataSource.type', '==', dataSourceType)
      );

      console.log(`Found ${goals.length} active ${dataSourceType} goals`);

      const results = [];
      for (const goal of goals) {
        if (goal.id) {
          try {
            const result = await progressService.updateGoalProgress(goal.id);
            if (result) results.push(result);
          } catch (error) {
            console.error(`Error updating ${dataSourceType} goal ${goal.id}:`, error);
          }
        }
      }

      return {
        type: dataSourceType,
        totalGoals: goals.length,
        updated: results.length,
        results
      };

    } catch (error) {
      console.error(`❌ Error updating ${dataSourceType} goals:`, error);
      throw error;
    }
  }
}

export const smartUpdateService = new SmartUpdateService();