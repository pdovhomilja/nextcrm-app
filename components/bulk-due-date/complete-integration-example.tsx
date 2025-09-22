"use client";

/**
 * Complete integration example showing the bulk due date update feature
 * Demonstrates how all components work together in a real board context
 */

import * as React from "react";
import { BulkDueDateButton } from "@/app/(app)/[cid]/tasks/[boardId]/_components/bulk-due-date-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, CheckIcon, UsersIcon, ClockIcon } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import type { Board } from "@/app/(app)/[cid]/tasks/_types";

interface CompleteIntegrationExampleProps {
  userId?: string;
}

export function CompleteIntegrationExample({
  userId = "demo-user-id",
}: CompleteIntegrationExampleProps) {

  // Example board data
  const exampleBoard: Board = {
    id: "demo-board-id",
    name: "Q1 2025 Product Launch",
    description: "Complete product launch for Q1 2025 with all deliverables",
    createdBy: userId,
    access: [userId, "team-member-1", "team-member-2"],
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-15"),
  };

  // Example tasks that would be in this board
  const exampleTasks = [
    {
      id: "task-1",
      title: "Design System Setup",
      status: "IN_PROGRESS",
      dueDate: "Jan 20, 2025",
      assignee: "Designer",
    },
    {
      id: "task-2",
      title: "API Development",
      status: "NEW",
      dueDate: "Jan 25, 2025", // +5 days from reference
      assignee: "Backend Dev",
    },
    {
      id: "task-3",
      title: "Frontend Implementation",
      status: "NEW",
      dueDate: "Feb 1, 2025", // +12 days from reference
      assignee: "Frontend Dev",
    },
    {
      id: "task-4",
      title: "QA Testing",
      status: "NEW",
      dueDate: "Feb 5, 2025", // +16 days from reference
      assignee: "QA Engineer",
    },
    {
      id: "completed-task",
      title: "Requirements Gathering",
      status: "COMPLETED",
      dueDate: "Jan 10, 2025",
      assignee: "Product Manager",
    },
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="space-y-2">
        <h2 className="text-3xl font-bold">Complete Bulk Due Date Update Integration</h2>
        <p className="text-muted-foreground">
          Full demonstration of the bulk due date update feature integrated into a board interface
        </p>
      </div>

      {/* Simulated Board Header */}
      <Card className="border-2 border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Board Header Integration
                <Badge variant="secondary">Live Demo</Badge>
              </CardTitle>
              <CardDescription>
                This shows how the button appears in the actual board header
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg p-4 bg-background">
            <div className="flex items-center justify-between">
              <h1 className="text-lg font-semibold">{exampleBoard.name}</h1>
              <div className="flex items-center gap-2">
                <BulkDueDateButton board={exampleBoard} />
                <Badge variant="outline" className="text-xs">
                  Board Actions
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Board Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UsersIcon className="h-5 w-5" />
              Board Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="font-medium">Board ID:</span>
                <code className="text-xs">{exampleBoard.id}</code>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Created By:</span>
                <span>{exampleBoard.createdBy === userId ? "You" : "Other User"}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Access Users:</span>
                <Badge variant="secondary">{exampleBoard.access.length} users</Badge>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Your Permission:</span>
                <Badge variant="default" className="text-xs">
                  ✓ Can Update Due Dates
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClockIcon className="h-5 w-5" />
              Task Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>Total Tasks:</span>
                <Badge variant="secondary">{exampleTasks.length}</Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span>Active Tasks:</span>
                <Badge variant="default">
                  {exampleTasks.filter(t => !["COMPLETED", "CANCELLED"].includes(t.status)).length}
                </Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span>Completed Tasks:</span>
                <Badge variant="outline">
                  {exampleTasks.filter(t => t.status === "COMPLETED").length}
                </Badge>
              </div>
            </div>

            <Separator />

            <div className="text-xs text-muted-foreground">
              <strong>Note:</strong> Only active tasks will be updated.
              Completed and cancelled tasks remain unchanged.
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Task List Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Example Tasks in Board</CardTitle>
          <CardDescription>
            Shows how the bulk update would affect these tasks with relative date preservation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {exampleTasks.map((task) => (
              <div
                key={task.id}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  ["COMPLETED", "CANCELLED"].includes(task.status)
                    ? "bg-muted/50 opacity-60"
                    : "bg-background"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{task.title}</span>
                    <Badge
                      variant={task.status === "COMPLETED" ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {task.status.replace("_", " ")}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Assigned to: {task.assignee}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                  <span>{task.dueDate}</span>
                  {["COMPLETED", "CANCELLED"].includes(task.status) && (
                    <Badge variant="outline" className="text-xs">
                      Won&apos;t Update
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
            <div className="flex items-start gap-2">
              <CheckIcon className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
              <div className="text-sm">
                <div className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                  Bulk Update Example
                </div>
                <div className="text-blue-700 dark:text-blue-300 text-xs space-y-1">
                  <div>
                    <strong>If you select &ldquo;Design System Setup&rdquo; as reference and change its due date to Jan 25:</strong>
                  </div>
                  <ul className="ml-4 space-y-0.5">
                    <li>• Design System Setup: Jan 25 (new date)</li>
                    <li>• API Development: Jan 30 (still +5 days from reference)</li>
                    <li>• Frontend Implementation: Feb 6 (still +12 days from reference)</li>
                    <li>• QA Testing: Feb 10 (still +16 days from reference)</li>
                    <li>• Requirements Gathering: <em>unchanged</em> (completed task)</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feature Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Integration Complete ✨</CardTitle>
          <CardDescription>
            The bulk due date update feature is now fully integrated
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="space-y-1">
              <CheckIcon className="h-8 w-8 text-green-500 mx-auto" />
              <div className="text-sm font-medium">Server Action</div>
              <div className="text-xs text-muted-foreground">Backend logic complete</div>
            </div>
            <div className="space-y-1">
              <CheckIcon className="h-8 w-8 text-green-500 mx-auto" />
              <div className="text-sm font-medium">UI Components</div>
              <div className="text-xs text-muted-foreground">All dialogs ready</div>
            </div>
            <div className="space-y-1">
              <CheckIcon className="h-8 w-8 text-green-500 mx-auto" />
              <div className="text-sm font-medium">Board Integration</div>
              <div className="text-xs text-muted-foreground">Header button added</div>
            </div>
            <div className="space-y-1">
              <CheckIcon className="h-8 w-8 text-green-500 mx-auto" />
              <div className="text-sm font-medium">Permissions</div>
              <div className="text-xs text-muted-foreground">Access control ready</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default CompleteIntegrationExample;