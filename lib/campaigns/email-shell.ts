// Fork-owned. The branded campaign email shell: a table-based, Outlook-safe HTML
// document that wraps the sanitized body content (from the TipTap editor / AI) in
// the Rade Engineering house style. Replaces the former React-Email CampaignLayout
// so the hand-tuned MSO/VML markup (amber CTA button, conditional comments) is
// preserved verbatim — react-dom prerender could not reproduce it.
//
// This module builds a STRING. The body is sanitized by the caller
// (lib/campaigns/render-email.ts) before it reaches {body}; CTA label/url are
// user-supplied and are escaped + scheme-checked HERE.

import { brand, campaignMailingAddress } from "./brand";

const c = brand.colors;

// Base typography for the typed/AI body (semantic tags from the TipTap editor
// usually arrive WITHOUT inline styles), so headings/links/lists render on-brand.
// Delivered as a <head> <style> block; clients that strip it fall back to the
// wrapper div's inline base style. Inline styles in the body still win over these.
const contentStyles = `
    .campaign-content p { margin: 0 0 14px; font-size: 15.5px; line-height: 1.65; color: ${c.bodyText}; }
    .campaign-content h1 { margin: 0 0 16px; font-size: 26px; line-height: 1.2; font-weight: 700; letter-spacing: -.02em; color: ${c.heading}; }
    .campaign-content h2 { margin: 24px 0 12px; font-size: 21px; line-height: 1.3; font-weight: 700; color: ${c.heading}; }
    .campaign-content h3 { margin: 20px 0 10px; font-size: 17px; line-height: 1.35; font-weight: 700; color: ${c.heading}; }
    .campaign-content a { color: ${c.amberInk}; text-decoration: underline; }
    .campaign-content strong, .campaign-content b { color: ${c.heading}; }
    .campaign-content ul, .campaign-content ol { margin: 0 0 14px; padding-left: 22px; font-size: 15.5px; line-height: 1.65; color: ${c.bodyText}; }
    .campaign-content li { margin: 0 0 6px; }
    .campaign-content blockquote { margin: 0 0 14px; padding-left: 16px; border-left: 3px solid ${c.hairline}; color: ${c.muted}; }
    .campaign-content hr { border: none; border-top: 1px solid ${c.hairline}; margin: 22px 0; }
`;

