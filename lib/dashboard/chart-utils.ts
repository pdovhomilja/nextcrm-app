/**
 * Utility functions for dashboard charts
 */

export type ChartColorConfig = {
  [key: string]: {
    label: string;
    color: string;
  };
};

export const defaultChartColors: ChartColorConfig = {
  primary: {
    label: "Primary",
    color: "hsl(var(--chart-1))",
  },
  secondary: {
    label: "Secondary",
    color: "hsl(var(--chart-2))",
  },
  tertiary: {
    label: "Tertiary",
    color: "hsl(var(--chart-3))",
  },
  quaternary: {
    label: "Quaternary",
    color: "hsl(var(--chart-4))",
  },
  quinary: {
    label: "Quinary",
    color: "hsl(var(--chart-5))",
  },
};

export const taskStatusColors: ChartColorConfig = {
  NEW: {
    label: "New",
    color: "hsl(var(--chart-1))",
  },
  IN_PROGRESS: {
    label: "In Progress",
    color: "hsl(var(--chart-2))",
  },
  ON_HOLD: {
    label: "On Hold",
    color: "hsl(var(--chart-3))",
  },
  COMPLETED: {
    label: "Completed",
    color: "hsl(var(--chart-4))",
  },
  CANCELLED: {
    label: "Cancelled",
    color: "hsl(var(--chart-5))",
  },
};

export const taskPriorityColors: ChartColorConfig = {
  LOW: {
    label: "Low",
    color: "hsl(142 76% 36%)", // Green
  },
  MEDIUM: {
    label: "Medium",
    color: "hsl(45 93% 47%)", // Yellow
  },
  HIGH: {
    label: "High",
    color: "hsl(21 90% 48%)", // Orange
  },
  CRITICAL: {
    label: "Critical",
    color: "hsl(0 84% 60%)", // Red
  },
};

/**
 * Format date for chart display based on granularity
 */
export function formatChartDate(
  date: Date,
  granularity: "day" | "week" | "month",
): string {
  switch (granularity) {
    case "day":
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    case "week":
      return `Week of ${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
    case "month":
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
      });
    default:
      return date.toLocaleDateString();
  }
}

/**
 * Calculate percentage change between two values
 */
export function calculatePercentageChange(
  current: number,
  previous: number,
): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

/**
 * Calculate trend direction and magnitude
 */
export function calculateTrend(data: number[]): {
  direction: "up" | "down" | "flat";
  magnitude: number;
} {
  if (data.length < 2) return { direction: "flat", magnitude: 0 };

  const firstHalf = data.slice(0, Math.floor(data.length / 2));
  const secondHalf = data.slice(Math.floor(data.length / 2));

  const firstAvg =
    firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
  const secondAvg =
    secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;

  const change = calculatePercentageChange(secondAvg, firstAvg);

  return {
    direction: change > 5 ? "up" : change < -5 ? "down" : "flat",
    magnitude: Math.abs(change),
  };
}

/**
 * Generate date intervals for chart data
 */
export function generateDateIntervals(
  startDate: Date,
  endDate: Date,
  granularity: "day" | "week" | "month",
): { start: Date; end: Date; label: string }[] {
  const intervals: { start: Date; end: Date; label: string }[] = [];
  const current = new Date(startDate);

  while (current < endDate) {
    const intervalStart = new Date(current);
    let intervalEnd: Date;

    switch (granularity) {
      case "day":
        intervalEnd = new Date(current);
        intervalEnd.setDate(intervalEnd.getDate() + 1);
        break;
      case "week":
        intervalEnd = new Date(current);
        intervalEnd.setDate(intervalEnd.getDate() + 7);
        break;
      case "month":
        intervalEnd = new Date(current);
        intervalEnd.setMonth(intervalEnd.getMonth() + 1);
        break;
    }

    intervals.push({
      start: intervalStart,
      end: intervalEnd,
      label: formatChartDate(intervalStart, granularity),
    });

    current.setTime(intervalEnd.getTime());
  }

  return intervals;
}
