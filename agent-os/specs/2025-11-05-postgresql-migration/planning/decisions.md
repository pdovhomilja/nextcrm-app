# PostgreSQL Migration - Architectural Decisions

## Overview

This document captures the key architectural and technical decisions made during the requirements gathering phase for NextCRM's MongoDB to PostgreSQL migration.

---

## Strategic Context

### Why PostgreSQL?

Based on the product mission and roadmap, PostgreSQL was chosen as the TOP PRIORITY for Phase 1 (Q1-Q2 2025) to establish enterprise-grade foundations because:

1. **Better Relational Modeling**: CRM data is inherently relational (accounts → contacts → opportunities → contracts). PostgreSQL's relational model is more natural for this domain.

2. **AI/RAG Enablement**: pgvector extension enables Phase 2's RAG architecture for AI-first features (lead generation, data enrichment, sales intelligence).

3. **Performance at Scale**: Complex queries and aggregations perform better with PostgreSQL's query optimizer and indexing capabilities.

4. **Ecosystem Compatibility**: Broader tool support, monitoring solutions, and enterprise integrations.

5. **Enterprise Adoption**: Mid-market companies (target users) prefer PostgreSQL for self-hosted deployments.

---

## Key Architectural Decisions

### 1. Normalization Strategy

**Decision:** Normalize array-based relationships into junction tables, but keep simple arrays and flexible JSON.

**Rationale:**
- **Junction Tables for Relationships**: Many-to-many relationships (documents, contacts, opportunities) should use proper relational junction tables for referential integrity and query performance.
- **Keep PostgreSQL Arrays**: Simple string arrays (`tags[]`, `notes[]`) leverage PostgreSQL's native array support without over-engineering.
- **Keep JSONB**: Complex nested structures (`invoice_items`, `tags` objects) remain as JSONB for flexibility while maintaining PostgreSQL query capabilities.

**Tables Affected:**
- 9 junction tables created for many-to-many relationships
- 3+ fields kept as PostgreSQL arrays
- 4+ fields kept as JSONB

**Benefits:**
- Referential integrity with foreign key constraints
- Better query performance for joins
- Flexibility where needed (JSONB, arrays)
- Simpler schema than fully normalizing everything

**Trade-offs:**
- More tables than MongoDB (complexity vs. correctness trade-off favors correctness)
- Junction tables require additional migration logic

---

### 2. Primary Key Migration: ObjectId → UUID

**Decision:** Replace all MongoDB ObjectIds with PostgreSQL UUIDs.

**Rationale:**
- **Standard PostgreSQL Practice**: UUIDs are the standard for distributed primary keys in PostgreSQL.
- **Compatibility**: Works better with PostgreSQL ecosystem tools and ORMs.
- **Future-Proofing**: Supports potential multi-database or distributed architectures.
- **No Timestamp Dependency**: Unlike ObjectIds, UUIDs don't encode creation time (which we already track separately in `createdAt`).

**Implementation:**
- Generate new UUIDs for each record during migration
- Maintain mapping between old ObjectIds and new UUIDs
- Update all foreign key references using the mapping
- Preserve referential integrity throughout

**Benefits:**
- Clean PostgreSQL-native approach
- Better compatibility with PostgreSQL tooling
- Standard practice for Prisma + PostgreSQL

**Trade-offs:**
- Cannot directly preserve MongoDB ObjectIds (acceptable since UUIDs serve the same purpose)
- Migration script must maintain ObjectId → UUID mapping

---

### 3. Migration Script Architecture

**Decision:** Build a standalone TypeScript migration script with progress tracking, pause/resume, and error logging.

**Rationale:**
- **Reliability First**: Enterprise-grade migration requires robust error handling and recovery.
- **Long-Running Process**: Large datasets need pause/resume for operational flexibility.
- **Debugging**: Detailed error logging with specific record IDs enables fixing data issues.
- **Simplicity**: Fixed batch size and no dry-run mode keeps implementation focused.

**Core Features Included:**
1. Progress tracking with percentage completion
2. Checkpoint system for pause/resume
3. Detailed error logging with failed record IDs
4. Batch processing (fixed optimal batch size)
5. Transaction safety per batch

**Features Excluded:**
1. Dry-run mode (keep it simple, use staging environment for testing)
2. Configurable batch size (fixed optimal size determined through testing)
3. Parallel worker processes (sequential processing is sufficient and simpler)

**Benefits:**
- Can handle massive datasets (thousands of records)
- Operators can safely pause and resume during off-hours
- Failed records don't block entire migration
- Comprehensive audit trail for debugging

**Trade-offs:**
- More complex than a simple "dump and restore"
- Requires careful testing of checkpoint/resume logic

