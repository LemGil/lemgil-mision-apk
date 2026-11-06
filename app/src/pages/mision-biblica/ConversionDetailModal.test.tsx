import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ConversionDetailModal } from './ConversionDetailModal';
import { PASOS_MISION_DEFECTO } from '../../lib/pasosMision';
import type { Conversion } from '../../lib/types';

// ════════════════════════════════════════════════════════════════════
// Bordes de la Fase 2 · F1 + F6 — el detalle de la conversión:
// (F1) una ficha importada ANTES del arreglo puede no traer
// `historial` en el registro real (el tipo lo declara obligatorio):
// abrirla lanzaba TypeError y quedaba intocable. El modal lo tolera
// como [] y la ficha se abre.
// (F6) el «Progreso» se mide dentro de la RUTA: un Integrado es
// 100 % / «paso 4 de 4» (antes 57 % / «paso 4 de 7», porque el
// denominador sumaba las salidas), y en una salida no hay porcentaje
// engañoso: 0 % con la etiqueta del estado como rótulo.
// ════════════════════════════════════════════════════════════════════

const convBase = (over: Partial<Conversion> = {}): Conversion => ({
  id: 'c1', nombre: 'Rosa', apellido: 'Díaz', telefono: '', edad: '',
  direccion: '', zona: 'Este', lider: '', grupoId: '', hermanoMayorId: null,
  email: '', profesion: '', bautizado: false, fechaBautismo: '', conyuge: '',
  hijos: '', familia: 'No', fecha: '2024-02-01', estado: 'ps-integrado',
  personaId: 'p1', evangelismoId: null, notas: '',
  historial: [{ fecha: '2024-02-01', estado: 'ps-nuevo', nota: 'Registro inicial' }],
  creado: '2024-02-01T00:00:00.000Z', version: 1,
  ...over,
});

/** La ficha tal como quedó en bases reales importadas antes de F1: SIN la clave `historial`. */
const sinHistorial = (over: Partial<Conversion> = {}): Conversion => {
  const c = convBase(over) as unknown as Record<string, unknown>;
  delete c.historial;
  return c as unknown as Conversion;
};

function renderDetalle(selConv: Conversion) {
  return render(
    <MemoryRouter>
      <ConversionDetailModal
        pasos={PASOS_MISION_DEFECTO}
        open
        onClose={vi.fn()}
        onEliminar={vi.fn()}
        onPermitirRecrear={vi.fn()}
        saveSeg={vi.fn()}
        selConv={selConv}
        miembroVinculado={undefined}
        hitosVinculado={[]}
        onVerMiembro={vi.fn()}
        grupos={[]}
        tempEst={null} setTempEst={vi.fn()}
        sNota="" setSNota={vi.fn()}
        sHito={false} setSHito={vi.fn()}
      />
    </MemoryRouter>,
  );
}

/** La tarjeta KPI «📊 Progreso» (el rótulo también vive en el pipeline: hay que acotar). */
const kpiProgreso = () => screen.getByText('📊 Progreso').closest('.kpi') as HTMLElement;

describe("ConversionDetailModal (F1 + F6)", () => {
  it("F1 · una ficha SIN historial se abre sin lanzar (antes: TypeError y ficha intocable)", () => {
    expect(() => renderDetalle(sinHistorial())).not.toThrow();
    expect(screen.getAllByText(/Rosa Díaz/).length).toBeGreaterThan(0);
    // Sin historial no hay línea de tiempo — y no pasa nada.
    expect(screen.queryByText('Historial de Seguimiento')).toBeNull();
  });

  it("F1 · con historial, la línea de tiempo se pinta como siempre", () => {
    renderDetalle(convBase());
    expect(screen.getByText('Historial de Seguimiento')).toBeTruthy();
    expect(screen.getByText('Registro inicial')).toBeTruthy();
  });

  it("F6 · Integrado: 100 % y «paso 4 de 4» (antes: 57 %, «paso 4 de 7»)", () => {
    renderDetalle(sinHistorial({ estado: 'ps-integrado' }));
    expect(within(kpiProgreso()).getByText('100%')).toBeTruthy();
    expect(within(kpiProgreso()).getByText('paso 4 de 4')).toBeTruthy();
  });

  it("F6 · en una salida: 0 % y el rótulo es la etiqueta del estado, sin «paso X de N»", () => {
    renderDetalle(sinHistorial({ estado: 'ps-apartado' }));
    expect(within(kpiProgreso()).getByText('0%')).toBeTruthy();
    expect(within(kpiProgreso()).getByText('Apartado')).toBeTruthy();
    expect(screen.queryByText(/paso \d+ de \d+/)).toBeNull();
  });

  it("F6 · a mitad de camino: Discipulado es «paso 2 de 4», 50 %", () => {
    renderDetalle(convBase({ estado: 'ps-discipulado' }));
    expect(within(kpiProgreso()).getByText('50%')).toBeTruthy();
    expect(within(kpiProgreso()).getByText('paso 2 de 4')).toBeTruthy();
  });
});
