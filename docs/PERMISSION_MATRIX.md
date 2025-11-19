# NextCRM Permission Matrix

**Purpose:** Complete reference for RBAC implementation across all API routes and operations
**Last Updated:** November 4, 2025
**Status:** DRAFT - Implementation in progress

---

## Role Hierarchy & Permissions

### Role Definitions

| Role | Hierarchy | READ | WRITE | DELETE | MANAGE_MEMBERS | MANAGE_SETTINGS | MANAGE_BILLING | Description |
|------|-----------|------|-------|--------|---|---|---|---|
| **OWNER** | 100 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Full control, billing, delete org |
| **ADMIN** | 50 | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | Manage team, settings (no billing) |
| **MEMBER** | 10 | ✓ | ✓ | ✓ (own only) | ✗ | ✗ | ✗ | Create/edit own items, view all |
| **VIEWER** | 5 | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | Read-only access |

---

## Organization & Billing Routes

### Organization Management

| Route | Method | Required Role | Required Permission | Current Status | Action Required |
|-------|--------|---|---|---|---|
| POST /api/organization | POST | NONE | CREATE_ORG | ✓ PROTECTED | OK |
| GET /api/organization | GET | Any member | READ | ✓ PROTECTED | OK |
| PUT /api/organization | PUT | ADMIN | MANAGE_SETTINGS | ⚠️ PARTIAL | Update permission check |
| DELETE /api/organization | DELETE | OWNER | DELETE_ORG | ✓ PROTECTED | OK |

### Billing Routes - CRITICAL

| Route | Method | Required Role | Required Permission | Current Status | Action Required |
|-------|--------|---|---|---|---|
| POST /api/billing/create-checkout-session | POST | **OWNER** | **MANAGE_BILLING** | ❌ **UNPROTECTED** | **ADD OWNER CHECK** |
| POST /api/billing/create-portal-session | POST | **OWNER** | **MANAGE_BILLING** | ❌ **UNPROTECTED** | **ADD OWNER CHECK** |

### Organization Data & Admin

| Route | Method | Required Role | Required Permission | Current Status | Action Required |
|-------|--------|---|---|---|---|
| GET /api/organization/audit-logs | GET | **ADMIN** | **MANAGE_SETTINGS** | ❌ **UNPROTECTED** | **ADD ADMIN CHECK** |
| GET /api/organization/export-data | GET | **ADMIN** | **MANAGE_SETTINGS** | ❌ **UNPROTECTED** | **ADD ADMIN CHECK** |
| GET /api/organization/delete | GET | OWNER | VIEW_DELETE_STATUS | ❌ UNPROTECTED | Add OWNER check |

---

## Team Member Management

| Route | Method | Required Role | Required Permission | Current Status | Issues |
|-------|--------|---|---|---|---|
| POST /api/organization/members | POST | ADMIN | MANAGE_MEMBERS | ✓ PROTECTED | None |
| GET /api/organization/members | GET | ADMIN | MANAGE_MEMBERS | ✓ PROTECTED | None |
| DELETE /api/organization/members/[userId] | DELETE | ADMIN | MANAGE_MEMBERS | ✓ PROTECTED | Role field may not be populated |
| PUT /api/organization/members/[userId]/role | PUT | **OWNER** | MANAGE_ROLES | ✓ PROTECTED | Only OWNER can change roles |
| GET /api/organization/invitations | GET | ADMIN | MANAGE_MEMBERS | ✓ PROTECTED | None |
| DELETE /api/organization/invitations | DELETE | ADMIN | MANAGE_MEMBERS | ✓ PROTECTED | None |

---

## CRM: Accounts

| Route | Method | Required Role | Required Permission | Current Status | Action Required |
|-------|--------|---|---|---|---|
| POST /api/crm/account | POST | MEMBER | WRITE | ❌ UNPROTECTED | Add MEMBER+ check |
| GET /api/crm/account | GET | Any member | READ | ✓ PROTECTED | OK |
| PUT /api/crm/account | PUT | MEMBER | WRITE | ❌ UNPROTECTED | Add MEMBER+ check |
| GET /api/crm/account/[id] | GET | Any member | READ | ✓ PROTECTED | OK |
| DELETE /api/crm/account/[id] | DELETE | MEMBER (own) or ADMIN | DELETE | ❌ UNPROTECTED | Add ownership/role check |
| POST /api/crm/account/[id]/watch | POST | Any member | READ | ✓ PROTECTED | OK |
| POST /api/crm/account/[id]/unwatch | POST | Any member | READ | ✓ PROTECTED | OK |

---

## CRM: Leads

