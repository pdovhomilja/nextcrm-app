/**
 * Tenants API Route
 * Handles tenant CRUD operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getTenantContextFromHeaders } from '@/lib/middleware/tenant-middleware';
import { DomainRouter } from '@/lib/tenants/domain-router';

const prisma = new PrismaClient();
const domainRouter = new DomainRouter();

/**
 * GET /api/tenants
 * List all tenants for current user
 */
export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const tenants = await prisma.tenantMembers.findMany({
      where: { user_id: userId },
      include: {
        tenant: {
          include: {
            subscription: {
              select: {
                tier: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      tenants: tenants.map((tm) => ({
        id: tm.tenant.id,
        slug: tm.tenant.slug,
        companyName: tm.tenant.company_name,
        domain: tm.tenant.domain_type === 'CUSTOM_DOMAIN'
          ? tm.tenant.custom_domain
          : `${tm.tenant.subdomain}.${process.env.NEXTCRM_DOMAIN}`,
        domainType: tm.tenant.domain_type,
        tier: tm.tenant.subscription?.tier,
        role: tm.role,
        isActive: tm.tenant.is_active,
      })),
    });
  } catch (error) {
    console.error('Error fetching tenants:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tenants' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tenants
 * Create new tenant
 */
export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { companyName, slug, tier = 'FREE' } = body;

    if (!companyName || !slug) {
      return NextResponse.json(
        { error: 'Company name and slug are required' },
        { status: 400 }
      );
    }

    // Check if slug is available
    const existingTenant = await prisma.tenants.findUnique({
      where: { slug },
    });

    if (existingTenant) {
      return NextResponse.json(
        { error: 'Slug already in use' },
        { status: 400 }
      );
    }

    // Create tenant
    const tenant = await prisma.tenants.create({
      data: {
        company_name: companyName,
        slug,
        subdomain: slug.toLowerCase().replace(/\s+/g, '-'),
        domain_type: 'SUBDOMAIN',
        is_active: true,
        subscription: {
          create: {
            tier,
          },
        },
      },
    });

    // Create tenant settings
    await prisma.tenantSettings.create({
      data: {
        tenant_id: tenant.id,
        redis_enabled: tier !== 'FREE',
        vectordb_enabled: tier === 'PROFESSIONAL' || tier === 'ENTERPRISE',
        elasticsearch_enabled: tier === 'ENTERPRISE',
        ai_enabled: tier === 'PROFESSIONAL' || tier === 'ENTERPRISE',
      },
    });

    // Add user as tenant owner
    await prisma.tenantMembers.create({
      data: {
        tenant_id: tenant.id,
        user_id: userId,
        role: 'OWNER',
      },
    });

    return NextResponse.json(
      {
        id: tenant.id,
        companyName: tenant.company_name,
        slug: tenant.slug,
        domain: `${tenant.subdomain}.${process.env.NEXTCRM_DOMAIN}`,
        domainType: tenant.domain_type,
        tier,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating tenant:', error);
    return NextResponse.json(
      { error: 'Failed to create tenant' },
      { status: 500 }
    );
  }
}
