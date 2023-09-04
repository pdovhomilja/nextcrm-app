"use client";

import * as z from "zod";
import axios from "axios";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";

import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Icons } from "@/components/ui/icons";

const formSchema = z.object({
  feedback: z.string().min(1, {
    message: "Feedback must be at least 1 character.",
  }),
});

interface FeedbackFormProps {
  setOpen: (open: boolean) => void;
}

const FeedbackForm = ({ setOpen }: FeedbackFormProps) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm({
    resolver: zodResolver(formSchema),
  });

  const onSubmit = async (data: any) => {
    setLoading(true);
    try {
      await axios.post("/api/feedback", data);
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Something went wrong. Please try again later.",
      });
    } finally {
      toast({
        title: "Success",
        description: "Thank you for your feedback.",
      });
      setOpen(false);
      setLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
        <FormField
          control={form.control}
          name="feedback"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Send us a feedback</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Your feedback"
                  disabled={loading}
                  {...field}
                />
              </FormControl>
              <FormDescription className="text-xs text-muted-foreground">
                We appreciate every feedback. Thank you for helping us make this
                app better
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end space-x-2">
          <Button
            variant={"outline"}
            onClick={() => setOpen(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button type="submit" variant={"secondary"} disabled={loading}>
            {loading ? (
              <div className="flex space-x-2">
                <Icons.spinner className="h-4 w-4 animate-spin" />
                <span>Sending ...</span>
              </div>
            ) : (
              "Submit"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default FeedbackForm;
