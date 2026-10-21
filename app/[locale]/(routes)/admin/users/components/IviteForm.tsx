"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Icons } from "@/components/ui/icons";
import { inviteUser } from "@/actions/admin/users/invite-user";
import { ROLE_OPTIONS } from "./role-options";
import { VentureAccessFields } from "./VentureAccessFields";
import type { VentureOption } from "@/lib/vensai/venture-catalog";

const FormSchema = z.object({
  name: z.string().optional(),
  personalEmail: z.string().optional(),
  phone: z.string().optional(),
  workEmail: z.string().email(),
  role: z.enum(["user", "trainee", "manager", "admin"]),
  password: z.string().optional(),
  confirmPassword: z.string().optional(),
});

type FormValues = z.infer<typeof FormSchema>;

export function InviteForm({
  orgDomain,
  ventureOptions,
}: {
  orgDomain: string;
  ventureOptions: VentureOption[];
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [setPassword, setSetPassword] = useState(false);
  const [ventureSlugs, setVentureSlugs] = useState<string[]>([]);
  const [crmEnabled, setCrmEnabled] = useState(true);
  const router = useRouter();

  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      name: "",
      personalEmail: "",
      phone: "",
      workEmail: "",
      role: "user",
      password: "",
      confirmPassword: "",
    },
  });
  const personalEmail = form.watch("personalEmail") ?? "";
  const personalFilled = personalEmail.trim().length > 0;
  const passwordRequired = !personalFilled;

  async function onSubmit(data: FormValues) {
    const personal = data.personalEmail?.trim() ?? "";
    const choosingPassword = !personal || setPassword;
    if (personal && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(personal)) {
      toast.error("Enter a valid personal email.");
      return;
    }
    if (!personal && !setPassword) {
      toast.error("Set a password. Personal email is empty.");
      return;
    }
    if (choosingPassword) {
      if (!data.password || data.password.length < 8) {
        toast.error("Password must be at least 8 characters.");
        return;
      }
      if (data.password !== data.confirmPassword) {
        toast.error("Password and confirm password do not match.");
        return;
      }
    }

    setIsLoading(true);
    try {
      const result = await inviteUser({
        name: data.name,
        personalEmail: personal || undefined,
        phone: data.phone,
        workEmail: data.workEmail,
        password: choosingPassword ? data.password : undefined,
        role: data.role,
        ventureSlugs,
        crmEnabled,
      });

      if ("error" in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success(
          personal && !choosingPassword
            ? "User created. A temporary password was sent to their personal email."
            : personal
              ? "User created. That password was sent to their personal email."
              : "User created. They can sign in with this work email and password."
        );
        form.reset({
          name: "",
          personalEmail: "",
          phone: "",
          workEmail: "",
          role: "user",
          password: "",
          confirmPassword: "",
        });
        setSetPassword(false);
        setVentureSlugs([]);
        setCrmEnabled(true);
        router.refresh();
      }
    } catch {
      toast.error("Could not create the user.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg">Add user</CardTitle>
        <CardDescription>
          Name, personal email, phone, and role. Tick Set password to choose the password. Leave personal
          email empty and a password is required.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid max-w-xl gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input disabled={isLoading} placeholder="Full name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="personalEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Personal email</FormLabel>
                  <FormControl>
                    <Input
                      disabled={isLoading}
                      type="email"
                      placeholder="name@gmail.com"
                      {...field}
                      onChange={(e) => field.onChange(e.target.value.toLowerCase())}
                    />
                  </FormControl>
                  <FormDescription>
                    Filled in with Set password off: a random password is emailed here. Tick Set password to email the password you type.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <label className="flex items-center gap-2 text-sm font-medium">
              <Checkbox
                checked={setPassword || passwordRequired}
                disabled={isLoading || passwordRequired}
                onCheckedChange={(checked) => setSetPassword(checked === true)}
              />
              Set password
            </label>
            {(setPassword || passwordRequired) && (
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          autoComplete="new-password"
                          disabled={isLoading}
                          placeholder="At least 8 characters"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          autoComplete="new-password"
                          disabled={isLoading}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone number</FormLabel>
                  <FormControl>
                    <Input disabled={isLoading} placeholder="Phone number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="workEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Work email</FormLabel>
                  <FormControl>
                    <Input
                      disabled={isLoading}
                      placeholder={`name@${orgDomain}`}
                      {...field}
                      onChange={(e) => field.onChange(e.target.value.toLowerCase())}
                    />
                  </FormControl>
                  <FormDescription>
                    Company mailbox. They can sign in with this address. It must end with @{orgDomain}.
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
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ROLE_OPTIONS.map((role) => (
                        <SelectItem key={role.value} value={role.value}>
                          {role.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <VentureAccessFields
              ventures={ventureOptions}
              ventureSlugs={ventureSlugs}
              crmEnabled={crmEnabled}
              onVentureSlugsChange={setVentureSlugs}
              onCrmEnabledChange={setCrmEnabled}
            />

            <div>
              <Button type="submit" disabled={isLoading} className="gap-2">
                {isLoading && <Icons.spinner className="h-4 w-4 animate-spin" />}
                Create user
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
