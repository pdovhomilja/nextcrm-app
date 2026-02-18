# MongoDB Native Driver Migration Update

## Summary

Updated the migration script to use MongoDB native driver (`mongodb` package) instead of Prisma for reading MongoDB data. This resolves the issue where the Prisma schema was configured for PostgreSQL only, but the migration script tried to use it for both databases.

## Changes Made

### 1. Main Migration Script (`scripts/migrate-mongo-to-postgres.ts`)
- **Changed**: Replaced `PrismaClient as PrismaClientMongo` with `MongoClient` from `mongodb` package
- **Added**: MongoDB connection URL validation
- **Updated**: Connection handling to use `mongoClient.connect()` and `mongoClient.close()`
- **Impact**: MongoDB connections now use native driver instead of Prisma

### 2. Migration Orchestrator (`scripts/migration/orchestrator.ts`)
- **Changed**: Constructor now accepts `MongoClient` instead of `PrismaClient`
- **Added**: `mongoDb: Db` private property for database access
- **Added**: `extractDbName()` method to extract database name from connection (defaults to 'nextcrm-demo')
- **Added**: `getMongoCollection()` method to access MongoDB collections
- **Updated**: `getMongoRecordCount()` to use native driver's `countDocuments()`
- **Updated**: `fetchMongoRecords()` to use native driver's `find().skip().limit().toArray()`
- **Updated**: Junction table population methods to use `getMongoCollection()` and `.find().toArray()`
- **Removed**: Old `getMongoModel()` method that used Prisma model mapping
- **Impact**: All MongoDB read operations now use native driver

### 3. UUID Mapper (`scripts/migration/uuid-mapper.ts`)
- **Added**: `toObjectIdString()` helper function to convert MongoDB ObjectId objects to strings
- **Updated**: All methods to accept `any` type and convert to string internally
- **Impact**: Handles both ObjectId objects and string representations seamlessly

### 4. Junction Populator (`scripts/migration/junction-populator.ts`)
- **Added**: `toObjectIdString()` helper function
- **Updated**: All ObjectId references to use `toObjectIdString()` conversion
- **Impact**: Properly handles ObjectId objects from native driver

### 5. Type Definitions (`scripts/migration/types.ts`)
- **Added**: Import of MongoDB types (`Document as MongoDocument`, `ObjectId`)
- **Added**: Re-export of MongoDB document types
- **Impact**: Better type support for MongoDB documents

## MongoDB Native Driver Usage Patterns

```typescript
// Connection
import { MongoClient } from 'mongodb';
const mongoClient = new MongoClient(mongoUrl);
await mongoClient.connect();
const db = mongoClient.db('database-name');

// Get collection
const collection = db.collection('CollectionName');

// Count documents
const count = await collection.countDocuments();

// Find with pagination
const cursor = collection.find({}).skip(offset).limit(batchSize);
const documents = await cursor.toArray();

// Close connection
await mongoClient.close();
```

## ObjectId Handling

The native driver returns ObjectId objects (not strings) for `_id` fields. All updated code properly converts ObjectId objects to strings using:

```typescript
function toObjectIdString(value: any): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value.toString) return value.toString();
  return String(value);
}
```

## Testing

After these changes, test the connection:

```bash
pnpm migrate:mongo-to-postgres
```

Expected output:
```
═══════════════════════════════════════════════════════════
   NextCRM MongoDB → PostgreSQL Migration
═══════════════════════════════════════════════════════════

🔌 Connecting to databases...
   ✅ MongoDB connected
   ✅ PostgreSQL connected

✅ Validating PostgreSQL database...
   PostgreSQL connection successful
```

## Environment Variables Required

- `DATABASE_URL_MONGO` or `DATABASE_URL` - MongoDB connection string
- `DATABASE_URL_POSTGRES` - PostgreSQL connection string (for writes)

## Benefits

1. **Cleaner separation**: MongoDB reads use native driver, PostgreSQL writes use Prisma
2. **No schema conflicts**: Prisma schema only needs PostgreSQL configuration
3. **Better performance**: Native driver is optimized for MongoDB operations
4. **Flexibility**: Can connect to any MongoDB database without Prisma schema changes

## Files Modified

1. `/scripts/migrate-mongo-to-postgres.ts`
2. `/scripts/migration/orchestrator.ts`
3. `/scripts/migration/uuid-mapper.ts`
4. `/scripts/migration/junction-populator.ts`
5. `/scripts/migration/types.ts`

## Notes

- All transformers remain unchanged (they already accepted `any` type)
- Checkpoint/resume functionality unchanged
- Error handling and progress tracking unchanged
- Batch processing logic unchanged
- Collection names match Prisma model names exactly (e.g., `Users`, `crm_Accounts`, etc.)
