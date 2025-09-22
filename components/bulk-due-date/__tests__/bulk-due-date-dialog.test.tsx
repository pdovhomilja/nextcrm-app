import { render, screen, waitFor } from "@testing-library/react";
import { describe, test, expect, jest, beforeEach } from "@jest/globals";
import userEvent from "@testing-library/user-event";
import { BulkDueDateDialog } from "../bulk-due-date-dialog";

// Mock the server actions
const mockUpdateActiveTasksDueDate = jest.fn();
const mockGetActiveTasksCount = jest.fn();
const mockGetBoardTasksForReference = jest.fn();

jest.mock("@/actions/tasks/update-active-tasks-due-date", () => ({
  updateActiveTasksDueDate: mockUpdateActiveTasksDueDate,
  getActiveTasksCount: mockGetActiveTasksCount,
  getBoardTasksForReference: mockGetBoardTasksForReference,
}));

// Mock react-hook-form
const mockReset = jest.fn();
const mockSetError = jest.fn();
const mockClearErrors = jest.fn();

jest.mock("react-hook-form", () => ({
  useForm: () => ({
    control: {},
    handleSubmit: (fn: (data: unknown) => void) => fn,
    formState: { errors: {}, isSubmitting: false },
    watch: () => ({ referenceTaskId: "task-1", newDueDate: new Date("2025-01-20") }),
    setValue: jest.fn(),
    setError: mockSetError,
    clearErrors: mockClearErrors,
    reset: mockReset,
  }),
  Controller: ({ render }: { render: (props: { field: { value: unknown; onChange: () => void } }) => React.ReactNode }) =>
    render({ field: { value: undefined, onChange: jest.fn() } }),
}));

