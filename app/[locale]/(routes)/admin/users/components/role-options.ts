export const ROLE_OPTIONS = [
  { value: "user", label: "User" },
  { value: "trainee", label: "Trainee" },
  { value: "manager", label: "Manager" },
  { value: "admin", label: "Admin" },
] as const;

export type AssignableRole = (typeof ROLE_OPTIONS)[number]["value"];
