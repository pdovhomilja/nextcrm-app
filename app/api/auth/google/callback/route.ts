/**
 * Google OAuth Callback Route
 * Handles the OAuth 2.0 authorization code from Google
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { GoogleAuthService } from '@/lib/auth/google-auth';
import { PrismaClient } from '@prisma/client';
import { redisService } from '@/lib/cache/redis';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Handle OAuth errors
    if (error) {
      console.error('OAuth error:', error);
      return NextResponse.redirect(
        new URL(`/auth/error?error=${encodeURIComponent(error)}`, req.url)
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL('/auth/error?error=missing_code', req.url)
      );
    }

    const googleAuth = new GoogleAuthService();

    // Get the redirect URI
    const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';
    const host = req.headers.get('host') || process.env.NEXTCRM_DOMAIN || 'localhost:3000';
    const redirectUri = `${protocol}://${host}/api/auth/google/callback`;

    // Exchange code for tokens
    const tokens = await googleAuth.getTokens(code, redirectUri);

    if (!tokens) {
      throw new Error('Failed to exchange authorization code for tokens');
    }

    // Get user profile
    const profile = await googleAuth.getUserProfile(tokens.access_token);

    if (!profile) {
      throw new Error('Failed to fetch user profile');
    }

    // Create or update user with Google account
    const user = await googleAuth.createOrUpdateUser(profile, tokens);

    if (!user) {
      throw new Error('Failed to create or update user');
    }

    // Create session token
    const sessionToken = await generateSessionToken(user.id);

    // Set secure HTTP-only cookie
    const cookieStore = await cookies();
    cookieStore.set('session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    });

    // Get user's tenants
    const tenants = await prisma.tenantMembers.findMany({
      where: { user_id: user.id },
      include: {
        tenant: {
          select: {
            id: true,
            slug: true,
            subdomain: true,
            custom_domain: true,
            domain_type: true,
          },
        },
      },
    });

    // Determine redirect URL
    let redirectUrl = '/dashboard';
    if (tenants.length === 1) {
      const tenant = tenants[0].tenant;
      const domain =
        tenant.domain_type === 'CUSTOM_DOMAIN'
          ? tenant.custom_domain
          : `${tenant.subdomain}.${process.env.NEXTCRM_DOMAIN}`;

      redirectUrl = `${protocol}://${domain}/dashboard`;
    } else if (tenants.length > 1) {
      redirectUrl = '/tenants';
    }

    // Redirect to dashboard or tenant selection
    return NextResponse.redirect(new URL(redirectUrl, req.url));
  } catch (error) {
    console.error('Error handling Google OAuth callback:', error);
    return NextResponse.redirect(
      new URL(
        `/auth/error?error=${encodeURIComponent(
          error instanceof Error ? error.message : 'Unknown error'
        )}`,
        req.url
      )
    );
  }
}

/**
 * Generate session token and store in Redis
 */
async function generateSessionToken(userId: string): Promise<string> {
  const token = generateRandomString(32);
  const sessionData = {
    userId,
    createdAt: new Date().toISOString(),
  };

  await redisService.set(`session:${token}`, sessionData, 30 * 24 * 60 * 60); // 30 days

  return token;
}

/**
 * Generate random string for session token
 */
function generateRandomString(length: number): string {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
