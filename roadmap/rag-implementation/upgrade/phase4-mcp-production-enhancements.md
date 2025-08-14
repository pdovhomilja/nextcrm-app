# Phase 4: MCP Production Enhancements

**Priority**: ⚠️ **MEDIUM PRIORITY**  
**Duration**: 2-3 days  
**Risk**: LOW - Security enhancement, not functionality blocking

## 🎯 **Objective**

Enhance MCP (Model Context Protocol) servers for production deployment with proper OAuth authentication, rate limiting, error handling, and scalability improvements.

## 🔒 **Current Security Gap**

**Issue**: MCP servers currently lack production-grade security measures
- No OAuth authentication for external access
- Missing rate limiting for API protection
- Basic error handling without proper logging
- No monitoring or metrics collection

## 🔧 **Implementation Tasks**

### Task 1: OAuth Authentication Integration

**Target Files**:
- `/app/api/mcp/tasks/[transport]/route.ts`
- `/app/api/mcp/search/[transport]/route.ts` 
- `/app/api/mcp/analytics/[transport]/route.ts`
- `/app/api/mcp/boards/[transport]/route.ts`

**Implementation Strategy**:

```typescript
import { withMcpAuth } from "@vercel/mcp-adapter";
import { auth } from "@/auth";

// Enhanced authentication wrapper
const authenticatedMcpHandler = (serverSetup: (server: any) => void) => {
  return withMcpAuth(
    createMcpHandler(serverSetup),
    {
      // OAuth configuration
      clientId: process.env.MCP_CLIENT_ID,
      clientSecret: process.env.MCP_CLIENT_SECRET,
      
      // Custom authentication logic
      authenticate: async (token: string) => {
        try {
          // Verify the token using Next-Auth
          const session = await auth();
          if (!session?.user) {
            throw new Error("Invalid authentication");
          }
          
          return {
            userId: session.user.id,
            companyId: session.user.cid,
            permissions: session.user.role
          };
        } catch (error) {
          console.error("MCP Authentication failed:", error);
          throw new Error("Authentication required");
        }
      },
      
      // Rate limiting configuration
      rateLimit: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100 // limit each user to 100 requests per windowMs
      }
    }
  );
};

// Update each MCP server
const handler = authenticatedMcpHandler(async (server) => {
  // Existing server tool definitions
  server.tool("search_tasks", "Search and filter tasks", {
    // ... existing implementation
  }, async (params, context) => {
    // Access authenticated user context
    const { userId, companyId } = context.user;
    
    // Company-scoped data access
    const tasks = await db.task.findMany({
      where: {
        // ... existing filters
        assignedTo: {
          cid: companyId // Ensure company isolation
        }
      }
    });
    
    return { tasks };
  });
});

export { handler as GET, handler as POST };
```

### Task 2: Advanced Rate Limiting & Security

**Create Rate Limiting Middleware**:

**File**: `/lib/mcp/rate-limiter.ts`
```typescript
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// Different rate limits for different MCP operations
export const rateLimiters = {
  // Search operations - more frequent
  search: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(50, "1 m"),
    analytics: true,
  }),
  
  // Modification operations - more restrictive  
  modify: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, "1 m"),
    analytics: true,
  }),
  
  // Analytics operations - moderate
  analytics: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, "1 m"),
    analytics: true,
  }),
  
  // General operations
  general: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(30, "1 m"),
    analytics: true,
  })
};

export async function checkRateLimit(
  identifier: string, 
  operation: keyof typeof rateLimiters
) {
  const limiter = rateLimiters[operation];
  const { success, limit, reset, remaining } = await limiter.limit(identifier);
  
  if (!success) {
    const resetTime = new Date(reset);
    throw new Error(`Rate limit exceeded. Try again at ${resetTime.toISOString()}`);
  }
  
  return { success: true, remaining, reset };
}
```

### Task 3: Enhanced Error Handling & Logging

**Create Centralized Error Handler**:

