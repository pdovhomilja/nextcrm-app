"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Handshake, Loader2 } from "lucide-react";
import { convertTargetToDeal } from "@/actions/crm/targets/convert-target-to-deal";

const ConvertToDealButton = ({ targetId }: { targetId: string }) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleConvert = async () => {
    setIsLoading(true);
    try {
      const res = await convertTargetToDeal(targetId);
      if ("error" in res) {
        toast.error(res.error);
      } else {
        toast.success("Target converted — deal created.");
        router.push(`/crm/opportunities/${res.opportunityId}`);
      }
    } catch (error) {
      toast.error("Failed to convert target.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={handleConvert} disabled={isLoading}>
      {isLoading ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <Handshake className="h-4 w-4 mr-2" />
      )}
      Convert to deal
    </Button>
  );
};

export default ConvertToDealButton;
