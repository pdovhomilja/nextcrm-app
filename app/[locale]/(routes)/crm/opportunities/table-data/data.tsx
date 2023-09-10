import {
  CircleIcon,
  QuestionMarkCircledIcon,
  StopwatchIcon,
} from "@radix-ui/react-icons";

export const statuses = [
  {
    value: "ACTIVE",
    label: "Active",
    icon: QuestionMarkCircledIcon,
  },
  {
    value: "INACTIVE",
    label: "Inactive",
    icon: CircleIcon,
  },
  {
    value: "PENDING",
    label: "Pending",
    icon: CircleIcon,
  },
  {
    value: "CLOSED",
    label: "Closed",
    icon: StopwatchIcon,
  },
];
