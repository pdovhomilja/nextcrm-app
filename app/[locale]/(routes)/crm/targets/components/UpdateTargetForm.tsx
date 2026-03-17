"use client";

import { useState } from "react";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";

import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";

type UpdateTargetFormProps = {
  initialData: any;
  setOpen: (value: boolean) => void;
};

export function UpdateTargetForm({ initialData, setOpen }: UpdateTargetFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const formSchema = z.object({
    first_name: z.string().optional(),
    last_name: z.string().min(1, "Last name is required"),
    email: z.string().optional(),
    mobile_phone: z.string().optional(),
    office_phone: z.string().optional(),
    company: z.string().optional(),
    company_website: z.string().optional(),
    personal_website: z.string().optional(),
    position: z.string().optional(),
    social_x: z.string().optional(),
    social_linkedin: z.string().optional(),
    social_instagram: z.string().optional(),
    social_facebook: z.string().optional(),
    status: z.boolean(),
  });

  type UpdateTargetFormValues = z.infer<typeof formSchema>;

  const form = useForm<UpdateTargetFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      first_name: initialData.first_name || "",
      last_name: initialData.last_name || "",
      email: initialData.email || "",
      mobile_phone: initialData.mobile_phone || "",
      office_phone: initialData.office_phone || "",
      company: initialData.company || "",
      company_website: initialData.company_website || "",
      personal_website: initialData.personal_website || "",
      position: initialData.position || "",
      social_x: initialData.social_x || "",
      social_linkedin: initialData.social_linkedin || "",
      social_instagram: initialData.social_instagram || "",
      social_facebook: initialData.social_facebook || "",
      status: initialData.status ?? true,
    },
  });

  const onSubmit = async (data: UpdateTargetFormValues) => {
    setIsLoading(true);
    try {
      await axios.put("/api/crm/targets", { id: initialData.id, ...data });
      toast({
        title: "Success",
        description: "Target updated successfully",
      });
      router.refresh();
      setOpen(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error?.response?.data?.error || "Something went wrong",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 px-2">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="first_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First name</FormLabel>
                <FormControl>
                  <Input disabled={isLoading} placeholder="John" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="last_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last name *</FormLabel>
                <FormControl>
                  <Input disabled={isLoading} placeholder="Doe" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input disabled={isLoading} placeholder="john@example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="mobile_phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Mobile phone</FormLabel>
                <FormControl>
                  <Input disabled={isLoading} placeholder="+1 234 567 890" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="office_phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Office phone</FormLabel>
                <FormControl>
                  <Input disabled={isLoading} placeholder="+1 234 567 891" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="position"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Position</FormLabel>
                <FormControl>
                  <Input disabled={isLoading} placeholder="CEO" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="company"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Company</FormLabel>
                <FormControl>
                  <Input disabled={isLoading} placeholder="Acme Corp" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="company_website"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Company website</FormLabel>
                <FormControl>
                  <Input disabled={isLoading} placeholder="https://acme.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="personal_website"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Personal website</FormLabel>
              <FormControl>
                <Input disabled={isLoading} placeholder="https://johndoe.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="social_linkedin"
            render={({ field }) => (
              <FormItem>
                <FormLabel>LinkedIn</FormLabel>
                <FormControl>
                  <Input disabled={isLoading} placeholder="https://linkedin.com/in/john" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="social_x"
            render={({ field }) => (
              <FormItem>
                <FormLabel>X (Twitter)</FormLabel>
                <FormControl>
                  <Input disabled={isLoading} placeholder="https://x.com/john" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="social_instagram"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Instagram</FormLabel>
                <FormControl>
                  <Input disabled={isLoading} placeholder="https://instagram.com/john" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="social_facebook"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Facebook</FormLabel>
                <FormControl>
                  <Input disabled={isLoading} placeholder="https://facebook.com/john" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Is target active?</FormLabel>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />
        <Button disabled={isLoading} type="submit" className="w-full">
          {isLoading ? (
            <span className="flex items-center animate-pulse">Saving data ...</span>
          ) : (
            "Update target"
          )}
        </Button>
      </form>
    </Form>
  );
}
