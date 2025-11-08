/**
 * Integration Factory
 * Creates integration service instances based on type
 */

import { IntegrationCredentials } from './types';
import { BaseIntegrationService } from './base';
import { XeroIntegrationService } from './xero';
import { MyobIntegrationService } from './myob';
import { QuickBooksIntegrationService } from './quickbooks';
import { StripeIntegrationService } from './stripe';
import { PayPalIntegrationService } from './paypal';
import { BillionMailIntegrationService } from './billionmail';
import { MauticIntegrationService } from './mautic';

export class IntegrationFactory {
  static createService(
    credentials: IntegrationCredentials
  ): BaseIntegrationService {
    switch (credentials.integrationType) {
      case 'XERO':
        return new XeroIntegrationService(credentials);

      case 'MYOB':
        return new MyobIntegrationService(credentials);

      case 'QUICKBOOKS':
        return new QuickBooksIntegrationService(credentials);

      case 'STRIPE':
        return new StripeIntegrationService(credentials);

      case 'PAYPAL':
        return new PayPalIntegrationService(credentials);

      case 'BILLIONMAIL':
        return new BillionMailIntegrationService(credentials);

      case 'MAUTIC':
        return new MauticIntegrationService(credentials);

      default:
        throw new Error(
          `Unsupported integration type: ${credentials.integrationType}`
        );
    }
  }

  static getSupportedIntegrations(): Array<{
    type: string;
    name: string;
    description: string;
    category: string;
  }> {
    return [
      {
        type: 'XERO',
        name: 'Xero',
        description: 'Cloud-based accounting software',
        category: 'Accounting',
      },
      {
        type: 'MYOB',
        name: 'MYOB',
        description: 'Australian accounting software',
        category: 'Accounting',
      },
      {
        type: 'QUICKBOOKS',
        name: 'QuickBooks',
        description: 'US-based accounting software',
        category: 'Accounting',
      },
      {
        type: 'STRIPE',
        name: 'Stripe',
        description: 'Payment processing platform',
        category: 'Payments',
      },
      {
        type: 'PAYPAL',
        name: 'PayPal',
        description: 'Payment and billing platform',
        category: 'Payments',
      },
      {
        type: 'BILLIONMAIL',
        name: 'BillionMail',
        description: 'Email marketing platform',
        category: 'Marketing',
      },
      {
        type: 'MAUTIC',
        name: 'Mautic',
        description: 'Marketing automation platform',
        category: 'Marketing',
      },
    ];
  }

  static getIntegrationsByCategory(
    category: string
  ): Array<{
    type: string;
    name: string;
    description: string;
    category: string;
  }> {
    return this.getSupportedIntegrations().filter(
      (integration) => integration.category === category
    );
  }
}