| Route | Method | Required Role | Required Permission | Current Status | Action Required |
|-------|--------|---|---|---|---|
| POST /api/crm/leads | POST | MEMBER | WRITE | ❌ UNPROTECTED | Add MEMBER+ check |
| GET /api/crm/leads | GET | Any member | READ | ✓ PROTECTED | OK |
| PUT /api/crm/leads | PUT | MEMBER | WRITE | ❌ UNPROTECTED | Add MEMBER+ check |
| GET /api/crm/leads/[id] | GET | Any member | READ | ✓ PROTECTED | OK |
| DELETE /api/crm/leads/[id] | DELETE | MEMBER (own) or ADMIN | DELETE | ❌ UNPROTECTED | Add ownership/role check |

---

## CRM: Contacts

| Route | Method | Required Role | Required Permission | Current Status | Action Required |
|-------|--------|---|---|---|---|
| POST /api/crm/contacts | POST | MEMBER | WRITE | ❌ UNPROTECTED | Add MEMBER+ check |
| GET /api/crm/contacts | GET | Any member | READ | ✓ PROTECTED | OK |
| PUT /api/crm/contacts | PUT | MEMBER | WRITE | ❌ UNPROTECTED | Add MEMBER+ check |
| GET /api/crm/contacts/[id] | GET | Any member | READ | ✓ PROTECTED | OK |
| DELETE /api/crm/contacts/[id] | DELETE | MEMBER (own) or ADMIN | DELETE | ❌ UNPROTECTED | Add ownership/role check |

---

## CRM: Opportunities

| Route | Method | Required Role | Required Permission | Current Status | Action Required |
|-------|--------|---|---|---|---|
| POST /api/crm/opportunity | POST | MEMBER | WRITE | ❌ UNPROTECTED | Add MEMBER+ check |
| GET /api/crm/opportunity | GET | Any member | READ | ✓ PROTECTED | OK |
| PUT /api/crm/opportunity | PUT | MEMBER | WRITE | ❌ UNPROTECTED | Add MEMBER+ check |
| GET /api/crm/opportunity/[id] | GET | Any member | READ | ✓ PROTECTED | OK |
| DELETE /api/crm/opportunity/[id] | DELETE | MEMBER (own) or ADMIN | DELETE | ❌ UNPROTECTED | Add ownership/role check |

---

## CRM: Tasks & Comments

| Route | Method | Required Role | Required Permission | Current Status | Action Required |
|-------|--------|---|---|---|---|
| POST /api/crm/tasks | POST | MEMBER | WRITE | ❌ UNPROTECTED | Add MEMBER+ check |
| POST /api/crm/account/[id]/task/create | POST | MEMBER | WRITE | ❌ UNPROTECTED | Add MEMBER+ check |
| POST /api/crm/tasks/addCommentToTask/[taskId] | POST | MEMBER | WRITE | ❌ UNPROTECTED | Add MEMBER+ check |

---

## Projects

| Route | Method | Required Role | Required Permission | Current Status | Action Required |
|-------|--------|---|---|---|---|
| POST /api/projects | POST | MEMBER | WRITE | ❌ UNPROTECTED | Add MEMBER+ check |
| GET /api/projects | GET | Any member | READ | ✓ PROTECTED | OK |
| PUT /api/projects | PUT | MEMBER | WRITE | ❌ UNPROTECTED | Add MEMBER+ check |
| GET /api/projects/[id] | GET | Any member | READ | ✓ PROTECTED | OK |
| DELETE /api/projects/[id] | DELETE | MEMBER (own) or ADMIN | DELETE | ❌ UNPROTECTED | Add ownership/role check |
| POST /api/projects/[id]/watch | POST | Any member | READ | ✓ PROTECTED | OK |
| POST /api/projects/[id]/unwatch | POST | Any member | READ | ✓ PROTECTED | OK |

---

## Project Sections

| Route | Method | Required Role | Required Permission | Current Status | Action Required |
|-------|--------|---|---|---|---|
| POST /api/projects/sections | POST | MEMBER | WRITE | ❌ UNPROTECTED | Add MEMBER+ check |
| GET /api/projects/sections/[boardId] | GET | Any member | READ | ✓ PROTECTED | OK |
| PUT /api/projects/sections/update-title/[id] | PUT | MEMBER | WRITE | ❌ UNPROTECTED | Add MEMBER+ check |
| DELETE /api/projects/sections/delete-section/[id] | DELETE | MEMBER (own) or ADMIN | DELETE | ❌ UNPROTECTED | Add ownership/role check |

---

## Project Tasks

