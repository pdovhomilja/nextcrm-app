# NextCRM API Documentation

**Version:** 3.0.0-alpha
**Last Updated:** January 15, 2025
**Status:** P0 Launch Blocker - Complete

Welcome to the NextCRM API documentation. This comprehensive guide provides everything you need to integrate with NextCRM's REST API, including authentication, endpoints, error handling, and best practices.

---

## Quick Links

📖 **[REST API Reference](./REST-API.md)** - Complete endpoint documentation
🔐 **[Authentication Guide](./AUTHENTICATION.md)** - JWT tokens, OAuth setup, security
❌ **[Error Codes Reference](./ERROR_CODES.md)** - Comprehensive error handling
📋 **[OpenAPI 3.0 Spec](./openapi.json)** - Machine-readable API definition

---

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Base URLs](#base-urls)
- [Authentication](#authentication)
- [Common Tasks](#common-tasks)
- [Rate Limiting](#rate-limiting)
- [Response Format](#response-format)
- [Error Handling](#error-handling)
- [SDKs and Tools](#sdks-and-tools)
- [Support](#support)

---

## Overview

NextCRM is a comprehensive Customer Relationship Management system with a REST API that provides programmatic access to all CRM features including:

- **CRM Management**: Accounts, contacts, leads, opportunities
- **Project Management**: Boards, sections, tasks with Kanban workflow
- **Document Management**: File storage and organization
- **Invoice Management**: Invoice creation and tracking
- **Organization Management**: Multi-tenant architecture with RBAC
- **Billing Integration**: Stripe-powered subscription management

### Key Features

- **Multi-Tenant Architecture**: Organization-based data isolation
- **Role-Based Access Control**: OWNER, ADMIN, MEMBER, VIEWER roles
- **Plan-Based Quotas**: FREE, PRO, ENTERPRISE tiers with different limits
- **Rate Limiting**: Prevents API abuse with plan-based limits
- **Comprehensive Audit Logging**: Track all actions for compliance
- **OAuth Support**: Google and GitHub authentication
- **Secure by Default**: JWT tokens, HTTPS, CORS protection

### Technology Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript 5.6.3 (strict mode)
- **Database**: MongoDB with Prisma ORM
- **Authentication**: NextAuth.js 4.24.10 (JWT strategy)
- **Authorization**: Custom RBAC system
- **Payment Processing**: Stripe integration

---

## Quick Start

### 1. Get Your API Token

**Option A: Sign in with OAuth (Recommended)**

```javascript
import { signIn } from 'next-auth/react';

// Sign in with Google
await signIn('google', { callbackUrl: '/dashboard' });

// Sign in with GitHub
await signIn('github', { callbackUrl: '/dashboard' });
```

**Option B: Sign in with Credentials**

```bash
curl -X POST "https://api.nextcrm.io/api/auth/callback/credentials" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "yourpassword"
  }'
```

**Option C: Extract Token from Session**

```javascript
import { useSession } from 'next-auth/react';

const { data: session } = useSession();
const token = session?.user?.id; // Use session data
```

### 2. Make Your First API Request

```bash
curl -X GET "https://api.nextcrm.io/api/crm/account" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**

```json
[
  {
    "id": "60d5ec49f1b2c8b1f8e4e1a1",
    "name": "Acme Corporation",
    "email": "contact@acme.com",
    "status": "Active",
    "createdAt": "2025-01-15T10:00:00.000Z"
  }
]
```

### 3. Create a Resource

```bash
curl -X POST "https://api.nextcrm.io/api/crm/account" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Company",
    "email": "info@newcompany.com",
    "website": "https://newcompany.com"
  }'
```

---

## Base URLs

Choose the appropriate base URL for your environment:

| Environment | Base URL | Use Case |
|------------|----------|----------|
| **Production** | `https://api.nextcrm.io/api` | Live applications |
| **Demo** | `https://demo.nextcrm.io/api` | Testing and demos |
| **Development** | `http://localhost:3000/api` | Local development |

**Example:**

```javascript
const baseUrl = process.env.NODE_ENV === 'production'
  ? 'https://api.nextcrm.io/api'
  : 'http://localhost:3000/api';
```

---

## Authentication

NextCRM uses **JWT Bearer tokens** for authentication. Include the token in the `Authorization` header for all API requests.

### Authentication Header

```
Authorization: Bearer <your-jwt-token>
```

### Token Lifecycle

- **Creation**: Automatically created during sign-in
- **Expiration**: 24 hours after creation
- **Refresh**: POST `/api/auth/session` to get new token
- **Revocation**: Change user status to INACTIVE

### Example: Authenticated Request

```javascript
const response = await fetch('https://api.nextcrm.io/api/crm/account', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

**Detailed Authentication Guide:** [AUTHENTICATION.md](./AUTHENTICATION.md)

---

## Common Tasks

### Create an Account

```bash
curl -X POST "https://api.nextcrm.io/api/crm/account" \
  -H "Authorization: Bearer JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Acme Corporation",
    "email": "contact@acme.com",
    "website": "https://acme.com",
    "billing_city": "San Francisco",
    "billing_state": "CA",
    "billing_country": "USA"
  }'
```

### List All Leads

```bash
curl -X GET "https://api.nextcrm.io/api/crm/leads?limit=50&offset=0" \
  -H "Authorization: Bearer JWT_TOKEN"
```

### Create a Lead

```bash
curl -X POST "https://api.nextcrm.io/api/crm/leads" \
  -H "Authorization: Bearer JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "John",
    "last_name": "Doe",
    "email": "john.doe@example.com",
    "company": "Example Corp",
    "status": "NEW"
  }'
```

### Update a Contact

```bash
curl -X PUT "https://api.nextcrm.io/api/crm/contacts/CONTACT_ID" \
  -H "Authorization: Bearer JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "position": "Senior VP of Sales",
    "office_phone": "+1-555-0199"
  }'
```

### Create a Project

```bash
curl -X POST "https://api.nextcrm.io/api/projects" \
  -H "Authorization: Bearer JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Website Redesign",
    "description": "Redesign company website",
    "visibility": "private"
  }'
```

### Get Organization Details

```bash
curl -X GET "https://api.nextcrm.io/api/organization" \
  -H "Authorization: Bearer JWT_TOKEN"
```

### Get Subscription Details (Owner Only)

```bash
curl -X GET "https://api.nextcrm.io/api/billing/subscription" \
  -H "Authorization: Bearer JWT_TOKEN"
```

**More Examples:** [REST-API.md](./REST-API.md)

---

## Rate Limiting

NextCRM enforces plan-based rate limiting to prevent API abuse:

| Plan | Rate Limit | Reset Interval |
|------|-----------|----------------|
| FREE | 100 requests/hour | Every hour |
| PRO | 1,000 requests/hour | Every hour |
| ENTERPRISE | 10,000 requests/hour | Every hour |

### Rate Limit Headers

All responses include rate limit information:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 875
X-RateLimit-Reset: 1705939200
```

### Handling Rate Limits

```javascript
async function makeApiRequest(url, options) {
  const response = await fetch(url, options);

  if (response.status === 429) {
    const resetTime = parseInt(response.headers.get('X-RateLimit-Reset'));
    const waitTime = resetTime - Math.floor(Date.now() / 1000);

    console.log(`Rate limit exceeded. Retrying in ${waitTime} seconds...`);

    await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
    return makeApiRequest(url, options); // Retry
  }

  return response;
}
```

**Detailed Rate Limit Guide:** [AUTHENTICATION.md#rate-limits-by-auth-type](./AUTHENTICATION.md#rate-limits-by-auth-type)

---

## Response Format

### Success Response

```json
{
  "data": {
    "id": "60d5ec49f1b2c8b1f8e4e1a1",
    "name": "Acme Corporation",
    "status": "Active"
  },
  "meta": {
    "timestamp": "2025-01-15T10:30:00.000Z",
    "requestId": "req_123abc",
    "version": "3.0.0-alpha"
  }
}
```

### List Response (with Pagination)

```json
{
  "data": [
    { "id": "1", "name": "Item 1" },
    { "id": "2", "name": "Item 2" }
  ],
  "meta": {
    "total": 150,
    "limit": 20,
    "offset": 0,
    "timestamp": "2025-01-15T10:30:00.000Z"
  }
}
```

### Error Response

```json
{
  "error": "Bad Request",
  "message": "Name and slug are required",
  "code": "INVALID_REQUEST",
  "details": {
    "missingFields": ["name", "slug"]
  },
  "meta": {
    "timestamp": "2025-01-15T10:30:00.000Z",
    "requestId": "req_123abc"
  }
}
```

---

## Error Handling

NextCRM uses standard HTTP status codes:

| Status | Meaning | Action |
|--------|---------|--------|
| 200 | OK | Request succeeded |
| 201 | Created | Resource created |
| 400 | Bad Request | Fix request parameters |
| 401 | Unauthorized | Check authentication |
| 403 | Forbidden | Insufficient permissions or quota exceeded |
| 404 | Not Found | Resource not found |
| 429 | Rate Limited | Wait and retry |
| 500 | Server Error | Retry or contact support |

### Common Error Codes

- `UNAUTHORIZED` - Missing or invalid token
- `QUOTA_EXCEEDED` - Resource limit reached, upgrade plan
- `RATE_LIMIT_EXCEEDED` - Too many requests, wait and retry
- `VALIDATION_ERROR` - Invalid data format
- `NOT_FOUND` - Resource doesn't exist or no access
- `FORBIDDEN` - Insufficient permissions

**Complete Error Reference:** [ERROR_CODES.md](./ERROR_CODES.md)

---

## SDKs and Tools

### Import OpenAPI Spec

The `openapi.json` file can be imported into various API tools:

**Postman:**
1. Open Postman
2. Click **Import**
3. Select `openapi.json`
4. Collection automatically generated with all endpoints

**Swagger UI:**
```bash
docker run -p 8080:8080 \
  -e SWAGGER_JSON=/api/openapi.json \
  -v $(pwd):/api \
  swaggerapi/swagger-ui
```

**OpenAPI Generator (Generate Client SDK):**

```bash
# Generate TypeScript client
openapi-generator-cli generate \
  -i openapi.json \
  -g typescript-fetch \
  -o ./sdk/typescript

# Generate Python client
openapi-generator-cli generate \
  -i openapi.json \
  -g python \
  -o ./sdk/python
```

### cURL Examples

All endpoints include cURL examples in the documentation. Copy and paste with your token:

```bash
# Set your token as environment variable
export NEXTCRM_TOKEN="your-jwt-token-here"

# Use in requests
curl -X GET "https://api.nextcrm.io/api/crm/account" \
  -H "Authorization: Bearer $NEXTCRM_TOKEN"
```

### JavaScript/TypeScript

**Using Fetch API:**

```typescript
const apiClient = {
  baseUrl: 'https://api.nextcrm.io/api',
  token: 'your-jwt-token',

  async request(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'API request failed');
    }

    return response.json();
  },

  // Convenience methods
  get(endpoint: string) {
    return this.request(endpoint);
  },

  post(endpoint: string, data: any) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  put(endpoint: string, data: any) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  delete(endpoint: string) {
    return this.request(endpoint, {
      method: 'DELETE'
    });
  }
};

// Usage
const accounts = await apiClient.get('/crm/account');
const newAccount = await apiClient.post('/crm/account', {
  name: 'Acme Corp',
  email: 'info@acme.com'
});
```

### Python

```python
import requests

class NextCRMClient:
    def __init__(self, token, base_url='https://api.nextcrm.io/api'):
        self.base_url = base_url
        self.headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }

    def get(self, endpoint):
        response = requests.get(f'{self.base_url}{endpoint}', headers=self.headers)
        response.raise_for_status()
        return response.json()

    def post(self, endpoint, data):
        response = requests.post(f'{self.base_url}{endpoint}', json=data, headers=self.headers)
        response.raise_for_status()
        return response.json()

    def put(self, endpoint, data):
        response = requests.put(f'{self.base_url}{endpoint}', json=data, headers=self.headers)
        response.raise_for_status()
        return response.json()

    def delete(self, endpoint):
        response = requests.delete(f'{self.base_url}{endpoint}', headers=self.headers)
        response.raise_for_status()
        return response.json()

# Usage
client = NextCRMClient('your-jwt-token')
accounts = client.get('/crm/account')
new_account = client.post('/crm/account', {
    'name': 'Acme Corp',
    'email': 'info@acme.com'
})
```

---

## Support

### Documentation

- **REST API Reference**: [REST-API.md](./REST-API.md)
- **Authentication Guide**: [AUTHENTICATION.md](./AUTHENTICATION.md)
- **Error Codes**: [ERROR_CODES.md](./ERROR_CODES.md)
- **OpenAPI Spec**: [openapi.json](./openapi.json)

### Community

- **GitHub**: [github.com/DrivenIdeaLab/nextcrm-app](https://github.com/DrivenIdeaLab/nextcrm-app)
- **Issues**: Report bugs and request features on GitHub Issues
- **Discussions**: Join GitHub Discussions for questions and community support

### Contact

- **Email**: support@nextcrm.io
- **Website**: https://nextcrm.io
- **Demo**: https://demo.nextcrm.io

### API Status

Check API status and uptime:
- **Status Page**: https://status.nextcrm.io (if available)
- **Health Check**: GET `/api/health`

```bash
curl https://api.nextcrm.io/api/health
```

**Response:**

```json
{
  "status": "ok",
  "timestamp": "2025-01-15T10:00:00.000Z",
  "version": "3.0.0-alpha"
}
```

---

## API Changelog

### Version 3.0.0-alpha (Current)

**Features:**
- ✅ Multi-tenant architecture with organization isolation
- ✅ Role-based access control (OWNER, ADMIN, MEMBER, VIEWER)
- ✅ Plan-based quotas (FREE, PRO, ENTERPRISE)
- ✅ Rate limiting with plan-based limits
- ✅ Comprehensive audit logging
- ✅ OAuth support (Google, GitHub)
- ✅ Stripe billing integration
- ✅ 27+ API endpoints covering CRM, projects, billing, admin

**Endpoints:**
- CRM: Accounts, Leads, Contacts, Opportunities
- Projects: Boards, Sections, Tasks
- Organization: Management, Members, Invitations, Audit Logs
- Billing: Subscriptions, Checkout, Portal
- Admin: Dashboard, User Management, Module Control

---

## Development Roadmap

### Upcoming Features

- [ ] **Webhooks**: Subscribe to real-time events (account created, lead updated, etc.)
- [ ] **Batch Operations**: Create/update/delete multiple resources in one request
- [ ] **GraphQL API**: Alternative to REST for complex queries
- [ ] **API Keys**: Service-to-service authentication without user sessions
- [ ] **Pagination Cursors**: More efficient pagination for large datasets
- [ ] **Field Filtering**: Select only needed fields (`?fields=id,name,email`)
- [ ] **Search API**: Full-text search across all resources
- [ ] **Export API**: Bulk data export in CSV/JSON formats
- [ ] **Webhooks Management**: CRUD operations for webhook subscriptions
- [ ] **API Versioning**: Explicit version in URL (`/v1/crm/account`)

---

## Best Practices

### 1. Use HTTPS in Production

Always use HTTPS to protect JWT tokens and sensitive data:

```javascript
// ✅ Correct
const baseUrl = 'https://api.nextcrm.io/api';

// ❌ Insecure - tokens visible in network traffic
const baseUrl = 'http://api.nextcrm.io/api';
```

### 2. Store Tokens Securely

```javascript
// ✅ Server-side: HTTP-only cookies (automatic via NextAuth)
// ✅ Client-side: Session storage (cleared on tab close)
sessionStorage.setItem('token', token);

// ❌ Avoid localStorage (XSS vulnerability)
localStorage.setItem('token', token);
```

### 3. Implement Exponential Backoff

```javascript
async function requestWithRetry(url, options, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);

      if (response.ok) return await response.json();

      if (response.status >= 500) {
        const waitTime = Math.pow(2, i) * 1000; // 1s, 2s, 4s
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }

      throw new Error(`Request failed: ${response.status}`);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
    }
  }
}
```

### 4. Cache Responses

```javascript
const cache = new Map();

async function getCachedData(endpoint, ttl = 60000) {
  const cached = cache.get(endpoint);

  if (cached && Date.now() - cached.timestamp < ttl) {
    return cached.data;
  }

  const data = await apiClient.get(endpoint);

  cache.set(endpoint, {
    data,
    timestamp: Date.now()
  });

  return data;
}
```

### 5. Handle Errors Gracefully

```javascript
try {
  const data = await apiClient.post('/crm/account', accountData);
  showSuccessMessage('Account created successfully');
} catch (error) {
  if (error.code === 'QUOTA_EXCEEDED') {
    showUpgradeModal();
  } else if (error.code === 'VALIDATION_ERROR') {
    showFieldErrors(error.details);
  } else {
    showGenericError(error.message);
  }
}
```

---

## Getting Started Checklist

- [ ] Read [REST API Reference](./REST-API.md)
- [ ] Obtain JWT token (OAuth or credentials)
- [ ] Test authentication with `/api/health` endpoint
- [ ] Create your first account via POST `/crm/account`
- [ ] Retrieve accounts via GET `/crm/account`
- [ ] Review rate limits for your plan
- [ ] Implement error handling
- [ ] Set up monitoring for API usage
- [ ] Join GitHub Discussions for support

---

**Welcome to NextCRM API!** We're excited to see what you build. If you have questions, issues, or feedback, please reach out via GitHub or email.

**Happy Coding!**

---

**Generated with Claude Code**
**Version:** 3.0.0-alpha
**Last Updated:** 2025-01-15
