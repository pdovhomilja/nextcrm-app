import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, test, expect, jest, beforeEach } from "@jest/globals";
import { ReferenceTaskSelector } from "../reference-task-selector";

// Mock the server action
const mockGetBoardTasksForReference = jest.fn();

jest.mock("@/actions/tasks/update-active-tasks-due-date", () => ({
  getBoardTasksForReference: mockGetBoardTasksForReference,
}));

// Sample test data
const mockTasks = [
  {
    id: "task-1",
    title: "First Task",
    dueDate: new Date("2025-01-15T10:00:00Z"),
    status: "NEW",
  },
  {
    id: "task-2",
    title: "Second Task",
    dueDate: new Date("2025-01-17T10:00:00Z"),
    status: "IN_PROGRESS",
  },
  {
    id: "task-3",
    title: "Third Task",
    dueDate: new Date("2025-01-20T10:00:00Z"),
    status: "ON_HOLD",
  },
];

describe("ReferenceTaskSelector", () => {
  const defaultProps = {
    boardId: "test-board-id",
    selectedTaskId: undefined,
    onTaskSelect: jest.fn(),
    disabled: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetBoardTasksForReference.mockResolvedValue({
      tasks: mockTasks,
      error: undefined,
    });
  });

  describe("Rendering", () => {
    test("should render with placeholder text when no task selected", async () => {
      render(<ReferenceTaskSelector {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Select reference task")).toBeInTheDocument();
      });
    });

    test("should show loading state initially", () => {
      mockGetBoardTasksForReference.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      render(<ReferenceTaskSelector {...defaultProps} />);

      expect(screen.getByText("Loading tasks...")).toBeInTheDocument();
    });

    test("should render selected task when selectedTaskId provided", async () => {
      const selectedProps = {
        ...defaultProps,
        selectedTaskId: "task-2",
      };

      render(<ReferenceTaskSelector {...selectedProps} />);

      await waitFor(() => {
        expect(screen.getByDisplayValue("Second Task")).toBeInTheDocument();
      });
    });

    test("should be disabled when disabled prop is true", async () => {
      const disabledProps = {
        ...defaultProps,
        disabled: true,
      };

      render(<ReferenceTaskSelector {...disabledProps} />);

      await waitFor(() => {
        const trigger = screen.getByRole("combobox");
        expect(trigger).toBeDisabled();
      });
    });
  });

  describe("Task Loading", () => {
    test("should load tasks on mount", async () => {
      render(<ReferenceTaskSelector {...defaultProps} />);

      await waitFor(() => {
        expect(mockGetBoardTasksForReference).toHaveBeenCalledWith("test-board-id");
      });
    });

    test("should display error message when loading fails", async () => {
      mockGetBoardTasksForReference.mockResolvedValue({
        tasks: [],
        error: "Failed to load tasks",
      });

      render(<ReferenceTaskSelector {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Error loading tasks")).toBeInTheDocument();
      });
    });

    test("should show 'No active tasks' when tasks array is empty", async () => {
      mockGetBoardTasksForReference.mockResolvedValue({
        tasks: [],
        error: undefined,
      });

      render(<ReferenceTaskSelector {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("No active tasks available")).toBeInTheDocument();
      });
    });
  });

  describe("Task Selection", () => {
    test("should display all tasks in dropdown", async () => {
      render(<ReferenceTaskSelector {...defaultProps} />);

      await waitFor(() => {
        const trigger = screen.getByRole("combobox");
        fireEvent.click(trigger);
      });

      await waitFor(() => {
        expect(screen.getByText("First Task")).toBeInTheDocument();
        expect(screen.getByText("Second Task")).toBeInTheDocument();
        expect(screen.getByText("Third Task")).toBeInTheDocument();
      });
    });

    test("should call onTaskSelect when task is selected", async () => {
      const mockOnTaskSelect = jest.fn();
      const selectProps = {
        ...defaultProps,
        onTaskSelect: mockOnTaskSelect,
      };

      render(<ReferenceTaskSelector {...selectProps} />);

      await waitFor(() => {
        const trigger = screen.getByRole("combobox");
        fireEvent.click(trigger);
      });

      await waitFor(() => {
        const firstTask = screen.getByText("First Task");
        fireEvent.click(firstTask);
      });

      expect(mockOnTaskSelect).toHaveBeenCalledWith("task-1");
    });

    test("should not call onTaskSelect when disabled", async () => {
      const mockOnTaskSelect = jest.fn();
      const disabledProps = {
        ...defaultProps,
        onTaskSelect: mockOnTaskSelect,
        disabled: true,
      };

      render(<ReferenceTaskSelector {...disabledProps} />);

      await waitFor(() => {
        const trigger = screen.getByRole("combobox");
        expect(trigger).toBeDisabled();
      });

      expect(mockOnTaskSelect).not.toHaveBeenCalled();
    });
  });

  describe("Task Display Formatting", () => {
    test("should display task with due date", async () => {
      render(<ReferenceTaskSelector {...defaultProps} />);

      await waitFor(() => {
        const trigger = screen.getByRole("combobox");
        fireEvent.click(trigger);
      });

      await waitFor(() => {
        // Should show task title and formatted due date
        expect(screen.getByText("First Task")).toBeInTheDocument();
        expect(screen.getByText("Due: Jan 15, 2025")).toBeInTheDocument();
      });
    });

    test("should show status badges for different task statuses", async () => {
      render(<ReferenceTaskSelector {...defaultProps} />);

      await waitFor(() => {
        const trigger = screen.getByRole("combobox");
        fireEvent.click(trigger);
      });

      await waitFor(() => {
        // Should show status indicators
        expect(screen.getByText("NEW")).toBeInTheDocument();
        expect(screen.getByText("IN_PROGRESS")).toBeInTheDocument();
        expect(screen.getByText("ON_HOLD")).toBeInTheDocument();
      });
    });

    test("should sort tasks by due date ascending", async () => {
      render(<ReferenceTaskSelector {...defaultProps} />);

      await waitFor(() => {
        const trigger = screen.getByRole("combobox");
        fireEvent.click(trigger);
      });

      await waitFor(() => {
        const taskElements = screen.getAllByTestId(/^task-option-/);
        expect(taskElements).toHaveLength(3);

        // Tasks should be ordered by due date (earliest first)
        expect(taskElements[0]).toHaveTextContent("First Task"); // Jan 15
        expect(taskElements[1]).toHaveTextContent("Second Task"); // Jan 17
        expect(taskElements[2]).toHaveTextContent("Third Task"); // Jan 20
      });
    });
  });

  describe("Error Handling", () => {
    test("should handle network errors gracefully", async () => {
      mockGetBoardTasksForReference.mockRejectedValue(new Error("Network error"));

      render(<ReferenceTaskSelector {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Error loading tasks")).toBeInTheDocument();
      });
    });

    test("should retry loading when boardId changes", async () => {
      const { rerender } = render(
        <ReferenceTaskSelector {...defaultProps} boardId="board-1" />
      );

      await waitFor(() => {
        expect(mockGetBoardTasksForReference).toHaveBeenCalledWith("board-1");
      });

      rerender(
        <ReferenceTaskSelector {...defaultProps} boardId="board-2" />
      );

      await waitFor(() => {
        expect(mockGetBoardTasksForReference).toHaveBeenCalledWith("board-2");
      });

      expect(mockGetBoardTasksForReference).toHaveBeenCalledTimes(2);
    });
  });

  describe("Accessibility", () => {
    test("should have proper ARIA labels", async () => {
      render(<ReferenceTaskSelector {...defaultProps} />);

      await waitFor(() => {
        const trigger = screen.getByRole("combobox");
        expect(trigger).toHaveAttribute("aria-label", "Select reference task");
      });
    });

    test("should support keyboard navigation", async () => {
      render(<ReferenceTaskSelector {...defaultProps} />);

      await waitFor(() => {
        const trigger = screen.getByRole("combobox");

        // Should open with Enter or Space
        fireEvent.keyDown(trigger, { key: "Enter" });
      });

      await waitFor(() => {
        expect(screen.getByRole("listbox")).toBeInTheDocument();
      });
    });

    test("should announce loading state to screen readers", () => {
      mockGetBoardTasksForReference.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      render(<ReferenceTaskSelector {...defaultProps} />);

      const loadingElement = screen.getByText("Loading tasks...");
      expect(loadingElement).toHaveAttribute("aria-live", "polite");
    });
  });

  describe("Performance", () => {
    test("should not reload tasks unnecessarily", async () => {
      const { rerender } = render(
        <ReferenceTaskSelector {...defaultProps} selectedTaskId="task-1" />
      );

      await waitFor(() => {
        expect(mockGetBoardTasksForReference).toHaveBeenCalledTimes(1);
      });

      // Rerender with different selectedTaskId (same boardId)
      rerender(
        <ReferenceTaskSelector {...defaultProps} selectedTaskId="task-2" />
      );

      // Should not reload tasks
      expect(mockGetBoardTasksForReference).toHaveBeenCalledTimes(1);
    });
  });
});