"use client";

/**
 * Example usage of BulkDueDateDialog component
 * Demonstrates complete integration with board context
 */

import * as React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarIcon, CheckIcon } from "lucide-react";
import { BulkDueDateDialog } from "./bulk-due-date-dialog";

interface BulkDueDateDialogExampleProps {
  boardId?: string;
  boardName?: string;
}

export function BulkDueDateDialogExample({
  boardId = "example-board-id",
  boardName = "Example Project Board",
}: BulkDueDateDialogExampleProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleOpenDialog = () => {
    setIsDialogOpen(true);
  };


  return (
    <div className="space-y-6 max-w-2xl">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Bulk Due Date Update Dialog</h2>
        <p className="text-muted-foreground">
          Complete dialog implementation for updating due dates of all active tasks in a board
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Board Actions
          </CardTitle>
          <CardDescription>
            Board: <strong>{boardName}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div>
              <h4 className="font-medium">Bulk Due Date Update</h4>
              <p className="text-sm text-muted-foreground">
                Update due dates for all active tasks while preserving relative time differences
              </p>
            </div>
            <Button onClick={handleOpenDialog} className="gap-2">
              <CalendarIcon className="h-4 w-4" />
              Update Due Dates
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Feature Overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3 text-sm">
            <div>
              <h4 className="font-medium mb-2">How it works:</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Select any active task as a reference point</li>
                <li>• Choose a new due date for that reference task</li>
                <li>• All other active tasks shift by the same amount</li>
                <li>• Relative time differences are preserved</li>
                <li>• COMPLETED and CANCELLED tasks are not affected</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium mb-2">Example:</h4>
              <div className="bg-muted/50 p-3 rounded-md text-xs space-y-2">
                <div>
                  <strong>Before:</strong>
                  <div className="ml-2 space-y-1">
                    <div>Task A: Due Jan 15 (reference)</div>
                    <div>Task B: Due Jan 17 (+2 days)</div>
                    <div>Task C: Due Jan 20 (+5 days)</div>
                  </div>
                </div>
                <div>
                  <strong>After moving Task A to Jan 20 (+5 days):</strong>
                  <div className="ml-2 space-y-1">
                    <div>Task A: Due Jan 20 (reference)</div>
                    <div>Task B: Due Jan 22 (still +2 days)</div>
                    <div>Task C: Due Jan 25 (still +5 days)</div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Features:</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1">
                  <CheckIcon className="h-3 w-3 text-green-500" />
                  Reference task selection
                </div>
                <div className="flex items-center gap-1">
                  <CheckIcon className="h-3 w-3 text-green-500" />
                  Date validation
                </div>
                <div className="flex items-center gap-1">
                  <CheckIcon className="h-3 w-3 text-green-500" />
                  Confirmation dialog
                </div>
                <div className="flex items-center gap-1">
                  <CheckIcon className="h-3 w-3 text-green-500" />
                  Task history logging
                </div>
                <div className="flex items-center gap-1">
                  <CheckIcon className="h-3 w-3 text-green-500" />
                  Loading states
                </div>
                <div className="flex items-center gap-1">
                  <CheckIcon className="h-3 w-3 text-green-500" />
                  Error handling
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* The actual dialog component */}
      <BulkDueDateDialog
        boardId={boardId}
        boardName={boardName}
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
      />
    </div>
  );
}

export default BulkDueDateDialogExample;