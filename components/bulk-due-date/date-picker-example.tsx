"use client";

/**
 * Example usage of DatePickerInput components
 * Demonstrates both basic and enhanced bulk date picker functionality
 */

import * as React from "react";
import { useState } from "react";
import { DatePickerInput, BulkDatePickerInput } from "./date-picker-input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export function DatePickerExample() {
  const [basicDate, setBasicDate] = useState<Date | undefined>();
  const [bulkDate, setBulkDate] = useState<Date | undefined>();
  const [referenceDate] = useState<Date>(new Date("2025-01-15T10:00:00Z"));
  const [isProcessing, setIsProcessing] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Validate dates and set errors
  const validateDate = (date: Date | undefined, fieldName: string) => {
    if (!date) {
      setErrors(prev => ({ ...prev, [fieldName]: "" }));
      return true;
    }

    // Check if date is too far in the past
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    if (date < oneYearAgo) {
      setErrors(prev => ({
        ...prev,
        [fieldName]: "Date cannot be more than 1 year in the past"
      }));
      return false;
    }

    // Check if date is too far in the future
    const tenYearsFromNow = new Date();
    tenYearsFromNow.setFullYear(tenYearsFromNow.getFullYear() + 10);

    if (date > tenYearsFromNow) {
      setErrors(prev => ({
        ...prev,
        [fieldName]: "Date cannot be more than 10 years in the future"
      }));
      return false;
    }

    setErrors(prev => ({ ...prev, [fieldName]: "" }));
    return true;
  };

  const handleBasicDateChange = (date: Date | undefined) => {
    setBasicDate(date);
    validateDate(date, "basic");
  };

  const handleBulkDateChange = (date: Date | undefined) => {
    setBulkDate(date);
    validateDate(date, "bulk");
  };

  const handleSubmit = async () => {
    setIsProcessing(true);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));

    setIsProcessing(false);
    console.log("Submitted dates:", { basicDate, bulkDate });
  };

  const handleReset = () => {
    setBasicDate(undefined);
    setBulkDate(undefined);
    setErrors({});
  };

  // Calculate some example constraints
  const minDate = new Date();
  minDate.setDate(minDate.getDate() - 30); // 30 days ago

  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() + 2); // 2 years from now

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Date Picker Examples</h2>
        <p className="text-muted-foreground">
          Demonstrates different date picker configurations for bulk due date updates
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Basic Date Picker</CardTitle>
          <CardDescription>
            Standard date selection with validation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Select Due Date
            </label>
            <div className="mt-2">
              <DatePickerInput
                value={basicDate}
                onChange={handleBasicDateChange}
                disabled={isProcessing}
                error={errors.basic}
                label="Due Date"
                placeholder="Choose a date"
                minDate={minDate}
                maxDate={maxDate}
              />
            </div>
          </div>

          {basicDate && (
            <div className="text-sm text-muted-foreground">
              <strong>Selected:</strong> {basicDate.toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric"
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bulk Date Picker with Reference</CardTitle>
          <CardDescription>
            Enhanced date picker showing difference from reference date
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium">Reference Date:</span>
            <Badge variant="secondary">
              {referenceDate.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric"
              })}
            </Badge>
          </div>

          <Separator />

          <div>
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              New Due Date for Reference Task
            </label>
            <div className="mt-2">
              <BulkDatePickerInput
                value={bulkDate}
                onChange={handleBulkDateChange}
                disabled={isProcessing}
                error={errors.bulk}
                label="Reference Task Due Date"
                placeholder="Select new date for reference task"
                referenceDate={referenceDate}
                showDateDifference={true}
                minDate={minDate}
                maxDate={maxDate}
              />
            </div>
          </div>

          {bulkDate && (
            <div className="space-y-2 text-sm">
              <div className="text-muted-foreground">
                <strong>New Date:</strong> {bulkDate.toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric"
                })}
              </div>

              <div className="p-3 bg-muted rounded-md">
                <div className="font-medium mb-1">Bulk Update Preview:</div>
                <div className="text-xs text-muted-foreground">
                  All active tasks will shift by the same amount relative to the reference task.
                  If the reference task moves forward by 5 days, all other tasks will also move forward by 5 days.
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Date Validation Examples</CardTitle>
          <CardDescription>
            Shows validation states and error handling
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Too Far in Past</label>
              <div className="mt-2">
                <DatePickerInput
                  value={undefined}
                  onChange={() => {}}
                  disabled={false}
                  error="Due date cannot be more than 1 year in the past"
                  placeholder="Example error state"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Too Far in Future</label>
              <div className="mt-2">
                <DatePickerInput
                  value={undefined}
                  onChange={() => {}}
                  disabled={false}
                  error="Due date cannot be more than 10 years in the future"
                  placeholder="Another error state"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button
              onClick={handleSubmit}
              disabled={isProcessing || (!basicDate && !bulkDate)}
            >
              {isProcessing ? "Processing..." : "Apply Changes"}
            </Button>
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={isProcessing}
            >
              Reset All
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default DatePickerExample;