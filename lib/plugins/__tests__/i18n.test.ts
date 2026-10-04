jest.mock("@/lib/plugins/registry", () => ({
  getRegistry: () => [{ definition: { id: "demo" }, messages: { en: { err: { taken: "Taken until {date}" } }, cz: { err: { taken: "Chráněno do {date}" } } } }],
}));
import { mergePluginMessages, translatePluginMessage } from "@/lib/plugins/i18n";

it("merges plugin messages under plugins.<id> with en fallback", () => {
  const merged = mergePluginMessages({ Common: { ok: "OK" } }, "de");
  expect(merged).toEqual({ Common: { ok: "OK" }, plugins: { demo: { err: { taken: "Taken until {date}" } } } });
});

it("translates plugin and core keys", () => {
  expect(translatePluginMessage("demo", "err.taken", { date: "1. 1." }, "cz")).toBe("Chráněno do 1. 1.");
  expect(translatePluginMessage(null, "ruleUnavailable", undefined, "en")).toBe("A plugin rule is unavailable. The change was not saved.");
  expect(translatePluginMessage("demo", "missing.key", undefined, "en")).toBe("demo:missing.key");
});
