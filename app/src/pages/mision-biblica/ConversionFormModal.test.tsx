import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ConversionFormModal } from "./ConversionFormModal";
import { PASOS_MISION_DEFECTO, PS_DISCIPULADO } from "../../lib/pasosMision";
import type { Dispatch, SetStateAction } from "react";

// ════════════════════════════════════════════════════════════════════
// Pulido · F9 — el formulario nunca abre con el selector de estado en
// blanco: si el valor guardado ya no está en el catálogo (el paso se
// borró), el select pinta una opción extra con la etiqueta de respaldo
// y el valor se conserva tal cual si no se toca.
// ════════════════════════════════════════════════════════════════════

const setter = <T,>(): Dispatch<SetStateAction<T>> => vi.fn() as unknown as Dispatch<SetStateAction<T>>;

/** El catálogo SIN «Discipulado»: la iglesia lo borró (uso e historial habían quedado en cero en otro equipo). */
const sinDiscipulado = PASOS_MISION_DEFECTO.filter((p) => p.id !== PS_DISCIPULADO);

function renderForm(over: { fEstado?: string; fHistorial?: { fecha: string; estado: string; nota: string }[] } = {}) {
  return render(
    <ConversionFormModal
      pasos={sinDiscipulado}
      open
      onClose={vi.fn()}
      editConvId="c1"
      saveConv={vi.fn()}
      personas={[]}
      grupos={[]}
      evangelismos={[]}
      fPersonaId="" setFPersonaId={setter()}
      fFecha="2026-01-15" setFFecha={setter()}
      fFamilia="No" setFFamilia={setter()}
      fEstado={over.fEstado ?? "ps-nuevo"} setFEstado={setter()}
      fNotas="" setFNotas={setter()}
      fEvangelismoId="" setFEvangelismoId={setter()}
      fHistorial={over.fHistorial ?? []} setFHistorial={setter()}
    />,
  );
}

/** Las opciones «de respaldo»: las que anuncian que el paso ya no está en el catálogo. */
const opcionesRespaldo = () =>
  screen.getAllByRole("option").filter((o) => (o as HTMLOptionElement).textContent?.includes("ya no está en el catálogo"));

describe("ConversionFormModal (F9)", () => {
  it("estado en un paso BORRADO: el select lo muestra con su nombre histórico y conserva el valor", () => {
    renderForm({ fEstado: PS_DISCIPULADO });
    const respaldo = opcionesRespaldo();
    expect(respaldo).toHaveLength(1);
    expect((respaldo[0] as HTMLOptionElement).value).toBe(PS_DISCIPULADO);
    expect(respaldo[0].textContent).toContain("Discipulado");
    // El selector NO está en blanco: su valor es el estado guardado.
    const select = respaldo[0].closest("select") as HTMLSelectElement;
    expect(select.value).toBe(PS_DISCIPULADO);
  });

  it("lo mismo en el selector de cada entrada del historial editable", () => {
    renderForm({ fHistorial: [{ fecha: "2026-02-01", estado: PS_DISCIPULADO, nota: "Entró" }] });
    const respaldo = opcionesRespaldo();
    expect(respaldo).toHaveLength(1);
    expect((respaldo[0].closest("select") as HTMLSelectElement).value).toBe(PS_DISCIPULADO);
  });

  it("con el valor dentro del catálogo no aparece ninguna opción de respaldo", () => {
    renderForm({ fEstado: "ps-nuevo" });
    expect(opcionesRespaldo()).toHaveLength(0);
  });
});
