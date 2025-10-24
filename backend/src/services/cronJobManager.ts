import cron from 'node-cron';
import { DailyVerificationJob } from './jobs/dailyVerificationJob.js';
import { TokenCleanupJob } from './jobs/tokenCleanupJob.js';
import { HealthCheckJob } from './jobs/healthCheckJob.js';
import { firebaseService } from './firebaseService.js';

export interface CronJob {
  name: string;
  schedule: string;
  task: () => Promise<void>;
  enabled: boolean;
  running: boolean;
  lastRun?: Date;
  nextRun?: Date;
  errorCount: number;
  runOnce?: boolean; // For daily jobs that should only run once per day
}

export class CronJobManager {
  private jobs: Map<string, { job: CronJob; cronTask?: cron.ScheduledTask }> = new Map();
  private dailyVerificationJob: DailyVerificationJob;
  private tokenCleanupJob: TokenCleanupJob;
  private healthCheckJob: HealthCheckJob;

  constructor() {
    this.dailyVerificationJob = new DailyVerificationJob();
    this.tokenCleanupJob = new TokenCleanupJob();
    this.healthCheckJob = new HealthCheckJob();
  }

  async initializeJobs(): Promise<void> {
    try {
      // Define all cron jobs
      const jobDefinitions: CronJob[] = [
        {
          name: 'daily-verification',
          schedule: '0 0 * * *', // Daily at midnight
          task: () => this.executeWithDailyCheck('daily-verification', () => this.dailyVerificationJob.execute()),
          enabled: process.env.ENABLE_DAILY_VERIFICATION !== 'false',
          running: false,
          errorCount: 0,
          runOnce: true
        },
        {
          name: 'token-cleanup',
          schedule: '0 2 * * *', // Daily at 2 AM
          task: () => this.executeWithDailyCheck('token-cleanup', () => this.tokenCleanupJob.execute()),
          enabled: process.env.ENABLE_TOKEN_CLEANUP !== 'false',
          running: false,
          errorCount: 0,
          runOnce: true
        },
        {
          name: 'health-check',
          schedule: '*/15 * * * *', // Every 15 minutes
          task: () => this.healthCheckJob.execute(),
          enabled: process.env.ENABLE_HEALTH_CHECK !== 'false',
          running: false,
          errorCount: 0,
          runOnce: false // Health checks can run multiple times
        }
      ];

      // Register and start jobs
      for (const jobDef of jobDefinitions) {
        await this.registerJob(jobDef);
        if (jobDef.enabled) {
          await this.startJob(jobDef.name);
        }
      }

      console.log(`✅ Initialized ${this.jobs.size} cron jobs`);
    } catch (error) {
      console.error('❌ Failed to initialize cron jobs:', error);
      throw error;
    }
  }

  private async registerJob(jobDef: CronJob): Promise<void> {
    try {
      // Wrap the task with error handling and logging
      const wrappedTask = async () => {
        const jobInfo = this.jobs.get(jobDef.name);
        if (!jobInfo) return;

        const job = jobInfo.job;
        
        if (job.running) {
          console.log(`⚠️ Job ${job.name} is already running, skipping...`);
          return;
        }

        job.running = true;
        job.lastRun = new Date();
        
        console.log(`🔄 Starting job: ${job.name}`);
        
        try {
          await jobDef.task();
          job.errorCount = 0; // Reset error count on success
          console.log(`✅ Job completed successfully: ${job.name}`);
        } catch (error) {
          job.errorCount++;
          console.error(`❌ Job failed: ${job.name}`, error);
          
          // Disable job if it fails too many times
          if (job.errorCount >= 5) {
            console.error(`🚫 Disabling job ${job.name} due to repeated failures`);
            job.enabled = false;
            if (jobInfo.cronTask) {
              jobInfo.cronTask.stop();
            }
          }
        } finally {
          job.running = false;
        }
      };

      // Create the cron task
      const cronTask = cron.schedule(jobDef.schedule, wrappedTask, {
        scheduled: false, // Don't start immediately
        timezone: process.env.TIMEZONE || 'UTC'
      });

      // Store job info
      this.jobs.set(jobDef.name, {
        job: { ...jobDef },
        cronTask
      });

      console.log(`📝 Registered job: ${jobDef.name} (${jobDef.schedule})`);
    } catch (error) {
      console.error(`❌ Failed to register job ${jobDef.name}:`, error);
      throw error;
    }
  }

  async startJob(jobName: string): Promise<void> {
    const jobInfo = this.jobs.get(jobName);
    if (!jobInfo) {
      throw new Error(`Job not found: ${jobName}`);
    }

    if (!jobInfo.job.enabled) {
      throw new Error(`Job is disabled: ${jobName}`);
    }

    if (jobInfo.cronTask) {
      jobInfo.cronTask.start();
      console.log(`▶️ Started job: ${jobName}`);
    }
  }

  async stopJob(jobName: string): Promise<void> {
    const jobInfo = this.jobs.get(jobName);
    if (!jobInfo) {
      throw new Error(`Job not found: ${jobName}`);
    }

    if (jobInfo.cronTask) {
      jobInfo.cronTask.stop();
      console.log(`⏹️ Stopped job: ${jobName}`);
    }
  }

