import express from 'express';
import axios from 'axios';
import { randomUUID } from 'crypto';
import { firebaseService } from '../services/firebaseService.js';

const router = express.Router();

// Store temporary state for OAuth flows
const oauthStates = new Map<string, { walletAddress: string; provider: string; timestamp: number }>();

// Clean up expired states (older than 10 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [state, data] of oauthStates.entries()) {
    if (now - data.timestamp > 10 * 60 * 1000) {
      oauthStates.delete(state);
    }
  }
}, 5 * 60 * 1000); // Clean every 5 minutes

/**
 * POST /api/oauth/initiate
 * Initiate OAuth flow for GitHub or Strava
 */
router.post('/initiate', async (req, res) => {
  try {
    const { provider, walletAddress } = req.body;

    if (!provider || !walletAddress) {
      return res.status(400).json({
        success: false,
        error: 'Provider and wallet address are required'
      });
    }

    if (!['github', 'strava'].includes(provider)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid provider. Must be "github" or "strava"'
      });
    }

    // Validate Ethereum address
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Ethereum address format'
      });
    }

    // Check if user exists
    const user = await firebaseService.getDocument('ethosuser', walletAddress.toLowerCase());
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Generate state parameter for security
    const state = randomUUID();
    oauthStates.set(state, {
      walletAddress: walletAddress.toLowerCase(),
      provider,
      timestamp: Date.now()
    });

    let authUrl: string;
    let clientId: string;
    let redirectUri: string;

    if (provider === 'github') {
      clientId = process.env.GITHUB_CLIENT_ID!;
      redirectUri = process.env.GITHUB_REDIRECT_URI!;
      authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=user:email&state=${state}`;
    } else if (provider === 'strava') {
      clientId = process.env.STRAVA_CLIENT_ID!;
      redirectUri = process.env.STRAVA_REDIRECT_URI!;
      authUrl = `https://www.strava.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=read,activity:read_all&state=${state}`;
    }

    res.json({
      success: true,
      data: {
        authUrl: authUrl!,
        state
      }
    });

  } catch (error) {
    console.error('❌ Error initiating OAuth:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initiate OAuth flow',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

/**
 * GET /api/oauth/callback/github
 * Handle GitHub OAuth callback
 */
router.get('/callback/github', async (req, res) => {
  try {
    const { code, state } = req.query;

    if (!code || !state) {
      return res.status(400).json({
        success: false,
        error: 'Missing authorization code or state'
      });
    }

    // Verify state parameter
    const stateData = oauthStates.get(state as string);
    if (!stateData || stateData.provider !== 'github') {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired state parameter'
      });
    }

    // Clean up state
    oauthStates.delete(state as string);

    // Exchange code for access token
    const tokenResponse = await axios.post('https://github.com/login/oauth/access_token', {
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code: code as string
    }, {
      headers: {
        'Accept': 'application/json'
      }
    });

    const accessToken = tokenResponse.data.access_token;

    if (!accessToken) {
      return res.status(400).json({
        success: false,
        error: 'Failed to obtain access token'
      });
    }

    // Fetch user profile
    const userResponse = await axios.get('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    const githubUser = userResponse.data;

    // Update user document
    await firebaseService.updateDocument('ethosuser', stateData.walletAddress, {
      'connectedAccounts.github': {
        username: githubUser.login,
        userId: githubUser.id.toString(),
        connectedAt: new Date(),
        lastSyncAt: new Date(),
        isActive: true
      },
      updatedAt: new Date()
    });

    console.log(`✅ GitHub connected for user: ${stateData.walletAddress}`);

    // Redirect to frontend with success
    res.redirect(`${process.env.FRONTEND_URL}/dashboard?oauth=github&status=success`);

  } catch (error) {
    console.error('❌ Error in GitHub OAuth callback:', error);
    res.redirect(`${process.env.FRONTEND_URL}/dashboard?oauth=github&status=error`);
  }
});

/**
 * GET /api/oauth/callback/strava
 * Handle Strava OAuth callback
 */
router.get('/callback/strava', async (req, res) => {
  try {
    const { code, state } = req.query;

    if (!code || !state) {
      return res.status(400).json({
        success: false,
        error: 'Missing authorization code or state'
      });
    }

    // Verify state parameter
    const stateData = oauthStates.get(state as string);
    if (!stateData || stateData.provider !== 'strava') {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired state parameter'
      });
    }

    // Clean up state
    oauthStates.delete(state as string);

    // Exchange code for access token
    const tokenResponse = await axios.post('https://www.strava.com/oauth/token', {
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code: code as string,
      grant_type: 'authorization_code'
    });

    const { access_token, refresh_token, expires_at, athlete } = tokenResponse.data;

    if (!access_token || !athlete) {
      return res.status(400).json({
        success: false,
        error: 'Failed to obtain access token or athlete data'
      });
    }

    // Update user document
    await firebaseService.updateDocument('ethosuser', stateData.walletAddress, {
      'connectedAccounts.strava': {
        username: athlete.username || `${athlete.firstname} ${athlete.lastname}`,
        athleteId: athlete.id.toString(),
        accessToken: access_token, // Store the access token
        refreshToken: refresh_token, // Store the refresh token
        expiresAt: expires_at ? new Date(expires_at * 1000) : null, // Convert Unix timestamp to Date
        lastSyncAt: new Date(),
        isActive: true
      },
      updatedAt: new Date()
    });

    console.log(`✅ Strava connected for user: ${stateData.walletAddress}`);

    // Redirect to frontend with success
    res.redirect(`${process.env.FRONTEND_URL}/dashboard?oauth=strava&status=success`);

  } catch (error) {
    console.error('❌ Error in Strava OAuth callback:', error);
    res.redirect(`${process.env.FRONTEND_URL}/dashboard?oauth=strava&status=error`);
  }
});

/**
 * POST /api/oauth/disconnect
 * Disconnect a connected account
 */
router.post('/disconnect', async (req, res) => {
  try {
    const { provider, walletAddress } = req.body;

    if (!provider || !walletAddress) {
      return res.status(400).json({
        success: false,
        error: 'Provider and wallet address are required'
      });
    }

    if (!['github', 'strava'].includes(provider)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid provider'
      });
    }

    // Validate Ethereum address
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Ethereum address format'
      });
    }

    const normalizedAddress = walletAddress.toLowerCase();

    // Check if user exists
    const user = await firebaseService.getDocument('ethosuser', normalizedAddress);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Disconnect the account
    const updateData: any = {
      updatedAt: new Date()
    };

    if (provider === 'github') {
      updateData['connectedAccounts.github'] = {
        username: '',
        userId: '',
        isActive: false
      };
    } else if (provider === 'strava') {
      updateData['connectedAccounts.strava'] = {
        username: '',
        athleteId: '',
        accessToken: '',
        refreshToken: '',
        expiresAt: null,
        isActive: false
      };
    }

    await firebaseService.updateDocument('ethosuser', normalizedAddress, updateData);

    console.log(`✅ ${provider} disconnected for user: ${normalizedAddress}`);

    res.json({
      success: true,
      message: `${provider} account disconnected successfully`
    });

  } catch (error) {
    console.error('❌ Error disconnecting OAuth:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to disconnect account',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

export default router;