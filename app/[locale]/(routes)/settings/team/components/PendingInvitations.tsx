"use client";

import { useEffect, useState } from "react";
import { getInvitations, PendingInvitation } from "@/actions/organization/get-invitations";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2, X } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

export function PendingInvitations() {
  const [invitations, setInvitations] = useState<PendingInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadInvitations();
  }, []);

  const loadInvitations = async () => {
    try {
      setLoading(true);
      const data = await getInvitations();
      setInvitations(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load pending invitations",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    try {
      setCancelling(invitationId);
      const response = await fetch("/api/organization/invitations", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitationId }),
      });

      if (!response.ok) {
        throw new Error("Failed to cancel invitation");
      }

      setInvitations(invitations.filter((inv) => inv.id !== invitationId));
      toast({
        title: "Success",
        description: "Invitation cancelled",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to cancel invitation",
        variant: "destructive",
      });
    } finally {
      setCancelling(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (invitations.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No pending invitations</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Invited By</TableHead>
            <TableHead>Expires</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invitations.map((invitation) => (
            <TableRow key={invitation.id}>
              <TableCell className="font-medium">{invitation.email}</TableCell>
              <TableCell>
                <Badge variant="secondary" className="capitalize">
                  {invitation.role.toLowerCase()}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="text-sm">
                  <p className="font-medium">{invitation.invitedBy.name || "Unknown"}</p>
                  <p className="text-xs text-muted-foreground">
                    {invitation.invitedBy.email}
                  </p>
                </div>
              </TableCell>
              <TableCell className="text-sm">
                {formatDistanceToNow(new Date(invitation.expiresAt), {
                  addSuffix: true,
                })}
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCancelInvitation(invitation.id)}
                  disabled={cancelling === invitation.id}
                  className="text-destructive hover:text-destructive"
                >
                  {cancelling === invitation.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <X className="h-4 w-4" />
                  )}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
