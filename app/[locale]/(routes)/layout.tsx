import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

import Header from "./components/Header";
import SideBar from "./components/SideBar";
import Footer from "./components/Footer";
import { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL! || "http://localhost:3000"
  ),
  title: "",
  description: "",
  openGraph: {
    images: [
      {
        url: "images/windroseLogo.png",
        width: 1200,
        height: 630,
        alt: "",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: [
      {
        url: "images/windroseLogo.png",
        width: 1200,
        height: 630,
        alt: "",
      },
    ],
  },
};

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  //console.log(session, "session");

  if (!session) {
    return redirect("/sign-in");
  }

  const user = session?.user;

  if (user?.userStatus === "PENDING") {
    return redirect("/pending");
  }

  if (user?.userStatus === "INACTIVE") {
    return redirect("/inactive");
  }

  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex flex-1">
        <div className="flex-none w-64">
          <SideBar />
        </div>
        <div className="flex flex-grow flex-col h-full">
          <Header
            id={session.user.id as string}
            name={session.user.name as string}
            email={session.user.email as string}
            avatar={session.user.image as string}
            lang={session.user.userLanguage as string}
          />
          <div className="flex flex-grow h-full overflow-hidden">
            <div className="flex flex-col flex-grow overflow-y-auto">
              {children}
            </div>
          </div>
          <Footer />
        </div>
      </div>
    </div>
  );
}
