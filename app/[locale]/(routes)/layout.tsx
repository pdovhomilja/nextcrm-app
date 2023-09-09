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

  const user = session?.user;

  //  console.log(user.userStatus, "userStatus");

  if (user?.userStatus === "PENDING") {
    return redirect("/pending");
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <SideBar />
      <div className="flex flex-col h-full w-full overflow-hidden">
        <Header
          id={session.user.id as string}
          name={session.user.name as string}
          email={session.user.email as string}
          avatar={session.user.image as string}
          lang={session.user.userLanguage as string}
        />
        <div className="flex-grow overflow-y-auto h-full p-5">{children}</div>
        <Footer />
      </div>
    </div>
  );
}
