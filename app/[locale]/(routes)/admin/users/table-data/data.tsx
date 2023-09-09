import { StopIcon, PauseIcon, PlayIcon } from "@radix-ui/react-icons";

export const statuses = [
  {
    value: "ACTIVE",
    label: "Active",
    icon: PlayIcon,
  },
  {
    value: "INACTIVE",
    label: "Inactive",
    icon: StopIcon,
  },
  {
    value: "PENDING",
    label: "Pending",
    icon: PauseIcon,
  },
];
export const isAdmin = [
  {
    value: "true",
    label: "True",
    icon: PlayIcon,
  },
  {
    value: "false",
    label: "False",
    icon: StopIcon,
  },
];
