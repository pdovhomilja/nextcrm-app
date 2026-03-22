"use client";

import { createContext, useContext, useState } from "react";

interface AvatarContextValue {
  avatar: string;
  setAvatar: (url: string) => void;
}

const AvatarContext = createContext<AvatarContextValue | null>(null);

export function AvatarProvider({
  initialAvatar,
  children,
}: {
  initialAvatar?: string | null;
  children: React.ReactNode;
}) {
  const [avatar, setAvatar] = useState(initialAvatar ?? "");
  return (
    <AvatarContext.Provider value={{ avatar, setAvatar }}>
      {children}
    </AvatarContext.Provider>
  );
}

export function useAvatarContext() {
  const ctx = useContext(AvatarContext);
  if (!ctx) throw new Error("useAvatarContext must be used within AvatarProvider");
  return ctx;
}