---

### 4. Data Validation Strategy

**Decision:** Comprehensive 4-layer validation: row counts, sample records, referential integrity, and data type conversions.

**Rationale:**
- **Zero Data Loss Requirement**: Success criteria demands no data loss or corruption.
- **Trust but Verify**: Migration script may succeed but produce subtle data issues.
- **Confidence for Production**: Validation report provides proof of successful migration.

**Validation Layers:**
1. **Row Counts**: Quick sanity check that all records migrated
2. **Sample Records**: Deep field-level comparison for random samples
3. **Referential Integrity**: Verify all foreign keys resolve correctly
4. **Data Type Conversions**: Confirm dates, arrays, JSONB, enums converted properly

**Benefits:**
- Catches migration bugs before they reach production
- Provides quantitative proof of success
- Identifies specific records with issues
- Builds confidence for production cutover

**Trade-offs:**
- Additional script to build and maintain
- Validation takes additional time after migration

---

### 5. Indexing Strategy

**Decision:** Three-tier indexing strategy: automatic foreign keys, common filters, and full-text search.

**Rationale:**
- **Performance Target**: < 100ms for simple queries (per success criteria)
- **Query Patterns**: CRM applications have predictable query patterns
- **Future-Proofing**: Enable fast queries as dataset grows

**Index Tiers:**

**Tier 1 - Foreign Keys (Automatic):**
- All foreign key columns get indexes automatically
- Enables fast joins and relationship queries

**Tier 2 - Filter Fields:**
- `status`, `type`, `createdAt`, `updatedAt`, `owner_id` columns
- These are the most common filter criteria in CRM applications

**Tier 3 - Full-Text Search:**
- GIN indexes on text columns for semantic search
- Company names, contact names, notes, opportunity descriptions
- Enables future AI/RAG features (Phase 2)

**Benefits:**
- Fast queries out of the box
- Supports common CRM query patterns
- Ready for future AI features
- Minimal over-indexing (each index has clear purpose)

**Trade-offs:**
- More indexes = slower writes (acceptable for read-heavy CRM)
- Storage overhead (minimal with modern PostgreSQL)

---

### 6. Environment Configuration

**Decision:** Single `DATABASE_URL` variable, simple cutover (no parallel running).

**Rationale:**
- **Simplicity Over Complexity**: No need for parallel MongoDB/PostgreSQL operation
- **Clean Cutover**: Migration happens during maintenance window
- **Standard Practice**: Matches how Prisma is typically used

**Approach:**
1. Run migration script (MongoDB → PostgreSQL)
2. Run validation script (verify success)
3. Update `DATABASE_URL` to PostgreSQL
4. Deploy application with new DATABASE_URL
5. MongoDB becomes backup/rollback option

**Features Excluded:**
- No `DATABASE_URL_POSTGRES` (no parallel writes)
- No environment flags for fallback/rollback
- No gradual traffic shifting

**Benefits:**
- Simple to understand and execute
- Clear cutover point
- Fewer moving parts = fewer failure modes
- Standard Prisma deployment pattern

**Trade-offs:**
- Requires maintenance window (acceptable for self-hosted CRM)
- No gradual rollout (but validation script provides confidence)

---

### 7. Prisma Configuration

**Decision:** Use Prisma Migrate for schema management, built-in connection pooling, and Prisma Studio for debugging.

**Rationale:**
- **Prisma Migrate**: Industry standard for type-safe schema migrations
- **Built-in Pooling**: Prisma's connection pooling sufficient for most deployments
- **Prisma Studio**: Excellent debugging tool for verifying data post-migration

**Features Enabled:**
1. Prisma Migrate for version-controlled schema changes
2. Prisma Studio for visual data inspection
3. Built-in connection pooling (no PgBouncer needed)

**Features Excluded:**
1. Query logging (no performance monitoring yet)
2. Preview features (keep it stable)
3. External connection pooler (PgBouncer unnecessary)

**Benefits:**
- Type-safe migrations
- Visual debugging with Prisma Studio
- Simpler infrastructure (no external pooler)
- Aligns with Next.js + Prisma best practices

**Trade-offs:**
- Limited to Prisma's connection pooling capabilities (sufficient for Phase 1)

---

## Migration Approach

### High-Level Migration Phases

**Phase 1: Schema Design**
- Design PostgreSQL schema in Prisma
- Define junction tables for many-to-many relationships
- Specify indexes and constraints
- Review and validate schema design

**Phase 2: Migration Script Development**
- Build TypeScript migration script
- Implement ObjectId → UUID mapping
- Add progress tracking and checkpointing
- Implement error logging
- Test with sample datasets

