# NextCRM API Error Codes Reference

## Table of Contents

- [Overview](#overview)
- [Error Response Format](#error-response-format)
- [HTTP Status Codes](#http-status-codes)
- [400 Bad Request Errors](#400-bad-request-errors)
- [401 Unauthorized Errors](#401-unauthorized-errors)
- [403 Forbidden Errors](#403-forbidden-errors)
- [404 Not Found Errors](#404-not-found-errors)
- [409 Conflict Errors](#409-conflict-errors)
- [429 Rate Limit Errors](#429-rate-limit-errors)
- [500 Internal Server Errors](#500-internal-server-errors)
- [Error Handling Best Practices](#error-handling-best-practices)

---

## Overview

NextCRM API uses standard HTTP status codes to indicate the success or failure of API requests. Each error response includes a machine-readable error code and a human-readable message to help developers debug issues quickly.

**Error Response Philosophy:**
- **Clear Error Messages**: Descriptive messages for easy debugging
- **Actionable Guidance**: Suggested solutions for common errors
- **Security Balance**: Informative without revealing sensitive system details
- **Consistent Structure**: All errors follow the same format

---

## Error Response Format

All error responses follow this structure:

```json
{
  "error": "ERROR_CATEGORY",
  "message": "Human readable description of what went wrong",
  "code": "MACHINE_READABLE_ERROR_CODE",
  "details": {
    "field": "specific_field_with_error",
    "additionalContext": "extra information if applicable"
  },
  "meta": {
    "timestamp": "2025-01-15T10:30:00.000Z",
    "requestId": "req_123abc",
    "endpoint": "/api/crm/account"
  }
}
```

**Fields:**

- `error` (string): High-level error category (e.g., "Bad Request", "Unauthorized")
- `message` (string): Human-readable error description
- `code` (string): Machine-readable error code for programmatic handling
- `details` (object, optional): Additional context about the error
- `meta` (object, optional): Request metadata for debugging

---

## HTTP Status Codes

NextCRM API uses standard HTTP status codes:

| Status Code | Meaning | Use Case |
|------------|---------|----------|
| **200** | OK | Request succeeded |
| **201** | Created | Resource created successfully |
| **400** | Bad Request | Invalid parameters, malformed request, validation errors |
| **401** | Unauthorized | Missing or invalid authentication token |
| **403** | Forbidden | Insufficient permissions, quota exceeded, role restrictions |
| **404** | Not Found | Resource not found or user doesn't have access |
| **409** | Conflict | Resource already exists, state conflict |
| **429** | Too Many Requests | Rate limit exceeded |
| **500** | Internal Server Error | Unexpected server error (database, external service) |

---

## 400 Bad Request Errors

Returned when the request is malformed or contains invalid data.

### INVALID_REQUEST

**HTTP Status:** 400

**Description:** Missing required parameters or malformed request body.

**Common Causes:**
- Missing required fields in request body
- Invalid JSON syntax
- Wrong data types (string instead of integer)
- Empty request body when data expected

**Solutions:**
- Check API documentation for required fields
- Validate JSON syntax with a linter
- Ensure correct data types for all fields
- Include Content-Type: application/json header

**Example Response:**

```json
{
  "error": "Bad Request",
  "message": "Name and slug are required",
  "code": "INVALID_REQUEST",
  "details": {
    "missingFields": ["name", "slug"]
  }
}
```

**Example Request (Incorrect):**

```bash
curl -X POST "https://api.nextcrm.io/api/organization" \
  -H "Authorization: Bearer JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Acme Corp"
  }'
# Missing "slug" field
```

**Example Request (Correct):**

```bash
curl -X POST "https://api.nextcrm.io/api/organization" \
  -H "Authorization: Bearer JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Acme Corp",
    "slug": "acme-corp"
  }'
```

---

### VALIDATION_ERROR

**HTTP Status:** 400

**Description:** Request data failed validation rules (e.g., email format, slug pattern, minimum length).

**Common Causes:**
- Invalid email format
- Slug contains uppercase or special characters
- Password too short (minimum 8 characters)
- Invalid date format

**Solutions:**
- Validate data client-side before sending
- Follow field-specific format requirements
- Check API documentation for validation rules

**Example Response:**

```json
{
  "error": "Bad Request",
  "message": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": {
    "field": "email",
    "constraint": "Invalid email format",
    "providedValue": "not-an-email"
  }
}
```

---

### SLUG_EXISTS

**HTTP Status:** 400

**Description:** Organization slug is already in use by another organization.

**Common Causes:**
- Attempting to create organization with existing slug
- Slug collision (another org already using this identifier)

**Solutions:**
- Choose a different slug
- Check slug availability before submission
- Add timestamp or random suffix to make unique

**Example Response:**

```json
{
  "error": "Bad Request",
  "message": "Organization slug already exists",
  "code": "SLUG_EXISTS",
  "details": {
    "slug": "acme-corp",
    "suggestion": "acme-corp-2025"
  }
}
```

---

### USER_HAS_ORG

**HTTP Status:** 400

**Description:** User already belongs to an organization and cannot create/join another.

**Common Causes:**
- User trying to create second organization
- User trying to accept invitation while already in org

**Solutions:**
- Leave current organization first
- Check if user already has organizationId
- Contact admin to transfer ownership

**Example Response:**

```json
{
  "error": "Bad Request",
  "message": "User already belongs to an organization",
  "code": "USER_HAS_ORG",
  "details": {
    "currentOrganizationId": "60d5ec49f1b2c8b1f8e4e1a0",
    "currentOrganizationName": "Existing Corp"
  }
}
```

---

### MISSING_FIELD

**HTTP Status:** 400

**Description:** Required field is missing from request body.

**Common Causes:**
- Forgot to include required field
- Typo in field name
- Field name case mismatch (camelCase vs snake_case)

**Solutions:**
- Check API documentation for required fields
- Verify field name spelling and casing
- Include all required fields in request

**Example Response:**

```json
{
  "error": "Bad Request",
  "message": "Missing project name",
  "code": "MISSING_FIELD",
  "details": {
    "field": "title",
    "required": true
  }
}
```

---

### NO_FORM_DATA

**HTTP Status:** 400

**Description:** Request body is empty when data is expected.

**Common Causes:**
- Empty POST/PUT request body
- Content-Type header not set
- Request body not serialized

**Solutions:**
- Include request body with data
- Set Content-Type: application/json header
- Serialize data to JSON before sending

**Example Response:**

```json
{
  "error": "Bad Request",
  "message": "No form data",
  "code": "NO_FORM_DATA"
}
```

---

## 401 Unauthorized Errors

Returned when authentication is required but missing or invalid.

### UNAUTHORIZED

**HTTP Status:** 401

**Description:** Missing or invalid authentication token.

**Common Causes:**
- No Authorization header included
- JWT token expired (24-hour lifespan)
- Invalid JWT signature
- User logged out

**Solutions:**
- Include Authorization: Bearer {token} header
- Refresh session if token expired
- Re-authenticate if session invalid
- Check token is valid JWT format

**Example Response:**

```json
{
  "error": "Unauthenticated",
  "message": "Valid authentication token is required",
  "code": "UNAUTHORIZED"
}
```

**Example Request (Incorrect):**

```bash
curl -X GET "https://api.nextcrm.io/api/crm/account"
# Missing Authorization header
```

**Example Request (Correct):**

```bash
curl -X GET "https://api.nextcrm.io/api/crm/account" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

### ORG_NOT_FOUND

**HTTP Status:** 401

**Description:** User doesn't belong to an organization (organizationId is null).

**Common Causes:**
- User hasn't created or joined an organization
- User removed from organization
- Organization was deleted

**Solutions:**
- Redirect to organization creation flow
- Accept pending invitation
- Contact admin to be re-added to organization

**Example Response:**

```json
{
  "error": "Unauthenticated",
  "message": "User organization not found",
  "code": "ORG_NOT_FOUND",
  "details": {
    "userId": "60d5ec49f1b2c8b1f8e4e1a2",
    "organizationId": null,
    "action": "Create or join an organization to continue"
  }
}
```

---

### TOKEN_EXPIRED

**HTTP Status:** 401

**Description:** JWT token has expired (tokens expire after 24 hours).

**Common Causes:**
- Token older than 24 hours
- User hasn't refreshed session
- Long-running inactive session

**Solutions:**
- Refresh session: POST /api/auth/session
- Re-authenticate if refresh fails
- Implement auto-refresh in client

**Example Response:**

```json
{
  "error": "Unauthenticated",
  "message": "Token has expired",
  "code": "TOKEN_EXPIRED",
  "details": {
    "expiredAt": "2025-01-14T10:00:00.000Z",
    "currentTime": "2025-01-15T10:00:00.000Z"
  }
}
```

---

## 403 Forbidden Errors

Returned when user is authenticated but doesn't have permission to perform the action.

### FORBIDDEN

**HTTP Status:** 403

**Description:** User doesn't have permission to access this resource or perform this action.

**Common Causes:**
- Insufficient role (e.g., VIEWER trying to delete)
- Not organization owner/admin
- Trying to access another org's resources

**Solutions:**
- Request access from admin/owner
- Check user role: session.user.organization_role
- Verify resource belongs to user's organization

**Example Response:**

```json
{
  "error": "Forbidden",
  "message": "You do not have permission to access this resource",
  "code": "FORBIDDEN",
  "details": {
    "userRole": "MEMBER",
    "requiredRole": "ADMIN",
    "action": "Delete account"
  }
}
```

---

### OWNER_ONLY

**HTTP Status:** 403

**Description:** Endpoint is only accessible by organization owners.

**Common Causes:**
- Non-owner trying to access billing
- Admin trying to delete organization
- Member trying to manage subscriptions

**Solutions:**
- Request owner to perform action
- Check if you're the owner
- Transfer ownership if needed

**Example Response:**

```json
{
  "error": "Forbidden",
  "message": "Only organization owners can view billing subscriptions",
  "code": "OWNER_ONLY",
  "requiredRole": "OWNER",
  "currentRole": "ADMIN"
}
```

**Endpoints with OWNER_ONLY:**
- GET /billing/subscription
- POST /billing/create-checkout-session
- POST /billing/create-portal-session
- DELETE /organization

---

### ADMIN_ONLY

**HTTP Status:** 403

**Description:** Endpoint is only accessible by system administrators.

**Common Causes:**
- Regular user trying to access admin endpoints
- Organization admin (not system admin)
- Trying to activate/deactivate modules

**Solutions:**
- Contact system administrator
- Request admin privileges from platform team
- Use organization-level admin features instead

**Example Response:**

```json
{
  "error": "Forbidden",
  "message": "Only system administrators can access this endpoint",
  "code": "ADMIN_ONLY",
  "details": {
    "isAdmin": false,
    "endpoint": "/admin/dashboard"
  }
}
```

**Endpoints with ADMIN_ONLY:**
- GET /admin/dashboard
- POST /admin/activateModule/{moduleId}
- POST /admin/deactivateModule/{moduleId}
- PUT /user/activate/{userId}
- PUT /user/deactivate/{userId}

---

### QUOTA_EXCEEDED

**HTTP Status:** 403

**Description:** Organization has reached the maximum quota for this resource type.

**Common Causes:**
- FREE plan: 10 accounts, 20 leads, 5 projects
- PRO plan: 100 accounts, 500 leads, 50 projects
- ENTERPRISE plan: Unlimited

**Solutions:**
- Upgrade subscription plan
- Delete unused resources
- Contact sales for custom quota

**Example Response:**

```json
{
  "error": "Account limit reached",
  "message": "Your organization has reached the maximum number of accounts for the FREE plan (10 accounts). Please upgrade to PRO for 100 accounts.",
  "code": "QUOTA_EXCEEDED",
  "requiresUpgrade": true,
  "details": {
    "currentPlan": "FREE",
    "resourceType": "accounts",
    "currentUsage": 10,
    "limit": 10,
    "nextPlan": "PRO",
    "nextPlanLimit": 100,
    "upgradeUrl": "/billing"
  }
}
```

**Quota Limits by Plan:**

| Resource | FREE | PRO | ENTERPRISE |
|----------|------|-----|------------|
| Accounts | 10 | 100 | Unlimited |
| Leads | 20 | 500 | Unlimited |
| Contacts | 50 | 1000 | Unlimited |
| Opportunities | 20 | 200 | Unlimited |
| Projects | 5 | 50 | Unlimited |
| Storage | 1 GB | 50 GB | 500 GB |

---

## 404 Not Found Errors

Returned when the requested resource doesn't exist or user doesn't have access.

### NOT_FOUND

**HTTP Status:** 404

**Description:** Resource not found or user doesn't have permission to view it.

**Common Causes:**
- Resource ID doesn't exist
- Resource deleted
- Resource belongs to different organization
- Typo in resource ID

**Solutions:**
- Verify resource ID is correct (24-character hex string)
- Check resource wasn't deleted
- Ensure resource belongs to your organization
- List resources to find correct ID

**Example Response:**

```json
{
  "error": "Not Found",
  "message": "Account not found or unauthorized",
  "code": "NOT_FOUND",
  "details": {
    "resourceType": "account",
    "resourceId": "60d5ec49f1b2c8b1f8e4e1a1",
    "organizationId": "60d5ec49f1b2c8b1f8e4e1a0"
  }
}
```

**Note:** For security reasons, NextCRM doesn't distinguish between "resource doesn't exist" and "resource exists but you don't have access". This prevents information leakage.

---

### USER_NOT_FOUND

**HTTP Status:** 404

**Description:** User account doesn't exist in the database.

**Common Causes:**
- Email not registered
- User account deleted
- Typo in email address

**Solutions:**
- Check email spelling
- Register new account if needed
- Contact admin to restore deleted account

**Example Response:**

```json
{
  "error": "Not Found",
  "message": "User not found, please register first",
  "code": "USER_NOT_FOUND",
  "details": {
    "email": "nonexistent@example.com"
  }
}
```

---

## 409 Conflict Errors

Returned when the request conflicts with the current state of the resource.

### RESOURCE_EXISTS

**HTTP Status:** 409

**Description:** Resource already exists (duplicate creation attempt).

**Common Causes:**
- Creating account with duplicate name
- Creating lead with same email
- Organization slug already taken

**Solutions:**
- Check if resource already exists
- Use update endpoint instead of create
- Choose different unique identifier

**Example Response:**

```json
{
  "error": "Conflict",
  "message": "An account with this name already exists",
  "code": "RESOURCE_EXISTS",
  "details": {
    "resourceType": "account",
    "field": "name",
    "value": "Acme Corporation",
    "existingResourceId": "60d5ec49f1b2c8b1f8e4e1a1"
  }
}
```

---

### STATE_CONFLICT

**HTTP Status:** 409

**Description:** Operation conflicts with resource's current state.

**Common Causes:**
- Deleting organization with active subscription
- Changing lead status to invalid transition
- Updating archived resource

**Solutions:**
- Check resource state before operation
- Follow state transition rules
- Unarchive resource before updating

**Example Response:**

```json
{
  "error": "Conflict",
  "message": "Cannot delete organization with active subscription",
  "code": "STATE_CONFLICT",
  "details": {
    "currentState": "active_subscription",
    "requiredState": "no_subscription",
    "action": "Cancel subscription first"
  }
}
```

---

## 429 Rate Limit Errors

Returned when API rate limit is exceeded.

### RATE_LIMIT_EXCEEDED

**HTTP Status:** 429

**Description:** API rate limit exceeded for this organization or IP address.

**Common Causes:**
- Too many requests in short time period
- Inefficient API usage (no caching)
- Bulk operations without batching
- Accidental infinite loop

**Solutions:**
- Wait for rate limit window to reset
- Implement exponential backoff
- Cache responses when possible
- Batch multiple operations
- Upgrade plan for higher limits

**Example Response:**

```json
{
  "error": "Too Many Requests",
  "message": "Rate limit exceeded. Please try again in 3600 seconds.",
  "code": "RATE_LIMIT_EXCEEDED",
  "details": {
    "limit": 1000,
    "remaining": 0,
    "resetTime": 1705939200,
    "retryAfter": 3600,
    "plan": "PRO"
  }
}
```

**Response Headers:**

```
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1705939200
Retry-After: 3600
```

**Rate Limits by Plan:**

| Plan | Limit | Window |
|------|-------|--------|
| FREE | 100 req/hour | 1 hour |
| PRO | 1,000 req/hour | 1 hour |
| ENTERPRISE | 10,000 req/hour | 1 hour |

**Handling Rate Limits (Client-Side):**

```javascript
async function makeApiRequest(url, options) {
  const response = await fetch(url, options);

  if (response.status === 429) {
    const resetTime = parseInt(response.headers.get('X-RateLimit-Reset'));
    const waitTime = resetTime - Math.floor(Date.now() / 1000);

    console.log(`Rate limit exceeded. Waiting ${waitTime} seconds...`);

    await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
    return makeApiRequest(url, options); // Retry
  }

  return response;
}
```

---

## 500 Internal Server Errors

Returned when an unexpected error occurs on the server.

### INTERNAL_ERROR

**HTTP Status:** 500

**Description:** An unexpected server error occurred.

**Common Causes:**
- Database connection failure
- External service unavailable (Stripe, email)
- Unhandled exception in code
- Server out of memory

**Solutions:**
- Retry request (may be temporary issue)
- Check API status page
- Contact support if persists
- Provide requestId for investigation

**Example Response:**

```json
{
  "error": "Internal Server Error",
  "message": "An unexpected error occurred. Please try again later.",
  "code": "INTERNAL_ERROR",
  "meta": {
    "timestamp": "2025-01-15T10:30:00.000Z",
    "requestId": "req_123abc",
    "endpoint": "/api/crm/account"
  }
}
```

**What to Include in Support Ticket:**
- `requestId` from error response
- Timestamp of error
- Endpoint that failed
- Request body (sanitized, no sensitive data)
- Steps to reproduce

---

### DATABASE_ERROR

**HTTP Status:** 500

**Description:** Database query failed or connection lost.

**Common Causes:**
- Database server down
- Connection pool exhausted
- Query timeout
- Network issue

**Solutions:**
- Retry request after brief delay
- Check database status
- Contact support if persistent
- Optimize query if timeout

**Example Response:**

```json
{
  "error": "Internal Server Error",
  "message": "Database operation failed",
  "code": "DATABASE_ERROR",
  "details": {
    "operation": "findMany",
    "model": "crm_Accounts",
    "requestId": "req_123abc"
  }
}
```

---

### EXTERNAL_SERVICE_ERROR

**HTTP Status:** 500

**Description:** External service (Stripe, email provider, AI API) returned an error.

**Common Causes:**
- Stripe API down
- Email service rate limited
- OpenAI API error
- Network timeout

**Solutions:**
- Retry request (exponential backoff)
- Check service status page
- Wait for service recovery
- Contact support if urgent

**Example Response:**

```json
{
  "error": "Internal Server Error",
  "message": "External service temporarily unavailable",
  "code": "EXTERNAL_SERVICE_ERROR",
  "details": {
    "service": "stripe",
    "operation": "create_checkout_session",
    "upstreamError": "Service temporarily unavailable"
  }
}
```

---

## Error Handling Best Practices

### 1. Client-Side Error Handling

**JavaScript/TypeScript Example:**

```typescript
async function createAccount(accountData: AccountCreateRequest) {
  try {
    const response = await fetch('/api/crm/account', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(accountData)
    });

    const data = await response.json();

    if (!response.ok) {
      // Handle specific error codes
      switch (data.code) {
        case 'QUOTA_EXCEEDED':
          showUpgradeModal();
          break;
        case 'VALIDATION_ERROR':
          showFieldError(data.details.field, data.message);
          break;
        case 'RATE_LIMIT_EXCEEDED':
          const retryAfter = data.details.retryAfter;
          scheduleRetry(retryAfter);
          break;
        case 'UNAUTHORIZED':
          redirectToLogin();
          break;
        default:
          showGenericError(data.message);
      }

      throw new Error(data.message);
    }

    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}
```

### 2. Exponential Backoff for Retries

```typescript
async function makeRequestWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 3
) {
  let retries = 0;

  while (retries < maxRetries) {
    try {
      const response = await fetch(url, options);

      if (response.ok) {
        return await response.json();
      }

      // Retry on 429 (rate limit) or 500+ (server errors)
      if (response.status === 429 || response.status >= 500) {
        const waitTime = Math.pow(2, retries) * 1000; // 1s, 2s, 4s
        console.log(`Retrying in ${waitTime}ms (attempt ${retries + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        retries++;
        continue;
      }

      // Don't retry on client errors (400, 401, 403, 404)
      throw new Error(`Request failed: ${response.status}`);
    } catch (error) {
      if (retries === maxRetries - 1) {
        throw error;
      }
      retries++;
    }
  }
}
```

### 3. Logging and Monitoring

**Server-Side Logging:**

```typescript
// Log all errors with context
console.error('[API_ERROR]', {
  code: error.code,
  message: error.message,
  endpoint: req.url,
  method: req.method,
  userId: session?.user?.id,
  organizationId: session?.user?.organizationId,
  requestId: generateRequestId(),
  timestamp: new Date().toISOString()
});

// Send to monitoring service (Sentry, Datadog, etc.)
Sentry.captureException(error, {
  tags: {
    endpoint: req.url,
    method: req.method,
    errorCode: error.code
  },
  user: {
    id: session?.user?.id,
    email: session?.user?.email
  }
});
```

### 4. User-Friendly Error Messages

**Transform Technical Errors:**

```typescript
function getErrorMessage(errorCode: string): string {
  const userFriendlyMessages: Record<string, string> = {
    QUOTA_EXCEEDED: "You've reached your account limit. Upgrade to continue adding accounts.",
    RATE_LIMIT_EXCEEDED: "Too many requests. Please slow down and try again in a moment.",
    VALIDATION_ERROR: "Please check your input and try again.",
    UNAUTHORIZED: "Your session has expired. Please log in again.",
    FORBIDDEN: "You don't have permission to perform this action.",
    NOT_FOUND: "The requested item couldn't be found.",
    INTERNAL_ERROR: "Something went wrong on our end. We're working to fix it."
  };

  return userFriendlyMessages[errorCode] || "An unexpected error occurred.";
}
```

### 5. Error Recovery Strategies

**Quota Exceeded:**
```typescript
if (error.code === 'QUOTA_EXCEEDED') {
  // Show upgrade prompt
  showUpgradeModal({
    currentPlan: error.details.currentPlan,
    nextPlan: error.details.nextPlan,
    currentLimit: error.details.limit,
    nextLimit: error.details.nextPlanLimit
  });
}
```

**Rate Limit:**
```typescript
if (error.code === 'RATE_LIMIT_EXCEEDED') {
  const resetTime = error.details.resetTime;
  const now = Math.floor(Date.now() / 1000);
  const waitTime = resetTime - now;

  showNotification(`Rate limit exceeded. Retrying in ${waitTime} seconds...`);

  setTimeout(() => {
    retryRequest();
  }, waitTime * 1000);
}
```

**Unauthorized:**
```typescript
if (error.code === 'UNAUTHORIZED') {
  // Try refreshing session first
  const refreshed = await refreshSession();

  if (refreshed) {
    // Retry original request
    return retryRequest();
  } else {
    // Redirect to login
    router.push('/auth/signin');
  }
}
```

---

## Summary

**Key Takeaways:**

1. ✅ **Always check HTTP status code** before parsing response
2. ✅ **Use error.code** for programmatic error handling
3. ✅ **Display user-friendly messages** (not raw error codes)
4. ✅ **Implement exponential backoff** for retries
5. ✅ **Log errors with context** (requestId, userId, timestamp)
6. ✅ **Handle quota limits gracefully** (show upgrade prompts)
7. ✅ **Respect rate limits** (wait for reset, don't spam retries)
8. ✅ **Provide actionable error messages** (suggest solutions)

**Next Steps:**

- [REST API Reference](./REST-API.md) - Comprehensive endpoint documentation
- [Authentication Guide](./AUTHENTICATION.md) - Detailed auth setup
- [OpenAPI Spec](./openapi.json) - Machine-readable API definition

---

**Generated with Claude Code**
**Version:** 3.0.0-alpha
**Last Updated:** 2025-01-15
