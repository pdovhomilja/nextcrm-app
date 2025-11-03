# NextCRM Test Suite

This directory contains comprehensive tests for the NextCRM application, covering unit tests, integration tests, and end-to-end tests.

## Test Structure

```
tests/
├── unit/                    # Unit tests for individual functions and components
│   ├── lib/                 # Library function tests
│   │   ├── permissions.test.ts      # RBAC permission system
│   │   ├── rate-limit.test.ts       # Rate limiting logic
│   │   ├── quota-enforcement.test.ts # Quota checks
│   │   ├── auth.test.ts             # Authentication logic
│   │   └── stripe.test.ts           # Stripe integration
│   └── components/          # React component tests
├── integration/             # Integration tests
│   ├── api/                 # API route tests
│   │   ├── multi-tenancy.test.ts    # Data isolation
│   │   └── stripe-webhook.test.ts   # Webhook handling
│   └── actions/             # Server action tests
├── e2e/                     # End-to-end tests (Cypress/Playwright)
└── mocks/                   # Mock implementations
    ├── prisma.ts            # Prisma client mock
    └── stripe.ts            # Stripe mock
```

## Running Tests

### Run All Tests
```bash
pnpm test
```

### Run Specific Test Suite
```bash
# Unit tests only
pnpm test:unit

# Integration tests only
pnpm test:integration

# Watch mode for development
pnpm test:watch
```

### Run Specific Test File
```bash
pnpm test tests/unit/lib/permissions.test.ts
```

### Generate Coverage Report
```bash
pnpm test:coverage
```

Coverage reports will be generated in `coverage/` directory.

## Test Coverage Summary

### Current Coverage (Baseline)

#### Unit Tests (5 test files, 20+ critical tests)

**RBAC Permissions** (`permissions.test.ts`)
- ✅ OWNER role: All permissions
- ✅ ADMIN role: Member management (no role management)
- ✅ MEMBER role: Basic CRUD only
- ✅ VIEWER role: Read-only access
- ✅ Permission hierarchy validation
- ✅ Edge cases (null/undefined roles)

**Rate Limiting** (`rate-limit.test.ts`)
- ✅ FREE plan: 100 req/hour
- ✅ PRO plan: 1000 req/hour
- ✅ ENTERPRISE plan: 10,000 req/hour
- ✅ Counter decrement per request
- ✅ Separate counters per organization
- ✅ Rate limit headers
- ✅ Reset functionality

**Quota Enforcement** (`quota-enforcement.test.ts`)
- ✅ User quota checks
- ✅ Contact/Lead/Account quota checks
- ✅ File storage quota
- ✅ Bulk creation validation
- ✅ Error message formatting
- ✅ Critical/Approaching thresholds

**Authentication** (`auth.test.ts`)
- ✅ Credentials validation
- ✅ Password hashing/comparison
- ✅ OAuth flow (Google/GitHub)
- ✅ Session creation
- ✅ User auto-creation for OAuth
- ✅ Demo environment handling

**Stripe Integration** (`stripe.test.ts`)
- ✅ Customer retrieval by email
- ✅ Customer creation
- ✅ Get or create customer (idempotent)
- ✅ Subscription retrieval
- ✅ Error handling

#### Integration Tests

**Multi-Tenancy** (`multi-tenancy.test.ts`)
- ✅ Organization ID filtering
- ✅ Cross-tenant access prevention
- ✅ Data isolation (Contacts, Accounts, Leads, Opportunities)
- ✅ Organization context in session
- ✅ Create with organizationId
- ✅ Update with organization verification
- ✅ Reporting aggregation by organization

**Stripe Webhooks** (`stripe-webhook.test.ts`)
- ✅ Signature verification
- ✅ customer.subscription.created
- ✅ customer.subscription.updated
- ✅ customer.subscription.deleted
- ✅ invoice.payment_succeeded
- ✅ invoice.payment_failed
- ✅ Missing organization handling
- ✅ Unknown event types

## Writing New Tests

### Unit Test Example

```typescript
import { functionToTest } from '@/lib/my-module'

describe('My Feature', () => {
  it('should do something', () => {
    const result = functionToTest('input')
    expect(result).toBe('expected output')
  })

  it('should handle edge cases', () => {
    expect(() => functionToTest(null)).toThrow()
  })
})
```

### Integration Test Example

```typescript
import { prismaMock } from '@/tests/mocks/prisma'

describe('API Route', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return filtered data', async () => {
    prismaMock.model.findMany = jest.fn().mockResolvedValue([
      { id: '1', data: 'test' }
    ])

    // Test your route
  })
})
```

## Test Best Practices

1. **Isolation**: Each test should be independent and not rely on others
2. **Mocking**: Mock external dependencies (database, APIs, auth)
3. **Descriptive Names**: Use clear, descriptive test names
4. **Arrange-Act-Assert**: Structure tests with setup, execution, and verification
5. **Edge Cases**: Test error conditions and boundary cases
6. **Coverage**: Aim for 80%+ coverage on critical paths

## Critical Paths to Test

### Authentication Flow
- User registration
- Login (credentials, OAuth)
- Session management
- Password reset

### RBAC (Role-Based Access Control)
- Permission checks for each role
- API route authorization
- UI component visibility

### Multi-Tenancy
- Organization ID filtering on all queries
- Cross-tenant access prevention
- Data isolation

### Billing & Subscriptions
- Stripe webhook handling
- Plan upgrades/downgrades
- Payment success/failure
- Quota enforcement

### CRM Operations
- Create/Read/Update/Delete for:
  - Accounts
  - Contacts
  - Leads
  - Opportunities
- Assignment and watchers
- Email notifications

## Continuous Integration

Tests run automatically on:
- Every pull request
- Every push to main branch
- Nightly builds

### CI Configuration

See `.github/workflows/test.yml` for the CI/CD pipeline configuration.

## Troubleshooting

### Tests Failing Locally

1. **Clear Jest cache**
   ```bash
   pnpm test --clearCache
   ```

2. **Update snapshots**
   ```bash
   pnpm test -u
   ```

3. **Check environment variables**
   - Ensure `.env.test` is configured
   - Mock external services

### Common Issues

**Issue**: "Cannot find module"
- Solution: Check `tsconfig.json` path aliases

**Issue**: "ReferenceError: fetch is not defined"
- Solution: Node 18+ required, or use `whatwg-fetch` polyfill

**Issue**: "Timeout exceeded"
- Solution: Increase timeout in `jest.config.js`

## Resources

- [Jest Documentation](https://jestjs.io/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Best Practices](https://testingjavascript.com/)
- [NextCRM Architecture](/CLAUDE.md)

## Contributing

When adding new features:
1. Write tests first (TDD)
2. Ensure all tests pass
3. Maintain/improve coverage
4. Update this README if adding new test categories

---

**Last Updated**: 2025-11-04
**Test Count**: 20+ critical tests
**Coverage Baseline**: 0% → Target: 80%
