"use client";

import { forwardRef, useState } from "react";
import { useFormStatus } from "react-dom";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import { FormErrors } from "./form-errors";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { data } from "cypress/types/jquery";
import { ScrollArea } from "../ui/scroll-area";

interface FormInputProps {
  id: string;
  label?: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  errors?: Record<string, string[] | undefined>;
  className?: string;
  defaultValue?: string;
  data: any;
  onBlur?: () => void;
}

export const FormSelect = forwardRef<HTMLInputElement, FormInputProps>(
  (
    {
      id,
      label,
      type,
      placeholder,
      required,
      disabled,
      errors,
      className,
      defaultValue,
      data,
      onBlur,
    },
    ref
  ) => {
    const { pending } = useFormStatus();

    const [value, setValue] = useState<string>(
      defaultValue ? defaultValue : ""
    );

    // console.log("Value:", value);

    return (
      <div className="space-y-2">
        <div className="space-y-1">
          {label ? (
            <Label
              htmlFor={id}
              className="text-xs font-semibold text-neutral-700"
            >
              {label}
            </Label>
          ) : null}
          <Input
            onBlur={onBlur}
            ref={ref}
            required={required}
            value={value ? value : ""}
            name={id}
            id={id}
            placeholder={placeholder}
            type={type}
            disabled={pending || disabled}
            className={cn("text-sm px-2 py-1 h-7", className)}
            aria-describedby={`${id}-error`}
          />
          <Select
            onValueChange={(value: any) => setValue(value)}
            defaultValue={defaultValue}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent className="w-full border h-[250px]">
              <ScrollArea className="h-[250px]">
                {data.map((item: any, index: number) => (
                  <SelectItem key={index} value={item.id}>
                    {item.name}
                  </SelectItem>
                ))}
              </ScrollArea>
            </SelectContent>
          </Select>
        </div>
        <FormErrors id={id} errors={errors} />
      </div>
    );
  }
);

FormSelect.displayName = "FormSelect";
