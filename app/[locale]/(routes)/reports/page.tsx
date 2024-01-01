import Heading from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import React from "react";
import Container from "../components/ui/Container";

import { BarChartDemo } from "@/components/tremor/BarChart";
import { getUsersByMonth } from "@/actions/get-users";
import { AreaChartDemo } from "@/components/tremor/AreaChart";
import { getTasksByMonth } from "@/actions/projects/get-tasks";
import {
  getOpportunitiesByMonth,
  getOpportunitiesByStage,
} from "@/actions/crm/get-opportunities";

type Props = {};

const ReportsPage = async (props: Props) => {
  const newUsers = await getUsersByMonth(2023);
  const newUsers2024 = await getUsersByMonth(2024);
  const tasks = await getTasksByMonth();
  const oppsByStage = await getOpportunitiesByStage();
  const oppsByMonth = await getOpportunitiesByMonth();

  console.log(oppsByStage);

  return (
    <Container
      title="Reports"
      description={
        "Here will be predefined reports for every module. We use Tremor for data visualization."
      }
    >
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
