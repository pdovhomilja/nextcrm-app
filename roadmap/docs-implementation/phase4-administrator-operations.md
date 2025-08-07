# Phase 4: Administrator Operations & Monitoring

## Overview

This phase provides comprehensive operational documentation for system administrators managing the TaskHQ RAG system in production. It covers monitoring, troubleshooting, maintenance, and optimization procedures for ongoing system operations.

## Target Audience

- **Primary**: System administrators and SRE teams
- **Secondary**: DevOps engineers and technical operations staff
- **Technical Level**: Advanced technical knowledge and operational experience

## Prerequisites

- Phase 3 deployment completed successfully
- Production system operational with baseline performance
- Monitoring infrastructure deployed and configured
- Administrative access to all system components

## Implementation Batches

### Batch 4.1: System Monitoring and Health Checks

**Estimated Time**: 3-4 hours
**Deliverables**: Comprehensive monitoring setup and health check documentation

#### Tasks:

- [ ] Document AI system health monitoring procedures
- [ ] Create MCP server monitoring and alerting setup
- [ ] Detail performance metrics collection and analysis
- [ ] Cover vector database monitoring and optimization
- [ ] Include cost tracking and budget monitoring

#### AI System Health Monitoring:

````markdown
## TaskHQ RAG System Monitoring Guide

### Health Check Endpoints

#### Core System Health

- **Application Health**: `GET /api/health`
- **AI Services Health**: `GET /api/health/ai`
- **MCP Servers Health**: `GET /api/health/mcp`
- **Database Health**: `GET /api/health/db`

#### AI-Specific Health Checks

```typescript
// Automated health check implementation
export interface AIHealthStatus {
  overall: "healthy" | "degraded" | "unhealthy";
  services: {
    openai: ServiceStatus;
    mcpServers: MCPServerStatus[];
    vectorDatabase: VectorDBStatus;
    redis: RedisStatus;
    embeddings: EmbeddingServiceStatus;
  };
  metrics: {
    responseTime: number;
    errorRate: number;
    tokenUsage: TokenUsageMetrics;
    concurrentRequests: number;
  };
  timestamp: string;
}

// Health check schedule
export const healthCheckConfig = {
  intervals: {
    critical: "30s", // Core services
    important: "60s", // AI services
    standard: "300s", // Performance metrics
  },
  thresholds: {
    responseTime: 2000, // 2 seconds max
    errorRate: 0.05, // 5% max error rate
    vectorSearchTime: 500, // 500ms max for vector search
    embeddingTime: 3000, // 3 seconds max for embedding generation
  },
};
```
````

### MCP Server Monitoring

#### Server Status Tracking

```typescript
// MCP server monitoring configuration
export interface MCPServerMetrics {
  serverId: string;
  name: string;
  status: "online" | "offline" | "degraded";
  responseTime: number;
  lastHealthCheck: Date;
  errorCount: number;
  toolsAvailable: string[];
  connectionPool: {
    active: number;
    idle: number;
    total: number;
  };
}

// Monitoring checks
export const mcpMonitoringChecks = {
  connectivity: {
    frequency: "30s",
    timeout: 5000,
    retries: 3,
  },
  toolAvailability: {
    frequency: "60s",
    criticalTools: ["create_task", "search_tasks", "analyze_project"],
  },
  performance: {
    frequency: "120s",
    thresholds: {
      responseTime: 1000,
      errorRate: 0.02,
    },
  },
};
```

### Performance Metrics Collection

#### Key Performance Indicators (KPIs)

```yaml
# Prometheus metrics configuration
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "taskhq_ai_rules.yml"

scrape_configs:
  - job_name: "taskhq-ai"
    static_configs:
      - targets: ["localhost:3000"]
    metrics_path: "/api/metrics"
    scrape_interval: 30s

  - job_name: "postgresql"
    static_configs:
      - targets: ["localhost:9187"]
    scrape_interval: 30s

  - job_name: "redis"
    static_configs:
      - targets: ["localhost:9121"]
    scrape_interval: 30s
```

