"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Icons } from "@/components/ui/icons";
import { inviteUser } from "@/actions/admin/users/invite-user";

function slugifyClient(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ".")
    .replace(/[^a-z0-9._-]/g, "")
    .replace(/\.{2,}/g, ".")
    .replace(/^\.+|\.+$/g, "")
    .slice(0, 48);
}

const FormSchema = z.object({
  name: z.string().min(2).max(80),
  username: z
    .string()
    .min(2)
    .max(48)
    .regex(/^[a-z0-9._-]+$/i, "Use letters, numbers, dots, or hyphens only"),
  workEmail: z.string().email(),
  personalEmail: z.string().email(),
  language: z.string().min(2),
  role: z.enum(["user", "manager", "admin"]),
});

type FormValues = z.infer<typeof FormSchema>;

export function InviteForm({ orgDomain }: { orgDomain: string }) {
  const [isLoading, setIsLoading] = useState(false);
  const [workEmailTouched, setWorkEmailTouched] = useState(false);
  const t = useTranslations("AdminPage");
  const router = useRouter();

  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      name: "",
      username: "",
      workEmail: "",
      personalEmail: "",
      language: "en",
      role: "user",
    },
  });

  const username = form.watch("username");
  const suggestedWorkEmail = useMemo(() => {
    const slug = slugifyClient(username || "");
    return slug ? `${slug}@${orgDomain}` : "";
  }, [username, orgDomain]);

  useEffect(() => {
    if (!workEmailTouched && suggestedWorkEmail) {
      form.setValue("workEmail", suggestedWorkEmail, { shouldValidate: true });
    }
  }, [suggestedWorkEmail, workEmailTouched, form]);

  async function onSubmit(data: FormValues) {
    setIsLoading(true);
    try {
      const result = await inviteUser({
        name: data.name,
        username: data.username,
        workEmail: data.workEmail,
        personalEmail: data.personalEmail,
        language: data.language,
        role: data.role,
      });

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Employee created — login details sent to their personal email");
        form.reset({
          name: "",
          username: "",
          workEmail: "",
          personalEmail: "",
          language: "en",
          role: "user",
        });
        setWorkEmailTouched(false);
        router.refresh();
      }
    } catch {
      toast.error(t("inviteForm.errorDesc"));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg">Add employee</CardTitle>
        <CardDescription>
          Creates a <strong>@{orgDomain}</strong> mailbox in Resend, CRM access on their personal
          email, and emails a temporary password.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full name</FormLabel>
                  <FormControl>
                    <Input disabled={isLoading} placeholder="MS Dhoni" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input
                      disabled={isLoading}
                      placeholder="dhoni"
                      {...field}
                      onChange={(e) => {
                        field.onChange(e.target.value.toLowerCase());
                      }}
                    />
                  </FormControl>
                  <FormDescription>Default work address: {suggestedWorkEmail || "—"}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="workEmail"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Work email</FormLabel>
                  <FormControl>
                    <Input
                      disabled={isLoading}
                      placeholder={`name@${orgDomain}`}
                      {...field}
                      onChange={(e) => {
                        setWorkEmailTouched(true);
                        field.onChange(e.target.value.toLowerCase());
                      }}
                    />
                  </FormControl>
                  <FormDescription>You can change this (e.g. tech@{orgDomain}).</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="personalEmail"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Personal email (login)</FormLabel>
                  <FormControl>
                    <Input
                      disabled={isLoading}
                      type="email"
                      placeholder="dhoni@gmail.com"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>Random password is sent here — not to the work address.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="language"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Language</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select language" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="cz">Czech</SelectItem>
                    </SelectContent>
                  </Select>
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
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>User is the default. Admins can change it later.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex items-end sm:col-span-2">
              <Button type="submit" disabled={isLoading} className="gap-2">
                {isLoading && <Icons.spinner className="h-4 w-4 animate-spin" />}
                Create employee
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
