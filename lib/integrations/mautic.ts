/**
 * Mautic Marketing Automation Integration Service
 */

import { BaseIntegrationService } from './base';
import { IntegrationCredentials, SyncResult, CampaignSyncData } from './types';

export class MauticIntegrationService extends BaseIntegrationService {
  private baseUrl = process.env.MAUTIC_BASE_URL || 'https://your-mautic.com';

  constructor(credentials: IntegrationCredentials) {
    super(credentials);
  }

  async authenticate(): Promise<boolean> {
    try {
      return !!this.credentials.accessToken;
    } catch (error) {
      console.error('Mautic authentication failed:', error);
      return false;
    }
  }

  protected async refreshAuthToken(): Promise<boolean> {
    if (!this.credentials.refreshToken) {
      return false;
    }

    try {
      const response = await fetch(`${this.baseUrl}/oauth/v2/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: this.credentials.refreshToken,
          client_id: process.env.MAUTIC_CLIENT_ID || '',
          client_secret: process.env.MAUTIC_CLIENT_SECRET || '',
        }).toString(),
      });

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.statusText}`);
      }

      const data = (await response.json()) as any;
      this.credentials.accessToken = data.access_token;
      this.credentials.refreshToken = data.refresh_token;
      this.credentials.tokenExpiresAt = new Date(Date.now() + data.expires_in * 1000);

      return true;
    } catch (error) {
      console.error('Mautic token refresh failed:', error);
      return false;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      if (this.isTokenExpired() && this.credentials.refreshToken) {
        await this.refreshAuthToken();
      }

      const response = await fetch(`${this.baseUrl}/api/campaigns?limit=1`, {
        headers: {
          Authorization: `Bearer ${this.credentials.accessToken}`,
        },
      });

      return response.ok;
    } catch (error) {
      console.error('Mautic connection test failed:', error);
      return false;
    }
  }

  async syncCampaigns(): Promise<SyncResult> {
    const startTime = Date.now();

    try {
      if (!(await this.authenticate())) {
        throw new Error('Failed to authenticate with Mautic');
      }

      const campaigns = await this.fetchCampaigns();
      const syncedCampaigns = await this.saveCampaigns(campaigns);

      const duration = Date.now() - startTime;
      await this.logSync('campaigns', 'success', campaigns.length, syncedCampaigns, 0, undefined, duration);

      return {
        success: true,
        totalRecords: campaigns.length,
        syncedRecords: syncedCampaigns,
        failedRecords: 0,
        duration,
        message: `Successfully synced ${syncedCampaigns} of ${campaigns.length} campaigns from Mautic`,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const message = this.handleError(error);
      await this.logSync('campaigns', 'failed', 0, 0, 0, message, duration);

      return {
        success: false,
        totalRecords: 0,
        syncedRecords: 0,
        failedRecords: 0,
        duration,
        errors: [message],
        message: `Failed to sync campaigns: ${message}`,
      };
    }
  }

  async createCampaign(
    name: string,
    description?: string
  ): Promise<{ success: boolean; campaignId?: string; error?: string }> {
    try {
      if (!(await this.authenticate())) {
        throw new Error('Failed to authenticate with Mautic');
      }

      const payload = {
        name,
        description: description || '',
        isPublished: false,
      };

      const response = await fetch(`${this.baseUrl}/api/campaigns/new`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.credentials.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Failed to create campaign: ${response.statusText}`);
      }

      const data = (await response.json()) as any;
      return {
        success: true,
        campaignId: data.campaign?.id,
      };
    } catch (error) {
      return {
        success: false,
        error: this.handleError(error),
      };
    }
  }

  async publishCampaign(campaignId: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (!(await this.authenticate())) {
        throw new Error('Failed to authenticate with Mautic');
      }

      const response = await fetch(`${this.baseUrl}/api/campaigns/${campaignId}/publish`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${this.credentials.accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to publish campaign: ${response.statusText}`);
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: this.handleError(error),
      };
    }
  }

  async addContactToSegment(
    contactId: string,
    segmentId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (!(await this.authenticate())) {
        throw new Error('Failed to authenticate with Mautic');
      }

      const response = await fetch(
        `${this.baseUrl}/api/contacts/${contactId}/segments/${segmentId}/add`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.credentials.accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to add contact to segment: ${response.statusText}`);
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: this.handleError(error),
      };
    }
  }

  async syncData(dataType: string = 'all'): Promise<SyncResult> {
    if (dataType === 'campaigns' || dataType === 'all') {
      return this.syncCampaigns();
    }

    throw new Error(`Unknown data type: ${dataType}`);
  }

  private async fetchCampaigns(): Promise<CampaignSyncData[]> {
    const campaigns: CampaignSyncData[] = [];

    try {
      let start = 0;
      const limit = 50;
      let hasMore = true;

      while (hasMore) {
        const response = await this.retryRequest(() =>
          fetch(
            `${this.baseUrl}/api/campaigns?start=${start}&limit=${limit}`,
            {
              headers: {
                Authorization: `Bearer ${this.credentials.accessToken}`,
              },
            }
          )
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch campaigns: ${response.statusText}`);
        }

        const data = (await response.json()) as any;
        if (data.campaigns) {
          for (const campaign of Object.values(data.campaigns)) {
            const c = campaign as any;
            campaigns.push({
              externalId: c.id,
              campaignName: c.name,
              status: c.isPublished ? 'published' : 'draft',
              contactsCount: 0,
            });
          }
        }

        if (Object.keys(data.campaigns || {}).length < limit) {
          hasMore = false;
        }
        start += limit;
      }
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    }

    return campaigns;
  }

  private async saveCampaigns(campaigns: CampaignSyncData[]): Promise<number> {
    let saved = 0;

    for (const campaign of campaigns) {
      try {
        const response = await fetch('/api/integrations/mautic/campaigns', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...campaign,
            userId: this.credentials.userId,
          }),
        });

        if (response.ok) {
          saved++;
        }
      } catch (error) {
        console.error('Failed to save campaign:', error);
      }
    }

    return saved;
  }
}
