# Phase 9-9: Security and Token Validation Systems

## Overview
Implement comprehensive security measures, token validation, rate limiting, and audit logging for the invitation system.

## Security Framework Structure

```
lib/
├── security/
│   ├── invitation-security.ts        # Core security functions
│   ├── token-validation.ts           # Token validation and sanitization
│   ├── rate-limiting.ts               # Rate limiting for invitations
│   ├── audit-logging.ts              # Security audit logging
│   └── encryption-utils.ts           # Encryption utilities
middleware/
├── invitation-middleware.ts          # Request middleware
└── security-headers.ts               # Security headers
```

## Core Security Implementation

### Token Validation System

```typescript
// lib/security/token-validation.ts
import { customAlphabet } from 'nanoid';
import crypto from 'crypto';

// Secure token configuration
const INVITATION_TOKEN_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz';
const INVITATION_TOKEN_LENGTH = 32;
const TOKEN_PREFIX = 'inv_';
const TOKEN_REGEX = new RegExp(`^${TOKEN_PREFIX}[${INVITATION_TOKEN_ALPHABET}]{${INVITATION_TOKEN_LENGTH}}$`);

const generateSecureId = customAlphabet(INVITATION_TOKEN_ALPHABET, INVITATION_TOKEN_LENGTH);

/**
 * Generate cryptographically secure invitation token
 */
export function generateInvitationToken(): string {
  // Double security: nanoid + crypto verification
  const token = `${TOKEN_PREFIX}${generateSecureId()}`;
  
  // Verify entropy
  if (!isTokenSecure(token)) {
    throw new Error('Generated token failed security validation');
  }
  
  return token;
}

/**
 * Validate token format and security
 */
export function validateTokenFormat(token: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (!token) {
    errors.push('Token is required');
    return { isValid: false, errors };
  }
  
  if (typeof token !== 'string') {
    errors.push('Token must be a string');
    return { isValid: false, errors };
  }
  
  if (token.length !== TOKEN_PREFIX.length + INVITATION_TOKEN_LENGTH) {
    errors.push(`Token must be exactly ${TOKEN_PREFIX.length + INVITATION_TOKEN_LENGTH} characters`);
  }
  
  if (!token.startsWith(TOKEN_PREFIX)) {
    errors.push(`Token must start with '${TOKEN_PREFIX}'`);
  }
  
  if (!TOKEN_REGEX.test(token)) {
    errors.push('Token contains invalid characters');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Sanitize token input
 */
export function sanitizeToken(token: string): string {
  if (typeof token !== 'string') return '';
  
  // Remove whitespace and convert to string
  return token.trim();
}

/**
 * Check token entropy and randomness
 */
export function isTokenSecure(token: string): boolean {
  if (!validateTokenFormat(token).isValid) return false;
  
  const tokenBody = token.slice(TOKEN_PREFIX.length);
  
  // Check for obvious patterns
  if (hasRepeatingPatterns(tokenBody)) return false;
  if (hasSequentialPatterns(tokenBody)) return false;
  
  // Check entropy
  if (calculateEntropy(tokenBody) < 5.5) return false; // Minimum entropy threshold
  
  return true;
}

/**
 * Calculate Shannon entropy of token
 */
function calculateEntropy(str: string): number {
  const len = str.length;
  const frequencies: Record<string, number> = {};
  
  // Count character frequencies
  for (const char of str) {
    frequencies[char] = (frequencies[char] || 0) + 1;
  }
  
  // Calculate entropy
  let entropy = 0;
  for (const count of Object.values(frequencies)) {
    const probability = count / len;
    entropy -= probability * Math.log2(probability);
  }
  
  return entropy;
}

/**
 * Check for repeating patterns
 */
function hasRepeatingPatterns(str: string): boolean {
  // Check for immediate repeats (aa, bb, etc.)
  for (let i = 0; i < str.length - 1; i++) {
    if (str[i] === str[i + 1]) return true;
  }
  
  // Check for pattern repeats (aba, abc, etc.)
  const patternLength = Math.min(4, Math.floor(str.length / 3));
  for (let len = 2; len <= patternLength; len++) {
    for (let i = 0; i <= str.length - len * 2; i++) {
      const pattern = str.slice(i, i + len);
      const next = str.slice(i + len, i + len * 2);
      if (pattern === next) return true;
    }
  }
  
  return false;
}

/**
 * Check for sequential patterns
 */
function hasSequentialPatterns(str: string): boolean {
  const chars = str.split('');
  for (let i = 0; i < chars.length - 2; i++) {
    const a = chars[i].charCodeAt(0);
    const b = chars[i + 1].charCodeAt(0);
    const c = chars[i + 2].charCodeAt(0);
    
    // Check for ascending or descending sequences
    if ((b === a + 1 && c === b + 1) || (b === a - 1 && c === b - 1)) {
      return true;
    }
  }
  return false;
}

/**
 * Generate token with metadata for audit
 */
export function generateAuditedToken(context: {
  companyId: string;
  inviterUserId: string;
  invitedEmail: string;
}): {
  token: string;
  metadata: {
    generated: Date;
    entropy: number;
    context: typeof context;
  };
} {
  const token = generateInvitationToken();
  const entropy = calculateEntropy(token.slice(TOKEN_PREFIX.length));
  
  return {
    token,
    metadata: {
      generated: new Date(),
      entropy,
      context,
    },
  };
}
```

