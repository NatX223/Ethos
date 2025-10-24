# Vercel Deployment Guide

## ⚠️ Important Limitations

**Vercel's serverless functions don't support persistent cron jobs.** Your cron job system will be disabled on Vercel. You have these options:

### Option 1: Use Vercel Cron (Pro Plan Required)
- Requires Vercel Pro plan ($20/month)
- Limited to 100 cron executions per month
- Uses the `/api/cron/*` endpoints we created

### Option 2: Use External Cron Service
- Use services like cron-job.org, EasyCron, or GitHub Actions
- Call your API endpoints on schedule
- Free alternatives available

### Option 3: Deploy to Different Platform
- **Recommended**: Use Railway, Render, or Heroku for full cron support
- These platforms support persistent Node.js processes

## ✅ Vercel Configuration Fixed

The `vercel.json` is now properly configured to use `api/index.ts` as the entry point, which should resolve the "No Output Directory" error.

## Vercel Deployment Steps

### 1. Environment Variables
Set these in your Vercel dashboard:

**Required:**
- `CRED` - Base64 encoded Firebase service account JSON
- `GITHUB_CLIENT_ID` - Your GitHub OAuth app client ID
- `GITHUB_CLIENT_SECRET` - Your GitHub OAuth app client secret
- `STRAVA_CLIENT_ID` - Your Strava OAuth app client ID
- `STRAVA_CLIENT_SECRET` - Your Strava OAuth app client secret
- `JWT_SECRET` - Random string for JWT signing
- `NODE_ENV` - Set to `production`

**For Vercel Cron (Pro plan only):**
- `CRON_SECRET` - Random string to secure cron endpoints

### 2. Deploy
1. Connect your GitHub repository to Vercel
2. Vercel will automatically detect the `vercel.json` configuration
3. Build command: `npm run vercel-build`
4. Output directory: `dist`

### 3. Configure Cron (Pro Plan Only)
If you have Vercel Pro, add this to your `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/daily-verification",
      "schedule": "0 0 * * *"
    }
  ]
}
```

## Alternative: External Cron Setup

### Using cron-job.org (Free)
1. Sign up at https://cron-job.org
2. Create jobs that call your API endpoints:
   - `POST https://your-app.vercel.app/api/admin/jobs/daily-verification/execute`
   - Schedule: `0 0 * * *` (daily at midnight)

### Using GitHub Actions (Free)
Create `.github/workflows/cron.yml`:

```yaml
name: Daily Cron Jobs
on:
  schedule:
    - cron: '0 0 * * *'  # Daily at midnight UTC

jobs:
  daily-verification:
    runs-on: ubuntu-latest
    steps:
      - name: Call Daily Verification
        run: |
          curl -X POST https://your-app.vercel.app/api/admin/jobs/daily-verification/execute
```

## Recommended Alternative: Railway

For full cron job support, consider deploying to Railway instead:

1. Connect GitHub to Railway
2. Set environment variables
3. Deploy - cron jobs work automatically
4. $5/month for hobby plan

## Testing Your Deployment

1. Check health: `GET https://your-app.vercel.app/health`
2. Test API: `GET https://your-app.vercel.app/api/goals`
3. Manual job execution: `POST https://your-app.vercel.app/api/admin/jobs/daily-verification/execute`

## Troubleshooting

- **Build fails**: Check that all environment variables are set
- **Functions timeout**: Vercel has 10s timeout for hobby plan, 60s for pro
- **Cron not working**: Requires Vercel Pro plan or external service
- **Database connections**: Use connection pooling for serverless