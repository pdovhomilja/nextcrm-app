"use client";
import { z } from "zod";
import axios from "axios";
import React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const formSchema = z.object({
  name: z.string().min(3, "Organization name must be at least 3 characters").max(100),
});

type OrganizationFormValues = z.infer<typeof formSchema>;

interface OrganizationFormProps {
  organization: {
    id: string;
    name: string;
    slug: string;
    plan: string;
    status: string;
    ownerId: string;
  };
  isOwnerOrAdmin: boolean;
  memberCount: number;
}

export function OrganizationForm({ organization, isOwnerOrAdmin, memberCount }: OrganizationFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const t = useTranslations("OrganizationForm");

  const form = useForm<OrganizationFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: organization.name,
    },
  });

  const onSubmit = async (data: OrganizationFormValues) => {
    setIsLoading(true);
    try {
      await axios.put("/api/organization", data);
      toast({
        title: "Success",
        description: "Organization updated successfully!",
      });
      router.refresh();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error?.response?.data || "Failed to update organization",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Organization Details</CardTitle>
          <CardDescription>
            View and manage your organization information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Organization Slug</p>
              <p className="text-base font-semibold">{organization.slug}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Plan</p>
              <p className="text-base font-semibold">{organization.plan}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Status</p>
              <p className="text-base font-semibold">{organization.status}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Members</p>
              <p className="text-base font-semibold">{memberCount}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {isOwnerOrAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Edit Organization</CardTitle>
            <CardDescription>
              Update your organization name
            </CardDescription>
          </CardHeader>
          <CardContent>
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
                        />
                      </FormControl>
                      <FormDescription>
                        The name of your company or organization
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button disabled={isLoading} type="submit">
                  {isLoading ? "Updating..." : "Update Organization"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
