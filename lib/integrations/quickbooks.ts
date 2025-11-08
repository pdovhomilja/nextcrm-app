/**
 * QuickBooks Accounting Integration Service
 */

import { BaseIntegrationService } from './base';
import { IntegrationCredentials, SyncResult, InvoiceSyncData } from './types';

export class QuickBooksIntegrationService extends BaseIntegrationService {
  private baseUrl = 'https://quickbooks.api.intuit.com/v2/company';

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
      console.error('QuickBooks authentication failed:', error);
      return false;
    }
  }

  protected async refreshAuthToken(): Promise<boolean> {
    if (!this.credentials.refreshToken) {
      return false;
    }

    try {
      const response = await fetch('https://oauth.platform.intuit.com/oauth2/tokens/bearer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: this.credentials.refreshToken,
          client_id: process.env.QUICKBOOKS_CLIENT_ID || '',
          client_secret: process.env.QUICKBOOKS_CLIENT_SECRET || '',
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
      console.error('QuickBooks token refresh failed:', error);
      return false;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const authenticated = await this.authenticate();
      if (!authenticated) {
        return false;
      }

      const realmId = this.credentials.customData?.realmId || process.env.QUICKBOOKS_REALM_ID;
      const response = await fetch(`${this.baseUrl}/${realmId}/companyinfo/${realmId}`, {
        headers: {
          Authorization: `Bearer ${this.credentials.accessToken}`,
        },
      });

      return response.ok;
    } catch (error) {
      console.error('QuickBooks connection test failed:', error);
      return false;
    }
  }

  async syncInvoices(): Promise<SyncResult> {
    const startTime = Date.now();

    try {
      if (!(await this.authenticate())) {
        throw new Error('Failed to authenticate with QuickBooks');
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
        message: `Successfully synced ${syncedInvoices} of ${invoices.length} invoices from QuickBooks`,
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
      const realmId = this.credentials.customData?.realmId || process.env.QUICKBOOKS_REALM_ID;
      const query = "select * from Invoice startPosition 1 maxResults 1000";

      const response = await this.retryRequest(() =>
        fetch(
          `${this.baseUrl}/${realmId}/query?query=${encodeURIComponent(query)}`,
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
      if (data.QueryResponse?.Invoice) {
        for (const invoice of data.QueryResponse.Invoice) {
          invoices.push({
            externalId: invoice.Id,
            invoiceNumber: invoice.DocNumber,
            amount: invoice.TotalAmt,
            taxAmount: invoice.TxnTaxDetail?.TotalTaxAmount || 0,
            currency: 'USD',
            status: invoice.Status,
            invoiceDate: new Date(invoice.TxnDate),
            dueDate: new Date(invoice.DueDate),
            contactName: invoice.CustomerRef?.name,
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
        const response = await fetch('/api/integrations/quickbooks/invoices', {
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
