"use client";

import { Button } from "@/components/ui/button";
import React, { useState } from "react";
import { runCronJob } from "@/actions/cron/get-invoice-from-mail";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

const CronButton = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const runCron = async () => {
    try {
      setIsLoading(true);
      const response = await runCronJob();
      toast.success(response.message);
    } catch (error) {
      console.log(error);
    } finally {
      setIsLoading(false);
      router.refresh();
    }
  };

  return (
    <Button onClick={runCron}>
      {isLoading ? (
        <div className="flex gap-2">
          Checking ....
          <Loader2 className="animate-spin" />
        </div>
      ) : (
        "Check for new invoices"
      )}
    </Button>
  );
};

export default CronButton;
