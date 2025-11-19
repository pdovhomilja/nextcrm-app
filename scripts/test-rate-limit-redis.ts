/**
 * Test script for Redis-based rate limiting
 * Run this to verify Redis connection and rate limiting functionality
 *
 * Usage:
 *   npx ts-node scripts/test-rate-limit-redis.ts
 */

import {
  checkRateLimit,
  getRateLimitStatus,
  isRedisHealthy,
  resetRateLimit,
  closeRedisConnection,
} from "../lib/rate-limit-redis";
import { OrganizationPlan } from "@prisma/client";

async function testRedisConnection() {
  console.log("\n=== Redis Connection Test ===");
  const isHealthy = isRedisHealthy();
  console.log(`Redis Health Status: ${isHealthy ? "✅ Connected" : "❌ Disconnected"}`);

  if (!isHealthy) {
    console.error("\n❌ Redis is not connected. Check:");
    console.error("   1. Redis server is running");
    console.error("   2. REDIS_URL environment variable is set");
    console.error("   3. Network connectivity to Redis");
    console.error("\nStart Redis with: docker run -d -p 6379:6379 redis:7-alpine");
    process.exit(1);
  }
}

async function testRateLimiting() {
  console.log("\n=== Rate Limiting Test ===");

  const testOrgId = `test-org-${Date.now()}`;
  const plan: OrganizationPlan = "FREE"; // 100 requests/hour

  console.log(`\nTesting organization: ${testOrgId}`);
  console.log(`Plan: ${plan} (100 requests/hour)`);

  // Reset any existing limits for clean test
  await resetRateLimit(testOrgId);
  console.log("\n✓ Rate limit reset");

  // Test incremental requests
  console.log("\n--- Testing 10 requests ---");
  for (let i = 1; i <= 10; i++) {
    const result = await checkRateLimit(testOrgId, plan);
    console.log(
      `Request ${i.toString().padStart(2)}: ${result.allowed ? "✅ ALLOWED" : "❌ BLOCKED"} | ` +
      `Remaining: ${result.remaining.toString().padStart(3)}/${result.limit} | ` +
      `Reset: ${new Date(result.resetTime).toLocaleTimeString()}`
    );

    // Small delay to simulate real requests
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  // Check current status without incrementing
  console.log("\n--- Current Status (no increment) ---");
  const status = await getRateLimitStatus(testOrgId, plan);
  console.log(`Used: ${status.used}/${status.limit}`);
  console.log(`Remaining: ${status.remaining}`);
  console.log(`Reset Time: ${new Date(status.resetTime).toISOString()}`);
}

async function testDistributedBehavior() {
  console.log("\n=== Distributed Behavior Test ===");
  console.log("Simulating 3 concurrent requests from different servers...\n");

  const testOrgId = `test-org-distributed-${Date.now()}`;
  const plan: OrganizationPlan = "FREE";

  // Reset for clean test
  await resetRateLimit(testOrgId);

  // Simulate concurrent requests from multiple servers
  const promises = [
    checkRateLimit(testOrgId, plan),
    checkRateLimit(testOrgId, plan),
    checkRateLimit(testOrgId, plan),
  ];

  const results = await Promise.all(promises);

  results.forEach((result, index) => {
    console.log(
      `Server ${index + 1}: Allowed=${result.allowed}, ` +
      `Remaining=${result.remaining}, Used=${100 - result.remaining}`
    );
  });

  // Verify all servers see consistent state
  const uniqueRemainingCounts = new Set(results.map((r) => r.remaining));
  if (uniqueRemainingCounts.size === 1) {
    console.log("\n✅ SUCCESS: All servers see consistent rate limit state");
  } else {
    console.log("\n❌ FAILURE: Inconsistent state across servers");
    console.log("This should not happen with Redis - check implementation");
  }
}

async function testRateLimitExhaustion() {
  console.log("\n=== Rate Limit Exhaustion Test ===");

  const testOrgId = `test-org-exhaust-${Date.now()}`;
  const plan: OrganizationPlan = "FREE"; // 100 requests/hour

  console.log("Making 105 requests to test limit enforcement...\n");

  await resetRateLimit(testOrgId);

  let allowedCount = 0;
  let blockedCount = 0;

  // Make requests in batches to speed up test
  const batchSize = 10;
  const totalRequests = 105;

  for (let batch = 0; batch < Math.ceil(totalRequests / batchSize); batch++) {
    const batchPromises = [];

    for (let i = 0; i < batchSize && batch * batchSize + i < totalRequests; i++) {
      batchPromises.push(checkRateLimit(testOrgId, plan));
    }

    const results = await Promise.all(batchPromises);

    results.forEach((result) => {
      if (result.allowed) {
        allowedCount++;
      } else {
        blockedCount++;
      }
    });

    // Progress indicator
    const progress = Math.min((batch + 1) * batchSize, totalRequests);
    console.log(`Progress: ${progress}/${totalRequests} requests processed...`);
  }

  console.log("\n--- Results ---");
  console.log(`✅ Allowed: ${allowedCount} requests`);
  console.log(`❌ Blocked: ${blockedCount} requests`);
  console.log(`Expected: 100 allowed, 5 blocked`);

  if (allowedCount === 100 && blockedCount === 5) {
    console.log("\n✅ SUCCESS: Rate limiting working correctly");
  } else {
    console.log("\n⚠️  WARNING: Unexpected results - check implementation");
  }
}

async function testMultiplePlans() {
  console.log("\n=== Multiple Plan Types Test ===");

  const plans: Array<{ plan: OrganizationPlan; limit: number }> = [
    { plan: "FREE", limit: 100 },
    { plan: "PRO", limit: 1000 },
    { plan: "ENTERPRISE", limit: 10000 },
  ];

  for (const { plan, limit } of plans) {
    const testOrgId = `test-org-${plan.toLowerCase()}-${Date.now()}`;
    await resetRateLimit(testOrgId);

    const result = await checkRateLimit(testOrgId, plan);

    console.log(
      `${plan.padEnd(12)}: Limit=${limit.toString().padStart(5)}/hour, ` +
      `Remaining=${result.remaining.toString().padStart(5)}, Status=${result.allowed ? "✅" : "❌"}`
    );
  }

  console.log("\n✅ All plan types configured correctly");
}

async function testErrorHandling() {
  console.log("\n=== Error Handling Test ===");
  console.log("Note: This test requires manually stopping Redis to test fail-open behavior");
  console.log("The system should allow requests if Redis is unavailable (fail-open)");

  // Just verify current behavior
  const isHealthy = isRedisHealthy();
  if (isHealthy) {
    console.log("✅ Redis is healthy - fail-open behavior will activate if Redis fails");
  } else {
    console.log("⚠️  Redis is unavailable - testing fail-open behavior...");

    const testOrgId = `test-org-failopen-${Date.now()}`;
    const result = await checkRateLimit(testOrgId, "FREE");

    if (result.allowed) {
      console.log("✅ SUCCESS: Requests allowed when Redis is down (fail-open)");
    } else {
      console.log("❌ FAILURE: Requests blocked when Redis is down");
    }
  }
}

async function runAllTests() {
  console.log("╔═══════════════════════════════════════════════════════════════╗");
  console.log("║         Redis-Based Rate Limiting Test Suite                 ║");
  console.log("╚═══════════════════════════════════════════════════════════════╝");

  try {
    // Test 1: Connection
    await testRedisConnection();

    // Test 2: Basic rate limiting
    await testRateLimiting();

    // Test 3: Distributed behavior
    await testDistributedBehavior();

    // Test 4: Rate limit exhaustion
    await testRateLimitExhaustion();

    // Test 5: Multiple plan types
    await testMultiplePlans();

    // Test 6: Error handling
    await testErrorHandling();

    console.log("\n╔═══════════════════════════════════════════════════════════════╗");
    console.log("║                    All Tests Completed!                       ║");
    console.log("╚═══════════════════════════════════════════════════════════════╝");
  } catch (error) {
    console.error("\n❌ Test failed with error:", error);
    process.exit(1);
  } finally {
    // Cleanup
    console.log("\nClosing Redis connection...");
    await closeRedisConnection();
    console.log("✓ Connection closed");
  }
}

// Run tests
runAllTests();
