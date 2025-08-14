# Phase 2: Database Performance Optimization

**Priority**: ⚠️ **MEDIUM PRIORITY**  
**Duration**: 2-3 days  
**Risk**: LOW - Performance improvement only, no functionality changes

## 🚨 **CRITICAL: PRODUCTION DATA PROTECTION**

**⚠️ THIS PHASE INVOLVES DATABASE MODIFICATIONS - PRODUCTION DATA MUST BE PROTECTED ⚠️**

### **MANDATORY Pre-Execution Steps**:

```bash
# 1. BACKUP PRODUCTION DATABASE (MANDATORY)
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. VERIFY BACKUP INTEGRITY  
pg_restore --list backup_*.sql | head -10

# 3. TEST ALL CHANGES LOCALLY FIRST
cp .env.example .env.local
# Configure local database connection
npm run db:push:local  # Test index creation locally
```

## 🎯 **Objective**

Optimize database performance for vector search operations, multi-tenant queries, and embedding storage without affecting existing data or functionality.

## 📋 **Database Optimization Tasks**

### Task 1: Vector Search Index Creation

**🛡️ Production-Safe Operations Only**

**Target Tables**: 
- `task_embeddings`
- `board_embeddings`
- `document_embeddings`

**Index Creation Strategy**:
```sql
-- ✅ SAFE: Create vector indexes with CONCURRENTLY (no table locking)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_task_embeddings_vector
ON task_embeddings USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_board_embeddings_vector  
ON board_embeddings USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_document_embeddings_vector
ON document_embeddings USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
```

**Implementation Steps**:
1. **Test Locally First** (30 minutes)
   ```bash
   # Run on development database
   psql $DEV_DATABASE_URL -c "CREATE INDEX CONCURRENTLY idx_task_embeddings_vector ON task_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);"
   
   # Verify index was created
   psql $DEV_DATABASE_URL -c "\d task_embeddings"
   ```

2. **Execute on Production** (60-120 minutes per index)
   ```bash
   # Execute during low-traffic period
   psql $DATABASE_URL -c "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_task_embeddings_vector ON task_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);"
   
   # Monitor progress (in separate session)
   psql $DATABASE_URL -c "SELECT query, state, query_start FROM pg_stat_activity WHERE query LIKE '%CREATE INDEX%';"
   ```

3. **Validate Index Creation** (10 minutes)
   ```sql
   -- Check index exists and is valid
   SELECT schemaname, tablename, indexname, indexdef 
   FROM pg_indexes 
   WHERE tablename IN ('task_embeddings', 'board_embeddings', 'document_embeddings');
   
   -- Verify index usage in query plans
   EXPLAIN (ANALYZE, BUFFERS) 
   SELECT * FROM task_embeddings 
   ORDER BY embedding <-> '[1,2,3,...]'::vector 
   LIMIT 10;
   ```

### Task 2: Multi-Tenant Query Optimization

**Company-Based Filtering Indexes**:

```sql
-- ✅ SAFE: Add composite indexes for company-based queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_company_status
ON "Task" ("assignedToId", "status") 
WHERE "assignedToId" IN (
  SELECT id FROM "User" WHERE cid IS NOT NULL
);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_boards_company_access  
ON "Board" ("createdBy", "updatedAt")
WHERE "createdBy" IN (
  SELECT id FROM "User" WHERE cid IS NOT NULL
);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_company_active
ON "User" ("cid", "createdAt") 
WHERE cid IS NOT NULL AND "emailVerified" IS NOT NULL;
```

### Task 3: Embedding Dimension Validation

**Schema Enhancement for Consistency**:

**Option A: Add Check Constraint (Recommended)**:
```sql  
-- ✅ SAFE: Add constraint for embedding dimension validation
ALTER TABLE task_embeddings 
ADD CONSTRAINT check_embedding_dimension 
CHECK (array_length(embedding, 1) = 1536);

ALTER TABLE board_embeddings 
ADD CONSTRAINT check_embedding_dimension 
CHECK (array_length(embedding, 1) = 1536);

ALTER TABLE document_embeddings 
ADD CONSTRAINT check_embedding_dimension  
CHECK (array_length(embedding, 1) = 1536);
```

**Option B: Application-Level Validation** (if constraints cause issues):
```typescript
// In embedding service
export function validateEmbeddingDimension(embedding: number[]): boolean {
  const EXPECTED_DIMENSION = 1536;
  if (embedding.length !== EXPECTED_DIMENSION) {
    console.error(`Invalid embedding dimension: ${embedding.length}, expected: ${EXPECTED_DIMENSION}`);
    return false;
  }
  return true;
}

// Usage in embedding creation
const embedding = await openai.embeddings.create({...});
if (!validateEmbeddingDimension(embedding.data[0].embedding)) {
  throw new Error("Invalid embedding dimension");
}
```

### Task 4: Query Performance Monitoring

**Add Performance Tracking**:

```sql
-- Enable query statistics (if not already enabled)
ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';
ALTER SYSTEM SET pg_stat_statements.track = 'all';
ALTER SYSTEM SET pg_stat_statements.max = 10000;

-- Restart required for shared_preload_libraries
-- SELECT pg_reload_conf(); -- For other settings
```

