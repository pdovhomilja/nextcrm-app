import db from "@/lib/db";

export const getUsers = async () => {
  const users = await db.user.findMany();
  return users;
};

export const getUsersByCompanyMembership = async (companyId: string) => {
  const users = await db.user.findMany({
    where: {
      memberships: {
        some: {
          companyId: companyId,
        },
      },
    },
    include: {
      memberships: {
        where: {
          companyId: companyId,
        },
      },
    },
  });
  return users;
};
