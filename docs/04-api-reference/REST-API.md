# NextCRM REST API Reference

## Table of Contents

- [Overview](#overview)
- [Base URLs](#base-urls)
- [Authentication](#authentication)
- [Rate Limiting](#rate-limiting)
- [Response Format](#response-format)
- [Error Handling](#error-handling)
- [CRM - Accounts](#crm---accounts)
- [CRM - Leads](#crm---leads)
- [CRM - Contacts](#crm---contacts)
- [CRM - Opportunities](#crm---opportunities)
- [Projects](#projects)
- [Organization](#organization)
- [Billing](#billing)
- [Admin](#admin)
- [Users](#users)

---

## Overview

The NextCRM API is a RESTful API that provides programmatic access to all CRM features including accounts, contacts, leads, opportunities, invoices, projects, and document management. The API uses JSON for request and response bodies, JWT tokens for authentication, and follows HTTP status code conventions.

**Current Version:** 3.0.0-alpha

**Technology Stack:**
- Framework: Next.js 15 (App Router)
- Language: TypeScript 5.6.3
- Database: MongoDB with Prisma ORM
- Authentication: NextAuth.js 4.24.10 (JWT strategy)
- Authorization: Multi-tenant RBAC (OWNER, ADMIN, MEMBER, VIEWER)

---

## Base URLs

| Environment | Base URL |
|------------|----------|
| Production | `https://api.nextcrm.io/api` |
| Demo | `https://demo.nextcrm.io/api` |
| Local Development | `http://localhost:3000/api` |

---

## Authentication

All API requests (except `/health`, `/webhooks/*`, and `/auth/*`) require authentication via JWT Bearer token.

### Obtaining a Token

NextCRM uses NextAuth.js for authentication. To obtain a token:

1. **Sign in via OAuth (Google/GitHub):**
   - Navigate to `/api/auth/signin`
   - Complete OAuth flow
   - Token is stored in session cookie

2. **Sign in via Credentials:**
   - POST to `/api/auth/callback/credentials`
   - Body: `{ email: "user@example.com", password: "yourpassword" }`
   - Token is returned in session

3. **Extract Token:**
   ```javascript
   // Client-side
   import { useSession } from 'next-auth/react';
   const { data: session } = useSession();
   const token = session?.accessToken; // JWT token
   ```

### Using the Token

Include the JWT token in the `Authorization` header for all API requests:

```bash
Authorization: Bearer <your-jwt-token>
```

### Token Expiration

JWT tokens expire after **24 hours**. To refresh:

```bash
POST /api/auth/session
```

This returns a new session with a fresh token.

---

## Rate Limiting

NextCRM implements plan-based rate limiting to prevent API abuse:

| Plan | Rate Limit | Quota Reset |
|------|-----------|-------------|
| FREE | 100 requests/hour | Every hour |
| PRO | 1,000 requests/hour | Every hour |
| ENTERPRISE | 10,000 requests/hour | Every hour |

### Rate Limit Headers

All API responses include rate limit information:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 75
X-RateLimit-Reset: 1705939200
```

### Rate Limit Exceeded (429)

When rate limit is exceeded, the API returns:

```json
{
  "error": "Too Many Requests",
  "message": "Rate limit exceeded. Please try again in 3600 seconds.",
  "code": "RATE_LIMIT_EXCEEDED",
  "details": {
    "limit": 100,
    "remaining": 0,
    "resetTime": 1705939200,
    "retryAfter": 3600
  }
}
```

**Response Headers:**
- `Retry-After`: Seconds to wait before retrying

### Bypassed Endpoints

The following endpoints bypass rate limiting:
- `/api/health` (health checks)
- `/api/webhooks/*` (webhook handlers with signature verification)
- `/api/cron/*` (cron jobs with CRON_SECRET verification)

---

## Response Format

### Success Response

Successful API responses follow this structure:

```json
{
  "data": { ... },
  "meta": {
    "timestamp": "2025-01-15T10:30:00Z",
    "requestId": "req_123abc",
    "version": "3.0.0-alpha"
  }
}
```

For list endpoints with pagination:

```json
{
  "data": [...],
  "meta": {
    "total": 150,
    "limit": 20,
    "offset": 0,
    "timestamp": "2025-01-15T10:30:00Z",
    "requestId": "req_123abc"
  }
}
```

### Error Response

Error responses follow this structure:

```json
{
  "error": "ERROR_CODE",
  "message": "Human readable error message",
  "code": "MACHINE_READABLE_CODE",
  "details": {
    "field": "specific error details"
  },
  "meta": {
    "timestamp": "2025-01-15T10:30:00Z",
    "requestId": "req_123abc"
  }
}
```

---

## Error Handling

NextCRM uses standard HTTP status codes:

| Status Code | Meaning | Example |
|------------|---------|---------|
| 200 | OK | Request succeeded |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid parameters or malformed request |
| 401 | Unauthorized | Missing or invalid authentication token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found or unauthorized |
| 409 | Conflict | Resource already exists or state conflict |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Unexpected server error |

See [ERROR_CODES.md](./ERROR_CODES.md) for detailed error code reference.

---

## CRM - Accounts

CRM accounts represent companies or organizations in the system.

### List All Accounts

Retrieve a list of all CRM accounts in your organization.

**Endpoint:** `GET /crm/account`

**Authorization:** Authenticated users (any role)

**Rate Limit:** Plan-based (100/1000/10000 requests per hour)

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| limit | integer | No | 20 | Maximum accounts to return (1-100) |
| offset | integer | No | 0 | Number of accounts to skip (pagination) |

**Example Request:**

```bash
curl -X GET "https://api.nextcrm.io/api/crm/account?limit=50&offset=0" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Example Response:**

```json
[
  {
    "id": "60d5ec49f1b2c8b1f8e4e1a1",
    "organizationId": "60d5ec49f1b2c8b1f8e4e1a0",
    "name": "Acme Corporation",
    "email": "contact@acme.com",
    "office_phone": "+1-555-0123",
    "website": "https://acme.com",
    "billing_street": "123 Main St",
    "billing_city": "San Francisco",
    "billing_state": "CA",
    "billing_postal_code": "94102",
    "billing_country": "USA",
    "status": "Active",
    "assigned_to": "60d5ec49f1b2c8b1f8e4e1a2",
    "industry": "60d5ec49f1b2c8b1f8e4e1a3",
    "annual_revenue": "5000000",
    "watchers": ["60d5ec49f1b2c8b1f8e4e1a2"],
    "createdAt": "2025-01-15T10:00:00.000Z",
    "updatedAt": "2025-01-15T10:30:00.000Z",
    "createdBy": "60d5ec49f1b2c8b1f8e4e1a2",
    "updatedBy": "60d5ec49f1b2c8b1f8e4e1a2"
  }
]
```

**Response Fields:**

- `id` (string): Account ID (MongoDB ObjectId)
- `organizationId` (string): Organization ID (multi-tenancy key)
- `name` (string): Account name (required)
- `email` (string, nullable): Primary email address
- `office_phone` (string, nullable): Office phone number
- `website` (string, nullable): Company website URL
- `billing_*` (string, nullable): Billing address fields
- `shipping_*` (string, nullable): Shipping address fields
- `status` (string): Account status (default: "Active")
- `assigned_to` (string, nullable): Assigned user ID
- `industry` (string, nullable): Industry type ID (reference to crm_Industry_Type)
- `annual_revenue` (string, nullable): Annual revenue
- `watchers` (array): List of user IDs watching this account
- `createdAt` (datetime): Creation timestamp
- `updatedAt` (datetime): Last update timestamp
- `createdBy` (string): User ID who created the account
- `updatedBy` (string): User ID who last updated the account

---

### Create a New Account

Create a new CRM account.

**Endpoint:** `POST /crm/account`

**Authorization:** Authenticated users (any role)

**Rate Limit:** Plan-based

**Quota Limits:**
- FREE: 10 accounts
- PRO: 100 accounts
- ENTERPRISE: Unlimited

**Request Body:**

```json
{
  "name": "Acme Corporation",
  "email": "contact@acme.com",
  "office_phone": "+1-555-0123",
  "website": "https://acme.com",
  "billing_street": "123 Main St",
  "billing_city": "San Francisco",
  "billing_state": "CA",
  "billing_postal_code": "94102",
  "billing_country": "USA",
  "shipping_street": "123 Main St",
  "shipping_city": "San Francisco",
  "shipping_state": "CA",
  "shipping_postal_code": "94102",
  "shipping_country": "USA",
  "description": "Leading technology company",
  "assigned_to": "60d5ec49f1b2c8b1f8e4e1a2",
  "status": "Active",
  "annual_revenue": "5000000",
  "industry": "60d5ec49f1b2c8b1f8e4e1a3",
  "company_id": "123456789",
  "vat": "US123456789",
  "fax": "+1-555-0124",
  "member_of": "parent_account_id"
}
```

**Required Fields:**
- `name` (string): Account name

**Optional Fields:**
- All other account fields are optional

**Example Request:**

```bash
curl -X POST "https://api.nextcrm.io/api/crm/account" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Acme Corporation",
    "email": "contact@acme.com",
    "website": "https://acme.com"
  }'
```

**Example Response:**

```json
{
  "newAccount": {
    "id": "60d5ec49f1b2c8b1f8e4e1a1",
    "organizationId": "60d5ec49f1b2c8b1f8e4e1a0",
    "name": "Acme Corporation",
    "email": "contact@acme.com",
    "website": "https://acme.com",
    "status": "Active",
    "createdAt": "2025-01-15T10:00:00.000Z",
    "createdBy": "60d5ec49f1b2c8b1f8e4e1a2",
    "updatedBy": "60d5ec49f1b2c8b1f8e4e1a2"
  }
}
```

**Error Responses:**

- `401 Unauthorized`: No valid authentication token
- `403 Quota Exceeded`: Account limit reached for current plan
- `500 Internal Server Error`: Database or server error

**Quota Exceeded Example:**

```json
{
  "error": "Account limit reached",
  "message": "Your organization has reached the maximum number of accounts for the FREE plan (10 accounts). Please upgrade to PRO for 100 accounts.",
  "code": "QUOTA_EXCEEDED",
  "requiresUpgrade": true
}
```

---

### Update an Account

Update an existing CRM account.

**Endpoint:** `PUT /crm/account`

**Authorization:** Authenticated users (any role)

**Multi-Tenancy:** Only accounts belonging to the user's organization can be updated

**Request Body:**

```json
{
  "id": "60d5ec49f1b2c8b1f8e4e1a1",
  "name": "Acme Corporation Inc.",
  "email": "newemail@acme.com",
  "status": "Inactive"
}
```

**Required Fields:**
- `id` (string): Account ID to update
- `name` (string): Account name

**Example Request:**

```bash
curl -X PUT "https://api.nextcrm.io/api/crm/account" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "60d5ec49f1b2c8b1f8e4e1a1",
    "name": "Acme Corporation Inc.",
    "status": "Inactive"
  }'
```

**Example Response:**

```json
{
  "newAccount": {
    "id": "60d5ec49f1b2c8b1f8e4e1a1",
    "name": "Acme Corporation Inc.",
    "status": "Inactive",
    "updatedAt": "2025-01-15T11:00:00.000Z",
    "updatedBy": "60d5ec49f1b2c8b1f8e4e1a2"
  }
}
```

**Error Responses:**

- `401 Unauthorized`: No valid authentication token
- `404 Not Found`: Account not found or user doesn't have access (multi-tenancy check)
- `500 Internal Server Error`: Database or server error

---

### Get Account by ID

Retrieve a single account by its ID.

**Endpoint:** `GET /crm/account/{accountId}`

**Authorization:** Authenticated users (any role)

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| accountId | string | Yes | Account ID (MongoDB ObjectId, 24 hex characters) |

**Example Request:**

```bash
curl -X GET "https://api.nextcrm.io/api/crm/account/60d5ec49f1b2c8b1f8e4e1a1" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Example Response:**

```json
{
  "id": "60d5ec49f1b2c8b1f8e4e1a1",
  "organizationId": "60d5ec49f1b2c8b1f8e4e1a0",
  "name": "Acme Corporation",
  "email": "contact@acme.com",
  "status": "Active",
  "assigned_to": "60d5ec49f1b2c8b1f8e4e1a2",
  "watchers": ["60d5ec49f1b2c8b1f8e4e1a2"],
  "createdAt": "2025-01-15T10:00:00.000Z"
}
```

**Error Responses:**

- `401 Unauthorized`: No valid authentication token
- `404 Not Found`: Account not found or unauthorized access

---

### Delete an Account

Delete a CRM account and all associated data.

**Endpoint:** `DELETE /crm/account/{accountId}`

**Authorization:** Authenticated users (OWNER or ADMIN recommended)

**Warning:** This operation is irreversible and will cascade delete:
- Associated contacts
- Associated opportunities
- Associated invoices
- Associated tasks
- Associated documents (references only, files remain)

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| accountId | string | Yes | Account ID (MongoDB ObjectId) |

**Example Request:**

```bash
curl -X DELETE "https://api.nextcrm.io/api/crm/account/60d5ec49f1b2c8b1f8e4e1a1" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Example Response:**

```json
{
  "message": "Account deleted successfully",
  "id": "60d5ec49f1b2c8b1f8e4e1a1"
}
```

**Error Responses:**

- `401 Unauthorized`: No valid authentication token
- `404 Not Found`: Account not found or unauthorized
- `500 Internal Server Error`: Database error

---

### Watch an Account

Add the current user to the account's watchers list to receive notifications about changes.

**Endpoint:** `POST /crm/account/{accountId}/watch`

**Authorization:** Authenticated users (any role)

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| accountId | string | Yes | Account ID to watch |

**Example Request:**

```bash
curl -X POST "https://api.nextcrm.io/api/crm/account/60d5ec49f1b2c8b1f8e4e1a1/watch" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Example Response:**

```json
{
  "message": "Account watched successfully",
  "accountId": "60d5ec49f1b2c8b1f8e4e1a1",
  "watcherId": "60d5ec49f1b2c8b1f8e4e1a2"
}
```

**Error Responses:**

- `401 Unauthorized`: No valid authentication token
- `404 Not Found`: Account not found

---

### Unwatch an Account

Remove the current user from the account's watchers list.

**Endpoint:** `POST /crm/account/{accountId}/unwatch`

**Authorization:** Authenticated users (any role)

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| accountId | string | Yes | Account ID to unwatch |

**Example Request:**

```bash
curl -X POST "https://api.nextcrm.io/api/crm/account/60d5ec49f1b2c8b1f8e4e1a1/unwatch" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Example Response:**

```json
{
  "message": "Account unwatched successfully",
  "accountId": "60d5ec49f1b2c8b1f8e4e1a1"
}
```

---

## CRM - Leads

Leads represent potential customers or business opportunities in the early stages.

### Create a New Lead

Create a new lead in the CRM system.

**Endpoint:** `POST /crm/leads`

**Authorization:** Authenticated users (any role)

**Rate Limit:** Plan-based

**Quota Limits:**
- FREE: 20 leads
- PRO: 500 leads
- ENTERPRISE: Unlimited

**Request Body:**

```json
{
  "first_name": "John",
  "last_name": "Doe",
  "company": "Acme Corporation",
  "jobTitle": "CTO",
  "email": "john.doe@acme.com",
  "phone": "+1-555-0123",
  "description": "Interested in our enterprise plan",
  "lead_source": "Website",
  "refered_by": "Partner ABC",
  "campaign": "Q1 2025 Campaign",
  "assigned_to": "60d5ec49f1b2c8b1f8e4e1a2",
  "accountIDs": "60d5ec49f1b2c8b1f8e4e1a1"
}
```

**Required Fields:**
- `last_name` (string): Lead last name

**Optional Fields:**
- `first_name` (string): Lead first name
- `company` (string): Company name
- `jobTitle` (string): Job title
- `email` (string): Email address
- `phone` (string): Phone number
- `description` (string): Lead description
- `lead_source` (string): Source of the lead (e.g., "Website", "Referral")
- `refered_by` (string): Referrer name
- `campaign` (string): Campaign ID or name
- `assigned_to` (string): User ID to assign (defaults to creator)
- `accountIDs` (string): Associated account ID

**Example Request:**

```bash
curl -X POST "https://api.nextcrm.io/api/crm/leads" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "John",
    "last_name": "Doe",
    "email": "john.doe@acme.com",
    "company": "Acme Corporation"
  }'
```

**Example Response:**

```json
{
  "newLead": {
    "id": "60d5ec49f1b2c8b1f8e4e1b1",
    "organizationId": "60d5ec49f1b2c8b1f8e4e1a0",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@acme.com",
    "company": "Acme Corporation",
    "status": "NEW",
    "type": "DEMO",
    "assigned_to": "60d5ec49f1b2c8b1f8e4e1a2",
    "createdAt": "2025-01-15T10:00:00.000Z"
  }
}
```

**Email Notification:**

If `assigned_to` is different from the creator, an email notification is automatically sent to the assigned user in their preferred language (English or Czech).

**Error Responses:**

- `400 Bad Request`: Missing required fields or invalid data
- `401 Unauthorized`: No valid authentication token
- `403 Quota Exceeded`: Lead limit reached for current plan
- `500 Internal Server Error`: Database or email error

---

### Update a Lead

Update an existing lead.

**Endpoint:** `PUT /crm/leads`

**Authorization:** Authenticated users (any role)

**Multi-Tenancy:** Only leads belonging to the user's organization can be updated

**Request Body:**

```json
{
  "id": "60d5ec49f1b2c8b1f8e4e1b1",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@acme.com",
  "status": "CONTACTED",
  "assigned_to": "60d5ec49f1b2c8b1f8e4e1a3"
}
```

**Required Fields:**
- `id` (string): Lead ID to update
- `lastName` (string): Lead last name

**Optional Fields:**
- All lead fields are optional (same as create)
- `status` (enum): Lead status - "NEW", "CONTACTED", "QUALIFIED", "LOST"
- `type` (enum): Lead type - "DEMO"

**Example Request:**

```bash
curl -X PUT "https://api.nextcrm.io/api/crm/leads" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "60d5ec49f1b2c8b1f8e4e1b1",
    "lastName": "Doe",
    "status": "QUALIFIED"
  }'
```

**Example Response:**

```json
{
  "updatedLead": {
    "id": "60d5ec49f1b2c8b1f8e4e1b1",
    "status": "QUALIFIED",
    "updatedAt": "2025-01-15T11:00:00.000Z"
  }
}
```

**Error Responses:**

- `400 Bad Request`: Missing required fields
- `401 Unauthorized`: No valid authentication token
- `404 Not Found`: Lead not found or unauthorized
- `500 Internal Server Error`: Database error

---

### Get Lead by ID

Retrieve a single lead by its ID.

**Endpoint:** `GET /crm/leads/{leadId}`

**Authorization:** Authenticated users (any role)

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| leadId | string | Yes | Lead ID (MongoDB ObjectId) |

**Example Request:**

```bash
curl -X GET "https://api.nextcrm.io/api/crm/leads/60d5ec49f1b2c8b1f8e4e1b1" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Example Response:**

```json
{
  "id": "60d5ec49f1b2c8b1f8e4e1b1",
  "organizationId": "60d5ec49f1b2c8b1f8e4e1a0",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@acme.com",
  "company": "Acme Corporation",
  "status": "NEW",
  "type": "DEMO",
  "assigned_to": "60d5ec49f1b2c8b1f8e4e1a2",
  "createdAt": "2025-01-15T10:00:00.000Z"
}
```

---

### Delete a Lead

Delete a lead from the system.

**Endpoint:** `DELETE /crm/leads/{leadId}`

**Authorization:** Authenticated users (OWNER or ADMIN recommended)

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| leadId | string | Yes | Lead ID (MongoDB ObjectId) |

**Example Request:**

```bash
curl -X DELETE "https://api.nextcrm.io/api/crm/leads/60d5ec49f1b2c8b1f8e4e1b1" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Example Response:**

```json
{
  "message": "Lead deleted successfully",
  "id": "60d5ec49f1b2c8b1f8e4e1b1"
}
```

---

## CRM - Contacts

Contacts represent individual people associated with accounts.

### List All Contacts

Retrieve a list of all contacts in your organization.

**Endpoint:** `GET /crm/contacts`

**Authorization:** Authenticated users (any role)

**Example Request:**

```bash
curl -X GET "https://api.nextcrm.io/api/crm/contacts" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Example Response:**

```json
[
  {
    "id": "60d5ec49f1b2c8b1f8e4e1c1",
    "organizationId": "60d5ec49f1b2c8b1f8e4e1a0",
    "first_name": "Jane",
    "last_name": "Smith",
    "email": "jane.smith@acme.com",
    "personal_email": "jane@personal.com",
    "office_phone": "+1-555-0123",
    "mobile_phone": "+1-555-0124",
    "position": "VP of Sales",
    "account": "60d5ec49f1b2c8b1f8e4e1a1",
    "assigned_to": "60d5ec49f1b2c8b1f8e4e1a2",
    "status": true,
    "type": "Customer",
    "social_linkedin": "https://linkedin.com/in/janesmith",
    "tags": ["vip", "decision-maker"],
    "createdAt": "2025-01-15T10:00:00.000Z"
  }
]
```

---

### Create a New Contact

Create a new contact in the CRM system.

**Endpoint:** `POST /crm/contacts`

**Authorization:** Authenticated users (any role)

**Request Body:**

```json
{
  "first_name": "Jane",
  "last_name": "Smith",
  "email": "jane.smith@acme.com",
  "personal_email": "jane@personal.com",
  "office_phone": "+1-555-0123",
  "mobile_phone": "+1-555-0124",
  "website": "https://janesmith.com",
  "position": "VP of Sales",
  "birthday": "1985-05-15",
  "description": "Key decision maker",
  "account": "60d5ec49f1b2c8b1f8e4e1a1",
  "assigned_to": "60d5ec49f1b2c8b1f8e4e1a2",
  "type": "Customer",
  "social_twitter": "@janesmith",
  "social_linkedin": "https://linkedin.com/in/janesmith"
}
```

**Required Fields:**
- `last_name` (string): Contact last name

**Optional Fields:**
- `first_name` (string): Contact first name
- `email` (string): Business email
- `personal_email` (string): Personal email
- `office_phone` (string): Office phone
- `mobile_phone` (string): Mobile phone
- `website` (string): Personal website
- `position` (string): Job position
- `birthday` (string): Birthday (any format)
- `description` (string): Contact description
- `account` (string): Associated account ID
- `assigned_to` (string): Assigned user ID
- `type` (enum): Contact type - "Customer", "Partner", "Vendor", "Prospect"
- `social_*` (string): Social media handles (twitter, facebook, linkedin, skype, instagram, youtube, tiktok)

**Example Request:**

```bash
curl -X POST "https://api.nextcrm.io/api/crm/contacts" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Jane",
    "last_name": "Smith",
    "email": "jane.smith@acme.com",
    "position": "VP of Sales"
  }'
```

**Example Response:**

```json
{
  "id": "60d5ec49f1b2c8b1f8e4e1c1",
  "organizationId": "60d5ec49f1b2c8b1f8e4e1a0",
  "first_name": "Jane",
  "last_name": "Smith",
  "email": "jane.smith@acme.com",
  "position": "VP of Sales",
  "status": true,
  "type": "Customer",
  "createdAt": "2025-01-15T10:00:00.000Z"
}
```

---

### Update a Contact

Update an existing contact.

**Endpoint:** `PUT /crm/contacts/{contactId}`

**Authorization:** Authenticated users (any role)

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| contactId | string | Yes | Contact ID (MongoDB ObjectId) |

**Request Body:**

```json
{
  "first_name": "Jane",
  "last_name": "Smith",
  "position": "Senior VP of Sales",
  "status": true
}
```

**Example Request:**

```bash
curl -X PUT "https://api.nextcrm.io/api/crm/contacts/60d5ec49f1b2c8b1f8e4e1c1" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "position": "Senior VP of Sales"
  }'
```

---

### Get Contact by ID

Retrieve a single contact by its ID.

**Endpoint:** `GET /crm/contacts/{contactId}`

**Authorization:** Authenticated users (any role)

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| contactId | string | Yes | Contact ID (MongoDB ObjectId) |

**Example Request:**

```bash
curl -X GET "https://api.nextcrm.io/api/crm/contacts/60d5ec49f1b2c8b1f8e4e1c1" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

### Delete a Contact

Delete a contact from the system.

**Endpoint:** `DELETE /crm/contacts/{contactId}`

**Authorization:** Authenticated users (OWNER or ADMIN recommended)

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| contactId | string | Yes | Contact ID (MongoDB ObjectId) |

**Example Request:**

```bash
curl -X DELETE "https://api.nextcrm.io/api/crm/contacts/60d5ec49f1b2c8b1f8e4e1c1" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## CRM - Opportunities

Opportunities represent sales deals in progress.

### List All Opportunities

Retrieve a list of all sales opportunities.

**Endpoint:** `GET /crm/opportunity`

**Authorization:** Authenticated users (any role)

**Example Request:**

```bash
curl -X GET "https://api.nextcrm.io/api/crm/opportunity" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Example Response:**

```json
[
  {
    "id": "60d5ec49f1b2c8b1f8e4e1d1",
    "organizationId": "60d5ec49f1b2c8b1f8e4e1a0",
    "name": "Enterprise License Deal",
    "account": "60d5ec49f1b2c8b1f8e4e1a1",
    "contact": "60d5ec49f1b2c8b1f8e4e1c1",
    "assigned_to": "60d5ec49f1b2c8b1f8e4e1a2",
    "budget": 50000,
    "expected_revenue": 50000,
    "close_date": "2025-03-31T00:00:00.000Z",
    "sales_stage": "60d5ec49f1b2c8b1f8e4e1e1",
    "type": "60d5ec49f1b2c8b1f8e4e1e2",
    "status": "ACTIVE",
    "currency": "USD",
    "description": "50-user enterprise license",
    "next_step": "Send proposal",
    "createdAt": "2025-01-15T10:00:00.000Z"
  }
]
```

---

### Create a New Opportunity

Create a new sales opportunity.

**Endpoint:** `POST /crm/opportunity`

**Authorization:** Authenticated users (any role)

**Request Body:**

```json
{
  "name": "Enterprise License Deal",
  "account": "60d5ec49f1b2c8b1f8e4e1a1",
  "contact": "60d5ec49f1b2c8b1f8e4e1c1",
  "assigned_to": "60d5ec49f1b2c8b1f8e4e1a2",
  "budget": 50000,
  "expected_revenue": 50000,
  "close_date": "2025-03-31",
  "sales_stage": "60d5ec49f1b2c8b1f8e4e1e1",
  "type": "60d5ec49f1b2c8b1f8e4e1e2",
  "currency": "USD",
  "description": "50-user enterprise license",
  "next_step": "Send proposal",
  "campaign": "60d5ec49f1b2c8b1f8e4e1e3"
}
```

**Required Fields:**
- None (all fields are optional)

**Optional Fields:**
- `name` (string): Opportunity name
- `account` (string): Associated account ID
- `contact` (string): Associated contact ID
- `assigned_to` (string): Assigned user ID
- `budget` (integer): Budget amount (default: 0)
- `expected_revenue` (integer): Expected revenue (default: 0)
- `close_date` (datetime): Expected close date
- `sales_stage` (string): Sales stage ID (reference to crm_Opportunities_Sales_Stages)
- `type` (string): Opportunity type ID (reference to crm_Opportunities_Type)
- `status` (enum): Status - "ACTIVE", "INACTIVE", "PENDING", "CLOSED" (default: "ACTIVE")
- `currency` (string): Currency code (e.g., "USD", "EUR")
- `description` (string): Opportunity description
- `next_step` (string): Next action to take
- `campaign` (string): Campaign ID

**Example Request:**

```bash
curl -X POST "https://api.nextcrm.io/api/crm/opportunity" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Enterprise License Deal",
    "budget": 50000,
    "expected_revenue": 50000,
    "close_date": "2025-03-31"
  }'
```

---

### Update an Opportunity

Update an existing opportunity.

**Endpoint:** `PUT /crm/opportunity/{opportunityId}`

**Authorization:** Authenticated users (any role)

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| opportunityId | string | Yes | Opportunity ID (MongoDB ObjectId) |

**Request Body:**

```json
{
  "status": "CLOSED",
  "expected_revenue": 55000,
  "next_step": "Contract signed"
}
```

**Example Request:**

```bash
curl -X PUT "https://api.nextcrm.io/api/crm/opportunity/60d5ec49f1b2c8b1f8e4e1d1" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "CLOSED",
    "expected_revenue": 55000
  }'
```

---

### Get Opportunity by ID

Retrieve a single opportunity by its ID.

**Endpoint:** `GET /crm/opportunity/{opportunityId}`

**Authorization:** Authenticated users (any role)

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| opportunityId | string | Yes | Opportunity ID (MongoDB ObjectId) |

**Example Request:**

```bash
curl -X GET "https://api.nextcrm.io/api/crm/opportunity/60d5ec49f1b2c8b1f8e4e1d1" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

### Delete an Opportunity

Delete an opportunity from the system.

**Endpoint:** `DELETE /crm/opportunity/{opportunityId}`

**Authorization:** Authenticated users (OWNER or ADMIN recommended)

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| opportunityId | string | Yes | Opportunity ID (MongoDB ObjectId) |

**Example Request:**

```bash
curl -X DELETE "https://api.nextcrm.io/api/crm/opportunity/60d5ec49f1b2c8b1f8e4e1d1" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Projects

Project management with Kanban boards, sections, and tasks.

### Create a New Project

Create a new project board with an initial "Backlog" section.

**Endpoint:** `POST /projects`

**Authorization:** Authenticated users (any role)

**Rate Limit:** Plan-based

**Quota Limits:**
- FREE: 5 projects
- PRO: 50 projects
- ENTERPRISE: Unlimited

**Request Body:**

```json
{
  "title": "Website Redesign",
  "description": "Redesign company website with modern UI",
  "visibility": "private"
}
```

**Required Fields:**
- `title` (string): Project title
- `description` (string): Project description

**Optional Fields:**
- `visibility` (string): Project visibility (e.g., "private", "public")

**Example Request:**

```bash
curl -X POST "https://api.nextcrm.io/api/projects" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Website Redesign",
    "description": "Redesign company website",
    "visibility": "private"
  }'
```

**Example Response:**

```json
{
  "newBoard": {
    "id": "60d5ec49f1b2c8b1f8e4e1f1",
    "organizationId": "60d5ec49f1b2c8b1f8e4e1a0",
    "title": "Website Redesign",
    "description": "Redesign company website",
    "user": "60d5ec49f1b2c8b1f8e4e1a2",
    "visibility": "private",
    "position": 0,
    "sharedWith": ["60d5ec49f1b2c8b1f8e4e1a2"],
    "watchers": [],
    "createdAt": "2025-01-15T10:00:00.000Z",
    "createdBy": "60d5ec49f1b2c8b1f8e4e1a2"
  }
}
```

**Note:** A default "Backlog" section is automatically created with the project.

**Error Responses:**

- `400 Bad Request`: Missing project name or description
- `401 Unauthorized`: No valid authentication token
- `403 Quota Exceeded`: Project limit reached for current plan

---

### Update a Project

Update project details including title, description, and visibility.

**Endpoint:** `PUT /projects`

**Authorization:** Authenticated users (any role)

**Multi-Tenancy:** Only projects belonging to the user's organization can be updated

**Request Body:**

```json
{
  "id": "60d5ec49f1b2c8b1f8e4e1f1",
  "title": "Website Redesign v2",
  "description": "Updated website redesign project",
  "visibility": "public"
}
```

**Required Fields:**
- `id` (string): Project ID to update
- `title` (string): Project title
- `description` (string): Project description

**Optional Fields:**
- `visibility` (string): Project visibility

**Example Request:**

```bash
curl -X PUT "https://api.nextcrm.io/api/projects" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "60d5ec49f1b2c8b1f8e4e1f1",
    "title": "Website Redesign v2",
    "description": "Updated description",
    "visibility": "public"
  }'
```

**Example Response:**

```json
{
  "message": "Board updated successfullsy"
}
```

**Error Responses:**

- `400 Bad Request`: Missing required fields
- `401 Unauthorized`: No valid authentication token
- `404 Not Found`: Project not found or unauthorized

---

### Get Project by ID

Retrieve a project with all its sections and tasks.

**Endpoint:** `GET /projects/{projectId}`

**Authorization:** Authenticated users (any role)

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| projectId | string | Yes | Project ID (MongoDB ObjectId) |

**Example Request:**

```bash
curl -X GET "https://api.nextcrm.io/api/projects/60d5ec49f1b2c8b1f8e4e1f1" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Example Response:**

```json
{
  "id": "60d5ec49f1b2c8b1f8e4e1f1",
  "organizationId": "60d5ec49f1b2c8b1f8e4e1a0",
  "title": "Website Redesign",
  "description": "Redesign company website",
  "user": "60d5ec49f1b2c8b1f8e4e1a2",
  "visibility": "private",
  "sharedWith": ["60d5ec49f1b2c8b1f8e4e1a2"],
  "watchers": [],
  "createdAt": "2025-01-15T10:00:00.000Z"
}
```

---

### Delete a Project

Delete a project and all associated sections and tasks.

**Endpoint:** `DELETE /projects/{projectId}`

**Authorization:** Authenticated users (OWNER or ADMIN recommended)

**Warning:** This operation is irreversible and will cascade delete all sections and tasks.

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| projectId | string | Yes | Project ID (MongoDB ObjectId) |

**Example Request:**

```bash
curl -X DELETE "https://api.nextcrm.io/api/projects/60d5ec49f1b2c8b1f8e4e1f1" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

### Create a Task

Create a new task in a project section.

**Endpoint:** `POST /projects/tasks/create-task`

**Authorization:** Authenticated users (any role)

**Request Body:**

```json
{
  "title": "Design homepage mockup",
  "content": "Create wireframes and high-fidelity mockups for the homepage",
  "section": "60d5ec49f1b2c8b1f8e4e1f2",
  "position": 0,
  "priority": "high",
  "dueDateAt": "2025-01-30T00:00:00.000Z",
  "user": "60d5ec49f1b2c8b1f8e4e1a2"
}
```

**Required Fields:**
- `title` (string): Task title
- `section` (string): Section ID where task will be created
- `position` (integer): Task position in section (0 = top)
- `priority` (string): Task priority (e.g., "low", "medium", "high")

**Optional Fields:**
- `content` (string): Task description/content
- `dueDateAt` (datetime): Due date
- `user` (string): Assigned user ID

**Example Request:**

```bash
curl -X POST "https://api.nextcrm.io/api/projects/tasks/create-task" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Design homepage mockup",
    "section": "60d5ec49f1b2c8b1f8e4e1f2",
    "position": 0,
    "priority": "high"
  }'
```

**Example Response:**

```json
{
  "id": "60d5ec49f1b2c8b1f8e4e1f3",
  "organizationId": "60d5ec49f1b2c8b1f8e4e1a0",
  "title": "Design homepage mockup",
  "section": "60d5ec49f1b2c8b1f8e4e1f2",
  "position": 0,
  "priority": "high",
  "taskStatus": "ACTIVE",
  "createdAt": "2025-01-15T10:00:00.000Z"
}
```

---

### Update a Task

Update task details.

**Endpoint:** `PUT /projects/tasks/update-task/{taskId}`

**Authorization:** Authenticated users (any role)

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| taskId | string | Yes | Task ID (MongoDB ObjectId) |

**Request Body:**

```json
{
  "title": "Design homepage mockup (updated)",
  "content": "Updated description",
  "priority": "medium",
  "taskStatus": "COMPLETE"
}
```

**Optional Fields:**
- `title` (string): Task title
- `content` (string): Task description
- `section` (string): Move to different section
- `position` (integer): New position in section
- `priority` (string): Task priority
- `dueDateAt` (datetime): Due date
- `user` (string): Reassign to user
- `taskStatus` (enum): Status - "ACTIVE", "PENDING", "COMPLETE"

**Example Request:**

```bash
curl -X PUT "https://api.nextcrm.io/api/projects/tasks/update-task/60d5ec49f1b2c8b1f8e4e1f3" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "taskStatus": "COMPLETE"
  }'
```

---

## Organization

Organization management and settings.

### Get Organization Details

Retrieve the current user's organization information including owner and member list.

**Endpoint:** `GET /organization`

**Authorization:** Authenticated users (any role)

**Example Request:**

```bash
curl -X GET "https://api.nextcrm.io/api/organization" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Example Response:**

```json
{
  "id": "60d5ec49f1b2c8b1f8e4e1a0",
  "name": "Acme Corp",
  "slug": "acme-corp",
  "plan": "PRO",
  "status": "ACTIVE",
  "ownerId": "60d5ec49f1b2c8b1f8e4e1a2",
  "stripeCustomerId": "cus_123abc",
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-15T10:00:00.000Z",
  "owner": {
    "id": "60d5ec49f1b2c8b1f8e4e1a2",
    "name": "John Doe",
    "email": "john@acme.com"
  },
  "users": [
    {
      "id": "60d5ec49f1b2c8b1f8e4e1a2",
      "name": "John Doe",
      "email": "john@acme.com"
    },
    {
      "id": "60d5ec49f1b2c8b1f8e4e1a3",
      "name": "Jane Smith",
      "email": "jane@acme.com"
    }
  ]
}
```

**Response Fields:**

- `id` (string): Organization ID
- `name` (string): Organization name
- `slug` (string): URL-friendly identifier (unique)
- `plan` (enum): Subscription plan - "FREE", "PRO", "ENTERPRISE"
- `status` (enum): Organization status - "ACTIVE", "SUSPENDED", "CANCELLED"
- `ownerId` (string): Owner user ID
- `stripeCustomerId` (string, nullable): Stripe customer ID for billing
- `owner` (object): Owner user details (id, name, email)
- `users` (array): List of organization members (id, name, email)
- `createdAt` (datetime): Organization creation date
- `updatedAt` (datetime): Last update date

**Error Responses:**

- `401 Unauthorized`: No valid authentication token

**Note:** If user doesn't belong to an organization, returns `null`.

---

### Create a New Organization

Create a new organization. User must not already belong to an organization.

**Endpoint:** `POST /organization`

**Authorization:** Authenticated users

**Request Body:**

```json
{
  "name": "Acme Corporation",
  "slug": "acme-corp"
}
```

**Required Fields:**
- `name` (string): Organization name
- `slug` (string): Unique URL-friendly identifier (lowercase, alphanumeric, hyphens only)

**Validation:**
- `slug` must be unique across all organizations
- `slug` format: `^[a-z0-9-]+$` (lowercase letters, numbers, hyphens only)

**Example Request:**

```bash
curl -X POST "https://api.nextcrm.io/api/organization" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Acme Corporation",
    "slug": "acme-corp"
  }'
```

**Example Response:**

```json
{
  "id": "60d5ec49f1b2c8b1f8e4e1a0",
  "v": 0,
  "name": "Acme Corporation",
  "slug": "acme-corp",
  "ownerId": "60d5ec49f1b2c8b1f8e4e1a2",
  "plan": "FREE",
  "status": "ACTIVE",
  "createdAt": "2025-01-15T10:00:00.000Z"
}
```

**Side Effects:**
1. Organization is created with FREE plan and ACTIVE status
2. Current user is automatically assigned as owner
3. User's `organizationId` field is updated to link to new organization

**Error Responses:**

- `400 Bad Request`: Missing name/slug, slug already exists, or user already belongs to an organization
- `401 Unauthorized`: No valid authentication token
- `404 Not Found`: User not found in database

**Error Examples:**

```json
{
  "error": "Bad Request",
  "message": "Name and slug are required",
  "code": "INVALID_REQUEST"
}
```

```json
{
  "error": "Bad Request",
  "message": "Organization slug already exists",
  "code": "SLUG_EXISTS"
}
```

```json
{
  "error": "Bad Request",
  "message": "User already belongs to an organization",
  "code": "USER_HAS_ORG"
}
```

---

### Update Organization

Update organization details. Only organization owner or admin can update.

**Endpoint:** `PUT /organization`

**Authorization:** Organization OWNER or system admin

**Request Body:**

```json
{
  "name": "Acme Corporation Inc."
}
```

**Required Fields:**
- `name` (string): Organization name

**Example Request:**

```bash
curl -X PUT "https://api.nextcrm.io/api/organization" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Acme Corporation Inc."
  }'
```

**Example Response:**

```json
{
  "id": "60d5ec49f1b2c8b1f8e4e1a0",
  "name": "Acme Corporation Inc.",
  "slug": "acme-corp",
  "plan": "PRO",
  "status": "ACTIVE",
  "updatedAt": "2025-01-15T11:00:00.000Z"
}
```

**Error Responses:**

- `400 Bad Request`: Missing name or user doesn't belong to an organization
- `401 Unauthorized`: No valid authentication token
- `403 Forbidden`: User is not organization owner or admin
- `404 Not Found`: Organization not found

---

### List Organization Members

Get a list of all members in the organization.

**Endpoint:** `GET /organization/members`

**Authorization:** Authenticated users (any role)

**Example Request:**

```bash
curl -X GET "https://api.nextcrm.io/api/organization/members" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Example Response:**

```json
[
  {
    "id": "60d5ec49f1b2c8b1f8e4e1a2",
    "name": "John Doe",
    "email": "john@acme.com",
    "username": "johndoe",
    "avatar": "https://example.com/avatar.jpg",
    "userStatus": "ACTIVE",
    "userLanguage": "en",
    "organization_role": "OWNER",
    "lastLoginAt": "2025-01-15T10:00:00.000Z",
    "created_on": "2025-01-01T00:00:00.000Z"
  },
  {
    "id": "60d5ec49f1b2c8b1f8e4e1a3",
    "name": "Jane Smith",
    "email": "jane@acme.com",
    "userStatus": "ACTIVE",
    "userLanguage": "en",
    "organization_role": "MEMBER",
    "lastLoginAt": "2025-01-15T09:00:00.000Z",
    "created_on": "2025-01-05T00:00:00.000Z"
  }
]
```

**Response Fields:**

- `id` (string): User ID
- `name` (string): User display name
- `email` (string): User email address
- `username` (string, nullable): Username
- `avatar` (string, nullable): Profile picture URL
- `userStatus` (enum): User status - "ACTIVE", "INACTIVE", "PENDING"
- `userLanguage` (enum): Preferred language - "en", "de", "cz", "uk"
- `organization_role` (enum): Role in organization - "OWNER", "ADMIN", "MEMBER", "VIEWER"
- `lastLoginAt` (datetime, nullable): Last login timestamp
- `created_on` (datetime): User creation date

---

### Update Member Role

Update an organization member's role. Only accessible by organization owner.

**Endpoint:** `PUT /organization/members/{userId}/role`

**Authorization:** Organization OWNER only

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| userId | string | Yes | User ID to update (MongoDB ObjectId) |

**Request Body:**

```json
{
  "role": "ADMIN"
}
```

**Required Fields:**
- `role` (enum): New role - "OWNER", "ADMIN", "MEMBER", "VIEWER"

**Role Permissions:**

| Role | Description | Permissions |
|------|-------------|-------------|
| OWNER | Organization owner | Full access, billing, user management |
| ADMIN | Administrator | Full CRM access, user invitations, cannot manage billing |
| MEMBER | Standard member | Create/edit/delete own resources, view organization resources |
| VIEWER | Read-only member | View-only access to organization resources |

**Example Request:**

```bash
curl -X PUT "https://api.nextcrm.io/api/organization/members/60d5ec49f1b2c8b1f8e4e1a3/role" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "role": "ADMIN"
  }'
```

**Example Response:**

```json
{
  "message": "Member role updated successfully",
  "userId": "60d5ec49f1b2c8b1f8e4e1a3",
  "newRole": "ADMIN"
}
```

**Error Responses:**

- `401 Unauthorized`: No valid authentication token
- `403 Forbidden`: User is not organization owner
- `404 Not Found`: User not found or not in organization

**Audit Logging:**

Role changes are automatically logged to the audit log with action `ROLE_CHANGE`.

---

### Invite User to Organization

Send an invitation to join the organization. Only accessible by admin or owner.

**Endpoint:** `POST /organization/invitations`

**Authorization:** Organization ADMIN or OWNER

**Request Body:**

```json
{
  "email": "newuser@example.com",
  "role": "MEMBER"
}
```

**Required Fields:**
- `email` (string): Email address of user to invite
- `role` (enum): Role to assign - "ADMIN", "MEMBER", "VIEWER" (cannot invite as OWNER)

**Example Request:**

```bash
curl -X POST "https://api.nextcrm.io/api/organization/invitations" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "role": "MEMBER"
  }'
```

**Example Response:**

```json
{
  "message": "Invitation sent successfully",
  "invitation": {
    "id": "60d5ec49f1b2c8b1f8e4e1g1",
    "email": "newuser@example.com",
    "role": "MEMBER",
    "token": "inv_abc123def456",
    "status": "PENDING",
    "expiresAt": "2025-01-22T10:00:00.000Z",
    "createdAt": "2025-01-15T10:00:00.000Z"
  }
}
```

**Invitation Workflow:**

1. **Invitation created** with status `PENDING` and 7-day expiration
2. **Email sent** to invited user with acceptance link
3. **User clicks link** and signs in/up
4. **Invitation accepted** automatically if token valid
5. **User added** to organization with specified role

**Invitation Statuses:**

- `PENDING`: Invitation sent, awaiting acceptance
- `ACCEPTED`: User accepted invitation and joined organization
- `EXPIRED`: Invitation expired (7 days)
- `CANCELLED`: Invitation cancelled by admin/owner

**Error Responses:**

- `401 Unauthorized`: No valid authentication token
- `403 Forbidden`: User is not admin or owner
- `400 Bad Request`: Email already a member, invalid email format, or invalid role

---

### Get Audit Logs

Retrieve organization audit logs for compliance and security monitoring.

**Endpoint:** `GET /organization/audit-logs`

**Authorization:** Organization ADMIN or OWNER

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| limit | integer | No | 50 | Maximum logs to return (1-100) |
| offset | integer | No | 0 | Number of logs to skip (pagination) |

**Example Request:**

```bash
curl -X GET "https://api.nextcrm.io/api/organization/audit-logs?limit=50&offset=0" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Example Response:**

```json
[
  {
    "id": "60d5ec49f1b2c8b1f8e4e1h1",
    "organizationId": "60d5ec49f1b2c8b1f8e4e1a0",
    "userId": "60d5ec49f1b2c8b1f8e4e1a2",
    "action": "CREATE",
    "resource": "account",
    "resourceId": "60d5ec49f1b2c8b1f8e4e1a1",
    "changes": {
      "name": "Acme Corporation",
      "status": "Active"
    },
    "ipAddress": "203.0.113.1",
    "userAgent": "Mozilla/5.0 ...",
    "createdAt": "2025-01-15T10:00:00.000Z"
  },
  {
    "id": "60d5ec49f1b2c8b1f8e4e1h2",
    "organizationId": "60d5ec49f1b2c8b1f8e4e1a0",
    "userId": "60d5ec49f1b2c8b1f8e4e1a3",
    "action": "RATE_LIMIT_EXCEEDED",
    "resource": "API",
    "resourceId": "/api/crm/account",
    "changes": {
      "endpoint": "/api/crm/account",
      "plan": "FREE",
      "limit": 100,
      "result": "failure"
    },
    "ipAddress": "203.0.113.2",
    "userAgent": "PostmanRuntime/7.32.3",
    "createdAt": "2025-01-15T10:05:00.000Z"
  }
]
```

**Response Fields:**

- `id` (string): Audit log ID
- `organizationId` (string): Organization ID
- `userId` (string, nullable): User who performed the action
- `action` (enum): Action type - "CREATE", "UPDATE", "DELETE", "VIEW", "EXPORT", "LOGIN", "LOGOUT", "INVITE", "REMOVE", "ROLE_CHANGE", "SETTINGS_CHANGE", "SUBSCRIPTION_CHANGE", "PAYMENT", "PERMISSION_DENIED", "RATE_LIMIT_EXCEEDED"
- `resource` (string): Resource type (e.g., "account", "lead", "API")
- `resourceId` (string, nullable): Resource ID affected
- `changes` (object, nullable): Details of the change
- `ipAddress` (string, nullable): IP address of request
- `userAgent` (string, nullable): User agent string
- `createdAt` (datetime): Timestamp of action

**Use Cases:**

- **Security Forensics**: Track who accessed what and when
- **Compliance Reporting**: SOC 2, GDPR audit evidence
- **Abuse Detection**: Monitor rate limit violations and permission denials
- **Access Patterns**: Analyze user behavior and resource usage

**Error Responses:**

- `401 Unauthorized`: No valid authentication token
- `403 Forbidden`: User is not admin or owner

---

## Billing

Subscription and payment management powered by Stripe.

### Get Subscription Details

Retrieve organization subscription and payment history. Only accessible by organization owner.

**Endpoint:** `GET /billing/subscription`

**Authorization:** Organization OWNER only

**Example Request:**

```bash
curl -X GET "https://api.nextcrm.io/api/billing/subscription" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Example Response:**

```json
{
  "organization": {
    "id": "60d5ec49f1b2c8b1f8e4e1a0",
    "name": "Acme Corp",
    "plan": "PRO",
    "status": "ACTIVE",
    "stripeCustomerId": "cus_123abc"
  },
  "subscription": {
    "id": "60d5ec49f1b2c8b1f8e4e1i1",
    "stripeSubscriptionId": "sub_123abc",
    "stripePriceId": "price_123abc",
    "status": "ACTIVE",
    "currentPeriodStart": "2025-01-01T00:00:00.000Z",
    "currentPeriodEnd": "2025-02-01T00:00:00.000Z",
    "cancelAtPeriodEnd": false,
    "canceledAt": null,
    "trialStart": null,
    "trialEnd": null,
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-15T10:00:00.000Z"
  },
  "paymentHistory": [
    {
      "id": "60d5ec49f1b2c8b1f8e4e1j1",
      "stripePaymentIntentId": "pi_123abc",
      "stripeInvoiceId": "in_123abc",
      "amount": 2900,
      "currency": "usd",
      "status": "SUCCEEDED",
      "description": "PRO Plan - Monthly",
      "receiptUrl": "https://pay.stripe.com/receipts/...",
      "createdAt": "2025-01-15T00:00:00.000Z"
    }
  ]
}
```

**Subscription Statuses:**

| Status | Description |
|--------|-------------|
| ACTIVE | Subscription is active and billing normally |
| PAST_DUE | Payment failed, retrying |
| CANCELED | Subscription has been canceled |
| INCOMPLETE | Initial payment incomplete |
| INCOMPLETE_EXPIRED | Initial payment window expired |
| TRIALING | In trial period (no charges yet) |
| UNPAID | Payment failed, no more retries |

**Payment Statuses:**

| Status | Description |
|--------|-------------|
| SUCCEEDED | Payment completed successfully |
| PENDING | Payment pending (e.g., ACH transfer) |
| FAILED | Payment attempt failed |
| CANCELED | Payment canceled before completion |
| REFUNDED | Payment was refunded |

**Error Responses:**

- `400 Bad Request`: User not associated with an organization
- `401 Unauthorized`: No valid authentication token
- `403 Forbidden`: User is not organization owner

**403 Forbidden Example:**

```json
{
  "error": "Forbidden",
  "message": "Only organization owners can view billing subscriptions",
  "code": "OWNER_ONLY",
  "requiredRole": "OWNER"
}
```

**Audit Logging:**

Permission denials are automatically logged to audit log with action `PERMISSION_DENIED`.

---

### Create Stripe Checkout Session

Create a Stripe checkout session for subscription upgrade.

**Endpoint:** `POST /billing/create-checkout-session`

**Authorization:** Organization OWNER only

**Request Body:**

```json
{
  "priceId": "price_123abc"
}
```

**Required Fields:**
- `priceId` (string): Stripe Price ID for the plan (e.g., "price_1ProPlanMonthly")

**Example Request:**

```bash
curl -X POST "https://api.nextcrm.io/api/billing/create-checkout-session" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "priceId": "price_123abc"
  }'
```

**Example Response:**

```json
{
  "sessionId": "cs_test_123abc",
  "url": "https://checkout.stripe.com/c/pay/cs_test_123abc"
}
```

**Workflow:**

1. **Client calls** this endpoint with desired plan's `priceId`
2. **Server creates** Stripe checkout session
3. **Client redirects** user to Stripe checkout URL
4. **User completes** payment on Stripe's secure page
5. **Stripe redirects** user back to your app with session result
6. **Webhook handler** updates organization plan automatically

**Error Responses:**

- `401 Unauthorized`: No valid authentication token
- `403 Forbidden`: User is not organization owner
- `500 Internal Server Error`: Stripe API error

---

### Create Stripe Customer Portal Session

Create a Stripe customer portal session for subscription management (cancel, update payment method, view invoices).

**Endpoint:** `POST /billing/create-portal-session`

**Authorization:** Organization OWNER only

**Example Request:**

```bash
curl -X POST "https://api.nextcrm.io/api/billing/create-portal-session" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Example Response:**

```json
{
  "url": "https://billing.stripe.com/p/session/test_123abc"
}
```

**Customer Portal Features:**

- **Update payment method**: Change credit card
- **View invoices**: Download past invoices
- **Cancel subscription**: Self-service cancellation
- **Update billing information**: Change address, VAT number

**Workflow:**

1. **Client calls** this endpoint
2. **Server creates** portal session for organization's Stripe customer
3. **Client redirects** user to portal URL
4. **User manages** subscription in Stripe's self-service portal
5. **Stripe redirects** user back to your app when done
6. **Webhooks update** subscription status in real-time

**Error Responses:**

- `400 Bad Request`: Organization doesn't have a Stripe customer ID
- `401 Unauthorized`: No valid authentication token
- `403 Forbidden`: User is not organization owner
- `500 Internal Server Error`: Stripe API error

---

### Stripe Webhook Handler

Handle Stripe webhook events for subscription and payment updates.

**Endpoint:** `POST /webhooks/stripe`

**Authorization:** None (verified via Stripe signature)

**Security:** This endpoint uses Stripe webhook signature verification to ensure requests come from Stripe.

**Supported Events:**

| Event | Action |
|-------|--------|
| `customer.subscription.created` | Create subscription record |
| `customer.subscription.updated` | Update subscription status |
| `customer.subscription.deleted` | Mark subscription as canceled |
| `invoice.payment_succeeded` | Record successful payment |
| `invoice.payment_failed` | Record failed payment |

**Request Headers:**

```
Stripe-Signature: t=1234567890,v1=abc123def456...
```

**Example Request (from Stripe):**

```bash
curl -X POST "https://api.nextcrm.io/api/webhooks/stripe" \
  -H "Stripe-Signature: t=1234567890,v1=abc123..." \
  -H "Content-Type: application/json" \
  -d '{
    "id": "evt_123abc",
    "object": "event",
    "type": "customer.subscription.updated",
    "data": {
      "object": {
        "id": "sub_123abc",
        "status": "active",
        ...
      }
    }
  }'
```

**Example Response:**

```json
{
  "received": true,
  "eventType": "customer.subscription.updated"
}
```

**Error Responses:**

- `400 Bad Request`: Invalid signature or malformed payload
- `500 Internal Server Error`: Database error processing webhook

**Implementation Notes:**

- Endpoint bypasses rate limiting (Stripe requires < 5s response time)
- Idempotent: Safely handles duplicate webhook deliveries
- Automatic retry: Stripe retries failed webhooks for 3 days
- Test mode: Use Stripe CLI for local webhook testing

**Stripe CLI Testing:**

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
stripe trigger customer.subscription.updated
```

---

## Admin

Administrative operations for system-wide management. All admin endpoints require `is_admin: true` flag on the user account.

### Get Admin Dashboard

Retrieve system-wide statistics and metrics. Only accessible by system admins.

**Endpoint:** `GET /admin/dashboard`

**Authorization:** System admin only (`is_admin: true`)

**Example Request:**

```bash
curl -X GET "https://api.nextcrm.io/api/admin/dashboard" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Example Response:**

```json
{
  "totalUsers": 1250,
  "totalOrganizations": 87,
  "totalAccounts": 3421,
  "totalLeads": 892,
  "totalContacts": 5643,
  "totalOpportunities": 432,
  "totalProjects": 156,
  "totalDocuments": 2341,
  "activeSubscriptions": 45,
  "systemHealth": "healthy",
  "timestamp": "2025-01-15T10:00:00.000Z"
}
```

**Response Fields:**

- `totalUsers` (integer): Total users across all organizations
- `totalOrganizations` (integer): Total organizations
- `totalAccounts` (integer): Total CRM accounts
- `totalLeads` (integer): Total CRM leads
- `totalContacts` (integer): Total CRM contacts
- `totalOpportunities` (integer): Total CRM opportunities
- `totalProjects` (integer): Total project boards
- `totalDocuments` (integer): Total documents
- `activeSubscriptions` (integer): Active paid subscriptions
- `systemHealth` (string): System status indicator
- `timestamp` (datetime): Response timestamp

**Error Responses:**

- `401 Unauthorized`: No valid authentication token
- `403 Forbidden`: User is not a system admin

---

### Activate System Module

Enable a system module. Only accessible by system admins.

**Endpoint:** `POST /admin/activateModule/{moduleId}`

**Authorization:** System admin only

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| moduleId | string | Yes | Module ID (MongoDB ObjectId) |

**Example Request:**

```bash
curl -X POST "https://api.nextcrm.io/api/admin/activateModule/60d5ec49f1b2c8b1f8e4e1k1" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Example Response:**

```json
{
  "message": "Module activated successfully",
  "moduleId": "60d5ec49f1b2c8b1f8e4e1k1",
  "moduleName": "Invoice Management",
  "enabled": true
}
```

**System Modules:**

NextCRM uses a modular architecture where features can be enabled/disabled system-wide:

- CRM (Accounts, Leads, Contacts, Opportunities)
- Projects
- Invoices
- Documents
- Reports
- Email Client

**Use Cases:**

- **Beta Features**: Gradually roll out new features
- **Maintenance**: Temporarily disable problematic modules
- **Custom Deployments**: Enable only required modules for specific clients

**Error Responses:**

- `401 Unauthorized`: No valid authentication token
- `403 Forbidden`: User is not a system admin
- `404 Not Found`: Module not found

---

### Deactivate System Module

Disable a system module. Only accessible by system admins.

**Endpoint:** `POST /admin/deactivateModule/{moduleId}`

**Authorization:** System admin only

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| moduleId | string | Yes | Module ID (MongoDB ObjectId) |

**Example Request:**

```bash
curl -X POST "https://api.nextcrm.io/api/admin/deactivateModule/60d5ec49f1b2c8b1f8e4e1k1" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Example Response:**

```json
{
  "message": "Module deactivated successfully",
  "moduleId": "60d5ec49f1b2c8b1f8e4e1k1",
  "moduleName": "Invoice Management",
  "enabled": false
}
```

**Warning:** Deactivating a module:
- Hides the feature from all users
- Does NOT delete existing data
- Users with direct API access may still interact with the module
- Recommended: Use feature flags for gradual rollouts instead

**Error Responses:**

- `401 Unauthorized`: No valid authentication token
- `403 Forbidden`: User is not a system admin
- `404 Not Found`: Module not found

---

## Users

User account management.

### Get User by ID

Retrieve user information.

**Endpoint:** `GET /user/{userId}`

**Authorization:** Authenticated users (any role)

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| userId | string | Yes | User ID (MongoDB ObjectId) |

**Example Request:**

```bash
curl -X GET "https://api.nextcrm.io/api/user/60d5ec49f1b2c8b1f8e4e1a2" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Example Response:**

```json
{
  "id": "60d5ec49f1b2c8b1f8e4e1a2",
  "email": "john@acme.com",
  "name": "John Doe",
  "username": "johndoe",
  "avatar": "https://example.com/avatar.jpg",
  "userStatus": "ACTIVE",
  "userLanguage": "en",
  "is_admin": false,
  "organizationId": "60d5ec49f1b2c8b1f8e4e1a0",
  "organization_role": "OWNER",
  "lastLoginAt": "2025-01-15T10:00:00.000Z",
  "created_on": "2025-01-01T00:00:00.000Z"
}
```

**Response Fields:**

- `id` (string): User ID
- `email` (string): User email address
- `name` (string, nullable): Display name
- `username` (string, nullable): Username
- `avatar` (string, nullable): Profile picture URL
- `userStatus` (enum): User status - "ACTIVE", "INACTIVE", "PENDING"
- `userLanguage` (enum): Preferred language - "en" (English), "de" (German), "cz" (Czech), "uk" (Ukrainian)
- `is_admin` (boolean): System admin flag
- `organizationId` (string, nullable): Organization ID
- `organization_role` (enum, nullable): Role - "OWNER", "ADMIN", "MEMBER", "VIEWER"
- `lastLoginAt` (datetime, nullable): Last login timestamp
- `created_on` (datetime): User creation date

**User Status Workflow:**

1. **PENDING**: New user awaiting admin approval (production mode)
2. **ACTIVE**: User can access the system
3. **INACTIVE**: User suspended (cannot log in)

**Error Responses:**

- `401 Unauthorized`: No valid authentication token
- `404 Not Found`: User not found

---

### Activate a User

Change user status to ACTIVE. Admin only.

**Endpoint:** `PUT /user/activate/{userId}`

**Authorization:** System admin only (`is_admin: true`)

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| userId | string | Yes | User ID to activate (MongoDB ObjectId) |

**Example Request:**

```bash
curl -X PUT "https://api.nextcrm.io/api/user/activate/60d5ec49f1b2c8b1f8e4e1a2" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Example Response:**

```json
{
  "message": "User activated successfully",
  "userId": "60d5ec49f1b2c8b1f8e4e1a2",
  "userStatus": "ACTIVE"
}
```

**Side Effects:**

1. User status changed from PENDING or INACTIVE to ACTIVE
2. User can now log in and access the system
3. Audit log entry created with action `SETTINGS_CHANGE`

**Use Cases:**

- **New User Approval**: Approve pending user registrations (production mode)
- **Re-enable Account**: Reactivate suspended user accounts
- **Bulk Activation**: Activate multiple users via script

**Error Responses:**

- `401 Unauthorized`: No valid authentication token
- `403 Forbidden`: User is not a system admin
- `404 Not Found`: User not found

---

### Deactivate a User

Change user status to INACTIVE. Admin only.

**Endpoint:** `PUT /user/deactivate/{userId}`

**Authorization:** System admin only (`is_admin: true`)

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| userId | string | Yes | User ID to deactivate (MongoDB ObjectId) |

**Example Request:**

```bash
curl -X PUT "https://api.nextcrm.io/api/user/deactivate/60d5ec49f1b2c8b1f8e4e1a2" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Example Response:**

```json
{
  "message": "User deactivated successfully",
  "userId": "60d5ec49f1b2c8b1f8e4e1a2",
  "userStatus": "INACTIVE"
}
```

**Side Effects:**

1. User status changed to INACTIVE
2. User cannot log in (existing sessions remain valid until JWT expires)
3. User's API requests will be rejected with 401 Unauthorized
4. Audit log entry created with action `SETTINGS_CHANGE`

**Warning:** Deactivating a user:
- Does NOT delete user data
- Does NOT remove user from organizations
- Does NOT reassign user's assigned tasks/accounts/leads
- Active JWT tokens remain valid until expiration (24 hours)

**Use Cases:**

- **Security**: Suspend compromised accounts
- **Offboarding**: Deactivate former employees
- **Policy Violations**: Temporarily suspend users pending investigation

**Error Responses:**

- `401 Unauthorized`: No valid authentication token
- `403 Forbidden`: User is not a system admin
- `404 Not Found`: User not found

---

## System Endpoints

### Health Check

API health check endpoint for monitoring and load balancers.

**Endpoint:** `GET /health`

**Authorization:** None (public endpoint)

**Rate Limiting:** Bypassed

**Example Request:**

```bash
curl -X GET "https://api.nextcrm.io/api/health"
```

**Example Response:**

```json
{
  "status": "ok",
  "timestamp": "2025-01-15T10:00:00.000Z",
  "version": "3.0.0-alpha",
  "uptime": 123456
}
```

**Response Fields:**

- `status` (string): Health status - "ok", "degraded", "down"
- `timestamp` (datetime): Current server time
- `version` (string): API version
- `uptime` (integer): Server uptime in seconds

**Use Cases:**

- **Load Balancer**: Health checks for auto-scaling
- **Monitoring**: Uptime monitoring (Pingdom, Datadog, etc.)
- **Status Page**: Public status page integration
- **CI/CD**: Pre-deployment smoke tests

---

### Check Rate Limit Status

Check the current rate limit status for the authenticated user or IP address.

**Endpoint:** `GET /rate-limit`

**Authorization:** Optional (works for both authenticated and unauthenticated requests)

**Example Request:**

```bash
curl -X GET "https://api.nextcrm.io/api/rate-limit" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Example Response:**

```json
{
  "limit": 1000,
  "remaining": 875,
  "resetTime": 1705939200,
  "identifier": "org:60d5ec49f1b2c8b1f8e4e1a0",
  "plan": "PRO"
}
```

**Response Fields:**

- `limit` (integer): Total requests allowed in the current window
- `remaining` (integer): Requests remaining before rate limit
- `resetTime` (integer): Unix timestamp when the rate limit resets
- `identifier` (string): Rate limit key (org:xxx or ip:xxx)
- `plan` (enum): Organization plan - "FREE", "PRO", "ENTERPRISE"

**Use Cases:**

- **Client-Side Display**: Show API quota in dashboard
- **Proactive Throttling**: Client can slow down requests before hitting limit
- **Debugging**: Verify rate limit configuration

---

## Next Steps

- **Authentication Guide**: See [AUTHENTICATION.md](./AUTHENTICATION.md) for detailed auth setup
- **Error Codes**: See [ERROR_CODES.md](./ERROR_CODES.md) for comprehensive error reference
- **OpenAPI Spec**: See [openapi.json](./openapi.json) for machine-readable API definition
- **API Index**: See [README.md](./README.md) for quick start and common tasks

---

**Generated with Claude Code**
**Version:** 3.0.0-alpha
**Last Updated:** 2025-01-15
