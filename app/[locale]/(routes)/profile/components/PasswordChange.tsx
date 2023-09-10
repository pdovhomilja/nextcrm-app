"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import { useToast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";

const FormSchema = z.object({
  password: z.string().min(5).max(50),
  cpassword: z.string().min(5).max(50),
});

export function PasswordChangeForm({ userId }: { userId: string }) {
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const router = useRouter();

  const { toast } = useToast();

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
  });

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    try {
      setIsLoading(true);
      await axios.put(`/api/user/${userId}/setnewpass`, data);
      //TODO: send data to the server
      toast({
        title: "Password changed  successfully",
      });
      router.refresh();
    } catch (error: any) {
      console.log(error.response.data);
      toast({
        variant: "destructive",
        title: "Error",
        description:
          "Something went wrong while changing your password: " +
          error.response.data,
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
          name="password"
          render={({ field }) => (
            <FormItem className="w-1/3">
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input
                  disabled={isLoading}
                  type="password"
                  placeholder="Y0ourSup3rS3cr3tP@ssW0rd"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="cpassword"
          render={({ field }) => (
            <FormItem className="w-1/3">
              <FormLabel>Confirm password</FormLabel>
              <FormControl>
                <Input
                  disabled={isLoading}
                  type="password"
                  placeholder="Y0ourSup3rS3cr3tP@ssW0rd"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button className="w-[250px]" type="submit">
          Change password
        </Button>
      </form>
    </Form>
  );
}
