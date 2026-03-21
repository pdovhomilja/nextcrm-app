"use client";

import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import useAvatarStore from "@/store/useAvatarStore";

type Props = {
  avatar: string | null;
  name: string | null;
};

export function ProfileHeroAvatar({ avatar, name }: Props) {
  const getAvatar = useAvatarStore((state) => state.avatar);
  const setAvatar = useAvatarStore((state) => state.setAvatar);
  const [currentAvatar, setCurrentAvatar] = useState(getAvatar || avatar);

  useEffect(() => {
    if (avatar) setAvatar(avatar);
  }, [avatar, setAvatar]);

  useEffect(() => {
    setCurrentAvatar(getAvatar || avatar);
  }, [getAvatar, avatar]);

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
