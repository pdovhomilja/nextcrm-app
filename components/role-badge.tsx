"use client";

import React from "react";
import { OrganizationRole } from "@prisma/client";
import { getRoleDisplayName } from "@/lib/permissions";
import { Badge } from "@/components/ui/badge";

interface RoleBadgeProps {
  role: OrganizationRole;
  variant?: "default" | "secondary" | "destructive" | "outline";
}

/**
 * Badge component to display user roles with appropriate styling
 * Usage:
 * <RoleBadge role="OWNER" />
 * <RoleBadge role="ADMIN" variant="secondary" />
 */
export function RoleBadge({ role, variant = "default" }: RoleBadgeProps) {
  const roleDisplayName = getRoleDisplayName(role);

  // Map roles to color variants
  const getVariant = (
    role: OrganizationRole
  ): "default" | "secondary" | "destructive" | "outline" => {
    if (variant !== "default") return variant;

    switch (role) {
      case "OWNER":
        return "destructive";
      case "ADMIN":
        return "secondary";
      case "MEMBER":
        return "default";
      case "VIEWER":
        return "outline";
      default:
        return "default";
    }
  };

  return (
    <Badge variant={getVariant(role)} className="capitalize">
      {roleDisplayName}
    </Badge>
  );
}

interface RoleLabelProps {
  role: OrganizationRole;
  showDescription?: boolean;
}

/**
 * Display role name and optional description
 */
export function RoleLabel({ role, showDescription = false }: RoleLabelProps) {
  const roleDisplayName = getRoleDisplayName(role);

  if (!showDescription) {
    return <span className="capitalize">{roleDisplayName}</span>;
  }

  return (
    <div>
      <div className="font-medium capitalize">{roleDisplayName}</div>
      <div className="text-xs text-muted-foreground">
        {role === "OWNER" && "Full access to all features"}
        {role === "ADMIN" && "Can manage team and settings"}
        {role === "MEMBER" && "Can create and edit content"}
        {role === "VIEWER" && "Read-only access"}
      </div>
    </div>
  );
}
