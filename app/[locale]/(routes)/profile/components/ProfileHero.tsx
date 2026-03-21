// app/[locale]/(routes)/profile/components/ProfileHero.tsx
import { Users } from "@prisma/client";
import { getTranslations } from "next-intl/server";
import { ProfileHeroAvatar } from "./ProfileHeroAvatar";

type Props = {
  data: Users;
};

export async function ProfileHero({ data }: Props) {
  const t = await getTranslations("ProfilePage");

  return (
    <div className="bg-gradient-to-r from-blue-500 to-violet-600 px-7 py-6 flex items-center gap-4">
      <ProfileHeroAvatar avatar={data.avatar} name={data.name} />
      <div>
        <div className="text-white text-lg font-bold leading-tight">
          {data.name}
        </div>
        <div className="text-white/75 text-sm">{data.email}</div>
        <span className="mt-1.5 inline-block rounded-full bg-white/20 px-2 py-0.5 text-xs font-semibold text-white">
          {t("hero.role")}
        </span>
      </div>
    </div>
  );
}
