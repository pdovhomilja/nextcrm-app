// Absolute unsubscribe link for campaign emails, built from the app's public URL.
export function buildUnsubscribeUrl(
  token: string,
  baseUrl: string | undefined = process.env.NEXT_PUBLIC_APP_URL
) {
  return `${(baseUrl ?? "").replace(/\/+$/, "")}/api/campaigns/unsubscribe?token=${token}`;
}
