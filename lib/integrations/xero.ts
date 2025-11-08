/**
 * Xero Accounting Integration Service
 */

import { BaseIntegrationService } from './base';
import {
  IntegrationCredentials,
  SyncResult,
  InvoiceSyncData,
  ContactSyncData,
  XeroAuthResponse,
} from './types';

export class XeroIntegrationService extends BaseIntegrationService {
  private baseUrl = 'https://api.xero.com/api.xro/2.0';
  private identityUrl = 'https://identity.xero.com/connect/authorize';

  constructor(credentials: IntegrationCredentials) {
    super(credentials);
  }

  /**
   * Authenticate with Xero using OAuth 2.0
   */
  async authenticate(): Promise<boolean> {
    try {
      if (this.isTokenExpired() && this.credentials.refreshToken) {
        return await this.refreshAuthToken();
      }
      return !!this.credentials.accessToken;
    } catch (error) {
      console.error('Xero authentication failed:', error);
      return false;
    }
  }

  /**
   * Refresh Xero OAuth token
   */
  protected async refreshAuthToken(): Promise<boolean> {
    if (!this.credentials.refreshToken) {
      return false;
    }

    try {
      const response = await fetch('https://identity.xero.com/connect/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: this.credentials.refreshToken,
          client_id: process.env.XERO_CLIENT_ID || '',
          client_secret: process.env.XERO_CLIENT_SECRET || '',
        }).toString(),
      });

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.statusText}`);
      }

      const data = (await response.json()) as XeroAuthResponse;
      this.credentials.accessToken = data.access_token;
      this.credentials.refreshToken = data.refresh_token;
      this.credentials.tokenExpiresAt = new Date(Date.now() + data.expires_in * 1000);

      return true;
    } catch (error) {
      console.error('Xero token refresh failed:', error);
      return false;
    }
  }

  /**
   * Test connection to Xero
   */
  async testConnection(): Promise<boolean> {
    try {
      const authenticated = await this.authenticate();
      if (!authenticated) {
        return false;
      }

      const response = await fetch(`${this.baseUrl}/Organisation`, {
        headers: {
          Authorization: `Bearer ${this.credentials.accessToken}`,
          'Xero-tenant-id': this.credentials.customData?.tenantId || '',
        },
      });

      return response.ok;
    } catch (error) {
      console.error('Xero connection test failed:', error);
      return false;
    }
  }

  /**
   * Sync invoices from Xero
   */
  async syncInvoices(): Promise<SyncResult> {
    const startTime = Date.now();

    try {
      if (!(await this.authenticate())) {
        throw new Error('Failed to authenticate with Xero');
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
        message: `Successfully synced ${syncedInvoices} of ${invoices.length} invoices from Xero`,
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

  /**
   * Sync contacts from Xero
   */
  async syncContacts(): Promise<SyncResult> {
    const startTime = Date.now();

    try {
      if (!(await this.authenticate())) {
        throw new Error('Failed to authenticate with Xero');
      }

      const contacts = await this.fetchContacts();
      const syncedContacts = await this.saveContacts(contacts);

      const duration = Date.now() - startTime;
      await this.logSync('contacts', 'success', contacts.length, syncedContacts, 0, undefined, duration);

      return {
        success: true,
        totalRecords: contacts.length,
        syncedRecords: syncedContacts,
        failedRecords: 0,
        duration,
        message: `Successfully synced ${syncedContacts} of ${contacts.length} contacts from Xero`,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const message = this.handleError(error);
      await this.logSync('contacts', 'failed', 0, 0, 0, message, duration);

      return {
        success: false,
        totalRecords: 0,
        syncedRecords: 0,
        failedRecords: 0,
        duration,
        errors: [message],
        message: `Failed to sync contacts: ${message}`,
      };
    }
  }

  /**
   * Main sync method
   */
  async syncData(dataType: string = 'all'): Promise<SyncResult> {
    if (dataType === 'invoices') {
      return this.syncInvoices();
    } else if (dataType === 'contacts') {
      return this.syncContacts();
    } else if (dataType === 'all') {
      const invoiceResult = await this.syncInvoices();
      const contactResult = await this.syncContacts();

      return {
        success: invoiceResult.success && contactResult.success,
        totalRecords: invoiceResult.totalRecords + contactResult.totalRecords,
        syncedRecords: invoiceResult.syncedRecords + contactResult.syncedRecords,
        failedRecords: invoiceResult.failedRecords + contactResult.failedRecords,
        duration: invoiceResult.duration + contactResult.duration,
        errors: [...(invoiceResult.errors || []), ...(contactResult.errors || [])],
        message: `Synced invoices and contacts. Invoices: ${invoiceResult.syncedRecords}, Contacts: ${contactResult.syncedRecords}`,
      };
    }

    throw new Error(`Unknown data type: ${dataType}`);
  }

  /**
   * Fetch invoices from Xero API
   */
  private async fetchInvoices(): Promise<InvoiceSyncData[]> {
    const invoices: InvoiceSyncData[] = [];
    let page = 1;
    const pageSize = 100;

    while (true) {
      const response = await this.retryRequest(() =>
        fetch(
          `${this.baseUrl}/Invoices?page=${page}&where=Status=="AUTHORISED" OR Status=="PAID"`,
          {
            headers: {
              Authorization: `Bearer ${this.credentials.accessToken}`,
              'Xero-tenant-id': this.credentials.customData?.tenantId || '',
            },
          }
        )
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch invoices: ${response.statusText}`);
      }

      const data = (await response.json()) as any;
      if (!data.Invoices || data.Invoices.length === 0) {
        break;
      }

      for (const invoice of data.Invoices) {
        invoices.push({
          externalId: invoice.InvoiceID,
          invoiceNumber: invoice.InvoiceNumber,
          amount: invoice.Total,
          taxAmount: invoice.TaxTotal,
          currency: invoice.CurrencyCode,
          status: invoice.Status,
          invoiceDate: new Date(invoice.InvoiceDate),
          dueDate: new Date(invoice.DueDate),
          contactName: invoice.Contact?.Name,
          description: invoice.LineItems?.[0]?.Description,
        });
      }

      if (data.Invoices.length < pageSize) {
        break;
      }

      page++;
    }

    return invoices;
  }

  /**
   * Fetch contacts from Xero API
   */
  private async fetchContacts(): Promise<ContactSyncData[]> {
    const contacts: ContactSyncData[] = [];

    const response = await this.retryRequest(() =>
      fetch(`${this.baseUrl}/Contacts`, {
        headers: {
          Authorization: `Bearer ${this.credentials.accessToken}`,
          'Xero-tenant-id': this.credentials.customData?.tenantId || '',
        },
      })
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch contacts: ${response.statusText}`);
    }

    const data = (await response.json()) as any;
    if (data.Contacts) {
      for (const contact of data.Contacts) {
        contacts.push({
          externalId: contact.ContactID,
          name: contact.Name,
          email: contact.EmailAddress,
          phone: contact.Phones?.[0]?.PhoneNumber,
          taxNumber: contact.TaxNumber,
        });
      }
    }

    return contacts;
  }

  /**
   * Save invoices to database
   */
  private async saveInvoices(invoices: InvoiceSyncData[]): Promise<number> {
    let saved = 0;

    for (const invoice of invoices) {
      try {
        const response = await fetch('/api/integrations/xero/invoices', {
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

  /**
   * Save contacts to database
   */
  private async saveContacts(contacts: ContactSyncData[]): Promise<number> {
    let saved = 0;

    for (const contact of contacts) {
      try {
        const response = await fetch('/api/integrations/xero/contacts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...contact,
            userId: this.credentials.userId,
          }),
        });

        if (response.ok) {
          saved++;
        }
      } catch (error) {
        console.error('Failed to save contact:', error);
      }
    }

    return saved;
  }
}