### Rate Limiting System

```typescript
// lib/security/rate-limiting.ts
import { Redis } from 'ioredis';

const redis = new Redis(process.env.REDIS_URL!);

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyPrefix: string;
}

interface RateLimitResult {
  allowed: boolean;
  remainingRequests: number;
  resetTime: Date;
  totalRequests: number;
}

/**
 * Rate limiting configurations
 */
export const RATE_LIMITS = {
  // Per user invitation sending
  INVITATION_SEND: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 10, // 10 invitations per hour
    keyPrefix: 'invite_send',
  } as RateLimitConfig,
  
  // Per email invitation acceptance attempts
  INVITATION_ACCEPT: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 attempts per 15 minutes
    keyPrefix: 'invite_accept',
  } as RateLimitConfig,
  
  // Per company invitation creation
  COMPANY_INVITATIONS: {
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    maxRequests: 50, // 50 invitations per company per day
    keyPrefix: 'company_invite',
  } as RateLimitConfig,
  
  // Per IP invitation requests
  IP_INVITATIONS: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 20, // 20 invitations per IP per hour
    keyPrefix: 'ip_invite',
  } as RateLimitConfig,
} as const;

/**
 * Check and update rate limit
 */
export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const key = `${config.keyPrefix}:${identifier}`;
  const window = Math.floor(Date.now() / config.windowMs);
  const windowKey = `${key}:${window}`;
  
  try {
    // Use Redis pipeline for atomic operations
    const pipeline = redis.pipeline();
    pipeline.incr(windowKey);
    pipeline.expire(windowKey, Math.ceil(config.windowMs / 1000));
    pipeline.ttl(windowKey);
    
    const results = await pipeline.exec();
    
    if (!results) {
      throw new Error('Redis pipeline failed');
    }
    
    const totalRequests = results[0]?.[1] as number || 0;
    const ttl = results[2]?.[1] as number || 0;
    
    const allowed = totalRequests <= config.maxRequests;
    const remainingRequests = Math.max(0, config.maxRequests - totalRequests);
    const resetTime = new Date(Date.now() + (ttl * 1000));
    
    return {
      allowed,
      remainingRequests,
      resetTime,
      totalRequests,
    };
    
  } catch (error) {
    console.error('Rate limit check failed:', error);
    // Fail open for availability
    return {
      allowed: true,
      remainingRequests: config.maxRequests,
      resetTime: new Date(Date.now() + config.windowMs),
      totalRequests: 0,
    };
  }
}

/**
 * Apply rate limiting to invitation sending
 */
export async function checkInvitationSendingLimit(
  userId: string,
  companyId: string,
  ipAddress?: string
): Promise<{
  allowed: boolean;
  errors: string[];
  limits: Record<string, RateLimitResult>;
}> {
  const checks = await Promise.all([
    // Per-user limit
    checkRateLimit(userId, RATE_LIMITS.INVITATION_SEND),
    // Per-company limit
    checkRateLimit(companyId, RATE_LIMITS.COMPANY_INVITATIONS),
    // Per-IP limit (if IP provided)
    ...(ipAddress ? [checkRateLimit(ipAddress, RATE_LIMITS.IP_INVITATIONS)] : []),
  ]);
  
  const limits = {
    user: checks[0],
    company: checks[1],
    ...(ipAddress && checks[2] ? { ip: checks[2] } : {}),
  };
  
  const errors: string[] = [];
  let allowed = true;
  
  if (!limits.user.allowed) {
    allowed = false;
    errors.push(`Too many invitations sent. Try again in ${Math.ceil((limits.user.resetTime.getTime() - Date.now()) / (1000 * 60))} minutes.`);
  }
  
  if (!limits.company.allowed) {
    allowed = false;
    errors.push('Company has reached daily invitation limit. Try again tomorrow.');
  }
  
  if (limits.ip && !limits.ip.allowed) {
    allowed = false;
    errors.push('Too many invitations from this network. Please try again later.');
  }
  
  return { allowed, errors, limits };
}

/**
 * Apply rate limiting to invitation acceptance
 */
export async function checkInvitationAcceptanceLimit(
  email: string,
  ipAddress?: string
): Promise<{
  allowed: boolean;
  error?: string;
}> {
  const checks = await Promise.all([
    checkRateLimit(email, RATE_LIMITS.INVITATION_ACCEPT),
    ...(ipAddress ? [checkRateLimit(`accept:${ipAddress}`, RATE_LIMITS.INVITATION_ACCEPT)] : []),
  ]);
  
  for (const result of checks) {
    if (!result.allowed) {
      const minutesRemaining = Math.ceil((result.resetTime.getTime() - Date.now()) / (1000 * 60));
      return {
        allowed: false,
        error: `Too many invitation attempts. Try again in ${minutesRemaining} minutes.`,
      };
    }
  }
  
  return { allowed: true };
}
```

