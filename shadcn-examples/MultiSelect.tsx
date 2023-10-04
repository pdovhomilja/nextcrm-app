"use client";
import React, { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const MultiSelect = () => {
  const [open, setOpen] = useState(false);

  const [value, setValue] = useState<string[]>([]);

  const options = [
    {
      value: "option 1",
      label: "Option 1",
    },
    {
      value: "option 2",
      label: "Option 2",
    },
    {
      value: "option 3",
      label: "Option 3",
    },
    {
      value: "option 4",
      label: "Option 4",
    },
    // Add more options as needed
  ];

  //console.log(value, "value");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[200px] justify-between"
        >
          {value.length > 0
            ? value
                .map(
                  (val) => options.find((option) => option.value === val)?.label
                )
                .join(", ")
            : "Select option..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput placeholder="Search option..." />
          <CommandEmpty>No option found.</CommandEmpty>
          <CommandGroup>
            {options.map((option) => (
              <CommandItem
                key={option.value}
                onSelect={(currentValue) => {
                  setValue(
                    value.includes(currentValue)
                      ? value.filter((val) => val !== currentValue)
                      : [...value, currentValue]
                  );
                  // Removed setOpen(false); to keep the popover open after selection
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value.includes(option.value) ? "opacity-100" : "opacity-0"
                  )}
                />
                {option.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default MultiSelect;
