import { redirect } from "next/navigation";

export default function InvoicesIndexPage() {
  redirect("/admin/invoices/settings");
}
