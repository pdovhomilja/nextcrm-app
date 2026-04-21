import { redirect } from "next/navigation";
import { getUser } from "@/actions/get-user";
import { AdminSidebarNav } from "./_components/AdminSidebarNav";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let user;
  try {
    user = await getUser();
  } catch {
    redirect("/sign-in");
  }
  if (!user.is_admin) redirect("/");

  return (
    <div className="flex h-full w-full min-h-0">
      <aside className="w-56 shrink-0 border-r bg-card flex flex-col py-4 px-2">
        <AdminSidebarNav />
      </aside>
      <main className="flex-1 min-w-0 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
