// Example: frontend/src/app/api/oauth/callback/github/route.ts
import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (!code) {
      return NextResponse.redirect(
        `${process.env.FRONTEND_URL}/auth/error?error=missing_code`
      );
    }

    // Exchange code for access token
    const tokenResponse = await axios.post('https://github.com/login/oauth/access_token', {
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code: code,
    }, {
      headers: {
        'Accept': 'application/json',
      },
    });

    const { access_token } = tokenResponse.data;

    if (!access_token) {
      return NextResponse.redirect(
        `${process.env.FRONTEND_URL}/auth/error?error=token_exchange_failed`
      );
    }

    // Get user info from GitHub
    const userResponse = await axios.get('https://api.github.com/user', {
      headers: {
        'Authorization': `token ${access_token}`,
      },
    });

    const githubUser = userResponse.data;

    // Store user data and redirect
    const redirectUrl = new URL('/auth/success', process.env.FRONTEND_URL!);
    redirectUrl.searchParams.set('provider', 'github');
    redirectUrl.searchParams.set('user', JSON.stringify({
      id: githubUser.id,
      username: githubUser.login,
      name: githubUser.name,
      email: githubUser.email,
      avatar: githubUser.avatar_url,
    }));
    redirectUrl.searchParams.set('token', access_token);

    return NextResponse.redirect(redirectUrl.toString());
  } catch (error) {
    console.error('GitHub OAuth error:', error);
    return NextResponse.redirect(
      `${process.env.FRONTEND_URL}/auth/error?error=oauth_failed`
    );
  }
}