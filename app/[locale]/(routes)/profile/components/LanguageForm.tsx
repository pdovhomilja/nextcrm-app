"use client";

import { useState } from "react";
import axios from "axios";
import { useLocale } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";

const languages = [
  { label: "English", value: "en" },
  { label: "Czech", value: "cz" },
  { label: "German", value: "de" },
  { label: "Ukrainian", value: "uk" },
];

export function LanguageForm({ userId }: { userId: string }) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  async function handleChange(language: string) {
    setIsLoading(true);
    try {
      await axios.put(`/api/user/${userId}/set-language`, { language });
      toast({ title: "Success", description: "Language changed to: " + language });
      router.replace(pathname, { locale: language });
    } catch (e) {
      toast({
        title: "Error",
        description: "Something went wrong.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  }

  return (
    <div className="flex space-x-5 w-full p-5 items-end">
      <Select defaultValue={locale} onValueChange={handleChange} disabled={isLoading}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Select language" />
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
