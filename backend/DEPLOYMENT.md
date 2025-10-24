# Deployment Guide for Render

## Prerequisites
- GitHub repository with your code
- Render account

## Environment Variables
Set these environment variables in your Render dashboard:

### Required
- `CRED` - Base64 encoded Firebase service account JSON
- `GITHUB_CLIENT_ID` - Your GitHub OAuth app client ID
- `GITHUB_CLIENT_SECRET` - Your GitHub OAuth app client secret
- `STRAVA_CLIENT_ID` - Your Strava OAuth app client ID
- `STRAVA_CLIENT_SECRET` - Your Strava OAuth app client secret
- `JWT_SECRET` - Random string for JWT signing
- `NODE_ENV` - Set to `production`

### Optional
- `PORT` - Will default to Render's assigned port
- `FRONTEND_URL` - URL of your frontend application
- `ENABLE_DAILY_VERIFICATION` - Set to `false` to disable (default: true)
- `ENABLE_TOKEN_CLEANUP` - Set to `false` to disable (default: true)
- `ENABLE_HEALTH_CHECK` - Set to `false` to disable (default: true)
- `TIMEZONE` - Timezone for cron jobs (default: UTC)

## Render Configuration

### Option 1: Using render.yaml (Recommended)
The `render.yaml` file is already configured. Just connect your GitHub repo to Render.

### Option 2: Manual Configuration
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`
- **Node Version**: 18+ (latest LTS recommended)

## Deployment Steps

1. Push your code to GitHub
2. Connect your GitHub repository to Render
3. Set all required environment variables
4. Deploy!

## Monitoring

Once deployed, you can monitor your cron jobs using the admin endpoints:

- `GET /api/admin/jobs` - View all job statuses
- `GET /api/admin/jobs/{jobName}/history` - View job execution history
- `POST /api/admin/jobs/{jobName}/execute` - Manually trigger a job

## Troubleshooting

### Build Errors
- Ensure all environment variables are set
- Check that Node.js version is 18+
- Verify TypeScript compilation with `npm run build` locally

### Runtime Errors
- Check Render logs for detailed error messages
- Verify Firebase credentials are correctly base64 encoded
- Ensure all OAuth redirect URLs are updated for production

### Cron Jobs Not Running
- Check `/api/admin/jobs` endpoint to see job statuses
- Verify environment variables for job enablement
- Check Render logs for cron job execution messages