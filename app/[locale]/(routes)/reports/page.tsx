import React from "react";
import Container from "../components/ui/Container";

import { BarChartDemo } from "@/components/tremor/BarChart";
import {
  getUsersByMonth,
  getUsersByMonthAndYear,
  getUsersCountOverall,
} from "@/actions/get-users";
import { AreaChartDemo } from "@/components/tremor/AreaChart";
import { getTasksByMonth } from "@/actions/projects/get-tasks";
import {
  getOpportunitiesByMonth,
  getOpportunitiesByStage,
} from "@/actions/crm/get-opportunities";
import { getTranslations } from "next-intl/server";

type Props = {};

const ReportsPage = async (props: Props) => {
  const newUsersOverall = await getUsersByMonth();
  const newUserByMonthOverall = await getUsersCountOverall();
  const newUsers = await getUsersByMonthAndYear(2023);
  const newUsers2024 = await getUsersByMonthAndYear(2024);
  const tasks = await getTasksByMonth();
  const oppsByStage = await getOpportunitiesByStage();
  const oppsByMonth = await getOpportunitiesByMonth();
  const t = await getTranslations("ReportsPage");

  //console.log("newUserByMonthOverall:", newUserByMonthOverall);
  //console.log("New users overall:", newUsersOverall);

  return (
    <Container
      title={t("title")}
      description={t("description")}
    >
      <div className="pt-5 space-y-3">
        {/*         <BarChartDemo
          chartData={newUsersOverall}
          title={"Number of new users by month (Overall)"}
        /> */}
        <BarChartDemo
          chartData={newUserByMonthOverall}
          title={t("newUsersByMonthOverallTitle")}
        />
        <AreaChartDemo
          chartData={newUserByMonthOverall}
          title={t("newUsersByMonthOverallChart")}
        />
      </div>
      <div className="pt-5 space-y-3">
        <BarChartDemo
          chartData={newUsers}
          title={t("newUsersByMonth2023Title")}
        />
        <AreaChartDemo chartData={newUsers} title={t("newUsersByMonth2023Chart")} />
      </div>
      <div className="pt-5 space-y-3">
        <BarChartDemo
          chartData={newUsers2024}
          title={t("newUsersByMonth2024Title")}
        />
        <AreaChartDemo chartData={newUsers2024} title={t("newUsersByMonth2023Chart")} />
      </div>
      <div className="pt-5">
        <BarChartDemo chartData={tasks} title={t("newTasksByMonth2023")} />
      </div>
      <div className="pt-5">
        <BarChartDemo chartData={oppsByStage} title={t("oppsBySalesStage")} />
      </div>

      <div className="pt-5">
        <BarChartDemo
          chartData={oppsByMonth}
          title={t("newOppsByMonth2023")}
        />
      </div>
    </Container>
  );
};

export default ReportsPage;