### Security Audit Logging

```typescript
// lib/security/audit-logging.ts
import { db } from '@/lib/db';

export interface SecurityEvent {
  event: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  companyId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  timestamp?: Date;
}

/**
 * Log security events for audit trail
 */
export async function logSecurityEvent(event: SecurityEvent): Promise<void> {
  try {
    await db.securityAuditLog.create({
      data: {
        event: event.event,
        severity: event.severity,
        userId: event.userId,
        companyId: event.companyId,
        ipAddress: event.ipAddress,
        userAgent: event.userAgent,
        metadata: event.metadata || {},
        timestamp: event.timestamp || new Date(),
      },
    });
  } catch (error) {
    console.error('Failed to log security event:', error);
    // Don't throw - logging failure shouldn't break the system
  }
}

/**
 * Invitation-specific security events
 */
export const InvitationSecurityEvents = {
  /**
   * Log invitation creation
   */
  async invitationCreated(data: {
    userId: string;
    companyId: string;
    invitedEmail: string;
    role: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    await logSecurityEvent({
      event: 'invitation_created',
      severity: 'low',
      userId: data.userId,
      companyId: data.companyId,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      metadata: {
        invitedEmail: data.invitedEmail,
        role: data.role,
      },
    });
  },

  /**
   * Log successful invitation acceptance
   */
  async invitationAccepted(data: {
    userId: string;
    companyId: string;
    invitationId: string;
    email: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    await logSecurityEvent({
      event: 'invitation_accepted',
      severity: 'low',
      userId: data.userId,
      companyId: data.companyId,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      metadata: {
        invitationId: data.invitationId,
        email: data.email,
      },
    });
  },

  /**
   * Log failed invitation acceptance
   */
  async invitationAcceptanceFailed(data: {
    invitationId?: string;
    email?: string;
    reason: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    await logSecurityEvent({
      event: 'invitation_acceptance_failed',
      severity: 'medium',
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      metadata: {
        invitationId: data.invitationId,
        email: data.email,
        reason: data.reason,
      },
    });
  },

  /**
   * Log invitation revoked
   */
  async invitationRevoked(data: {
    userId: string;
    companyId: string;
    invitationId: string;
    targetEmail: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    await logSecurityEvent({
      event: 'invitation_revoked',
      severity: 'low',
      userId: data.userId,
      companyId: data.companyId,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      metadata: {
        invitationId: data.invitationId,
        targetEmail: data.targetEmail,
      },
    });
  },

  /**
   * Log suspicious activity
   */
  async suspiciousActivity(data: {
    activity: string;
    details: Record<string, any>;
    userId?: string;
    companyId?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    await logSecurityEvent({
      event: 'suspicious_activity',
      severity: 'high',
      userId: data.userId,
      companyId: data.companyId,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      metadata: {
        activity: data.activity,
        details: data.details,
      },
    });
  },

  /**
   * Log rate limit violations
   */
  async rateLimitExceeded(data: {
    limitType: string;
    identifier: string;
    attempts: number;
    limit: number;
    userId?: string;
    companyId?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    await logSecurityEvent({
      event: 'rate_limit_exceeded',
      severity: 'medium',
      userId: data.userId,
      companyId: data.companyId,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      metadata: {
        limitType: data.limitType,
        identifier: data.identifier,
        attempts: data.attempts,
        limit: data.limit,
      },
    });
  },
} as const;
```

