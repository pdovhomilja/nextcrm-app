// Escaping for text from the code that lands in MDX table cells.

/** Plain text: backslash first, then the characters GFM tables and MDX treat as syntax. */
export const cell = (s: string) =>
  s
    .replace(/\s+/g, " ")
    .replace(/\\/g, "\\\\")
    .replace(/\|/g, "\\|")
    .replace(/[{}]/g, (c) => `\\${c}`)
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

/**
 * Inline code. A code span can't hold a backslash before a pipe inside a GFM
 * table, so text with a backslash, pipe or backtick becomes a JSX string.
 */
export const code = (s: string) =>
  /[\\|`]/.test(s) ? `<code>{${JSON.stringify(s).replace(/\|/g, "\\u007c")}}</code>` : `\`${s}\``;
