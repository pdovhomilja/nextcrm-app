# Bulk Actions for Contacts - Design Spec

**Date:** 2026-03-23  
**Author:** Chopper (via Superpowers Brainstorming Skill)  
**Status:** Draft - Ready for Review

---

## Overview

Enable users to select multiple contacts and perform batch operations, reducing repetitive single-item actions.

## Primary Use Case

**All of the above** — flexible system supporting:
- Sales pipeline management (bulk stage updates)
- Data cleanup (bulk delete, merge candidates)
- Campaign management (bulk assign to projects/employees)

## Architecture

### Frontend Components

1. **ContactTableWithSelection**
   - Checkbox column (first column)
   - Select all / Deselect all toggle
   - Selected count badge
   - Bulk action toolbar (appears when items selected)

2. **BulkActionToolbar**
   - Position: Sticky top of table when selection > 0
   - Actions: Add to Project, Assign to Employee, Export, Delete
   - Cancel/Close button to clear selection

3. **BulkActionModal**
   - Reusable modal for action-specific inputs
   - Example: "Add to Project" shows project dropdown
   - Confirmation step before execution

### Backend API

**New Endpoint:** `POST /api/crm/contacts/bulk-action`

```typescript
interface BulkActionRequest {
  action: 'add-to-project' | 'assign-to-employee' | 'export' | 'delete';
  contactIds: string[];
  payload?: {
    projectId?: string;
    employeeId?: string;
  };
}

interface BulkActionResponse {
  success: number;
  failed: number;
  errors?: Array<{ contactId: string; reason: string }>;
}
```

### Data Flow

1. User selects contacts via checkboxes
2. Bulk action toolbar appears with available actions
3. User clicks action → modal opens (if inputs needed)
4. User confirms → POST to `/api/crm/contacts/bulk-action`
5. Server processes batch, returns success/failure counts
6. UI shows toast notification, refreshes table

## Error Handling

- **Partial failures:** Some contacts may fail (e.g., already in project, permission denied)
- **Strategy:** Process all, report failures individually
- **UI:** Show summary toast + "View Details" link for failures

## Testing Strategy

- Unit: Checkbox selection state, toolbar visibility
- Integration: Bulk action API with various payloads
- E2E: Select 5 contacts → bulk add to project → verify all updated

## Out of Scope (YAGNI)

- Bulk edit of individual contact fields (too complex for v1)
- Undo bulk actions (can be added later if needed)
- Scheduled/recurring bulk actions

---

## Implementation Checklist

- [ ] Add `selectedContactIds` state to contacts page
- [ ] Create BulkActionToolbar component
- [ ] Create BulkActionModal component  
- [ ] Implement POST /api/crm/contacts/bulk-action
- [ ] Add Prisma queries for batch operations
- [ ] Toast notifications for results
- [ ] E2E tests for each action type

---

*Spec generated via Superpowers Brainstorming Skill test*