**Phase 3: Validation Script Development**
- Build validation script with 4-layer validation
- Test against sample migrations
- Ensure validation catches common issues

**Phase 4: Testing**
- Test migration with production-sized datasets
- Verify pause/resume functionality
- Validate error handling with intentionally bad data
- Performance test PostgreSQL queries

**Phase 5: Production Migration**
- Schedule maintenance window
- Backup MongoDB (rollback option)
- Run migration script
- Run validation script
- Update DATABASE_URL
- Deploy application
- Verify application functionality
- Monitor performance

---

## Technical Constraints

### Current State Constraints

1. **MongoDB Schema**: Cannot change MongoDB schema (would break current deployments)
2. **Prisma ORM**: Must continue using Prisma (application-wide dependency)
3. **Zero Downtime**: Not required (self-hosted allows maintenance windows)
4. **TypeScript Strict**: All migration code must use strict TypeScript (Phase 1 goal)

### PostgreSQL Requirements

1. **Version**: PostgreSQL 16 (latest stable with pgvector support for Phase 2)
2. **Extensions Needed**: pgvector (for future AI features)
3. **Performance Target**: < 100ms for simple queries (per success criteria)

### Deployment Constraints

1. **Self-Hosted**: Users deploy on their own infrastructure
2. **Docker Support**: Must work in containerized environments
3. **Simple Configuration**: Minimal environment variables (just DATABASE_URL)

---

## Success Criteria

### Technical Success

- ✅ All 26 models migrated with correct schema
- ✅ Zero data loss (verified by validation script)
- ✅ All relationships preserved (foreign keys intact)
- ✅ Performance target met (< 100ms simple queries)
- ✅ Comprehensive testing (migration + validation scripts)

### Operational Success

- ✅ Migration script handles large datasets (tested with production-sized data)
- ✅ Pause/resume works reliably
- ✅ Error logging enables debugging
- ✅ Validation provides confidence for production cutover

### Product Success

- ✅ Enables Phase 2 AI/RAG features (pgvector foundation)
- ✅ Improves query performance (relational model + indexes)
- ✅ Enterprise-grade quality (proper testing, validation)
- ✅ Self-hosting friendly (simple configuration)

---

## Risks & Mitigations

### Risk 1: Data Loss During Migration

**Mitigation:**
- Comprehensive validation script (4 layers)
- Transaction safety in migration script
- MongoDB backup as rollback option
- Test with production-sized datasets in staging

### Risk 2: Long Migration Time for Large Datasets

**Mitigation:**
- Batch processing for efficiency
- Pause/resume capability
- Progress tracking to set expectations
- Test with production-sized data to estimate duration

### Risk 3: Application Bugs Post-Migration

**Mitigation:**
- Prisma abstracts database differences (minimal app changes expected)
- Comprehensive testing in staging environment
- Validation script verifies data correctness
- Gradual rollout possible (staging → production)

### Risk 4: Performance Degradation

**Mitigation:**
- Strategic indexing (3-tier strategy)
- Performance target defined (< 100ms)
- Can add more indexes post-migration based on actual usage
- PostgreSQL query optimization tools (EXPLAIN, pg_stat_statements)

---

## Future Considerations

### Phase 2 Enablement: AI/RAG Features

This migration enables Phase 2 AI/RAG architecture:
- pgvector extension for vector similarity search
- JSONB for flexible AI-generated metadata
- Full-text search indexes for semantic retrieval
- Performance foundation for embedding pipelines

### Potential Enhancements

1. **Advanced Indexing**: Partial indexes for common query patterns
2. **Query Optimization**: Fine-tune based on actual usage patterns
3. **Connection Pooling**: Add PgBouncer if Prisma pooling insufficient
4. **Partitioning**: Table partitioning for massive datasets (future)
5. **Replication**: Read replicas for high-traffic deployments (future)

---

## Conclusion

These architectural decisions balance several competing concerns:
- **Simplicity vs. Robustness**: Simple where possible (single DATABASE_URL), robust where necessary (4-layer validation)
- **Relational Purity vs. Flexibility**: Normalize relationships, but keep JSONB and arrays where appropriate
- **Performance vs. Complexity**: Strategic indexing without over-engineering
- **Migration Safety vs. Speed**: Prioritize correctness over speed (pause/resume, comprehensive validation)

The result is a migration strategy that:
- Meets all success criteria
- Enables Phase 2 AI features
- Maintains enterprise-grade quality
- Remains simple enough for self-hosted deployments
- Provides operational confidence through comprehensive validation

This migration is the foundation for NextCRM's evolution into the best Next.js open-source self-hosted CRM alternative.
