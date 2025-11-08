/**
 * AWMS Performance & Load Testing Suite
 * Tests application performance under various load conditions
 * Covers 100-500 concurrent users, dashboard load times, API response times
 */

import axios, { AxiosInstance } from 'axios';
import * as fs from 'fs';
import * as path from 'path';

interface PerformanceMetrics {
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  concurrentUsers: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  p50ResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  requestsPerSecond: number;
  errorRate: number;
  timestamp: Date;
}

interface LoadTestConfig {
  baseUrl: string;
  concurrentUsers: number;
  requestsPerUser: number;
  rampUpTime: number; // seconds
  duration: number; // seconds
  timeout: number; // milliseconds
}

/**
 * Performance Testing Suite
 */
class AWMSPerformanceTestSuite {
  private baseUrl: string;
  private authToken: string | null = null;
  private metrics: PerformanceMetrics[] = [];

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  /**
   * Authenticate and get auth token for API requests
   */
  async authenticate(email: string, password: string): Promise<void> {
    try {
      const response = await axios.post(`${this.baseUrl}/api/auth/login`, {
        email,
        password,
      });

      this.authToken = response.data.token;
      console.log('✅ Authentication successful');
    } catch (error) {
      console.error('❌ Authentication failed:', error);
      throw error;
    }
  }

