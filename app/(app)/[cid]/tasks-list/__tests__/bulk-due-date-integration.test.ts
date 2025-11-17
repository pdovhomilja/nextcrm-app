/**
 * Integration tests for bulk due date update feature
 * Focus: end-to-end workflows, filter interactions, edge cases
 */

import { describe, it, expect, jest, beforeEach, afterAll } from "@jest/globals";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { bulkUpdateDueDates } from "@/actions/tasks/bulk-update-due-dates";
import db from "@/lib/db";

// Mock next/navigation
const mockRouter = {
  push: jest.fn(),
  refresh: jest.fn(),
};

jest.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
}));

// Mock sonner toast
const mockToast = {
  success: jest.fn(),
  error: jest.fn(),
  loading: jest.fn(),
  dismiss: jest.fn(),
};

jest.mock("sonner", () => ({
  toast: mockToast,
}));

// Mock auth
jest.mock("@/auth", () => ({
  auth: jest.fn().mockResolvedValue({
    user: {
      id: "test-user-id",
      email: "test@example.com",
    },
  }),
}));

// Test data setup
const testUserId = "integration-test-user-id";
const testCompanyId = "integration-test-company-id";

describe("Bulk Due Date Update - Integration Tests", () => {
  let testBoard: any;
  let testBoardSection: any;
  let testTasks: any[];
  let testUser: any;

  beforeAll(async () => {
    // Create test user
    testUser = await db.user.create({
      data: {
        id: testUserId,
        email: "integration-test@example.com",
        name: "Integration Test User",
        company_id: testCompanyId,
      },
    });

    // Create test board
    testBoard = await db.board.create({
      data: {
        name: "Integration Test Board",
        description: "Test board for integration tests",
        createdBy: testUserId,
        access: [testUserId],
        companyId: testCompanyId,
      },
    });

    // Create test board section
    testBoardSection = await db.boardSection.create({
      data: {
        name: "Integration Test Section",
        position: 0,
        boardId: testBoard.id,
      },
    });
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    // Clean up any existing test tasks and history
    await db.taskHistory.deleteMany({
      where: {
        task: {
          boardSectionId: testBoardSection.id,
        },
      },
    });

    await db.task.deleteMany({
      where: {
        boardSectionId: testBoardSection.id,
      },
    });

    // Create test tasks with various statuses and priorities
    const baseDate = new Date("2025-01-15T10:00:00Z");
    testTasks = await Promise.all([
      db.task.create({
        data: {
          title: "Overdue High Priority Task",
          description: "Should appear in overdue filter",
          priority: "HIGH",
          status: "IN_PROGRESS",
          dueDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
          position: 0,
          assignedToId: testUserId,
          createdById: testUserId,
          boardSectionId: testBoardSection.id,
        },
      }),
      db.task.create({
        data: {
          title: "Current Medium Priority Task",
          description: "Normal task",
          priority: "MEDIUM",
          status: "IN_PROGRESS",
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
          position: 1,
          assignedToId: testUserId,
          createdById: testUserId,
          boardSectionId: testBoardSection.id,
        },
      }),
      db.task.create({
        data: {
          title: "Low Priority New Task",
          description: "Just created",
          priority: "LOW",
          status: "NEW",
          dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
          position: 2,
          assignedToId: testUserId,
          createdById: testUserId,
          boardSectionId: testBoardSection.id,
        },
      }),
    ]);
  });

  afterAll(async () => {
    // Clean up test data
    await db.taskHistory.deleteMany({
      where: {
        task: {
          boardSectionId: testBoardSection.id,
        },
      },
    });
    await db.task.deleteMany({
      where: {
        boardSectionId: testBoardSection.id,
      },
    });
    await db.boardSection.delete({
      where: { id: testBoardSection.id },
    });
    await db.board.delete({
      where: { id: testBoard.id },
    });
    await db.user.delete({
      where: { id: testUserId },
    });
  });

  describe("End-to-End Workflow with Filters", () => {
    it("should successfully update overdue tasks filtered by status", async () => {
      // Simulate filtering to only IN_PROGRESS tasks
      const inProgressTasks = testTasks.filter((t) => t.status === "IN_PROGRESS");
      const taskIds = inProgressTasks.map((t) => t.id);

      const newDueDate = new Date("2025-03-01T10:00:00Z");

      const result = await bulkUpdateDueDates({
        taskIds,
        newDueDate,
        companyId: testCompanyId,
      });

      expect(result.success).toBe(true);
      expect(result.updatedCount).toBe(2); // Should update both IN_PROGRESS tasks

      // Verify only filtered tasks were updated
      const updatedTasks = await db.task.findMany({
        where: { id: { in: taskIds } },
      });

      updatedTasks.forEach((task) => {
        expect(task.dueDate.getTime()).toBe(newDueDate.getTime());
      });

      // Verify the NEW status task was not updated
      const untouchedTask = await db.task.findUnique({
        where: { id: testTasks[2].id },
      });

      expect(untouchedTask?.dueDate.getTime()).not.toBe(newDueDate.getTime());
    });

    it("should handle bulk update of high priority tasks only", async () => {
      // Simulate filtering to only HIGH priority tasks
      const highPriorityTasks = testTasks.filter((t) => t.priority === "HIGH");
      const taskIds = highPriorityTasks.map((t) => t.id);

      const newDueDate = new Date("2025-04-01T10:00:00Z");

      const result = await bulkUpdateDueDates({
        taskIds,
        newDueDate,
        companyId: testCompanyId,
      });

      expect(result.success).toBe(true);
      expect(result.updatedCount).toBe(1); // Only one HIGH priority task

      // Verify task history entry describes the filter context
      const historyEntries = await db.taskHistory.findMany({
        where: {
          taskId: { in: taskIds },
          description: { contains: "Due date updated via bulk action" },
        },
      });

      expect(historyEntries).toHaveLength(1);
    });
  });

  describe("Select All Functionality", () => {
    it("should select and update all visible tasks on current page", async () => {
      // Select all 3 test tasks
      const allTaskIds = testTasks.map((t) => t.id);
      const newDueDate = new Date("2025-05-01T10:00:00Z");

      const result = await bulkUpdateDueDates({
        taskIds: allTaskIds,
        newDueDate,
        companyId: testCompanyId,
      });

      expect(result.success).toBe(true);
      expect(result.updatedCount).toBe(3);

      // Verify all tasks have the same due date
      const updatedTasks = await db.task.findMany({
        where: { id: { in: allTaskIds } },
      });

      const uniqueDueDates = new Set(
        updatedTasks.map((t) => t.dueDate.getTime())
      );
      expect(uniqueDueDates.size).toBe(1); // All tasks have the same due date
      expect(uniqueDueDates.has(newDueDate.getTime())).toBe(true);
    });

    it("should handle partial selection after select all", async () => {
      // Start with all selected, then deselect one
      const selectedTaskIds = [testTasks[0].id, testTasks[1].id]; // Exclude task 2
      const newDueDate = new Date("2025-06-01T10:00:00Z");

      const result = await bulkUpdateDueDates({
        taskIds: selectedTaskIds,
        newDueDate,
        companyId: testCompanyId,
      });

      expect(result.success).toBe(true);
      expect(result.updatedCount).toBe(2);

      // Verify the excluded task was not updated
      const excludedTask = await db.task.findUnique({
        where: { id: testTasks[2].id },
      });

      expect(excludedTask?.dueDate.getTime()).not.toBe(newDueDate.getTime());
    });
  });

  describe("Invalid Date Handling", () => {
    it("should handle invalid date gracefully", async () => {
      const taskIds = [testTasks[0].id];
      const invalidDate = new Date("invalid-date-string");

      // This test verifies that the server action handles invalid dates
      // In production, the DatePickerInput component should prevent this
      const result = await bulkUpdateDueDates({
        taskIds,
        newDueDate: invalidDate,
        companyId: testCompanyId,
      });

      // The invalid date will cause an error
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should handle very old dates", async () => {
      const taskIds = [testTasks[0].id];
      const oldDate = new Date("2000-01-01T00:00:00Z");

      const result = await bulkUpdateDueDates({
        taskIds,
        newDueDate: oldDate,
        companyId: testCompanyId,
      });

      // Old dates should still be valid
      expect(result.success).toBe(true);
      expect(result.updatedCount).toBe(1);

      const updatedTask = await db.task.findUnique({
        where: { id: taskIds[0] },
      });

      expect(updatedTask?.dueDate.getTime()).toBe(oldDate.getTime());
    });
  });

  describe("Empty Selection Edge Cases", () => {
    it("should return error when trying to update with empty selection", async () => {
      const result = await bulkUpdateDueDates({
        taskIds: [],
        newDueDate: new Date(),
        companyId: testCompanyId,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("taskIds array is required");
    });

    it("should handle selection cleared before update completes", async () => {
      // Simulate user clearing selection mid-update
      const taskIds = [testTasks[0].id];
      const newDueDate = new Date("2025-07-01T10:00:00Z");

      // First update should succeed
      const result = await bulkUpdateDueDates({
        taskIds,
        newDueDate,
        companyId: testCompanyId,
      });

      expect(result.success).toBe(true);

      // Second update with empty selection should fail
      const secondResult = await bulkUpdateDueDates({
        taskIds: [],
        newDueDate,
        companyId: testCompanyId,
      });

      expect(secondResult.success).toBe(false);
    });
  });

  describe("Large Batch Updates", () => {
    it("should handle bulk update of 50+ tasks efficiently", async () => {
      // Create 50 additional tasks
      const largeBatch = await Promise.all(
        Array.from({ length: 50 }, (_, i) =>
          db.task.create({
            data: {
              title: `Batch Task ${i + 1}`,
              description: `Performance test task ${i + 1}`,
              priority: "MEDIUM",
              status: "NEW",
              dueDate: new Date(Date.now() + i * 24 * 60 * 60 * 1000),
              position: i + 10,
              assignedToId: testUserId,
              createdById: testUserId,
              boardSectionId: testBoardSection.id,
            },
          })
        )
      );

      const taskIds = largeBatch.map((t) => t.id);
      const newDueDate = new Date("2025-08-01T10:00:00Z");

      const startTime = Date.now();

      const result = await bulkUpdateDueDates({
        taskIds,
        newDueDate,
        companyId: testCompanyId,
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(result.success).toBe(true);
      expect(result.updatedCount).toBe(50);

      // Verify reasonable performance (should complete within 5 seconds)
      expect(duration).toBeLessThan(5000);

      // Clean up large batch
      await db.taskHistory.deleteMany({
        where: {
          taskId: { in: taskIds },
        },
      });
      await db.task.deleteMany({
        where: {
          id: { in: taskIds },
        },
      });
    });
  });

  describe("Task History and Audit Trail", () => {
    it("should create detailed history entries for each updated task", async () => {
      const taskIds = [testTasks[0].id, testTasks[1].id];
      const oldDueDates = [testTasks[0].dueDate, testTasks[1].dueDate];
      const newDueDate = new Date("2025-09-01T10:00:00Z");

      await bulkUpdateDueDates({
        taskIds,
        newDueDate,
        companyId: testCompanyId,
      });

      // Verify history entries contain old and new dates
      const historyEntries = await db.taskHistory.findMany({
        where: {
          taskId: { in: taskIds },
          description: { contains: "Due date updated via bulk action" },
        },
        orderBy: { createdAt: "desc" },
      });

      expect(historyEntries).toHaveLength(2);

      historyEntries.forEach((entry, index) => {
        expect(entry.description).toContain("Due date updated via bulk action:");
        expect(entry.description).toContain("2025-09-01");
        expect(entry.userId).toBe(testUserId);
      });
    });
  });

  describe("Permission and Access Control", () => {
    it("should filter out tasks from boards user doesn't have access to", async () => {
      // Create a restricted board
      const restrictedBoard = await db.board.create({
        data: {
          name: "Restricted Board",
          createdBy: "other-user-id",
          access: ["other-user-id"],
          companyId: testCompanyId,
        },
      });

      const restrictedSection = await db.boardSection.create({
        data: {
          name: "Restricted Section",
          position: 0,
          boardId: restrictedBoard.id,
        },
      });

      const restrictedTask = await db.task.create({
        data: {
          title: "Restricted Task",
          description: "User has no access",
          priority: "HIGH",
          status: "NEW",
          dueDate: new Date(),
          position: 0,
          assignedToId: testUserId,
          createdById: "other-user-id",
          boardSectionId: restrictedSection.id,
        },
      });

      const newDueDate = new Date("2025-10-01T10:00:00Z");

      // Try to update both accessible and restricted tasks
      const result = await bulkUpdateDueDates({
        taskIds: [testTasks[0].id, restrictedTask.id],
        newDueDate,
        companyId: testCompanyId,
      });

      // Should only update the accessible task
      expect(result.success).toBe(true);
      expect(result.updatedCount).toBe(1);

      // Verify restricted task was not updated
      const unchangedTask = await db.task.findUnique({
        where: { id: restrictedTask.id },
      });
      expect(unchangedTask?.dueDate.getTime()).not.toBe(newDueDate.getTime());

      // Clean up
      await db.task.delete({ where: { id: restrictedTask.id } });
      await db.boardSection.delete({ where: { id: restrictedSection.id } });
      await db.board.delete({ where: { id: restrictedBoard.id } });
    });
  });
});
