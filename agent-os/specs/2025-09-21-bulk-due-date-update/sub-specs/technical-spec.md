# Technical Specification

This is the technical specification for the spec detailed in @.agent-os/specs/2025-09-21-bulk-due-date-update/spec.md

> Created: 2025-09-21
> Version: 1.0.0

## Technical Requirements

- **UI Component**: Add "Update due date for active tasks" button to board header component (likely in `/app/(app)/[cid]/tasks/[boardId]/_components/`)
- **Dialog Component**: Implement modal dialog using shadcn/ui Dialog component with task selector dropdown and react-day-picker for relative date adjustment
- **Confirmation Dialog**: Secondary dialog showing active task count and confirmation before applying changes
- **Server Action**: Create `updateActiveTasksDueDate(boardId: string, newDueDate: Date)` in `/actions/tasks/` directory
- **Database Query**: Individual task updates using Prisma transactions to calculate and apply relative date adjustments while excluding COMPLETED/CANCELLED status
- **Task History**: Create individual TaskHistory entries for each updated task using existing audit trail pattern
- **Permission Check**: Validate user has board access using existing board access control system (user ID in board.access array)
- **Error Handling**: Handle database failures, invalid dates, and unauthorized access with appropriate user feedback
- **UI State Management**: Loading states during batch operation, success feedback, and error display
- **Form Validation**: Ensure selected reference task and new date are valid using Zod schema validation
- **Relative Date Calculation**: Calculate date differences from reference task to maintain proportional gaps between all active tasks
- **Responsive Design**: Dialog components work on mobile and desktop using existing Tailwind responsive patterns

## Approach

### Implementation Strategy

1. **Server Action Development**
   - Create new server action in `/actions/tasks/update-active-tasks-due-date.ts`
   - Use existing authentication patterns from other task actions
   - Implement relative date calculation logic and individual task updates within transaction for data consistency, filtering out COMPLETED/CANCELLED tasks
   - Generate TaskHistory entries for audit trail

2. **UI Component Integration**
   - Add bulk update button to existing board header component
   - Leverage existing shadcn/ui Dialog and Button components
   - Use react-day-picker for consistent date selection UX
   - Follow existing error handling patterns with toast notifications

3. **Database Operations**
   - Calculate relative date differences for each active task from selected reference task
   - Use individual Prisma `update()` operations within a transaction for precise date adjustments
   - Implement proper transaction handling for atomicity
   - Maintain existing TaskHistory audit trail pattern
   - Ensure proper indexing for performance on large boards

### Component Architecture

```
BoardHeader (existing)
├── BulkUpdateDueDateButton (new)
    ├── BulkUpdateDueDateDialog (new)
    │   ├── ReferenceTaskSelector (new)
    │   ├── DatePicker (react-day-picker)
    │   └── ConfirmationDialog (new)
    └── updateActiveTasksDueDate (server action)
```

## External Dependencies

- **react-day-picker**: Already installed for date selection UI
- **shadcn/ui Dialog**: Already available for modal components
- **Prisma ORM**: Existing database layer for batch operations
- **Zod**: Already used for form validation throughout the app
- **Sonner**: Already used for toast notifications

No new external dependencies required - leveraging existing tech stack.