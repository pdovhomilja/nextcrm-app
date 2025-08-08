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
      <div className="flex-1">
        <div className="p-4 md:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <ProjectInsights boardId="default" analysisType="comprehensive" />
            </div>
            <div className="lg:col-span-1">
              <SmartSuggestions
                suggestionType="general"
                autoRefresh
                className="shadow-sm"
              />
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
