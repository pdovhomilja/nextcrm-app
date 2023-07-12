"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

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
import { useToast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";

const FormSchema = z.object({
  databaseId: z.string().min(3).max(50),
  secretKey: z.string(),
});

export function NotionForm({ userId }: { userId: string }) {
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const router = useRouter();

  const { toast } = useToast();

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
  });

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    try {
      setIsLoading(true);
      await axios.post(`/api/user/${userId}/setnotiondb`, data);
      //TODO: send data to the server
      toast({
        title: "You submitted the following values:",
        description: (
          <pre className="mt-2 w-[340px] rounded-md bg-slate-950 p-4">
            <code className="text-white">{JSON.stringify(data, null, 2)}</code>
          </pre>
        ),
      });
      router.refresh();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          "Something went wrong while activating your notion integration.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex space-x-5 w-full p-5 items-end"
      >
        <FormField
          control={form.control}
          name="databaseId"
          render={({ field }) => (
            <FormItem className="w-1/3">
              <FormLabel>Database ID</FormLabel>
              <FormControl>
                <Input
                  disabled={isLoading}
                  placeholder="125aea9f9e964fe9953224995269459c"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="secretKey"
          render={({ field }) => (
            <FormItem className="w-1/3">
              <FormLabel>Secret Key</FormLabel>
              <FormControl>
                <Input
                  disabled={isLoading}
                  placeholder="secret_FcJdJZpx"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button className="w-[150px]" type="submit">
          Activate
        </Button>
      </form>
    </Form>
  );
}
