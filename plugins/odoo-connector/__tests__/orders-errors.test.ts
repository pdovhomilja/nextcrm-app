import { FinalError, failKind } from "../orders-errors";
import { OdooAuthError, OdooError } from "../odoo";
import { settingsSchema } from "../settings";

it("sorts failures into unreachable, denied and refused", () => {
  expect(failKind(new OdooError("down", 0))).toBe("unreachable");
  expect(failKind(new OdooError("bad gateway", 502))).toBe("unreachable");
  expect(failKind(new OdooError("slow down", 429))).toBe("unreachable");
  expect(failKind(new OdooAuthError(401))).toBe("denied");
  expect(failKind(new OdooError("Odoo denied access: x", 403))).toBe("denied");
  expect(failKind(new OdooError("Odoo error 422: Missing required field", 422))).toBe("refused");
  expect(failKind(new Error("anything else"))).toBe("refused");
  expect(new FinalError("x")).toBeInstanceOf(Error);
});

it("has sendOrders off by default", () => {
  expect(settingsSchema.parse({ url: "https://o.example.com", database: "d" }).sendOrders).toBe(false);
});
