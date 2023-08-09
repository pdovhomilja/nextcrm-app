import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const loginUrl = `${process.env.ROSSUM_API_URL}/auth/login`;
    const username = process.env.ROSSUM_USER;
    const password = process.env.ROSSUM_PASS;

    const showKey = await fetch(loginUrl, {
      method: "POST",
      body: JSON.stringify({ username, password }),
      headers: { "Content-Type": "application/json" },
    })
      .then((r) => r.json())
      .then(({ key }) => {
        const showKey = key;
        return showKey;
      });
    return NextResponse.json(showKey, { status: 200 });
  } catch (error) {
    console.log(error, "error - getRossumToken action");
    return NextResponse.json(error, { status: 500 });
  }
}
