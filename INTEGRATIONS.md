# NextCRM Integrations Guide

This document provides comprehensive information about integrating external services with NextCRM.

## Table of Contents

- [Supported Integrations](#supported-integrations)
- [Integration Architecture](#integration-architecture)
- [Setting Up Integrations](#setting-up-integrations)
- [API Reference](#api-reference)
- [Webhook Configuration](#webhook-configuration)
- [Development Guide](#development-guide)

---

## Supported Integrations

NextCRM supports 7 different external integrations organized by category:

### Accounting Integrations

#### Xero
- **Type**: `XERO`
- **Category**: Accounting
- **Features**:
  - OAuth 2.0 authentication
  - Invoice sync (AUTHORISED, PAID status)
  - Contact sync
  - Automatic token refresh
  - Multi-tenant support

**Setup**:
1. Create OAuth application in Xero
2. Set environment variables:
   ```
   XERO_CLIENT_ID=your_client_id
   XERO_CLIENT_SECRET=your_client_secret
   XERO_REDIRECT_URI=http://localhost:3000/api/integrations/xero/callback
   ```

#### MYOB
- **Type**: `MYOB`
- **Category**: Accounting
- **Features**:
  - OAuth 2.0 authentication
  - Invoice sync
  - Automatic token refresh
  - Australian accounting support

**Setup**:
```
MYOB_CLIENT_ID=your_client_id
MYOB_CLIENT_SECRET=your_client_secret
```

#### QuickBooks
- **Type**: `QUICKBOOKS`
- **Category**: Accounting
- **Features**:
  - OAuth 2.0 authentication
  - Invoice sync using QuickBooks Query Language
  - Multi-company support (via Realm ID)

**Setup**:
```
QUICKBOOKS_CLIENT_ID=your_client_id
QUICKBOOKS_CLIENT_SECRET=your_client_secret
QUICKBOOKS_REALM_ID=your_realm_id
```

### Payment Integrations

#### Stripe
- **Type**: `STRIPE`
- **Category**: Payments
- **Features**:
  - Payment processing
  - Subscription management
  - Webhook support for real-time updates
  - Refund handling
  - Invoice tracking

**Setup**:
```
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

**Webhook Events**:
- `charge.succeeded`
- `charge.failed`
- `charge.refunded`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

#### PayPal
- **Type**: `PAYPAL`
- **Category**: Payments
- **Features**:
  - Payment processing (sandbox and production)
  - Billing plans and subscriptions
  - Webhook support
  - Transaction history sync

**Setup**:
```
PAYPAL_MODE=sandbox  # or 'production'
PAYPAL_CLIENT_ID=your_client_id
PAYPAL_CLIENT_SECRET=your_client_secret
PAYPAL_WEBHOOK_ID=your_webhook_id
```

### Marketing Integrations

#### BillionMail
- **Type**: `BILLIONMAIL`
- **Category**: Marketing
- **Features**:
  - Email campaign management
  - Campaign sync
  - List management
  - Campaign creation and sending

**Setup**:
```
BILLIONMAIL_API_KEY=your_api_key
BILLIONMAIL_API_URL=https://api.billionmail.com
```

#### Mautic
- **Type**: `MAUTIC`
- **Category**: Marketing
- **Features**:
  - Marketing automation
  - Campaign management
  - Contact/Lead management
  - Segment management
  - OAuth 2.0 support

**Setup**:
```
MAUTIC_BASE_URL=https://your-mautic.com
MAUTIC_CLIENT_ID=your_client_id
MAUTIC_CLIENT_SECRET=your_client_secret
```

---

## Integration Architecture

### Data Flow

```
External Service API
        ↓
Integration Service (lib/integrations/*.ts)
        ↓
API Routes (app/api/integrations/*)
        ↓
Database (Prisma)
        ↓
NextCRM Application
```

### Key Components

1. **Integration Services** (`lib/integrations/`)
   - `base.ts` - Base class with common functionality
   - `{service}.ts` - Service-specific implementations
   - `factory.ts` - Factory pattern for service instantiation
   - `types.ts` - TypeScript interfaces

2. **API Routes** (`app/api/integrations/`)
   - `route.ts` - Integration management (CRUD)
   - `sync/route.ts` - Trigger sync operations
   - `logs/route.ts` - View sync history
   - `{service}/` - Service-specific endpoints

3. **Database Models** (`prisma/schema.prisma`)
   - `integrations_Credentials` - Store API credentials
   - `integrations_Sync_Logs` - Track sync history
   - `{service}_*` - Service-specific tables

### Authentication Flow

```
User connects integration
        ↓
OAuth/API Key stored (encrypted)
        ↓
Service authenticates on demand
        ↓
Token refresh on expiration
        ↓
Data sync initiated
```

---

## Setting Up Integrations

### Step 1: Create Integration Credentials

```typescript
const response = await fetch('/api/integrations', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    integrationType: 'STRIPE',
    integrationName: 'Production Stripe',
    apiKey: 'sk_live_...',
  }),
});
```

### Step 2: Test Connection

```typescript
const response = await fetch('/api/integrations/test', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    integrationId: 'integration-id-123',
  }),
});
```

### Step 3: Trigger Sync

```typescript
const response = await fetch('/api/integrations/sync', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    integrationId: 'integration-id-123',
    dataType: 'invoices', // or 'all'
  }),
});

const { result } = await response.json();
console.log(`Synced ${result.syncedRecords} of ${result.totalRecords} records`);
```

### Step 4: View Sync History

```typescript
const response = await fetch('/api/integrations/logs?integrationType=STRIPE');
const { logs } = await response.json();
```

---

## API Reference

### List Integrations

```http
GET /api/integrations
```

**Response**:
```json
{
  "integrations": [
    {
      "id": "int-123",
      "integration_type": "STRIPE",
      "integration_name": "Stripe Payments",
      "is_active": true,
      "sync_status": "SUCCESS",
      "last_synced_at": "2025-01-01T12:00:00Z"
    }
  ]
}
```

### Create Integration

```http
POST /api/integrations
Content-Type: application/json

{
  "integrationType": "XERO",
  "integrationName": "Company Xero",
  "accessToken": "...",
  "refreshToken": "...",
  "customData": {
    "tenantId": "..."
  }
}
```

### Trigger Sync

```http
POST /api/integrations/sync
Content-Type: application/json

{
  "integrationId": "int-123",
  "dataType": "invoices"
}
```

**Response**:
```json
{
  "result": {
    "success": true,
    "totalRecords": 100,
    "syncedRecords": 98,
    "failedRecords": 2,
    "duration": 5432,
    "message": "Successfully synced 98 of 100 invoices from Xero",
    "errors": [
      "Invoice INV-001: Missing contact",
      "Invoice INV-002: Invalid amount"
    ]
  }
}
```

### Get Sync Logs

```http
GET /api/integrations/logs?integrationType=STRIPE&limit=50&offset=0
```

**Response**:
```json
{
  "logs": [
    {
      "id": "log-123",
      "integration_type": "STRIPE",
      "sync_type": "payments",
      "status": "success",
      "total_records": 50,
      "synced_records": 50,
      "failed_records": 0,
      "duration_ms": 2500,
      "created_at": "2025-01-01T12:00:00Z"
    }
  ],
  "total": 150,
  "limit": 50,
  "offset": 0
}
```

---

## Webhook Configuration

### Stripe Webhook

1. Go to Stripe Dashboard → Webhooks
2. Add endpoint: `https://yourapp.com/api/integrations/stripe/webhook`
3. Subscribe to events:
   - charge.succeeded
   - charge.failed
   - charge.refunded
   - customer.subscription.*
   - invoice.payment_*

4. Copy webhook signing secret to environment:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

### PayPal Webhook

1. Go to PayPal Developer Dashboard → Apps & Credentials
2. Create webhook endpoint: `https://yourapp.com/api/integrations/paypal/webhook`
3. Subscribe to events:
   - PAYMENT.SALE.COMPLETED
   - PAYMENT.SALE.DENIED
   - BILLING.SUBSCRIPTION.*
   - PAYMENT.CAPTURE.*

---

## Development Guide

### Creating a New Integration

1. **Create Integration Service** (`lib/integrations/newservice.ts`):

```typescript
import { BaseIntegrationService } from './base';
import { IntegrationCredentials, SyncResult } from './types';

export class NewServiceIntegrationService extends BaseIntegrationService {
  async authenticate(): Promise<boolean> {
    // Implement authentication
  }

  async testConnection(): Promise<boolean> {
    // Implement connection test
  }

  async syncData(dataType: string): Promise<SyncResult> {
    // Implement sync logic
  }
}
```

2. **Add to Factory** (`lib/integrations/factory.ts`):

```typescript
case 'NEWSERVICE':
  return new NewServiceIntegrationService(credentials);
```

3. **Add Database Models** (`prisma/schema.prisma`):

```prisma
model newservice_Data {
  id                String   @id @default(auto()) @map("_id") @db.ObjectId
  newservice_id     String   @unique
  // Add fields
}
```

4. **Create API Routes** (`app/api/integrations/newservice/`):

```typescript
export async function GET(req: NextRequest) {
  // Implement GET
}

export async function POST(req: NextRequest) {
  // Implement POST
}
```

5. **Add Tests** (`__tests__/integrations/newservice.test.ts`)

6. **Update Environment Variables** (`.env.local.example`)

### Testing Integrations Locally

```bash
# Run all integration tests
pnpm test __tests__/integrations/

# Run specific integration test
pnpm test __tests__/integrations/factory.test.ts

# Test with coverage
pnpm test --coverage __tests__/integrations/
```

### Debugging Integration Issues

1. Check sync logs:
   ```
   GET /api/integrations/logs?integrationType=XERO
   ```

2. View error messages:
   ```
   GET /api/integrations
   # Check sync_error field
   ```

3. Enable debug logging (in service):
   ```typescript
   console.error('Integration error:', error);
   ```

---

## Security Considerations

### API Key Storage

All API keys and tokens are stored in the database and should be:
- Encrypted at rest (implement in production)
- Never logged to console
- Never sent to client-side
- Rotated regularly

### OAuth 2.0 Security

- Tokens refreshed automatically before expiration
- Refresh tokens stored securely
- HTTPS-only for all external API calls
- CORS properly configured

### Rate Limiting

- Implement rate limiting for sync endpoints
- Respect API rate limits of external services
- Queue large sync operations

### Webhook Verification

- Always verify webhook signatures
- Implement idempotency for webhook handlers
- Log all webhook events

---

## Troubleshooting

### Integration not syncing

1. Check if integration is active: `GET /api/integrations`
2. Verify API credentials in environment variables
3. Check sync logs for error details: `GET /api/integrations/logs`
4. Test connection: `POST /api/integrations/{id}/test`

### Token refresh failing

- Verify refresh token exists
- Check token expiration logic
- Ensure client_id and client_secret are correct

### Webhook not receiving events

- Verify webhook URL is accessible
- Check webhook signing secret is correct
- Review webhook logs in external service dashboard
- Ensure endpoint returns 200 status

### Rate limits being hit

- Implement exponential backoff in sync
- Reduce sync frequency
- Batch requests where possible
- Contact external service for rate limit increase

---

## Support

For integration issues:

1. Check INTEGRATIONS.md (this file)
2. Review API logs and error messages
3. Check external service API documentation
4. Open issue on GitHub
5. Contact support team

---

## Changelog

### v1.0.0 (Initial Release)

- Xero integration
- MYOB integration
- QuickBooks integration
- Stripe integration with webhooks
- PayPal integration with webhooks
- BillionMail integration
- Mautic integration
- Sync logging and history
- Integration factory pattern
- Comprehensive testing

---

**Last Updated**: 2025-01-08
**Maintained By**: NextCRM Team
