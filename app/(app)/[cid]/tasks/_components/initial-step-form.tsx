// in app/(app)/[cid]/tasks/_components/initial-step-form.tsx
"use client";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sparkles } from "lucide-react";
import { UseFormReturn } from "react-hook-form";

interface WizardProps {
  form: UseFormReturn<{ goal: string; role: string; language: string }>;
  isPending: boolean;
  handleInitialSubmit: (e?: React.BaseSyntheticEvent) => Promise<void>;
}

export function InitialStepForm({ wizard }: { wizard: WizardProps }) {
  return (
    <Form {...wizard.form}>
      <form onSubmit={wizard.handleInitialSubmit} className="space-y-4">
        <FormField
          control={wizard.form.control}
          name="goal"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Your Project Goal</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g., Launch a new marketing campaign"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={wizard.form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Your Role</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your role" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Product Manager">
                    Product Manager
                  </SelectItem>
                  <SelectItem value="Software Engineer">
                    Software Engineer
                  </SelectItem>
                  <SelectItem value="Marketing Specialist">
                    Marketing Specialist
                  </SelectItem>
                  <SelectItem value="Project Manager">
                    Project Manager
                  </SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={wizard.form.control}
          name="language"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Output Language</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select output language" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="English">English</SelectItem>
                  <SelectItem value="Czech">Czech</SelectItem>
                  <SelectItem value="German">German</SelectItem>
                  <SelectItem value="Spanish">Spanish</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={wizard.isPending}>
          {wizard.isPending ? "Thinking..." : "Start Refinement"}
          <Sparkles className="ml-2 h-4 w-4" />
        </Button>
      </form>
    </Form>
  );
}
