import { prerender } from "react-dom/static";

import CampaignLayout from "@/emails/CampaignLayout";

const DOCTYPE =
  '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">';

export async function renderCampaignEmail({
  contentHtml,
  unsubscribeUrl,
}: {
  contentHtml: string;
  unsubscribeUrl: string;
}): Promise<string> {
  const { prelude } = await prerender(
    CampaignLayout({ contentHtml, unsubscribeUrl })
  );

  const reader = prelude.getReader();
  const decoder = new TextDecoder();
  let html = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    html += decoder.decode(value);
  }

  return DOCTYPE + html;
}
