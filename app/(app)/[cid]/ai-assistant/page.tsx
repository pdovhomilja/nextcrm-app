import React from "react";
import { SidebarInset } from "@/components/ui/sidebar";
import { SiteHeader } from "@/components/site-header";
import { AIAssistant } from "@/components/ai/ai-assistant";
import { SmartSuggestions } from "@/components/ai/smart-suggestions";
import { ProjectInsights } from "@/components/ai/project-insights";

const AIAssistantPage = () => {
  return (
    <SidebarInset>
      <SiteHeader title="AI Assistant">
        <div className="flex items-center gap-2">{/* Nav buttons */}</div>
      </SiteHeader>
      <div className="flex flex-1 flex-col border-black">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <div className="flex flex-col gap-4 p-4">
              <div className="flex justify-end">{/* Nav buttons */}</div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <ProjectInsights
                    boardId="default"
                    analysisType="comprehensive"
                  />
                </div>
                <div>
                  <SmartSuggestions suggestionType="general" autoRefresh />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Floating chat */}
      <AIAssistant />
    </SidebarInset>
  );
};

export default AIAssistantPage;
