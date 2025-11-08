/**
 * MYOB Accounting Integration Service
 */

import { BaseIntegrationService } from './base';
import { IntegrationCredentials, SyncResult, InvoiceSyncData } from './types';

export class MyobIntegrationService extends BaseIntegrationService {
  private baseUrl = 'https://api.myob.com/accountright';

  constructor(credentials: IntegrationCredentials) {
    super(credentials);
  }

  async authenticate(): Promise<boolean> {
    try {
      if (this.isTokenExpired() && this.credentials.refreshToken) {
        return await this.refreshAuthToken();
      }
      return !!this.credentials.accessToken;
    } catch (error) {
      console.error('MYOB authentication failed:', error);
      return false;
    }
  }

  protected async refreshAuthToken(): Promise<boolean> {
    if (!this.credentials.refreshToken) {
      return false;
    }

    try {
      const response = await fetch('https://secure.myob.com/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: this.credentials.refreshToken,
          client_id: process.env.MYOB_CLIENT_ID || '',
          client_secret: process.env.MYOB_CLIENT_SECRET || '',
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
      console.error('MYOB token refresh failed:', error);
      return false;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const authenticated = await this.authenticate();
      if (!authenticated) {
        return false;
      }

      const fileId = this.credentials.customData?.fileId;
      if (!fileId) {
        return false;
      }

      const response = await fetch(`${this.baseUrl}/${fileId}`, {
        headers: {
          Authorization: `Bearer ${this.credentials.accessToken}`,
        },
      });

      return response.ok;
    } catch (error) {
      console.error('MYOB connection test failed:', error);
      return false;
    }
  }

  async syncInvoices(): Promise<SyncResult> {
    const startTime = Date.now();

    try {
      if (!(await this.authenticate())) {
        throw new Error('Failed to authenticate with MYOB');
      }

      const invoices = await this.fetchInvoices();
      const syncedInvoices = await this.saveInvoices(invoices);

      const duration = Date.now() - startTime;
      await this.logSync('invoices', 'success', invoices.length, syncedInvoices, 0, undefined, duration);

      return {
        success: true,
        totalRecords: invoices.length,
        syncedRecords: syncedInvoices,
        failedRecords: 0,
        duration,
        message: `Successfully synced ${syncedInvoices} of ${invoices.length} invoices from MYOB`,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const message = this.handleError(error);
      await this.logSync('invoices', 'failed', 0, 0, 0, message, duration);

      return {
        success: false,
        totalRecords: 0,
        syncedRecords: 0,
        failedRecords: 0,
        duration,
        errors: [message],
        message: `Failed to sync invoices: ${message}`,
      };
    }
  }

  async syncData(dataType: string = 'all'): Promise<SyncResult> {
    if (dataType === 'invoices' || dataType === 'all') {
      return this.syncInvoices();
    }

    throw new Error(`Unknown data type: ${dataType}`);
  }

  private async fetchInvoices(): Promise<InvoiceSyncData[]> {
    const invoices: InvoiceSyncData[] = [];

    try {
      const fileId = this.credentials.customData?.fileId;
      if (!fileId) {
        throw new Error('File ID not configured');
      }

      const response = await this.retryRequest(() =>
        fetch(
          `${this.baseUrl}/${fileId}/Sale/Invoice?$top=1000`,
          {
            headers: {
              Authorization: `Bearer ${this.credentials.accessToken}`,
            },
          }
        )
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch invoices: ${response.statusText}`);
      }

      const data = (await response.json()) as any;
      if (data.Items) {
        for (const invoice of data.Items) {
          invoices.push({
            externalId: invoice.UID,
            invoiceNumber: invoice.Number,
            amount: invoice.Total,
            taxAmount: invoice.TaxInclusiveAmount - invoice.Total,
            currency: 'AUD',
            status: invoice.IsFinalised ? 'FINALISED' : 'DRAFT',
            invoiceDate: new Date(invoice.Date),
            dueDate: new Date(invoice.DueDate),
            contactName: invoice.CustomerName,
          });
        }
      }
    } catch (error) {
      console.error('Error fetching invoices:', error);
    }

    return invoices;
  }

  private async saveInvoices(invoices: InvoiceSyncData[]): Promise<number> {
    let saved = 0;

    for (const invoice of invoices) {
      try {
        const response = await fetch('/api/integrations/myob/invoices', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...invoice,
            userId: this.credentials.userId,
          }),
        });

        if (response.ok) {
          saved++;
        }
      } catch (error) {
        console.error('Failed to save invoice:', error);
      }
    }

    return saved;
  }
}
