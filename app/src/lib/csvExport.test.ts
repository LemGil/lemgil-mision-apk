import { describe, it, expect, vi, beforeAll } from "vitest";
import { exportCSV } from "./csvExport";

// Captura el Blob que exportCSV pasa a URL.createObjectURL para inspeccionarlo.
let ultimoBlob: Blob | null = null;

beforeAll(() => {
  URL.createObjectURL = vi.fn((b: Blob) => {
    ultimoBlob = b;
    return "blob:mock";
  });
  URL.revokeObjectURL = vi.fn();
});

async function blobText(b: Blob): Promise<string> {
  if (typeof b.text === "function") return b.text();
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsText(b);
  });
}

async function generarCSV(headers: string[], rows: (string | number)[][]): Promise<string> {
  ultimoBlob = null;
  exportCSV(headers, rows, "prueba.csv");
  expect(ultimoBlob).not.toBeNull();
  return blobText(ultimoBlob as unknown as Blob);
}

describe("exportCSV: escapado de comas y comillas (RFC 4180)", () => {
  it("un valor con coma va entre comillas", async () => {
    const txt = await generarCSV(["Nombre", "Monto"], [["Pérez, Juan", 1500]]);
    expect(txt).toContain('"Pérez, Juan",1500');
  });

  it("un valor con comillas las duplica y va entre comillas", async () => {
    const txt = await generarCSV(["Nota"], [['Dijo "amén" y siguió']]);
    expect(txt).toContain('"Dijo ""amén"" y siguió"');
  });

  it("un valor con salto de línea va entre comillas", async () => {
    const txt = await generarCSV(["Nota"], [["línea 1\nlínea 2"]]);
    expect(txt).toContain('"línea 1\nlínea 2"');
  });

  it("los valores simples NO se entrecomillan y los números quedan tal cual", async () => {
    const txt = await generarCSV(["Nombre", "Cantidad"], [["Ana", 42]]);
    expect(txt).toContain("Ana,42");
    expect(txt).not.toContain('"Ana"');
  });

  it("las cabeceras con coma también se escapan", async () => {
    const txt = await generarCSV(["Apellido, Nombre", "Valor"], [["Ruiz", 1]]);
    expect(txt).toContain('"Apellido, Nombre",Valor');
  });
});
