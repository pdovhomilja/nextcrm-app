"use server";

import { prismadb } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const updateModel = async (model: any) => {
  const session = await getServerSession(authOptions);
  if (!session) {
    return { error: "Unauthenticated" };
  }
  if (!session.user.isAdmin) {
    return { error: "Forbidden" };
  }

  await prismadb.gpt_models.updateMany({
    data: {
      status: "INACTIVE",
    },
  });

  const setCronGPT = await prismadb.gpt_models.update({
    where: {
      id: model,
    },
    data: {
      status: "ACTIVE",
    },
  });
  console.log("change GPT model to:", setCronGPT);
};

export default updateModel;
