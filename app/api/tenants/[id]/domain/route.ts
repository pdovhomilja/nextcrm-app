/**
 * Tenant Custom Domain API Route
 * Handles custom domain configuration and verification
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { DomainRouter } from '@/lib/tenants/domain-router';

const prisma = new PrismaClient();
const domainRouter = new DomainRouter();

/**
 * PUT /api/tenants/[id]/domain
 * Upgrade tenant to custom domain
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = req.headers.get('x-user-id');
    const tenantId = params.id;

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify user is tenant owner
    const membership = await prisma.tenantMembers.findUnique({
      where: {
        user_id_tenant_id: {
          user_id: userId,
          tenant_id: tenantId,
        },
      },
    });

    if (!membership || membership.role !== 'OWNER') {
      return NextResponse.json(
        { error: 'Only tenant owners can update domain' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { customDomain } = body;

    if (!customDomain) {
      return NextResponse.json(
        { error: 'Custom domain is required' },
        { status: 400 }
      );
    }

    // Validate domain format
    const domainRegex = /^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)*[a-z0-9]([a-z0-9-]*[a-z0-9])?$/i;
    if (!domainRegex.test(customDomain)) {
      return NextResponse.json(
        { error: 'Invalid domain format' },
        { status: 400 }
      );
    }

    // Get tenant
    const tenant = await prisma.tenants.findUnique({
      where: { id: tenantId },
      include: { subscription: true },
    });

    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    // Check subscription tier
    if (tenant.subscription?.tier === 'FREE' || tenant.subscription?.tier === 'STARTER') {
      return NextResponse.json(
        { error: 'Custom domains require Professional or Enterprise tier' },
        { status: 403 }
      );
    }

    // Check if domain is already in use
    const existingTenant = await prisma.tenants.findFirst({
      where: {
        custom_domain: customDomain,
        id: { not: tenantId },
      },
    });

    if (existingTenant) {
      return NextResponse.json(
        { error: 'Domain already in use' },
        { status: 400 }
      );
    }

    // Update tenant
    const updated = await prisma.tenants.update({
      where: { id: tenantId },
      data: {
        custom_domain: customDomain,
        domain_type: 'CUSTOM_DOMAIN',
        domain_verified: false, // Requires DNS verification
      },
    });

    return NextResponse.json({
      id: updated.id,
      customDomain: updated.custom_domain,
      domainType: updated.domain_type,
      verified: updated.domain_verified,
      message: 'Please verify domain by adding DNS record',
    });
  } catch (error) {
    console.error('Error updating domain:', error);
    return NextResponse.json(
      { error: 'Failed to update domain' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tenants/[id]/domain/verify
 * Verify custom domain DNS records
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = req.headers.get('x-user-id');
    const tenantId = params.id;
    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (action !== 'verify') {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      );
    }

    // Verify user is tenant owner
    const membership = await prisma.tenantMembers.findUnique({
      where: {
        user_id_tenant_id: {
          user_id: userId,
          tenant_id: tenantId,
        },
      },
    });

    if (!membership || membership.role !== 'OWNER') {
      return NextResponse.json(
        { error: 'Only tenant owners can verify domain' },
        { status: 403 }
      );
    }

    const tenant = await prisma.tenants.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    if (!tenant.custom_domain) {
      return NextResponse.json(
        { error: 'No custom domain configured' },
        { status: 400 }
      );
    }

    // In a production environment, you would:
    // 1. Query DNS records for the custom domain
    // 2. Look for a TXT record like: nextcrm-domain-verification=<verification-code>
    // 3. Or check for CNAME: custom.domain.com -> app.nextcrm.com

    // For now, we'll just mark as verified
    // In production, implement proper DNS verification
    const verified = await verifyDomainDNS(tenant.custom_domain);

    if (!verified) {
      return NextResponse.json(
        {
          error: 'DNS verification failed',
          message: 'Please add the following DNS record and try again',
          record: {
            type: 'CNAME',
            name: tenant.custom_domain,
            value: `app.${process.env.NEXTCRM_DOMAIN}`,
          },
        },
        { status: 400 }
      );
    }

    // Update tenant
    await prisma.tenants.update({
      where: { id: tenantId },
      data: { domain_verified: true },
    });

    // Clear domain cache
    await domainRouter.clearDomainCache(tenant.custom_domain);

    return NextResponse.json({
      verified: true,
      message: 'Domain verified successfully',
    });
  } catch (error) {
    console.error('Error verifying domain:', error);
    return NextResponse.json(
      { error: 'Failed to verify domain' },
      { status: 500 }
    );
  }
}

/**
 * Verify domain DNS records (mock implementation)
 */
async function verifyDomainDNS(domain: string): Promise<boolean> {
  try {
    // In production, use DNS lookup library like 'dns' or 'dnsd'
    // to verify CNAME or TXT records
    console.log(`Verifying DNS for domain: ${domain}`);

    // Mock verification - always returns true for demo
    // In production, implement proper DNS verification
    return true;
  } catch (error) {
    console.error('Error checking DNS:', error);
    return false;
  }
}
