import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PersonaSelect } from './PersonaSelect';
import { db } from '../lib/database';
import type { Persona } from '../lib/types';

const maria: Persona = {
  id: 'p1', nombre: 'María', apellido: 'González', numeroIdentidad: '90050112345', telefono: '5551234',
  email: '', direccion: '', zona: 'Norte', fechaNacimiento: '1990-05-01', profesion: '',
  estadoCivil: 'Casado', contactoPreferido: 'WhatsApp', bautizado: false, fechaBautismo: '',
  conyuge: '', hijos: '', grupoId: null, hermanoMayorId: null,
  creado: '2024-01-01T00:00:00.000Z', version: 1,
};
const lucia: Persona = { ...maria, id: 'p2', nombre: 'Lucía', apellido: 'Mora', numeroIdentidad: '80020299999', telefono: '222' };

/**
 * Modelo final (regla de LemGil, 2026-11-04 — «el ideal»): la LISTA del
 * selector solo contiene personas ya registradas (crear no es
 * seleccionar: dentro de la lista no hay opción de crear), y junto al
 * selector vive la puerta del registro inicial — el botón «➕ Nueva
 * persona» abre PersonaFormModal, el único formulario que teclea datos
 * de personas nuevas. Al guardar, la recién registrada queda
 * seleccionada en el formulario de proceso (onChange con su id).
 */
describe('PersonaSelect — lista de registradas + puerta del registro inicial', () => {
  beforeEach(async () => {
    await db.personas.clear();
    await db.personas.bulkAdd([maria, lucia]);
  });
  afterEach(async () => { await db.personas.clear(); });

  it('la lista solo trae registradas: sin opción de crear dentro de la lista', async () => {
    render(<PersonaSelect value="" onChange={vi.fn()} />);
    // Las existentes cargan desde la base…
    expect(await screen.findByRole('option', { name: /María González/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Lucía Mora/ })).toBeInTheDocument();
    // …y crear NO es una opción más de la lista.
    expect(screen.queryByRole('option', { name: /Nueva persona/ })).not.toBeInTheDocument();
  });

  it('junto al selector está el botón «➕ Nueva persona»', async () => {
    render(<PersonaSelect value="" onChange={vi.fn()} />);
    await screen.findByRole('option', { name: /María González/ });
    expect(screen.getByRole('button', { name: /Nueva persona/ })).toBeInTheDocument();
    // El formulario aún no está en el DOM: se monta solo al abrirlo.
    expect(screen.queryByPlaceholderText('Juan')).not.toBeInTheDocument();
  });

  it('seleccionar una existente emite su id', async () => {
    const onChange = vi.fn();
    render(<PersonaSelect value="" onChange={onChange} />);
    const select = await screen.findByRole('combobox');
    await screen.findByRole('option', { name: /María González/ });
    fireEvent.change(select, { target: { value: 'p1' } });
    expect(onChange).toHaveBeenCalledWith('p1');
  });

  it('en edición sigue mostrando a la persona ya elegida', async () => {
    render(<PersonaSelect value="p1" onChange={vi.fn()} />);
    const select = await screen.findByRole('combobox');
    await screen.findByRole('option', { name: /María González/ });
    expect(select).toHaveValue('p1');
  });

  it('el botón abre el formulario único vacío y al guardar la nueva queda seleccionada', async () => {
    const onChange = vi.fn();
    render(<PersonaSelect value="" onChange={onChange} />);
    await screen.findByRole('option', { name: /María González/ });

    fireEvent.click(screen.getByRole('button', { name: /Nueva persona/ }));

    // Se abre PersonaFormModal en modo crear: campos vacíos para
    // teclear (quien no existe en la base no se selecciona).
    const nombre = await screen.findByPlaceholderText('Juan');
    const apellido = screen.getByPlaceholderText('Pérez');
    expect(nombre).toHaveValue('');
    fireEvent.change(nombre, { target: { value: 'Tomás' } });
    fireEvent.change(apellido, { target: { value: 'Nuevo' } });
    fireEvent.click(screen.getByRole('button', { name: /Guardar/ }));

    // La persona quedó escrita en la base, una sola vez…
    let nuevaId = '';
    await waitFor(async () => {
      const todas = await db.personas.toArray();
      expect(todas).toHaveLength(3);
      nuevaId = todas.find((p) => p.nombre === 'Tomás')!.id;
      expect(todas.find((p) => p.id === nuevaId)?.apellido).toBe('Nuevo');
    });

    // …onChange recibió su id (queda seleccionada en el proceso) y el
    // formulario se cerró: se sigue donde se estaba.
    await waitFor(() => { expect(onChange).toHaveBeenCalledWith(nuevaId); });
    await waitFor(() => {
      expect(screen.queryByPlaceholderText('Juan')).not.toBeInTheDocument();
    });
  });
});