  /**
   * Create axios instance with auth header
   */
  private createClient(): AxiosInstance {
    const client = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
    });

    if (this.authToken) {
      client.defaults.headers.common['Authorization'] = `Bearer ${this.authToken}`;
    }

    return client;
  }

  /**
   * Measure single request performance
   */
  private async measureRequest(
    client: AxiosInstance,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    data?: any
  ): Promise<number> {
    const startTime = Date.now();

    try {
      switch (method) {
        case 'GET':
          await client.get(endpoint);
          break;
        case 'POST':
          await client.post(endpoint, data);
          break;
        case 'PUT':
          await client.put(endpoint, data);
          break;
        case 'DELETE':
          await client.delete(endpoint);
          break;
      }

      return Date.now() - startTime;
    } catch (error) {
      return Date.now() - startTime;
    }
  }

  /**
   * Run concurrent load test on endpoint
   */
  async runLoadTest(config: LoadTestConfig, endpoint: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET'): Promise<PerformanceMetrics> {
    console.log(`\n📊 Running load test: ${method} ${endpoint}`);
    console.log(`   Users: ${config.concurrentUsers}, Duration: ${config.duration}s`);

    const responseTimes: number[] = [];
    let successCount = 0;
    let failureCount = 0;
    const startTime = Date.now();

    // Create worker promises for concurrent requests
    const workers: Promise<void>[] = [];

    for (let user = 0; user < config.concurrentUsers; user++) {
      workers.push(
        (async () => {
          const client = this.createClient();
          const userStartTime = Date.now();

          while (Date.now() - startTime < config.duration * 1000) {
            try {
              const responseTime = await this.measureRequest(client, method, endpoint);
              responseTimes.push(responseTime);
              successCount++;
            } catch (error) {
              failureCount++;
            }
          }
        })()
      );
    }

    // Wait for all workers to complete
    await Promise.all(workers);

    const totalDuration = (Date.now() - startTime) / 1000;

    // Calculate metrics
    const sortedTimes = responseTimes.sort((a, b) => a - b);
    const metrics: PerformanceMetrics = {
      endpoint,
      method,
      concurrentUsers: config.concurrentUsers,
      totalRequests: successCount + failureCount,
      successfulRequests: successCount,
      failedRequests: failureCount,
      averageResponseTime: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
      minResponseTime: Math.min(...responseTimes),
      maxResponseTime: Math.max(...responseTimes),
      p50ResponseTime: sortedTimes[Math.floor(sortedTimes.length * 0.5)],
      p95ResponseTime: sortedTimes[Math.floor(sortedTimes.length * 0.95)],
      p99ResponseTime: sortedTimes[Math.floor(sortedTimes.length * 0.99)],
      requestsPerSecond: successCount / totalDuration,
      errorRate: (failureCount / (successCount + failureCount)) * 100,
      timestamp: new Date(),
    };

    this.metrics.push(metrics);

    // Print results
    this.printMetrics(metrics);

    return metrics;
  }

  /**
   * Test dashboard load performance
   */
  async testDashboardPerformance(): Promise<void> {
    console.log('\n🎯 Dashboard Performance Test');

    const testConfigs = [
      { users: 10, duration: 30, description: '10 concurrent users' },
      { users: 50, duration: 30, description: '50 concurrent users' },
      { users: 100, duration: 30, description: '100 concurrent users' },
    ];

    for (const config of testConfigs) {
      const loadConfig: LoadTestConfig = {
        baseUrl: this.baseUrl,
        concurrentUsers: config.users,
        requestsPerUser: 5,
        rampUpTime: 5,
        duration: config.duration,
        timeout: 30000,
      };

      await this.runLoadTest(loadConfig, '/api/v1/dashboard', 'GET');
    }
  }

  /**
   * Test work order API performance
   */
  async testWorkOrderAPIPerformance(): Promise<void> {
    console.log('\n🎯 Work Order API Performance Test');

    const testConfigs = [
      { users: 20, duration: 30, description: '20 concurrent users' },
      { users: 100, duration: 30, description: '100 concurrent users' },
      { users: 200, duration: 30, description: '200 concurrent users' },
    ];

    for (const config of testConfigs) {
      const loadConfig: LoadTestConfig = {
        baseUrl: this.baseUrl,
        concurrentUsers: config.users,
        requestsPerUser: 10,
        rampUpTime: 5,
        duration: config.duration,
        timeout: 30000,
      };

      await this.runLoadTest(loadConfig, '/api/v1/work-orders', 'GET');
    }
  }

  /**
   * Test search API performance
   */
  async testSearchPerformance(): Promise<void> {
    console.log('\n🎯 Search Performance Test');

    const loadConfig: LoadTestConfig = {
      baseUrl: this.baseUrl,
      concurrentUsers: 100,
      requestsPerUser: 5,
      rampUpTime: 5,
      duration: 30,
      timeout: 30000,
    };

    await this.runLoadTest(loadConfig, '/api/v1/search?q=maintenance', 'GET');
  }

  /**
   * Test create work order performance (POST)
   */
  async testCreateWorkOrderPerformance(): Promise<void> {
    console.log('\n🎯 Create Work Order Performance Test');

    const loadConfig: LoadTestConfig = {
      baseUrl: this.baseUrl,
      concurrentUsers: 50,
      requestsPerUser: 5,
      rampUpTime: 5,
      duration: 30,
      timeout: 30000,
    };

    const data = {
      customerId: 'customer-123',
      description: 'Performance test work order',
      serviceType: 'maintenance',
      assignedTechnicianId: 'tech-001',
    };

    await this.runLoadTest(loadConfig, '/api/v1/work-orders', 'POST');
  }

  /**
   * Stress test - ramp up from 10 to 500 concurrent users
   */
  async stressTest(): Promise<void> {
    console.log('\n💥 Stress Test - Progressive Load Increase');

    const userCounts = [10, 50, 100, 200, 300, 400, 500];

    for (const users of userCounts) {
      const loadConfig: LoadTestConfig = {
        baseUrl: this.baseUrl,
        concurrentUsers: users,
        requestsPerUser: 3,
        rampUpTime: 5,
        duration: 20,
        timeout: 30000,
      };

      console.log(`\n⚡ Testing with ${users} concurrent users...`);
      await this.runLoadTest(loadConfig, '/api/v1/dashboard', 'GET');

      // Cool down between tests
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }

  /**
   * Print formatted metrics
   */
  private printMetrics(metrics: PerformanceMetrics): void {
    console.log(`\n   Method: ${metrics.method} ${metrics.endpoint}`);
    console.log(`   Users: ${metrics.concurrentUsers}`);
    console.log(`   Total Requests: ${metrics.totalRequests}`);
    console.log(`   Successful: ${metrics.successfulRequests} (${(100 - metrics.errorRate).toFixed(2)}%)`);
    console.log(`   Failed: ${metrics.failedRequests} (${metrics.errorRate.toFixed(2)}%)`);
    console.log(`\n   Response Times:`);
    console.log(`     Average: ${metrics.averageResponseTime.toFixed(2)}ms`);
    console.log(`     Min: ${metrics.minResponseTime.toFixed(2)}ms`);
    console.log(`     Max: ${metrics.maxResponseTime.toFixed(2)}ms`);
    console.log(`     P50: ${metrics.p50ResponseTime.toFixed(2)}ms`);
    console.log(`     P95: ${metrics.p95ResponseTime.toFixed(2)}ms`);
    console.log(`     P99: ${metrics.p99ResponseTime.toFixed(2)}ms`);
    console.log(`\n   Throughput: ${metrics.requestsPerSecond.toFixed(2)} req/s`);
  }

  /**
   * Generate performance report
   */
  generateReport(): void {
    console.log('\n' + '='.repeat(80));
    console.log('📈 PERFORMANCE TEST REPORT');
    console.log('='.repeat(80));

    // Summary statistics
    const avgResponseTime = this.metrics.reduce((sum, m) => sum + m.averageResponseTime, 0) / this.metrics.length;
    const avgThroughput = this.metrics.reduce((sum, m) => sum + m.requestsPerSecond, 0) / this.metrics.length;
    const avgErrorRate = this.metrics.reduce((sum, m) => sum + m.errorRate, 0) / this.metrics.length;

    console.log('\n📊 Overall Statistics:');
    console.log(`   Average Response Time: ${avgResponseTime.toFixed(2)}ms`);
    console.log(`   Average Throughput: ${avgThroughput.toFixed(2)} req/s`);
    console.log(`   Average Error Rate: ${avgErrorRate.toFixed(2)}%`);

    // Performance by endpoint
    console.log('\n🎯 Performance by Endpoint:');
    const byEndpoint = new Map<string, PerformanceMetrics[]>();
    this.metrics.forEach((m) => {
      if (!byEndpoint.has(m.endpoint)) {
        byEndpoint.set(m.endpoint, []);
      }
      byEndpoint.get(m.endpoint)!.push(m);
    });

    byEndpoint.forEach((metrics, endpoint) => {
      const avgResponse = metrics.reduce((sum, m) => sum + m.averageResponseTime, 0) / metrics.length;
      const maxUsers = Math.max(...metrics.map((m) => m.concurrentUsers));
      console.log(`   ${endpoint}`);
      console.log(`     Max Users Tested: ${maxUsers}`);
      console.log(`     Avg Response Time: ${avgResponse.toFixed(2)}ms`);
    });

    // Performance warnings
    console.log('\n⚠️  Performance Issues:');
    const issues = this.metrics.filter((m) => m.averageResponseTime > 2000 || m.errorRate > 5);
    if (issues.length === 0) {
      console.log('   ✅ No major performance issues detected');
    } else {
      issues.forEach((issue) => {
        console.log(`   ${issue.endpoint}: ${issue.averageResponseTime.toFixed(2)}ms avg, ${issue.errorRate.toFixed(2)}% errors`);
      });
    }

    // Save JSON report
    const reportPath = './test-results/performance-report.json';
    const reportDir = path.dirname(reportPath);
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    fs.writeFileSync(reportPath, JSON.stringify(this.metrics, null, 2));
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);
    console.log('='.repeat(80) + '\n');
  }

  /**
   * Run all performance tests
   */
  async runAllPerformanceTests(): Promise<void> {
    try {
      console.log('🚀 Starting AWMS Performance & Load Testing Suite\n');

      // Authenticate
      await this.authenticate('sa_test@awmstest.com', 'TestPassword123!');

      // Run test suites
      await this.testDashboardPerformance();
      await this.testWorkOrderAPIPerformance();
      await this.testSearchPerformance();
      await this.testCreateWorkOrderPerformance();

      // Stress test (optional - comment out if too intensive)
      // await this.stressTest();

      // Generate report
      this.generateReport();
    } catch (error) {
      console.error('❌ Performance testing failed:', error);
      throw error;
    }
  }
}

// Execute performance tests
const baseUrl = process.env.AWMS_TEST_URL || 'http://localhost:3000';
const suite = new AWMSPerformanceTestSuite(baseUrl);
suite.runAllPerformanceTests().catch(console.error);

export default AWMSPerformanceTestSuite;
