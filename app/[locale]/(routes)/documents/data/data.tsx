import {
  CheckCircledIcon,
  CircleIcon,
  CrossCircledIcon,
  StopwatchIcon,
} from "@radix-ui/react-icons";

export const labels = [
  { value: "bug", label: "Bug" },
  { value: "feature", label: "Feature" },
  { value: "documentation", label: "Documentation" },
];

export const documentSystemTypes = [
  { value: "RECEIPT", label: "Receipt" },
  { value: "CONTRACT", label: "Contract" },
  { value: "OFFER", label: "Offer" },
  { value: "OTHER", label: "Other" },
];

export const processingStatuses = [
  { value: "PENDING", label: "Pending", icon: CircleIcon },
  { value: "PROCESSING", label: "Processing", icon: StopwatchIcon },
  { value: "READY", label: "Ready", icon: CheckCircledIcon },
  { value: "FAILED", label: "Failed", icon: CrossCircledIcon },
];

// Keep legacy exports for any remaining references
export const statuses = processingStatuses;
export const priorities = [
  { label: "Low", value: "low" },
  { label: "Normal", value: "normal" },
  { label: "High", value: "high" },
  { label: "Critical", value: "critical" },
];
