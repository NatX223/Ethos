import cron from 'node-cron';
import { firebaseService } from './firebaseService.js';

// Goal interface for deadline service (independent of model)
interface DeadlineGoal {
  id?: string;
  title: string;
  userAddress: string;
  currentValue: number;
  targetValue: number;
  deadline: Date;
  status: 'active' | 'completed' | 'failed' | 'pending_verification' | 'cancelled';
  verificationResult?: {
    achieved: boolean;
    actualValue: number;
    verifiedAt: Date;
    txHash?: string;
    verificationMethod?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

interface DeadlineCheckResult {
  goalId: string;
  title: string;
  userAddress: string;
  deadline: Date;
  currentValue: number;
  targetValue: number;
  success: boolean;
  error?: string;
}

export class DeadlineService {
  private cronJob: cron.ScheduledTask | null = null;
  private isRunning = false;

  /**
   * Start the deadline checker cron job
   * Runs every 6 hours to check for expired goals
   */
  start(): void {
    if (this.isRunning) {
      console.log('⚠️ Deadline checker is already running');
      return;
    }

    console.log('🚀 Starting deadline checker cron job...');
    
    // Run every 6 hours to save resources on hobby plan
    this.cronJob = cron.schedule('0 */6 * * *', async () => {
      await this.checkExpiredGoals();
    }, {
      scheduled: true,
      timezone: 'UTC'
    });

    this.isRunning = true;
    console.log('✅ Deadline checker started (runs every 6 hours UTC)');
  }

  /**
   * Stop the deadline checker
   */
  stop(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
    }
    this.isRunning = false;
    console.log('🛑 Deadline checker stopped');
  }

  /**
   * Check if deadline checker is running
   */
  isCheckerRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Check for goals that have passed their deadline and update their status
   */
  async checkExpiredGoals(): Promise<DeadlineCheckResult[]> {
    try {
      console.log('🔍 Checking for expired goals...');
      const startTime = Date.now();
      const currentTime = new Date();

      // Find all active goals where deadline has passed
      const expiredGoals = await firebaseService.queryDocuments<DeadlineGoal>('goals', (collection) =>
        collection
          .where('status', '==', 'active')
          .where('deadline', '<', currentTime)
      );

      if (expiredGoals.length === 0) {
        console.log('✅ No expired goals found');
        return [];
      }

      console.log(`📋 Found ${expiredGoals.length} expired goals`);

      // Update expired goals to 'failed' status
      const results: DeadlineCheckResult[] = [];
      
      for (const goal of expiredGoals) {
        try {
          if (!goal.id) {
            console.error('❌ Goal missing ID, skipping');
            continue;
          }

          // Update goal status to failed with comprehensive verification result
          await firebaseService.updateDocument('goals', goal.id, {
            status: 'failed',
            verificationResult: {
              achieved: false,
              actualValue: goal.currentValue || 0,
              verifiedAt: currentTime,
              txHash: '', // Will be set when blockchain transaction is made
              verificationMethod: 'deadline_expired'
            },
            updatedAt: currentTime
          });

          console.log(`❌ Goal "${goal.title}" (ID: ${goal.id}) marked as failed - deadline passed`);
          
          results.push({
            goalId: goal.id,
            title: goal.title,
            userAddress: goal.userAddress,
            deadline: goal.deadline,
            currentValue: goal.currentValue || 0,
            targetValue: goal.targetValue,
            success: true
          });

        } catch (error) {
          console.error(`❌ Error updating goal ${goal.id}:`, error);
          
          results.push({
            goalId: goal.id || 'unknown',
            title: goal.title || 'Unknown Goal',
            userAddress: goal.userAddress || 'unknown',
            deadline: goal.deadline,
            currentValue: goal.currentValue || 0,
            targetValue: goal.targetValue || 0,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      // Process and log results
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);

      const duration = Date.now() - startTime;
      
      console.log(`✅ Deadline check completed in ${duration}ms`);
      console.log(`📊 Results: ${successful.length} goals marked as failed, ${failed.length} errors`);

      // Log details of successfully failed goals
      if (successful.length > 0) {
        console.log('📋 Goals marked as failed:');
        successful.forEach(goal => {
          const progress = `${goal.currentValue}/${goal.targetValue}`;
          const deadlineStr = new Date(goal.deadline).toISOString().split('T')[0];
          console.log(`  - "${goal.title}" (${progress}) - Deadline: ${deadlineStr} - User: ${goal.userAddress}`);
        });
      }

      // Log errors if any
      if (failed.length > 0) {
        console.log('⚠️ Errors occurred while updating goals:');
        failed.forEach(result => {
          console.log(`  - Goal "${result.title}": ${result.error}`);
        });
      }

      return results;

    } catch (error) {
      console.error('❌ Error in deadline checker:', error instanceof Error ? error.message : error);
      return [];
    }
  }

  /**
   * Check for goals expiring in the next 24 hours (for early warning)
   */
  async checkUpcomingDeadlines(): Promise<DeadlineGoal[]> {
    try {
      console.log('📅 Checking for goals expiring in next 24 hours...');
      
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const upcomingGoals = await firebaseService.queryDocuments<DeadlineGoal>('goals', (collection) =>
        collection
          .where('status', '==', 'active')
          .where('deadline', '>', now)
          .where('deadline', '<=', tomorrow)
      );

      if (upcomingGoals.length > 0) {
        console.log(`⚠️ Found ${upcomingGoals.length} goals expiring in next 24 hours:`);
        upcomingGoals.forEach(goal => {
          const deadlineStr = new Date(goal.deadline).toISOString();
          const progress = `${goal.currentValue}/${goal.targetValue}`;
          console.log(`  - "${goal.title}" (${progress}) - Expires: ${deadlineStr}`);
        });
      } else {
        console.log('✅ No goals expiring in next 24 hours');
      }

      return upcomingGoals;

    } catch (error) {
      console.error('❌ Error checking upcoming deadlines:', error);
      return [];
    }
  }

  /**
   * Run a manual deadline check (for testing)
   */
  async runManualCheck(): Promise<DeadlineCheckResult[]> {
    console.log('🔧 Running manual deadline check...');
    return await this.checkExpiredGoals();
  }

  /**
   * Get statistics about deadline checking
   */
  async getDeadlineStats(): Promise<{
    activeGoals: number;
    expiredGoals: number;
    upcomingDeadlines: number;
    nextCheckTime: Date | null;
  }> {
    try {
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      // Count active goals
      const activeGoals = await firebaseService.queryDocuments<DeadlineGoal>('goals', (collection) =>
        collection.where('status', '==', 'active')
      );

      // Count expired goals (should be 0 if deadline checker is working)
      const expiredGoals = await firebaseService.queryDocuments<DeadlineGoal>('goals', (collection) =>
        collection
          .where('status', '==', 'active')
          .where('deadline', '<', now)
      );

      // Count upcoming deadlines
      const upcomingGoals = await firebaseService.queryDocuments<DeadlineGoal>('goals', (collection) =>
        collection
          .where('status', '==', 'active')
          .where('deadline', '>', now)
          .where('deadline', '<=', tomorrow)
      );

      return {
        activeGoals: activeGoals.length,
        expiredGoals: expiredGoals.length,
        upcomingDeadlines: upcomingGoals.length,
        nextCheckTime: this.getNextRunTime()
      };

    } catch (error) {
      console.error('❌ Error getting deadline stats:', error);
      return {
        activeGoals: 0,
        expiredGoals: 0,
        upcomingDeadlines: 0,
        nextCheckTime: null
      };
    }
  }

  /**
   * Get next scheduled run time
   */
  private getNextRunTime(): Date | null {
    if (!this.cronJob || !this.isRunning) return null;
    
    // Calculate next 6-hour interval
    const now = new Date();
    const currentHour = now.getUTCHours();
    const nextInterval = Math.ceil((currentHour + 1) / 6) * 6;
    
    const nextRun = new Date(now);
    if (nextInterval >= 24) {
      nextRun.setUTCDate(nextRun.getUTCDate() + 1);
      nextRun.setUTCHours(0, 0, 0, 0);
    } else {
      nextRun.setUTCHours(nextInterval, 0, 0, 0);
    }
    
    return nextRun;
  }
}

export const deadlineService = new DeadlineService();