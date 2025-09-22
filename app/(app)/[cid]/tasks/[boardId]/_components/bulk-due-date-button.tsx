"use client";

import * as React from "react";
import { useState, useMemo } from "react";
import { CalendarIcon } from "lucide-react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { BulkDueDateDialog } from "@/components/bulk-due-date/bulk-due-date-dialog";
import type { Board } from "../../_types";

interface BulkDueDateButtonProps {
  board: Board;
  className?: string;
}

/**
 * Button component that opens the bulk due date update dialog
 * Integrates with the board header and manages dialog state
 * Only visible to users with board access permissions
 */
export function BulkDueDateButton({ board, className }: BulkDueDateButtonProps) {
  const { data: session } = useSession();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Check if current user has permission to modify this board
  const hasPermission = useMemo(() => {
    if (!session?.user?.id) return false;

    const userId = session.user.id;
    return board.access.includes(userId) || board.createdBy === userId;
  }, [session?.user?.id, board.access, board.createdBy]);

  const handleOpenDialog = () => {
    setIsDialogOpen(true);
  };

  // Don't render button if user doesn't have permission
  if (!hasPermission) {
    return null;
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleOpenDialog}
        className={className}
        aria-label={`Update due dates for all active tasks in ${board.name}`}
      >
        <CalendarIcon className="h-4 w-4 mr-2" />
        Update Due Dates
      </Button>

      <BulkDueDateDialog
        boardId={board.id}
        boardName={board.name}
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
      />
    </>
  );
}

export default BulkDueDateButton;