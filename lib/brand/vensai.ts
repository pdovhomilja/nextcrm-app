import { getAppName } from "@/lib/app-name";

/** VenSai Labs brand tokens — single source for CRM, email, and AI-generated content. */
export const VENSAI_BRAND = {
  companyName: "VenSai Labs",
  legalName: "Vijetha Softwares Pvt. Ltd.",
  tagline: "Freelance talent. Real solutions.",
  servicesLine: "Build · Design · Automate · Scale",
  website: "https://vensailabs.in",
  logoPath: "/images/vensai-labs-logo.jpg",
  colors: {
    primary: "#0ea5e9",
    primaryDark: "#0284c7",
    navy: "#0f172a",
    text: "#1f2937",
    muted: "#64748b",
    border: "#e2e8f0",
    canvas: "#f4f4f5",
    white: "#ffffff",
  },
  email: {
    maxWidth: 600,
    fontFamily:
      'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  },
} as const;

export function getProductName(): string {
  return getAppName();
}

export function getBrandLogoUrl(): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_BRAND_LOGO_URL?.replace(/\/$/, "") ||
    "https://crm.vensailabs.in";
  return `${base}${VENSAI_BRAND.logoPath}`;
}

/** Plain-text signature block (mailbox / compose). */
export function getDefaultEmailSignaturePlain(senderName?: string): string {
  const name = senderName?.trim() || "VenSai Labs Team";
  return `${name}\n${VENSAI_BRAND.companyName}\n${VENSAI_BRAND.tagline}\n${VENSAI_BRAND.website}`;
}

/** Inline HTML signature for marketing / transactional footers. */
export function getDefaultEmailSignatureHtml(senderName?: string): string {
  const name = senderName?.trim() || "VenSai Labs Team";
  const { companyName, tagline, website, colors } = VENSAI_BRAND;
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:24px;font-family:${VENSAI_BRAND.email.fontFamily};">
<tr><td style="padding-top:16px;border-top:1px solid ${colors.border};">
<p style="margin:0 0 4px;font-size:14px;font-weight:600;color:${colors.navy};">${name}</p>
<p style="margin:0 0 2px;font-size:13px;color:${colors.text};">${companyName}</p>
<p style="margin:0 0 8px;font-size:12px;color:${colors.muted};">${tagline}</p>
<p style="margin:0;font-size:12px;"><a href="${website}" style="color:${colors.primaryDark};text-decoration:none;">${website.replace(/^https?:\/\//, "")}</a></p>
</td></tr></table>`;
}
