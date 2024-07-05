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

type Props = {};

const ReportsPage = async (props: Props) => {
  const newUsersOverall = await getUsersByMonth();
  const newUserByMonthOverall = await getUsersCountOverall();
  const newUsers = await getUsersByMonthAndYear(2023);
  const newUsers2024 = await getUsersByMonthAndYear(2024);
  const tasks = await getTasksByMonth();
  const oppsByStage = await getOpportunitiesByStage();
  const oppsByMonth = await getOpportunitiesByMonth();

  //console.log("newUserByMonthOverall:", newUserByMonthOverall);
  //console.log("New users overall:", newUsersOverall);

  return (
    <Container
      title="Reports"
      description={
        "Here will be predefined reports for every module. We use Tremor for data visualization."
      }
    >
      <div className="pt-5 space-y-3">
        {/*         <BarChartDemo
          chartData={newUsersOverall}
          title={"Number of new users by month (Overall)"}
        /> */}
        <BarChartDemo
          chartData={newUserByMonthOverall}
          title={"Number of new users by month (Overall)"}
        />
        <AreaChartDemo
          chartData={newUserByMonthOverall}
          title={"New users by month (Overall)"}
        />
      </div>
      <div className="pt-5 space-y-3">
        <BarChartDemo
          chartData={newUsers}
          title={"Number of new users by month (2023)"}
        />
        <AreaChartDemo chartData={newUsers} title={"New users by month"} />
      </div>
      <div className="pt-5 space-y-3">
        <BarChartDemo
          chartData={newUsers2024}
          title={"Number of new users by month (2024)"}
        />
        <AreaChartDemo chartData={newUsers2024} title={"New users by month"} />
      </div>
      <div className="pt-5">
        <BarChartDemo chartData={tasks} title={"New tasks by month (2023)"} />
      </div>
      <div className="pt-5">
        <BarChartDemo chartData={oppsByStage} title={"Opps by sales stage"} />
      </div>

      <div className="pt-5">
        <BarChartDemo
          chartData={oppsByMonth}
          title={"New Opps by month (2023)"}
        />
      </div>
    </Container>
  );
};

export default ReportsPage;
