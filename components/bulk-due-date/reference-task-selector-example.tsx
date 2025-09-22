"use client";

/**
 * Example usage of ReferenceTaskSelector component
 * This file demonstrates how to integrate the component with form state management
 */

import * as React from "react";
import { useState } from "react";
import { ReferenceTaskSelector } from "./reference-task-selector";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ReferenceTaskSelectorExampleProps {
  boardId: string;
}

export function ReferenceTaskSelectorExample({ boardId }: ReferenceTaskSelectorExampleProps) {
  const [selectedTaskId, setSelectedTaskId] = useState<string | undefined>();
  const [isFormDisabled, setIsFormDisabled] = useState(false);

  const handleTaskSelect = (taskId: string) => {
    setSelectedTaskId(taskId);
    console.log("Selected task:", taskId);
  };

  const handleSubmit = () => {
    if (!selectedTaskId) {
      alert("Please select a reference task");
      return;
    }

    setIsFormDisabled(true);
    console.log("Processing bulk update with reference task:", selectedTaskId);

    // Simulate API call
    setTimeout(() => {
      setIsFormDisabled(false);
      console.log("Bulk update completed");
    }, 2000);
  };

  const handleReset = () => {
    setSelectedTaskId(undefined);
  };

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>Reference Task Selector Example</CardTitle>
        <CardDescription>
          Select a task to use as reference for bulk due date updates
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            Reference Task
          </label>
          <div className="mt-2">
            <ReferenceTaskSelector
              boardId={boardId}
              selectedTaskId={selectedTaskId}
              onTaskSelect={handleTaskSelect}
              disabled={isFormDisabled}
              className="w-full"
            />
          </div>
          {selectedTaskId && (
            <p className="text-xs text-muted-foreground mt-2">
              Selected task ID: {selectedTaskId}
            </p>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleSubmit}
            disabled={!selectedTaskId || isFormDisabled}
          >
            {isFormDisabled ? "Processing..." : "Apply Bulk Update"}
          </Button>
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={isFormDisabled}
          >
            Reset
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default ReferenceTaskSelectorExample;