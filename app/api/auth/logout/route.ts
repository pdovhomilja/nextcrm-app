/**
 * Logout Route
 * Handles user logout and session cleanup
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { redisService } from '@/lib/cache/redis';

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;

    if (sessionToken) {
      // Delete session from Redis
      await redisService.delete(`session:${sessionToken}`);
    }

    // Clear session cookie
    cookieStore.delete('session');

    // Redirect to login page
    return NextResponse.redirect(new URL('/auth/login', req.url));
  } catch (error) {
    console.error('Error during logout:', error);
    return NextResponse.json(
      { error: 'Failed to logout' },
      { status: 500 }
    );
  }
}
