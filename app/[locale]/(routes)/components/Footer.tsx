import getNextVersion from "@/actions/system/get-next-version";
import Link from "next/link";
import { version } from "@/package.json";


const Footer = async () => {
  const nextVersion = await getNextVersion();
  //console.log(nextVersion, "nextVersion");
  return (
    <footer className="flex min-h-14 w-full items-center justify-between gap-4 border-t border-border/60 bg-background/70 px-5 py-3 text-xs text-muted-foreground backdrop-blur-md">
      <Link href="/" className="font-medium tracking-tight text-foreground/80 transition-colors hover:text-primary">
        VenSai CRM <span className="text-muted-foreground">· v{version}</span>
      </Link>
      <div className="hidden items-center gap-2 sm:flex">
        <span>Powered by</span>
        <span className="font-medium text-foreground/75">Hari Cornucopia Tech Pvt. Ltd.</span>
        <span className="text-border">·</span>
        <span>Built with Next.js</span>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 font-mono text-[10px] text-primary">
          {nextVersion.substring(1, 7) || process.env.NEXT_PUBLIC_NEXT_VERSION}
        </span>
      </div>
    </footer>
  );
};

export default Footer;
