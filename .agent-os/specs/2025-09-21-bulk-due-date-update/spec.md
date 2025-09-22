# Spec Requirements Document

> Spec: Bulk Due Date Update
> Created: 2025-09-21
> Status: Planning

## Overview

Implement bulk due date update functionality that allows users to update due dates for active tasks (excluding COMPLETED and CANCELLED tasks) within a specific board through a single action. This feature will streamline project timeline management and reduce manual overhead when project deadlines shift.

## User Stories

### Board Manager Updates Project Timeline

As a board manager, I want to update due dates for all tasks in a board at once, so that I can quickly adjust project timelines when deadlines change without manually editing each task.

When a project deadline shifts, the user navigates to the affected board, clicks the "Update due date for active tasks" button in the board header, selects a reference task and new due date from a calendar picker, confirms the change in a dialog showing the number of affected active tasks, and all active tasks receive proportionally adjusted due dates maintaining relative time differences with changes logged in task history.

### Team Member Responds to Timeline Changes

As a team member, I want to see updated due dates for all my tasks when project timelines change, so that I can adjust my work priorities accordingly.

When a board manager updates due dates for all tasks in a board, team members with access to that board will see the updated due dates immediately, receive task history entries showing the bulk change, and can adjust their work schedules based on the new timeline.

## Spec Scope

1. **Bulk Due Date Update Button** - Add prominent button in board header for updating active task due dates
2. **Calendar Dialog Interface** - Modal dialog with reference task selector and date picker for relative adjustments
3. **Confirmation Dialog** - Show affected active task count and require confirmation before applying changes
4. **Server Action Implementation** - Batch update active tasks preserving relative date differences between tasks
5. **Task History Logging** - Record bulk due date changes in individual task history entries

## Out of Scope

- Updating COMPLETED or CANCELLED tasks
- Selective task updates (only specific tasks within a board)
- Undo functionality for bulk changes
- Email notifications for due date changes
- Integration with calendar applications

## Expected Deliverable

1. Users can successfully update due dates for active tasks in a board through a single button click and calendar selection
2. Changes are immediately visible to all users with board access and properly logged in task history
3. The feature integrates seamlessly with existing board interface without disrupting current workflows

## Spec Documentation

- Tasks: @.agent-os/specs/2025-09-21-bulk-due-date-update/tasks.md
- Technical Specification: @.agent-os/specs/2025-09-21-bulk-due-date-update/sub-specs/technical-spec.md