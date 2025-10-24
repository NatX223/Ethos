// Vercel Cron endpoint for daily verification
// This will only work with Vercel Pro plan

export default async function handler(req, res) {
  // Verify this is a cron request
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Import your cron job logic here
    const { DailyVerificationJob } = await import('../../dist/services/jobs/dailyVerificationJob.js');
    const job = new DailyVerificationJob();
    
    await job.execute();
    
    res.status(200).json({ 
      success: true, 
      message: 'Daily verification completed',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Daily verification failed:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}