import { requireFeaturePage } from "@/lib/authz";

export default async function HrmLayout({ children }: { children: React.ReactNode }) {
  await requireFeaturePage("hrm");
  return children;
}
