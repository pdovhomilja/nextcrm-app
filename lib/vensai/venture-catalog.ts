export type VentureOption = { slug: string; label: string };

/** Comma list: `rofyt:Rofyt,other:Other venture` */
export function listVentureOptions(): VentureOption[] {
  const raw = process.env.VENSAI_VENTURES?.trim();
  if (!raw) {
    return [{ slug: "rofyt", label: "Rofyt" }];
  }
  return raw.split(",").flatMap((part) => {
    const piece = part.trim();
    if (!piece) return [];
    const colon = piece.indexOf(":");
    if (colon === -1) return [{ slug: piece, label: piece }];
    const slug = piece.slice(0, colon).trim();
    const label = piece.slice(colon + 1).trim() || slug;
    return slug ? [{ slug, label }] : [];
  });
}

export function adminPortalVentureUrl(slug: string) {
  const base = (process.env.VENSAI_ADMIN_PORTAL_URL || "https://admin.vensailabs.in").replace(/\/$/, "");
  return `${base}/dashboard/ventures/${encodeURIComponent(slug)}`;
}
