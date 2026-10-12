const LOCALES = ["en", "cz", "de", "uk"];

export function localeFromPathname(pathname: string): string {
  const first = pathname.split("/").filter(Boolean)[0];
  return first && LOCALES.includes(first) ? first : "en";
}

export function postLoginPath(
  locale: string,
  user: { mustChangePassword?: boolean | null }
): string {
  if (user.mustChangePassword) {
    return `/${locale}/change-password`;
  }
  return `/${locale}`;
}