**Monitoring Queries**:
```sql
-- Top slow vector queries
SELECT 
  query,
  calls,
  total_time,
  mean_time,
  stddev_time,
  rows
FROM pg_stat_statements 
WHERE query LIKE '%vector%' OR query LIKE '%embedding%'
ORDER BY mean_time DESC
LIMIT 20;

-- Index usage statistics
SELECT 
  schemaname,
  tablename, 
  indexrelname,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes 
WHERE tablename IN ('task_embeddings', 'board_embeddings', 'document_embeddings')
ORDER BY idx_tup_read DESC;
```

## 🧪 **Testing & Validation**

### Performance Benchmarks

**Before Optimization**:
```typescript
// Benchmark vector search performance
const startTime = Date.now();
const results = await db.$queryRaw`
  SELECT t.id, t.title, te.similarity
  FROM task_embeddings te
  JOIN "Task" t ON te.taskId = t.id  
  ORDER BY te.embedding <-> ${embedding}::vector
  LIMIT 10
`;
const duration = Date.now() - startTime;
console.log(`Vector search took ${duration}ms`);
```

**After Optimization**:
- Expect 60-80% performance improvement
- Query times should be <100ms for vector searches
- Index usage should be >90% for filtered queries

### Data Integrity Validation

```sql
-- Verify row counts unchanged
SELECT 
  'Task' as table_name, COUNT(*) as row_count FROM "Task"
UNION ALL
SELECT 
  'task_embeddings' as table_name, COUNT(*) as row_count FROM task_embeddings
UNION ALL  
SELECT
  'Board' as table_name, COUNT(*) as row_count FROM "Board"
UNION ALL
SELECT
  'board_embeddings' as table_name, COUNT(*) as row_count FROM board_embeddings;

-- Verify no data corruption
SELECT COUNT(*) as invalid_embeddings
FROM task_embeddings 
WHERE embedding IS NULL OR array_length(embedding, 1) != 1536;
```

## ✅ **Safety Checklist**

### Pre-Execution Validation
- [ ] **Production database backup completed and verified**
- [ ] **All operations tested successfully on local/staging database**
- [ ] **INDEX operations include CONCURRENTLY keyword**
- [ ] **No DROP, TRUNCATE, or destructive operations**
- [ ] **Low-traffic time window scheduled for execution**
- [ ] **Monitoring tools ready to track progress**

### During Execution  
- [ ] **Monitor database performance metrics**
- [ ] **Watch for lock conflicts or blocking queries**
- [ ] **Verify each index creation completes successfully**
- [ ] **Check application continues functioning normally**

### Post-Execution Validation
- [ ] **All indexes created and marked as valid**
- [ ] **Row counts match pre-execution values**
- [ ] **No application errors related to database queries**
- [ ] **Performance improvements measurable**
- [ ] **Vector search functionality works correctly**

## 🚨 **Emergency Procedures**

### If Index Creation Fails:
```sql
-- Check for failed index creation
SELECT indexname, indexdef FROM pg_indexes WHERE indexname LIKE '%_invalid';

-- Drop invalid indexes
DROP INDEX IF EXISTS idx_task_embeddings_vector_invalid;

-- Retry with adjusted parameters
CREATE INDEX CONCURRENTLY idx_task_embeddings_vector 
ON task_embeddings USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 50); -- Reduced list count
```

### If Performance Degrades:
```sql
-- Temporarily disable problematic index
DROP INDEX CONCURRENTLY idx_problematic_index;

-- Analyze query performance
EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM problematic_table WHERE conditions;
```

### Rollback Strategy:
```sql
-- Remove all newly created indexes
DROP INDEX CONCURRENTLY IF EXISTS idx_task_embeddings_vector;
DROP INDEX CONCURRENTLY IF EXISTS idx_board_embeddings_vector;
DROP INDEX CONCURRENTLY IF EXISTS idx_document_embeddings_vector;
DROP INDEX CONCURRENTLY IF EXISTS idx_tasks_company_status;
DROP INDEX CONCURRENTLY IF EXISTS idx_boards_company_access;
DROP INDEX CONCURRENTLY IF EXISTS idx_users_company_active;
```

## 📊 **Expected Results**

### Performance Improvements:
- **Vector Search**: 60-80% faster query times
- **Multi-tenant Queries**: 40-60% improvement with company filtering
- **Overall App Responsiveness**: 20-30% improvement in AI features

### Resource Utilization:
- **Storage**: ~10-15% increase for indexes
- **Memory**: Better cache utilization
- **CPU**: Reduced load from optimized queries

## 📈 **Monitoring & Metrics**

**Key Metrics to Track**:
- Query execution times (before/after)
- Index usage statistics  
- Database CPU and memory utilization
- Application response times
- Error rates during optimization

**Monitoring Tools**:
- PostgreSQL `pg_stat_statements`
- Application performance monitoring (APM)
- Database monitoring dashboards

## 📝 **Next Phase**

Upon successful completion and validation, proceed to **Phase 3: GPT-5 Model Optimization** for enhanced AI performance.