import { describe, it, expect } from "vitest";
import { toLowerCaseKeys, toCamelCaseKeys } from "./api";

describe("Sync API - Verification", () => {
  it("should lowercase keys correctly", () => {
    const obj = { planOfrendaMonto: 0 };
    const result = toLowerCaseKeys(obj) as Record<string, unknown>;
    expect(result).toHaveProperty("planofrendamonto");
    expect(result.planofrendamonto).toBe(0);
  });
});

describe("Mapeo de claves camelCase <-> minúsculas", () => {
  it("updatedAt va a updated_at y viceversa", () => {
    const out = toLowerCaseKeys({ updatedAt: "2026-10-20", version: 2 }) as Record<string, unknown>;
    expect(out).toHaveProperty("updated_at");
    const back = toCamelCaseKeys(out) as Record<string, unknown>;
    expect(back).toHaveProperty("updatedAt");
  });
});
