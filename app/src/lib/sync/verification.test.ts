import { describe, it, expect } from "vitest";
import { toLowerCaseKeys, toCamelCaseKeys, parseMissingColumn } from "./api";

describe("Sync API - Verification", () => {
  it("should lowercase keys correctly", () => {
    const obj = { planOfrendaMonto: 0 };
    const result = toLowerCaseKeys(obj) as Record<string, unknown>;
    expect(result).toHaveProperty("planofrendamonto");
    expect(result.planofrendamonto).toBe(0);
  });
});

describe("parseMissingColumn (escalera adaptativa de columnas)", () => {
  it("extrae 'version' del mensaje de PostgREST", () => {
    const msg = "Could not find the 'version' column of 'cursos' in the schema cache";
    expect(parseMissingColumn(msg)).toBe("version");
  });

  it("extrae 'updated_at' del mensaje de PostgREST", () => {
    const msg = "Could not find the 'updated_at' column of 'zonas' in the schema cache";
    expect(parseMissingColumn(msg)).toBe("updated_at");
  });

  it("extrae cualquier otra columna nombrada en el mensaje", () => {
    const msg = "Could not find the 'codigo' column of 'metas' in the schema cache";
    expect(parseMissingColumn(msg)).toBe("codigo");
  });

  it("devuelve null ante un mensaje ajeno", () => {
    expect(parseMissingColumn("duplicate key value violates unique constraint")).toBeNull();
    expect(parseMissingColumn("Network request failed")).toBeNull();
    expect(parseMissingColumn("")).toBeNull();
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