#### Custom AI Metrics

```typescript
// AI-specific metrics collection
export class AIMetricsCollector {
  private static metrics = {
    // Request metrics
    aiRequestsTotal: new prometheus.Counter({
      name: "taskhq_ai_requests_total",
      help: "Total number of AI requests",
      labelNames: ["type", "status", "user_id"],
    }),

    // Response time metrics
    aiResponseTime: new prometheus.Histogram({
      name: "taskhq_ai_response_time_seconds",
      help: "AI request response time",
      labelNames: ["type"],
      buckets: [0.1, 0.5, 1, 2, 5, 10],
    }),

    // Token usage metrics
    tokenUsage: new prometheus.Counter({
      name: "taskhq_ai_tokens_total",
      help: "Total AI tokens consumed",
      labelNames: ["type", "model"],
    }),

    // Vector search metrics
    vectorSearchTime: new prometheus.Histogram({
      name: "taskhq_vector_search_time_seconds",
      help: "Vector search response time",
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2],
    }),

    // MCP server metrics
    mcpServerStatus: new prometheus.Gauge({
      name: "taskhq_mcp_server_status",
      help: "MCP server status (1=healthy, 0=unhealthy)",
      labelNames: ["server_name"],
    }),
  };

  static recordRequest(type: string, status: string, userId: string) {
    this.metrics.aiRequestsTotal.inc({ type, status, user_id: userId });
  }

  static recordResponseTime(type: string, duration: number) {
    this.metrics.aiResponseTime.observe({ type }, duration);
  }

  static recordTokenUsage(type: string, model: string, tokens: number) {
    this.metrics.tokenUsage.inc({ type, model }, tokens);
  }
}
```

### Cost Tracking and Budget Monitoring

#### OpenAI API Cost Tracking

```typescript
// Cost monitoring implementation
export class CostMonitor {
  private static readonly MODEL_COSTS = {
    "gpt-4-turbo": {
      input: 0.01, // per 1K tokens
      output: 0.03, // per 1K tokens
    },
    "text-embedding-ada-002": {
      input: 0.0001, // per 1K tokens
      output: 0,
    },
  };

  static async trackApiCost(
    model: string,
    inputTokens: number,
    outputTokens: number,
    userId: string,
    companyId: string
  ) {
    const modelCost = this.MODEL_COSTS[model];
    if (!modelCost) return;

    const cost =
      (inputTokens / 1000) * modelCost.input +
      (outputTokens / 1000) * modelCost.output;

    await db.aiCostLog.create({
      data: {
        model,
        inputTokens,
        outputTokens,
        cost,
        userId,
        companyId,
        timestamp: new Date(),
      },
    });

    // Check budget alerts
    await this.checkBudgetAlerts(companyId, cost);
  }

  private static async checkBudgetAlerts(companyId: string, newCost: number) {
    const monthlySpend = await this.getMonthlySpend(companyId);
    const budget = await this.getCompanyBudget(companyId);

    if (monthlySpend + newCost > budget * 0.8) {
      await this.sendBudgetAlert(companyId, monthlySpend, budget);
    }
  }
}
```

````

### Batch 4.2: Troubleshooting and Issue Resolution

**Estimated Time**: 4-5 hours
**Deliverables**: Comprehensive troubleshooting guides and issue resolution procedures

#### Tasks:

- [ ] Create common issue identification and resolution guides
- [ ] Document AI service failure scenarios and recovery procedures
- [ ] Detail performance degradation diagnosis and optimization
- [ ] Cover data consistency and backup recovery procedures
- [ ] Include emergency response and escalation procedures

#### Troubleshooting Guide:

