import Link from "next/link";
import { version } from "@/package.json";

const Footer = async () => {
  return (
    <footer className="flex flex-row h-8 justify-center items-center w-full text-xs text-muted-foreground p-5">
      <div className="hidden md:flex">
        <Link href="/">
          <h1 className="text-muted-foreground hover:text-foreground transition-colors">
            © {new Date().getFullYear()} · v{version}
          </h1>
        </Link>
      </div>
    </footer>
  );
};

export default Footer;
