# AWMS User Acceptance Testing (UAT) Suite

This directory contains the comprehensive automated UAT test suite for the Automotive Workshop Management System (AWMS), with browser automation tests covering all user roles and critical workflows.

## Overview

The UAT suite includes:
- **Automated Tests**: Browser automation tests using Puppeteer + Jest
- **Test Data Generator**: Realistic data generation for 500+ customers, 5000+ work orders
- **Role-Based Testing**: Tests for all roles (Service Advisor, Technician, Customer, Admin, etc.)
- **End-to-End Workflows**: Complete workflow testing from login through business operations
- **Test Reporting**: HTML and XML reports with screenshots on failures

## Quick Start

### 1. Install Dependencies

```bash
pnpm install
# or
npm install
```

### 2. Generate Test Data

Before running tests, populate your test environment with realistic data:

```bash
# Generate all test data (500 customers, 5000 work orders, etc.)
pnpm run test:uat:generate-data

# OR generate only test accounts (if DB already has data)
pnpm run test:uat:generate-accounts

# OR clear all test data
pnpm run test:uat:clear
```

### 3. Run UAT Tests

```bash
# Run all UAT tests
pnpm run test:uat

# Run tests in headed mode (watch browser)
HEADLESS=false pnpm run test:uat

# Run tests with slow motion (500ms delay between actions)
SLOW_MO=500 pnpm run test:uat
```

## Configuration

### Environment Variables

Create a `.env.local` file in the project root:

```env
# Test Application URL
AWMS_TEST_URL=http://localhost:3000

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/awms_test

# Optional: Test Configuration
HEADLESS=true          # Run browser in headless mode
SLOW_MO=0             # Milliseconds delay between Puppeteer actions
```

## Test Structure

### Test Files

- **`uat-test-suite.ts`** (700+ lines)
  - Main test suite using Puppeteer for browser automation
  - Contains 9+ automated test methods
  - Handles login, navigation, form filling, validation
  - Captures screenshots on failure

- **`test-data-generator.ts`** (400+ lines)
  - Generates realistic test data
  - Creates test accounts for all roles
  - Populates customers, work orders, invoices, quotes
  - CLI interface for easy data management

- **`setup.ts`** (50+ lines)
  - Jest setup and configuration
  - Environment variable loading
  - Global test utilities

### Test User Accounts

The following test accounts are automatically created:

```
Service Advisor:  sa_test@awmstest.com / TestPassword123!
Technician:       tech_test@awmstest.com / TechPassword123!
Customer:         customer_test@awmstest.com / CustomerPass123!
Manager:          manager_test@awmstest.com / ManagerPass123!
Admin:            admin_test@awmstest.com / AdminPassword123!
Super Admin:      super_test@awmstest.com / SuperPass123!
```

## Test Categories

### Service Advisor Tests (SA-001, SA-002, SA-007)
- Dashboard access and metrics display
- Work order creation with customer selection
- Branch isolation enforcement
- Admin access denial

### Technician Tests (TECH-001, TECH-002)
- Tablet responsiveness (1024x1366 viewport)
- Touch-friendly UI validation (44x44px buttons)
- Work order completion workflow
- QC (Quality Control) note requirement

### Customer Portal Tests (CUST-001)
- Portal registration and signup
- Email verification
- Dashboard access and permissions

### API Authentication Tests (AUTH-API-002, AUTH-API-004)
- Valid JWT token validation
- Invalid token rejection (401 error)

### Admin Tests (ADM-002)
- User management CRUD operations
- Role assignment
- Superadmin escalation prevention

## Test Results

Test results are automatically generated in the `test-results/` directory:

```
test-results/
├── uat-results.xml       # JUnit XML format for CI/CD integration
└── uat-report.html       # HTML report with detailed metrics and screenshots
```

### Viewing Results

After running tests:

```bash
# Open HTML report in browser
open test-results/uat-report.html
```

The HTML report includes:
- Overall pass/fail rate
- Test breakdown by role
- Failed test details with error messages
- Screenshots of failures for debugging
- Execution timestamps and duration

## Advanced Usage

### Run Single Test

```bash
# Run only Service Advisor tests
pnpm test:uat -- --testNamePattern="ServiceAdvisor"

# Run only tests matching a pattern
pnpm test:uat -- --testNamePattern="Login|Dashboard"
```

### Debug Mode

```bash
# Run with visible browser and 1 second delays
HEADLESS=false SLOW_MO=1000 pnpm run test:uat

# Watch mode (requires jest --watch)
# Note: Not recommended for Puppeteer tests due to complexity
```

### Performance Testing

For load testing and stress testing (included in comprehensive UAT plan):

```bash
# Concurrent user testing (100, 200, 500 users)
# Configure in test suite or separate load test runner
```

## Troubleshooting

### Tests Won't Start
1. Verify Node.js version (14.x or higher required)
2. Check `pnpm install` completed successfully
3. Verify database connection in `.env.local`
4. Ensure AWMS application is running on `AWMS_TEST_URL`

### Timeout Errors
1. Increase `testTimeout` in `jest.uat.config.js` (default: 60000ms)
2. Check network connectivity
3. Verify application is responsive
4. Check browser cache isn't interfering

### Puppeteer Issues
1. Update Puppeteer: `pnpm install puppeteer@latest`
2. Install required system dependencies:
   ```bash
   # Ubuntu/Debian
   sudo apt-get install -y gconf-service libasound2 libatk1.0-0 libc6 libcairo2

   # macOS
   brew install --cask chromium
   ```

### Database Errors
1. Verify database is running and accessible
2. Run migrations: `pnpm exec prisma migrate dev`
3. Seed database: `pnpm exec prisma db seed`
4. Clear and regenerate test data: `pnpm run test:uat:clear && pnpm run test:uat:generate-data`

## Coverage Requirements

Per UAT plan, the following coverage targets must be met:

- **Branches**: 80%
- **Functions**: 80%
- **Lines**: 80%
- **Statements**: 80%

View coverage after test run:

```bash
# Coverage reports are generated automatically
# View in: coverage/
```

## Integration with CI/CD

For GitHub Actions integration:

```yaml
- name: Run UAT Tests
  run: pnpm run test:uat

- name: Upload Test Results
  uses: actions/upload-artifact@v2
  with:
    name: uat-test-results
    path: test-results/
```

## Test Maintenance

### Adding New Tests

1. Add test method to `AWMSUATSuite` class in `uat-test-suite.ts`
2. Follow existing pattern: setup → action → assert → record result
3. Add test user accounts in `TEST_USERS` if needed
4. Run `pnpm run test:uat` to validate

### Updating Test Data

1. Modify `generateTestData()` options in `test-data-generator.ts`
2. Adjust quantities in `DEFAULT_OPTIONS`
3. Run `pnpm run test:uat:clear && pnpm run test:uat:generate-data`

## Documentation References

- UAT Plan: See comprehensive AWMS UAT documentation
- Test Cases: 150+ role-based test scenarios documented
- Role Permissions: See Quick Reference Guide for role matrix
- Success Criteria: Defined in UAT execution tracker
- Go-Live Checklist: Post-UAT validation items

## Support

For issues or questions about the UAT suite:

1. Check this README and troubleshooting section
2. Review test output in `test-results/uat-report.html`
3. Check Jest console output for detailed error messages
4. Verify all environment variables are set correctly

## Status

✅ **Ready for Implementation**

The UAT infrastructure is fully set up and ready for:
- Automated test execution
- Continuous integration
- Daily regression testing
- Pre-release validation

---

Last Updated: November 2025
