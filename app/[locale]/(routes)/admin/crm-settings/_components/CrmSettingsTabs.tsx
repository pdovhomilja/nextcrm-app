"use client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslations } from "next-intl";
import { ConfigList } from "./ConfigList";
import { ProductCategoriesTab } from "./ProductCategoriesTab";
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
  const at = useTranslations("AdminPage");
  return (
    <Tabs defaultValue={tabs[0]?.key}>
      <TabsList className="flex-wrap h-auto gap-1">
        {tabs.map((t) => (
          <TabsTrigger key={t.key} value={t.key}>{t.label}</TabsTrigger>
        ))}
        <TabsTrigger value="productCategories">{at("productCategories")}</TabsTrigger>
      </TabsList>
      {tabs.map((t) => (
        <TabsContent key={t.key} value={t.key} className="mt-6">
          <ConfigList configType={t.key} label={t.label} values={t.values} />
        </TabsContent>
      ))}
      <TabsContent value="productCategories" className="mt-6">
        <ProductCategoriesTab />
      </TabsContent>
    </Tabs>
  );
}
