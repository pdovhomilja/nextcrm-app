/**
 * AWMS Automated UAT Test Suite
 * Executes comprehensive user acceptance testing across all roles
 * Framework: Jest + Puppeteer for browser automation
 */

import puppeteer, { Browser, Page } from 'puppeteer';
import axios from 'axios';

// Test Configuration
const TEST_CONFIG = {
  baseUrl: process.env.AWMS_TEST_URL || 'http://localhost:3000',
  headless: process.env.HEADLESS !== 'false',
  timeout: 30000,
  slowMo: process.env.SLOW_MO ? parseInt(process.env.SLOW_MO) : 0,
};

// Test User Accounts
const TEST_USERS = {
  serviceAdvisor: {
    email: 'sa_test@awmstest.com',
    password: 'TestPassword123!',
    role: 'service_advisor',
    branch: 'north',
  },
  technician: {
    email: 'tech_test@awmstest.com',
    password: 'TechPassword123!',
    role: 'technician',
    branch: 'north',
  },
  customer: {
    email: 'customer_test@awmstest.com',
    password: 'CustomerPass123!',
    role: 'customer',
  },
  admin: {
    email: 'admin_test@awmstest.com',
    password: 'AdminPassword123!',
    role: 'admin',
  },
  superAdmin: {
    email: 'super_test@awmstest.com',
    password: 'SuperPass123!',
    role: 'superadmin',
  },
};

// Test Results Tracker
interface TestResult {
  testId: string;
  testName: string;
  role: string;
  status: 'PASS' | 'FAIL' | 'BLOCKED';
  duration: number;
  error?: string;
  screenshot?: string;
  timestamp: Date;
}

class AWMSUATSuite {
  private browser: Browser | null = null;
  private results: TestResult[] = [];

  async setup(): Promise<void> {
    console.log('🔧 Setting up UAT test environment...');
    this.browser = await puppeteer.launch({
      headless: TEST_CONFIG.headless,
      slowMo: TEST_CONFIG.slowMo,
    });
    console.log('✅ Browser launched successfully');
  }

