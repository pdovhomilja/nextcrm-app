import { VENSAI_BRAND } from "@/lib/brand/vensai";

export const emailHeading = {
  margin: "0 0 20px",
  fontSize: 22,
  fontWeight: 600,
  color: VENSAI_BRAND.colors.navy,
  textAlign: "center" as const,
};

export const emailText = {
  fontSize: 14,
  lineHeight: "24px",
  color: VENSAI_BRAND.colors.text,
};

export const emailCtaButton = {
  backgroundColor: VENSAI_BRAND.colors.primary,
  borderRadius: 8,
  color: "#fff",
  fontSize: 13,
  fontWeight: 600,
  padding: "12px 24px",
  textDecoration: "none",
};

export const emailFinePrint = {
  fontSize: 11,
  lineHeight: "18px",
  color: VENSAI_BRAND.colors.muted,
};
