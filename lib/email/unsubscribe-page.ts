// Fork-owned. A branded HTML page for the public unsubscribe routes (campaign +
// target one-off). Rendered in a browser (not an email), so external images and
// flexbox are fine. Shared so both routes look identical and on-brand.

import { brand } from "@/lib/campaigns/brand";

const c = brand.colors;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function shell(inner: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Unsubscribe · ${escapeHtml(brand.wordmarkPrimary + brand.wordmarkAccent)}</title>
</head>
<body style="margin:0;padding:24px;background:${c.pageBg};-webkit-font-smoothing:antialiased;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${c.bodyText};">
  <div style="max-width:440px;margin:48px auto;background:${c.cardBg};border:1px solid ${c.hairline};border-radius:16px;overflow:hidden;">
    <div style="background:${c.navy};padding:18px 28px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
        <td style="padding-right:12px;vertical-align:middle;">
          <span style="display:inline-block;background:#ffffff;border-radius:10px;padding:6px;line-height:0;">
            <img src="${escapeHtml(brand.logoUrl)}" width="30" height="30" alt="" style="display:block;border:0;">
          </span>
        </td>
        <td style="vertical-align:middle;">
          <span style="font-size:16px;font-weight:700;letter-spacing:.02em;color:#ffffff;">${escapeHtml(brand.wordmarkPrimary)}</span><span style="font-size:16px;font-weight:700;letter-spacing:.02em;color:${c.amber};">&nbsp;${escapeHtml(brand.wordmarkAccent.trim())}</span>
        </td>
      </tr></table>
    </div>
    <div style="padding:32px 28px;text-align:center;">
      ${inner}
    </div>
    <div style="padding:16px 28px;border-top:1px solid ${c.hairline};text-align:center;">
      <a href="${escapeHtml(brand.websiteUrl)}" style="color:${c.amberInk};font-size:12.5px;text-decoration:none;">${escapeHtml(brand.websiteLabel)}</a>
    </div>
  </div>
</body>
</html>`;
}

const H1 = `margin:0 0 10px;font-size:22px;line-height:1.25;font-weight:700;color:${c.heading};`;
const P = `margin:0 0 20px;font-size:15px;line-height:1.6;color:${c.bodyText};`;
const BTN = `display:inline-block;padding:12px 28px;font-size:15px;font-weight:700;color:${c.buttonText};background:${c.amber};border:none;border-radius:999px;cursor:pointer;`;

/** Confirm page: a POST form (GET never mutates — scanners auto-GET links). */
export function unsubscribeConfirmPage(
  actionPath: string,
  token: string | null
): string {
  const action = `${actionPath}${token ? `?token=${encodeURIComponent(token)}` : ""}`;
  return shell(
    `<h1 style="${H1}">Unsubscribe</h1>` +
      `<p style="${P}">Click below to stop receiving emails from Rade Engineering.</p>` +
      `<form method="POST" action="${action}">` +
      `<input type="hidden" name="token" value="${escapeHtml(token ?? "")}">` +
      `<button type="submit" style="${BTN}">Unsubscribe</button></form>`
  );
}

/** Confirmation page shown after a successful POST. */
export function unsubscribedPage(): string {
  return shell(
    `<h1 style="${H1}">You&rsquo;re unsubscribed</h1>` +
      `<p style="${P}">You will no longer receive emails from us. Changed your mind? Just reply to a past email and we&rsquo;ll help.</p>`
  );
}

/** Wrap page HTML in a Response with the right no-cache / no-index headers. */
export function unsubscribePageResponse(pageHtml: string): Response {
  return new Response(pageHtml, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "x-robots-tag": "noindex",
    },
  });
}
