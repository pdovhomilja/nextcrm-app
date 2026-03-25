"use client";

import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { updateTarget } from "@/actions/crm/targets/update-target";

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
    personal_email: z.string().optional(),
    company_email:  z.string().optional(),
    company_phone:  z.string().optional(),
    city:           z.string().optional(),
    country:        z.string().optional(),
    industry:       z.string().optional(),
    employees:      z.string().optional(),
    description:    z.string().optional(),
    status: z.boolean(),
  });

  type UpdateTargetFormValues = z.infer<typeof formSchema>;

  const form = useForm<UpdateTargetFormValues>({
    resolver: zodResolver(formSchema),
    mode: "onBlur",
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
      personal_email: initialData?.personal_email || "",
      company_email: initialData?.company_email || "",
      company_phone: initialData?.company_phone || "",
      city: initialData?.city || "",
      country: initialData?.country || "",
      industry: initialData?.industry || "",
      employees: initialData?.employees || "",
      description: initialData?.description || "",
      status: initialData.status ?? true,
    },
  });

  const onSubmit = async (data: UpdateTargetFormValues) => {
    const result = await updateTarget({ id: initialData.id, ...data });
    if (result?.error) {
      form.setError("root.serverError", { message: result.error });
    } else {
      toast.success("Target updated successfully");
      setOpen(false);
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
                  <Input disabled={form.formState.isSubmitting} placeholder="John" {...field} />
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
                  <Input disabled={form.formState.isSubmitting} placeholder="Doe" {...field} />
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
                  <Input disabled={form.formState.isSubmitting} placeholder="john@example.com" {...field} />
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
                  <Input disabled={form.formState.isSubmitting} placeholder="+1 234 567 890" {...field} />
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
                  <Input disabled={form.formState.isSubmitting} placeholder="+1 234 567 891" {...field} />
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
                  <Input disabled={form.formState.isSubmitting} placeholder="CEO" {...field} />
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
                  <Input disabled={form.formState.isSubmitting} placeholder="Acme Corp" {...field} />
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
                  <Input disabled={form.formState.isSubmitting} placeholder="https://acme.com" {...field} />
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
                <Input disabled={form.formState.isSubmitting} placeholder="https://johndoe.com" {...field} />
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
                  <Input disabled={form.formState.isSubmitting} placeholder="https://linkedin.com/in/john" {...field} />
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
                  <Input disabled={form.formState.isSubmitting} placeholder="https://x.com/john" {...field} />
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
                  <Input disabled={form.formState.isSubmitting} placeholder="https://instagram.com/john" {...field} />
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
                  <Input disabled={form.formState.isSubmitting} placeholder="https://facebook.com/john" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="personal_email" render={({ field }) => (
            <FormItem><FormLabel>Personal Email</FormLabel>
              <FormControl><Input placeholder="john@personal.com" {...field} value={field.value ?? ''} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="company_email" render={({ field }) => (
            <FormItem><FormLabel>Company Email</FormLabel>
              <FormControl><Input placeholder="info@company.com" {...field} value={field.value ?? ''} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>
        <FormField control={form.control} name="company_phone" render={({ field }) => (
          <FormItem><FormLabel>Company Phone</FormLabel>
            <FormControl><Input placeholder="+1 800 000 0000" {...field} value={field.value ?? ''} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="city" render={({ field }) => (
            <FormItem><FormLabel>City</FormLabel>
              <FormControl><Input placeholder="Prague" {...field} value={field.value ?? ''} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="country" render={({ field }) => (
            <FormItem><FormLabel>Country</FormLabel>
              <FormControl><Input placeholder="Czech Republic" {...field} value={field.value ?? ''} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="industry" render={({ field }) => (
            <FormItem><FormLabel>Industry</FormLabel>
              <FormControl><Input placeholder="SaaS" {...field} value={field.value ?? ''} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="employees" render={({ field }) => (
            <FormItem><FormLabel>Employees</FormLabel>
              <FormControl><Input placeholder="50-200" {...field} value={field.value ?? ''} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>
        <FormField control={form.control} name="description" render={({ field }) => (
          <FormItem><FormLabel>Description</FormLabel>
            <FormControl><Input placeholder="Short company description" {...field} value={field.value ?? ''} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
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
        {form.formState.errors.root?.serverError && (
          <p className="text-sm text-destructive" aria-live="polite">
            {form.formState.errors.root.serverError.message}
          </p>
        )}
        {initialData?.converted_at && (
          <div className="rounded-md border p-3 bg-muted text-sm text-muted-foreground">
            Converted to Account + Contact on {new Date(initialData.converted_at).toLocaleDateString()}
          </div>
        )}
        <Button disabled={form.formState.isSubmitting} type="submit" className="w-full">
          {form.formState.isSubmitting ? (
            <span className="flex items-center animate-pulse">Saving data ...</span>
          ) : (
            "Update target"
          )}
        </Button>
      </form>
    </Form>
  );
}
