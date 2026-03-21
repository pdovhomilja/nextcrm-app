// app/[locale]/(routes)/profile/components/tabs/SecurityTabContent.tsx
import { getTranslations } from "next-intl/server";
import { PasswordChangeForm } from "../PasswordChange";

type Props = { userId: string };

export async function SecurityTabContent({ userId }: Props) {
  const t = await getTranslations("ProfilePage");
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <h3 className="mb-4 text-sm font-semibold text-card-foreground">
        {t("cards.changePassword")}
      </h3>
      <PasswordChangeForm userId={userId} />
    </div>
  );
}
