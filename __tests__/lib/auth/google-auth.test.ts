/**
 * Google Auth Service Tests
 */

import { GoogleAuthService } from '@/lib/auth/google-auth';

describe('GoogleAuthService', () => {
  let service: GoogleAuthService;

  beforeEach(() => {
    process.env.GOOGLE_CLIENT_ID = 'test-client-id';
    process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
    service = new GoogleAuthService();
  });

  describe('getAuthUrl', () => {
    it('should generate OAuth URL with state parameter', () => {
      const redirectUri = 'http://localhost:3000/api/auth/google/callback';
      const authUrl = service.getAuthUrl(redirectUri);

      expect(authUrl).toContain('https://accounts.google.com/o/oauth2/v2/auth');
      expect(authUrl).toContain('client_id=test-client-id');
      expect(authUrl).toContain('redirect_uri=' + encodeURIComponent(redirectUri));
      expect(authUrl).toContain('response_type=code');
      expect(authUrl).toContain('scope=');
      expect(authUrl).toContain('state=');
    });

    it('should include profile and email scopes', () => {
      const redirectUri = 'http://localhost:3000/api/auth/google/callback';
      const authUrl = service.getAuthUrl(redirectUri);

      expect(authUrl).toContain('openid');
      expect(authUrl).toContain('profile');
      expect(authUrl).toContain('email');
    });
  });

  describe('error handling', () => {
    it('should throw error if required environment variables are missing', () => {
      delete process.env.GOOGLE_CLIENT_ID;
      expect(() => {
        new GoogleAuthService();
      }).toThrow();
    });
  });
});
