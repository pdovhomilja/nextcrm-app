import getNextVersion from "@/actions/system/get-next-version";
import Link from "next/link";
import React from "react";

const Footer = async () => {
  const nextVersion = await getNextVersion();
  //console.log(nextVersion, "nextVersion");
  return (
    <footer className="flex flex-row h-8 justify-end items-center w-full text-xs text-gray-500 p-5">
      <div className="hidden md:flex pr-5">
        <Link href="/">
          <h1 className="text-gray-600">
            {" "}
            {process.env.NEXT_PUBLIC_APP_NAME} - {process.env.NEXT_PUBLIC_APP_V}
          </h1>
        </Link>
      </div>
      <div className="hidden md:flex space-x-2 pr-2">
        powered by Next.js
        <span className="bg-black rounded-md text-white px-1 mx-1">
          {nextVersion.substring(1, 7) || process.env.NEXT_PUBLIC_NEXT_VERSION}
        </span>
        +
        <Link href={"https://ui.shadcn.com/"}>
          <span className="rounded-md mr-2">shadcnUI</span>
        </Link>{" "}
        hosted by:
        <span className="text-bold underline">
          <Link href="https://www.vercel.com">Vercel</Link>
        </span>
      </div>
      <div className="hidden md:flex space-x-2">
        Supported by:
        <Link className="pl-1 font-bold" href="https://www.softbase.cz">
          SoftBase s.r.o.
        </Link>
      </div>
    </footer>
  );
};

export default Footer;
