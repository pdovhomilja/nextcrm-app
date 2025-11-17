import { render, screen, waitFor } from "@testing-library/react";
import { describe, test, expect, jest } from "@jest/globals";
import userEvent from "@testing-library/user-event";
import { BulkUpdateToolbar } from "../bulk-update-toolbar";

// Mock the DatePickerInput component
jest.mock("../date-picker-input", () => ({
  DatePickerInput: ({ value, onChange, disabled }: { value?: Date | null; onChange?: (date: Date | undefined) => void; disabled?: boolean }) => (
    <div data-testid="date-picker-input">
      <button
        data-testid="date-picker-trigger"
        disabled={disabled}
        onClick={() => onChange?.(new Date("2025-12-31"))}
      >
        {value ? value.toLocaleDateString() : "Select date"}
      </button>
    </div>
  ),
}));

describe("BulkUpdateToolbar", () => {
  const mockOnUpdate = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Toolbar Visibility and Layout", () => {
    test("should render toolbar with selected count badge", () => {
      render(
        <BulkUpdateToolbar
          selectedCount={5}
          onUpdate={mockOnUpdate}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText("5 tasks selected")).toBeInTheDocument();
    });

    test("should render with singular task text when count is 1", () => {
      render(
        <BulkUpdateToolbar
          selectedCount={1}
          onUpdate={mockOnUpdate}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText("1 task selected")).toBeInTheDocument();
    });

    test("should render date picker component", () => {
      render(
        <BulkUpdateToolbar
          selectedCount={3}
          onUpdate={mockOnUpdate}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByTestId("date-picker-input")).toBeInTheDocument();
    });

    test("should render Update Due Dates button", () => {
      render(
        <BulkUpdateToolbar
          selectedCount={3}
          onUpdate={mockOnUpdate}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByRole("button", { name: /update due dates/i })).toBeInTheDocument();
    });

    test("should render Cancel button", () => {
      render(
        <BulkUpdateToolbar
          selectedCount={3}
          onUpdate={mockOnUpdate}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
    });
  });

  describe("Date Picker Interaction", () => {
    test("should allow date selection via date picker", async () => {
      const user = userEvent.setup();
      render(
        <BulkUpdateToolbar
          selectedCount={3}
          onUpdate={mockOnUpdate}
          onCancel={mockOnCancel}
        />
      );

      const datePickerTrigger = screen.getByTestId("date-picker-trigger");
      await user.click(datePickerTrigger);

      // Date picker mock automatically sets date to 2025-12-31
      const updateButton = screen.getByRole("button", { name: /update due dates/i });
      await user.click(updateButton);

      expect(mockOnUpdate).toHaveBeenCalledWith(new Date("2025-12-31"));
    });

    test("should disable Update button when no date is selected", () => {
      render(
        <BulkUpdateToolbar
          selectedCount={3}
          onUpdate={mockOnUpdate}
          onCancel={mockOnCancel}
        />
      );

      const updateButton = screen.getByRole("button", { name: /update due dates/i });
      expect(updateButton).toBeDisabled();
    });
  });

  describe("Button Actions", () => {
    test("should call onCancel when Cancel button is clicked", async () => {
      const user = userEvent.setup();
      render(
        <BulkUpdateToolbar
          selectedCount={3}
          onUpdate={mockOnUpdate}
          onCancel={mockOnCancel}
        />
      );

      const cancelButton = screen.getByRole("button", { name: /cancel/i });
      await user.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalledTimes(1);
      expect(mockOnUpdate).not.toHaveBeenCalled();
    });
  });

  describe("Loading State", () => {
    test("should disable buttons during loading state", async () => {
      const user = userEvent.setup();
      const slowUpdate = jest.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      render(
        <BulkUpdateToolbar
          selectedCount={3}
          onUpdate={slowUpdate}
          onCancel={mockOnCancel}
        />
      );

      // Select a date first
      const datePickerTrigger = screen.getByTestId("date-picker-trigger");
      await user.click(datePickerTrigger);

      // Click update button
      const updateButton = screen.getByRole("button", { name: /update due dates/i });
      await user.click(updateButton);

      // Button should be disabled during loading
      await waitFor(() => {
        expect(updateButton).toBeDisabled();
      });

      const cancelButton = screen.getByRole("button", { name: /cancel/i });
      expect(cancelButton).toBeDisabled();
    });

    test("should show loading indicator on Update button during operation", async () => {
      const user = userEvent.setup();
      const slowUpdate = jest.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      render(
        <BulkUpdateToolbar
          selectedCount={3}
          onUpdate={slowUpdate}
          onCancel={mockOnCancel}
        />
      );

      // Select a date first
      const datePickerTrigger = screen.getByTestId("date-picker-trigger");
      await user.click(datePickerTrigger);

      // Click update button
      const updateButton = screen.getByRole("button", { name: /update due dates/i });
      await user.click(updateButton);

      // Loading indicator should be visible
      await waitFor(() => {
        const loadingIndicator = screen.getByTestId("loading-spinner");
        expect(loadingIndicator).toBeInTheDocument();
      });
    });

    test("should prevent date picker interaction during loading", async () => {
      const user = userEvent.setup();
      const slowUpdate = jest.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      render(
        <BulkUpdateToolbar
          selectedCount={3}
          onUpdate={slowUpdate}
          onCancel={mockOnCancel}
        />
      );

      // Select a date first
      const datePickerTrigger = screen.getByTestId("date-picker-trigger");
      await user.click(datePickerTrigger);

      // Click update button
      const updateButton = screen.getByRole("button", { name: /update due dates/i });
      await user.click(updateButton);

      // Date picker should be disabled during loading
      await waitFor(() => {
        expect(datePickerTrigger).toBeDisabled();
      });
    });
  });
});
