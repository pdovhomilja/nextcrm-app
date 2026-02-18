# Raw Feature Idea: MongoDB to PostgreSQL Codebase Upgrade

## Feature Description

The MongoDB to PostgreSQL data migration is complete. Now the application codebase needs to be updated to work with the new PostgreSQL schema. This includes:

1. Updating all database queries from MongoDB syntax to PostgreSQL/Prisma syntax
2. Updating queries that used array fields to use the new junction tables
3. Updating ObjectId references to UUID types
4. Updating Prisma relation queries to use new relation names
5. Testing all CRUD operations work correctly
6. Fixing any TypeScript errors related to the schema changes

## Context

- PostgreSQL schema is already deployed and working
- Data has been migrated from MongoDB to PostgreSQL
- Migration included creating 10 junction tables for normalized many-to-many relationships
- All primary keys changed from ObjectId to UUID
- The Prisma schema is already updated for PostgreSQL

## Affected Areas

- `actions/crm/*.ts` - CRM operations (~10 files)
- `actions/documents/*.ts` - Document operations (~3 files)
- `actions/projects/*.ts` - Project/task operations (~5 files)
- `app/api/crm/*.ts` - CRM API routes (~8 files)
- `app/api/projects/*.ts` - Project API routes (~4 files)
- Other API routes and actions as needed

## Date Submitted

2025-11-05
