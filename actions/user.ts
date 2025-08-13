"use server";

import db from "@/lib/db";

export async function getUserById(userId: string) {
  const user = await db.user.findUnique({
    where: {
      id: userId,
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  return user;
}

export async function getUserByEmail(email: string) {
  //console.log(email, "email from function");
  const user = await db.user.findUnique({
    where: {
      email,
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  return user;
}

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
