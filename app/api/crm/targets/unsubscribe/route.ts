import { prismadb } from "@/lib/prisma";

const PAGE = (msg: string) =>
  `<!doctype html><html><body style="font-family:sans-serif;max-width:480px;margin:80px auto;text-align:center"><h2>Rade Engineering</h2><p>${msg}</p></body></html>`;

export async function GET(req: Request): Promise<Response> {
  const token = new URL(req.url).searchParams.get("token");
  const done = () =>
    new Response(PAGE("You have been unsubscribed. You will not receive further emails from us."), {
      status: 200,
      headers: { "content-type": "text/html" },
    });

  if (!token) return done();
  const row = await prismadb.crm_Target_Email.findUnique({ where: { unsubscribe_token: token } });
  if (row) {
    await prismadb.crm_Targets.update({
      where: { id: row.targetId },
      data: { do_not_email: true, do_not_email_at: new Date() },
    });
  }
  return done();
}
