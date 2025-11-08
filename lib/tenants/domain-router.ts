/**
 * Multi-Tenant Domain Router
 * Routes requests to appropriate tenant based on subdomain or custom domain
 * Handles subscription tier based routing (free/starter = subdomain, enterprise = custom domain)
 */

import { PrismaClient } from '@prisma/client';
import { redisService } from '../cache/redis';

const prisma = new PrismaClient();

interface TenantContext {
  tenantId: string;
  slug: string;
  companyName: string;
  domain: string;
  domainType: 'SUBDOMAIN' | 'CUSTOM_DOMAIN';
  tier: 'FREE' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';
  isVerified: boolean;
  settings: {
    theme: string;
    language: string;
    timezone: string;
  };
}

export class DomainRouter {
  /**
   * Extract tenant from request
   * Supports both subdomain (company.app.nextcrm.com) and custom domain (company.com)
   */
  async getTenantFromHost(host: string): Promise<TenantContext | null> {
    // Remove port if present
    const hostname = host.split(':')[0];

    // Check cache first
    const cached = await redisService.get<TenantContext>(`tenant:domain:${hostname}`);
    if (cached) {
      return cached;
    }

    try {
      // Check for subdomain (company.app.nextcrm.com)
      const subdomainMatch = hostname.match(/^([a-z0-9-]+)\./);
      if (subdomainMatch) {
        const subdomain = subdomainMatch[1];

        // Skip if it's the main app domain
        if (!['app', 'www', 'api', 'admin', 'dashboard'].includes(subdomain)) {
          const tenant = await prisma.tenants.findUnique({
            where: { subdomain },
            include: { settings: true },
          });

          if (tenant) {
            const context = this.buildTenantContext(tenant);
            await redisService.set(`tenant:domain:${hostname}`, context, 3600);
            return context;
          }
        }
      }

      // Check for custom domain (company.com)
      const tenant = await prisma.tenants.findUnique({
        where: { custom_domain: hostname },
        include: { settings: true },
      });

      if (tenant) {
        const context = this.buildTenantContext(tenant);
        await redisService.set(`tenant:domain:${hostname}`, context, 3600);
        return context;
      }

      return null;
    } catch (error) {
      console.error('Error finding tenant from host:', error);
      return null;
    }
  }

  /**
   * Build tenant context from database record
   */
  private buildTenantContext(tenant: any): TenantContext {
    return {
      tenantId: tenant.id,
      slug: tenant.slug,
      companyName: tenant.company_name,
      domain: tenant.custom_domain || tenant.subdomain || '',
      domainType: tenant.domain_type,
      tier: tenant.subscription_tier,
      isVerified: tenant.is_verified,
      settings: {
        theme: tenant.settings?.theme || 'light',
        language: tenant.settings?.language || 'en',
        timezone: tenant.settings?.timezone || 'UTC',
      },
    };
  }