  async teardown(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      console.log('✅ Browser closed');
    }
  }

  async login(page: Page, user: typeof TEST_USERS.serviceAdvisor): Promise<void> {
    console.log(`  🔐 Logging in as ${user.role}...`);

    await page.goto(`${TEST_CONFIG.baseUrl}/login`);
    await page.waitForSelector('input[type="email"]', { timeout: TEST_CONFIG.timeout });

    // Enter credentials
    await page.type('input[type="email"]', user.email);
    await page.type('input[type="password"]', user.password);

    // Submit login
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: TEST_CONFIG.timeout });

    console.log(`  ✅ Logged in as ${user.role}`);
  }

  async takeScreenshot(page: Page, testId: string): Promise<string> {
    const path = `./test-screenshots/${testId}-${Date.now()}.png`;
    await page.screenshot({ path });
    return path;
  }

  async recordResult(result: Omit<TestResult, 'timestamp'>): Promise<void> {
    this.results.push({
      ...result,
      timestamp: new Date(),
    });

    const status = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '🚫';
    console.log(`  ${status} ${result.testId}: ${result.testName} (${result.duration}ms)`);

    if (result.error) {
      console.log(`     Error: ${result.error}`);
    }
  }

  // SECTION 1: SERVICE ADVISOR TESTS
  async testServiceAdvisorDashboard(): Promise<void> {
    const testId = 'SA-001';
    const page = await this.browser!.newPage();
    const startTime = Date.now();

    try {
      await this.login(page, TEST_USERS.serviceAdvisor);

      // Verify dashboard loads
      await page.waitForSelector('[data-testid="dashboard-container"]');

      // Verify metrics display
      const metrics = await page.evaluate(() => {
        return {
          todayAppointments: document.querySelector('[data-testid="todays-appointments"]')?.textContent,
          pendingQuotes: document.querySelector('[data-testid="pending-quotes"]')?.textContent,
          invoicesDue: document.querySelector('[data-testid="invoices-due"]')?.textContent,
        };
      });

      if (!metrics.todayAppointments || !metrics.pendingQuotes) {
        throw new Error('Dashboard metrics not displayed');
      }

      // Verify branch data filtering
      const currentBranch = await page.evaluate(() => {
        return document.querySelector('[data-testid="current-branch"]')?.textContent;
      });

      if (currentBranch !== 'North Branch') {
        throw new Error(`Expected North Branch, got ${currentBranch}`);
      }

      // Attempt to access admin dashboard (should fail)
      await page.goto(`${TEST_CONFIG.baseUrl}/admin/dashboard`);
      const accessDenied = await page.url().includes('/login') ||
                          await page.evaluate(() => document.body.textContent.includes('Access Denied'));

      if (!accessDenied) {
        throw new Error('Service Advisor should not access admin dashboard');
      }

      await this.recordResult({
        testId,
        testName: 'Service Advisor Dashboard Access',
        role: 'service_advisor',
        status: 'PASS',
        duration: Date.now() - startTime,
        screenshot: await this.takeScreenshot(page, testId),
      });
    } catch (error) {
      await this.recordResult({
        testId,
        testName: 'Service Advisor Dashboard Access',
        role: 'service_advisor',
        status: 'FAIL',
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        screenshot: await this.takeScreenshot(page, testId),
      });
    } finally {
      await page.close();
    }
  }

  async testServiceAdvisorCreateWorkOrder(): Promise<void> {
    const testId = 'SA-002';
    const page = await this.browser!.newPage();
    const startTime = Date.now();

    try {
      await this.login(page, TEST_USERS.serviceAdvisor);

      // Navigate to work orders
      await page.click('a[href="/work-orders"]');
      await page.waitForNavigation({ waitUntil: 'networkidle2' });

      // Click create new work order
      await page.click('[data-testid="create-work-order-btn"]');
      await page.waitForSelector('[data-testid="wo-form"]');

      // Select customer
      await page.click('input[name="customer"]');
      await page.type('input[name="customer"]', 'Bob Williams');
      await page.click('li[data-customer-id="customer-123"]');

      // Fill work order details
      await page.type('textarea[name="description"]', 'Regular maintenance and inspection');
      await page.click('select[name="service_type"]');
      await page.select('select[name="service_type"]', 'maintenance');

      // Assign to technician
      await page.click('select[name="assigned_technician"]');
      await page.select('select[name="assigned_technician"]', 'tech-001');

      // Save work order
      await page.click('button[type="submit"]');

      // Verify success message
      await page.waitForSelector('[data-testid="success-message"]', { visible: true });

      // Verify work order appears in list
      await page.waitForNavigation({ waitUntil: 'networkidle2' });
      const woExists = await page.evaluate(() => {
        return document.body.textContent.includes('Regular maintenance and inspection');
      });

      if (!woExists) {
        throw new Error('Work order not created');
      }

      await this.recordResult({
        testId,
        testName: 'Create Work Order',
        role: 'service_advisor',
        status: 'PASS',
        duration: Date.now() - startTime,
        screenshot: await this.takeScreenshot(page, testId),
      });
    } catch (error) {
      await this.recordResult({
        testId,
        testName: 'Create Work Order',
        role: 'service_advisor',
        status: 'FAIL',
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        screenshot: await this.takeScreenshot(page, testId),
      });
    } finally {
      await page.close();
    }
  }

  async testServiceAdvisorBranchIsolation(): Promise<void> {
    const testId = 'SA-007';
    const page = await this.browser!.newPage();
    const startTime = Date.now();

    try {
      await this.login(page, TEST_USERS.serviceAdvisor);

      // Navigate to customers
      await page.goto(`${TEST_CONFIG.baseUrl}/customers`);
      await page.waitForNavigation({ waitUntil: 'networkidle2' });

      // Verify search pre-filters by branch
      const customersShown = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('[data-testid="customer-row"]')).map(
          el => el.getAttribute('data-branch')
        );
      });

      // All customers should be from North Branch
      const allNorthBranch = customersShown.every(branch => branch === 'north');
      if (!allNorthBranch) {
        throw new Error('Branch isolation not enforced for Service Advisor');
      }

      // Attempt to access South Branch customer directly
      const southBranchCustomerId = 'cust-south-001';
      await page.goto(`${TEST_CONFIG.baseUrl}/customers/${southBranchCustomerId}`);

      // Should be redirected or show access denied
      const accessDenied = await page.url().includes('/customers') === false ||
                          await page.evaluate(() => document.body.textContent.includes('Access Denied'));

      if (!accessDenied) {
        throw new Error('Service Advisor accessed customer from different branch');
      }

      await this.recordResult({
        testId,
        testName: 'Branch Isolation Enforcement',
        role: 'service_advisor',
        status: 'PASS',
        duration: Date.now() - startTime,
        screenshot: await this.takeScreenshot(page, testId),
      });
    } catch (error) {
      await this.recordResult({
        testId,
        testName: 'Branch Isolation Enforcement',
        role: 'service_advisor',
        status: 'FAIL',
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        screenshot: await this.takeScreenshot(page, testId),
      });
    } finally {
      await page.close();
    }
  }

  // SECTION 2: TECHNICIAN TESTS
  async testTechnicianLoginOnTablet(): Promise<void> {
    const testId = 'TECH-001';
    const page = await this.browser!.newPage();
    const startTime = Date.now();

    try {
      // Set viewport to tablet size (iPad Pro)
      await page.setViewport({ width: 1024, height: 1366 });

      await this.login(page, TEST_USERS.technician);

      // Verify technician dashboard loads
      await page.waitForSelector('[data-testid="tech-dashboard"]');

      // Verify "My Jobs" section displays
      const myJobsVisible = await page.evaluate(() => {
        return document.querySelector('[data-testid="my-jobs"]') !== null;
      });

      if (!myJobsVisible) {
        throw new Error('My Jobs section not visible on technician dashboard');
      }

      // Verify touch-friendly interface (large buttons)
      const buttonSize = await page.evaluate(() => {
        const button = document.querySelector('[data-testid="clock-in-btn"]');
        if (!button) return null;
        const rect = button.getBoundingClientRect();
        return { width: rect.width, height: rect.height };
      });

      if (!buttonSize || buttonSize.width < 44 || buttonSize.height < 44) {
        throw new Error('Buttons not touch-friendly (minimum 44x44px required)');
      }

      await this.recordResult({
        testId,
        testName: 'Technician Login on Tablet',
        role: 'technician',
        status: 'PASS',
        duration: Date.now() - startTime,
        screenshot: await this.takeScreenshot(page, testId),
      });
    } catch (error) {
      await this.recordResult({
        testId,
        testName: 'Technician Login on Tablet',
        role: 'technician',
        status: 'FAIL',
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        screenshot: await this.takeScreenshot(page, testId),
      });
    } finally {
      await page.close();
    }
  }

  async testTechnicianWorkOrderCompletion(): Promise<void> {
    const testId = 'TECH-002';
    const page = await this.browser!.newPage();
    const startTime = Date.now();

    try {
      await page.setViewport({ width: 1024, height: 1366 });
      await this.login(page, TEST_USERS.technician);

      // Navigate to first assigned work order
      await page.click('[data-testid="work-order-item-0"]');
      await page.waitForNavigation({ waitUntil: 'networkidle2' });

      // Verify work order details displayed
      await page.waitForSelector('[data-testid="wo-details"]');

      // Mark as ready for QC (technician cannot mark complete, only QC-ready)
      const readyForQCBtn = await page.$('[data-testid="ready-for-qc-btn"]');
      const completeBtn = await page.$('[data-testid="complete-wo-btn"]');

      if (!readyForQCBtn) {
        throw new Error('Ready for QC button not available to technician');
      }

      if (completeBtn) {
        throw new Error('Complete button should not be available to technician');
      }

      // Click ready for QC
      await page.click('[data-testid="ready-for-qc-btn"]');

      // Should require QC note
      await page.waitForSelector('[data-testid="qc-note-required"]', { visible: true });

      // Add QC note
      await page.type('[data-testid="qc-note-input"]', 'Work completed, ready for inspection');

      // Submit
      await page.click('[data-testid="submit-qc-btn"]');
      await page.waitForSelector('[data-testid="success-message"]', { visible: true });

      // Verify status changed to "QC Review"
      await page.waitForNavigation({ waitUntil: 'networkidle2' });
      const status = await page.evaluate(() => {
        return document.querySelector('[data-testid="wo-status"]')?.textContent;
      });

      if (status !== 'QC Review') {
        throw new Error(`Expected status "QC Review", got "${status}"`);
      }

      await this.recordResult({
        testId,
        testName: 'Technician Work Order Completion',
        role: 'technician',
        status: 'PASS',
        duration: Date.now() - startTime,
        screenshot: await this.takeScreenshot(page, testId),
      });
    } catch (error) {
      await this.recordResult({
        testId,
        testName: 'Technician Work Order Completion',
        role: 'technician',
        status: 'FAIL',
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        screenshot: await this.takeScreenshot(page, testId),
      });
    } finally {
      await page.close();
    }
  }

  // SECTION 3: CUSTOMER PORTAL TESTS
  async testCustomerPortalRegistration(): Promise<void> {
    const testId = 'CUST-001';
    const page = await this.browser!.newPage();
    const startTime = Date.now();

    try {
      // Navigate to portal registration
      await page.goto(`${TEST_CONFIG.baseUrl}/customer-portal/register`);

      // Enter registration details
      const testEmail = `customer-${Date.now()}@awmstest.com`;
      await page.type('input[name="email"]', testEmail);
      await page.type('input[name="password"]', 'CustomerPass123!');
      await page.type('input[name="confirmPassword"]', 'CustomerPass123!');
      await page.type('input[name="firstName"]', 'Jane');
      await page.type('input[name="lastName"]', 'Doe');

      // Accept terms
      await page.click('input[name="acceptTerms"]');

      // Submit registration
      await page.click('button[type="submit"]');

      // Verify email verification prompt
      await page.waitForSelector('[data-testid="email-verification-prompt"]', { visible: true });

      // In test environment, use verification code
      const verificationCode = '123456'; // Test code
      await page.type('input[name="verificationCode"]', verificationCode);
      await page.click('[data-testid="verify-email-btn"]');

      // Should redirect to portal dashboard after verification
      await page.waitForNavigation({ waitUntil: 'networkidle2' });
      const onDashboard = await page.url().includes('/customer-portal/dashboard');

      if (!onDashboard) {
        throw new Error('Not redirected to dashboard after verification');
      }

      await this.recordResult({
        testId,
        testName: 'Customer Portal Registration',
        role: 'customer',
        status: 'PASS',
        duration: Date.now() - startTime,
        screenshot: await this.takeScreenshot(page, testId),
      });
    } catch (error) {
      await this.recordResult({
        testId,
        testName: 'Customer Portal Registration',
        role: 'customer',
        status: 'FAIL',
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        screenshot: await this.takeScreenshot(page, testId),
      });
    } finally {
      await page.close();
    }
  }

  // SECTION 4: API AUTHENTICATION TESTS
  async testAPIAuthenticationWithValidToken(): Promise<void> {
    const testId = 'AUTH-API-004';
    const startTime = Date.now();

    try {
      // Get valid token by logging in
      const loginResponse = await axios.post(`${TEST_CONFIG.baseUrl}/api/auth/login`, {
        email: TEST_USERS.serviceAdvisor.email,
        password: TEST_USERS.serviceAdvisor.password,
      });

      const token = loginResponse.data.access_token;

      // Make API request with valid token
      const workOrdersResponse = await axios.get(
        `${TEST_CONFIG.baseUrl}/api/v1/work-orders`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (workOrdersResponse.status !== 200) {
        throw new Error(`Expected 200, got ${workOrdersResponse.status}`);
      }

      if (!Array.isArray(workOrdersResponse.data)) {
        throw new Error('Work orders not returned as array');
      }

      await this.recordResult({
        testId,
        testName: 'API Request with Valid Token',
        role: 'service_advisor',
        status: 'PASS',
        duration: Date.now() - startTime,
      });
    } catch (error) {
      await this.recordResult({
        testId,
        testName: 'API Request with Valid Token',
        role: 'service_advisor',
        status: 'FAIL',
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async testAPIAuthenticationWithInvalidToken(): Promise<void> {
    const testId = 'AUTH-API-002';
    const startTime = Date.now();

    try {
      // Make API request with invalid token
      try {
        await axios.get(`${TEST_CONFIG.baseUrl}/api/v1/work-orders`, {
          headers: {
            Authorization: 'Bearer invalid-token-123',
          },
        });
        throw new Error('Request should have been rejected');
      } catch (error: any) {
        if (error.response?.status === 401) {
          // Expected behavior
          await this.recordResult({
            testId,
            testName: 'API Request with Invalid Token Rejected',
            role: 'service_advisor',
            status: 'PASS',
            duration: Date.now() - startTime,
          });
        } else {
          throw error;
        }
      }
    } catch (error) {
      await this.recordResult({
        testId,
        testName: 'API Request with Invalid Token Rejected',
        role: 'service_advisor',
        status: 'FAIL',
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // ADMIN TESTS
  async testAdminUserManagement(): Promise<void> {
    const testId = 'ADM-002';
    const page = await this.browser!.newPage();
    const startTime = Date.now();

    try {
      await this.login(page, TEST_USERS.admin);

      // Navigate to user management
      await page.goto(`${TEST_CONFIG.baseUrl}/admin/users`);
      await page.waitForNavigation({ waitUntil: 'networkidle2' });

      // Verify can see all tenant users
      const userCount = await page.evaluate(() => {
        return document.querySelectorAll('[data-testid="user-row"]').length;
      });

      if (userCount === 0) {
        throw new Error('No users displayed in user management');
      }

      // Click on a user to edit
      await page.click('[data-testid="user-row-0"] [data-testid="edit-btn"]');
      await page.waitForSelector('[data-testid="user-edit-form"]');

      // Verify can modify user role (but not to SuperAdmin)
      const roleSelect = await page.$('select[name="role"]');
      if (!roleSelect) {
        throw new Error('Role select not available');
      }

      // Try to set role to a valid role (not SuperAdmin)
      await page.select('select[name="role"]', 'admin');
      await page.click('[data-testid="save-btn"]');
      await page.waitForSelector('[data-testid="success-message"]', { visible: true });

      await this.recordResult({
        testId,
        testName: 'Admin User Management',
        role: 'admin',
        status: 'PASS',
        duration: Date.now() - startTime,
        screenshot: await this.takeScreenshot(page, testId),
      });
    } catch (error) {
      await this.recordResult({
        testId,
        testName: 'Admin User Management',
        role: 'admin',
        status: 'FAIL',
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        screenshot: await this.takeScreenshot(page, testId),
      });
    } finally {
      await page.close();
    }
  }

  // Generate Test Report
  generateReport(): void {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                    UAT EXECUTION REPORT                    ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    const summary = {
      total: this.results.length,
      passed: this.results.filter(r => r.status === 'PASS').length,
      failed: this.results.filter(r => r.status === 'FAIL').length,
      blocked: this.results.filter(r => r.status === 'BLOCKED').length,
      passRate: (this.results.filter(r => r.status === 'PASS').length / this.results.length * 100).toFixed(1),
      totalDuration: this.results.reduce((sum, r) => sum + r.duration, 0),
    };

    console.log(`📊 Test Summary`);
    console.log(`   Total Tests:    ${summary.total}`);
    console.log(`   ✅ Passed:      ${summary.passed}`);
    console.log(`   ❌ Failed:      ${summary.failed}`);
    console.log(`   🚫 Blocked:     ${summary.blocked}`);
    console.log(`   Pass Rate:      ${summary.passRate}%`);
    console.log(`   Total Duration: ${(summary.totalDuration / 1000).toFixed(2)}s\n`);

    // Results by role
    console.log(`📋 Results by Role:`);
    const roleGroups = this.results.reduce((groups: any, result) => {
      if (!groups[result.role]) {
        groups[result.role] = { passed: 0, failed: 0, blocked: 0 };
      }
      if (result.status === 'PASS') groups[result.role].passed++;
      else if (result.status === 'FAIL') groups[result.role].failed++;
      else groups[result.role].blocked++;
      return groups;
    }, {});

    for (const [role, counts] of Object.entries(roleGroups)) {
      const roleResults = this.results.filter(r => r.role === role);
      const passRate = ((roleResults.filter(r => r.status === 'PASS').length / roleResults.length) * 100).toFixed(1);
      console.log(`   ${role}: ${roleResults.length} tests, ${passRate}% pass rate`);
    }

    // Failed tests
    const failedTests = this.results.filter(r => r.status === 'FAIL');
    if (failedTests.length > 0) {
      console.log(`\n❌ Failed Tests:`);
      failedTests.forEach(test => {
        console.log(`   ${test.testId}: ${test.testName}`);
        console.log(`      Error: ${test.error}`);
        if (test.screenshot) {
          console.log(`      Screenshot: ${test.screenshot}`);
        }
      });
    }

    // Export results to JSON
    const reportPath = './uat-report.json';
    require('fs').writeFileSync(reportPath, JSON.stringify({
      summary,
      results: this.results,
      timestamp: new Date().toISOString(),
    }, null, 2));

    console.log(`\n📄 Full report saved to: ${reportPath}`);
  }

  // Run complete test suite
  async runAllTests(): Promise<void> {
    await this.setup();

    try {
      console.log('🚀 Starting AWMS UAT Test Suite\n');

      // Service Advisor Tests
      console.log('👔 Testing Service Advisor Role...');
      await this.testServiceAdvisorDashboard();
      await this.testServiceAdvisorCreateWorkOrder();
      await this.testServiceAdvisorBranchIsolation();

      // Technician Tests
      console.log('\n🔧 Testing Technician Role...');
      await this.testTechnicianLoginOnTablet();
      await this.testTechnicianWorkOrderCompletion();

      // Customer Tests
      console.log('\n👥 Testing Customer Portal...');
      await this.testCustomerPortalRegistration();

      // API Tests
      console.log('\n🔌 Testing API Authentication...');
      await this.testAPIAuthenticationWithValidToken();
      await this.testAPIAuthenticationWithInvalidToken();

      // Admin Tests
      console.log('\n⚙️  Testing Admin Functions...');
      await this.testAdminUserManagement();

      // Generate report
      this.generateReport();
    } finally {
      await this.teardown();
    }
  }
}

// Execute test suite
const suite = new AWMSUATSuite();
suite.runAllTests().catch(console.error);

export default AWMSUATSuite;
