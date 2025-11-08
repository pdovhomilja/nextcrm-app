/**
 * Stripe Payment Integration Service
 */

import { BaseIntegrationService } from './base';
import { IntegrationCredentials, SyncResult, PaymentSyncData } from './types';

export class StripeIntegrationService extends BaseIntegrationService {
  private baseUrl = 'https://api.stripe.com/v1';

  constructor(credentials: IntegrationCredentials) {
    super(credentials);
  }

  /**
   * Authenticate with Stripe (API key based)
   */
  async authenticate(): Promise<boolean> {
    try {
      return !!this.credentials.apiKey;
    } catch (error) {
      console.error('Stripe authentication failed:', error);
      return false;
    }
  }

  /**
   * Test connection to Stripe
   */
  async testConnection(): Promise<boolean> {
    try {
      const authenticated = await this.authenticate();
      if (!authenticated) {
        return false;
      }

      const response = await fetch(`${this.baseUrl}/account`, {
        headers: {
          Authorization: `Bearer ${this.credentials.apiKey}`,
        },
      });

      return response.ok;
    } catch (error) {
      console.error('Stripe connection test failed:', error);
      return false;
    }
  }

  /**
   * Sync payments from Stripe
   */
  async syncPayments(): Promise<SyncResult> {
    const startTime = Date.now();

    try {
      if (!(await this.authenticate())) {
        throw new Error('Failed to authenticate with Stripe');
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
        message: `Successfully synced ${syncedPayments} of ${payments.length} payments from Stripe`,
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
   * Create a payment intent
   */
  async createPaymentIntent(
    amount: number,
    currency: string,
    invoiceId?: string,
    customerId?: string
  ): Promise<{ success: boolean; clientSecret?: string; error?: string }> {
    try {
      if (!(await this.authenticate())) {
        throw new Error('Failed to authenticate with Stripe');
      }

      const params = new URLSearchParams({
        amount: Math.round(amount * 100).toString(), // Convert to cents
        currency: currency.toLowerCase(),
        payment_method_types: 'card',
        description: `Payment for invoice ${invoiceId}`,
      });

      if (customerId) {
        params.append('customer', customerId);
      }

      const response = await fetch(`${this.baseUrl}/payment_intents`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.credentials.apiKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      if (!response.ok) {
        throw new Error(`Failed to create payment intent: ${response.statusText}`);
      }

      const data = (await response.json()) as any;
      return {
        success: true,
        clientSecret: data.client_secret,
      };
    } catch (error) {
      return {
        success: false,
        error: this.handleError(error),
      };
    }
  }

  /**
   * Create a subscription
   */
  async createSubscription(
    customerId: string,
    priceId: string,
    trialDays?: number
  ): Promise<{ success: boolean; subscriptionId?: string; error?: string }> {
    try {
      if (!(await this.authenticate())) {
        throw new Error('Failed to authenticate with Stripe');
      }

      const params = new URLSearchParams({
        customer: customerId,
        items: `[{"price":"${priceId}"}]`,
      });

      if (trialDays) {
        params.append('trial_period_days', trialDays.toString());
      }

      const response = await fetch(`${this.baseUrl}/subscriptions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.credentials.apiKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      if (!response.ok) {
        throw new Error(`Failed to create subscription: ${response.statusText}`);
      }

      const data = (await response.json()) as any;
      return {
        success: true,
        subscriptionId: data.id,
      };
    } catch (error) {
      return {
        success: false,
        error: this.handleError(error),
      };
    }
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(subscriptionId: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (!(await this.authenticate())) {
        throw new Error('Failed to authenticate with Stripe');
      }

      const response = await fetch(`${this.baseUrl}/subscriptions/${subscriptionId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${this.credentials.apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to cancel subscription: ${response.statusText}`);
      }

      return { success: true };
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
  verifyWebhookSignature(
    body: string,
    signature: string
  ): { valid: boolean; event?: any } {
    try {
      const crypto = require('crypto');
      const secret = process.env.STRIPE_WEBHOOK_SECRET || '';

      const hash = crypto
        .createHmac('sha256', secret)
        .update(body)
        .digest('hex');

      const receivedHash = signature.split(', ')[1].split('=')[1];

      if (hash === receivedHash) {
        const event = JSON.parse(body);
        return { valid: true, event };
      }

      return { valid: false };
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
   * Fetch payments from Stripe
   */
  private async fetchPayments(): Promise<PaymentSyncData[]> {
    const payments: PaymentSyncData[] = [];

    try {
      const response = await this.retryRequest(() =>
        fetch(`${this.baseUrl}/charges?limit=100`, {
          headers: {
            Authorization: `Bearer ${this.credentials.apiKey}`,
          },
        })
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch payments: ${response.statusText}`);
      }

      const data = (await response.json()) as any;
      if (data.data) {
        for (const charge of data.data) {
          payments.push({
            externalId: charge.id,
            amount: charge.amount / 100, // Convert from cents
            currency: charge.currency.toUpperCase(),
            status: charge.paid ? 'succeeded' : 'failed',
            paymentDate: new Date(charge.created * 1000),
            description: charge.description,
            invoiceId: charge.invoice,
          });
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
        const response = await fetch('/api/integrations/stripe/payments', {
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
