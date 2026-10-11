/** Default product name when NEXT_PUBLIC_APP_NAME is unset. */
export const DEFAULT_APP_NAME = "VenSai CRM";

export function getAppName(): string {
  return process.env.NEXT_PUBLIC_APP_NAME?.trim() || DEFAULT_APP_NAME;
}
