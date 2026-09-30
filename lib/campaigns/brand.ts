// Fork-owned. Brand constants for the campaign email shell (lib/campaigns/email-shell.ts).
//
// These are hardcoded for this single-brand instance. The one per-instance value
// that is NOT hardcoded is the CAN-SPAM physical mailing address, which is read
// from the CAMPAIGN_MAILING_ADDRESS env var (see campaignMailingAddress()) so it
// can differ per deployment without a code change. To rebrand a separate instance
// (e.g. a second company), change the values in this file for that deployment.
//
// Palette + copy mirror the Rade Engineering transactional house style.

export const brand = {
  // Wordmark: rendered as "<primary><accent>" with the accent in amber.
  wordmarkPrimary: "RADE",
  wordmarkAccent: " ENGINEERING",
  tagline: "Decrypting technology for small business & family",

  logoUrl: "https://radeengineering.com/gears-mark.png",

  websiteUrl: "https://radeengineering.com",
  websiteLabel: "radeengineering.com",
  linkedinUrl: "https://www.linkedin.com/in/radesix/",

  // Signature block appended to every campaign email.
  signOff: "Thanks,",
  senderName: "Shaun Williams",
  senderTitle: "Founder, Rade Engineering",

  // Footer intro line (before the mailing address).
  footerIntro: "You’re receiving this because you’re a contact of Rade Engineering.",

  colors: {
    navy: "#0f1a2e",
    amber: "#e6a92e",
    amberInk: "#b07715",
    buttonText: "#2a1d02",
    pageBg: "#eef1f6",
    cardBg: "#ffffff",
    heading: "#101a2e",
    bodyText: "#2b3648",
    muted: "#8a93a3",
    hairline: "#e6e9ef",
    headerSubtitle: "#c4cfdf",
    footerText: "#93a3ba",
    footerDivider: "#47566e",
  },
} as const;

/**
 * Physical mailing address for the CAN-SPAM footer, from CAMPAIGN_MAILING_ADDRESS.
 * Returns "" when unset — the footer then omits the address line rather than
 * printing a blank one. Required in production for marketing-email compliance.
 */
export function campaignMailingAddress(): string {
  return (process.env.CAMPAIGN_MAILING_ADDRESS ?? "").trim();
}
