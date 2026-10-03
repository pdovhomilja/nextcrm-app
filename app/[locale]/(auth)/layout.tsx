import Link from "next/link";
import { GithubIcon, Star } from "lucide-react";
import { getTranslations } from "next-intl/server";

import "@/app/[locale]/globals.css";
import { ThemeToggle } from "@/components/ThemeToggle";
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
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-[#070d1b] text-white">
      <div className="flex w-full items-center justify-end gap-5 p-7">
        <Link
          href={process.env.NEXT_PUBLIC_GITHUB_REPO_URL || "#"}
          className="rounded-xl border border-slate-800 p-3 text-white hover:bg-slate-900"
        >
          <GithubIcon className="size-5" />
        </Link>
        <div className="flex items-center rounded-xl border border-slate-800 p-3 text-white">
          <span className="sr-only">Github stars</span>
          {githubStars}
          <Star className="size-4" />
        </div>
        <div className="flex items-center rounded-xl border border-slate-800 p-3 text-white">
          <Link href="https://discord.gg/Dd4Aj6S4Dz">
            <DiscordLogoIcon className="size-5" />
          </Link>
        </div>
        <ThemeToggle />
      </div>
      <div className="flex w-full flex-1 items-center justify-center overflow-hidden">
        {children}
      </div>
    </div>
  );
};

export default AuthLayout;
