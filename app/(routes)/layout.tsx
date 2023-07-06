import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

import Header from "./components/Header";
import SideBar from "./components/SideBar";
import Footer from "./components/Footer";

export const metadata = {
  title: "NextCRM",
  description: "",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return redirect("/sign-in");
  }

  return (
    <div className="flex h-screen">
      <SideBar />
      <div className="flex flex-col h-full w-full overflow-hidden">
        <Header
          name={session.user.name as string}
          email={session.user.email as string}
          avatar={session.user.image as string}
        />
        <div className="h-full overflow-hidden pt-10">{children}</div>
        <Footer />
      </div>
    </div>
  );
}