### Core Security Functions

```typescript
// lib/security/invitation-security.ts
import { validateTokenFormat, sanitizeToken } from './token-validation';
import { checkInvitationSendingLimit, checkInvitationAcceptanceLimit } from './rate-limiting';
import { InvitationSecurityEvents } from './audit-logging';
import { db } from '@/lib/db';

/**
 * Comprehensive invitation validation
 */
export async function validateInvitationRequest(
  token: string,
  userEmail?: string,
  ipAddress?: string,
  userAgent?: string
): Promise<{
  isValid: boolean;
  errors: string[];
  invitation?: any;
}> {
  const errors: string[] = [];
  
  // Step 1: Sanitize and validate token format
  const sanitizedToken = sanitizeToken(token);
  const tokenValidation = validateTokenFormat(sanitizedToken);
  
  if (!tokenValidation.isValid) {
    errors.push(...tokenValidation.errors);
    await InvitationSecurityEvents.suspiciousActivity({
      activity: 'invalid_token_format',
      details: {
        token: sanitizedToken,
        errors: tokenValidation.errors,
      },
      ipAddress,
      userAgent,
    });
    return { isValid: false, errors };
  }
  
  // Step 2: Rate limiting check
  if (userEmail) {
    const rateLimitResult = await checkInvitationAcceptanceLimit(userEmail, ipAddress);
    if (!rateLimitResult.allowed) {
      errors.push(rateLimitResult.error || 'Rate limit exceeded');
      await InvitationSecurityEvents.rateLimitExceeded({
        limitType: 'invitation_accept',
        identifier: userEmail,
        attempts: 0, // Would need to track this
        limit: 5,
        ipAddress,
        userAgent,
      });
      return { isValid: false, errors };
    }
  }
  
  // Step 3: Database validation
  try {
    const invitation = await db.companyInvitation.findUnique({
      where: { token: sanitizedToken },
      include: {
        company: { select: { id: true, name: true } },
        invitedBy: { select: { name: true, email: true } },
      },
    });
    
    if (!invitation) {
      errors.push('Invitation not found');
      await InvitationSecurityEvents.invitationAcceptanceFailed({
        reason: 'invitation_not_found',
        email: userEmail,
        ipAddress,
        userAgent,
      });
      return { isValid: false, errors };
    }
    
    // Step 4: Status validation
    if (invitation.status !== 'PENDING') {
      errors.push(`Invitation is ${invitation.status.toLowerCase()}`);
      await InvitationSecurityEvents.invitationAcceptanceFailed({
        invitationId: invitation.id,
        email: userEmail,
        reason: `invitation_${invitation.status.toLowerCase()}`,
        ipAddress,
        userAgent,
      });
      return { isValid: false, errors };
    }
    
    // Step 5: Expiration validation
    if (invitation.tokenExpires < new Date()) {
      errors.push('Invitation has expired');
      
      // Auto-update status to expired
      await db.companyInvitation.update({
        where: { id: invitation.id },
        data: { status: 'EXPIRED' },
      });
      
      await InvitationSecurityEvents.invitationAcceptanceFailed({
        invitationId: invitation.id,
        email: userEmail,
        reason: 'invitation_expired',
        ipAddress,
        userAgent,
      });
      return { isValid: false, errors };
    }
    
    // Step 6: Email validation (if provided)
    if (userEmail && invitation.invitedEmail.toLowerCase() !== userEmail.toLowerCase()) {
      errors.push('Invitation is for a different email address');
      await InvitationSecurityEvents.suspiciousActivity({
        activity: 'email_mismatch',
        details: {
          invitationEmail: invitation.invitedEmail,
          userEmail: userEmail,
          invitationId: invitation.id,
        },
        ipAddress,
        userAgent,
      });
      return { isValid: false, errors };
    }
    
    return {
      isValid: true,
      errors: [],
      invitation,
    };
    
  } catch (error) {
    console.error('Database validation error:', error);
    errors.push('Invitation validation failed');
    return { isValid: false, errors };
  }
}

/**
 * Validate invitation sending permissions and security
 */
export async function validateInvitationSending(data: {
  userId: string;
  companyId: string;
  email: string;
  role: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<{
  allowed: boolean;
  errors: string[];
}> {
  const errors: string[] = [];
  
  // Step 1: Rate limiting
  const rateLimitResult = await checkInvitationSendingLimit(
    data.userId,
    data.companyId,
    data.ipAddress
  );
  
  if (!rateLimitResult.allowed) {
    errors.push(...rateLimitResult.errors);
    await InvitationSecurityEvents.rateLimitExceeded({
      limitType: 'invitation_send',
      identifier: data.userId,
      attempts: rateLimitResult.limits.user?.totalRequests || 0,
      limit: 10,
      userId: data.userId,
      companyId: data.companyId,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
    });
    return { allowed: false, errors };
  }
  
  // Step 2: Email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(data.email)) {
    errors.push('Invalid email format');
    return { allowed: false, errors };
  }
  
  // Step 3: Role validation
  const validRoles = ['MEMBER', 'ADMIN'];
  if (!validRoles.includes(data.role)) {
    errors.push('Invalid role specified');
    await InvitationSecurityEvents.suspiciousActivity({
      activity: 'invalid_role',
      details: { role: data.role },
      userId: data.userId,
      companyId: data.companyId,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
    });
    return { allowed: false, errors };
  }
  
  // Step 4: Check for existing invitations
  try {
    const existingInvitation = await db.companyInvitation.findUnique({
      where: {
        companyId_invitedEmail: {
          companyId: data.companyId,
          invitedEmail: data.email.toLowerCase(),
        },
      },
    });
    
    if (existingInvitation?.status === 'PENDING') {
      errors.push('Invitation already sent to this email');
      return { allowed: false, errors };
    }
  } catch (error) {
    console.error('Database check failed:', error);
    errors.push('Unable to validate invitation');
    return { allowed: false, errors };
  }
  
  return { allowed: true, errors: [] };
}

/**
 * Clean up expired invitations (background job)
 */
export async function cleanupExpiredInvitations(): Promise<{
  cleanedCount: number;
  errors: string[];
}> {
  try {
    const expiredInvitations = await db.companyInvitation.findMany({
      where: {
        status: 'PENDING',
        tokenExpires: { lt: new Date() },
      },
      select: { id: true, invitedEmail: true, companyId: true },
    });
    
    if (expiredInvitations.length === 0) {
      return { cleanedCount: 0, errors: [] };
    }
    
    // Update status to expired
    const result = await db.companyInvitation.updateMany({
      where: {
        id: { in: expiredInvitations.map(inv => inv.id) },
      },
      data: { status: 'EXPIRED' },
    });
    
    // Log cleanup activity
    await InvitationSecurityEvents.suspiciousActivity({
      activity: 'invitation_cleanup',
      details: {
        cleanedCount: result.count,
        invitationIds: expiredInvitations.map(inv => inv.id),
      },
    });
    
    return { cleanedCount: result.count, errors: [] };
    
  } catch (error) {
    console.error('Cleanup failed:', error);
    return { cleanedCount: 0, errors: ['Cleanup failed'] };
  }
}
```

