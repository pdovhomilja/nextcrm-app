// app/[locale]/(routes)/profile/components/tabs/PreferencesTabContent.tsx
import { getTranslations } from "next-intl/server";
import { LanguageForm } from "../LanguageForm";

type Props = { userId: string };

export async function PreferencesTabContent({ userId }: Props) {
  const t = await getTranslations("ProfilePage");
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <h3 className="mb-4 text-sm font-semibold text-card-foreground">
        {t("cards.language")}
      </h3>
      <LanguageForm userId={userId} />
    </div>
  );
}
