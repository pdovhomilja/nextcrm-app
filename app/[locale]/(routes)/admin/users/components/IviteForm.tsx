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

const FormSchema = z.object({
  workEmail: z.string().email(),
  role: z.enum(["user", "trainee", "manager", "admin"]),
  password: z.string().optional(),
  confirmPassword: z.string().optional(),
});

type FormValues = z.infer<typeof FormSchema>;

export function InviteForm({ orgDomain }: { orgDomain: string }) {
  const [isLoading, setIsLoading] = useState(false);
  const [setPassword, setSetPassword] = useState(false);
  const router = useRouter();

  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      workEmail: "",
      role: "user",
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(data: FormValues) {
    if (!setPassword) {
      toast.error("Tick Set password and enter a password.");
      return;
    }
    if (!data.password || data.password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    if (data.password !== data.confirmPassword) {
      toast.error("Password and confirm password do not match.");
      return;
    }

    setIsLoading(true);
    try {
      const result = await inviteUser({
        workEmail: data.workEmail,
        password: data.password,
        role: data.role,
      });

      if ("error" in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success("User created. They can sign in with this work email and password.");
        form.reset({ workEmail: "", role: "user", password: "", confirmPassword: "" });
        setSetPassword(false);
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
          Work email and a password are enough. Name, personal email, and phone can be added later.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid max-w-xl gap-4">
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
                    This is the login. You can change it later. It must end with @{orgDomain}.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm font-medium">
                <Checkbox
                  checked={setPassword}
                  onCheckedChange={(checked) => setSetPassword(checked === true)}
                  disabled={isLoading}
                />
                Set password
              </label>
              {setPassword && (
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
            </div>

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
