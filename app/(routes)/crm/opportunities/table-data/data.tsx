import {
  CircleIcon,
  QuestionMarkCircledIcon,
  StopwatchIcon,
} from "@radix-ui/react-icons";

export const statuses = [
  {
    value: "Active",
    label: "Active",
    icon: QuestionMarkCircledIcon,
  },
  {
    value: "Inactive",
    label: "Inactive",
    icon: CircleIcon,
  },
  {
    value: "Closed",
    label: "Closed",
    icon: StopwatchIcon,
  },
];
