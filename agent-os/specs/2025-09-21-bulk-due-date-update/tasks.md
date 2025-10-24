# Spec Tasks

These are the tasks to be completed for the spec detailed in @.agent-os/specs/2025-09-21-bulk-due-date-update/spec.md

> Created: 2025-09-21
> Status: Ready for Implementation

## Tasks

### 1. Server Action Development

1.1. Create test file for server action
- Create `/actions/tasks/__tests__/update-active-tasks-due-date.test.ts`
- Write unit tests for relative date calculation logic
- Write unit tests for COMPLETED/CANCELLED task exclusion
- Write unit tests for permission validation
- Write unit tests for transaction rollback scenarios

1.2. Implement server action function
- Create `/actions/tasks/update-active-tasks-due-date.ts`
- Implement `updateActiveTasksDueDate(boardId: string, referenceTaskId: string, newDueDate: Date)` function
- Add authentication and permission checks using existing patterns
- Implement board access validation (user ID in board.access array)

1.3. Implement relative date calculation logic
- Calculate date differences from reference task to all other active tasks
- Preserve proportional time gaps between tasks when updating due dates
- Handle edge cases for tasks with null due dates or past due dates
- Ensure calculation maintains chronological order of tasks

1.4. Implement database operations with transactions
- Query active tasks (exclude COMPLETED and CANCELLED status)
- Use Prisma transaction for atomicity of all task updates
- Implement individual task update operations within transaction
- Add proper error handling and rollback mechanisms

1.5. Implement task history logging
- Create TaskHistory entries for each updated task
- Use existing audit trail pattern for consistency
- Include bulk update context in history entries
- Ensure proper user attribution for history entries

1.6. Verify server action implementation
- Run tests to ensure all functionality works correctly
- Test with various board sizes and task configurations
- Verify transaction rollback on failures
- Validate task history entries are created correctly

### 2. UI Component Development - Reference Task Selector

2.1. Create test file for reference task selector
- Create component test for reference task dropdown functionality
- Test active task filtering and display
- Test selection state management
- Test empty state and loading states

2.2. Implement ReferenceTaskSelector component
- Create `/app/(app)/[cid]/tasks/[boardId]/_components/reference-task-selector.tsx`
- Use shadcn/ui Select component for dropdown interface
- Filter and display only active tasks from current board
- Implement proper TypeScript interfaces for task data

2.3. Add task selection state management
- Handle selected reference task state
- Validate task selection before proceeding
- Display task titles and due dates in dropdown options
- Implement proper loading and empty states

2.4. Verify reference task selector
- Test component renders correctly with mock data
- Test selection functionality and state updates
- Verify filtering shows only active tasks
- Test responsive behavior on mobile devices

### 3. UI Component Development - Date Picker Integration

3.1. Create test file for date picker component
- Test date selection functionality
- Test validation of future dates only
- Test date formatting and display
- Test integration with react-day-picker

3.2. Implement date picker component
- Integrate react-day-picker with existing UI patterns
- Use shadcn/ui Popover for date picker display
- Implement date validation (future dates only)
- Add proper accessibility attributes

3.3. Add form validation with Zod
- Create Zod schema for date and reference task validation
- Implement client-side validation before server action
- Add proper error messaging for validation failures
- Ensure date format consistency

3.4. Verify date picker functionality
- Test date selection and validation
- Test form submission with valid/invalid data
- Verify accessibility compliance
- Test responsive design on various screen sizes

### 4. UI Component Development - Main Dialog

4.1. Create test file for bulk update dialog
- Test dialog open/close functionality
- Test form submission and server action integration
- Test loading states during bulk update operation
- Test error handling and display

4.2. Implement BulkUpdateDueDateDialog component
- Create `/app/(app)/[cid]/tasks/[boardId]/_components/bulk-update-due-date-dialog.tsx`
- Use shadcn/ui Dialog component for modal interface
- Integrate ReferenceTaskSelector and date picker components
- Implement form submission handling

4.3. Add loading and error states
- Show loading spinner during bulk update operation
- Display error messages from server action failures
- Implement success feedback with toast notifications using Sonner
- Add proper form reset after successful submission

4.4. Implement confirmation dialog
- Create secondary dialog showing affected task count
- Display list of tasks that will be updated
- Require explicit confirmation before proceeding with bulk update
- Show estimated completion time for large board operations

4.5. Verify main dialog functionality
- Test complete user flow from button click to completion
- Test error scenarios and user feedback
- Verify dialog accessibility and keyboard navigation
- Test form validation and submission

### 5. UI Component Development - Board Header Integration

5.1. Create test file for bulk update button
- Test button visibility and accessibility
- Test permission-based button display
- Test click handler and dialog triggering
- Test button states and loading indicators

5.2. Implement BulkUpdateDueDateButton component
- Create button component with proper styling
- Add icon and descriptive text for user clarity
- Implement click handler to open bulk update dialog
- Use existing button patterns from shadcn/ui

5.3. Integrate button into board header
- Modify existing board header component
- Position button appropriately within header layout
- Ensure responsive design works on mobile devices
- Maintain existing header functionality and styling

5.4. Add permission checks for button visibility
- Show button only to users with board edit permissions
- Use existing permission patterns from codebase
- Hide button for read-only board access
- Implement proper TypeScript interfaces for permissions

5.5. Verify board header integration
- Test button display in various board states
- Test responsive layout on different screen sizes
- Verify permission-based visibility works correctly
- Test integration with existing board header functionality

### 6. End-to-End Integration Testing

6.1. Create integration test suite
- Create comprehensive test file for entire feature flow
- Test server action integration with UI components
- Test database operations and task history creation
- Test real-time updates for other board users

6.2. Test complete user workflow
- Test from button click through successful completion
- Verify due date calculations are applied correctly
- Ensure task history entries reflect bulk updates
- Test with various board sizes and task configurations

6.3. Test error scenarios and edge cases
- Test with insufficient permissions
- Test with invalid date selections
- Test with board containing no active tasks
- Test server failures and transaction rollbacks

6.4. Test performance with large datasets
- Test bulk update with boards containing 50+ tasks
- Monitor database performance during batch operations
- Verify UI responsiveness during large updates
- Test memory usage and potential leaks

6.5. Verify cross-browser compatibility
- Test functionality in Chrome, Firefox, Safari, and Edge
- Verify date picker behavior across browsers
- Test responsive design on various devices
- Ensure consistent user experience

### 7. Documentation and Cleanup

7.1. Update component documentation
- Add JSDoc comments to all new components
- Document TypeScript interfaces and props
- Create usage examples for complex components
- Update existing documentation as needed

7.2. Add error boundary handling
- Implement proper error boundaries for new components
- Test error recovery and user feedback
- Ensure graceful degradation on failures
- Add logging for debugging purposes

7.3. Performance optimization
- Implement React.memo for expensive components
- Optimize database queries for large boards
- Add proper loading states to prevent UI blocking
- Review and optimize bundle size impact

7.4. Final verification and testing
- Run complete test suite and ensure all tests pass
- Perform manual testing of complete feature
- Verify accessibility compliance with screen readers
- Test with real production-like data volumes

7.5. Prepare for deployment
- Review all code changes for security issues
- Ensure proper error handling and logging
- Verify database migration requirements (if any)
- Document any configuration changes needed