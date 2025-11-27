"use client";

import * as React from "react";
import { useState, useMemo } from "react";
import { format, isValid } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { validateTaskDate } from "@/lib/utils/date-calculations";

interface DatePickerInputProps {
  value?: Date | null;
  onChange?: (date: Date | undefined) => void;
  disabled?: boolean;
  error?: string;
  label?: string;
  placeholder?: string;
  className?: string;
  minDate?: Date;
  maxDate?: Date;
}

export function DatePickerInput({
  value,
  onChange,
  disabled = false,
  error,
  label = "Date",
  placeholder = "Select date",
  className,
  minDate,
  maxDate,
}: DatePickerInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectionError, setSelectionError] = useState<string | null>(null);

  // Format the date for display
  const formattedDate = useMemo(() => {
    if (!value || !isValid(value)) {
      return null;
    }

    try {
      return format(value, "MMM d, yyyy");
    } catch {
      return null;
    }
  }, [value]);

  // Derive validation error from value (no useEffect needed)
  const validationError = useMemo(() => {
    if (!value) {
      return null;
    }
    const validation = validateTaskDate(value);
    return validation.isValid ? null : validation.error || null;
  }, [value]);

  // Combined internal error (validation takes precedence over selection error)
  const internalError = validationError || selectionError;

  // Handle date selection
  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (!selectedDate) {
      onChange?.(undefined);
      setSelectionError(null);
      setIsOpen(false);
      return;
    }

    // Additional validation against min/max dates
    if (minDate && selectedDate < minDate) {
      setSelectionError("Date cannot be earlier than the minimum allowed date");
      return;
    }

    if (maxDate && selectedDate > maxDate) {
      setSelectionError("Date cannot be later than the maximum allowed date");
      return;
    }

    setSelectionError(null);
    onChange?.(selectedDate);
    setIsOpen(false);
  };

  // Determine which error to show (prop error takes precedence)
  const displayError = error || internalError;

  // Generate unique IDs for accessibility
  const triggerId = React.useId();
  const errorId = React.useId();

  return (
    <div className={cn("space-y-2", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            id={triggerId}
            variant="outline"
            disabled={disabled}
            className={cn(
              "w-full justify-start text-left font-normal",
              !formattedDate && "text-muted-foreground",
              displayError && "border-destructive focus-visible:ring-destructive/20"
            )}
            aria-label={`Open calendar to select ${label.toLowerCase()}`}
            aria-describedby={displayError ? errorId : undefined}
            aria-expanded={isOpen}
            aria-haspopup="dialog"
          >
            <CalendarIcon
              className="mr-2 h-4 w-4 shrink-0"
              data-testid="calendar-icon"
              aria-hidden="true"
            />
            {formattedDate || (
              <span className="truncate">{placeholder}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto p-0"
          align="start"
          role="dialog"
          aria-label={`Calendar for selecting ${label.toLowerCase()}`}
        >
          <Calendar
            mode="single"
            selected={value || undefined}
            onSelect={handleDateSelect}
            disabled={(date) => {
              if (disabled) return true;
              if (minDate && date < minDate) return true;
              if (maxDate && date > maxDate) return true;
              return false;
            }}
            initialFocus
            captionLayout="dropdown"
            fromYear={minDate?.getFullYear() || new Date().getFullYear() - 1}
            toYear={maxDate?.getFullYear() || new Date().getFullYear() + 10}
          />
        </PopoverContent>
      </Popover>

      {/* Error message */}
      {displayError && (
        <div
          id={errorId}
          className="flex items-center text-sm text-destructive"
          role="alert"
          aria-live="polite"
        >
          <span>{displayError}</span>
        </div>
      )}
    </div>
  );
}

// Enhanced version with additional features for bulk due date updates
interface BulkDatePickerInputProps extends DatePickerInputProps {
  referenceDate?: Date | null;
  showDateDifference?: boolean;
}

export function BulkDatePickerInput({
  referenceDate,
  showDateDifference = false,
  ...props
}: BulkDatePickerInputProps) {
  // Calculate date difference for display
  const dateDifference = useMemo(() => {
    if (!showDateDifference || !props.value || !referenceDate || !isValid(props.value) || !isValid(referenceDate)) {
      return null;
    }

    const diffMs = props.value.getTime() - referenceDate.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return "Same day";
    } else if (diffDays > 0) {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''} later`;
    } else {
      return `${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''} earlier`;
    }
  }, [props.value, referenceDate, showDateDifference]);

  return (
    <div className="space-y-2">
      <DatePickerInput {...props} />

      {/* Date difference indicator */}
      {dateDifference && (
        <div className="text-xs text-muted-foreground flex items-center gap-1">
          <CalendarIcon className="h-3 w-3" />
          <span>
            {dateDifference}
            {referenceDate && (
              <> from reference ({format(referenceDate, "MMM d")})</>
            )}
          </span>
        </div>
      )}
    </div>
  );
}

export default DatePickerInput;