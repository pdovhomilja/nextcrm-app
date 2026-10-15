import { Img, Link, Section, Text } from "@react-email/components";
import * as React from "react";

import { getBrandLogoUrl, getProductName, VENSAI_BRAND } from "@/lib/brand/vensai";

type Props = {
  showTagline?: boolean;
};

export function VensaiEmailHeader({ showTagline = true }: Props) {
  const logoUrl = getBrandLogoUrl();
  const product = getProductName();

  return (
    <Section style={{ marginBottom: 24, textAlign: "center" as const }}>
      <Link href={VENSAI_BRAND.website} style={{ textDecoration: "none" }}>
        <Img
          src={logoUrl}
          alt={VENSAI_BRAND.companyName}
          width={72}
          height={72}
          style={{
            borderRadius: "9999px",
            margin: "0 auto 12px",
            display: "block",
          }}
        />
      </Link>
      <Text
        style={{
          margin: "0 0 4px",
          fontSize: 18,
          fontWeight: 700,
          color: VENSAI_BRAND.colors.navy,
          letterSpacing: "-0.02em",
        }}
      >
        {VENSAI_BRAND.companyName}
      </Text>
      <Text
        style={{
          margin: 0,
          fontSize: 12,
          color: VENSAI_BRAND.colors.muted,
          textTransform: "uppercase" as const,
          letterSpacing: "0.12em",
        }}
      >
        {product}
      </Text>
      {showTagline && (
        <Text
          style={{
            margin: "8px 0 0",
            fontSize: 13,
            color: VENSAI_BRAND.colors.text,
            fontStyle: "italic",
          }}
        >
          {VENSAI_BRAND.tagline}
        </Text>
      )}
    </Section>
  );
}
