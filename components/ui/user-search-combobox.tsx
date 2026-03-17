"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
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
import fetcher from "@/lib/fetcher";
import useDebounce from "@/hooks/useDebounce";

type User = { id: string; name: string; avatar: string | null };

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

  const debouncedSearch = useDebounce(search, 300);

  const listUrl = open
    ? `/api/user?search=${encodeURIComponent(debouncedSearch)}&skip=${skip}&take=${PAGE_SIZE}`
    : null;

  const { data: listData, isLoading } = useSWR(listUrl, fetcher);

  const selectedInList = accumulatedUsers.find((u) => u.id === value);
  const { data: singleUser } = useSWR(
    value && !selectedInList ? `/api/user?id=${value}` : null,
    fetcher
  );

  useEffect(() => {
    if (listData?.users) {
      if (skip === 0) {
        setAccumulatedUsers(listData.users);
      } else {
        setAccumulatedUsers((prev) => [...prev, ...listData.users]);
      }
    }
  }, [listData, skip]);

  useEffect(() => {
    setSkip(0);
    setAccumulatedUsers([]);
  }, [debouncedSearch]);

  const displayUser = selectedInList ?? singleUser ?? null;

  const handleSelect = (userId: string) => {
    onChange(userId === value ? "" : userId);
    setOpen(false);
  };

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
              {isLoading && skip === 0 ? (
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
                        disabled={isLoading}
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
