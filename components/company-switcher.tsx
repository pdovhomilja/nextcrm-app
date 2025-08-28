"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Plus, Settings, Building2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useCompanySwitcher } from "./company-provider";
import { createCompany } from "@/actions/company-actions";
import { toast } from "sonner";
import { useState } from "react";

export function CompanySwitcher() {
  const { memberships, activeCompanyId, switchCompany } = useCompanySwitcher();
  const [open, setOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState("");

  const activeCompany = memberships.find(
    (m) => m.companyId === activeCompanyId
  );

  const handleSwitchCompany = async (companyId: string) => {
    await switchCompany(companyId);
    setOpen(false);
  };

  const handleCreateCompany = async () => {
    if (!newCompanyName.trim()) return;

    setIsCreating(true);
    try {
      const result = await createCompany(newCompanyName.trim());
      if (result.success && result.company) {
        toast.success(`Company "${newCompanyName}" created successfully!`);
        setNewCompanyName("");
        switchCompany(result.company.id);
        setOpen(false);
        // Refresh memberships will happen automatically via context
      } else {
        toast.error(result.error || "Failed to create company");
      }
    } catch {
      toast.error("Failed to create company");
    } finally {
      setIsCreating(false);
    }
  };

  const getRoleBadgeColor = (role: "MEMBER" | "ADMIN" | "OWNER") => {
    switch (role) {
      case "OWNER":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300";
      case "ADMIN":
        return "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300";
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  if (!activeCompany) {
    return (
      <div className="flex items-center space-x-2">
        <Skeleton className="h-8 w-[200px]" />
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label="Select a company"
          className="w-[200px] justify-between"
        >
          <div className="flex items-center overflow-hidden space-x-2">
            <Building2 className="h-4 w-4" />
            <span className="truncate">
              {activeCompany.company.name.length > 20
                ? activeCompany.company.name.slice(0, 20) + "..."
                : activeCompany.company.name}
            </span>
          </div>
          <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0">
        <Command>
          <CommandList>
            <CommandInput placeholder="Search companies..." />
            <CommandEmpty>No companies found.</CommandEmpty>
            <CommandGroup heading="Companies">
              {memberships.map((membership) => (
                <CommandItem
                  key={membership.companyId}
                  onSelect={() => handleSwitchCompany(membership.companyId)}
                  className="text-sm"
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center space-x-2">
                      <Building2 className="h-4 w-4" />
                      <span className="truncate">
                        {membership.company.name.length > 20
                          ? membership.company.name.slice(0, 15) + "..."
                          : membership.company.name}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-xs",
                          getRoleBadgeColor(membership.role)
                        )}
                      >
                        {membership.role}
                      </Badge>
                      {membership.companyId === activeCompanyId && (
                        <Check className="h-4 w-4" />
                      )}
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup>
              <div className="px-2 py-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    placeholder="New company name..."
                    value={newCompanyName}
                    onChange={(e) => setNewCompanyName(e.target.value)}
                    className="flex-1 px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleCreateCompany();
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    onClick={handleCreateCompany}
                    disabled={!newCompanyName.trim() || isCreating}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              {activeCompany && (
                <CommandItem
                  onSelect={() => {
                    window.location.href = `/${activeCompanyId}/settings/company`;
                    setOpen(false);
                  }}
                >
                  <Settings className="h-4 w-4" />
                  <span>Company Settings</span>
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// Compact version for mobile/sidebar
export function CompanySwitcherCompact() {
  const { memberships, activeCompanyId, switchCompany } = useCompanySwitcher();
  const [open, setOpen] = useState(false);

  const activeCompany = memberships.find(
    (m) => m.companyId === activeCompanyId
  );

  if (!activeCompany) {
    return <Skeleton className="h-8 w-8" />;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <Building2 className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[250px] p-0">
        <Command>
          <CommandList>
            <CommandInput placeholder="Search companies..." />
            <CommandEmpty>No companies found.</CommandEmpty>
            <CommandGroup>
              {memberships.map((membership) => (
                <CommandItem
                  key={membership.companyId}
                  onSelect={() => {
                    switchCompany(membership.companyId);
                    setOpen(false);
                  }}
                  className="text-sm"
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center space-x-2">
                      <Building2 className="h-4 w-4" />
                      <span className="truncate">
                        {membership.company.name}
                      </span>
                    </div>
                    {membership.companyId === activeCompanyId && (
                      <Check className="h-4 w-4" />
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