**File**: `/lib/mcp/error-handler.ts`
```typescript
interface MCPError {
  code: string;
  message: string;
  details?: any;
  userId?: string;
  companyId?: string;
  timestamp: Date;
}

export class MCPErrorHandler {
  /**
   * Log and format MCP errors consistently
   */
  static async handleError(error: any, context?: {
    toolName?: string;
    userId?: string;
    companyId?: string;
    parameters?: any;
  }): Promise<MCPError> {
    const mcpError: MCPError = {
      code: error.code || 'UNKNOWN_ERROR',
      message: error.message || 'An unexpected error occurred',
      details: {
        originalError: error.stack || error,
        toolName: context?.toolName,
        parameters: context?.parameters
      },
      userId: context?.userId,
      companyId: context?.companyId,
      timestamp: new Date()
    };

    // Log to structured logging system
    console.error('[MCP Error]', JSON.stringify(mcpError, null, 2));
    
    // Track error metrics
    await this.trackErrorMetrics(mcpError);
    
    // Notify monitoring system for critical errors
    if (this.isCriticalError(error)) {
      await this.notifyMonitoring(mcpError);
    }

    return mcpError;
  }

  /**
   * Determine if error requires immediate attention
   */
  private static isCriticalError(error: any): boolean {
    const criticalCodes = [
      'DATABASE_CONNECTION_FAILED',
      'AUTHENTICATION_SERVICE_DOWN', 
      'RATE_LIMIT_EXCEEDED_THRESHOLD'
    ];
    
    return criticalCodes.includes(error.code) || 
           error.message?.includes('CRITICAL');
  }

  /**
   * Track error metrics for monitoring
   */
  private static async trackErrorMetrics(error: MCPError) {
    // Implement metrics tracking (e.g., to DataDog, New Relic, etc.)
    // This could be extended based on monitoring infrastructure
    const metrics = {
      errorCount: 1,
      errorType: error.code,
      userId: error.userId,
      companyId: error.companyId,
      timestamp: error.timestamp
    };
    
    // Example: Send to monitoring service
    // await monitoringService.track('mcp_error', metrics);
  }

  /**
   * Send critical error notifications
   */
  private static async notifyMonitoring(error: MCPError) {
    // Implement alerting logic (e.g., Slack, email, PagerDuty)
    console.warn('[CRITICAL MCP ERROR]', error);
    
    // Example notification
    // await alertingService.sendAlert({
    //   severity: 'critical',
    //   message: `MCP ${error.code}: ${error.message}`,
    //   context: error.details
    // });
  }
}

/**
 * Wrap MCP tool implementations with error handling
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  toolName: string,
  implementation: T
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await implementation(...args);
    } catch (error) {
      const context = {
        toolName,
        userId: args[1]?.user?.userId,
        companyId: args[1]?.user?.companyId,
        parameters: args[0]
      };
      
      const mcpError = await MCPErrorHandler.handleError(error, context);
      
      // Return user-friendly error response
      return {
        success: false,
        error: {
          code: mcpError.code,
          message: 'An error occurred processing your request. Please try again.',
          timestamp: mcpError.timestamp.toISOString()
        }
      };
    }
  }) as T;
}
```

### Task 4: SSE Transport Optimization with Redis

**Enhance SSE Transport Performance**:

**File**: `/lib/mcp/sse-transport.ts`
```typescript
import { Redis } from "@upstash/redis";
import { MCPTransport } from "@modelcontextprotocol/sdk";

export class OptimizedSSETransport extends MCPTransport {
  private redis: Redis;
  private sessionStore: Map<string, any> = new Map();
  
  constructor() {
    super();
    this.redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  }

  /**
   * Cache frequently accessed data in Redis
   */
  async cacheToolResult(toolName: string, parameters: any, result: any) {
    const cacheKey = `mcp:${toolName}:${JSON.stringify(parameters)}`;
    const cacheExpiry = 300; // 5 minutes
    
    await this.redis.setex(cacheKey, cacheExpiry, JSON.stringify(result));
  }

  /**
   * Retrieve cached results to reduce database load
   */
  async getCachedResult(toolName: string, parameters: any) {
    const cacheKey = `mcp:${toolName}:${JSON.stringify(parameters)}`;
    const cached = await this.redis.get(cacheKey);
    
    return cached ? JSON.parse(cached as string) : null;
  }

  /**
   * Optimize connection handling
   */
  async handleConnection(sessionId: string) {
    // Store connection metadata
    this.sessionStore.set(sessionId, {
      connectedAt: new Date(),
      lastActivity: new Date(),
      requestCount: 0
    });

    // Set up heartbeat
    const heartbeat = setInterval(() => {
      this.sendHeartbeat(sessionId);
    }, 30000); // 30 seconds

    // Clean up on disconnect
    return () => {
      clearInterval(heartbeat);
      this.sessionStore.delete(sessionId);
    };
  }

  private sendHeartbeat(sessionId: string) {
    // Keep connection alive and update activity
    if (this.sessionStore.has(sessionId)) {
      const session = this.sessionStore.get(sessionId);
      session.lastActivity = new Date();
      // Send heartbeat message
    }
  }
}
```

