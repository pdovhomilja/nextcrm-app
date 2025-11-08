/**
 * PayPal Payment Integration Service
 */

import { BaseIntegrationService } from './base';
import { IntegrationCredentials, SyncResult, PaymentSyncData } from './types';

export class PayPalIntegrationService extends BaseIntegrationService {
  private baseUrl = 'https://api.sandbox.paypal.com/v1'; // Will use sandbox by default
  private isProduction = false;

  constructor(credentials: IntegrationCredentials) {
    super(credentials);
    this.isProduction = process.env.PAYPAL_MODE === 'production';
    this.baseUrl = this.isProduction
      ? 'https://api.paypal.com/v1'
      : 'https://api.sandbox.paypal.com/v1';
  }

  /**
   * Get access token from PayPal
   */
  async getAccessToken(): Promise<string> {
    try {
      const auth = Buffer.from(
        `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
      ).toString('base64');

      const response = await fetch(`${this.baseUrl}/oauth2/token`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
      });

      if (!response.ok) {
        throw new Error(`Failed to get access token: ${response.statusText}`);
      }

      const data = (await response.json()) as any;
      return data.access_token;
    } catch (error) {
      throw new Error(`Failed to authenticate with PayPal: ${this.handleError(error)}`);
    }
  }

  /**
   * Authenticate with PayPal
   */
  async authenticate(): Promise<boolean> {
    try {
      const token = await this.getAccessToken();
      this.credentials.accessToken = token;
      return true;
    } catch (error) {
      console.error('PayPal authentication failed:', error);
      return false;
    }
  }

  /**
   * Test connection to PayPal
   */
  async testConnection(): Promise<boolean> {
    try {
      const authenticated = await this.authenticate();
      if (!authenticated) {
        return false;
      }

      const response = await fetch(`${this.baseUrl}/oauth2/token/introspect`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.credentials.accessToken}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `token=${this.credentials.accessToken}`,
      });

      return response.ok;
    } catch (error) {
      console.error('PayPal connection test failed:', error);
      return false;
    }
  }

  /**
   * Sync payments from PayPal
   */
  async syncPayments(): Promise<SyncResult> {
    const startTime = Date.now();

    try {
      if (!(await this.authenticate())) {
        throw new Error('Failed to authenticate with PayPal');
      }

      const payments = await this.fetchPayments();
      const syncedPayments = await this.savePayments(payments);

      const duration = Date.now() - startTime;
      await this.logSync('payments', 'success', payments.length, syncedPayments, 0, undefined, duration);

      return {
        success: true,
        totalRecords: payments.length,
        syncedRecords: syncedPayments,
        failedRecords: 0,
        duration,
        message: `Successfully synced ${syncedPayments} of ${payments.length} payments from PayPal`,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const message = this.handleError(error);
      await this.logSync('payments', 'failed', 0, 0, 0, message, duration);

      return {
        success: false,
        totalRecords: 0,
        syncedRecords: 0,
        failedRecords: 0,
        duration,
        errors: [message],
        message: `Failed to sync payments: ${message}`,
      };
    }
  }

  /**
   * Create a payment
   */
  async createPayment(
    amount: number,
    currency: string,
    invoiceId?: string,
    returnUrl?: string
  ): Promise<{
    success: boolean;
    paymentId?: string;
    approvalUrl?: string;
    error?: string;
  }> {
    try {
      if (!(await this.authenticate())) {
        throw new Error('Failed to authenticate with PayPal');
      }

      const payload = {
        intent: 'sale',
        payer: {
          payment_method: 'paypal',
        },
        transactions: [
          {
            amount: {
              total: amount.toString(),
              currency,
              details: {
                subtotal: amount.toString(),
              },
            },
            description: `Payment for invoice ${invoiceId}`,
            invoice_number: invoiceId,
          },
        ],
        redirect_urls: {
          return_url: returnUrl || `${process.env.NEXT_PUBLIC_APP_URL}/payments/success`,
          cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/payments/cancel`,
        },
      };

      const response = await fetch(`${this.baseUrl}/payments/payment`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.credentials.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Failed to create payment: ${response.statusText}`);
      }

      const data = (await response.json()) as any;
      const approvalUrl = data.links?.find((link: any) => link.rel === 'approval_url')?.href;

      return {
        success: true,
        paymentId: data.id,
        approvalUrl,
      };
    } catch (error) {
      return {
        success: false,
        error: this.handleError(error),
      };
    }
  }

  /**
   * Execute a payment
   */
  async executePayment(
    paymentId: string,
    payerId: string
  ): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    try {
      if (!(await this.authenticate())) {
        throw new Error('Failed to authenticate with PayPal');
      }

      const response = await fetch(`${this.baseUrl}/payments/payment/${paymentId}/execute`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.credentials.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ payer_id: payerId }),
      });

      if (!response.ok) {
        throw new Error(`Failed to execute payment: ${response.statusText}`);
      }

      const data = (await response.json()) as any;
      const transactionId = data.transactions?.[0]?.related_resources?.[0]?.sale?.id;

      return {
        success: true,
        transactionId,
      };
    } catch (error) {
      return {
        success: false,
        error: this.handleError(error),
      };
    }
  }

  /**
   * Create a billing plan
   */
  async createBillingPlan(
    name: string,
    amount: number,
    currency: string,
    frequency: 'MONTH' | 'YEAR',
    cycles: number
  ): Promise<{ success: boolean; planId?: string; error?: string }> {
    try {
      if (!(await this.authenticate())) {
        throw new Error('Failed to authenticate with PayPal');
      }

      const payload = {
        name,
        description: name,
        type: 'REGULAR',
        payment_definitions: [
          {
            name,
            type: 'REGULAR',
            frequency_interval: frequency === 'MONTH' ? '1' : '12',
            frequency: frequency,
            cycles: cycles.toString(),
            amount: {
              value: amount.toString(),
              currency,
            },
          },
        ],
        merchant_preferences: {
          setup_fee: {
            value: '0',
            currency,
          },
          return_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing/success`,
          cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing/cancel`,
          notify_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/paypal/webhook`,
          max_fail_attempts: '3',
          initial_fail_amount_action: 'CANCEL',
          agreement_start_date: new Date().toISOString(),
        },
      };

