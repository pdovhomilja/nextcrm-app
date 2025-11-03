"use client";

import { useState } from "react";
import { useAction } from "@/hooks/use-action";
import { inviteMember } from "@/actions/organization/invite-member";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/components/ui/use-toast";
import { ASSIGNABLE_ROLES } from "@/lib/permissions";

const formSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.enum(["ADMIN", "MEMBER", "VIEWER"]),
});

type FormValues = z.infer<typeof formSchema>;

export function InviteMemberForm() {
  const { toast } = useToast();
  const { execute, isLoading, error } = useAction(inviteMember, {
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: data.message,
        variant: "default",
      });
      form.reset();
    },
    onError: (err) => {
      toast({
        title: "Error",
        description: err,
        variant: "destructive",
      });
    },
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      role: "MEMBER",
    },
  });

  const onSubmit = async (values: FormValues) => {
    await execute(values);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Email Address</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="member@example.com"
                    disabled={isLoading}
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  The email address of the team member to invite
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Role</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  disabled={isLoading}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {ASSIGNABLE_ROLES.map((role) => (
                      <SelectItem key={role} value={role}>
                        {role.charAt(0) + role.slice(1).toLowerCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  The role for this team member
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-700 dark:text-blue-200">
            <strong>Role Permissions:</strong>
          </p>
          <ul className="text-xs text-blue-600 dark:text-blue-300 mt-2 space-y-1 ml-4 list-disc">
            <li>
              <strong>Admin:</strong> Can manage team members and organization settings
            </li>
            <li>
              <strong>Member:</strong> Can create, read, and update content
            </li>
            <li>
              <strong>Viewer:</strong> Read-only access to organization content
            </li>
          </ul>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-950 p-3 rounded-lg border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-700 dark:text-red-200">{error}</p>
          </div>
        )}

        <Button type="submit" disabled={isLoading} className="w-full md:w-auto">
          {isLoading ? "Sending invitation..." : "Send Invitation"}
        </Button>
      </form>
    </Form>
  );
}