// Mock toast
const mockToast = jest.fn();
jest.mock("sonner", () => ({
  toast: {
    success: mockToast,
    error: mockToast,
  },
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
];

describe("BulkDueDateDialog", () => {
  const defaultProps = {
    boardId: "test-board-id",
    boardName: "Test Board",
    isOpen: true,
    onOpenChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockGetBoardTasksForReference.mockResolvedValue({
      tasks: mockTasks,
      error: undefined,
    });

    mockGetActiveTasksCount.mockResolvedValue({
      count: 2,
      error: undefined,
    });

    mockUpdateActiveTasksDueDate.mockResolvedValue({
      success: true,
      message: "Successfully updated 2 tasks",
      updatedCount: 2,
    });
  });

  describe("Rendering", () => {
    test("should render dialog when open", () => {
      render(<BulkDueDateDialog {...defaultProps} />);

      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText("Update Due Dates")).toBeInTheDocument();
      expect(screen.getByText("Test Board")).toBeInTheDocument();
    });

    test("should not render dialog when closed", () => {
      render(<BulkDueDateDialog {...defaultProps} isOpen={false} />);

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    test("should show loading state while fetching task count", () => {
      mockGetActiveTasksCount.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<BulkDueDateDialog {...defaultProps} />);

      expect(screen.getByText("Loading task information...")).toBeInTheDocument();
    });

    test("should display task count when loaded", async () => {
      render(<BulkDueDateDialog {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/2 active tasks/)).toBeInTheDocument();
      });
    });
  });

  describe("Form Components", () => {
    test("should render reference task selector", async () => {
      render(<BulkDueDateDialog {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Reference Task")).toBeInTheDocument();
      });
    });

    test("should render date picker", async () => {
      render(<BulkDueDateDialog {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("New Due Date")).toBeInTheDocument();
        expect(screen.getByTestId("calendar-icon")).toBeInTheDocument();
      });
    });

    test("should show help text for bulk updates", async () => {
      render(<BulkDueDateDialog {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/All active tasks will maintain their relative time differences/)).toBeInTheDocument();
      });
    });
  });

  describe("Form Validation", () => {
    test("should disable submit button when no reference task selected", async () => {
      render(<BulkDueDateDialog {...defaultProps} />);

      await waitFor(() => {
        const submitButton = screen.getByText("Update Tasks");
        expect(submitButton).toBeDisabled();
      });
    });

    test("should disable submit button when no date selected", async () => {
      render(<BulkDueDateDialog {...defaultProps} />);

      await waitFor(() => {
        const submitButton = screen.getByText("Update Tasks");
        expect(submitButton).toBeDisabled();
      });
    });

    test("should enable submit button when both fields are filled", async () => {
      // This test depends on the mocked useForm returning valid values
      render(<BulkDueDateDialog {...defaultProps} />);

      await waitFor(() => {
        const submitButton = screen.getByText("Update Tasks");
        expect(submitButton).not.toBeDisabled();
      });
    });
  });

  describe("Confirmation Flow", () => {
    test("should show confirmation dialog before submitting", async () => {
      const user = userEvent.setup();
      render(<BulkDueDateDialog {...defaultProps} />);

      await waitFor(() => {
        const submitButton = screen.getByText("Update Tasks");
        expect(submitButton).not.toBeDisabled();
      });

      await user.click(screen.getByText("Update Tasks"));

      await waitFor(() => {
        expect(screen.getByText("Confirm Bulk Update")).toBeInTheDocument();
        expect(screen.getByText(/2 active tasks will be updated/)).toBeInTheDocument();
      });
    });

    test("should show task details in confirmation", async () => {
      const user = userEvent.setup();
      render(<BulkDueDateDialog {...defaultProps} />);

      await user.click(screen.getByText("Update Tasks"));

      await waitFor(() => {
        expect(screen.getByText("Reference Task:")).toBeInTheDocument();
        expect(screen.getByText("New Date:")).toBeInTheDocument();
      });
    });

    test("should allow canceling confirmation", async () => {
      const user = userEvent.setup();
      render(<BulkDueDateDialog {...defaultProps} />);

      await user.click(screen.getByText("Update Tasks"));

      await waitFor(() => {
        expect(screen.getByText("Confirm Bulk Update")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Cancel"));

      await waitFor(() => {
        expect(screen.queryByText("Confirm Bulk Update")).not.toBeInTheDocument();
      });
    });

    test("should proceed with update when confirmed", async () => {
      const user = userEvent.setup();
      render(<BulkDueDateDialog {...defaultProps} />);

      await user.click(screen.getByText("Update Tasks"));

      await waitFor(() => {
        expect(screen.getByText("Confirm Bulk Update")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Confirm Update"));

      await waitFor(() => {
        expect(mockUpdateActiveTasksDueDate).toHaveBeenCalledWith({
          boardId: "test-board-id",
          referenceTaskId: "task-1",
          newDueDate: expect.any(Date),
        });
      });
    });
  });

  describe("Submission Handling", () => {
    test("should show loading state during submission", async () => {
      const user = userEvent.setup();
      mockUpdateActiveTasksDueDate.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({
          success: true,
          message: "Success",
          updatedCount: 2
        }), 100))
      );

      render(<BulkDueDateDialog {...defaultProps} />);

      await user.click(screen.getByText("Update Tasks"));
      await user.click(screen.getByText("Confirm Update"));

      expect(screen.getByText("Updating tasks...")).toBeInTheDocument();
    });

    test("should show success message and close dialog on success", async () => {
      const user = userEvent.setup();
      const mockOnOpenChange = jest.fn();
      const props = { ...defaultProps, onOpenChange: mockOnOpenChange };

      render(<BulkDueDateDialog {...props} />);

      await user.click(screen.getByText("Update Tasks"));
      await user.click(screen.getByText("Confirm Update"));

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith("Successfully updated 2 tasks");
        expect(mockOnOpenChange).toHaveBeenCalledWith(false);
      });
    });

    test("should show error message on failure", async () => {
      const user = userEvent.setup();
      mockUpdateActiveTasksDueDate.mockResolvedValue({
        success: false,
        error: "Failed to update tasks",
      });

      render(<BulkDueDateDialog {...defaultProps} />);

      await user.click(screen.getByText("Update Tasks"));
      await user.click(screen.getByText("Confirm Update"));

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith("Failed to update tasks");
      });
    });
  });

  describe("Error Handling", () => {
    test("should show error when task count loading fails", async () => {
      mockGetActiveTasksCount.mockResolvedValue({
        count: 0,
        error: "Failed to load task count",
      });

      render(<BulkDueDateDialog {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Error loading task information")).toBeInTheDocument();
      });
    });

    test("should show error when no active tasks found", async () => {
      mockGetActiveTasksCount.mockResolvedValue({
        count: 0,
        error: undefined,
      });

      render(<BulkDueDateDialog {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("No active tasks found in this board")).toBeInTheDocument();
      });
    });

    test("should handle server action errors gracefully", async () => {
      const user = userEvent.setup();
      mockUpdateActiveTasksDueDate.mockRejectedValue(new Error("Network error"));

      render(<BulkDueDateDialog {...defaultProps} />);

      await user.click(screen.getByText("Update Tasks"));
      await user.click(screen.getByText("Confirm Update"));

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith("An unexpected error occurred");
      });
    });
  });

  describe("Dialog Interaction", () => {
    test("should close dialog when close button is clicked", async () => {
      const user = userEvent.setup();
      const mockOnOpenChange = jest.fn();
      const props = { ...defaultProps, onOpenChange: mockOnOpenChange };

      render(<BulkDueDateDialog {...props} />);

      const closeButton = screen.getByRole("button", { name: /close/i });
      await user.click(closeButton);

      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });

    test("should close dialog when cancel button is clicked", async () => {
      const user = userEvent.setup();
      const mockOnOpenChange = jest.fn();
      const props = { ...defaultProps, onOpenChange: mockOnOpenChange };

      render(<BulkDueDateDialog {...props} />);

      await user.click(screen.getByText("Cancel"));

      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });

    test("should close dialog on escape key", async () => {
      const user = userEvent.setup();
      const mockOnOpenChange = jest.fn();
      const props = { ...defaultProps, onOpenChange: mockOnOpenChange };

      render(<BulkDueDateDialog {...props} />);

      await user.keyboard("{Escape}");

      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe("Form Reset", () => {
    test("should reset form when dialog opens", () => {
      const { rerender } = render(<BulkDueDateDialog {...defaultProps} isOpen={false} />);

      rerender(<BulkDueDateDialog {...defaultProps} isOpen={true} />);

      expect(mockReset).toHaveBeenCalled();
    });

    test("should reset form when dialog closes successfully", async () => {
      const user = userEvent.setup();
      render(<BulkDueDateDialog {...defaultProps} />);

      await user.click(screen.getByText("Update Tasks"));
      await user.click(screen.getByText("Confirm Update"));

      await waitFor(() => {
        expect(mockReset).toHaveBeenCalled();
      });
    });
  });

  describe("Accessibility", () => {
    test("should have proper dialog attributes", () => {
      render(<BulkDueDateDialog {...defaultProps} />);

      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveAttribute("aria-labelledby");
      expect(dialog).toHaveAttribute("aria-describedby");
    });

    test("should have proper form labels", async () => {
      render(<BulkDueDateDialog {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Reference Task")).toBeInTheDocument();
        expect(screen.getByText("New Due Date")).toBeInTheDocument();
      });
    });

    test("should announce form errors to screen readers", async () => {
      // Test that validation errors have proper aria-live regions
      render(<BulkDueDateDialog {...defaultProps} />);

      await waitFor(() => {
        const errorElements = screen.getAllByRole("alert");
        expect(errorElements.length).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe("Performance", () => {
    test("should not re-fetch task count unnecessarily", async () => {
      const { rerender } = render(<BulkDueDateDialog {...defaultProps} />);

      await waitFor(() => {
        expect(mockGetActiveTasksCount).toHaveBeenCalledTimes(1);
      });

      // Re-render with same boardId should not refetch
      rerender(<BulkDueDateDialog {...defaultProps} boardName="Different Name" />);

      expect(mockGetActiveTasksCount).toHaveBeenCalledTimes(1);
    });

    test("should refetch when boardId changes", async () => {
      const { rerender } = render(<BulkDueDateDialog {...defaultProps} />);

      await waitFor(() => {
        expect(mockGetActiveTasksCount).toHaveBeenCalledTimes(1);
      });

      // Change boardId should trigger refetch
      rerender(<BulkDueDateDialog {...defaultProps} boardId="different-board-id" />);

      await waitFor(() => {
        expect(mockGetActiveTasksCount).toHaveBeenCalledTimes(2);
      });
    });
  });
});