### Task 5: Monitoring & Health Checks

**Create Health Check System**:

**File**: `/app/api/health/mcp/route.ts`
```typescript
import { NextRequest, NextResponse } from "next/server";
import { simpleMCPClientPool } from "@/lib/ai/simple-mcp-client";

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const healthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {} as Record<string, any>,
    responseTime: 0
  };

  try {
    // Test MCP client pool
    await simpleMCPClientPool.initialize();
    const tools = await simpleMCPClientPool.getTools();
    
    healthStatus.services.mcpClientPool = {
      status: 'healthy',
      toolCount: Object.keys(tools).length,
      availableServers: Object.keys(tools).reduce((acc, toolName) => {
        const serverName = toolName.split('_')[0];
        acc[serverName] = (acc[serverName] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };

    // Test individual MCP servers
    const serverTests = await Promise.allSettled([
      testMCPServer('tasks'),
      testMCPServer('search'),
      testMCPServer('analytics'),
      testMCPServer('boards')
    ]);

    serverTests.forEach((result, index) => {
      const serverNames = ['tasks', 'search', 'analytics', 'boards'];
      const serverName = serverNames[index];
      
      healthStatus.services[`mcp_${serverName}`] = {
        status: result.status === 'fulfilled' ? 'healthy' : 'unhealthy',
        ...(result.status === 'fulfilled' ? result.value : { error: result.reason })
      };
    });

    // Check Redis (if used for caching)
    if (process.env.UPSTASH_REDIS_REST_URL) {
      try {
        const redis = new Redis({
          url: process.env.UPSTASH_REDIS_REST_URL,
          token: process.env.UPSTASH_REDIS_REST_TOKEN,
        });
        
        await redis.ping();
        healthStatus.services.redis = { status: 'healthy' };
      } catch (error) {
        healthStatus.services.redis = { 
          status: 'unhealthy', 
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }

  } catch (error) {
    healthStatus.status = 'unhealthy';
    healthStatus.services.general = {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }

  healthStatus.responseTime = Date.now() - startTime;
  
  // Return appropriate HTTP status
  const httpStatus = healthStatus.status === 'healthy' ? 200 : 503;
  
  return NextResponse.json(healthStatus, { status: httpStatus });
}

async function testMCPServer(serverName: string) {
  try {
    const result = await simpleMCPClientPool.callTool(
      serverName,
      'get_health', // Assume each server has a health check method
      {},
      'health-check'
    );
    
    return {
      status: 'healthy',
      responseTime: Date.now(),
      lastResponse: result
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
```

### Task 6: Performance Metrics Collection

**Create Metrics Collector**:

