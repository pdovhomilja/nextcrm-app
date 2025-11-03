"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prismadb } from "@/lib/prisma";

export const getOpportunities = async () => {
  const session = await getServerSession(authOptions);

  if (!session?.user?.organizationId) {
    throw new Error("Unauthorized: No organization context");
  }

  const data = await prismadb.crm_Opportunities.findMany({
    where: {
      organizationId: session.user.organizationId,
    },
    include: {
      assigned_to_user: {
        select: {
          avatar: true,
          name: true,
        },
      },
    },
  });
  return data;
};

//Get opportunities by month for chart
export const getOpportunitiesByMonth = async () => {
  const session = await getServerSession(authOptions);

  if (!session?.user?.organizationId) {
    throw new Error("Unauthorized: No organization context");
  }

  const opportunities = await prismadb.crm_Opportunities.findMany({
    where: {
      organizationId: session.user.organizationId,
    },
    select: {
      created_on: true,
    },
  });

  if (!opportunities) {
    return {};
  }

  const opportunitiesByMonth = opportunities.reduce(
    (acc: any, opportunity: any) => {
      const month = new Date(opportunity.created_on).toLocaleString("default", {
        month: "long",
      });
      acc[month] = (acc[month] || 0) + 1;
      return acc;
    },
    {}
  );

  const chartData = Object.keys(opportunitiesByMonth).map((month: any) => {
    return {
      name: month,
      Number: opportunitiesByMonth[month],
    };
  });

  return chartData;
};

//Get opportunities by sales_stage name for chart
export const getOpportunitiesByStage = async () => {
  const session = await getServerSession(authOptions);

  if (!session?.user?.organizationId) {
    throw new Error("Unauthorized: No organization context");
  }

  const opportunities = await prismadb.crm_Opportunities.findMany({
    where: {
      organizationId: session.user.organizationId,
    },
    select: {
      assigned_sales_stage: {
        select: {
          name: true,
        },
      },
    },
  });

  console.log(opportunities, "opportunities");
  if (!opportunities) {
    return {};
  }

  const opportunitiesByStage = opportunities.reduce(
    (acc: any, opportunity: any) => {
      const stage = opportunity.assigned_sales_stage?.name;
      acc[stage] = (acc[stage] || 0) + 1;
      return acc;
    },
    {}
  );

  const chartData = Object.keys(opportunitiesByStage).map((stage: any) => {
    return {
      name: stage,
      Number: opportunitiesByStage[stage],
    };
  });

  return chartData;
};
