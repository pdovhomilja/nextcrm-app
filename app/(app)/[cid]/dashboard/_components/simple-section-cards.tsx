import { IconTrendingUp } from "@tabler/icons-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function SimpleSectionCards() {
  const dataProjects = {
    description: "Total Projects",
    value: "1,234",
    trend: "+12.5%",
  };
  const dataTasks = {
    description: "Total Tasks",
    value: "1,234",
    trend: "+12.5%",
  };
  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <SimpleSectionCard {...dataProjects} />
      <SimpleSectionCard {...dataTasks} />
    </div>
  );
}

const SimpleSectionCard = ({
  description,
  value,
  trend,
}: {
  description: string;
  value: string;
  trend: string;
}) => {
  return (
    <Card className="@container/card">
      <CardHeader>
        <CardDescription>{description}</CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
          {value}
        </CardTitle>
        <CardAction>
          {trend && (
            <Badge variant="outline">
              <IconTrendingUp />
              {trend}
            </Badge>
          )}
        </CardAction>
      </CardHeader>
      <CardFooter className="flex-col items-start gap-1.5 text-sm">
        {trend && (
          <div className="line-clamp-1 flex gap-2 font-medium">
            {trend} <IconTrendingUp className="size-4" />
          </div>
        )}
        <div className="text-muted-foreground">{description}</div>
      </CardFooter>
    </Card>
  );
};