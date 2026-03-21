"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAvatarContext } from "@/context/avatar-context";

type Props = {
  avatar: string | null;
  name: string | null;
};

export function ProfileHeroAvatar({ avatar, name }: Props) {
  const { avatar: contextAvatar } = useAvatarContext();
  const currentAvatar = contextAvatar || avatar;

  const initials = name
    ? name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  return (
    <Avatar className="h-16 w-16 rounded-full border-2 border-white/50 flex-shrink-0">
      <AvatarImage
        src={currentAvatar ?? undefined}
        alt={name ?? "User avatar"}
        className="object-cover"
      />
      <AvatarFallback className="bg-white/25 text-white text-xl font-bold rounded-full">
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
