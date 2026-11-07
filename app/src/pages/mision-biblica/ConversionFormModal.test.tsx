import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ConversionFormModal } from "./ConversionFormModal";
import { PASOS_MISION_DEFECTO, PS_DISCIPULADO } from "../../lib/pasosMision";
import type { Conversion, Persona } from "../../lib/types";
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

// ════════════════════════════════════════════════════════════════════
// Guardia «ya en Misión» (2026-11-07) — caso real: la misma persona
// entró dos veces como nueva convertida y nacieron dos registros sin
// aviso. Al CREAR, si la persona elegida ya tiene conversión, el
// formulario avisa con su estado vivo y rotula el guardado («Crear
// otra de todos modos»): crear otra pasa a ser decisión informada.
// Al editar no hay aviso: la guardia juzga el alta, no la edición.
// ════════════════════════════════════════════════════════════════════

const maria: Persona = {
  id: "p1", nombre: "María", apellido: "González", numeroIdentidad: "90050112345", telefono: "5551234",
  email: "", direccion: "", zona: "Norte", fechaNacimiento: "1990-05-01", profesion: "",
  estadoCivil: "Casado", contactoPreferido: "WhatsApp", bautizado: false, fechaBautismo: "",
  conyuge: "", hijos: "", grupoId: null, hermanoMayorId: null,
  creado: "2024-01-01T00:00:00.000Z", version: 1,
};

const convDe = (over: Partial<Conversion> = {}): Conversion => ({
  id: "c1", nombre: "", apellido: "", telefono: "", edad: "", direccion: "", familia: "No",
  fecha: "2026-01-10", zona: "", grupoId: "", hermanoMayorId: null, email: "", profesion: "",
  bautizado: false, fechaBautismo: "", conyuge: "", hijos: "", estado: "ps-discipulado",
  notas: "", historial: [], creado: "2026-01-10T00:00:00.000Z", version: 1, personaId: "p1", ...over,
});

function renderCrear(over: {
  conversiones?: Conversion[];
  editConvId?: string | null;
  onClose?: () => void;
  onVerConversion?: (id: string) => void;
} = {}) {
  return render(
    <ConversionFormModal
      pasos={PASOS_MISION_DEFECTO}
      open
      onClose={over.onClose ?? vi.fn()}
      editConvId={over.editConvId ?? null}
      saveConv={vi.fn()}
      personas={[maria]}
      grupos={[]}
      evangelismos={[]}
      conversiones={over.conversiones}
      onVerConversion={over.onVerConversion}
      fPersonaId="p1" setFPersonaId={setter()}
      fFecha="2026-02-01" setFFecha={setter()}
      fFamilia="No" setFFamilia={setter()}
      fEstado="ps-nuevo" setFEstado={setter()}
      fNotas="" setFNotas={setter()}
      fEvangelismoId="" setFEvangelismoId={setter()}
      fHistorial={[]} setFHistorial={setter()}
    />,
  );
}

describe("ConversionFormModal — guardia «ya en Misión»", () => {
  it("persona CON conversión: aviso con el estado vivo y guardado rotulado «Crear otra de todos modos»", () => {
    renderCrear({ conversiones: [convDe()] });
    const aviso = screen.getByText(/ya tiene una conversión registrada/);
    expect(aviso).toBeInTheDocument();
    expect(aviso.textContent).toContain("Discipulado");
    expect(screen.getByRole("button", { name: /Crear otra de todos modos/ })).toBeInTheDocument();
  });

  it("«Ver esa ficha» cierra el formulario y pide abrir la conversión existente", () => {
    const onClose = vi.fn();
    const onVerConversion = vi.fn();
    renderCrear({ conversiones: [convDe()], onClose, onVerConversion });
    fireEvent.click(screen.getByRole("button", { name: /Ver esa ficha/ }));
    expect(onVerConversion).toHaveBeenCalledWith("c1");
    expect(onClose).toHaveBeenCalledTimes(1);
    // Primero se cierra este modal: si no, su cierre pisaría la apertura
    // del detalle (ambos escriben el mismo estado `modal` de la página).
    expect(onClose.mock.invocationCallOrder[0]).toBeLessThan(onVerConversion.mock.invocationCallOrder[0]);
  });

  it("persona SIN conversión: ni aviso ni rótulo especial", () => {
    renderCrear({ conversiones: [] });
    expect(screen.queryByText(/ya tiene una conversión registrada/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Crear otra de todos modos/)).not.toBeInTheDocument();
  });

  it("al EDITAR no hay aviso aunque la persona tenga otra conversión", () => {
    renderCrear({ conversiones: [convDe()], editConvId: "c9" });
    expect(screen.queryByText(/ya tiene una conversión registrada/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Crear otra de todos modos/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Guardar Cambios/ })).toBeInTheDocument();
  });
});
