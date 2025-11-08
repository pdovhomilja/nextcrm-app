/**
 * Segment Analytics Service
 * Provides event tracking and analytics integration
 */

import Analytics from 'analytics-node';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface AnalyticsEvent {
  userId: string;
  event: string;
  properties?: Record<string, any>;
  timestamp?: Date;
  context?: Record<string, any>;
}

interface IdentifyData {
  userId: string;
  traits: Record<string, any>;
  timestamp?: Date;
  context?: Record<string, any>;
}

interface PageViewData {
  userId: string;
  category?: string;
  name: string;
  properties?: Record<string, any>;
  timestamp?: Date;
  context?: Record<string, any>;
}

export class SegmentService {
  private analytics: Analytics | null = null;
  private writeKey = process.env.SEGMENT_WRITE_KEY;

  constructor() {
    if (!this.isConfigured()) {
      console.warn('Segment is not configured - analytics will be local only');
    }
  }

  /**
   * Check if Segment is configured
   */
  private isConfigured(): boolean {
    return !!this.writeKey;
  }

  /**
   * Initialize Segment client
   */
  private async initializeClient(): Promise<void> {
    if (!this.analytics && this.isConfigured()) {
      this.analytics = new Analytics(this.writeKey!);
    }
  }

  /**
   * Track event
   */
  async trackEvent(tenantId: string, event: AnalyticsEvent): Promise<void> {
    try {
      // Store event in database
      await this.storeEvent(
        tenantId,
        event.userId,
        event.event,
        event.properties
      );

      // Send to Segment if configured
      if (this.isConfigured()) {
        await this.initializeClient();

        this.analytics?.track({
          userId: event.userId,
          event: event.event,
          properties: {
            ...event.properties,
            tenantId,
          },
          timestamp: event.timestamp || new Date(),
          context: {
            ...event.context,
            tenantId,
          },
        });
      }
    } catch (error) {
      console.error('Error tracking event:', error);
      // Don't throw - analytics should not break application
    }
  }

  /**
   * Track multiple events
   */
  async trackBatch(
    tenantId: string,
    events: AnalyticsEvent[]
  ): Promise<void> {
    for (const event of events) {
      await this.trackEvent(tenantId, event);
    }
  }

  /**
   * Identify user
   */
  async identifyUser(tenantId: string, data: IdentifyData): Promise<void> {
    try {
      // Store user traits in database
      await this.storeUserTraits(tenantId, data.userId, data.traits);

      // Send to Segment if configured
      if (this.isConfigured()) {
        await this.initializeClient();

        this.analytics?.identify({
          userId: data.userId,
          traits: {
            ...data.traits,
            tenantId,
          },
          timestamp: data.timestamp || new Date(),
          context: {
            ...data.context,
            tenantId,
          },
        });
      }
    } catch (error) {
      console.error('Error identifying user:', error);
    }
  }

  /**
   * Track page view
   */
  async trackPageView(
    tenantId: string,
    data: PageViewData
  ): Promise<void> {
    try {
      // Store page view in database
      await this.storePageView(
        tenantId,
        data.userId,
        data.name,
        data.category,
        data.properties
      );

      // Send to Segment if configured
      if (this.isConfigured()) {
        await this.initializeClient();

        this.analytics?.page({
          userId: data.userId,
          category: data.category,
          name: data.name,
          properties: {
            ...data.properties,
            tenantId,
          },
          timestamp: data.timestamp || new Date(),
          context: {
            ...data.context,
            tenantId,
          },
        });
      }
    } catch (error) {
      console.error('Error tracking page view:', error);
    }
  }

  /**
   * Get analytics summary for tenant
   */
  async getAnalyticsSummary(tenantId: string, days = 30): Promise<{
    totalEvents: number;
    totalUsers: number;
    topEvents: Array<{ event: string; count: number }>;
    topPages: Array<{ page: string; count: number }>;
  }> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get total events
      const totalEvents = await prisma.analytics_Events.count({
        where: {
          tenant_id: tenantId,
          created_at: { gte: startDate },
        },
      });

      // Get unique users
      const uniqueUsers = await prisma.analytics_Events.findMany({
        where: {
          tenant_id: tenantId,
          created_at: { gte: startDate },
        },
        distinct: ['user_id'],
      });

      // Get top events
      const topEventsData = await prisma.analytics_Events.groupBy({
        by: ['event_name'],
        where: {
          tenant_id: tenantId,
          created_at: { gte: startDate },
        },
        _count: {
          id: true,
        },
        orderBy: {
          _count: {
            id: 'desc',
          },
        },
        take: 10,
      });

      const topEvents = topEventsData.map((item) => ({
        event: item.event_name,
        count: item._count.id,
      }));

      // Get top pages
      const topPagesData = await prisma.analytics_Events.findMany({
        where: {
          tenant_id: tenantId,
          event_name: 'page_view',
          created_at: { gte: startDate },
        },
        select: {
          metadata: true,
        },
      });

      const pageCount: Record<string, number> = {};
      for (const item of topPagesData) {
        const page = (item.metadata as any)?.page || 'unknown';
        pageCount[page] = (pageCount[page] || 0) + 1;
      }

      const topPages = Object.entries(pageCount)
        .map(([page, count]) => ({ page, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      return {
        totalEvents,
        totalUsers: uniqueUsers.length,
        topEvents,
        topPages,
      };
    } catch (error) {
      console.error('Error getting analytics summary:', error);
      throw error;
    }
  }

  /**
   * Get event timeline
   */
  async getEventTimeline(
    tenantId: string,
    userId: string,
    days = 7
  ): Promise<
    Array<{
      id: string;
      event: string;
      timestamp: Date;
      properties?: Record<string, any>;
    }>
  > {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const events = await prisma.analytics_Events.findMany({
        where: {
          tenant_id: tenantId,
          user_id: userId,
          created_at: { gte: startDate },
        },
        orderBy: { created_at: 'desc' },
      });

      return events.map((e) => ({
        id: e.id,
        event: e.event_name,
        timestamp: e.created_at,
        properties: e.metadata as Record<string, any> | undefined,
      }));
    } catch (error) {
      console.error('Error getting event timeline:', error);
      throw error;
    }
  }

  /**
   * Store event in database
   */
  private async storeEvent(
    tenantId: string,
    userId: string,
    eventName: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      await prisma.analytics_Events.create({
        data: {
          tenant_id: tenantId,
          user_id: userId,
          event_name: eventName,
          metadata,
        },
      });
    } catch (error) {
      console.error('Error storing event:', error);
    }
  }

  /**
   * Store user traits in database
   */
  private async storeUserTraits(
    tenantId: string,
    userId: string,
    traits: Record<string, any>
  ): Promise<void> {
    try {
      // Update user profile with traits
      await prisma.users.update({
        where: { id: userId },
        data: {
          metadata: traits,
        },
      });
    } catch (error) {
      console.error('Error storing user traits:', error);
    }
  }

  /**
   * Store page view
   */
  private async storePageView(
    tenantId: string,
    userId: string,
    pageName: string,
    category?: string,
    properties?: Record<string, any>
  ): Promise<void> {
    try {
      await this.storeEvent(tenantId, userId, 'page_view', {
        page: pageName,
        category,
        ...properties,
      });
    } catch (error) {
      console.error('Error storing page view:', error);
    }
  }

  /**
   * Flush pending events to Segment
   */
  async flush(): Promise<void> {
    if (this.analytics) {
      await this.analytics.flush();
    }
  }
}

export const segmentService = new SegmentService();
