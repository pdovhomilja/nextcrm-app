"use server";

import { cache } from "react";
import db from "@/lib/db";

export const getUserById = cache(async (userId: string) => {
  const user = await db.user.findUnique({
    where: {
      id: userId,
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  return user;
});

export const getUserByEmail = cache(async (email: string) => {
  const user = await db.user.findUnique({
    where: {
      email,
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  return user;
});

export async function getAdmins() {
  const admins = await db.user.findMany({
    where: {
      role: "ADMIN",
    },
  });

  if (!admins) {
    throw new Error("Admins not found");
  }

  return admins;
}