```markdown
## TaskHQ RAG System Troubleshooting

### Common Issues and Resolutions

#### AI Assistant Not Responding

**Symptoms:**
- Chat interface shows loading state indefinitely
- Error messages about AI service unavailability
- Timeout errors in browser console

**Diagnosis Steps:**
1. Check AI service health endpoint: `curl https://your-domain.com/api/health/ai`
2. Verify OpenAI API key validity and quota
3. Check MCP server connectivity
4. Review Redis connection status
5. Examine application logs for errors

**Resolution Procedures:**
```bash
# Check OpenAI API status
curl -H "Authorization: Bearer $OPENAI_API_KEY" \
  https://api.openai.com/v1/models

# Restart MCP servers
sudo systemctl restart taskhq-mcp-*

# Clear Redis cache
redis-cli FLUSHDB

# Check application logs
tail -f /var/log/taskhq/application.log | grep -i "ai\|mcp\|openai"
````

#### Vector Search Performance Issues

**Symptoms:**

- Slow document search responses (>5 seconds)
- High CPU usage on database server
- Vector similarity queries timing out

**Diagnosis Steps:**

1. Check vector index statistics
2. Monitor PostgreSQL performance metrics
3. Analyze slow query logs
4. Review vector embedding quality

**Resolution Procedures:**

```sql
-- Check vector index usage
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM task_embeddings
ORDER BY embedding <-> '[0.1,0.2,0.3,...]'::vector
LIMIT 10;

-- Rebuild vector indexes if needed
REINDEX INDEX CONCURRENTLY idx_task_embeddings_vector;

-- Update index parameters for better performance
ALTER INDEX idx_task_embeddings_vector
SET (lists = 200); -- Increase for more data

-- Check index bloat
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats
WHERE tablename LIKE '%embedding%';
```

#### MCP Server Connection Failures

**Symptoms:**

- MCP tools unavailable in AI assistant
- Connection timeout errors
- Server status showing offline

**Diagnosis Steps:**

1. Check MCP server process status
2. Verify Redis SSE transport connectivity
3. Review server logs for connection errors
4. Test individual server endpoints

**Resolution Procedures:**

```bash
# Check MCP server processes
ps aux | grep mcp

# Test MCP server connectivity
curl -v http://localhost:3000/api/mcp/tasks/sse

# Restart individual MCP servers
sudo systemctl restart taskhq-mcp-tasks
sudo systemctl restart taskhq-mcp-search
sudo systemctl restart taskhq-mcp-analytics

# Clear MCP client connections
redis-cli DEL "mcp:clients:*"

# Monitor server startup
journalctl -u taskhq-mcp-tasks -f
```

### Performance Optimization Procedures

#### Database Performance Tuning

```sql
-- Analyze query performance
SELECT query, mean_time, calls, total_time
FROM pg_stat_statements
WHERE query LIKE '%embedding%'
ORDER BY total_time DESC
LIMIT 10;

-- Optimize vector search parameters
SET ivfflat.probes = 5; -- Balance between speed and accuracy

-- Update table statistics
ANALYZE task_embeddings;
ANALYZE document_embeddings;

-- Monitor index usage
SELECT schemaname, tablename, indexname, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
WHERE tablename LIKE '%embedding%';
```

#### Application Performance Optimization

```typescript
// Connection pool optimization
export const databaseConfig = {
  connectionLimit: 20,
  acquireTimeoutMillis: 30000,
  createTimeoutMillis: 30000,
  destroyTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  reapIntervalMillis: 1000,
  createRetryIntervalMillis: 200,
};

// Redis optimization
export const redisConfig = {
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 100,
  lazyConnect: true,
  keepAlive: 30000,
  connectTimeout: 10000,
  commandTimeout: 5000,
};
```

### Backup and Recovery Procedures

#### Database Backup Strategy

```bash
#!/bin/bash
# Automated backup script

BACKUP_DIR="/backup/taskhq"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="taskhq"

# Create backup directory
mkdir -p $BACKUP_DIR

# Full database backup
pg_dump -h localhost -U taskhq_user -d $DB_NAME \
  --format=custom --compress=9 \
  --file="$BACKUP_DIR/taskhq_full_$DATE.backup"

