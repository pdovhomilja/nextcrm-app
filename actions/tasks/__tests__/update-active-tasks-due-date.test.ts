import { describe, test, expect, beforeAll, afterAll, beforeEach } from "@jest/globals";
import { updateActiveTasksDueDate } from "../update-active-tasks-due-date";
import db from "@/lib/db";

// Mock authentication
jest.mock("@/auth", () => ({
  auth: jest.fn().mockResolvedValue({
    user: {
      id: "test-user-id",
      email: "test@example.com",
    },
  }),
}));

// Test data setup
const testUserId = "test-user-id";
const testBoardId = "test-board-id";
const testCompanyId = "test-company-id";

describe("updateActiveTasksDueDate Server Action", () => {
  let testBoard: any;
  let testBoardSection: any;
  let testTasks: any[];
  let testUser: any;

  beforeAll(async () => {
    // Create test user
    testUser = await db.user.create({
      data: {
        id: testUserId,
        email: "test@example.com",
        name: "Test User",
        company_id: testCompanyId,
      },
    });

    // Create test board
    testBoard = await db.board.create({
      data: {
        id: testBoardId,
        name: "Test Board",
        description: "Test board for bulk due date updates",
        createdBy: testUserId,
        access: [testUserId],
        companyId: testCompanyId,
      },
    });

    // Create test board section
    testBoardSection = await db.boardSection.create({
      data: {
        name: "Test Section",
        position: 0,
        boardId: testBoardId,
      },
    });
  });

  beforeEach(async () => {
    // Clean up any existing test tasks
    await db.task.deleteMany({
      where: {
        boardSectionId: testBoardSection.id,
      },
    });

    // Create test tasks with different statuses and due dates
    const baseDate = new Date("2025-01-15T10:00:00Z");
    testTasks = await Promise.all([
      // Active tasks (should be updated)
      db.task.create({
        data: {
          title: "Active Task 1",
          description: "First active task",
          priority: "MEDIUM",
          status: "NEW",
          dueDate: new Date(baseDate.getTime()), // Jan 15
          position: 0,
          assignedToId: testUserId,
          createdById: testUserId,
          boardSectionId: testBoardSection.id,
        },
      }),
      db.task.create({
        data: {
          title: "Active Task 2",
          description: "Second active task",
          priority: "HIGH",
          status: "IN_PROGRESS",
          dueDate: new Date(baseDate.getTime() + 2 * 24 * 60 * 60 * 1000), // Jan 17 (+2 days)
          position: 1,
          assignedToId: testUserId,
          createdById: testUserId,
          boardSectionId: testBoardSection.id,
        },
      }),
      db.task.create({
        data: {
          title: "Active Task 3",
          description: "Third active task",
          priority: "LOW",
          status: "ON_HOLD",
          dueDate: new Date(baseDate.getTime() + 5 * 24 * 60 * 60 * 1000), // Jan 20 (+5 days)
          position: 2,
          assignedToId: testUserId,
          createdById: testUserId,
          boardSectionId: testBoardSection.id,
        },
      }),
      // Inactive tasks (should NOT be updated)
      db.task.create({
        data: {
          title: "Completed Task",
          description: "This task is completed",
          priority: "MEDIUM",
          status: "COMPLETED",
          dueDate: new Date(baseDate.getTime() + 1 * 24 * 60 * 60 * 1000), // Jan 16 (+1 day)
          position: 3,
          assignedToId: testUserId,
          createdById: testUserId,
          boardSectionId: testBoardSection.id,
        },
      }),
      db.task.create({
        data: {
          title: "Cancelled Task",
          description: "This task is cancelled",
          priority: "HIGH",
          status: "CANCELLED",
          dueDate: new Date(baseDate.getTime() + 3 * 24 * 60 * 60 * 1000), // Jan 18 (+3 days)
          position: 4,
          assignedToId: testUserId,
          createdById: testUserId,
          boardSectionId: testBoardSection.id,
        },
      }),
    ]);
  });

  afterAll(async () => {
    // Clean up test data
    await db.task.deleteMany({
      where: {
        boardSectionId: testBoardSection.id,
      },
    });
    await db.taskHistory.deleteMany({
      where: {
        task: {
          boardSectionId: testBoardSection.id,
        },
      },
    });
    await db.boardSection.delete({
      where: { id: testBoardSection.id },
    });
    await db.board.delete({
      where: { id: testBoardId },
    });
    await db.user.delete({
      where: { id: testUserId },
    });
  });

  describe("Successful Updates", () => {
    test("should update active tasks with relative date preservation", async () => {
      // Use first active task as reference and shift it by +3 days
      const referenceTaskId = testTasks[0].id;
      const originalReferenceDate = testTasks[0].dueDate;
      const newReferenceDate = new Date(originalReferenceDate.getTime() + 3 * 24 * 60 * 60 * 1000);

      const result = await updateActiveTasksDueDate({
        boardId: testBoardId,
        referenceTaskId,
        newDueDate: newReferenceDate,
      });

      expect(result.success).toBe(true);
      expect(result.updatedCount).toBe(3); // Only active tasks

      // Verify tasks were updated with relative dates preserved
      const updatedTasks = await db.task.findMany({
        where: {
          boardSectionId: testBoardSection.id,
          status: { notIn: ["COMPLETED", "CANCELLED"] },
        },
        orderBy: { position: "asc" },
      });

      expect(updatedTasks).toHaveLength(3);

      // Reference task should have exact new date
      expect(updatedTasks[0].dueDate.getTime()).toBe(newReferenceDate.getTime());

      // Task 2 should maintain +2 day difference
      const expectedTask2Date = new Date(newReferenceDate.getTime() + 2 * 24 * 60 * 60 * 1000);
      expect(updatedTasks[1].dueDate.getTime()).toBe(expectedTask2Date.getTime());

      // Task 3 should maintain +5 day difference
      const expectedTask3Date = new Date(newReferenceDate.getTime() + 5 * 24 * 60 * 60 * 1000);
      expect(updatedTasks[2].dueDate.getTime()).toBe(expectedTask3Date.getTime());
    });

    test("should not update COMPLETED or CANCELLED tasks", async () => {
      const referenceTaskId = testTasks[0].id;
      const newReferenceDate = new Date(testTasks[0].dueDate.getTime() + 10 * 24 * 60 * 60 * 1000);

      await updateActiveTasksDueDate({
        boardId: testBoardId,
        referenceTaskId,
        newDueDate: newReferenceDate,
      });

      // Verify completed and cancelled tasks are unchanged
      const unchangedTasks = await db.task.findMany({
        where: {
          boardSectionId: testBoardSection.id,
          status: { in: ["COMPLETED", "CANCELLED"] },
        },
      });

      expect(unchangedTasks).toHaveLength(2);
      expect(unchangedTasks[0].dueDate.getTime()).toBe(testTasks[3].dueDate.getTime());
      expect(unchangedTasks[1].dueDate.getTime()).toBe(testTasks[4].dueDate.getTime());
    });

    test("should create task history entries for updated tasks", async () => {
      const referenceTaskId = testTasks[0].id;
      const newReferenceDate = new Date(testTasks[0].dueDate.getTime() + 1 * 24 * 60 * 60 * 1000);

      await updateActiveTasksDueDate({
        boardId: testBoardId,
        referenceTaskId,
        newDueDate: newReferenceDate,
      });

      // Check that history entries were created
      const historyEntries = await db.taskHistory.findMany({
        where: {
          taskId: { in: [testTasks[0].id, testTasks[1].id, testTasks[2].id] },
          description: { contains: "Bulk due date update" },
        },
      });

      expect(historyEntries).toHaveLength(3);
      expect(historyEntries.every(h => h.description?.includes("Bulk due date update"))).toBe(true);
    });
  });

  describe("Error Handling", () => {
    test("should return error for invalid board ID", async () => {
      const result = await updateActiveTasksDueDate({
        boardId: "invalid-board-id",
        referenceTaskId: testTasks[0].id,
        newDueDate: new Date(),
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Board not found");
    });

    test("should return error for unauthorized user", async () => {
      // Create a board with different access permissions
      const restrictedBoard = await db.board.create({
        data: {
          name: "Restricted Board",
          description: "No access for test user",
          createdBy: "other-user-id",
          access: ["other-user-id"], // testUserId not included
          companyId: testCompanyId,
        },
      });

      const result = await updateActiveTasksDueDate({
        boardId: restrictedBoard.id,
        referenceTaskId: testTasks[0].id,
        newDueDate: new Date(),
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("access");

      // Clean up
      await db.board.delete({ where: { id: restrictedBoard.id } });
    });

    test("should return error for invalid reference task ID", async () => {
      const result = await updateActiveTasksDueDate({
        boardId: testBoardId,
        referenceTaskId: "invalid-task-id",
        newDueDate: new Date(),
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Reference task not found");
    });

    test("should return error for reference task not in the board", async () => {
      // Create a task in a different board
      const otherBoard = await db.board.create({
        data: {
          name: "Other Board",
          createdBy: testUserId,
          access: [testUserId],
          companyId: testCompanyId,
        },
      });

      const otherSection = await db.boardSection.create({
        data: {
          name: "Other Section",
          position: 0,
          boardId: otherBoard.id,
        },
      });

      const otherTask = await db.task.create({
        data: {
          title: "Other Task",
          description: "Task in different board",
          priority: "MEDIUM",
          status: "NEW",
          dueDate: new Date(),
          position: 0,
          assignedToId: testUserId,
          createdById: testUserId,
          boardSectionId: otherSection.id,
        },
      });

      const result = await updateActiveTasksDueDate({
        boardId: testBoardId,
        referenceTaskId: otherTask.id,
        newDueDate: new Date(),
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Reference task not found in this board");

      // Clean up
      await db.task.delete({ where: { id: otherTask.id } });
      await db.boardSection.delete({ where: { id: otherSection.id } });
      await db.board.delete({ where: { id: otherBoard.id } });
    });

    test("should handle database transaction failures gracefully", async () => {
      // Mock db.$transaction to simulate failure
      const originalTransaction = db.$transaction;
      db.$transaction = jest.fn().mockRejectedValue(new Error("Database transaction failed"));

      const result = await updateActiveTasksDueDate({
        boardId: testBoardId,
        referenceTaskId: testTasks[0].id,
        newDueDate: new Date(),
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Failed to update tasks");

      // Restore original transaction
      db.$transaction = originalTransaction;
    });
  });

  describe("Edge Cases", () => {
    test("should handle board with no active tasks", async () => {
      // Mark all tasks as completed
      await db.task.updateMany({
        where: { boardSectionId: testBoardSection.id },
        data: { status: "COMPLETED" },
      });

      const result = await updateActiveTasksDueDate({
        boardId: testBoardId,
        referenceTaskId: testTasks[0].id,
        newDueDate: new Date(),
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("No active tasks found");
    });

    test("should handle single active task (reference task only)", async () => {
      // Mark all except first task as completed
      await db.task.updateMany({
        where: {
          boardSectionId: testBoardSection.id,
          id: { not: testTasks[0].id },
        },
        data: { status: "COMPLETED" },
      });

      const newDate = new Date(testTasks[0].dueDate.getTime() + 7 * 24 * 60 * 60 * 1000);
      const result = await updateActiveTasksDueDate({
        boardId: testBoardId,
        referenceTaskId: testTasks[0].id,
        newDueDate: newDate,
      });

      expect(result.success).toBe(true);
      expect(result.updatedCount).toBe(1);

      // Verify the single task was updated
      const updatedTask = await db.task.findUnique({
        where: { id: testTasks[0].id },
      });

      expect(updatedTask?.dueDate.getTime()).toBe(newDate.getTime());
    });

    test("should handle negative date shifts (moving dates earlier)", async () => {
      const referenceTaskId = testTasks[0].id;
      const newReferenceDate = new Date(testTasks[0].dueDate.getTime() - 2 * 24 * 60 * 60 * 1000); // 2 days earlier

      const result = await updateActiveTasksDueDate({
        boardId: testBoardId,
        referenceTaskId,
        newDueDate: newReferenceDate,
      });

      expect(result.success).toBe(true);
      expect(result.updatedCount).toBe(3);

      // Verify relative relationships are maintained with earlier dates
      const updatedTasks = await db.task.findMany({
        where: {
          boardSectionId: testBoardSection.id,
          status: { notIn: ["COMPLETED", "CANCELLED"] },
        },
        orderBy: { position: "asc" },
      });

      // Reference task should have the new earlier date
      expect(updatedTasks[0].dueDate.getTime()).toBe(newReferenceDate.getTime());

      // Task 2 should still be +2 days from reference (but earlier than original)
      const expectedTask2Date = new Date(newReferenceDate.getTime() + 2 * 24 * 60 * 60 * 1000);
      expect(updatedTasks[1].dueDate.getTime()).toBe(expectedTask2Date.getTime());
    });
  });
});