import { allowedActions, can, canPluginSet, nextStatuses, toActor } from "@/lib/orders/transitions";
import type { OrderActor, OrderState, OrderStatus } from "@/lib/orders/types";

const rep: OrderActor = { kind: "user", id: "rep", role: "user" };
const otherRep: OrderActor = { kind: "user", id: "rep2", role: "user" };
const manager: OrderActor = { kind: "user", id: "m", role: "manager" };
const o = (status: OrderStatus, over: Partial<OrderState> = {}): OrderState => ({ status, source: "CRM", createdBy: "rep", externalRef: null, ...over });

it("lets the creator and managers edit, delete and submit drafts only", () => {
  for (const a of ["edit", "delete", "submit"] as const) {
    expect(can(o("DRAFT"), a, rep)).toBe(true);
    expect(can(o("DRAFT"), a, manager)).toBe(true);
    expect(can(o("DRAFT"), a, otherRep)).toBe(false);
    expect(can(o("READY"), a, manager)).toBe(false);
  }
});

it("leaves approval to managers and withdraw to the creator", () => {
  expect(can(o("PENDING_APPROVAL"), "approve", manager)).toBe(true);
  expect(can(o("PENDING_APPROVAL"), "reject", manager)).toBe(true);
  expect(can(o("PENDING_APPROVAL"), "approve", rep)).toBe(false);
  expect(can(o("PENDING_APPROVAL"), "withdraw", rep)).toBe(true);
  expect(can(o("PENDING_APPROVAL"), "withdraw", manager)).toBe(false);
  expect(can(o("PENDING_APPROVAL"), "edit", rep)).toBe(false);
});

it("reopens READY orders only before a connector picked them up", () => {
  expect(can(o("READY"), "reopen", rep)).toBe(true);
  expect(can(o("READY", { externalRef: "SO1" }), "reopen", manager)).toBe(false);
});

it("lets managers move orders forward by hand, skipping steps", () => {
  expect(nextStatuses("READY")).toEqual(["SENT", "CONFIRMED", "DELIVERED", "INVOICED", "PAID"]);
  expect(nextStatuses("INVOICED")).toEqual(["PAID"]);
  expect(nextStatuses("PAID")).toEqual([]);
  expect(nextStatuses("DRAFT")).toEqual([]);
  expect(can(o("READY"), "advance", manager)).toBe(true);
  expect(can(o("READY"), "advance", rep)).toBe(false);
  expect(can(o("PAID"), "advance", manager)).toBe(false);
});

it("cancels per role and never cancels final orders", () => {
  expect(can(o("READY"), "cancel", rep)).toBe(true);
  expect(can(o("SENT"), "cancel", rep)).toBe(false);
  expect(can(o("SENT"), "cancel", manager)).toBe(true);
  expect(can(o("SYNC_FAILED"), "cancel", manager)).toBe(true);
  expect(can(o("PAID"), "cancel", manager)).toBe(false);
  expect(can(o("CANCELLED"), "cancel", manager)).toBe(false);
  expect(can(o("SYNC_FAILED"), "retry", manager)).toBe(true);
  expect(can(o("SYNC_FAILED"), "retry", rep)).toBe(false);
});

it("locks EXTERNAL orders for every user (spec § 3.2)", () => {
  expect(allowedActions(o("SENT", { source: "EXTERNAL" }), manager)).toEqual([]);
  expect(allowedActions(o("DRAFT", { source: "EXTERNAL" }), rep)).toEqual([]);
});

it("never lets a plugin approve, submit or touch drafts (Review Focus 4)", () => {
  expect(allowedActions(o("PENDING_APPROVAL"), { kind: "plugin" })).toEqual([]);
  expect(canPluginSet(o("READY"), "SENT")).toBe(true);
  expect(canPluginSet(o("SENT"), "SYNC_FAILED")).toBe(true);
  expect(canPluginSet(o("READY"), "READY")).toBe(false);
  expect(canPluginSet(o("SENT"), "DRAFT")).toBe(false);
  expect(canPluginSet(o("DRAFT"), "SENT")).toBe(false);
  expect(canPluginSet(o("PENDING_APPROVAL"), "SENT")).toBe(false);
  expect(canPluginSet(o("PAID"), "CANCELLED")).toBe(false);
});

it("maps session users to actors", () => {
  expect(toActor({ id: "x", role: "manager" })).toEqual({ kind: "user", id: "x", role: "manager" });
  expect(toActor({ id: "x", role: "weird" })).toEqual({ kind: "user", id: "x", role: "user" });
});
