/**
 * Google Auth Service
 * Handles Google OAuth 2.0 authentication for users and tenants
 */

import { google } from 'googleapis';
import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

interface GoogleProfile {
  id: string;
  email: string;
  name: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
  verified_email: boolean;
  locale?: string;
}

interface GoogleTokens {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
}

export class GoogleAuthService {
  private oauth2Client: any;

  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_CALLBACK_URL
    );
  }

  /**
   * Get authorization URL for Google OAuth
   */
  getAuthUrl(state?: string): string {
    const scopes = [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state: state || crypto.randomBytes(32).toString('hex'),
      prompt: 'consent',
    });
  }

  /**
   * Exchange authorization code for tokens
   */
  async getTokens(code: string): Promise<GoogleTokens> {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      return {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_in: tokens.expiry_date ? Math.floor((tokens.expiry_date - Date.now()) / 1000) : 3600,
        token_type: 'Bearer',
      };
    } catch (error) {
      console.error('Failed to exchange code for tokens:', error);
      throw new Error('Google authentication failed');
    }
  }

  /**
   * Get Google user profile
   */
  async getUserProfile(accessToken: string): Promise<GoogleProfile> {
    try {
      this.oauth2Client.setCredentials({ access_token: accessToken });

      const oauth2 = google.oauth2({ version: 'v2', auth: this.oauth2Client });
      const userinfo = await oauth2.userinfo.get();

      if (!userinfo.data) {
        throw new Error('No user info returned');
      }

      return {
        id: userinfo.data.id || '',
        email: userinfo.data.email || '',
        name: userinfo.data.name || '',
        picture: userinfo.data.picture,
        given_name: userinfo.data.given_name,
        family_name: userinfo.data.family_name,
        verified_email: userinfo.data.verified_email || false,
        locale: userinfo.data.locale,
      };
    } catch (error) {
      console.error('Failed to get user profile:', error);
      throw new Error('Failed to retrieve user profile');
    }
  }

  /**
   * Create or update user with Google account
   */
  async createOrUpdateUser(profile: GoogleProfile, tokens: GoogleTokens) {
    try {
      // Check if user exists
      let user = await prisma.users.findUnique({
        where: { email: profile.email },
        include: { google_account: true },
      });

      if (user && !user.google_account) {
        // User exists but no Google account linked
        return { user, isNew: false, linkedGoogle: false };
      }

      if (!user) {
        // Create new user
        user = await prisma.users.create({
          data: {
            email: profile.email,
            name: profile.name,
            avatar: profile.picture,
            username: profile.email.split('@')[0],
            userStatus: 'ACTIVE',
            userLanguage: (profile.locale?.split('-')[0] || 'en') as any,
          },
        });
      }

      // Create or update Google account
      const googleAccount = await prisma.google_Accounts.upsert({
        where: { user_id: user.id },
        update: {
          google_id: profile.id,
          google_email: profile.email,
          name: profile.name,
          picture: profile.picture,
          given_name: profile.given_name,
          family_name: profile.family_name,
          verified_email: profile.verified_email,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_expires_at: new Date(Date.now() + tokens.expires_in * 1000),
          is_active: true,
        },
        create: {
          user_id: user.id,
          google_id: profile.id,
          google_email: profile.email,
          name: profile.name,
          picture: profile.picture,
          given_name: profile.given_name,
          family_name: profile.family_name,
          verified_email: profile.verified_email,
          locale: profile.locale,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_expires_at: new Date(Date.now() + tokens.expires_in * 1000),
        },
      });

      return { user, googleAccount, isNew: !user.id, linkedGoogle: true };
    } catch (error) {
      console.error('Failed to create/update user:', error);
      throw new Error('Failed to process user authentication');
    }
  }

  /**
   * Refresh Google access token
   */
  async refreshAccessToken(refreshToken: string): Promise<GoogleTokens> {
    try {
      this.oauth2Client.setCredentials({
        refresh_token: refreshToken,
      });

      const { credentials } = await this.oauth2Client.refreshAccessToken();

      return {
        access_token: credentials.access_token,
        refresh_token: credentials.refresh_token,
        expires_in: credentials.expiry_date ? Math.floor((credentials.expiry_date - Date.now()) / 1000) : 3600,
        token_type: 'Bearer',
      };
    } catch (error) {
      console.error('Failed to refresh token:', error);
      throw new Error('Token refresh failed');
    }
  }

  /**
   * Revoke Google access token
   */
  async revokeToken(token: string): Promise<boolean> {
    try {
      await this.oauth2Client.revokeToken(token);
      return true;
    } catch (error) {
      console.error('Failed to revoke token:', error);
      return false;
    }
  }
}

export const googleAuthService = new GoogleAuthService();
