import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MiembroFormModal } from './MiembroFormModal';
import type { Miembro, Persona } from '../../lib/types';

const maria: Persona = {
  id: 'p1', nombre: 'María', apellido: 'González', numeroIdentidad: '90050112345', telefono: '5551234',
  email: '', direccion: '', zona: 'Norte', fechaNacimiento: '1990-05-01', profesion: '',
  estadoCivil: 'Casado', contactoPreferido: 'WhatsApp', bautizado: true, fechaBautismo: '2010-01-01',
  conyuge: '', hijos: '', grupoId: null, hermanoMayorId: null,
  creado: '2024-01-01T00:00:00.000Z', version: 1,
};

const miembroDe = (over: Partial<Miembro> = {}): Miembro => ({
  id: 'm1', nombre: '', apellido: '', telefono: '', email: '', direccion: '', zona: '',
  grupoId: null, fechaNacimiento: '', fechaIngreso: '2024-02-01', estado: 'Activo',
  contactoPreferido: 'WhatsApp', profesion: '', estadoCivil: 'Soltero',
  bautizado: true, fechaBautismo: '', conyuge: '', hijos: '', hermanoMayorId: null,
  conversionId: null, personaId: 'p1', notas: '',
  creado: '2024-02-01T00:00:00.000Z', actualizado: '2024-02-01T00:00:00.000Z', version: 1,
  ...over,
});

function renderCrear(over: { miembros?: Miembro[]; onVerMiembro?: (id: string) => void } = {}) {
  return render(
    <MiembroFormModal
      open
      onClose={vi.fn()}
      editMId={null}
      saveM={vi.fn()}
      personas={[maria]}
      grupos={[]}
      miembros={over.miembros}
      onVerMiembro={over.onVerMiembro}
      mPersonaId="p1" setMPersonaId={vi.fn()}
      mIngreso="2026-02-01" setMIngreso={vi.fn()}
      mEstado="Activo" setMEstado={vi.fn()}
      mNotas="" setMNotas={vi.fn()}
    />,
  );
}

describe('MiembroFormModal — bloqueo «ya es miembro» (2026-11-17)', () => {
  it('persona CON ficha en Miembros: aviso con su estado y «Registrar miembro» deshabilitado', () => {
    renderCrear({ miembros: [miembroDe()] });
    const aviso = screen.getByText(/ya es miembro/);
    expect(aviso.textContent).toContain('Activo');
    expect(aviso.textContent).toContain('UNA ficha en Miembros');
    expect(screen.getByRole('button', { name: /Registrar miembro/ })).toBeDisabled();
  });

  it('«Ver esa ficha» abre el miembro existente', () => {
    const onVerMiembro = vi.fn();
    renderCrear({ miembros: [miembroDe()], onVerMiembro });
    fireEvent.click(screen.getByRole('button', { name: /Ver esa ficha/ }));
    expect(onVerMiembro).toHaveBeenCalledWith('m1');
  });

  it('persona SIN ficha: sin aviso y el guardado habilitado', () => {
    renderCrear({ miembros: [] });
    expect(screen.queryByText(/ya es miembro/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Registrar miembro/ })).not.toBeDisabled();
  });
});
