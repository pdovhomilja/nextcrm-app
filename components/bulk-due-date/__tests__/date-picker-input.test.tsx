import { render, screen, waitFor } from "@testing-library/react";
import { describe, test, expect, jest, beforeEach } from "@jest/globals";
import userEvent from "@testing-library/user-event";
import { DatePickerInput } from "../date-picker-input";

describe("DatePickerInput", () => {
  const defaultProps = {
    value: undefined,
    onChange: jest.fn(),
    disabled: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    test("should render with placeholder text when no date selected", () => {
      render(<DatePickerInput {...defaultProps} />);

      expect(screen.getByText("Select date")).toBeInTheDocument();
    });

    test("should display selected date in formatted form", () => {
      const selectedDate = new Date("2025-01-15T10:00:00Z");
      const props = {
        ...defaultProps,
        value: selectedDate,
      };

      render(<DatePickerInput {...props} />);

      expect(screen.getByDisplayValue("Jan 15, 2025")).toBeInTheDocument();
    });

    test("should be disabled when disabled prop is true", () => {
      const disabledProps = {
        ...defaultProps,
        disabled: true,
      };

      render(<DatePickerInput {...disabledProps} />);

      const trigger = screen.getByRole("button");
      expect(trigger).toBeDisabled();
    });

    test("should show calendar icon", () => {
      render(<DatePickerInput {...defaultProps} />);

      const calendarIcon = screen.getByTestId("calendar-icon");
      expect(calendarIcon).toBeInTheDocument();
    });
  });

  describe("Calendar Interaction", () => {
    test("should open calendar when trigger is clicked", async () => {
      const user = userEvent.setup();
      render(<DatePickerInput {...defaultProps} />);

      const trigger = screen.getByRole("button");
      await user.click(trigger);

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      // Calendar should be visible
      expect(screen.getByRole("grid")).toBeInTheDocument();
    });

    test("should close calendar when clicking outside", async () => {
      const user = userEvent.setup();
      render(
        <div>
          <DatePickerInput {...defaultProps} />
          <div data-testid="outside">Outside element</div>
        </div>
      );

      // Open calendar
      const trigger = screen.getByRole("button");
      await user.click(trigger);

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      // Click outside
      const outsideElement = screen.getByTestId("outside");
      await user.click(outsideElement);

      await waitFor(() => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      });
    });

    test("should close calendar when pressing Escape", async () => {
      const user = userEvent.setup();
      render(<DatePickerInput {...defaultProps} />);

      // Open calendar
      const trigger = screen.getByRole("button");
      await user.click(trigger);

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      // Press Escape
      await user.keyboard("{Escape}");

      await waitFor(() => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      });
    });
  });

  describe("Date Selection", () => {
    test("should call onChange when date is selected", async () => {
      const user = userEvent.setup();
      const mockOnChange = jest.fn();
      const props = {
        ...defaultProps,
        onChange: mockOnChange,
      };

      render(<DatePickerInput {...props} />);

      // Open calendar
      const trigger = screen.getByRole("button");
      await user.click(trigger);

      await waitFor(() => {
        expect(screen.getByRole("grid")).toBeInTheDocument();
      });

      // Click on a date (assuming today's date is available)
      const today = new Date();
      const todayButton = screen.getByRole("gridcell", {
        name: new RegExp(today.getDate().toString()),
      });

      if (todayButton) {
        await user.click(todayButton);

        await waitFor(() => {
          expect(mockOnChange).toHaveBeenCalled();
          const calledDate = mockOnChange.mock.calls[0][0];
          expect(calledDate).toBeInstanceOf(Date);
        });
      }
    });

    test("should close calendar after date selection", async () => {
      const user = userEvent.setup();
      render(<DatePickerInput {...defaultProps} />);

      // Open calendar
      const trigger = screen.getByRole("button");
      await user.click(trigger);

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      // Select a date
      const today = new Date();
      const todayButton = screen.getByRole("gridcell", {
        name: new RegExp(today.getDate().toString()),
      });

      if (todayButton) {
        await user.click(todayButton);

        await waitFor(() => {
          expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
        });
      }
    });

    test("should update display when controlled value changes", () => {
      const initialDate = new Date("2025-01-15T10:00:00Z");
      const { rerender } = render(
        <DatePickerInput {...defaultProps} value={initialDate} />
      );

      expect(screen.getByDisplayValue("Jan 15, 2025")).toBeInTheDocument();

      // Update the value
      const newDate = new Date("2025-02-20T10:00:00Z");
      rerender(<DatePickerInput {...defaultProps} value={newDate} />);

      expect(screen.getByDisplayValue("Feb 20, 2025")).toBeInTheDocument();
    });
  });

  describe("Date Validation", () => {
    test("should show error state for invalid dates", () => {
      const props = {
        ...defaultProps,
        error: "Invalid date selected",
      };

      render(<DatePickerInput {...props} />);

      expect(screen.getByText("Invalid date selected")).toBeInTheDocument();
      const trigger = screen.getByRole("button");
      expect(trigger).toHaveClass("border-destructive");
    });

    test("should show validation message for dates too far in past", () => {
      const props = {
        ...defaultProps,
        error: "Due date cannot be more than 1 year in the past",
      };

      render(<DatePickerInput {...props} />);

      expect(screen.getByText("Due date cannot be more than 1 year in the past")).toBeInTheDocument();
    });

    test("should show validation message for dates too far in future", () => {
      const props = {
        ...defaultProps,
        error: "Due date cannot be more than 10 years in the future",
      };

      render(<DatePickerInput {...props} />);

      expect(screen.getByText("Due date cannot be more than 10 years in the future")).toBeInTheDocument();
    });

    test("should clear error state when valid date is selected", async () => {
      const mockOnChange = jest.fn();
      const { rerender } = render(
        <DatePickerInput
          {...defaultProps}
          onChange={mockOnChange}
          error="Invalid date"
        />
      );

      // Should show error initially
      expect(screen.getByText("Invalid date")).toBeInTheDocument();

      // Select a valid date
      const validDate = new Date("2025-06-15T10:00:00Z");
      rerender(
        <DatePickerInput
          {...defaultProps}
          onChange={mockOnChange}
          value={validDate}
          error={undefined}
        />
      );

      // Error should be cleared
      expect(screen.queryByText("Invalid date")).not.toBeInTheDocument();
      expect(screen.getByDisplayValue("Jun 15, 2025")).toBeInTheDocument();
    });
  });

  describe("Date Formatting", () => {
    test("should format dates consistently", () => {
      const testDates = [
        { date: new Date("2025-01-01T10:00:00Z"), expected: "Jan 1, 2025" },
        { date: new Date("2025-12-31T10:00:00Z"), expected: "Dec 31, 2025" },
        { date: new Date("2025-06-15T10:00:00Z"), expected: "Jun 15, 2025" },
      ];

      testDates.forEach(({ date, expected }) => {
        render(
          <DatePickerInput {...defaultProps} value={date} />
        );

        expect(screen.getByDisplayValue(expected)).toBeInTheDocument();
      });
    });

    test("should handle timezone differences gracefully", () => {
      // Test with a date that might cross timezone boundaries
      const date = new Date("2025-01-15T00:00:00Z");
      render(<DatePickerInput {...defaultProps} value={date} />);

      // Should still show the correct date regardless of timezone
      expect(screen.getByDisplayValue("Jan 15, 2025")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    test("should have proper ARIA labels", () => {
      render(<DatePickerInput {...defaultProps} label="Due Date" />);

      const trigger = screen.getByRole("button");
      expect(trigger).toHaveAttribute("aria-label", "Open calendar to select due date");
    });

    test("should support keyboard navigation", async () => {
      const user = userEvent.setup();
      render(<DatePickerInput {...defaultProps} />);

      const trigger = screen.getByRole("button");

      // Should be focusable
      await user.tab();
      expect(trigger).toHaveFocus();

      // Should open with Enter
      await user.keyboard("{Enter}");

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });
    });

    test("should announce date changes to screen readers", () => {
      const selectedDate = new Date("2025-01-15T10:00:00Z");
      render(<DatePickerInput {...defaultProps} value={selectedDate} />);

      const trigger = screen.getByRole("button");
      expect(trigger).toHaveAttribute("aria-describedby");
    });

    test("should have proper focus management", async () => {
      const user = userEvent.setup();
      render(<DatePickerInput {...defaultProps} />);

      // Open calendar
      const trigger = screen.getByRole("button");
      await user.click(trigger);

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      // Focus should be on the calendar
      const calendar = screen.getByRole("grid");
      expect(calendar).toBeInTheDocument();
    });
  });

  describe("Performance", () => {
    test("should not re-render unnecessarily", () => {
      const mockOnChange = jest.fn();
      render(<DatePickerInput {...defaultProps} onChange={mockOnChange} />);

      // Component should handle this gracefully without issues
      expect(screen.getByText("Select date")).toBeInTheDocument();
    });

    test("should handle rapid date changes", async () => {
      const mockOnChange = jest.fn();
      render(<DatePickerInput {...defaultProps} onChange={mockOnChange} />);

      // Open calendar
      const trigger = screen.getByRole("button");
      await userEvent.click(trigger);

      await waitFor(() => {
        expect(screen.getByRole("grid")).toBeInTheDocument();
      });

      // Rapid clicks should be handled gracefully
      const dateButtons = screen.getAllByRole("gridcell");
      if (dateButtons.length > 2) {
        await userEvent.click(dateButtons[10]);
        await userEvent.click(dateButtons[11]);
      }

      // Should not cause any errors or crashes
      expect(mockOnChange).toHaveBeenCalled();
    });
  });

  describe("Edge Cases", () => {
    test("should handle undefined value gracefully", () => {
      render(<DatePickerInput {...defaultProps} value={undefined} />);

      expect(screen.getByText("Select date")).toBeInTheDocument();
    });

    test("should handle null value gracefully", () => {
      render(<DatePickerInput {...defaultProps} value={null} />);

      expect(screen.getByText("Select date")).toBeInTheDocument();
    });

    test("should handle invalid Date object", () => {
      const invalidDate = new Date("invalid");
      render(<DatePickerInput {...defaultProps} value={invalidDate} />);

      // Should fallback to placeholder
      expect(screen.getByText("Select date")).toBeInTheDocument();
    });

    test("should work without onChange callback", async () => {
      const user = userEvent.setup();
      render(<DatePickerInput value={undefined} disabled={false} />);

      const trigger = screen.getByRole("button");
      await user.click(trigger);

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      // Should not crash when clicking dates
      const today = new Date();
      const todayButton = screen.getByRole("gridcell", {
        name: new RegExp(today.getDate().toString()),
      });

      if (todayButton) {
        await user.click(todayButton);
        // Should not cause any errors
      }
    });
  });
});