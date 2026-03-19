"use client";

import { useState, useEffect, useTransition } from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import useDebounce from "@/hooks/useDebounce";
import { searchUsers } from "@/actions/user/search-users";
import { getUserById } from "@/actions/user/get-user-by-id";

type User = { id: string; name: string | null; avatar: string | null };

interface UserSearchComboboxProps {
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  disabled?: boolean;
  name?: string;
}

const PAGE_SIZE = 50;

export function UserSearchCombobox({
  value,
  onChange,
  placeholder = "Select user",
  disabled,
  name,
}: UserSearchComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [skip, setSkip] = useState(0);
  const [accumulatedUsers, setAccumulatedUsers] = useState<User[]>([]);
  const [listData, setListData] = useState<{
    users: User[];
    hasMore: boolean;
  } | null>(null);
  const [singleUser, setSingleUser] = useState<User | null>(null);
  const [isPending, startTransition] = useTransition();

  const debouncedSearch = useDebounce(search, 300);

  const selectedInList = accumulatedUsers.find((u) => u.id === value);

  // Load list of users when open
  useEffect(() => {
    if (!open) return;
    startTransition(async () => {
      const data = await searchUsers({
        search: debouncedSearch,
        skip,
        take: PAGE_SIZE,
      });
      setListData(data);
    });
  }, [open, debouncedSearch, skip]);

  // Accumulate users across pages
  useEffect(() => {
    if (listData?.users) {
      if (skip === 0) {
        setAccumulatedUsers(listData.users);
      } else {
        setAccumulatedUsers((prev) => [...prev, ...listData.users]);
      }
    }
  }, [listData, skip]);

  // Reset on search change
  useEffect(() => {
    setSkip(0);
    setAccumulatedUsers([]);
    setListData(null);
  }, [debouncedSearch]);

  // Load selected user if not in list
  useEffect(() => {
    if (!value || selectedInList) return;
    startTransition(async () => {
      const user = await getUserById(value);
      setSingleUser(user);
    });
  }, [value, selectedInList]);

  const displayUser = selectedInList ?? singleUser ?? null;

  const handleSelect = (userId: string) => {
    onChange(userId === value ? "" : userId);
    setOpen(false);
  };

  const isLoading = isPending && skip === 0 && accumulatedUsers.length === 0;

  return (
    <>
      {name && <input type="hidden" name={name} value={value} />}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
            disabled={disabled}
            type="button"
          >
            <span className="truncate text-sm">
              {displayUser?.name ?? (
                <span className="text-muted-foreground">{placeholder}</span>
              )}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search users..."
              value={search}
              onValueChange={setSearch}
            />
            <CommandList onWheelCapture={(e) => e.stopPropagation()}>
              {isLoading ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  Loading...
                </div>
              ) : (
                <>
                  <CommandEmpty>No users found.</CommandEmpty>
                  <CommandGroup>
                    {accumulatedUsers.map((user) => (
                      <CommandItem
                        key={user.id}
                        value={user.id}
                        onSelect={handleSelect}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            value === user.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {user.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                  {listData?.hasMore && (
                    <div className="p-1">
                      <Button
                        variant="ghost"
                        className="w-full text-sm"
                        type="button"
                        onClick={() => setSkip((prev) => prev + PAGE_SIZE)}
                        disabled={isPending}
                      >
                        Load more
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </>
  );
}