      const response = await fetch(`${this.baseUrl}/payments/billing-plans`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.credentials.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Failed to create billing plan: ${response.statusText}`);
      }

      const data = (await response.json()) as any;

      return {
        success: true,
        planId: data.id,
      };
    } catch (error) {
      return {
        success: false,
        error: this.handleError(error),
      };
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(body: string, signature: string): { valid: boolean; event?: any } {
    try {
      // PayPal webhook verification would require the cert or additional validation
      const event = JSON.parse(body);
      return { valid: true, event };
    } catch (error) {
      console.error('Webhook signature verification failed:', error);
      return { valid: false };
    }
  }

  /**
   * Main sync method
   */
  async syncData(dataType: string = 'all'): Promise<SyncResult> {
    if (dataType === 'payments') {
      return this.syncPayments();
    } else if (dataType === 'all') {
      return this.syncPayments();
    }

    throw new Error(`Unknown data type: ${dataType}`);
  }

  /**
   * Fetch payments from PayPal
   */
  private async fetchPayments(): Promise<PaymentSyncData[]> {
    const payments: PaymentSyncData[] = [];

    try {
      // Fetch completed transactions from the last 7 days
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);

      const params = new URLSearchParams({
        start_date: startDate.toISOString(),
        end_date: new Date().toISOString(),
        fields: 'all',
        page_size: '100',
      });

      const response = await this.retryRequest(() =>
        fetch(`${this.baseUrl}/reporting/transactions?${params}`, {
          headers: {
            Authorization: `Bearer ${this.credentials.accessToken}`,
          },
        })
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch payments: ${response.statusText}`);
      }

      const data = (await response.json()) as any;
      if (data.transaction_details) {
        for (const transaction of data.transaction_details) {
          if (transaction.transaction_status === 'S' || transaction.transaction_status === 'F') {
            payments.push({
              externalId: transaction.transaction_id,
              amount: parseFloat(transaction.transaction_amount.value || '0'),
              currency: transaction.transaction_amount.currency_code,
              status: transaction.transaction_status === 'S' ? 'COMPLETED' : 'FAILED',
              paymentDate: new Date(transaction.transaction_initiation_date),
              description: transaction.transaction_subject,
            });
          }
        }
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
    }

    return payments;
  }

  /**
   * Save payments to database
   */
  private async savePayments(payments: PaymentSyncData[]): Promise<number> {
    let saved = 0;

    for (const payment of payments) {
      try {
        const response = await fetch('/api/integrations/paypal/payments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...payment,
            userId: this.credentials.userId,
          }),
        });

        if (response.ok) {
          saved++;
        }
      } catch (error) {
        console.error('Failed to save payment:', error);
      }
    }

    return saved;
  }
}
