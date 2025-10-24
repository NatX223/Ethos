import { progressService } from './progressService.js';

export class SchedulerService {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  /**
   * Start the progress update scheduler
   * For hobby plan: Only runs on-demand, not continuously
   */
  start(): void {
    if (this.isRunning) {
      console.log('⚠️ Scheduler is already running');
      return;
    }

    console.log('🚀 Goal progress scheduler initialized (on-demand mode for hobby plan)');
    
    // For hobby plan: Don't run continuous intervals
    // Instead, progress updates happen:
    // 1. When users visit their dashboard
    // 2. When users manually trigger updates
    // 3. Daily deadline check (lightweight)
    
    this.isRunning = true;
    console.log('✅ Goal progress scheduler ready (on-demand mode)');
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('🛑 Goal progress scheduler stopped');
  }

  /**
   * Check if scheduler is running
   */
  isSchedulerRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Run progress update for all active goals
   */
  private async runProgressUpdate(): Promise<void> {
    try {
      console.log('🔄 Running scheduled progress update...');
      const startTime = Date.now();

      const results = await progressService.updateAllActiveGoals();

      const duration = Date.now() - startTime;
      console.log(`✅ Scheduled progress update completed in ${duration}ms. Updated ${results.length} goals.`);

      // Log summary of updates
      if (results.length > 0) {
        const completedGoals = results.filter(r => r.isCompleted).length;
        const githubGoals = results.filter(r => r.dataSource === 'github').length;
        const stravaGoals = results.filter(r => r.dataSource === 'strava').length;
        const onchainGoals = results.filter(r => r.dataSource === 'onchain').length;

        console.log(`📊 Update summary:
          - Total updated: ${results.length}
          - Completed: ${completedGoals}
          - GitHub goals: ${githubGoals}
          - Strava goals: ${stravaGoals}
          - Onchain goals: ${onchainGoals}`);
      }

    } catch (error) {
      console.error('❌ Error in scheduled progress update:', error);
    }
  }

  /**
   * Run a manual progress update (for testing)
   */
  async runManualUpdate(): Promise<void> {
    console.log('🔧 Running manual progress update...');
    await this.runProgressUpdate();
  }
}

export const schedulerService = new SchedulerService();