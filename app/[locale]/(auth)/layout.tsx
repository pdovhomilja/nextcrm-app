import Link from "next/link";
import { GithubIcon, Star } from "lucide-react";
import { getTranslations } from "next-intl/server";

import "@/app/[locale]/globals.css";
import { ThemeToggle } from "@/components/ThemeToggle";
import Footer from "@/app/[locale]/(routes)/components/Footer";
import getGithubRepoStars from "@/actions/github/get-repo-stars";
import { DiscordLogoIcon } from "@radix-ui/react-icons";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata(props: Props) {
  const params = await props.params;
  const { locale } = params;

  const t = await getTranslations({ locale, namespace: "RootLayout" });

  return {
    title: t("title"),
    description: t("description"),
  };
}

const AuthLayout = async ({ children }: { children: React.ReactNode }) => {
  //Get github stars from github api
  const githubStars = await getGithubRepoStars();

  return (
    <div className="flex flex-col justify-center items-center min-h-screen w-full">
      <div className="flex justify-end items-center space-x-5 w-full p-5">
        <Link
          href={process.env.NEXT_PUBLIC_GITHUB_REPO_URL || "#"}
          className=" border rounded-md p-2"
        >
          <GithubIcon className="size-5" />
        </Link>
        <div className="flex items-center border rounded-md p-2 ">
          <span className="sr-only">Github stars</span>
          {githubStars}
          <Star className="size-4" />
        </div>
        <div className="flex items-center border rounded-md p-2">
          <Link href="https://discord.gg/Dd4Aj6S4Dz">
            <DiscordLogoIcon className="size-5" />
          </Link>
        </div>
        <ThemeToggle />
      </div>
      <div className="flex items-center grow h-full overflow-hidden">
        {children}
      </div>
      <Footer />
    </div>
  );
};

export default AuthLayout;
