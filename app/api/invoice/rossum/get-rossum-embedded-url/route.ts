import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();

  const { rossum_annotation_url: embUrl } = body;

  try {
    const loginUrl = `${process.env.ROSSUM_API_URL}/auth/login`;
    const username = process.env.ROSSUM_USER;
    const password = process.env.ROSSUM_PASS;

    const key = await fetch(loginUrl, {
      method: "POST",
      body: JSON.stringify({ username, password }),
      headers: { "Content-Type": "application/json" },
    })
      .then((r) => r.json())
      .then(({ key }) => {
        return key;
      });

    const token = "token " + " " + key;

    const data = await fetch(embUrl + "/create_embedded_url", {
      method: "POST",
      headers: { Authorization: token },
    })
      .then((r) => r.json())
      .then((data) => {
        //console.log(data);
        return data;
      });
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.log(error, "error - get Rossum Embedded Url");
    return NextResponse.json(error, { status: 500 });
  }
}
