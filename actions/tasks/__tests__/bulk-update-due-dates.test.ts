import { describe, test, expect, beforeAll, afterAll, beforeEach } from "@jest/globals";
import { bulkUpdateDueDates } from "../bulk-update-due-dates";
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
const testCompanyId = "test-company-id";

describe("bulkUpdateDueDates Server Action", () => {
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
        boardId: testBoard.id,
      },
    });
  });

  beforeEach(async () => {
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

    // Create test tasks with different due dates
    const baseDate = new Date("2025-01-15T10:00:00Z");
    testTasks = await Promise.all([
      db.task.create({
        data: {
          title: "Task 1",
          description: "First task",
          priority: "MEDIUM",
          status: "NEW",
          dueDate: new Date(baseDate.getTime()),
          position: 0,
          assignedToId: testUserId,
          createdById: testUserId,
          boardSectionId: testBoardSection.id,
        },
      }),
      db.task.create({
        data: {
          title: "Task 2",
          description: "Second task",
          priority: "HIGH",
          status: "IN_PROGRESS",
          dueDate: new Date(baseDate.getTime() + 2 * 24 * 60 * 60 * 1000),
          position: 1,
          assignedToId: testUserId,
          createdById: testUserId,
          boardSectionId: testBoardSection.id,
        },
      }),
      db.task.create({
        data: {
          title: "Task 3",
          description: "Third task",
          priority: "LOW",
          status: "COMPLETED",
          dueDate: new Date(baseDate.getTime() + 5 * 24 * 60 * 60 * 1000),
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

  describe("Successful Updates", () => {
    test("should successfully update multiple tasks with new due date", async () => {
      const newDueDate = new Date("2025-02-01T10:00:00Z");
      const taskIds = [testTasks[0].id, testTasks[1].id];

      const result = await bulkUpdateDueDates({
        taskIds,
        newDueDate,
        companyId: testCompanyId,
      });

      expect(result.success).toBe(true);
      expect(result.updatedCount).toBe(2);
      expect(result.message).toContain("Successfully updated 2 task(s)");

      // Verify tasks were updated
      const updatedTasks = await db.task.findMany({
        where: { id: { in: taskIds } },
      });

      updatedTasks.forEach((task) => {
        expect(task.dueDate.getTime()).toBe(newDueDate.getTime());
      });
    });

    test("should create task history entries for each updated task", async () => {
      const newDueDate = new Date("2025-02-15T10:00:00Z");
      const taskIds = [testTasks[0].id, testTasks[1].id];

      await bulkUpdateDueDates({
        taskIds,
        newDueDate,
        companyId: testCompanyId,
      });

      // Check that history entries were created
      const historyEntries = await db.taskHistory.findMany({
        where: {
          taskId: { in: taskIds },
          description: { contains: "Due date updated via bulk action" },
        },
      });

      expect(historyEntries).toHaveLength(2);
      historyEntries.forEach((entry) => {
        expect(entry.description).toContain("Due date updated via bulk action:");
        expect(entry.description).toContain("2025-02-15");
      });
    });
  });

  describe("Permission Validation", () => {
    test("should filter out tasks user doesn't have access to", async () => {
      // Create a board and task the user doesn't have access to
      const otherBoard = await db.board.create({
        data: {
          name: "Restricted Board",
          createdBy: "other-user-id",
          access: ["other-user-id"],
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

      const restrictedTask = await db.task.create({
        data: {
          title: "Restricted Task",
          description: "User has no access",
          priority: "MEDIUM",
          status: "NEW",
          dueDate: new Date(),
          position: 0,
          assignedToId: testUserId,
          createdById: "other-user-id",
          boardSectionId: otherSection.id,
        },
      });

      const newDueDate = new Date("2025-03-01T10:00:00Z");
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
      await db.boardSection.delete({ where: { id: otherSection.id } });
      await db.board.delete({ where: { id: otherBoard.id } });
    });

    test("should return error if no valid tasks to update", async () => {
      const result = await bulkUpdateDueDates({
        taskIds: ["invalid-task-id"],
        newDueDate: new Date(),
        companyId: testCompanyId,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("No valid tasks found to update");
    });
  });

  describe("Error Handling", () => {
    test("should return error for missing required parameters", async () => {
      const result = await bulkUpdateDueDates({
        taskIds: [],
        newDueDate: new Date(),
        companyId: testCompanyId,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("taskIds array is required");
    });

    test("should handle unauthenticated requests", async () => {
      // Mock auth to return no session
      const auth = require("@/auth").auth;
      auth.mockResolvedValueOnce(null);

      const result = await bulkUpdateDueDates({
        taskIds: [testTasks[0].id],
        newDueDate: new Date(),
        companyId: testCompanyId,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Authentication required");

      // Restore mock
      auth.mockResolvedValue({
        user: { id: testUserId, email: "test@example.com" },
      });
    });
  });
});
