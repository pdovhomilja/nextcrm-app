# Raw Idea: Multi-Select Bulk Due Date Update for Tasks-List Table

## Feature Description

Add multi-select bulk due date update to tasks-list table

## Context

- The tasks-list page is located at `app/(app)/[cid]/tasks-list/page.tsx`
- It currently displays tasks in a table using `TaskDataTableServer` component
- Users can filter tasks by status, priority, and due date (including "overdue" filter)
- We need to add checkbox selection to allow users to select multiple tasks and update their due dates in bulk
- This is different from the existing bulk-due-date-update spec which was for board-level updates with relative date calculations

## User's Route Example

http://localhost:3000/cme09dlwx0001k982v2bfjptt/tasks-list?dueDate=overdue

## Initial Requirements (To Be Refined)

- Add checkbox selection to the tasks-list table
- Allow users to select multiple tasks
- Provide UI to update due dates for selected tasks in bulk
- Support for filtering (status, priority, due date including "overdue")
- Different from board-level bulk updates (direct date selection vs relative date calculations)
