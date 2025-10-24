import cron from 'node-cron';
import Goal from '../models/goal.js';

export class DeadlineService {
  private cronJob: cron.ScheduledTask | null = null;
  private isRunning = false;

  /**
   * Start the deadline checker cron job
   * Runs daily at midnight (00:00) to check for expired goals
   */
  start(): void {
    if (this.isRunning) {
      console.log('⚠️ Deadline checker is already running');
      return;
    }

    console.log('🚀 Starting deadline checker cron job...');
    
    // For hobby plan: Run less frequently to save resources
    // Check every 6 hours instead of hourly progress updates
    this.cronJob = cron.schedule('0 */6 * * *', async () => {
      await this.checkExpiredGoals();
      // Also check for goals expiring soon (next 24 hours)
      await this.checkUpcomingDeadlines();
    }, {
      scheduled: true,
      timezone: 'UTC' // You can change this to your preferred timezone
    });

    this.isRunning = true;
    console.log('✅ Deadline checker started (runs daily at midnight UTC)');
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
  async checkExpiredGoals(): Promise<void> {
    try {
      console.log('🔍 Checking for expired goals...');
      const startTime = Date.now();
      const currentTime = new Date();

      // Find all active goals where deadline has passed
      const expiredGoals = await Goal.find({
        status: 'active',
        deadline: { $lt: currentTime }
      }).populate('user', 'email username');

      if (expiredGoals.length === 0) {
        console.log('✅ No expired goals found');
        return;
      }

      console.log(`📋 Found ${expiredGoals.length} expired goals`);

      // Update expired goals to 'failed' status
      const updateResults = await Promise.allSettled(
        expiredGoals.map(async (goal) => {
          try {
            // Update goal status to failed
            goal.status = 'failed';
            
            // Add verification result with failure info
            goal.verificationResult = {
              achieved: false,
              actualValue: goal.currentValue,
              verifiedAt: currentTime,
              txHash: null // Will be set when blockchain transaction is made
            };

            await goal.save();

            console.log(`❌ Goal "${goal.title}" (ID: ${goal._id}) marked as failed - deadline passed`);
            
            return {
              goalId: goal._id,
              title: goal.title,
              user: goal.user,
              deadline: goal.deadline,
              currentValue: goal.currentValue,
              targetValue: goal.targetValue,
              success: true
            };
          } catch (error) {
            console.error(`❌ Error updating goal ${goal._id}:`, error);
            return {
              goalId: goal._id,
              title: goal.title,
              error: error.message,
              success: false
            };
          }
        })
      );

      // Process results
      const successful = updateResults.filter(result => 
        result.status === 'fulfilled' && result.value.success
      ).map(result => result.value);

      const failed = updateResults.filter(result => 
        result.status === 'rejected' || 
        (result.status === 'fulfilled' && !result.value.success)
      );

      const duration = Date.now() - startTime;
      
      console.log(`✅ Deadline check completed in ${duration}ms`);
      console.log(`📊 Results: ${successful.length} goals marked as failed, ${failed.length} errors`);

      // Log details of failed goals
      if (successful.length > 0) {
        console.log('📋 Goals marked as failed:');
        successful.forEach(goal => {
          console.log(`  - "${goal.title}" (${goal.currentValue}/${goal.targetValue}) - User: ${goal.user?.email || 'Unknown'}`);
        });
      }

      if (failed.length > 0) {
        console.log('⚠️ Errors occurred while updating goals:');
        failed.forEach(result => {
          const error = result.status === 'rejected' ? result.reason : result.value?.error;
          console.log(`  - Goal update failed: ${error}`);
        });
      }

    } catch (error) {
      console.error('❌ Error in deadline checker:', error);
    }
  }

  /**
   * Run a manual deadline check (for testing)
   */
  async runManualCheck(): Promise<void> {
    console.log('🔧 Running manual deadline check...');
    await this.checkExpiredGoals();
  }

  /**
   * Check for goals expiring in next 24 hours and update them
   */
  async checkUpcomingDeadlines(): Promise<void> {
    try {
      const { smartUpdateService } = await import('./smartUpdateService.js');
      await smartUpdateService.checkUpcomingDeadlines();
    } catch (error) {
      console.error('❌ Error checking upcoming deadlines:', error);
    }
  }

  /**
   * Get next scheduled run time
   */
  getNextRun(): Date | null {
    if (!this.cronJob) return null;
    
    // Calculate next 6-hour interval
    const now = new Date();
    const nextRun = new Date(now);
    const currentHour = now.getUTCHours();
    const nextInterval = Math.ceil((currentHour + 1) / 6) * 6;
    nextRun.setUTCHours(nextInterval, 0, 0, 0);
    
    return nextRun;
  }
}

export const deadlineService = new DeadlineService();