# Vector embeddings backup (separate for faster recovery)
pg_dump -h localhost -U taskhq_user -d $DB_NAME \
  --format=custom --compress=9 \
  --table=task_embeddings --table=document_embeddings \
  --file="$BACKUP_DIR/taskhq_embeddings_$DATE.backup"

# Configuration backup
tar -czf "$BACKUP_DIR/config_$DATE.tar.gz" \
  /etc/taskhq/ \
  /opt/taskhq/.env.local

# Cleanup old backups (keep 30 days)
find $BACKUP_DIR -type f -mtime +30 -delete

echo "Backup completed: $DATE"
```

#### Recovery Procedures

```bash
#!/bin/bash
# Database recovery script

BACKUP_FILE=$1
DB_NAME="taskhq"

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: $0 <backup_file>"
  exit 1
fi

# Create recovery database
createdb -h localhost -U postgres ${DB_NAME}_recovery

# Restore from backup
pg_restore -h localhost -U taskhq_user \
  --dbname=${DB_NAME}_recovery \
  --verbose --clean --if-exists \
  "$BACKUP_FILE"

# Verify restoration
psql -h localhost -U taskhq_user -d ${DB_NAME}_recovery \
  -c "SELECT COUNT(*) FROM tasks;"

echo "Recovery completed. Verify data before switching databases."
```

````

### Batch 4.3: Maintenance and Update Procedures

**Estimated Time**: 3-4 hours
**Deliverables**: System maintenance schedules and update procedures

#### Tasks:

- [ ] Document routine maintenance schedules and procedures
- [ ] Create system update and patch management processes
- [ ] Detail capacity planning and scaling procedures
- [ ] Cover log rotation and cleanup automation
- [ ] Include disaster recovery planning and testing

#### Maintenance Schedule Documentation:

```markdown
## TaskHQ RAG System Maintenance

### Routine Maintenance Schedule

#### Daily Tasks (Automated)
- **Log Rotation**: Rotate application and system logs
- **Metric Collection**: Gather performance and usage metrics
- **Health Checks**: Verify all service endpoints
- **Cost Tracking**: Update AI usage and cost reports

#### Weekly Tasks
- **Performance Review**: Analyze weekly performance metrics
- **Error Log Analysis**: Review and categorize error patterns
- **Capacity Planning**: Monitor resource usage trends
- **Security Updates**: Apply critical security patches

#### Monthly Tasks
- **Database Maintenance**: VACUUM, ANALYZE, and index optimization
- **Backup Verification**: Test backup restoration procedures
- **Performance Optimization**: Review and optimize slow queries
- **Cost Analysis**: Review AI usage costs and budget planning

#### Quarterly Tasks
- **Security Audit**: Comprehensive security review
- **Disaster Recovery Test**: Full DR procedure testing
- **Capacity Planning**: Long-term resource planning
- **System Updates**: Major version updates and migrations

### Automated Maintenance Scripts

#### Daily Maintenance Script
```bash
#!/bin/bash
# Daily maintenance automation

LOG_DIR="/var/log/taskhq"
METRICS_DIR="/var/metrics/taskhq"
DATE=$(date +%Y%m%d)

# Rotate logs
logrotate /etc/logrotate.d/taskhq

# Collect metrics
curl -s http://localhost:3000/api/metrics > "$METRICS_DIR/daily_$DATE.metrics"

# Health check report
curl -s http://localhost:3000/api/health/ai | \
  jq . > "$METRICS_DIR/health_$DATE.json"

# Cleanup temporary files
find /tmp -name "taskhq_*" -mtime +1 -delete

# Monitor disk space
df -h | grep -E "(80|90|9[5-9])%" && \
  echo "WARNING: High disk usage detected" | \
  mail -s "TaskHQ Disk Space Alert" admin@company.com

echo "Daily maintenance completed: $(date)"
````

#### Database Maintenance Script

```bash
#!/bin/bash
# Weekly database maintenance

