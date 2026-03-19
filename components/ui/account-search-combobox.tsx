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
import { searchAccounts } from "@/actions/crm/accounts/search-accounts";

type Account = { id: string; name: string };

interface AccountSearchComboboxProps {
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  disabled?: boolean;
  name?: string;
}

const PAGE_SIZE = 50;
const PAGE_SIZE_MAX = 100;

export function AccountSearchCombobox({
  value,
  onChange,
  placeholder = "Select account",
  disabled,
  name,
}: AccountSearchComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [skip, setSkip] = useState(0);
  const [accumulatedAccounts, setAccumulatedAccounts] = useState<Account[]>([]);
  const [listData, setListData] = useState<{
    accounts: Account[];
    hasMore: boolean;
  } | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [isPending, startTransition] = useTransition();

  const debouncedSearch = useDebounce(search, 300);

  const selectedInList = accumulatedAccounts.find((a) => a.id === value);

  // Load list when open
  useEffect(() => {
    if (!open) return;
    startTransition(async () => {
      const data = await searchAccounts({
        search: debouncedSearch,
        skip,
        take: PAGE_SIZE,
      });
      setListData(data);
    });
  }, [open, debouncedSearch, skip]);

  // Accumulate across pages
  useEffect(() => {
    if (listData?.accounts) {
      if (skip === 0) {
        setAccumulatedAccounts(listData.accounts);
      } else {
        setAccumulatedAccounts((prev) => [...prev, ...listData.accounts]);
      }
    }
  }, [listData, skip]);

  // Reset on search change
  useEffect(() => {
    setSkip(0);
    setAccumulatedAccounts([]);
    setListData(null);
  }, [debouncedSearch]);

  // Load selected account name if not in list
  useEffect(() => {
    if (!value || selectedInList) {
      if (!value) setSelectedAccount(null);
      return;
    }
    startTransition(async () => {
      const data = await searchAccounts({ search: "", skip: 0, take: PAGE_SIZE_MAX });
      const found = data.accounts.find((a: Account) => a.id === value) ?? null;
      setSelectedAccount(found);
    });
  }, [value, selectedInList]);

  const displayAccount = selectedInList ?? selectedAccount ?? null;

  const handleSelect = (accountId: string) => {
    onChange(accountId === value ? "" : accountId);
    setOpen(false);
  };

  const isLoading = isPending && skip === 0 && accumulatedAccounts.length === 0;

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
              {displayAccount?.name ?? (
                <span className="text-muted-foreground">{placeholder}</span>
              )}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search accounts..."
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
                  <CommandEmpty>No accounts found.</CommandEmpty>
                  <CommandGroup>
                    {accumulatedAccounts.map((account) => (
                      <CommandItem
                        key={account.id}
                        value={account.id}
                        onSelect={handleSelect}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            value === account.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {account.name}
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
