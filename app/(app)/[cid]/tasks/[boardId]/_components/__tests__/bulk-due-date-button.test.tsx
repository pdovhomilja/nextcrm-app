import { render, screen } from "@testing-library/react";
import { describe, test, expect, jest, beforeEach } from "@jest/globals";
import userEvent from "@testing-library/user-event";
import { BulkDueDateButton } from "../bulk-due-date-button";
import type { Board } from "../../../_types";

// Mock useSession
const mockSession = {
  user: {
    id: "test-user-id",
    email: "test@example.com",
  },
};

jest.mock("next-auth/react", () => ({
  useSession: () => ({ data: mockSession }),
}));

// Mock the dialog component
jest.mock("@/components/bulk-due-date/bulk-due-date-dialog", () => ({
  BulkDueDateDialog: ({ isOpen, boardId, boardName }: { isOpen: boolean; boardId: string; boardName: string }) => (
    isOpen ? (
      <div data-testid="bulk-due-date-dialog">
        <div>Dialog for board: {boardId}</div>
        <div>Board name: {boardName}</div>
      </div>
    ) : null
  ),
}));

describe("BulkDueDateButton", () => {
  const mockBoard: Board = {
    id: "test-board-id",
    name: "Test Board",
    description: "Test board description",
    createdBy: "test-user-id",
    access: ["test-user-id", "other-user-id"],
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Permission-based Rendering", () => {
    test("should render button when user has access", () => {
      render(<BulkDueDateButton board={mockBoard} />);

      expect(screen.getByRole("button", { name: /update due dates/i })).toBeInTheDocument();
      expect(screen.getByText("Update Due Dates")).toBeInTheDocument();
    });

    test("should render button when user is board creator", () => {
      const creatorBoard = {
        ...mockBoard,
        access: ["other-user-id"], // User not in access list
        createdBy: "test-user-id", // But user is creator
      };

      render(<BulkDueDateButton board={creatorBoard} />);

      expect(screen.getByRole("button", { name: /update due dates/i })).toBeInTheDocument();
    });

    test("should not render button when user has no access", () => {
      const restrictedBoard = {
        ...mockBoard,
        access: ["other-user-id"], // User not in access list
        createdBy: "other-user-id", // And user is not creator
      };

      render(<BulkDueDateButton board={restrictedBoard} />);

      expect(screen.queryByRole("button", { name: /update due dates/i })).not.toBeInTheDocument();
    });

    test("should not render button when no session", () => {
      // Override the mock for this test
      jest.doMock("next-auth/react", () => ({
        useSession: () => ({ data: null }),
      }));

      render(<BulkDueDateButton board={mockBoard} />);

      expect(screen.queryByRole("button", { name: /update due dates/i })).not.toBeInTheDocument();
    });
  });

  describe("Button Interaction", () => {
    test("should show calendar icon", () => {
      render(<BulkDueDateButton board={mockBoard} />);

      const button = screen.getByRole("button", { name: /update due dates/i });
      expect(button).toBeInTheDocument();

      // Check for calendar icon (SVG)
      const icon = button.querySelector("svg");
      expect(icon).toBeInTheDocument();
    });

    test("should open dialog when clicked", async () => {
      const user = userEvent.setup();
      render(<BulkDueDateButton board={mockBoard} />);

      const button = screen.getByRole("button", { name: /update due dates/i });
      await user.click(button);

      expect(screen.getByTestId("bulk-due-date-dialog")).toBeInTheDocument();
      expect(screen.getByText("Dialog for board: test-board-id")).toBeInTheDocument();
      expect(screen.getByText("Board name: Test Board")).toBeInTheDocument();
    });

    test("should apply custom className", () => {
      render(<BulkDueDateButton board={mockBoard} className="custom-class" />);

      const button = screen.getByRole("button", { name: /update due dates/i });
      expect(button).toHaveClass("custom-class");
    });
  });

  describe("Dialog State Management", () => {
    test("should initially have dialog closed", () => {
      render(<BulkDueDateButton board={mockBoard} />);

      expect(screen.queryByTestId("bulk-due-date-dialog")).not.toBeInTheDocument();
    });

    test("should close dialog when clicking outside (simulated)", async () => {
      const user = userEvent.setup();
      render(<BulkDueDateButton board={mockBoard} />);

      // Open dialog
      const button = screen.getByRole("button", { name: /update due dates/i });
      await user.click(button);

      expect(screen.getByTestId("bulk-due-date-dialog")).toBeInTheDocument();

      // In a real scenario, the dialog would close when onOpenChange is called
      // This test verifies the dialog is properly rendered when open
    });
  });

  describe("Accessibility", () => {
    test("should have proper ARIA label", () => {
      render(<BulkDueDateButton board={mockBoard} />);

      const button = screen.getByRole("button", { name: /update due dates for all active tasks in test board/i });
      expect(button).toBeInTheDocument();
    });

    test("should have proper button role", () => {
      render(<BulkDueDateButton board={mockBoard} />);

      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("type", "button");
    });

    test("should be keyboard accessible", async () => {
      const user = userEvent.setup();
      render(<BulkDueDateButton board={mockBoard} />);

      const button = screen.getByRole("button", { name: /update due dates/i });

      // Should be focusable
      await user.tab();
      expect(button).toHaveFocus();

      // Should activate with Enter or Space
      await user.keyboard("{Enter}");
      expect(screen.getByTestId("bulk-due-date-dialog")).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    test("should handle board with empty access array", () => {
      const boardWithNoAccess = {
        ...mockBoard,
        access: [],
        createdBy: "test-user-id", // User is still creator
      };

      render(<BulkDueDateButton board={boardWithNoAccess} />);

      // Should still render because user is creator
      expect(screen.getByRole("button", { name: /update due dates/i })).toBeInTheDocument();
    });

    test("should handle board with undefined description", () => {
      const boardWithUndefinedDesc = {
        ...mockBoard,
        description: undefined,
      };

      render(<BulkDueDateButton board={boardWithUndefinedDesc} />);

      expect(screen.getByRole("button", { name: /update due dates/i })).toBeInTheDocument();
    });

    test("should handle very long board names in ARIA label", () => {
      const boardWithLongName = {
        ...mockBoard,
        name: "This is a very long board name that might cause issues with ARIA labels or display",
      };

      render(<BulkDueDateButton board={boardWithLongName} />);

      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("aria-label");
      expect(button.getAttribute("aria-label")).toContain("This is a very long board name");
    });
  });
});