  /**
   * Create new tenant with appropriate domain based on subscription tier
   */
  async createTenant(
    companyName: string,
    slug: string,
    tier: 'FREE' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE',
    customDomain?: string,
    ownerId?: string
  ): Promise<TenantContext> {
    try {
      const subscriptionPlan = await prisma.subscription_Plans.findUnique({
        where: { name: tier },
      });

      if (!subscriptionPlan) {
        throw new Error(`Subscription tier ${tier} not found`);
      }

      // Determine domain configuration based on tier
      let domainType: 'SUBDOMAIN' | 'CUSTOM_DOMAIN' = 'SUBDOMAIN';
      let finalCustomDomain: string | null = null;

      if (tier === 'ENTERPRISE' && customDomain) {
        if (!this.isValidDomain(customDomain)) {
          throw new Error('Invalid custom domain');
        }
        domainType = 'CUSTOM_DOMAIN';
        finalCustomDomain = customDomain;
      }

      // Generate subdomain from slug if not using custom domain
      const subdomain = domainType === 'SUBDOMAIN' ? slug : null;

      // Check subdomain availability
      if (subdomain) {
        const existing = await prisma.tenants.findUnique({
          where: { subdomain },
        });
        if (existing) {
          throw new Error('Subdomain already taken');
        }
      }

      // Check custom domain availability
      if (finalCustomDomain) {
        const existing = await prisma.tenants.findUnique({
          where: { custom_domain: finalCustomDomain },
        });
        if (existing) {
          throw new Error('Custom domain already taken');
        }
      }

      const tenant = await prisma.tenants.create({
        data: {
          company_name: companyName,
          slug,
          subdomain,
          custom_domain: finalCustomDomain,
          domain_type: domainType,
          subscription_tier: tier,
          subscription_plan_id: subscriptionPlan.id,
          owner_id: ownerId,
          settings: {
            create: {
              theme: 'light',
              language: 'en',
              timezone: 'UTC',
              enable_redis: true,
              enable_vectordb: tier !== 'FREE',
              enable_elasticsearch: tier === 'ENTERPRISE',
              enable_ai_features: tier === 'PROFESSIONAL' || tier === 'ENTERPRISE',
            },
          },
        },
        include: { settings: true },
      });

      const context = this.buildTenantContext(tenant);

      // Cache the new tenant
      const domain = finalCustomDomain || `${subdomain}.app.nextcrm.com`;
      await redisService.set(`tenant:domain:${domain}`, context, 3600);

      return context;
    } catch (error) {
      console.error('Error creating tenant:', error);
      throw error;
    }
  }

  /**
   * Upgrade tenant to use custom domain
   */
  async upgradeToCustomDomain(tenantId: string, customDomain: string): Promise<TenantContext> {
    try {
      if (!this.isValidDomain(customDomain)) {
        throw new Error('Invalid custom domain');
      }

      // Check domain availability
      const existing = await prisma.tenants.findUnique({
        where: { custom_domain: customDomain },
      });
      if (existing && existing.id !== tenantId) {
        throw new Error('Custom domain already taken');
      }

      const tenant = await prisma.tenants.update({
        where: { id: tenantId },
        data: {
          custom_domain: customDomain,
          domain_type: 'CUSTOM_DOMAIN',
          is_verified: false, // Requires DNS verification
        },
        include: { settings: true },
      });

      // Clear old cache entries
      const oldTenant = await prisma.tenants.findUnique({
        where: { id: tenantId },
      });
      if (oldTenant?.subdomain) {
        await redisService.delete(`tenant:domain:${oldTenant.subdomain}.app.nextcrm.com`);
      }

      const context = this.buildTenantContext(tenant);
      await redisService.set(`tenant:domain:${customDomain}`, context, 3600);

      return context;
    } catch (error) {
      console.error('Error upgrading to custom domain:', error);
      throw error;
    }
  }

  /**
   * Validate domain format
   */
  private isValidDomain(domain: string): boolean {
    const domainRegex = /^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)*[a-z0-9]([a-z0-9-]*[a-z0-9])?$/i;
    return domainRegex.test(domain) && domain.length <= 255;
  }

  /**
   * Verify custom domain DNS records
   */
  async verifyCustomDomain(tenantId: string, domain: string): Promise<boolean> {
    try {
      // In production, check actual DNS records
      // For now, mark as verified
      const tenant = await prisma.tenants.update({
        where: { id: tenantId },
        data: { is_verified: true },
      });

      // Clear cache
      await redisService.delete(`tenant:domain:${domain}`);

      return true;
    } catch (error) {
      console.error('Error verifying domain:', error);
      return false;
    }
  }

  /**
   * Get all tenants for a user
   */
  async getUserTenants(userId: string): Promise<TenantContext[]> {
    try {
      const memberships = await prisma.tenantMembers.findMany({
        where: { user_id: userId },
        include: {
          tenant: {
            include: { settings: true },
          },
        },
      });

      return memberships.map((m) => this.buildTenantContext(m.tenant));
    } catch (error) {
      console.error('Error getting user tenants:', error);
      return [];
    }
  }
}

export const domainRouter = new DomainRouter();
