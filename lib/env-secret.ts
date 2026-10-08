/**
 * Read an API key / secret from the environment, treating empty values and
 * obvious template placeholders ("sk-placeholder-…", "your-openai-api-key")
 * as unset. Older compose files and env examples filled these in when the
 * real value was missing, which made the env value shadow keys saved in the
 * admin panel.
 */
export function envSecret(name: string): string | undefined {
  const value = process.env[name]?.trim();
  if (!value) return undefined;
  if (/placeholder|^your[-_]/i.test(value)) return undefined;
  return value;
}
