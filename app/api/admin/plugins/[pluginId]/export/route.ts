import { NextResponse } from "next/server";
import { requireRole, AuthenticationError, AuthorizationError } from "@/lib/authz";
import { exportPluginData } from "@/lib/plugins/lifecycle";

export async function GET(_req: Request, { params }: { params: Promise<{ pluginId: string }> }) {
  try { await requireRole(["admin"]); } catch (e) {
    if (e instanceof AuthenticationError) return new NextResponse("Unauthorized", { status: 401 });
    if (e instanceof AuthorizationError) return new NextResponse("Forbidden", { status: 403 });
    throw e;
  }
  const { pluginId } = await params;
  if (!/^[a-z][a-z0-9-]{1,48}$/.test(pluginId)) return new NextResponse("Not found", { status: 404 });
  const body = JSON.stringify(await exportPluginData(pluginId), null, 2);
  return new NextResponse(body, {
    headers: { "Content-Type": "application/json", "Content-Disposition": `attachment; filename="${pluginId}-export.json"` },
  });
}