/** Escape text for HTML element content. */
function escapeText(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Escape a value destined for a double-quoted HTML attribute. */
function escapeAttr(value: string): string {
  return escapeText(value).replace(/"/g, "&quot;");
}

/**
 * Return url only if it uses a safe, email-appropriate scheme (http/https/mailto);
 * otherwise null. Guards the user-supplied CTA link against javascript:/data: etc.
 */
function safeLinkUrl(url: string): string | null {
  return /^(https?:|mailto:)/i.test(url.trim()) ? url.trim() : null;
}

/**
 * The amber primary CTA button (with VML fallback for Outlook). Rendered only when
 * both a label and a safe URL are present; returns "" otherwise.
 */
function ctaBlock(ctaLabel: string | undefined, ctaUrl: string | undefined): string {
  const label = (ctaLabel ?? "").trim();
  const url = ctaUrl ? safeLinkUrl(ctaUrl) : null;
  if (!label || !url) return "";

  const hrefAttr = escapeAttr(url);
  const labelText = escapeText(label);

  return `
          <tr>
            <td style="background:${c.cardBg};padding:12px 30px 6px;border-left:1px solid ${c.hairline};border-right:1px solid ${c.hairline};">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="border-radius:999px;background:${c.amber};">
                    <!--[if mso]>
                    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${hrefAttr}" style="height:46px;v-text-anchor:middle;width:220px;" arcsize="50%" fillcolor="${c.amber}" stroke="f">
                      <w:anchorlock/>
                      <center style="color:${c.buttonText};font-family:Arial,sans-serif;font-size:15px;font-weight:bold;">${labelText}</center>
                    </v:roundrect>
                    <![endif]-->
                    <!--[if !mso]><!-- -->
                    <a href="${hrefAttr}" style="display:inline-block;padding:13px 30px;font-size:15px;font-weight:700;color:${c.buttonText};text-decoration:none;border-radius:999px;">
                      ${labelText}
                    </a>
                    <!--<![endif]-->
                  </td>
                </tr>
              </table>
            </td>
          </tr>`;
}

/** The CAN-SPAM mailing-address line, or "" when no address is configured. */
function addressLine(): string {
  const address = campaignMailingAddress();
  if (!address) return "";
  return `<br>${escapeText(address)}`;
}

export type CampaignShellInput = {
  /** Sanitized body HTML (already run through the sanitizer). */
  body: string;
  /** System-generated one-click unsubscribe URL. */
  unsubscribeUrl: string;
  /** Optional CTA button label (per-template). */
  ctaLabel?: string;
  /** Optional CTA button URL (per-template); scheme-checked here. */
  ctaUrl?: string;
};

/**
 * Build the full branded campaign email document (including <!doctype html>).
 * `body` MUST already be sanitized by the caller.
 */
export function renderCampaignShell({
  body,
  unsubscribeUrl,
  ctaLabel,
  ctaUrl,
}: CampaignShellInput): string {
  const unsub = escapeAttr(unsubscribeUrl);

  return `<!doctype html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>${escapeText(brand.wordmarkPrimary + brand.wordmarkAccent)}</title>
  <style>${contentStyles}</style>
</head>
<body style="margin:0;padding:0;background:${c.pageBg};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${c.pageBg};padding:28px 12px;">
    <tr>
      <td align="center">

        <!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:100%;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">

          <!-- HEADER -->
          <tr>
            <td style="background:${c.navy};border-radius:16px 16px 0 0;padding:20px 30px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding-right:13px;vertical-align:middle;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="background:${c.cardBg};border-radius:10px;padding:6px;line-height:0;">
                          <img src="${escapeAttr(brand.logoUrl)}" width="34" height="34" alt="${escapeAttr(brand.wordmarkPrimary)}" style="display:block;border:0;outline:none;text-decoration:none;">
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td style="vertical-align:middle;">
                    <span style="font-size:16px;font-weight:700;letter-spacing:.02em;color:#ffffff;">${escapeText(brand.wordmarkPrimary)}</span><span style="font-size:16px;font-weight:700;letter-spacing:.02em;color:${c.amber};">&nbsp;${escapeText(brand.wordmarkAccent.trim())}</span>
                    <div style="margin-top:5px;font-size:13px;color:${c.headerSubtitle};">${escapeText(brand.tagline)}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="background:${c.cardBg};padding:34px 30px 8px;border-left:1px solid ${c.hairline};border-right:1px solid ${c.hairline};">
              <div class="campaign-content" style="font-size:15.5px;line-height:1.65;color:${c.bodyText};">
                ${body}
              </div>
            </td>
          </tr>
${ctaBlock(ctaLabel, ctaUrl)}
          <!-- DIVIDER -->
          <tr>
            <td style="background:${c.cardBg};padding:26px 30px 0;border-left:1px solid ${c.hairline};border-right:1px solid ${c.hairline};">
              <div style="height:1px;line-height:1px;font-size:0;background:${c.hairline};">&nbsp;</div>
            </td>
          </tr>

          <!-- SIGNATURE -->
          <tr>
            <td style="background:${c.cardBg};padding:22px 30px 30px;border-left:1px solid ${c.hairline};border-right:1px solid ${c.hairline};">
              <p style="margin:0;font-size:15.5px;line-height:1.65;color:${c.bodyText};">${escapeText(brand.signOff)}</p>
              <p style="margin:6px 0 0;font-size:15.5px;line-height:1.5;color:${c.heading};font-weight:700;">${escapeText(brand.senderName)}</p>
              <p style="margin:2px 0 0;font-size:13px;line-height:1.5;color:${c.muted};">${escapeText(brand.senderTitle)}</p>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background:${c.navy};border-radius:0 0 16px 16px;padding:24px 30px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="vertical-align:middle;">
                    <span style="font-size:13px;font-weight:700;letter-spacing:.02em;color:#ffffff;">${escapeText(brand.wordmarkPrimary)}</span><span style="font-size:13px;font-weight:700;letter-spacing:.02em;color:${c.amber};">&nbsp;${escapeText(brand.wordmarkAccent.trim())}</span>
                  </td>
                  <td align="right" style="vertical-align:middle;">
                    <a href="${escapeAttr(brand.linkedinUrl)}" style="color:${c.headerSubtitle};text-decoration:none;font-size:12.5px;">LinkedIn</a>
                    <span style="color:${c.footerDivider};font-size:12.5px;">&nbsp;&middot;&nbsp;</span>
                    <a href="${escapeAttr(brand.websiteUrl)}" style="color:${c.headerSubtitle};text-decoration:none;font-size:12.5px;">${escapeText(brand.websiteLabel)}</a>
                  </td>
                </tr>
              </table>

              <div style="height:16px;line-height:16px;font-size:0;">&nbsp;</div>

              <p style="margin:0;font-size:11.5px;line-height:1.6;color:${c.footerText};">
                ${escapeText(brand.footerIntro)}${addressLine()}
              </p>
              <p style="margin:10px 0 0;font-size:11.5px;line-height:1.6;color:${c.footerText};">
                <a href="${unsub}" style="color:${c.headerSubtitle};text-decoration:underline;">Unsubscribe</a>
              </p>
            </td>
          </tr>

        </table>
        <!--[if mso]></td></tr></table><![endif]-->

      </td>
    </tr>
  </table>
</body>
</html>`;
}
