"use client";

import { Button } from "@/components/ui/button";
import { Icons } from "@/components/ui/icons";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import axios from "axios";
import React from "react";

const OnTestButton = () => {
  const [loading, setLoading] = React.useState(false);
  const { toast } = useToast();

  async function onTest() {
    setLoading(true);
    try {
      const response = await axios.get("/api/cron/send-daily-task-ai");
      //console.log(response, "response");
      toast({
        title: "GPT model tested",
        description: response.data.message,
      });
    } catch (error) {
      console.log(error);
      toast({
        variant: "destructive",
        title: "GPT model test failed",
      });
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className="flex flex-col space-y-2">
      <Label>Send test</Label>
      <Button onClick={onTest} disabled={loading}>
        {loading ? <Icons.spinner className="animate-spin" /> : "Test"}
      </Button>
    </div>
  );
};

export default OnTestButton;
