import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PersonaFormModal } from './PersonaFormModal';
import { db } from '../lib/database';
import type { Persona } from '../lib/types';

const maria: Persona = {
  id: 'p1', nombre: 'María', apellido: 'González', numeroIdentidad: '90050112345', telefono: '5551234',
  email: '', direccion: '', zona: 'Norte', fechaNacimiento: '1990-05-01', profesion: '',
  estadoCivil: 'Casado', contactoPreferido: 'WhatsApp', bautizado: false, fechaBautismo: '',
  conyuge: '', hijos: '', grupoId: null, hermanoMayorId: null,
  creado: '2024-01-01T00:00:00.000Z', version: 1,
};

/**
 * Guardia «ya registrada» por NOMBRE (2026-11-07): el formulario único
 * solo bloqueaba por Nº de Identidad, y el carné no es obligatorio —
 * con el nombre idéntico y sin carné, la misma persona se tecleaba dos
 * veces sin un solo aviso (el caso real de LemGil). Ahora avisa si el
 * nombre ya existe, muestra el detalle de la ficha y ofrece usarla.
 * NO bloquea Guardar: los homónimos existen y la decisión final es de
 * quien registra. (La guardia dura sigue siendo la del carné.)
 */
describe('PersonaFormModal — guardia «ya registrada» por nombre', () => {
  beforeEach(async () => {
    await db.personas.clear();
    await db.personas.bulkAdd([maria]);
  });
  afterEach(async () => { await db.personas.clear(); });

  const teclearNombre = (nombre: string, apellido: string) => {
    fireEvent.change(screen.getByPlaceholderText('Juan'), { target: { value: nombre } });
    fireEvent.change(screen.getByPlaceholderText('Pérez'), { target: { value: apellido } });
  };

  it('nombre que ya existe: aviso con el detalle de la ficha y «Usar esta persona», sin bloquear Guardar', async () => {
    const onSaved = vi.fn();
    const onClose = vi.fn();
    render(<PersonaFormModal open onClose={onClose} onSaved={onSaved} />);
    teclearNombre('María', 'González');

    const aviso = await screen.findByText(/Ya existe alguien registrado con este nombre/);
    expect(aviso.textContent).toContain('90050112345');
    expect(aviso.textContent).toContain('Norte');

    // Aviso, no bloqueo: Guardar sigue habilitado.
    expect(screen.getByRole('button', { name: /💾 Guardar/ })).not.toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: /Usar esta persona/ }));
    expect(onSaved).toHaveBeenCalledWith('p1');
    expect(onClose).toHaveBeenCalled();
  });

  it('si además coincide el teléfono (aunque venga con otro formato), el aviso lo dice', async () => {
    render(<PersonaFormModal open onClose={vi.fn()} onSaved={vi.fn()} />);
    teclearNombre('maria', 'gonzalez');
    fireEvent.change(screen.getByPlaceholderText('5551234'), { target: { value: '555-1234' } });
    expect(await screen.findByText(/Coincide también el teléfono/)).toBeInTheDocument();
  });

  it('si además coincide la fecha de nacimiento, el aviso lo dice', async () => {
    const { container } = render(<PersonaFormModal open onClose={vi.fn()} onSaved={vi.fn()} />);
    teclearNombre('María', 'González');
    // El primer input de fecha del formulario es el de nacimiento.
    const fechaNac = container.querySelectorAll('input[type="date"]')[0];
    fireEvent.change(fechaNac, { target: { value: '1990-05-01' } });
    expect(await screen.findByText(/Coincide también la fecha de nacimiento/)).toBeInTheDocument();
  });

  it('un nombre distinto no dispara ningún aviso', async () => {
    render(<PersonaFormModal open onClose={vi.fn()} onSaved={vi.fn()} />);
    teclearNombre('Tomás', 'Nuevo');
    // Señal de que la lista viva ya cargó (María aparece como mentora
    // posible): con la base ya leída, la ausencia del aviso es real.
    expect(await screen.findByRole('option', { name: /María González/ })).toBeInTheDocument();
    expect(screen.queryByText(/Ya existe alguien registrado con este nombre/)).not.toBeInTheDocument();
  });
});
