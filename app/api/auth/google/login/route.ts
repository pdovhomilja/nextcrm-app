/**
 * Google OAuth Login Route
 * Initiates the OAuth 2.0 authorization flow
 */

import { NextRequest, NextResponse } from 'next/server';
import { GoogleAuthService } from '@/lib/auth/google-auth';

export async function GET(req: NextRequest) {
  try {
    const googleAuth = new GoogleAuthService();

    // Get the redirect URI
    const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';
    const host = req.headers.get('host') || process.env.NEXTCRM_DOMAIN || 'localhost:3000';
    const redirectUri = `${protocol}://${host}/api/auth/google/callback`;

    // Generate OAuth URL
    const authUrl = googleAuth.getAuthUrl(redirectUri);

    // Return the authorization URL
    return NextResponse.json({
      authUrl,
    });
  } catch (error) {
    console.error('Error initiating Google OAuth:', error);
    return NextResponse.json(
      { error: 'Failed to initiate Google OAuth login' },
      { status: 500 }
    );
  }
}
