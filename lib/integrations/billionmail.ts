/**
 * BillionMail Email Marketing Integration Service
 */

import { BaseIntegrationService } from './base';
import { IntegrationCredentials, SyncResult, CampaignSyncData } from './types';

export class BillionMailIntegrationService extends BaseIntegrationService {
  private baseUrl = process.env.BILLIONMAIL_API_URL || 'https://api.billionmail.com';

  constructor(credentials: IntegrationCredentials) {
    super(credentials);
  }

  async authenticate(): Promise<boolean> {
    try {
      return !!this.credentials.apiKey;
    } catch (error) {
      console.error('BillionMail authentication failed:', error);
      return false;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const authenticated = await this.authenticate();
      if (!authenticated) {
        return false;
      }

      const response = await fetch(`${this.baseUrl}/v1/account`, {
        headers: {
          'X-API-Key': this.credentials.apiKey || '',
        },
      });

      return response.ok;
    } catch (error) {
      console.error('BillionMail connection test failed:', error);
      return false;
    }
  }

  async syncCampaigns(): Promise<SyncResult> {
    const startTime = Date.now();

    try {
      if (!(await this.authenticate())) {
        throw new Error('Failed to authenticate with BillionMail');
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
        message: `Successfully synced ${syncedCampaigns} of ${campaigns.length} campaigns from BillionMail`,
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
    subject: string,
    fromEmail: string,
    htmlContent: string,
    listId: string
  ): Promise<{ success: boolean; campaignId?: string; error?: string }> {
    try {
      if (!(await this.authenticate())) {
        throw new Error('Failed to authenticate with BillionMail');
      }

      const payload = {
        name,
        subject,
        from_email: fromEmail,
        html_content: htmlContent,
        list_id: listId,
      };

      const response = await fetch(`${this.baseUrl}/v1/campaigns`, {
        method: 'POST',
        headers: {
          'X-API-Key': this.credentials.apiKey || '',
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
        campaignId: data.id,
      };
    } catch (error) {
      return {
        success: false,
        error: this.handleError(error),
      };
    }
  }

  async sendCampaign(campaignId: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (!(await this.authenticate())) {
        throw new Error('Failed to authenticate with BillionMail');
      }

      const response = await fetch(`${this.baseUrl}/v1/campaigns/${campaignId}/send`, {
        method: 'POST',
        headers: {
          'X-API-Key': this.credentials.apiKey || '',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to send campaign: ${response.statusText}`);
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
      const response = await this.retryRequest(() =>
        fetch(`${this.baseUrl}/v1/campaigns?limit=100`, {
          headers: {
            'X-API-Key': this.credentials.apiKey || '',
          },
        })
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch campaigns: ${response.statusText}`);
      }

      const data = (await response.json()) as any;
      if (data.campaigns) {
        for (const campaign of data.campaigns) {
          campaigns.push({
            externalId: campaign.id,
            campaignName: campaign.name,
            status: campaign.status,
            recipientsCount: campaign.recipients_count,
          });
        }
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
        const response = await fetch('/api/integrations/billionmail/campaigns', {
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
