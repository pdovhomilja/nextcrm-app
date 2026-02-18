import { prismadb } from "@/lib/prisma";

export const getOpportunities = async () => {
  const data = await prismadb.crm_Opportunities.findMany({
    include: {
      // Include assigned user (uses "assigned_to_user_relation")
      assigned_to_user: {
        select: {
          avatar: true,
          name: true,
        },
      },
      // Include created by user (uses "created_by_user_relation")
      created_by_user: {
        select: {
          name: true,
        },
      },
      // Include contacts through ContactsToOpportunities junction table
      contacts: {
        include: {
          contact: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
            },
          },
        },
      },
      // Include documents through DocumentsToOpportunities junction table
      documents: {
        include: {
          document: {
            select: {
              id: true,
              document_name: true,
            },
          },
        },
      },
    },
  });
  return data;
};

//Get opportunities by month for chart
export const getOpportunitiesByMonth = async () => {
  const opportunities = await prismadb.crm_Opportunities.findMany({
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
  const opportunities = await prismadb.crm_Opportunities.findMany({
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
