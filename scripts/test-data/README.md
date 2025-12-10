# Test Data Generation for PostgreSQL Migration

## Overview

This directory contains scripts for generating test data for Phase 4 integration testing of the MongoDB to PostgreSQL migration.

## Test Datasets

### 1. Sample Dataset (100-1000 records per table)
**Purpose:** Basic migration testing, validation testing, pause/resume testing
**Script:** `generate-sample-data.ts`
**Size:** ~20,000 total records
**Duration:** ~5-10 minutes to migrate

### 2. Bad Data Dataset (intentional errors)
**Purpose:** Error handling testing
**Script:** `generate-bad-data.ts`
**Size:** ~1,000 records with various errors
**Error Types:**
- Invalid foreign keys
- Malformed dates
- Invalid enum values
- Oversized text fields
- Missing required fields

### 3. Large Dataset (10,000+ records per major table)
**Purpose:** Performance testing
**Script:** `generate-large-dataset.ts`
**Size:** ~100,000 total records
**Duration:** ~1-2 hours to migrate

## Usage

### Generate Sample Data
```bash
npm run generate:sample-data
```

### Generate Bad Data
```bash
npm run generate:bad-data
```

### Generate Large Dataset
```bash
npm run generate:large-dataset
```

## Test Environment Setup

### 1. MongoDB Test Database
```bash
# Using Docker
docker run -d --name mongodb-migration-test \
  -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=password \
  mongo:7

# Connection string
DATABASE_URL_MONGODB="mongodb://admin:password@localhost:27017/nextcrm_test?authSource=admin"
```

### 2. PostgreSQL Test Database
```bash
# Using Docker with pgvector
docker run -d --name postgres-migration-test \
  -p 5432:5432 \
  -e POSTGRES_USER=nextcrm \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=nextcrm_test \
  pgvector/pgvector:pg16

# Connection string
DATABASE_URL_POSTGRES="postgresql://nextcrm:password@localhost:5432/nextcrm_test"
```

### 3. Run Prisma Migrations
```bash
# Point to PostgreSQL test database
export DATABASE_URL="postgresql://nextcrm:password@localhost:5432/nextcrm_test"

# Run migrations
npx prisma migrate deploy
```

## Test Workflow

1. **Generate test data** in MongoDB test database
2. **Run migration script** to migrate data to PostgreSQL
3. **Run validation script** to verify data correctness
4. **Clean up** test databases
5. **Repeat** with different datasets

## Data Characteristics

### Sample Dataset Requirements
- All 26 entity models represented
- All 10 junction table relationships included
- Edge cases:
  - Null values in optional fields
  - Empty arrays
  - Special characters (Unicode, emojis, symbols)
  - Long text fields (descriptions, notes)
  - Boundary dates (very old, very new, current)
  - All enum values used
  - Foreign keys both null and populated

### Relationship Cardinalities
- **1:Many** - Account to Contacts (1:10)
- **1:Many** - Account to Opportunities (1:5)
- **Many:Many** - Documents to Accounts (M:N)
- **Many:Many** - Boards to Watchers (M:N)

### Data Patterns
- Realistic names (using Faker library)
- Valid email addresses
- Realistic dates (created_at in past, updated_at recent)
- Meaningful descriptions and notes
- Proper status distributions (70% active, 20% pending, 10% inactive)

## Scripts Included

1. `generate-sample-data.ts` - Main sample dataset generator
2. `generate-bad-data.ts` - Error scenario dataset
3. `generate-large-dataset.ts` - Performance testing dataset
4. `cleanup-test-data.ts` - Clean up test databases
5. `seed-helpers.ts` - Shared utilities for data generation

## Validation After Generation

Each generator script should output:
- Total records created per table
- Relationship statistics
- Data distribution summary
- Any warnings or errors

## Dependencies

```json
{
  "@faker-js/faker": "^8.0.0",
  "@prisma/client": "^5.22.0"
}
```

## Notes

- Test data is **not production data**
- Use deterministic seeds for reproducibility
- Include comments in generated data for traceability
- Monitor database size and performance during generation
