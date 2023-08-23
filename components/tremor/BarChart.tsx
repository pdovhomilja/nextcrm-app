"use client";

import { Card, Title, BarChart, Subtitle } from "@tremor/react";

const dataFormatter = (number: number) => {
  // return number no decimal places
  return number.toFixed(0);
};

export const BarChartDemo = ({ chartData, title }: any) => {
  return (
    <Card className="rounded-md">
      <Title>{title}</Title>

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