  async stopAllJobs(): Promise<void> {
    console.log('🛑 Stopping all cron jobs...');
    
    for (const [jobName, jobInfo] of this.jobs) {
      if (jobInfo.cronTask) {
        jobInfo.cronTask.stop();
        console.log(`⏹️ Stopped job: ${jobName}`);
      }
    }
    
    // Wait for running jobs to complete (with timeout)
    const timeout = 30000; // 30 seconds
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const runningJobs = Array.from(this.jobs.values())
        .filter(jobInfo => jobInfo.job.running);
      
      if (runningJobs.length === 0) {
        break;
      }
      
      console.log(`⏳ Waiting for ${runningJobs.length} jobs to complete...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('✅ All cron jobs stopped');
  }

  getJobStatus(jobName: string): CronJob | null {
    const jobInfo = this.jobs.get(jobName);
    return jobInfo ? { ...jobInfo.job } : null;
  }

  getAllJobStatuses(): CronJob[] {
    return Array.from(this.jobs.values()).map(jobInfo => ({ ...jobInfo.job }));
  }

  async enableJob(jobName: string): Promise<void> {
    const jobInfo = this.jobs.get(jobName);
    if (!jobInfo) {
      throw new Error(`Job not found: ${jobName}`);
    }

    jobInfo.job.enabled = true;
    jobInfo.job.errorCount = 0; // Reset error count
    await this.startJob(jobName);
  }

  async disableJob(jobName: string): Promise<void> {
    const jobInfo = this.jobs.get(jobName);
    if (!jobInfo) {
      throw new Error(`Job not found: ${jobName}`);
    }

    jobInfo.job.enabled = false;
    await this.stopJob(jobName);
  }

  // Manual job execution for testing
  async executeJobManually(jobName: string): Promise<void> {
    const jobInfo = this.jobs.get(jobName);
    if (!jobInfo) {
      throw new Error(`Job not found: ${jobName}`);
    }

    console.log(`🔧 Manually executing job: ${jobName}`);
    
    try {
      await jobInfo.job.task();
      console.log(`✅ Manual execution completed: ${jobName}`);
    } catch (error) {
      console.error(`❌ Manual execution failed: ${jobName}`, error);
      throw error;
    }
  }

  // Check if a daily job has already run today
  private async hasJobRunToday(jobName: string): Promise<boolean> {
    try {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      const docId = `${jobName}_${today}`;
      
      const jobLog = await firebaseService.getDocument('job_executions', docId);
      return jobLog !== null && (jobLog as any)?.status === 'completed';
    } catch (error) {
      console.error(`Error checking job execution status for ${jobName}:`, error);
      return false; // If we can't check, allow the job to run
    }
  }

  // Mark a job as completed for today
  private async markJobCompleted(jobName: string): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      const docId = `${jobName}_${today}`;
      
      await firebaseService.createDocument('job_executions', {
        jobName,
        date: today,
        timestamp: new Date(),
        status: 'completed'
      }, docId);
    } catch (error) {
      console.error(`Error marking job as completed for ${jobName}:`, error);
    }
  }

  // Execute job with daily check to prevent duplicate runs
  private async executeWithDailyCheck(jobName: string, taskFn: () => Promise<void>): Promise<void> {
    // Check if job already ran today
    const hasRun = await this.hasJobRunToday(jobName);
    if (hasRun) {
      console.log(`⏭️ Job ${jobName} already completed today, skipping...`);
      return;
    }

    console.log(`🔄 Executing daily job: ${jobName}`);
    
    try {
      await taskFn();
      await this.markJobCompleted(jobName);
      console.log(`✅ Daily job completed and logged: ${jobName}`);
    } catch (error) {
      console.error(`❌ Daily job failed: ${jobName}`, error);
      throw error;
    }
  }

  // Get job execution history
  async getJobExecutionHistory(jobName: string, days: number = 7): Promise<any[]> {
    try {
      const history: any[] = [];
      const today = new Date();
      
      for (let i = 0; i < days; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const docId = `${jobName}_${dateStr}`;
        
        const jobLog = await firebaseService.getDocument('job_executions', docId);
        if (jobLog) {
          history.push({
            date: dateStr,
            ...jobLog
          });
        }
      }
      
      return history.reverse(); // Oldest first
    } catch (error) {
      console.error(`Error getting job execution history for ${jobName}:`, error);
      return [];
    }
  }

  // Check for missed daily jobs on startup
  async checkMissedJobs(): Promise<void> {
    console.log('🔍 Checking for missed daily jobs...');
    
    const today = new Date().toISOString().split('T')[0];
    const dailyJobs = Array.from(this.jobs.values())
      .filter(jobInfo => jobInfo.job.runOnce && jobInfo.job.enabled);

    for (const jobInfo of dailyJobs) {
      const jobName = jobInfo.job.name;
      const hasRun = await this.hasJobRunToday(jobName);
      
      if (!hasRun) {
        console.log(`⚠️ Daily job ${jobName} hasn't run today, will execute on next scheduled time`);
      } else {
        console.log(`✅ Daily job ${jobName} already completed today`);
      }
    }
    
    console.log('✅ Missed job check completed');
  }
}