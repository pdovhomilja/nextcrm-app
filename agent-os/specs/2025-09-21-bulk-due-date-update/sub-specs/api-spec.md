# API Specification

This is the API specification for the spec detailed in @.agent-os/specs/2025-09-21-bulk-due-date-update/spec.md

> Created: 2025-09-21
> Version: 1.0.0

## Server Actions

### updateActiveTasksDueDate

**Purpose:** Update due date for active tasks (excluding COMPLETED and CANCELLED) within a specific board
**Location:** `/actions/tasks/update-active-tasks-due-date.ts`
**Type:** Next.js 15 Server Action with "use server" directive

**Parameters:**
- `boardId: string` - The ID of the board containing tasks to update
- `referenceTaskId: string` - The ID of the task to use as reference for relative date calculations
- `newDueDate: Date` - The new due date to apply to the reference task
- `userId?: string` - Optional user ID for authorization (can be derived from session)

**Response:**
```typescript
{
  success: boolean;
  message: string;
  updatedCount?: number;
  error?: string;
}
```

**Business Logic:**
1. Validate user session and board access permissions
2. Query active tasks (excluding COMPLETED and CANCELLED status) associated with board sections of the specified board
3. Calculate date difference between reference task's current due date and new due date
4. Apply proportional date adjustments to all active tasks maintaining relative time differences
5. Perform individual task updates using Prisma transaction for data consistency
6. Create individual TaskHistory entries for audit trail
7. Return success response with count of updated tasks

**Error Handling:**
- **Authentication Error**: User not logged in or session invalid
- **Authorization Error**: User doesn't have access to the specified board
- **Validation Error**: Invalid boardId, referenceTaskId, or newDueDate parameters
- **Database Error**: Failed to update tasks or create history entries
- **Not Found Error**: Board doesn't exist or has no active tasks

## Integration Points

**Board Access Control:** Utilizes existing board permission system checking if user ID exists in board.access array

**Task History System:** Creates entries following existing TaskHistory model pattern with action type for bulk due date updates

**Error Response Pattern:** Follows established server action error handling pattern used throughout the application