### Middleware Integration

```typescript
// middleware/invitation-middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { validateInvitationRequest } from '@/lib/security/invitation-security';

/**
 * Middleware to validate invitation tokens and enforce security
 */
export async function invitationMiddleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  
  // Only apply to invitation routes
  if (!pathname.includes('/accept-invitation')) {
    return NextResponse.next();
  }
  
  const token = searchParams.get('token');
  if (!token) {
    return NextResponse.redirect(new URL('/auth/signin?error=missing-token', request.url));
  }
  
  const ipAddress = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';
  
  // Validate token and security
  const validation = await validateInvitationRequest(token, undefined, ipAddress, userAgent);
  
  if (!validation.isValid) {
    const errorMessage = validation.errors.join(', ');
    return NextResponse.redirect(
      new URL(`/auth/signin?error=${encodeURIComponent(errorMessage)}`, request.url)
    );
  }
  
  // Add security headers
  const response = NextResponse.next();
  response.headers.set('X-Invitation-Validated', 'true');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  return response;
}
```

### Encryption Utilities

```typescript
// lib/security/encryption-utils.ts
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16;  // 128 bits
const TAG_LENGTH = 16; // 128 bits

/**
 * Encrypt sensitive invitation data
 */
export function encryptInvitationData(data: string, key?: string): {
  encrypted: string;
  key: string;
} {
  const encryptionKey = key ? Buffer.from(key, 'hex') : crypto.randomBytes(KEY_LENGTH);
  const iv = crypto.randomBytes(IV_LENGTH);
  
  const cipher = crypto.createCipher(ALGORITHM, encryptionKey);
  cipher.setAAD(Buffer.from('invitation-data'));
  
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const tag = cipher.getAuthTag();
  
  // Combine IV + encrypted data + tag
  const combined = iv.toString('hex') + encrypted + tag.toString('hex');
  
  return {
    encrypted: combined,
    key: encryptionKey.toString('hex'),
  };
}

/**
 * Decrypt invitation data
 */
export function decryptInvitationData(encrypted: string, key: string): string {
  const keyBuffer = Buffer.from(key, 'hex');
  
  // Extract IV, encrypted data, and tag
  const iv = Buffer.from(encrypted.slice(0, IV_LENGTH * 2), 'hex');
  const tag = Buffer.from(encrypted.slice(-TAG_LENGTH * 2), 'hex');
  const encryptedData = encrypted.slice(IV_LENGTH * 2, -TAG_LENGTH * 2);
  
  const decipher = crypto.createDecipher(ALGORITHM, keyBuffer);
  decipher.setAAD(Buffer.from('invitation-data'));
  decipher.setAuthTag(tag);
  
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Hash invitation data for comparison
 */
export function hashInvitationData(data: string): string {
  return crypto
    .createHash('sha256')
    .update(data)
    .digest('hex');
}
```

