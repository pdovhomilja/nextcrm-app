/**
 * Utility functions for bulk due date calculations with relative preservation
 */

export interface TaskDateInfo {
  id: string;
  dueDate: Date;
}

export interface RelativeDateAdjustment {
  taskId: string;
  newDueDate: Date;
}

/**
 * Calculates new due dates for tasks while preserving relative time differences
 * @param tasks Array of tasks with their current due dates
 * @param referenceTaskId The ID of the task to use as reference
 * @param newReferenceDate The new due date for the reference task
 * @returns Array of tasks with their calculated new due dates
 */
export function calculateRelativeDateAdjustments(
  tasks: TaskDateInfo[],
  referenceTaskId: string,
  newReferenceDate: Date
): RelativeDateAdjustment[] {
  // Find the reference task
  const referenceTask = tasks.find(task => task.id === referenceTaskId);
  if (!referenceTask) {
    throw new Error(`Reference task with ID ${referenceTaskId} not found`);
  }

  // Calculate the time difference (shift amount) in milliseconds
  const timeDifference = newReferenceDate.getTime() - referenceTask.dueDate.getTime();

  // Apply the same time difference to all tasks
  return tasks.map(task => ({
    taskId: task.id,
    newDueDate: new Date(task.dueDate.getTime() + timeDifference),
  }));
}

/**
 * Validates that a date is reasonable for task scheduling
 * @param date The date to validate
 * @returns Object with validation result and error message if invalid
 */
export function validateTaskDate(date: Date): { isValid: boolean; error?: string } {
  if (!date || isNaN(date.getTime())) {
    return { isValid: false, error: "Invalid date provided" };
  }

  // Check if date is too far in the past (more than 1 year)
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  if (date < oneYearAgo) {
    return { isValid: false, error: "Due date cannot be more than 1 year in the past" };
  }

  // Check if date is too far in the future (more than 10 years)
  const tenYearsFromNow = new Date();
  tenYearsFromNow.setFullYear(tenYearsFromNow.getFullYear() + 10);

  if (date > tenYearsFromNow) {
    return { isValid: false, error: "Due date cannot be more than 10 years in the future" };
  }

  return { isValid: true };
}

/**
 * Formats a date difference for human-readable logging
 * @param oldDate Original date
 * @param newDate New date
 * @returns Human-readable description of the date change
 */
export function formatDateChange(oldDate: Date, newDate: Date): string {
  const diffMs = newDate.getTime() - oldDate.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return "due date unchanged";
  } else if (diffDays > 0) {
    return `due date moved forward by ${diffDays} day${diffDays !== 1 ? 's' : ''}`;
  } else {
    return `due date moved back by ${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''}`;
  }
}

/**
 * Creates a summary of bulk date changes for logging
 * @param changes Array of date adjustments
 * @param referenceDateChange Description of the reference date change
 * @returns Summary string for audit logs
 */
export function createBulkUpdateSummary(
  changes: RelativeDateAdjustment[],
  referenceDateChange: string
): string {
  const taskCount = changes.length;
  return `Bulk due date update applied to ${taskCount} task${taskCount !== 1 ? 's' : ''} - ${referenceDateChange}`;
}