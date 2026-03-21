// app/[locale]/(routes)/profile/components/tabs/ProfileTabContent.tsx
import { Users } from "@prisma/client";
import { getTranslations } from "next-intl/server";
import { ProfilePhotoForm } from "../ProfilePhotoForm";
import { ProfileForm } from "../ProfileForm";

type Props = { data: Users };

export async function ProfileTabContent({ data }: Props) {
  const t = await getTranslations("ProfilePage");
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card p-5">
        <h3 className="mb-4 text-sm font-semibold text-card-foreground">
          {t("cards.photo")}
        </h3>
        <ProfilePhotoForm data={data} />
      </div>
      <div className="rounded-lg border border-border bg-card p-5">
        <h3 className="mb-4 text-sm font-semibold text-card-foreground">
          {t("cards.personalInfo")}
        </h3>
        <ProfileForm data={data} />
      </div>
    </div>
  );
}
