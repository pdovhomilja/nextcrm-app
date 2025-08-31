"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { saveUserMailAccount } from "@/actions/mail/account-actions";
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
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const formSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  imapHost: z.string().min(1, { message: "IMAP host is required." }),
  imapPort: z.string().min(1, { message: "Port is required." }),
  imapUser: z.string().min(1, { message: "IMAP username is required." }),
  password: z
    .string()
    .min(1, { message: "Password or App Password is required." }),
  smtpHost: z.string().min(1, { message: "SMTP host is required." }),
  smtpPort: z.string().min(1, { message: "Port is required." }),
});

type MailAccountFormValues = z.infer<typeof formSchema>;

export const MailAccountForm = () => {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();

  const form = useForm<MailAccountFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      imapHost: "",
      imapPort: "993",
      imapUser: "",
      password: "",
      smtpHost: "",
      smtpPort: "587",
    },
  });

  const onSubmit = (values: MailAccountFormValues) => {
    startTransition(async () => {
      const result = await saveUserMailAccount({
        ...values,
        imapPort: parseInt(values.imapPort, 10),
        smtpPort: parseInt(values.smtpPort, 10),
      });
      if (result.error) {
        toast.error("Failed to add account", {
          description: result.details
            ? JSON.stringify(result.details)
            : "Please check the form fields.",
        });
      } else {
        toast.success("Mail account added successfully");
        form.reset();
        router.refresh();
      }
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email Address</FormLabel>
                <FormControl>
                  <Input placeholder="me@example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="imapUser"
            render={({ field }) => (
              <FormItem>
                <FormLabel>IMAP Username</FormLabel>
                <FormControl>
                  <Input placeholder="me@example.com" {...field} />
                </FormControl>
                <FormDescription>
                  Usually the same as your email address.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="imapHost"
            render={({ field }) => (
              <FormItem>
                <FormLabel>IMAP Host</FormLabel>
                <FormControl>
                  <Input placeholder="imap.example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="imapPort"
            render={({ field }) => (
              <FormItem>
                <FormLabel>IMAP Port</FormLabel>
                <FormControl>
                  <Input type="text" {...field} />
                </FormControl>
                <FormDescription>Usually 993 for SSL/TLS.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Password / App Password</FormLabel>
                <FormControl>
                  <Input type="password" {...field} />
                </FormControl>
                <FormDescription>
                  For services like Gmail, you may need to generate an App
                  Password.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="smtpHost"
            render={({ field }) => (
              <FormItem>
                <FormLabel>SMTP Host</FormLabel>
                <FormControl>
                  <Input placeholder="smtp.example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="smtpPort"
            render={({ field }) => (
              <FormItem>
                <FormLabel>SMTP Port</FormLabel>
                <FormControl>
                  <Input type="text" {...field} />
                </FormControl>
                <FormDescription>Usually 587 for TLS.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <Button type="submit" disabled={isPending}>
          Add Account
        </Button>
      </form>
    </Form>
  );
};
