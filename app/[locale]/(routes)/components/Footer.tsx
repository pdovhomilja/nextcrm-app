import getNextVersion from "@/actions/system/get-next-version";
import Link from "next/link";
import { version } from "@/package.json";
import { VENSAI_BRAND } from "@/lib/brand/vensai";

const Footer = async () => {
  const nextVersion = await getNextVersion();
  return (
    <footer className="mt-auto flex w-full flex-col items-center justify-between gap-2 border-t border-border/40 px-6 py-4 text-[11px] text-muted-foreground sm:flex-row">
      <Link
        href="/"
        className="font-medium text-foreground/70 transition-colors hover:text-primary"
      >
        VenSai CRM <span className="font-normal text-muted-foreground">v{version}</span>
      </Link>
      <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center sm:justify-end">
        <span className="hidden sm:inline">{VENSAI_BRAND.legalName}</span>
        <span className="hidden text-border sm:inline">·</span>
        <span className="rounded-md bg-muted/80 px-1.5 py-0.5 font-mono text-[10px]">
          {nextVersion.substring(1, 7) || process.env.NEXT_PUBLIC_NEXT_VERSION}
        </span>
      </div>
    </footer>
  );
};

export default Footer;
