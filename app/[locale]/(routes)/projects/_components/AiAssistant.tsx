"use client";

import { useState } from "react";

import { getUserAiTasks } from "@/actions/cron/get-user-ai-tasks";

import { Icons } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

const AiAssistant = ({ session }: { session: any }) => {
  const [loading, setLoading] = useState(false);

  const { toast } = useToast();

  const handleAiAssistant = async () => {
    setLoading(true);
    try {
      await getUserAiTasks(session);
      toast({
        title: "Success",
        description: "AI Assistant just send your report to your mailbox",
      });
    } catch (error) {
      console.log(error, "error from AI Assistant");
      toast({
        variant: "destructive",
        title: "Error",
        description: "Something went wrong, please try again",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={handleAiAssistant} disabled={loading}>
      {loading ? (
        <span className="flex items-center gap-2">
          Creating report <Icons.spinner className="animate-spin" />
        </span>
      ) : (
        "AI Assistant"
      )}
    </Button>
  );
};

export default AiAssistant;
