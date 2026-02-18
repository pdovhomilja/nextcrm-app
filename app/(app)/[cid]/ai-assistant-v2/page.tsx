import dynamic from "next/dynamic";
import { SidebarInset } from "@/components/ui/sidebar";
import { SiteHeader } from "@/components/site-header";
import { Skeleton } from "@/components/ui/skeleton";

const AIAssistantContent = dynamic(
  () => import("./_components/ai-assistant-content"),
  {
    loading: () => (
      <SidebarInset>
        <SiteHeader title="AI Assistant">
          <div />
        </SiteHeader>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <Skeleton className="h-16 w-16 rounded-full mx-auto" />
            <Skeleton className="h-6 w-48 mx-auto" />
            <Skeleton className="h-4 w-64 mx-auto" />
          </div>
        </div>
      </SidebarInset>
    ),
  },
);

interface AIAssistantV2PageProps {
  params: Promise<{ cid: string }>;
}

export default async function AIAssistantV2Page({
  params,
}: AIAssistantV2PageProps) {
  const { cid } = await params;

  return <AIAssistantContent cid={cid} />;
}
