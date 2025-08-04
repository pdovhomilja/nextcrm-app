"use server";

import db from "@/lib/db";

export async function getUserById(userId: string) {
  const user = await db.user.findUnique({
    where: {
      id: userId,
    },
  });
  return user;
}

export async function getUserByEmail(email: string) {
  //console.log(email, "email from function");
  const user = await db.user.findUnique({
    where: {
      email,
    },
  });

  return user;
}

export async function getAdmins() {
  const admins = await db.user.findMany({
    where: {
      role: "ADMIN",
    },
  });
  return admins;
}