DB_NAME="taskhq"
LOG_FILE="/var/log/taskhq/db_maintenance.log"

# Log start time
echo "Database maintenance started: $(date)" >> $LOG_FILE

# Update table statistics
psql -d $DB_NAME -c "
  ANALYZE tasks;
  ANALYZE boards;
  ANALYZE task_embeddings;
  ANALYZE document_embeddings;
  ANALYZE ai_conversations;
" >> $LOG_FILE 2>&1

# Vacuum tables
psql -d $DB_NAME -c "
  VACUUM (ANALYZE) tasks;
  VACUUM (ANALYZE) task_embeddings;
  VACUUM (ANALYZE) ai_conversations;
" >> $LOG_FILE 2>&1

# Update vector index statistics
psql -d $DB_NAME -c "
  REINDEX INDEX CONCURRENTLY idx_task_embeddings_vector;
" >> $LOG_FILE 2>&1

# Check for bloated tables
psql -d $DB_NAME -c "
  SELECT schemaname, tablename,
         pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
  FROM pg_tables
  WHERE schemaname = 'public'
  ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
" >> $LOG_FILE 2>&1

echo "Database maintenance completed: $(date)" >> $LOG_FILE
```

### System Update Procedures

#### Application Updates

```bash
#!/bin/bash
# Application update procedure

BACKUP_DIR="/backup/taskhq"
APP_DIR="/opt/taskhq"
DATE=$(date +%Y%m%d_%H%M%S)

# Pre-update backup
echo "Creating pre-update backup..."
./backup.sh

# Stop services
sudo systemctl stop taskhq
sudo systemctl stop taskhq-mcp-*

# Update application code
cd $APP_DIR
git fetch origin
git checkout tags/v2.1.0  # Replace with target version

# Update dependencies
pnpm install --frozen-lockfile

# Run database migrations
pnpm prisma generate
pnpm prisma migrate deploy

# Update configuration if needed
# cp .env.example .env.local
# nano .env.local

# Build application
pnpm build

# Start services
sudo systemctl start taskhq
sudo systemctl start taskhq-mcp-*

# Verify deployment
sleep 30
curl -f http://localhost:3000/api/health || {
  echo "Health check failed, rolling back..."
  ./rollback.sh $DATE
  exit 1
}

echo "Update completed successfully"
```

### Capacity Planning and Scaling

#### Resource Monitoring

```typescript
// Capacity monitoring thresholds
export const capacityThresholds = {
  cpu: {
    warning: 70, // 70% CPU usage
    critical: 85, // 85% CPU usage
  },
  memory: {
    warning: 75, // 75% memory usage
    critical: 90, // 90% memory usage
  },
  storage: {
    warning: 80, // 80% disk usage
    critical: 95, // 95% disk usage
  },
  database: {
    connections: {
      warning: 80, // 80% of max connections
      critical: 95, // 95% of max connections
    },
    queryTime: {
      warning: 1000, // 1 second average
      critical: 5000, // 5 seconds average
    },
  },
  ai: {
    requestQueue: {
      warning: 100, // 100 queued requests
      critical: 500, // 500 queued requests
    },
    responseTime: {
      warning: 5000, // 5 seconds
      critical: 15000, // 15 seconds
    },
  },
};
```

#### Scaling Procedures

```yaml
# Docker Compose scaling configuration
version: "3.8"
services:
  taskhq-app:
    image: taskhq:latest
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: "2"
          memory: 4G
        reservations:
          cpus: "1"
          memory: 2G
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3

  redis:
    image: redis:alpine
    command: redis-server --maxmemory 1gb --maxmemory-policy allkeys-lru

  postgres:
    image: postgres:14
    environment:
      POSTGRES_SHARED_BUFFERS: 2GB
      POSTGRES_EFFECTIVE_CACHE_SIZE: 6GB
```

```

## File Structure

