# Spec Requirements: Multi-Select Bulk Due Date Update for Tasks-List Table

## Initial Description

Add multi-select bulk due date update capability to the tasks-list table located at `app/(app)/[cid]/tasks-list/page.tsx`.

The tasks-list page currently displays tasks in a table using `TaskDataTableServer` component with filtering capabilities (status, priority, due date including "overdue" filter). Users need the ability to select multiple tasks via checkboxes and update their due dates in bulk.

This feature is distinct from the existing board-level bulk updates as it uses direct date selection rather than relative date calculations.

**User's Example Route:**
`http://localhost:3000/cme09dlwx0001k982v2bfjptt/tasks-list?dueDate=overdue`

## Requirements Discussion

### First Round Questions

**Q1:** For the selection mechanism, should we use checkboxes in each table row with a "select all" checkbox in the header (following the existing data-table.tsx pattern)?

**Answer:** Yes - use checkbox pattern with "select all" in header and individual checkboxes per row (follow existing data-table.tsx pattern)

**Q2:** Where should the bulk action toolbar appear? Should it be:
- A floating toolbar at the bottom of the table
- A toolbar that appears above the table when items are selected
- A button in the existing table header

**Answer:** Floating toolbar at the bottom of the table

**Q3:** For the date picker in the bulk action toolbar, should we:
- Option A: Single date picker where all selected tasks get the same exact due date (no relative adjustments)
- Option B: Include both absolute date and relative date options (e.g., "+7 days from today")

**Answer:** Option A - Single date picker where all selected tasks get the same exact due date (no relative adjustments)

**Q4:** Should there be any permission checks beyond the existing access controls? For example:
- Only allow bulk updates for tasks the user created
- Only allow bulk updates for tasks assigned to the user
- Use existing board/task permissions

**Answer:** No additional permission checks - use existing permission patterns

**Q5:** For user feedback, should we:
- Show a confirmation dialog before applying the bulk update
- Use toast notifications to show success/error messages
- Both confirmation dialog and toast notifications

**Answer:** Yes - use toast notifications (Sonner) for feedback showing success/error messages

**Q6:** After a bulk update is applied, should the table:
- Automatically refresh to show updated due dates
- Show a "refresh" button for the user to manually refresh
- Clear the task selection automatically

**Answer:** Yes - automatically refresh the table after update is complete and clear task selection

**Q7:** Should the bulk update respect the current table filters? For example, if the user has filtered to "overdue" tasks, should only the selected tasks within that filtered view be updated?

**Answer:** Yes - respect current table filters (status, priority, due date, search) when updating tasks

**Q8:** Should the bulk update action create task history entries that distinguish "bulk update" from individual updates, or should it just log that the task was updated?

**Answer:** Keep it simple - just log that the task was updated, no need to distinguish "bulk update" vs individual updates

### Existing Code to Reference

No similar existing features identified for reference.

### Follow-up Questions

No follow-up questions were needed.

## Visual Assets

### Files Provided:
No visual files found in the visuals folder.

### Visual Insights:
No visual assets provided.

## Requirements Summary

### Functional Requirements

**Core Functionality:**
- Add checkbox selection mechanism to tasks-list table
- Implement "select all" checkbox in table header
- Individual selection checkboxes for each task row
- Follow existing data-table.tsx component patterns
- Display floating toolbar at bottom of table when tasks are selected
- Single date picker in toolbar for bulk due date updates
- All selected tasks receive the same exact due date (no relative calculations)
- Toast notifications (Sonner) for success/error feedback
- Automatic table refresh after successful bulk update
- Automatic selection clearing after update completion

**User Actions Enabled:**
- Select/deselect individual tasks via row checkboxes
- Select/deselect all visible tasks via header checkbox
- Choose new due date from date picker
- Apply due date update to all selected tasks
- View immediate feedback via toast notifications
- Continue working with refreshed table data

**Data to be Managed:**
- Task selection state (selected task IDs)
- Bulk due date value
- Task history entries for updated tasks
- Table display state and filters

### Reusability Opportunities

**Components that might exist already:**
- Existing `data-table.tsx` component patterns for checkbox implementation
- `TaskDataTableServer` component as base for enhancement
- Existing date picker components from shadcn/ui
- Sonner toast notification system already in use
- Existing table filter mechanisms

**Backend patterns to investigate:**
- Current task update server actions in `actions/tasks/` folder
- Task history logging patterns from `edit-task.ts`
- Permission checking patterns from existing task actions
- Database query patterns with Prisma client

**Similar features to model after:**
- Existing table filtering system (status, priority, due date)
- Current individual task editing functionality
- Existing toast notification implementations throughout the app

### Scope Boundaries

**In Scope:**
- Checkbox selection UI for tasks-list table
- "Select all" functionality respecting current filters
- Floating bulk action toolbar at bottom of table
- Single date picker for bulk due date updates
- Server action for bulk task updates
- Task history logging for updated tasks
- Toast notifications for success/error feedback
- Automatic table refresh after updates
- Automatic selection clearing
- Respect for current table filters during updates
- Use of existing permission patterns

**Out of Scope:**
- Relative date calculations (e.g., "+7 days from today")
- Confirmation dialogs before applying updates
- Additional permission checks beyond existing patterns
- Distinguishing "bulk update" from individual updates in history
- Bulk updates for other task properties (status, priority, assignments)
- Cross-page selection (selection limited to current visible page)
- Export or other bulk operations beyond due date updates

### Technical Considerations

**Integration Points:**
- `app/(app)/[cid]/tasks-list/page.tsx` - main page component
- `TaskDataTableServer` component - table display component
- `components/data-table.tsx` - existing data table patterns
- `actions/tasks/` folder - server actions for task operations
- `lib/generated/prisma/` - database client for updates
- Sonner toast system for notifications
- shadcn/ui date picker components
- Task history model for audit logging

**Existing System Constraints:**
- Must use Next.js 15 App Router patterns
- Server actions with "use server" directive
- Prisma ORM for database operations
- TypeScript for type safety
- Follow existing permission and access control patterns
- Maintain consistency with existing TaskHQ UI/UX patterns

**Technology Preferences:**
- React 19.1.0 with Server Components
- shadcn/ui components (New York style)
- Tailwind CSS v4 for styling
- Sonner for toast notifications
- React Hook Form with Zod validation (if forms needed)
- date-fns for date manipulation

**Similar Code Patterns to Follow:**
- Existing server actions in `actions/tasks/` (create, edit, delete patterns)
- Task history logging as seen in edit-task operations
- Error handling with success/error return objects
- Toast notification patterns used throughout the app
- Table filtering and state management patterns in tasks-list
- Checkbox selection patterns from existing data-table.tsx component
