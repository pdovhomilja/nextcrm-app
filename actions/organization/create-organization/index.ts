"use server";

import { prismadb } from "@/lib/prisma";
import { CreateOrganization } from "./schema";
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

  if (user.organizationId) {
    return {
      error: "User already belongs to an organization.",
    };
  }

  const { name, slug } = data;

  if (!name || !slug) {
    return {
      error: "Please fill in all the required fields.",
    };
  }

  try {
    const existingOrg = await prismadb.organizations.findUnique({
      where: {
        slug: slug,
      },
    });

    if (existingOrg) {
      return {
        error: "An organization with this slug already exists.",
      };
    }

    const organization = await prismadb.organizations.create({
      data: {
        v: 0,
        name,
        slug,
        ownerId: user.id,
        plan: "FREE",
        status: "ACTIVE",
      },
    });

    await prismadb.users.update({
      where: {
        id: user.id,
      },
      data: {
        organizationId: organization.id,
      },
    });

    return {
      data: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
      }
    };
  } catch (error) {
    console.log(error);
    return {
      error: "Something went wrong while creating the organization. Please try again.",
    };
  }
};

export const createOrganization = createSafeAction(CreateOrganization, handler);
