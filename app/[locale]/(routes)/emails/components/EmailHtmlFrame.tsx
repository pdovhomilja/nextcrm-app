"use client";

import { EmailHtmlBody } from "@/app/[locale]/(routes)/emails/components/EmailHtmlBody";

type Props = {
  bodyHtml: string;
};

/** @deprecated Use EmailHtmlBody — kept as alias for imports. */
export function EmailHtmlFrame({ bodyHtml }: Props) {
  return <EmailHtmlBody bodyHtml={bodyHtml} />;
}
