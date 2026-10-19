import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { resolveMailboxAccess } from "@/lib/email/mailbox-access";
import { parseEmailAttachments } from "@/lib/email/attachment-types";
import { fetchUploadBuffer } from "@/lib/email/fetch-upload-buffer";

type Params = { emailId: string; index: string };

export async function GET(
  req: NextRequest,
  context: { params: Promise<Params> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { emailId, index: indexRaw } = await context.params;
  const index = Number.parseInt(indexRaw, 10);
  if (!Number.isFinite(index) || index < 0) {
    return NextResponse.json({ error: "Invalid attachment index" }, { status: 400 });
  }

  const email = await prismadb.email.findFirst({
    where: { id: emailId },
    select: { emailAccountId: true, attachments: true },
  });
  if (!email) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    await resolveMailboxAccess(email.emailAccountId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const attachments = parseEmailAttachments(email.attachments);
  const attachment = attachments[index];
  if (!attachment) {
    return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
  }

  try {
    const buffer = await fetchUploadBuffer(attachment.url);
    const inline = req.nextUrl.searchParams.get("inline") === "1";
    const disposition = inline ? "inline" : "attachment";
    const encodedName = encodeURIComponent(attachment.name);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": attachment.mime || "application/octet-stream",
        "Content-Length": String(buffer.length),
        "Content-Disposition": `${disposition}; filename="${attachment.name}"; filename*=UTF-8''${encodedName}`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err) {
    console.error("[email attachment]", err);
    return NextResponse.json({ error: "Failed to load attachment" }, { status: 500 });
  }
}
