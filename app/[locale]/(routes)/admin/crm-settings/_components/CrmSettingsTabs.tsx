"use client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfigList } from "./ConfigList";
import type { CrmConfigType, ConfigValue } from "../_actions/crm-settings";

type TabConfig = {
  key: CrmConfigType;
  label: string;
  values: ConfigValue[];
};

interface Props {
  tabs: TabConfig[];
}

export function CrmSettingsTabs({ tabs }: Props) {
  return (
    <Tabs defaultValue={tabs[0]?.key}>
      <TabsList className="flex-wrap h-auto gap-1">
        {tabs.map((t) => (
          <TabsTrigger key={t.key} value={t.key}>{t.label}</TabsTrigger>
        ))}
      </TabsList>
      {tabs.map((t) => (
        <TabsContent key={t.key} value={t.key} className="mt-6">
          <ConfigList configType={t.key} label={t.label} values={t.values} />
        </TabsContent>
      ))}
    </Tabs>
  );
}
