import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { putObject, assertSafeKey } from "@/lib/storage";

const ALLOWED_FOLDERS = new Set(["avatars", "images", "documents", "uploads"]);

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const key = req.nextUrl.searchParams.get("key");
  if (!key) {
    return NextResponse.json({ error: "key is required" }, { status: 400 });
  }

  let safeKey: string;
  try {
    safeKey = assertSafeKey(key);
  } catch {
    return NextResponse.json({ error: "Invalid storage key" }, { status: 400 });
  }

  const folder = safeKey.split("/")[0];
  if (!ALLOWED_FOLDERS.has(folder)) {
    return NextResponse.json({ error: "Invalid storage folder" }, { status: 400 });
  }

  const body = Buffer.from(await req.arrayBuffer());
  await putObject(safeKey, body, req.headers.get("content-type") ?? undefined);

  return NextResponse.json({ ok: true, key: safeKey });
}
