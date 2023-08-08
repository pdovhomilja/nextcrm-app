import { prismadb } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { hash } from "bcryptjs";

export async function GET(req: Request) {
  //console.log(req.headers.get("host"), "req.headers");

  //check if domain is demo.nextcrm.io if yes, reset password to default
  if (req.headers.get("host") === "demo.nextcrm.io") {
    const password = process.env.DEFAULT_PASSWORD;

    if (!password)
      return NextResponse.json({
        message: "demo.nextcrm.io password change to default failed",
      });

    try {
      await prismadb.users.update({
        where: {
          id: "64bb9da09771b681ec8f4a81",
        },
        data: {
          password: await hash(password, 12),
          name: "Demo Admin",
          is_admin: true,
          userStatus: "ACTIVE",
        },
      });
      return NextResponse.json({
        message: "demo.nextcrm.io password change to default successfully",
      });
    } catch (error) {
      console.log(error);
      return NextResponse.json({
        message: "demo.nextcrm.io password change to default failed",
      });
    }
  }
  return NextResponse.json("Nothing to do - not a demo.nextcrm.io domain");
}
