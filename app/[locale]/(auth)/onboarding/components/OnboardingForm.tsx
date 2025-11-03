"use client";
import { z } from "zod";
import axios from "axios";
import { useRouter } from "next/navigation";
import React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useTranslations } from "next-intl";

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

const formSchema = z.object({
  name: z.string().min(3, "Organization name must be at least 3 characters").max(100),
  slug: z.string()
    .min(3, "Slug must be at least 3 characters")
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens")
    .transform(val => val.toLowerCase()),
});

type OnboardingFormValues = z.infer<typeof formSchema>;

export function OnboardingForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const t = useTranslations("OnboardingForm");

  const form = useForm<OnboardingFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      slug: "",
    },
  });

  const onSubmit = async (data: OnboardingFormValues) => {
    setIsLoading(true);
    try {
      const response = await axios.post("/api/organization", data);
      toast({
        title: "Success",
        description: "Organization created successfully!",
      });

      if (response.status === 200) {
        router.push("/");
        router.refresh();
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error?.response?.data || "Failed to create organization",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleNameChange = (value: string) => {
    const slug = value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    form.setValue("slug", slug);
  };

  return (
    <Card className="shadow-lg max-w-2xl mx-auto">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl">Create Your Organization</CardTitle>
        <CardDescription>
          Set up your organization to get started with {process.env.NEXT_PUBLIC_APP_NAME || "NextCRM"}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Organization Name</FormLabel>
                  <FormControl>
                    <Input
                      disabled={isLoading}
                      placeholder="Acme Corporation"
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        handleNameChange(e.target.value);
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    The name of your company or organization
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Organization Slug</FormLabel>
                  <FormControl>
                    <Input
                      disabled={isLoading}
                      placeholder="acme-corporation"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    A unique identifier for your organization (lowercase, numbers, hyphens only)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button disabled={isLoading} type="submit" className="w-full">
              {isLoading ? "Creating..." : "Create Organization"}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex flex-col space-y-2">
        <div className="text-sm text-gray-500 text-center">
          You will be assigned as the owner of this organization
        </div>
      </CardFooter>
    </Card>
  );
}
