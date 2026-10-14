import { requireFeaturePage } from "@/lib/authz";

export default async function Layout({ children }: { children: React.ReactNode }) {
  await requireFeaturePage("invoices");
  return children;
}
