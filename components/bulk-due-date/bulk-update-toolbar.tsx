"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DatePickerInput } from "./date-picker-input";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface BulkUpdateToolbarProps {
  selectedCount: number;
  onUpdate: (date: Date) => void | Promise<void>;
  onCancel: () => void;
  className?: string;
}

export function BulkUpdateToolbar({
  selectedCount,
  onUpdate,
  onCancel,
  className,
}: BulkUpdateToolbarProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleUpdate = async () => {
    if (!selectedDate) return;

    setIsLoading(true);
    try {
      await onUpdate(selectedDate);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (isLoading) return;
    onCancel();
  };

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 p-4 bg-background/95 backdrop-blur-sm border-t",
        className
      )}
    >
      <Card className="max-w-4xl mx-auto shadow-lg">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            {/* Selected count badge */}
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-sm">
                {selectedCount} {selectedCount === 1 ? "task" : "tasks"} selected
              </Badge>
            </div>

            {/* Date picker */}
            <div className="flex-1 sm:max-w-xs">
              <DatePickerInput
                value={selectedDate}
                onChange={(date) => setSelectedDate(date || null)}
                disabled={isLoading}
                placeholder="Select new due date"
                label="Due Date"
              />
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 flex-wrap sm:flex-nowrap">
              <Button
                onClick={handleUpdate}
                disabled={!selectedDate || isLoading}
                className="flex-1 sm:flex-initial"
              >
                {isLoading ? (
                  <>
                    <Loader2
                      className="mr-2 h-4 w-4 animate-spin"
                      data-testid="loading-spinner"
                      aria-hidden="true"
                    />
                    Updating...
                  </>
                ) : (
                  "Update Due Dates"
                )}
              </Button>
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={isLoading}
                className="flex-1 sm:flex-initial"
              >
                Cancel
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
