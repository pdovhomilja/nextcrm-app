// app/[locale]/(routes)/profile/components/ProfileHero.tsx
import { Users } from "@prisma/client";
import { getTranslations } from "next-intl/server";

type Props = {
  data: Users;
};

export async function ProfileHero({ data }: Props) {
  const t = await getTranslations("ProfilePage");

  const initials = [data.name]
    .filter(Boolean)
    .join(" ")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="bg-gradient-to-r from-blue-500 to-violet-600 px-7 py-6 flex items-center gap-4">
      <div className="h-16 w-16 rounded-full bg-white/25 border-2 border-white/50 flex items-center justify-center text-white text-xl font-bold flex-shrink-0 overflow-hidden">
        {data.avatar ? (
          <img
            src={data.avatar}
            alt={data.name ?? ""}
            className="h-full w-full object-cover"
          />
        ) : (
          initials || "?"
        )}
      </div>
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
