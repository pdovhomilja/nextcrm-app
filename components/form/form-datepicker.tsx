"use client";

import { forwardRef, useState } from "react";
import { useFormStatus } from "react-dom";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import { FormErrors } from "./form-errors";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Button } from "../ui/button";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "../ui/calendar";

interface FormDatePickerProps {
  id: string;
  label?: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  errors?: Record<string, string[] | undefined>;
  className?: string;
  defaultValue?: string;
  onBlur?: () => void;
}

export const FormDatePicker = forwardRef<HTMLInputElement, FormDatePickerProps>(
  (
    {
      id,
      label,
      type,
      placeholder,
      required,
      disabled,
      errors,
      className,
      defaultValue,
      onBlur,
    },
    ref
  ) => {
    const { pending } = useFormStatus();

    // Convert defaultValue to Date object
    const defaultDate = defaultValue ? new Date(defaultValue) : undefined;

    const [date, setDate] = useState<Date>(defaultDate || new Date());

    return (
      <div className="space-y-2">
        <div className="flex flex-col space-y-2">
          {label ? (
            <Label
              htmlFor={id}
              className="text-xs font-semibold text-neutral-700"
            >
              {label}
            </Label>
          ) : null}
          <Input
            onBlur={onBlur}
            defaultValue={defaultDate ? defaultDate.toISOString() : ""}
            ref={ref}
            required={required}
            value={date ? date.toISOString() : ""}
            name={id}
            id={id}
            placeholder={placeholder}
            type={type}
            disabled={pending || disabled}
            className={cn("text-sm px-2 py-1 h-7", className)}
            aria-describedby={`${id}-error`}
          />
          <Popover>
            <PopoverTrigger asChild>
              <Button
                disabled={pending || disabled}
                variant={"outline"}
                className={cn(
                  "w-[280px] justify-start text-left font-normal",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={defaultDate}
                onSelect={(date: Date | undefined) => date && setDate(date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
        <FormErrors id={id} errors={errors} />
      </div>
    );
  }
);

FormDatePicker.displayName = "FormDatePicker";
