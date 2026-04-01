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
export const roles = [
  {
    value: "admin",
    label: "Admin",
    icon: PlayIcon,
  },
  {
    value: "member",
    label: "Member",
    icon: PauseIcon,
  },
  {
    value: "viewer",
    label: "Viewer",
    icon: StopIcon,
  },
];
