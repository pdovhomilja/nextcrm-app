import { Hr, Link, Section, Text } from "@react-email/components";
import * as React from "react";

import { getProductName, VENSAI_BRAND } from "@/lib/brand/vensai";

type Props = {
  unsubscribeUrl?: string;
  variant?: "marketing" | "transactional";
};

export function VensaiEmailFooter({
  unsubscribeUrl,
  variant = "transactional",
}: Props) {
  const product = getProductName();

  return (
    <>
      <Hr
        style={{
          borderColor: VENSAI_BRAND.colors.border,
          margin: "26px 0",
        }}
      />
      <Section>
        <Text
          style={{
            margin: "0 0 8px",
            fontSize: 11,
            lineHeight: "18px",
            color: VENSAI_BRAND.colors.muted,
            textAlign: "center" as const,
          }}
        >
          {VENSAI_BRAND.servicesLine}
        </Text>
        <Text
          style={{
            margin: 0,
            fontSize: 11,
            lineHeight: "18px",
            color: VENSAI_BRAND.colors.muted,
            textAlign: "center" as const,
          }}
        >
          © {new Date().getFullYear()} {VENSAI_BRAND.companyName}
          {variant === "marketing" ? (
            <>
              {" · "}
              Sent via <strong style={{ color: VENSAI_BRAND.colors.text }}>{product}</strong>
            </>
          ) : (
            <> · {product}</>
          )}
          {" · "}
          <Link
            href={VENSAI_BRAND.website}
            style={{ color: VENSAI_BRAND.colors.primaryDark, textDecoration: "underline" }}
          >
            vensailabs.in
          </Link>
          {unsubscribeUrl ? (
            <>
              {" · "}
              <Link
                href={unsubscribeUrl}
                style={{ color: VENSAI_BRAND.colors.muted, textDecoration: "underline" }}
              >
                Unsubscribe
              </Link>
            </>
          ) : null}
        </Text>
        <Text
          style={{
            margin: "8px 0 0",
            fontSize: 10,
            color: VENSAI_BRAND.colors.muted,
            textAlign: "center" as const,
          }}
        >
          {VENSAI_BRAND.legalName}
        </Text>
      </Section>
    </>
  );
}
