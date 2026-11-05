import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MiembroDetailModal } from './MiembroDetailModal';
import type { Estudiante, Hito, Miembro, PasoSeguimiento, Persona } from '../../lib/types';

// Fase 1: la escalera «🧭 Pasos del miembro» en la ficha. El harness
// sigue el patrón de PersonaDetailModal.test.tsx: todo entra por props
// (la página arma el contexto con useLiveQuery; aquí se siembra).

const miembro: Miembro = {
  id: 'm1', nombre: 'María', apellido: 'González', telefono: '5551234',
  email: '', direccion: '', zona: 'Norte', grupoId: 'g1',
  fechaNacimiento: '1990-05-01', fechaIngreso: '2024-02-01', estado: 'Activo',
  contactoPreferido: 'WhatsApp', profesion: 'Maestra', estadoCivil: 'Casado',
  bautizado: true, fechaBautismo: '', conyuge: '', hijos: '',
  hermanoMayorId: null, conversionId: null, personaId: 'p1', notas: '',
  creado: '2024-02-01T00:00:00.000Z', actualizado: '2024-02-01T00:00:00.000Z', version: 1,
};

const paso = (id: string, nombre: string, emoji: string, orden: number, fuente: PasoSeguimiento['fuente'], extra?: Partial<PasoSeguimiento>): PasoSeguimiento => ({
  id, ambito: 'miembro', nombre, emoji, orden, fuente,
  creado: '2026-01-01T00:00:00.000Z', version: 1, ...extra,
});

const PASOS: PasoSeguimiento[] = [
  paso('pm-integracion', 'Integrado', '🏘️', 1, 'integracion', { protegido: true }),
  paso('pm-grupo', 'En un grupo', '👥', 2, 'grupo'),
  paso('pm-academia', 'En la Academia', '🎓', 3, 'academia'),
  paso('pm-ministerio', 'Sirviendo en un ministerio', '🤲', 4, 'ministerio'),
  paso('pm-hermano-mayor', 'Hermano mayor de alguien', '🌱', 5, 'hermanoMayor'),
  paso('pm-liderazgo', 'Liderazgo', '⭐', 6, 'manual'),
];

const estudiante: Estudiante = {
  id: 'e1', nombre: 'María', apellido: 'González', telefono: '', edad: '', cursoId: 'cur1',
  fecha: '2024-03-01', estado: 'Activo', notas: '', creado: '2024-03-01T00:00:00.000Z',
  zona: 'Norte', grupoId: null, hermanoMayorId: null, email: '', direccion: '',
  profesion: '', bautizado: false, fechaBautismo: '', conyuge: '', hijos: '', personaId: 'p1', version: 1,
};

// Otra persona que tiene a María (p1) como hermana mayor.
const ahijada = { id: 'p2', nombre: 'Lucía', apellido: 'Paz', hermanoMayorId: 'p1' } as Persona;

function propsBase(extra?: Partial<Parameters<typeof MiembroDetailModal>[0]>) {
  return {
    open: true,
    onClose: () => {},
    selMiembro: miembro,
    conversiones: [],
    onDesvincular: () => {},
    asignacionesPorMiembro: {},
    hitosPorMiembro: {},
    pasosSeguimiento: PASOS,
    estudiantes: [estudiante],
    personas: [ahijada],
    onRegistrarPaso: vi.fn(),
    onQuitarPaso: vi.fn(),
    grupos: [],
    ministerios: [],
    qhTipo: 'Conversión', setQhTipo: () => {},
    qhFecha: '2024-01-01', setQhFecha: () => {},
    qhDesc: '', setQhDesc: () => {},
    quickAddHito: () => {},
    updateAsigRol: () => {},
    quickRemoveAsig: () => {},
    openEditH: () => {},
    onAsignar: () => {},
    onEditarPerfil: () => {},
    onEliminar: () => {},
    onEliminarHito: () => {},
    ...extra,
  };
}

const pintar = (extra?: Partial<Parameters<typeof MiembroDetailModal>[0]>) =>
  render(<MemoryRouter><MiembroDetailModal {...propsBase(extra)} /></MemoryRouter>);

describe('Fase 1 — escalera de pasos en la ficha del miembro', () => {
  it('pinta el progreso: 4 de 6, con el paso actual destacado y la fecha conocida', () => {
    pintar();
    // Cumplidos: integración (alta manual), grupo, academia, hermano mayor.
    expect(screen.getByText(/4 de 6 pasos/)).toBeTruthy();
    expect(screen.getByText('Integrado')).toBeTruthy();
    expect(screen.getByText('Sirviendo en un ministerio')).toBeTruthy();
    expect(screen.getByText(/paso actual/)).toBeTruthy();
    // La academia trae su fecha de matrícula (fuente viva).
    expect(screen.getByText(/Cumplido · 1 mar 2024/)).toBeTruthy();
  });

  it('el paso manual pendiente ofrece «Registrar paso» y avisa con el paso entero', () => {
    const p = propsBase();
    render(<MemoryRouter><MiembroDetailModal {...p} /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Registrar paso' }));
    expect(p.onRegistrarPaso).toHaveBeenCalledTimes(1);
    expect((p.onRegistrarPaso as ReturnType<typeof vi.fn>).mock.calls[0][0].id).toBe('pm-liderazgo');
  });

  it('el paso manual cumplido vía pasoId ofrece «Quitar» con el hito que lo registra', () => {
    const hitoPaso: Hito = {
      id: 'h7', miembroId: 'm1', fecha: '2025-01-20', tipo: 'Otro',
      descripcion: 'Liderazgo', pasoId: 'pm-liderazgo',
      creado: '2025-01-20T00:00:00.000Z', version: 1,
    };
    const p = propsBase({ hitosPorMiembro: { m1: [hitoPaso] } });
    render(<MemoryRouter><MiembroDetailModal {...p} /></MemoryRouter>);
    expect(screen.getByText(/5 de 6 pasos/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Quitar' }));
    expect(p.onQuitarPaso).toHaveBeenCalledWith('h7');
  });
});
