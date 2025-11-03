"use client";

import { useState } from "react";
import { OrganizationRole } from "@prisma/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { RoleBadge } from "@/components/role-badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { ASSIGNABLE_ROLES } from "@/lib/permissions";

interface TeamMember {
  id: string;
  name: string | null;
  email: string;
  avatar: string | null;
  organization_role: OrganizationRole;
  created_on: Date;
}

interface TeamMembersListProps {
  members: TeamMember[];
  currentUserId: string;
  currentUserRole: OrganizationRole;
  isOwner: boolean;
  canManage: boolean;
}

export function TeamMembersList({
  members,
  currentUserId,
  currentUserRole,
  isOwner,
  canManage,
}: TeamMembersListProps) {
  const { toast } = useToast();
  const [updating, setUpdating] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  const handleUpdateRole = async (memberId: string, newRole: OrganizationRole) => {
    try {
      setUpdating(memberId);
      const response = await fetch(
        `/api/organization/members/${memberId}/role`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: newRole }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      toast({
        title: "Success",
        description: "Member role updated",
        variant: "default",
      });

      // Refresh page or update local state
      window.location.reload();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update member role",
        variant: "destructive",
      });
    } finally {
      setUpdating(null);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      setRemoving(memberId);
      const response = await fetch(`/api/organization/members/${memberId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      toast({
        title: "Success",
        description: "Member removed from organization",
        variant: "default",
      });

      // Refresh page
      window.location.reload();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to remove member",
        variant: "destructive",
      });
    } finally {
      setRemoving(null);
    }
  };

  return (
    <div className="border rounded-lg overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Member</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((member) => {
            const isCurrentUser = member.id === currentUserId;
            const isOwnerMember = member.organization_role === "OWNER";

            return (
              <TableRow key={member.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage
                        src={member.avatar || undefined}
                        alt={member.name || member.email}
                      />
                      <AvatarFallback>
                        {(member.name || member.email).charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">
                        {member.name || member.email}
                        {isCurrentUser && (
                          <span className="text-xs text-muted-foreground ml-2">
                            (You)
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">{member.email}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {canManage && isOwner && !isOwnerMember && !isCurrentUser ? (
                    <Select
                      value={member.organization_role}
                      onValueChange={(newRole) =>
                        handleUpdateRole(member.id, newRole as OrganizationRole)
                      }
                      disabled={updating === member.id}
                    >
                      <SelectTrigger className="w-[130px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ASSIGNABLE_ROLES.map((role) => (
                          <SelectItem key={role} value={role}>
                            {role.charAt(0) + role.slice(1).toLowerCase()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <RoleBadge role={member.organization_role} />
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(member.created_on), {
                    addSuffix: true,
                  })}
                </TableCell>
                <TableCell className="text-right">
                  {canManage && !isCurrentUser && !isOwnerMember && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          disabled={removing === member.id}
                        >
                          {removing === member.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogTitle>Remove Member</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to remove{" "}
                          <strong>{member.name || member.email}</strong> from
                          your organization? This action cannot be undone.
                        </AlertDialogDescription>
                        <div className="flex justify-end gap-4">
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleRemoveMember(member.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Remove
                          </AlertDialogAction>
                        </div>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
