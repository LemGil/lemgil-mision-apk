import { describe, it, expect } from "vitest";
import { toLowerCaseKeys } from "./api";

describe("Sync API - Verification", () => {
  it("should lowercase keys correctly", () => {
    const obj = { planOfrendaMonto: 0 };
    const result = toLowerCaseKeys(obj) as Record<string, unknown>;
    expect(result).toHaveProperty("planofrendamonto");
    expect(result.planofrendamonto).toBe(0);
  });
});
