/**
 * Tests for TaskTableWithSelection component
 * Focus: checkbox selection, select all, state management, bulk update integration
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { TaskTableWithSelection } from "../task-table-with-selection";

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

// Mock bulk update server action
jest.mock("@/actions/tasks/bulk-update-due-dates", () => ({
  bulkUpdateDueDates: jest.fn(),
}));

// Mock sonner toast
jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    loading: jest.fn(),
    dismiss: jest.fn(),
  },
}));

// Mock TaskDataTableServer component
jest.mock("../task-data-table-server", () => ({
  TaskDataTableServer: ({
    selectedTaskIds,
    onSelectionChange,
  }: {
    selectedTaskIds?: Set<string>;
    onSelectionChange?: (taskId: string) => void;
  }) => (
    <div data-testid="task-table">
      <div data-testid="selected-count">{selectedTaskIds?.size || 0}</div>
      <button
        data-testid="select-task-1"
        onClick={() => onSelectionChange?.("task-1")}
      >
        Select Task 1
      </button>
      <button
        data-testid="select-task-2"
        onClick={() => onSelectionChange?.("task-2")}
      >
        Select Task 2
      </button>
    </div>
  ),
}));

// Mock BulkUpdateToolbar component
jest.mock("@/components/bulk-due-date/bulk-update-toolbar", () => ({
  BulkUpdateToolbar: ({
    selectedCount,
    onUpdate,
    onCancel,
  }: {
    selectedCount: number;
    onUpdate: (date: Date) => void;
    onCancel: () => void;
  }) => (
    <div data-testid="bulk-toolbar">
      <span data-testid="toolbar-count">{selectedCount}</span>
      <button
        data-testid="update-button"
        onClick={() => onUpdate(new Date("2025-12-31"))}
      >
        Update
      </button>
      <button data-testid="cancel-button" onClick={onCancel}>
        Cancel
      </button>
    </div>
  ),
}));

describe("TaskTableWithSelection", () => {
  const mockUser = { id: "user-1", name: "Test User", email: "test@example.com" };
  const mockSearchParams = {};
  const mockCompanyId = "company-1";

  const mockRouter = {
    push: jest.fn(),
    refresh: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    const { useRouter } = require("next/navigation");
    useRouter.mockReturnValue(mockRouter);
  });

  it("should render table without toolbar when no tasks are selected", () => {
    render(
      <TaskTableWithSelection
        user={mockUser as any}
        searchParams={mockSearchParams}
        companyId={mockCompanyId}
      />
    );

    expect(screen.getByTestId("task-table")).toBeInTheDocument();
    expect(screen.queryByTestId("bulk-toolbar")).not.toBeInTheDocument();
  });

  it("should show toolbar when tasks are selected", async () => {
    render(
      <TaskTableWithSelection
        user={mockUser as any}
        searchParams={mockSearchParams}
        companyId={mockCompanyId}
      />
    );

    // Select task 1
    const selectButton = screen.getByTestId("select-task-1");
    fireEvent.click(selectButton);

    await waitFor(() => {
      expect(screen.getByTestId("bulk-toolbar")).toBeInTheDocument();
      expect(screen.getByTestId("toolbar-count")).toHaveTextContent("1");
    });
  });

  it("should track multiple selected tasks", async () => {
    render(
      <TaskTableWithSelection
        user={mockUser as any}
        searchParams={mockSearchParams}
        companyId={mockCompanyId}
      />
    );

    // Select task 1
    fireEvent.click(screen.getByTestId("select-task-1"));

    // Select task 2
    fireEvent.click(screen.getByTestId("select-task-2"));

    await waitFor(() => {
      expect(screen.getByTestId("toolbar-count")).toHaveTextContent("2");
    });
  });

  it("should deselect task when clicked again", async () => {
    render(
      <TaskTableWithSelection
        user={mockUser as any}
        searchParams={mockSearchParams}
        companyId={mockCompanyId}
      />
    );

    // Select task 1
    const selectButton = screen.getByTestId("select-task-1");
    fireEvent.click(selectButton);

    await waitFor(() => {
      expect(screen.getByTestId("toolbar-count")).toHaveTextContent("1");
    });

    // Deselect task 1
    fireEvent.click(selectButton);

    await waitFor(() => {
      expect(screen.queryByTestId("bulk-toolbar")).not.toBeInTheDocument();
    });
  });

  it("should clear selection when cancel button is clicked", async () => {
    render(
      <TaskTableWithSelection
        user={mockUser as any}
        searchParams={mockSearchParams}
        companyId={mockCompanyId}
      />
    );

    // Select task 1
    fireEvent.click(screen.getByTestId("select-task-1"));

    await waitFor(() => {
      expect(screen.getByTestId("bulk-toolbar")).toBeInTheDocument();
    });

    // Click cancel
    fireEvent.click(screen.getByTestId("cancel-button"));

    await waitFor(() => {
      expect(screen.queryByTestId("bulk-toolbar")).not.toBeInTheDocument();
    });
  });

  it("should trigger bulk update and refresh on successful update", async () => {
    const { bulkUpdateDueDates } = require("@/actions/tasks/bulk-update-due-dates");
    const { toast } = require("sonner");

    bulkUpdateDueDates.mockResolvedValue({
      success: true,
      message: "Successfully updated 1 task(s) with new due date",
      updatedCount: 1,
    });

    render(
      <TaskTableWithSelection
        user={mockUser as any}
        searchParams={mockSearchParams}
        companyId={mockCompanyId}
      />
    );

    // Select task 1
    fireEvent.click(screen.getByTestId("select-task-1"));

    await waitFor(() => {
      expect(screen.getByTestId("bulk-toolbar")).toBeInTheDocument();
    });

    // Click update button
    fireEvent.click(screen.getByTestId("update-button"));

    await waitFor(() => {
      expect(bulkUpdateDueDates).toHaveBeenCalledWith({
        taskIds: ["task-1"],
        newDueDate: expect.any(Date),
        companyId: mockCompanyId,
      });
      expect(toast.success).toHaveBeenCalledWith(
        "Successfully updated 1 task(s) with new due date"
      );
      expect(mockRouter.refresh).toHaveBeenCalled();
    });
  });

  it("should show error toast on failed bulk update", async () => {
    const { bulkUpdateDueDates } = require("@/actions/tasks/bulk-update-due-dates");
    const { toast } = require("sonner");

    bulkUpdateDueDates.mockResolvedValue({
      success: false,
      error: "Permission denied",
    });

    render(
      <TaskTableWithSelection
        user={mockUser as any}
        searchParams={mockSearchParams}
        companyId={mockCompanyId}
      />
    );

    // Select task 1
    fireEvent.click(screen.getByTestId("select-task-1"));

    await waitFor(() => {
      expect(screen.getByTestId("bulk-toolbar")).toBeInTheDocument();
    });

    // Click update button
    fireEvent.click(screen.getByTestId("update-button"));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Failed to update task due dates: Permission denied"
      );
      expect(mockRouter.refresh).not.toHaveBeenCalled();
    });
  });
});
