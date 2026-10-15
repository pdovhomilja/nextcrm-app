import {
  Body,
  Container,
  Head,
  Html,
  Preview,
  Tailwind,
} from "@react-email/components";
import * as React from "react";

import { VENSAI_BRAND } from "@/lib/brand/vensai";
import { VensaiEmailFooter } from "@/emails/components/VensaiEmailFooter";
import { VensaiEmailHeader } from "@/emails/components/VensaiEmailHeader";

type Props = {
  preview?: string;
  children: React.ReactNode;
  unsubscribeUrl?: string;
  footerVariant?: "marketing" | "transactional";
  showHeaderTagline?: boolean;
};

export function VensaiEmailShell({
  preview,
  children,
  unsubscribeUrl,
  footerVariant = "transactional",
  showHeaderTagline = false,
}: Props) {
  return (
    <Html>
      <Head />
      {preview ? <Preview>{preview}</Preview> : null}
      <Tailwind>
        <Body
          style={{
            backgroundColor: VENSAI_BRAND.colors.canvas,
            fontFamily: VENSAI_BRAND.email.fontFamily,
            margin: 0,
          }}
        >
          <Container
            style={{
              backgroundColor: VENSAI_BRAND.colors.white,
              border: `1px solid ${VENSAI_BRAND.colors.border}`,
              borderRadius: 8,
              margin: "40px auto",
              padding: 32,
              maxWidth: VENSAI_BRAND.email.maxWidth,
            }}
          >
            <VensaiEmailHeader showTagline={showHeaderTagline} />
            {children}
            <VensaiEmailFooter
              unsubscribeUrl={unsubscribeUrl}
              variant={footerVariant}
            />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
