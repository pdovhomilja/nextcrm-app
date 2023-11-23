"use client";
import { Comment } from "@/app/[locale]/(routes)/projects/dashboard/components/ProjectDasboard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Icons } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import moment from "moment";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const FormSchema = z.object({
  comment: z.string().min(3).max(160),
});

export function TeamConversations({
  data: comments,
  taskId,
}: {
  data: Comment[];
  taskId: string;
}) {
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const router = useRouter();

  const { toast } = useToast();

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
  });

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    setIsLoading(true);
    try {
      await axios.post(`/api/projects/tasks/addCommentToTask/${taskId}`, data);
      toast({
        title: "Success, comment added.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Something went wrong while sending comment to the DB",
      });
    } finally {
      form.reset({
        comment: "",
      });
      router.refresh();
      setIsLoading(false);
    }
  }

  return (
    <>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex space-x-5 w-full py-2 items-end pb-5"
        >
          <FormField
            control={form.control}
            name="comment"
            render={({ field }) => (
              <FormItem className="w-full">
                <FormControl>
                  <Input
                    disabled={isLoading}
                    placeholder="Your comment ..."
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button className="w-[80px]" disabled={isLoading} type="submit">
            {isLoading ? <Icons.spinner className="animate-spin" /> : "Add"}
          </Button>
        </form>
      </Form>
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Team conversation</CardTitle>
          <CardDescription>
            Invite your team members to collaborate.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6">
          {comments?.map((comment: any) => (
            <>
              {/*               <pre>
                <code>{JSON.stringify(comment, null, 2)}</code>
              </pre> */}
              <div key={comment.id} className="flex items-center space-x-4">
                <Avatar>
                  <AvatarImage
                    src={comment.assigned_user?.avatar || "/images/nouser.png"}
                  />
                  <AvatarFallback>{comment.assigned_user?.name}</AvatarFallback>
                </Avatar>
                <div>
                  <div>
                    <p className="text-sm font-medium leading-none">
                      {comment.assigned_user?.name}
                    </p>
                    <p className="text-xs text-muted-foreground py-2">
                      {comment.comment}
                    </p>
                  </div>
                  <div className="text-xs opacity-50">
                    {moment(comment.createdAt).format("YYYY-MM-DD-HH:mm")}
                  </div>
                </div>
              </div>
            </>
          ))}
        </CardContent>
      </Card>
    </>
  );
}
