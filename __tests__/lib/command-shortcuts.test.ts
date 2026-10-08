import { getCommandShortcutAction } from "@/lib/command-shortcuts";

const press = (
  key: string,
  mods: { metaKey?: boolean; ctrlKey?: boolean; shiftKey?: boolean } = {}
) =>
  getCommandShortcutAction({
    key,
    metaKey: false,
    ctrlKey: false,
    shiftKey: false,
    ...mods,
  });

describe("getCommandShortcutAction", () => {
  it("opens the command menu with Cmd+K and Ctrl+K", () => {
    expect(press("k", { metaKey: true })).toBe("toggle");
    expect(press("k", { ctrlKey: true })).toBe("toggle");
  });

  it("keeps Cmd+J / Ctrl+J as an alias for the command menu", () => {
    expect(press("j", { metaKey: true })).toBe("toggle");
    expect(press("j", { ctrlKey: true })).toBe("toggle");
  });

  it("navigates with Shift+Cmd/Ctrl+D and Shift+Cmd/Ctrl+P", () => {
    expect(press("D", { metaKey: true, shiftKey: true })).toBe("dashboard");
    expect(press("D", { ctrlKey: true, shiftKey: true })).toBe("dashboard");
    expect(press("P", { metaKey: true, shiftKey: true })).toBe("profile");
    expect(press("P", { ctrlKey: true, shiftKey: true })).toBe("profile");
  });

  it("closes the menu on Escape", () => {
    expect(press("Escape")).toBe("close");
  });

  it("ignores keys without a modifier", () => {
    expect(press("k")).toBeNull();
    expect(press("D", { shiftKey: true })).toBeNull();
  });
});
