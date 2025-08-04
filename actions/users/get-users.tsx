import db from "@/lib/db";

export const getUsers = async () => {
  const users = await db.user.findMany();
  return users;
};
