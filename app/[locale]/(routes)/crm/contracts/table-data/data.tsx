import {
  CircleIcon,
  QuestionMarkCircledIcon,
  StopwatchIcon,
} from "@radix-ui/react-icons";
import { PenLineIcon, Rotate3D } from "lucide-react";

export const statuses = [
  {
    value: "NOTSTARTED",
    label: "Not started",
    icon: QuestionMarkCircledIcon,
  },
  {
    value: "INPROGRESS",
    label: "In progress",
    icon: Rotate3D,
  },
  {
    value: "SIGNED",
    label: "Signed",
    icon: PenLineIcon,
  },
];
