import React from "react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { HelpCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "./ui/button";
import { DiscordLogoIcon, GitHubLogoIcon } from "@radix-ui/react-icons";

const SupportComponent = () => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-muted-foreground hover:text-foreground">
          <HelpCircle className="h-[1.15rem] w-[1.15rem]" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="flex flex-col space-y-2 mt-3 min-w-[400px]"
        align={"end"}
      >
        <div className="flex w-full justify-between items-center gap-2">
          <span className="text-sm">Need help? Join us on</span>
          <Button asChild variant={"secondary"}>
            <Link
              className="border rounded-md p-2"
              href={process.env.NEXT_PUBLIC_DISCORD_INVITE_URL || "#"}
              target="_blank"
            >
              <DiscordLogoIcon />
            </Link>
          </Button>
        </div>
        <div className="flex w-full justify-between items-center gap-2">
          <span className="text-sm "> Find a bug? Create an issue on</span>
          <Button asChild variant={"secondary"}>
            <Link
              className="border rounded-md p-2"
              href={process.env.NEXT_PUBLIC_GITHUB_ISSUES_URL || "#"}
              target="_blank"
            >
              <GitHubLogoIcon />
            </Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default SupportComponent;