**File**: `/lib/mcp/metrics.ts`
```typescript
interface MCPMetrics {
  toolName: string;
  executionTime: number;
  success: boolean;
  userId?: string;
  companyId?: string;
  timestamp: Date;
  parameters?: any;
}

export class MCPMetricsCollector {
  private static metrics: MCPMetrics[] = [];

  /**
   * Track MCP tool execution metrics
   */
  static trackExecution(metric: MCPMetrics) {
    this.metrics.push(metric);
    
    // Log slow operations (>2 seconds)
    if (metric.executionTime > 2000) {
      console.warn('[MCP Slow Operation]', {
        toolName: metric.toolName,
        executionTime: metric.executionTime,
        userId: metric.userId
      });
    }
  }

  /**
   * Generate performance reports
   */
  static generateReport(timeRange: { start: Date; end: Date }) {
    const relevantMetrics = this.metrics.filter(
      m => m.timestamp >= timeRange.start && m.timestamp <= timeRange.end
    );

    const report = {
      totalRequests: relevantMetrics.length,
      successRate: relevantMetrics.filter(m => m.success).length / relevantMetrics.length,
      averageResponseTime: relevantMetrics.reduce((sum, m) => sum + m.executionTime, 0) / relevantMetrics.length,
      slowRequests: relevantMetrics.filter(m => m.executionTime > 2000).length,
      toolUsage: this.groupByTool(relevantMetrics),
      userActivity: this.groupByUser(relevantMetrics)
    };

    return report;
  }

  private static groupByTool(metrics: MCPMetrics[]) {
    return metrics.reduce((acc, metric) => {
      if (!acc[metric.toolName]) {
        acc[metric.toolName] = {
          count: 0,
          totalTime: 0,
          successCount: 0
        };
      }
      
      acc[metric.toolName].count++;
      acc[metric.toolName].totalTime += metric.executionTime;
      if (metric.success) acc[metric.toolName].successCount++;
      
      return acc;
    }, {} as Record<string, any>);
  }

  private static groupByUser(metrics: MCPMetrics[]) {
    return metrics.reduce((acc, metric) => {
      const userId = metric.userId || 'anonymous';
      if (!acc[userId]) {
        acc[userId] = { requestCount: 0, totalTime: 0 };
      }
      
      acc[userId].requestCount++;
      acc[userId].totalTime += metric.executionTime;
      
      return acc;
    }, {} as Record<string, any>);
  }
}

/**
 * Decorator to automatically track metrics
 */
export function withMetrics<T extends (...args: any[]) => Promise<any>>(
  toolName: string,
  implementation: T
): T {
  return (async (...args: Parameters<T>) => {
    const startTime = Date.now();
    let success = false;
    
    try {
      const result = await implementation(...args);
      success = true;
      return result;
    } catch (error) {
      success = false;
      throw error;
    } finally {
      const executionTime = Date.now() - startTime;
      
      MCPMetricsCollector.trackExecution({
        toolName,
        executionTime,
        success,
        userId: args[1]?.user?.userId,
        companyId: args[1]?.user?.companyId,
        timestamp: new Date(),
        parameters: args[0]
      });
    }
  }) as T;
}
```

## ✅ **Implementation Checklist**

- [ ] **OAuth authentication integrated** in all MCP servers
- [ ] **Rate limiting implemented** with Redis backend
- [ ] **Enhanced error handling** and logging system  
- [ ] **SSE transport optimized** with caching
- [ ] **Health check endpoints** created and tested
- [ ] **Performance metrics collection** implemented
- [ ] **Security headers** and CORS configured
- [ ] **Environment variables** properly configured
- [ ] **Documentation updated** with new security requirements
- [ ] **Monitoring alerts** configured for critical issues

## 🧪 **Testing Strategy**

### Security Testing
- Authentication bypass attempts
- Rate limiting effectiveness
- CORS policy validation
- Input sanitization testing

### Performance Testing  
- Load testing with concurrent requests
- Cache effectiveness measurement
- Response time under stress
- Memory leak detection

### Integration Testing
- End-to-end MCP workflows
- Error handling scenarios  
- Health check reliability
- Metrics accuracy

## 📊 **Success Metrics**

- **Security**: No authentication bypasses, rate limiting effective
- **Performance**: <10% overhead from security enhancements
- **Reliability**: >99.9% uptime, proper error recovery
- **Monitoring**: Complete observability into MCP operations

## 📝 **Next Steps**

This completes the MCP production enhancement phase. The system now has:
- Enterprise-grade security
- Production monitoring
- Performance optimization
- Comprehensive error handling

Consider implementing additional features like:
- Advanced caching strategies
- Multi-region deployment
- A/B testing capabilities
- Advanced analytics and reporting