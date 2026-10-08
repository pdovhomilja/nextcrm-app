export type CommandShortcutAction = "toggle" | "close" | "dashboard" | "profile";

// Maps a keydown to a command-menu action. Cmd (Mac) and Ctrl (Windows/Linux)
// are treated the same.
export function getCommandShortcutAction(
  e: Pick<KeyboardEvent, "key" | "metaKey" | "ctrlKey" | "shiftKey">
): CommandShortcutAction | null {
  if (e.key === "Escape") return "close";
  if (!e.metaKey && !e.ctrlKey) return null;

  const key = e.key.toLowerCase();
  if (e.shiftKey) {
    if (key === "d") return "dashboard";
    if (key === "p") return "profile";
    return null;
  }
  if (key === "k" || key === "j") return "toggle";
  return null;
}
