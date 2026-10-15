import * as React from "react";
import {
  Body,
  Container,
  Head,
  Html,
  Section,
  Tailwind,
} from "@react-email/components";

import { VENSAI_BRAND } from "@/lib/brand/vensai";
import { VensaiEmailFooter } from "@/emails/components/VensaiEmailFooter";
import { VensaiEmailHeader } from "@/emails/components/VensaiEmailHeader";

interface CampaignLayoutProps {
  contentHtml: string;
  unsubscribeUrl: string;
}

const contentStyles = `
  .campaign-content p { margin: 0 0 16px; font-size: 14px; line-height: 24px; color: ${VENSAI_BRAND.colors.text}; }
  .campaign-content h1 { margin: 24px 0 16px; font-size: 24px; line-height: 32px; color: ${VENSAI_BRAND.colors.navy}; }
  .campaign-content h2 { margin: 24px 0 12px; font-size: 20px; line-height: 28px; color: ${VENSAI_BRAND.colors.navy}; }
  .campaign-content h3 { margin: 20px 0 12px; font-size: 16px; line-height: 24px; color: ${VENSAI_BRAND.colors.navy}; }
  .campaign-content a { color: ${VENSAI_BRAND.colors.primaryDark}; text-decoration: underline; }
  .campaign-content ul, .campaign-content ol { margin: 0 0 16px; padding-left: 24px; font-size: 14px; line-height: 24px; color: ${VENSAI_BRAND.colors.text}; }
  .campaign-content blockquote { margin: 0 0 16px; padding-left: 16px; border-left: 3px solid ${VENSAI_BRAND.colors.primary}; color: ${VENSAI_BRAND.colors.muted}; }
  .campaign-content hr { border: none; border-top: 1px solid ${VENSAI_BRAND.colors.border}; margin: 24px 0; }
  .campaign-content .btn, .campaign-content a[style*="background"] { background-color: ${VENSAI_BRAND.colors.primary} !important; color: #fff !important; border-radius: 8px; padding: 12px 24px; text-decoration: none !important; display: inline-block; }
`;

export const CampaignLayout = ({
  contentHtml,
  unsubscribeUrl,
}: CampaignLayoutProps) => {
  return (
    <Html>
      <Head>
        <style>{contentStyles}</style>
      </Head>
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
            <VensaiEmailHeader showTagline />
            <Section>
              <div
                className="campaign-content"
                dangerouslySetInnerHTML={{ __html: contentHtml }}
              />
            </Section>
            <VensaiEmailFooter unsubscribeUrl={unsubscribeUrl} variant="marketing" />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default CampaignLayout;
