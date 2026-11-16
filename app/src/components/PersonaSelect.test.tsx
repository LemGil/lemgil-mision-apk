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
 *
 * La lista es un buscador propio desde 2026-11-16 (la ventana nativa
 * del `<select>` se abría y se cerraba sola en el teléfono dentro de
 * los modales): se abre al tocar el campo y filtra al teclear.
 */
describe('PersonaSelect — lista de registradas + puerta del registro inicial', () => {
  beforeEach(async () => {
    await db.personas.clear();
    await db.personas.bulkAdd([maria, lucia]);
  });
  afterEach(async () => { await db.personas.clear(); });

  const abrirLista = async () => {
    const campo = await screen.findByPlaceholderText('Seleccionar persona…');
    fireEvent.click(campo);
    return campo;
  };

  it('la lista solo trae registradas: sin opción de crear dentro de la lista', async () => {
    render(<PersonaSelect value="" onChange={vi.fn()} />);
    await abrirLista();
    // Las existentes cargan desde la base…
    expect(await screen.findByRole('option', { name: /María González/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Lucía Mora/ })).toBeInTheDocument();
    // …y crear NO es una opción más de la lista.
    expect(screen.queryByRole('option', { name: /Nueva persona/ })).not.toBeInTheDocument();
  });

  it('junto al selector está el botón «➕ Nueva persona»', async () => {
    render(<PersonaSelect value="" onChange={vi.fn()} />);
    await screen.findByPlaceholderText('Seleccionar persona…');
    expect(screen.getByRole('button', { name: /Nueva persona/ })).toBeInTheDocument();
    // El formulario aún no está en el DOM: se monta solo al abrirlo.
    expect(screen.queryByPlaceholderText('Juan')).not.toBeInTheDocument();
  });

  it('con avisos, la opción marca a la persona; a quien no está en el mapa, no', async () => {
    render(<PersonaSelect value="" onChange={vi.fn()} avisos={new Map([['p1', 'ya en Misión']])} />);
    await abrirLista();
    expect(await screen.findByRole('option', { name: /María González.*ya en Misión/ })).toBeInTheDocument();
    const luciaOpt = screen.getByRole('option', { name: /Lucía Mora/ });
    expect(luciaOpt.textContent).toContain('222');
    expect(luciaOpt.textContent).not.toContain('ya en Misión');
  });

  it('seleccionar una existente emite su id y la lista se cierra', async () => {
    const onChange = vi.fn();
    render(<PersonaSelect value="" onChange={onChange} />);
    await abrirLista();
    fireEvent.click(await screen.findByRole('option', { name: /María González/ }));
    expect(onChange).toHaveBeenCalledWith('p1');
    expect(screen.queryByRole('option', { name: /María González/ })).not.toBeInTheDocument();
  });

  it('al teclear filtra por nombre y por teléfono', async () => {
    render(<PersonaSelect value="" onChange={vi.fn()} />);
    const campo = await abrirLista();
    await screen.findByRole('option', { name: /María González/ });
    fireEvent.change(campo, { target: { value: 'Luc' } });
    expect(screen.getByRole('option', { name: /Lucía Mora/ })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /María González/ })).not.toBeInTheDocument();
    fireEvent.change(campo, { target: { value: '555' } });
    expect(screen.getByRole('option', { name: /María González/ })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Lucía Mora/ })).not.toBeInTheDocument();
  });

  it('en edición el campo muestra a la persona ya elegida', async () => {
    render(<PersonaSelect value="p1" onChange={vi.fn()} />);
    const campo = await screen.findByPlaceholderText('Seleccionar persona…');
    await waitFor(() => { expect(campo).toHaveValue('María González'); });
  });

  it('el botón abre el formulario único vacío y al guardar la nueva queda seleccionada', async () => {
    const onChange = vi.fn();
    render(<PersonaSelect value="" onChange={onChange} />);
    await screen.findByPlaceholderText('Seleccionar persona…');

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
