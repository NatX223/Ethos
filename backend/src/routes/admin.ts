import express, { Request, Response } from 'express';
import { CronJobManager } from '../services/cronJobManager.js';

const router = express.Router();

// Global cron manager instance (will be set by server)
let cronManager: CronJobManager;

export function setCronManager(manager: CronJobManager) {
  cronManager = manager;
}

// Get all job statuses
router.get('/jobs', async (req: Request, res: Response) => {
  try {
    if (!cronManager) {
      return res.status(503).json({
        success: false,
        error: 'Cron manager not initialized'
      });
    }

    const jobs = cronManager.getAllJobStatuses();
    res.json({
      success: true,
      data: jobs
    });
  } catch (error) {
    console.error('Error getting job statuses:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get job statuses'
    });
  }
});

// Get specific job status
router.get('/jobs/:jobName', async (req: Request, res: Response) => {
  try {
    if (!cronManager) {
      return res.status(503).json({
        success: false,
        error: 'Cron manager not initialized'
      });
    }

    const { jobName } = req.params;
    const job = cronManager.getJobStatus(jobName);
    
    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found'
      });
    }

    res.json({
      success: true,
      data: job
    });
  } catch (error) {
    console.error('Error getting job status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get job status'
    });
  }
});

// Get job execution history
router.get('/jobs/:jobName/history', async (req: Request, res: Response) => {
  try {
    if (!cronManager) {
      return res.status(503).json({
        success: false,
        error: 'Cron manager not initialized'
      });
    }

    const { jobName } = req.params;
    const days = parseInt(req.query.days as string) || 7;
    
    const history = await cronManager.getJobExecutionHistory(jobName, days);
    
    res.json({
      success: true,
      data: {
        jobName,
        days,
        history
      }
    });
  } catch (error) {
    console.error('Error getting job history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get job history'
    });
  }
});

// Manually execute a job (for testing)
router.post('/jobs/:jobName/execute', async (req: Request, res: Response) => {
  try {
    if (!cronManager) {
      return res.status(503).json({
        success: false,
        error: 'Cron manager not initialized'
      });
    }

    const { jobName } = req.params;
    
    await cronManager.executeJobManually(jobName);
    
    res.json({
      success: true,
      message: `Job ${jobName} executed successfully`
    });
  } catch (error) {
    console.error('Error executing job manually:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to execute job'
    });
  }
});

// Enable/disable a job
router.patch('/jobs/:jobName', async (req: Request, res: Response) => {
  try {
    if (!cronManager) {
      return res.status(503).json({
        success: false,
        error: 'Cron manager not initialized'
      });
    }

    const { jobName } = req.params;
    const { enabled } = req.body;
    
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'enabled field must be a boolean'
      });
    }

    if (enabled) {
      await cronManager.enableJob(jobName);
    } else {
      await cronManager.disableJob(jobName);
    }
    
    res.json({
      success: true,
      message: `Job ${jobName} ${enabled ? 'enabled' : 'disabled'} successfully`
    });
  } catch (error) {
    console.error('Error updating job status:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update job'
    });
  }
});

export default router;