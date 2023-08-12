import Footer from "@/app/(routes)/components/Footer";
import "@/app/globals.css";
import { ThemeToggle } from "@/components/ThemeToggle";
import { GithubIcon } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "NextCRM - Sign in",
  description: "",
};

const AuthLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex flex-col justify-center items-center h-screen w-full">
      <div className="flex justify-end items-center space-x-5 w-full p-5">
        <Link
          href={"https://github.com/pdovhomilja/nextcrm-app"}
          className=" border rounded-md p-2"
        >
          <GithubIcon className="w-5 h-5" />
        </Link>
        <ThemeToggle />
      </div>
      <div className="flex items-center h-full overflow-hidden">{children}</div>
      <Footer />
    </div>
  );
};

export default AuthLayout;
