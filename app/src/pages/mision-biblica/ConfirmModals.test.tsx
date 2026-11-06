import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ConfirmModals } from "./ConfirmModals";
import type { ModalType } from "./constants";

// ════════════════════════════════════════════════════════════════════
// Pulido · F12 + M7 — borrar un evangelismo o un grupo AVISA con el
// conteo de vínculos que quedan desvinculados, con el mismo patrón
// que ya tenía la confirmación de conversión con su miembro.
// ════════════════════════════════════════════════════════════════════

function renderConf(over: { modal: ModalType; evangVinculadas?: number; grupoAsignadas?: number }) {
  return render(
    <ConfirmModals
      modal={over.modal}
      selConv={undefined}
      grupoNombre="Grupo Esperanza"
      evangVinculadas={over.evangVinculadas}
      grupoAsignadas={over.grupoAsignadas}
      onClose={vi.fn()}
      delConv={vi.fn()}
      delGrupo={vi.fn()}
      delEvang={vi.fn()}
    />,
  );
}

describe("ConfirmModals (F12 + M7)", () => {
  it("evangelismo con conversiones de origen: la confirmación nombra el conteo y el destino", () => {
    renderConf({ modal: "confirmEvang", evangVinculadas: 3 });
    expect(screen.getByText(/3 conversión\(es\) tienen esta actividad como origen/)).toBeTruthy();
    expect(screen.getByText(/sin origen/)).toBeTruthy();
  });

  it("evangelismo sin conversiones vinculadas: ningún aviso", () => {
    renderConf({ modal: "confirmEvang", evangVinculadas: 0 });
    expect(screen.queryByText(/como origen/)).toBeNull();
  });

  it("grupo con personas asignadas: la confirmación nombra el conteo y el destino", () => {
    renderConf({ modal: "confirmGrupo", grupoAsignadas: 2 });
    expect(screen.getByText(/2 persona\(s\) están asignadas a este grupo/)).toBeTruthy();
    expect(screen.getByText(/sin grupo/)).toBeTruthy();
  });

  it("grupo sin asignados: ningún aviso", () => {
    renderConf({ modal: "confirmGrupo", grupoAsignadas: 0 });
    expect(screen.queryByText(/asignadas a este grupo/)).toBeNull();
  });
});
