"use client";

import { Card, Title, BarChart, Subtitle } from "@tremor/react";

const dataFormatter = (number: number) => {
  return Intl.NumberFormat("us").format(number).toString();
};

export const BarChartDemo = ({ chartData }: any) => {
  return (
    <Card className="rounded-md">
      <Title>Number of new users by month (2021)</Title>

      <BarChart
        className="mt-6"
        data={chartData}
        index="name"
        categories={["Number"]}
        colors={["orange"]}
        valueFormatter={dataFormatter}
        yAxisWidth={48}
      />
    </Card>
  );
};
