import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ConversionesTable } from "./ConversionesTable";
import { PASOS_MISION_DEFECTO } from "../../lib/pasosMision";
import type { Conversion } from "../../lib/types";

// ════════════════════════════════════════════════════════════════════
// Pulido · F11 — la tabla no afirma «✓ Miembro» sin miembro: la
// insignia sale del conjunto REAL de conversiones con miembro que
// construye la página. En el gozne SIN miembro se advierte
// «⚠ Sin miembro»; fuera del gozne, ninguna de las dos.
// ════════════════════════════════════════════════════════════════════

const conv = (over: Partial<Conversion> = {}): Conversion => ({
  id: "c1", nombre: "Rosa", apellido: "Díaz", telefono: "", edad: "",
  direccion: "", zona: "Este", lider: "", grupoId: "", hermanoMayorId: null,
  email: "", profesion: "", bautizado: false, fechaBautismo: "", conyuge: "",
  hijos: "", familia: "No", fecha: "2026-01-15", estado: "ps-integrado",
  personaId: "p1", evangelismoId: null, notas: "", historial: [],
  creado: "2026-01-15T00:00:00.000Z", version: 1, ...over,
});

function renderTabla(convs: Conversion[], conMiembro: Set<string>) {
  return render(
    <ConversionesTable
      pasos={PASOS_MISION_DEFECTO}
      convs={convs}
      filtered={convs}
      convsConMiembro={conMiembro}
      grupos={[]}
      filterEstado=""
      filterZona=""
      filterAnoConv=""
      filterMesConv=""
      openDetail={vi.fn()}
      openEditConv={vi.fn()}
      quickAdv={vi.fn()}
    />,
  );
}

describe("ConversionesTable (F11)", () => {
  it("en el gozne CON miembro real: «✓ Miembro»", () => {
    renderTabla([conv()], new Set(["c1"]));
    expect(screen.getByText("✓ Miembro")).toBeTruthy();
    expect(screen.queryByText("⚠ Sin miembro")).toBeNull();
  });

  it("en el gozne SIN miembro: «⚠ Sin miembro», nunca la afirmación falsa", () => {
    renderTabla([conv()], new Set());
    expect(screen.getByText("⚠ Sin miembro")).toBeTruthy();
    expect(screen.queryByText("✓ Miembro")).toBeNull();
  });

  it("fuera del gozne y sin miembro: ninguna insignia de miembro", () => {
    renderTabla([conv({ estado: "ps-discipulado" })], new Set());
    expect(screen.queryByText("✓ Miembro")).toBeNull();
    expect(screen.queryByText("⚠ Sin miembro")).toBeNull();
  });
});
