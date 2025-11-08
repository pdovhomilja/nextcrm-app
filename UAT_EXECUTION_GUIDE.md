# AWMS UAT Execution Guide

**Version**: 2.0
**Date**: November 8, 2025
**Status**: ✅ Ready for Execution

## Table of Contents

1. [Quick Start](#quick-start)
2. [Test Suites Overview](#test-suites-overview)
3. [Execution Instructions](#execution-instructions)
4. [CI/CD Integration](#cicd-integration)
5. [Performance Testing](#performance-testing)
6. [Monitoring & Reporting](#monitoring--reporting)
7. [Troubleshooting](#troubleshooting)

---

## Quick Start

### Minimal Setup (5 minutes)

```bash
# 1. Install dependencies
pnpm install

# 2. Generate test data
pnpm run test:uat:generate-data

# 3. Run core UAT tests
pnpm run test:uat

# 4. View results
open test-results/uat-report.html
```

### Expected Output

```
✅ 9 core tests passing (SA-001, SA-002, SA-007, TECH-001, TECH-002, CUST-001, AUTH-API-002, AUTH-API-004, ADM-002)
📊 Pass Rate: 100%
⏱️ Duration: ~2-3 minutes
```

---

## Test Suites Overview

### 1. Core UAT Test Suite (uat-test-suite.ts)

**9 Test Scenarios** covering critical workflows:

| Test ID | Scenario | Role | Duration |
|---------|----------|------|----------|
| SA-001 | Service Advisor Dashboard | Service Advisor | ~30s |
| SA-002 | Create Work Order | Service Advisor | ~45s |
| SA-007 | Branch Isolation | Service Advisor | ~30s |
| TECH-001 | Tablet Responsiveness | Technician | ~20s |
| TECH-002 | Work Order Completion | Technician | ~40s |
| CUST-001 | Portal Registration | Customer | ~35s |
| AUTH-API-002 | Valid JWT Token | API | ~10s |
| AUTH-API-004 | Invalid JWT Token | API | ~10s |
| ADM-002 | User Management | Admin | ~40s |

**Run Command:**
```bash
pnpm run test:uat
```

**Configuration:**
```env
AWMS_TEST_URL=http://localhost:3000
HEADLESS=true
SLOW_MO=0
```

**Output:**
- Console output with pass/fail status
- Screenshots in `test-screenshots/`
- Report in `test-results/uat-report.html`
- JUnit XML in `test-results/uat-results.xml`

---

### 2. Extended UAT Test Suite (uat-test-suite-extended.ts)

**10 Additional Test Scenarios** for expanded coverage:

| Test ID | Scenario | Role | Coverage |
|---------|----------|------|----------|
| MAN-001 | Manager Dashboard | Manager | Team metrics, filtering |
| MAN-002 | Work Order Assignment | Manager | Technician assignment, tracking |
| MAN-003 | Report Generation | Manager | PDF export, date ranges |
| BA-001 | Branch Settings | Branch Admin | Branch configuration |
| BA-002 | User Management | Branch Admin | Branch user management |
| CUST-002 | Work Order Tracking | Customer | Status timeline, activity log |
| CUST-003 | Payment Processing | Customer | Invoice viewing, payment UI |
| SEC-001 | Access Prevention | Security | Cross-role access denial |
| SEC-002 | Session Timeout | Security | Session management |

**Run Command:**
```bash
pnpm run test:uat:extended
```

**Features:**
- Manager role testing
- Branch Admin role testing
- Extended Customer Portal tests
- Security & permission testing
- Session management validation

**Output:**
- Console report with pass/fail rates
- Screenshots of failures
- JSON report in `test-results/extended-uat-report.json`

---

### 3. Performance & Load Testing Suite (performance-testing.ts)

**Comprehensive Performance Analysis** of system under load:

#### Supported Test Scenarios

**Dashboard Performance:**
- 10, 50, 100 concurrent users
- Response time analysis
- Throughput measurement

**Work Order API:**
- 20, 100, 200 concurrent users
- CRUD operation testing
- Scalability validation

**Search Performance:**
- 100 concurrent users
- Query performance
- Index efficiency

**Create Operations:**
- 50 concurrent users for work order creation
- Data integrity under load
- Transaction performance

**Stress Testing:**
- Progressive load: 10 → 500 concurrent users
- Breaking point identification
- Recovery behavior

#### Key Metrics Collected

For each test run:
- Total requests & success rate
- Average response time
- Min/Max response times
- P50, P95, P99 percentiles
- Requests per second
- Error rate
- Timestamp

**Run Commands:**

```bash
# Dashboard performance test
pnpm run test:uat:performance

# Stress test (10-500 concurrent users)
pnpm run test:uat:stress
```

**Performance Targets:**

```
Metric                  Target      Current
─────────────────────────────────────────────
Dashboard Load          < 2s        [TBD]
API Response (avg)      < 500ms     [TBD]
API Response (p95)      < 1s        [TBD]
Throughput              > 100 req/s [TBD]
Error Rate              < 1%        [TBD]
Max Concurrent Users    500+        [TBD]
```

---

## Execution Instructions

### Prerequisites

1. **System Requirements**
   - Node.js 14.x or higher
   - 2GB+ RAM
   - Internet connection (for Puppeteer)
   - PostgreSQL 12+

2. **Environment Setup**
   ```bash
   # Create .env.local
   cp .env.local.example .env.local

   # Update with your values
   DATABASE_URL=postgresql://user:password@localhost:5432/awms_test
   AWMS_TEST_URL=http://localhost:3000
   ```

3. **Dependencies**
   ```bash
   pnpm install
   ```

4. **Database**
   ```bash
   # Run migrations
   pnpm exec prisma migrate deploy

   # Seed initial data
   pnpm exec prisma db seed
   ```

5. **Application**
   ```bash
   # Start development server
   pnpm dev

   # Should be running at http://localhost:3000
   ```

### Step-by-Step Execution

#### Phase 1: Data Preparation (5 minutes)

```bash
# Clear any existing test data (optional)
pnpm run test:uat:clear

# Generate fresh test data
pnpm run test:uat:generate-data

# Verify data created
pnpm exec prisma studio  # Browse data in browser
```

#### Phase 2: Core Testing (3 minutes)

```bash
# Run 9 core test scenarios
pnpm run test:uat

# Expected output:
# ✅ SA-001: Service Advisor Dashboard PASS (800ms)
# ✅ SA-002: Create Work Order PASS (1200ms)
# ... (9 tests total)
# 📊 Pass Rate: 9/9 (100%)
# ⏱️ Total Duration: 2m 30s
```

#### Phase 3: Extended Testing (5 minutes, optional)

```bash
# Run extended test suite (additional 10 scenarios)
pnpm run test:uat:extended

# Covers Manager, Branch Admin, Customer, Security roles
```

#### Phase 4: Performance Testing (10-30 minutes, optional)

```bash
# Run performance baseline tests
pnpm run test:uat:performance

# Generates performance report with:
# - Dashboard load times (10, 50, 100 users)
# - API response times (20, 100, 200 users)
# - Search performance (100 users)
# - Create operations performance (50 users)
```

#### Phase 5: Results Review (5 minutes)

```bash
# View HTML report
open test-results/uat-report.html

# Check extended results
open test-results/extended-uat-report.json

# View performance metrics
open test-results/performance-report.json
```

---

## CI/CD Integration

### GitHub Actions Workflow

**File**: `.github/workflows/uat-tests.yml`

**Triggers:**
- Push to main, develop, claude/* branches
- Pull requests to main, develop
- Daily schedule at 2 AM UTC

**Workflow Steps:**
1. Checkout code
2. Setup Node.js & pnpm
3. Install dependencies
4. Configure environment
5. Run database migrations
6. Seed test data
7. Start application
8. Generate UAT test data
9. Run core UAT tests
10. Run extended UAT tests
11. Upload test results as artifacts
12. Publish test results to GitHub
13. Comment PR with summary

### Manual Trigger

```bash
# Run tests locally with same configuration as CI/CD
HEADLESS=true pnpm run test:uat

# With debug output
DEBUG=* pnpm run test:uat
```

### GitHub Actions Artifacts

After test run, download:
- `uat-test-results` - HTML & XML reports
- `uat-test-screenshots` - Failure screenshots (30 days retention)

### PR Comment

Automatically posts UAT results to PR:
```
## 🧪 UAT Test Results

| Metric | Value |
|--------|-------|
| Total Tests | 9 |
| Passed ✅ | 9 |
| Failed ❌ | 0 |
| Pass Rate | 100% |
| Duration | 2m 30s |
```

---

## Performance Testing

### Baseline Establishment

Run once to establish performance baseline:

```bash
pnpm run test:uat:performance
```

This generates baseline metrics for:
- Dashboard load times
- API response times
- Search performance
- Create operations

### Regression Detection

Compare new results against baseline:
```bash
# Run performance tests
pnpm run test:uat:performance > new-results.json

# Compare with baseline (manual review)
cat test-results/performance-report.json | grep "averageResponseTime"
```

### Stress Testing

Test system behavior under extreme load:

```bash
pnpm run test:uat:stress
```

Progressively tests: 10 → 50 → 100 → 200 → 300 → 400 → 500 concurrent users

**Stopping Criteria:**
- Error rate exceeds 5%
- Response times exceed 5s
- Application becomes unresponsive

---

## Monitoring & Reporting

### Test Results Location

```
├── test-results/
│   ├── uat-report.html              # Core UAT results (HTML)
│   ├── uat-results.xml              # Core UAT results (JUnit XML)
│   ├── extended-uat-report.json     # Extended suite results
│   └── performance-report.json      # Performance metrics
├── test-screenshots/
│   ├── SA-001-1234567890.png        # Failure screenshots
│   └── ...
```

### Report Contents

**uat-report.html** (Core Tests):
- Test execution summary (9 tests)
- Pass/fail breakdown by role
- Test execution times
- Error details with stack traces
- Screenshots of failures
- Coverage metrics

**extended-uat-report.json** (Extended Tests):
```json
{
  "totalTests": 10,
  "passed": 10,
  "failed": 0,
  "passRate": 100,
  "duration": 450000,
  "byRole": {
    "manager": 3,
    "branch_admin": 2,
    "customer": 2,
    "security": 2,
    "api": 1
  }
}
```

**performance-report.json** (Performance):
```json
[
  {
    "endpoint": "/api/v1/dashboard",
    "method": "GET",
    "concurrentUsers": 100,
    "averageResponseTime": 850.5,
    "p95ResponseTime": 1240.3,
    "p99ResponseTime": 1890.7,
    "requestsPerSecond": 45.2,
    "errorRate": 0.3
  },
  ...
]
```

### Daily Monitoring

**Automated Daily Runs** (via GitHub Actions):
```
2 AM UTC Daily → Run All Tests → Generate Reports → Store Artifacts
```

**Manual Checks**:
```bash
# Quick status check
pnpm run test:uat 2>&1 | tail -20

# Full results review
open test-results/uat-report.html
```

### Alerting

Configure notifications for:
- Test failures (0% pass rate)
- Performance degradation (>50% slower)
- Error rate increase (>5%)

```bash
# Example: Send alert if tests fail
if pnpm run test:uat; then
  echo "✅ Tests passed"
else
  echo "❌ Tests failed - sending alert..."
  # Send Slack message, email, etc.
fi
```

---

## Troubleshooting

### Common Issues & Solutions

#### 1. Tests Won't Start

**Error**: `ENOENT: no such file or directory, open '__tests__/uat/uat-test-suite.ts'`

**Solution**:
```bash
# Verify files exist
ls -la __tests__/uat/

# Rebuild project
rm -rf node_modules .next
pnpm install
pnpm build
```

#### 2. Database Connection Error

**Error**: `connect ECONNREFUSED 127.0.0.1:5432`

**Solution**:
```bash
# Verify database is running
psql -U postgres -d awms_test -c "SELECT 1"

# Update .env.local with correct DATABASE_URL
# Restart database service
```

#### 3. Application Not Ready

**Error**: `connect ECONNREFUSED 127.0.0.1:3000`

**Solution**:
```bash
# Start application in another terminal
pnpm dev

# Or wait for startup
sleep 10 && pnpm run test:uat
```

#### 4. Timeout During Tests

**Error**: `Timeout: test timed out after 60000ms`

**Solution**:
```bash
# Increase timeout in jest.uat.config.js
testTimeout: 120000  # 120 seconds

# Or run tests with slow motion for debugging
SLOW_MO=1000 pnpm run test:uat
```

#### 5. Screenshot Errors

**Error**: `Failed to capture screenshot`

**Solution**:
```bash
# Create screenshots directory
mkdir -p test-screenshots

# Ensure write permissions
chmod 755 test-screenshots
```

#### 6. Memory Issues

**Error**: `JavaScript heap out of memory`

**Solution**:
```bash
# Increase Node memory
NODE_OPTIONS=--max_old_space_size=4096 pnpm run test:uat

# Or reduce test data size
pnpm run test:uat:generate-data --customers=100 --work-orders=1000
```

---

## Advanced Topics

### Debugging Individual Tests

```bash
# Run with visible browser
HEADLESS=false pnpm run test:uat

# Run with slow motion (1 second delays)
SLOW_MO=1000 pnpm run test:uat

# Run specific test pattern
pnpm run test:uat -- --testNamePattern="ServiceAdvisor"
```

### Custom Test Data

```bash
# Generate with custom options
pnpm run test:uat:generate-data \
  --customers=1000 \
  --work-orders=10000 \
  --quotes=2000 \
  --invoices=1500
```

### Integration with Other Tools

**Slack Notifications**:
```bash
# Send results to Slack
curl -X POST -H 'Content-type: application/json' \
  --data '{"text":"UAT Tests: 9/9 passed"}' \
  $SLACK_WEBHOOK_URL
```

**Email Reports**:
```bash
# Send report via email
echo "See attached test report" | \
  mail -s "AWMS UAT Report" team@example.com \
  -a test-results/uat-report.html
```

---

## Success Criteria

### All Tests Passing
```
✅ 9/9 core tests passing (100%)
✅ 10/10 extended tests passing (100%)
✅ All roles tested and validated
✅ No screenshots of failures
```

### Performance Targets Met
```
✅ Dashboard loads < 2 seconds (100 users)
✅ API responses < 500ms average
✅ P95 response time < 1 second
✅ Error rate < 1%
✅ Handles 500+ concurrent users
```

### Regression Prevention
```
✅ Daily automated test runs
✅ CI/CD integration working
✅ Performance baselines established
✅ Failure notifications configured
```

---

## Support & Escalation

### Getting Help

1. **Quick Issues**
   - Review Troubleshooting section above
   - Check test-results/uat-report.html for details

2. **Test Failures**
   - Review error message in report
   - Check screenshots in test-screenshots/
   - Verify test data was generated
   - Ensure application is running

3. **Performance Issues**
   - Check system resources (CPU, memory)
   - Review performance-report.json
   - Compare against baseline
   - Look for database/API bottlenecks

4. **Infrastructure Issues**
   - Verify all environment variables
   - Check database connectivity
   - Verify application health
   - Review application logs

### Escalation Path

```
Local Issue (5 min)
       ↓
Check Documentation (10 min)
       ↓
Review Logs & Reports (10 min)
       ↓
Debug with Slow Motion (15 min)
       ↓
Check CI/CD Logs (5 min)
       ↓
Contact Development Team
```

---

## Next Steps

1. **Immediate (Day 1)**
   - [ ] Complete Quick Start setup
   - [ ] Run core UAT tests
   - [ ] Review results in uat-report.html
   - [ ] Establish baseline metrics

2. **Short Term (Week 1)**
   - [ ] Run extended test suite
   - [ ] Complete performance baseline
   - [ ] Configure CI/CD integration
   - [ ] Set up daily scheduled runs

3. **Medium Term (Week 2-3)**
   - [ ] Add custom test scenarios
   - [ ] Integrate with issue tracking
   - [ ] Set up Slack/email notifications
   - [ ] Create monitoring dashboard

4. **Long Term (Week 4+)**
   - [ ] Expand test coverage (150+ scenarios)
   - [ ] Implement advanced load testing
   - [ ] Create performance SLA dashboards
   - [ ] Establish continuous monitoring

---

## Document Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Nov 8, 2025 | Initial UAT infrastructure |
| 2.0 | Nov 8, 2025 | Added extended & performance tests, CI/CD |

**Last Updated**: November 8, 2025
**Status**: ✅ Ready for Production
