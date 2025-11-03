"use server";

import { prismadb } from "@/lib/prisma";
import { UpdateOrganization } from "./schema";
import { InputType, ReturnType } from "./types";
import { createSafeAction } from "@/lib/create-safe-action";
import { getServerSession, Session } from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = async (data: InputType): Promise<ReturnType> => {
  const session: Session | null = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return {
      error: "User not logged in.",
    };
  }

  const user = await prismadb.users.findUnique({
    where: {
      email: session?.user?.email,
    },
  });

  if (!user) {
    return {
      error: "User not found.",
    };
  }

  if (!user.organizationId) {
    return {
      error: "User does not belong to an organization.",
    };
  }

  const organization = await prismadb.organizations.findUnique({
    where: {
      id: user.organizationId,
    },
  });

  if (!organization) {
    return {
      error: "Organization not found.",
    };
  }

  if (organization.ownerId !== user.id && !user.is_admin) {
    return {
      error: "You do not have permission to update this organization.",
    };
  }

  const { name } = data;

  if (!name) {
    return {
      error: "Please fill in all the required fields.",
    };
  }

  try {
    const updatedOrganization = await prismadb.organizations.update({
      where: {
        id: organization.id,
      },
      data: {
        name,
      },
    });

    return {
      data: {
        name: updatedOrganization.name,
      }
    };
  } catch (error) {
    console.log(error);
    return {
      error: "Something went wrong while updating the organization. Please try again.",
    };
  }
};

export const updateOrganization = createSafeAction(UpdateOrganization, handler);
