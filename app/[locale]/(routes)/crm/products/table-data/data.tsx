import {
  BoxIcon,
  WrenchIcon,
  FileEditIcon,
  CheckCircle2Icon,
  ArchiveIcon,
  CalendarIcon,
  CalendarDaysIcon,
  CalendarRangeIcon,
  TimerIcon,
} from "lucide-react";

export const productTypes = [
  {
    value: "PRODUCT",
    label: "Product",
    icon: BoxIcon,
  },
  {
    value: "SERVICE",
    label: "Service",
    icon: WrenchIcon,
  },
];

export const productStatuses = [
  {
    value: "DRAFT",
    label: "Draft",
    icon: FileEditIcon,
  },
  {
    value: "ACTIVE",
    label: "Active",
    icon: CheckCircle2Icon,
  },
  {
    value: "ARCHIVED",
    label: "Archived",
    icon: ArchiveIcon,
  },
];

export const billingPeriods = [
  {
    value: "MONTHLY",
    label: "Monthly",
    icon: CalendarIcon,
  },
  {
    value: "QUARTERLY",
    label: "Quarterly",
    icon: CalendarDaysIcon,
  },
  {
    value: "ANNUALLY",
    label: "Annually",
    icon: CalendarRangeIcon,
  },
  {
    value: "ONE_TIME",
    label: "One Time",
    icon: TimerIcon,
  },
];
