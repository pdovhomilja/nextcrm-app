/**
 * Multi-Tenant Middleware
 * Extracts tenant information from request and injects into context
 */

import { NextRequest, NextResponse } from 'next/server';
import { DomainRouter } from '@/lib/tenants/domain-router';

const domainRouter = new DomainRouter();

export interface TenantContext {
  tenantId: string;
  slug: string;
  companyName: string;
  domain: string;
  domainType: 'SUBDOMAIN' | 'CUSTOM_DOMAIN';
  tier: 'FREE' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';
  isVerified: boolean;
  settings: {
    redisEnabled: boolean;
    vectordbEnabled: boolean;
    elasticsearchEnabled: boolean;
    aiEnabled: boolean;
    maxUsers: number;
    maxStorage: number;
    apiRateLimit: number;
  };
}

/**
 * Tenant middleware for Next.js
 * Should be used in middleware.ts
 */
export async function tenantMiddleware(
  req: NextRequest,
  pathname: string
): Promise<{ response?: NextResponse; context?: TenantContext }> {
  try {
    // Skip tenant extraction for public routes
    if (isPublicRoute(pathname)) {
      return {};
    }

    const host = req.headers.get('host') || '';

    // Extract tenant from host
    const tenant = await domainRouter.getTenantFromHost(host);

    if (!tenant) {
      // If no tenant found and it's not a public route, redirect to setup
      return {
        response: NextResponse.redirect(new URL('/setup', req.url)),
      };
    }

    return {
      context: tenant as TenantContext,
    };
  } catch (error) {
    console.error('Error in tenant middleware:', error);
    return {};
  }
}

/**
 * Check if route is public (doesn't require tenant context)
 */
function isPublicRoute(pathname: string): boolean {
  const publicRoutes = [
    '/auth/login',
    '/auth/logout',
    '/auth/google/callback',
    '/api/auth/',
    '/setup',
    '/health',
    '/api/health',
  ];

  return publicRoutes.some((route) => pathname.startsWith(route));
}

/**
 * Add tenant context to request headers
 */
export function addTenantContextToHeaders(
  headers: Headers,
  context: TenantContext
): void {
  headers.set('x-tenant-id', context.tenantId);
  headers.set('x-tenant-slug', context.slug);
  headers.set('x-tenant-tier', context.tier);
  headers.set('x-tenant-domain-type', context.domainType);
}

/**
 * Get tenant context from request headers
 */
export function getTenantContextFromHeaders(
  headers: Headers
): Partial<TenantContext> {
  return {
    tenantId: headers.get('x-tenant-id') || undefined,
    slug: headers.get('x-tenant-slug') || undefined,
    tier: (headers.get('x-tenant-tier') as any) || undefined,
    domainType: (headers.get('x-tenant-domain-type') as any) || undefined,
  };
}

/**
 * Verify user has access to tenant
 */
export async function verifyTenantAccess(
  userId: string,
  tenantId: string
): Promise<boolean> {
  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    const membership = await prisma.tenantMembers.findUnique({
      where: {
        user_id_tenant_id: {
          user_id: userId,
          tenant_id: tenantId,
        },
      },
    });

    await prisma.$disconnect();
    return !!membership;
  } catch (error) {
    console.error('Error verifying tenant access:', error);
    return false;
  }
}