```

docs-implementation/
├── phase4-administrator-operations.md (this file)
├── admin-guides/
│ ├── monitoring-setup.md
│ ├── troubleshooting-guide.md
│ ├── maintenance-procedures.md
│ ├── backup-recovery.md
│ └── capacity-planning.md
├── scripts/
│ ├── maintenance/
│ │ ├── daily-maintenance.sh
│ │ ├── weekly-db-maintenance.sh
│ │ └── monthly-cleanup.sh
│ ├── monitoring/
│ │ ├── health-check.sh
│ │ ├── performance-report.sh
│ │ └── cost-analysis.sh
│ └── recovery/
│ ├── backup.sh
│ ├── restore.sh
│ └── rollback.sh
└── monitoring/
├── prometheus-config.yml
├── grafana-dashboards/
└── alerting-rules.yml

```

## Verification Criteria

### Monitoring Effectiveness

- [ ] All critical services monitored with appropriate thresholds
- [ ] Alert notifications working and reaching appropriate personnel
- [ ] Performance metrics collection and reporting functional
- [ ] Cost tracking and budget monitoring operational

### Operational Readiness

- [ ] Troubleshooting procedures tested and validated
- [ ] Backup and recovery procedures verified
- [ ] Maintenance scripts tested and scheduled
- [ ] Emergency response procedures documented and tested

### Performance Standards

- [ ] System meeting performance SLAs
- [ ] Monitoring overhead minimal (<5% resource impact)
- [ ] Alert noise reduced to actionable alerts only
- [ ] Recovery time objectives (RTO) and recovery point objectives (RPO) met

## Success Metrics

### Operational Excellence

- **Mean Time to Detection (MTTD)**: <5 minutes for critical issues
- **Mean Time to Resolution (MTTR)**: <30 minutes for critical issues
- **System Availability**: >99.9% uptime
- **False Positive Rate**: <10% for monitoring alerts

### Maintenance Efficiency

- **Planned Maintenance Window**: <2 hours monthly
- **Successful Deployments**: >95% success rate
- **Rollback Time**: <10 minutes when needed
- **Backup Verification**: 100% backup integrity

## Dependencies for Next Phase

### Phase 5 Prerequisites

- [ ] Operations team trained and confident with procedures
- [ ] Monitoring and alerting fine-tuned based on operational data
- [ ] Performance baselines established and documented
- [ ] Incident response procedures tested and refined

### Developer Support Foundation

- [ ] Development team access to operational metrics
- [ ] Performance debugging tools and procedures available
- [ ] Development environment aligned with production configuration
- [ ] Change management process between operations and development

## Risk Mitigation

### Operational Risks

- **Human Error**: Comprehensive procedures and automation
- **System Failures**: Redundancy and rapid recovery procedures
- **Performance Degradation**: Proactive monitoring and capacity planning
- **Security Incidents**: Rapid detection and response procedures

### Business Continuity

- **Service Interruption**: High availability configuration and failover
- **Data Loss**: Multiple backup strategies and verification
- **Compliance Issues**: Automated compliance monitoring
- **Cost Overruns**: Budget monitoring and automatic controls

## Post-Phase Actions

### Operations Optimization

1. **Performance Tuning**: Optimize based on operational metrics
2. **Process Refinement**: Improve procedures based on experience
3. **Automation Enhancement**: Automate routine tasks
4. **Knowledge Transfer**: Document lessons learned

### Preparation for Phase 5

1. **Developer Requirements**: Identify developer documentation needs
2. **API Documentation**: Prepare for comprehensive API reference
3. **Architecture Documentation**: Technical system overview preparation
4. **Integration Guides**: Prepare for developer integration documentation

## Notes

- Focus on proactive monitoring over reactive troubleshooting
- Automate routine tasks to reduce human error and operational overhead
- Maintain clear escalation procedures for different severity levels
- Regular review and update of procedures based on operational experience
- Balance between comprehensive monitoring and alert fatigue prevention
```
