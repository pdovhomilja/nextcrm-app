import Footer from "@/app/(routes)/components/Footer";
import "@/app/globals.css";
import { ThemeToggle } from "@/components/ThemeToggle";
import axios from "axios";
import { GithubIcon, Star } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "NextCRM - Sign in",
  description: "",
};

const AuthLayout = async ({ children }: { children: React.ReactNode }) => {
  //Get github stars from github api

  const github = await axios
    .get(`https://api.github.com/repos/pdovhomilja/nextcrm-app`)
    .then((res) => res.data);

  return (
    <div className="flex flex-col justify-center items-center h-screen w-full">
      <div className="flex justify-end items-center space-x-5 w-full p-5">
        <Link
          href={"https://github.com/pdovhomilja/nextcrm-app"}
          className=" border rounded-md p-2"
        >
          <GithubIcon className="w-5 h-5" />
        </Link>
        <div className="flex items-center border rounded-md p-2">
          <span className="sr-only">Github stars</span>
          {github?.stargazers_count}
          <Star className="w-4 h-4" />
        </div>
        <ThemeToggle />
      </div>
      <div className="flex items-center h-full overflow-hidden">{children}</div>
      <Footer />
    </div>
  );
};

export default AuthLayout;