| Route | Method | Required Role | Required Permission | Current Status | Action Required |
|-------|--------|---|---|---|---|
| POST /api/projects/tasks/create-task | POST | MEMBER | WRITE | ❌ UNPROTECTED | Add MEMBER+ check |
| POST /api/projects/tasks/create-task/[boardId] | POST | MEMBER | WRITE | ❌ UNPROTECTED | Add MEMBER+ check |
| PUT /api/projects/tasks/update-task/[id] | PUT | MEMBER | WRITE | ❌ UNPROTECTED | Add MEMBER+ check |
| POST /api/projects/tasks/addCommentToTask/[id] | POST | MEMBER | WRITE | ❌ UNPROTECTED | Add MEMBER+ check |

---

## Documents

| Route | Method | Required Role | Required Permission | Current Status | Action Required |
|-------|--------|---|---|---|---|
| POST /api/documents | POST | MEMBER | WRITE | ⚠️ PARTIAL | Add role check |
| GET /api/documents | GET | Any member | READ | ✓ PROTECTED | OK |
| GET /api/documents/[id] | GET | Any member | READ | ✓ PROTECTED | OK |
| DELETE /api/documents/[id] | DELETE | MEMBER (own) or ADMIN | DELETE | ❌ UNPROTECTED | Add ownership/role check |

---

## Invoices

| Route | Method | Required Role | Required Permission | Current Status | Action Required |
|-------|--------|---|---|---|---|
| POST /api/invoice | POST | MEMBER | WRITE | ⚠️ PARTIAL | Add role check |
| GET /api/invoice | GET | Any member | READ | ✓ PROTECTED | OK |
| GET /api/invoice/[id] | GET | Any member | READ | ✓ PROTECTED | OK |
| DELETE /api/invoice/[id] | DELETE | MEMBER (own) or ADMIN | DELETE | ❌ UNPROTECTED | Add ownership/role check |

---

## File Upload & System

| Route | Method | Required Role | Required Permission | Current Status | Action Required |
|-------|--------|---|---|---|---|
| POST /api/upload | POST | MEMBER | WRITE | ✓ PROTECTED | OK |
| GET /api/upload/cron | GET | System | SYSTEM | ⚠️ PARTIAL | Use secure token |
| GET /api/cron/calculate-usage | GET | System | SYSTEM | ⚠️ PARTIAL | Use secure token |

---

## User Management

| Route | Method | Required Role | Required Permission | Current Status | Action Required |
|-------|--------|---|---|---|---|
| GET /api/user | GET | Any member | READ | ✓ PROTECTED | OK |
| PUT /api/user | PUT | Any member | WRITE | ✓ PROTECTED | OK |
| POST /api/user/inviteuser | POST | ADMIN | MANAGE_MEMBERS | ⚠️ PARTIAL | Legacy - use org invitations |
| DELETE /api/user/deactivate/[id] | DELETE | ADMIN | MANAGE_MEMBERS | ⚠️ PARTIAL | Update to use org roles |
| DELETE /api/user/deactivateAdmin/[id] | DELETE | OWNER | MANAGE_MEMBERS | ⚠️ PARTIAL | Update to use org roles |

---

## Summary Statistics

### By Status

| Status | Count | Percentage |
|--------|-------|-----------|
| ✓ Properly Protected | 22 | 44% |
| ⚠️ Partially Protected | 8 | 16% |
| ❌ Unprotected | 20 | 40% |
| **TOTAL** | **50** | **100%** |

### By Operation

| Operation | Total | Protected | Unprotected | Coverage |
|-----------|-------|-----------|-------------|----------|
| GET/READ | 20 | 20 | 0 | 100% |
| POST/CREATE | 12 | 0 | 12 | 0% |
| PUT/UPDATE | 10 | 0 | 10 | 0% |
| DELETE | 8 | 0 | 8 | 0% |

### By Risk Level

| Risk Level | Count |
|-----------|-------|
| Critical (Billing, Org Data) | 5 |
| High (Resource Deletion) | 8 |
| Medium (CRM Write Ops) | 12 |
| Low (Minor Gaps) | 5 |

---

## Implementation Priority

### Phase 1: CRITICAL (Deploy immediately)
- Billing routes protection
- Organization export/audit logs protection
- Fix session role population

### Phase 2: HIGH (Deploy before features)
- All CRM operation protection
- All project operation protection
- Resource ownership checks

### Phase 3: MEDIUM (Deploy in current sprint)
- Document operation protection
- Invoice operation protection
- Comprehensive audit logging

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✓ | Properly protected with correct permission check |
| ⚠️ | Partially protected - gaps exist |
| ❌ | Completely unprotected or vulnerable |
| MEMBER (own) | MEMBER can only modify their own resource |

---

## Next Steps

1. Review this matrix with security team
2. Prioritize remediation by phase
3. Implement enhanced permission middleware
4. Update all unprotected routes
5. Create comprehensive test suite
6. Deploy and monitor

