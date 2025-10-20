# OAuth Setup Guide

This guide explains how to set up GitHub and Strava OAuth for the Ethos platform.

## Overview

The OAuth implementation allows users to connect their GitHub and Strava accounts to their Ethos profile. This enables:

- **GitHub**: Track coding goals, commit streaks, and repository activities
- **Strava**: Track fitness goals, running/cycling activities, and athletic achievements

## Backend Configuration

### 1. GitHub OAuth Setup

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Fill in the details:
   - **Application name**: Ethos
   - **Homepage URL**: `http://localhost:3000` (or your domain)
   - **Authorization callback URL**: `http://localhost:5000/api/oauth/callback/github`
4. Copy the Client ID and Client Secret to your `.env` file:
   ```
   GITHUB_CLIENT_ID=your_github_client_id
   GITHUB_CLIENT_SECRET=your_github_client_secret
   GITHUB_REDIRECT_URI=http://localhost:5000/api/oauth/callback/github
   ```

### 2. Strava OAuth Setup

1. Go to [Strava API Settings](https://www.strava.com/settings/api)
2. Create a new application:
   - **Application Name**: Ethos
   - **Category**: Social Network
   - **Website**: `http://localhost:3000`
   - **Authorization Callback Domain**: `localhost`
3. Copy the Client ID and Client Secret to your `.env` file:
   ```
   STRAVA_CLIENT_ID=your_strava_client_id
   STRAVA_CLIENT_SECRET=your_strava_client_secret
   STRAVA_REDIRECT_URI=http://localhost:5000/api/oauth/callback/strava
   ```

### 3. Environment Variables

Make sure your `backend/.env` file includes:

```env
# GitHub OAuth
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_REDIRECT_URI=http://localhost:5000/api/oauth/callback/github

# Strava OAuth
STRAVA_CLIENT_ID=your_strava_client_id
STRAVA_CLIENT_SECRET=your_strava_client_secret
STRAVA_REDIRECT_URI=http://localhost:5000/api/oauth/callback/strava

# Frontend URL for redirects
FRONTEND_URL=http://localhost:3000
```

## Frontend Configuration

Make sure your `frontend/.env` file includes:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

## How It Works

### OAuth Flow

1. **Initiation**: User clicks "Connect GitHub" or "Connect Strava" button
2. **Authorization**: User is redirected to the provider's OAuth consent page
3. **Callback**: Provider sends authorization code to our callback endpoint
4. **Token Exchange**: Backend exchanges code for access token
5. **Profile Fetch**: Backend uses token to fetch user profile (username/athlete ID)
6. **Storage**: Backend stores the identifier in the user's Firestore document
7. **Redirect**: User is redirected back to the dashboard with success/error status

### Security Features

- **State Parameter**: Prevents CSRF attacks by using UUID state tokens
- **Token Cleanup**: Temporary OAuth states expire after 10 minutes
- **No Token Storage**: Access tokens are not stored, only user identifiers
- **Address Validation**: Ethereum addresses are validated before processing

### API Endpoints

- `POST /api/oauth/initiate` - Start OAuth flow
- `GET /api/oauth/callback/github` - Handle GitHub callback
- `GET /api/oauth/callback/strava` - Handle Strava callback
- `POST /api/oauth/disconnect` - Disconnect an account

## Usage

### Frontend Component

The `OAuthConnect` component provides:

- Dropdown to select GitHub or Strava
- Connection status display
- Connect/disconnect buttons
- Loading states and error handling

### Dashboard Integration

The dashboard page (`/dashboard`) includes:

- Connected accounts management
- OAuth callback handling
- Success/error notifications
- Account information display

## Testing

1. Start the backend server: `npm run dev` (in backend directory)
2. Start the frontend server: `npm run dev` (in frontend directory)
3. Navigate to `http://localhost:3000/dashboard`
4. Connect your wallet
5. Try connecting GitHub and Strava accounts

## Production Deployment

For production, update the callback URLs in your OAuth app settings:

- GitHub: `https://yourdomain.com/api/oauth/callback/github`
- Strava: `https://yourdomain.com/api/oauth/callback/strava`

And update your environment variables accordingly.

## Data Storage

Connected account data is stored in the user's Firestore document:

```typescript
connectedAccounts: {
  github?: {
    username: string;
    userId: string;
    connectedAt: Date;
    lastSyncAt: Date;
    isActive: boolean;
  };
  strava?: {
    username: string;
    athleteId: string;
    connectedAt: Date;
    lastSyncAt: Date;
    isActive: boolean;
  };
}
```

## Future Enhancements

- Automatic data syncing from connected accounts
- Goal verification using GitHub commits or Strava activities
- Webhook integration for real-time updates
- Additional OAuth providers (Twitter, LinkedIn, etc.)