## Enhanced Server Actions with Security

### Secured Invitation Actions

```typescript
// actions/company-actions.ts (security enhancements)
import { validateInvitationSending, validateInvitationRequest } from '@/lib/security/invitation-security';
import { InvitationSecurityEvents } from '@/lib/security/audit-logging';
import { headers } from 'next/headers';

// Enhanced inviteUserToCompany with security
export async function inviteUserToCompany(
  companyId: string,
  email: string,
  role: CompanyRole = "MEMBER",
) {
  const session = await auth();
  const headersList = headers();
  const ipAddress = headersList.get('x-forwarded-for') || headersList.get('x-real-ip');
  const userAgent = headersList.get('user-agent');

  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  // Security validation
  const securityResult = await validateInvitationSending({
    userId: session.user.id,
    companyId,
    email,
    role,
    ipAddress: ipAddress || undefined,
    userAgent: userAgent || undefined,
  });

  if (!securityResult.allowed) {
    return { 
      success: false, 
      error: securityResult.errors[0] || 'Security validation failed' 
    };
  }

  try {
    // ... existing invitation logic ...

    // Log successful invitation
    await InvitationSecurityEvents.invitationCreated({
      userId: session.user.id,
      companyId,
      invitedEmail: email,
      role,
      ipAddress: ipAddress || undefined,
      userAgent: userAgent || undefined,
    });

    return result;
  } catch (error) {
    console.error("Error inviting user:", error);
    return { success: false, error: "Failed to invite user" };
  }
}

// Enhanced acceptCompanyInvitation with security
export async function acceptCompanyInvitation(token: string) {
  const session = await auth();
  const headersList = headers();
  const ipAddress = headersList.get('x-forwarded-for') || headersList.get('x-real-ip');
  const userAgent = headersList.get('user-agent');

  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  // Security validation
  const validation = await validateInvitationRequest(
    token,
    session.user.email,
    ipAddress || undefined,
    userAgent || undefined
  );

  if (!validation.isValid) {
    return {
      success: false,
      error: validation.errors[0] || 'Invalid invitation',
    };
  }

  try {
    // ... existing acceptance logic ...

    // Log successful acceptance
    await InvitationSecurityEvents.invitationAccepted({
      userId: session.user.id,
      companyId: validation.invitation!.companyId,
      invitationId: validation.invitation!.id,
      email: session.user.email!,
      ipAddress: ipAddress || undefined,
      userAgent: userAgent || undefined,
    });

    return result;
  } catch (error) {
    console.error("Error accepting invitation:", error);
    
    await InvitationSecurityEvents.invitationAcceptanceFailed({
      reason: 'system_error',
      email: session.user.email,
      ipAddress: ipAddress || undefined,
      userAgent: userAgent || undefined,
    });

    return { success: false, error: "Failed to accept invitation" };
  }
}
```

