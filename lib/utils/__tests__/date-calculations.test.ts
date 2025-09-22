import { describe, test, expect } from "@jest/globals";
import {
  calculateRelativeDateAdjustments,
  validateTaskDate,
  formatDateChange,
  createBulkUpdateSummary,
  type TaskDateInfo,
} from "../date-calculations";

describe("Date Calculations Utilities", () => {
  describe("calculateRelativeDateAdjustments", () => {
    test("should calculate relative date adjustments correctly", () => {
      const tasks: TaskDateInfo[] = [
        { id: "task-1", dueDate: new Date("2025-01-15T10:00:00Z") },
        { id: "task-2", dueDate: new Date("2025-01-17T10:00:00Z") }, // +2 days
        { id: "task-3", dueDate: new Date("2025-01-20T10:00:00Z") }, // +5 days
      ];

      // Shift reference task by +3 days
      const newReferenceDate = new Date("2025-01-18T10:00:00Z");

      const adjustments = calculateRelativeDateAdjustments(
        tasks,
        "task-1",
        newReferenceDate
      );

      expect(adjustments).toHaveLength(3);

      // Reference task should have exact new date
      expect(adjustments[0].taskId).toBe("task-1");
      expect(adjustments[0].newDueDate.getTime()).toBe(newReferenceDate.getTime());

      // Task 2 should maintain +2 day difference
      expect(adjustments[1].taskId).toBe("task-2");
      expect(adjustments[1].newDueDate.getTime()).toBe(
        new Date("2025-01-20T10:00:00Z").getTime()
      );

      // Task 3 should maintain +5 day difference
      expect(adjustments[2].taskId).toBe("task-3");
      expect(adjustments[2].newDueDate.getTime()).toBe(
        new Date("2025-01-23T10:00:00Z").getTime()
      );
    });

    test("should handle backward date shifts", () => {
      const tasks: TaskDateInfo[] = [
        { id: "task-1", dueDate: new Date("2025-01-15T10:00:00Z") },
        { id: "task-2", dueDate: new Date("2025-01-17T10:00:00Z") },
      ];

      // Shift reference task backward by 2 days
      const newReferenceDate = new Date("2025-01-13T10:00:00Z");

      const adjustments = calculateRelativeDateAdjustments(
        tasks,
        "task-1",
        newReferenceDate
      );

      expect(adjustments[0].newDueDate.getTime()).toBe(newReferenceDate.getTime());
      expect(adjustments[1].newDueDate.getTime()).toBe(
        new Date("2025-01-15T10:00:00Z").getTime() // Still +2 days from reference
      );
    });

    test("should throw error for missing reference task", () => {
      const tasks: TaskDateInfo[] = [
        { id: "task-1", dueDate: new Date("2025-01-15T10:00:00Z") },
      ];

      expect(() => {
        calculateRelativeDateAdjustments(tasks, "nonexistent-task", new Date());
      }).toThrow("Reference task with ID nonexistent-task not found");
    });
  });

  describe("validateTaskDate", () => {
    test("should validate reasonable dates as valid", () => {
      const validDate = new Date("2025-06-15T10:00:00Z");
      const result = validateTaskDate(validDate);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    test("should reject invalid dates", () => {
      const invalidDate = new Date("invalid");
      const result = validateTaskDate(invalidDate);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Invalid date provided");
    });

    test("should reject dates too far in the past", () => {
      const tooOldDate = new Date("2020-01-01T10:00:00Z");
      const result = validateTaskDate(tooOldDate);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Due date cannot be more than 1 year in the past");
    });

    test("should reject dates too far in the future", () => {
      const tooFutureDate = new Date("2040-01-01T10:00:00Z");
      const result = validateTaskDate(tooFutureDate);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Due date cannot be more than 10 years in the future");
    });
  });

  describe("formatDateChange", () => {
    test("should format forward date changes", () => {
      const oldDate = new Date("2025-01-15T10:00:00Z");
      const newDate = new Date("2025-01-18T10:00:00Z"); // +3 days

      const result = formatDateChange(oldDate, newDate);
      expect(result).toBe("due date moved forward by 3 days");
    });

    test("should format backward date changes", () => {
      const oldDate = new Date("2025-01-15T10:00:00Z");
      const newDate = new Date("2025-01-13T10:00:00Z"); // -2 days

      const result = formatDateChange(oldDate, newDate);
      expect(result).toBe("due date moved back by 2 days");
    });

    test("should handle single day changes", () => {
      const oldDate = new Date("2025-01-15T10:00:00Z");
      const newDate = new Date("2025-01-16T10:00:00Z"); // +1 day

      const result = formatDateChange(oldDate, newDate);
      expect(result).toBe("due date moved forward by 1 day");
    });

    test("should handle no change", () => {
      const date = new Date("2025-01-15T10:00:00Z");

      const result = formatDateChange(date, date);
      expect(result).toBe("due date unchanged");
    });
  });

  describe("createBulkUpdateSummary", () => {
    test("should create summary for multiple tasks", () => {
      const changes = [
        { taskId: "task-1", newDueDate: new Date() },
        { taskId: "task-2", newDueDate: new Date() },
        { taskId: "task-3", newDueDate: new Date() },
      ];

      const result = createBulkUpdateSummary(changes, "moved forward by 2 days");
      expect(result).toBe("Bulk due date update applied to 3 tasks - moved forward by 2 days");
    });

    test("should handle single task", () => {
      const changes = [
        { taskId: "task-1", newDueDate: new Date() },
      ];

      const result = createBulkUpdateSummary(changes, "moved back by 1 day");
      expect(result).toBe("Bulk due date update applied to 1 task - moved back by 1 day");
    });
  });
});