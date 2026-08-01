import * as React from "react";
import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Link,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";

interface CampaignLayoutProps {
  contentHtml: string;
  unsubscribeUrl: string;
}

// TipTap content arrives as raw HTML, so its tags are styled via the
// embedded stylesheet below rather than Tailwind classes.
const contentStyles = `
  .campaign-content p { margin: 0 0 16px; font-size: 14px; line-height: 24px; color: #1f2937; }
  .campaign-content h1 { margin: 24px 0 16px; font-size: 24px; line-height: 32px; color: #111827; }
  .campaign-content h2 { margin: 24px 0 12px; font-size: 20px; line-height: 28px; color: #111827; }
  .campaign-content h3 { margin: 20px 0 12px; font-size: 16px; line-height: 24px; color: #111827; }
  .campaign-content a { color: #2563eb; text-decoration: underline; }
  .campaign-content ul, .campaign-content ol { margin: 0 0 16px; padding-left: 24px; font-size: 14px; line-height: 24px; color: #1f2937; }
  .campaign-content blockquote { margin: 0 0 16px; padding-left: 16px; border-left: 3px solid #e5e7eb; color: #4b5563; }
  .campaign-content hr { border: none; border-top: 1px solid #e5e7eb; margin: 24px 0; }
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
        <Body className="bg-[#f4f4f5] my-auto mx-auto font-sans">
          <Container className="bg-white border border-solid border-slate-200 rounded-md my-[40px] mx-auto p-[32px] max-w-[600px]">
            <Section>
              <div
                className="campaign-content"
                dangerouslySetInnerHTML={{ __html: contentHtml }}
              />
            </Section>
            <Hr className="border border-solid border-[#eaeaea] my-[26px] mx-0 w-full" />
            <Section>
              <Text className="text-slate-500 text-xs leading-[20px]">
                You are receiving this email from{" "}
                <strong>{process.env.NEXT_PUBLIC_APP_NAME ?? "NextCRM"}</strong>
                .{" "}
                <Link
                  href={unsubscribeUrl}
                  className="text-slate-500 underline"
                >
                  Unsubscribe
                </Link>
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default CampaignLayout;
