"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { setLanguage } from "@/actions/user/set-language";

export function LanguageForm({ userId }: { userId: string }) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const t = useTranslations("LanguageSelector");

  const languages = [
    { label: t("english"), value: "en" },
    { label: t("czech"), value: "cz" },
    { label: t("german"), value: "de" },
    { label: t("ukrainian"), value: "uk" },
  ];

  async function handleChange(language: string) {
    setIsLoading(true);
    try {
      const result = await setLanguage({ userId, language });
      if (result.error) {
        toast({
          title: t("error"),
          description: result.error,
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }
      toast({ title: t("success"), description: t("changedTo", { language }) });
      router.replace(pathname, { locale: language });
    } catch (e) {
      toast({
        title: t("error"),
        description: t("error"),
        variant: "destructive",
      });
      setIsLoading(false);
    }
  }

  return (
    <div className="flex space-x-5 w-full p-5 items-end">
      <Select defaultValue={locale} onValueChange={handleChange} disabled={isLoading}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder={t("selectPlaceholder")} />
        </SelectTrigger>
        <SelectContent>
          {languages.map((lang) => (
            <SelectItem key={lang.value} value={lang.value}>
              {lang.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
