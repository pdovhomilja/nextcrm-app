import { describe, expect, it } from "vitest";
import { sum } from "./sum";

describe("sum", () => {
  it("suma dos números positivos", () => {
    expect(sum(1, 2)).toBe(3);
  });

  it("suma números negativos", () => {
    expect(sum(-1, -2)).toBe(-3);
  });

  it("suma un positivo y un negativo", () => {
    expect(sum(5, -2)).toBe(3);
  });

  it("suma con cero", () => {
    expect(sum(10, 0)).toBe(10);
  });

  it("suma números decimales", () => {
    expect(sum(1.5, 2.5)).toBe(4);
  });

  it.each([
    [1, 2, 3],
    [10, 20, 30],
    [-1, 1, 0],
    [0, 0, 0],
  ])("sum(%i, %i) = %i", (a, b, result) => {
    expect(sum(a, b)).toBe(result);
  });
});
