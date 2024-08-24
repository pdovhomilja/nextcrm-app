import { ImageResponse } from "next/og";
import { TbBrandNextjs, TbBrandTypescript } from "react-icons/tb";
import { BiLogoMongodb, BiLogoTailwindCss } from "react-icons/bi";
import { SiPrisma, SiReact, SiOpenai } from "react-icons/si";
import fs from "fs";
import path from "path";

//export const runtime = "edge";

const websiteUrl = process.env.NEXT_PUBLIC_APP_URL;

export async function GET(request: Request) {
  try {
    const interExtrabold = fs.readFileSync(
      path.resolve("./public/fonts/Inter-Bold.ttf")
    );
    /*     const interExtrabold = fetch(
      new URL("../../../public/Inter-Bold.ttf", import.meta.url)
    ).then((res) => res.arrayBuffer()); */
    const { searchParams } = new URL(request.url);

    const hasTitle = searchParams.has("title");
    const title = hasTitle
      ? searchParams.get("title")?.slice(0, 200)
      : "NextCRM";

    const hasDescription = searchParams.has("description");

    const description = hasDescription
      ? searchParams.get("description")?.slice(0, 200)
      : "NextCRM is an open source CRM build on top of NextJS. Technology stack: NextJS with Typescrtipt, MongoDB, TailwindCSS, React, Prisma, shadCN, resend.com, react.email and more. ";

    return new ImageResponse(
      (
        <div tw="flex flex-row-reverse h-full bg-neutral-800 ">
          <div tw="flex w-1/2 h-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              tw="w-full h-full"
              src={`${websiteUrl}/img/hero.png`}
              width="50%"
              height="50%"
              alt="Prism"
            />
            <div
              tw="absolute left-[-80px] top-[-30px] w-[150px] h-[120%] bg-neutral-800"
              style={{ transform: "rotate(12deg)" }}
            />
          </div>
          <div tw="flex flex-col w-1/2 p-[48px] mt-auto text-white">
            <h1 tw="text-[52px]">{title}</h1>
            <p tw="text-[26px] text-neutral-400">{description}</p>
            <span tw="py-5">
              <TbBrandNextjs size={50} color={"white"} />
              <TbBrandTypescript size={50} color={"blue"} />
              <BiLogoMongodb size={50} color={"green"} />
              <SiPrisma size={50} color={"purple"} />
              <SiReact size={50} color={"blue"} />
              <BiLogoTailwindCss size={50} color={"blue"} />
              <SiOpenai size={50} color={"white"} />
            </span>

            <p tw="text-neutral-300 pb-10">https://demo.nextcrm.io</p>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        fonts: [
          {
            name: "Inter",
            data: await interExtrabold,
            style: "normal",
            weight: 800,
          },
        ],
      }
    );
  } catch (error: unknown) {
    return new Response("Failed to generate OG image", { status: 500 });
  }
}