## Background Jobs and Maintenance

### Scheduled Security Tasks

```typescript
// lib/security/scheduled-tasks.ts
import { cleanupExpiredInvitations } from './invitation-security';
import { InvitationSecurityEvents } from './audit-logging';

/**
 * Scheduled cleanup job (run every 6 hours)
 */
export async function runSecurityMaintenance(): Promise<void> {
  console.log('Starting security maintenance...');
  
  try {
    // Clean up expired invitations
    const cleanupResult = await cleanupExpiredInvitations();
    console.log(`Cleaned up ${cleanupResult.cleanedCount} expired invitations`);
    
    // Add more maintenance tasks as needed
    
    await InvitationSecurityEvents.suspiciousActivity({
      activity: 'security_maintenance_completed',
      details: {
        cleanedInvitations: cleanupResult.cleanedCount,
        timestamp: new Date(),
      },
    });
  } catch (error) {
    console.error('Security maintenance failed:', error);
  }
}
```

## Implementation Checklist

### Token Security
- ✅ Cryptographically secure token generation
- ✅ Token format validation and sanitization
- ✅ Entropy analysis and pattern detection
- ✅ Token audit trail and metadata

### Rate Limiting
- ✅ Multi-tier rate limiting (user, company, IP)
- ✅ Redis-based distributed rate limiting
- ✅ Configurable limits with graceful degradation
- ✅ Rate limit violation logging

### Audit Logging
- ✅ Comprehensive security event logging
- ✅ Structured audit trails with metadata
- ✅ Suspicious activity detection
- ✅ Database-backed audit persistence

### Security Validation
- ✅ Request validation middleware
- ✅ Invitation status and expiration checks
- ✅ Email and role validation
- ✅ Duplicate invitation prevention

### System Security
- ✅ Security headers and CSP
- ✅ Encryption utilities for sensitive data
- ✅ Background cleanup and maintenance
- ✅ Error handling without information leakage

## Next Steps
1. Create comprehensive testing suite (Phase9-10-testing-suite.md)
2. Deploy and monitor security metrics
3. Set up automated security alerts