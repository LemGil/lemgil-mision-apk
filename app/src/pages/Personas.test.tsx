import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Personas from './Personas';
import { db } from '../lib/database';

// La página se prueba sin el armazón visual (Sidebar/Topbar/Sync): el
// Layout se sustituye por un contenedor neutro y el foco queda en la
// página misma.
vi.mock('../components/Layout', async () => {
  const React = await import('react');
  return {
    Layout: ({ children }: { children: React.ReactNode }) =>
      React.createElement('div', null, children),
  };
});

/**
 * Regla de LemGil (2026-11-04): el registro inicial de una persona
 * nueva nace AQUÍ, en la página Personas, con «➕ Nueva persona» — el
 * único formulario que teclea sus datos por primera vez. Al guardar,
 * su ficha queda abierta.
 */
describe('Personas — puerta del registro inicial', () => {
  beforeEach(async () => {
    await Promise.all([
      db.personas.clear(), db.conversiones.clear(), db.miembros.clear(),
      db.estudiantes.clear(), db.dadores.clear(), db.beneficiarios.clear(),
      db.grupos.clear(), db.cursos.clear(),
    ]);
  });
  afterEach(async () => { await db.personas.clear(); });

  it('muestra «➕ Nueva persona», abre el formulario de registro y al guardar la ficha queda abierta', async () => {
    render(
      <MemoryRouter>
        <Personas />
      </MemoryRouter>,
    );

    // El botón del registro inicial está en el encabezado de la página.
    fireEvent.click(await screen.findByRole('button', { name: /Nueva persona/ }));

    // Se abre PersonaFormModal en modo crear (título «➕ Nueva persona»,
    // campos vacíos para teclear: quien no existe no se selecciona).
    const nombre = await screen.findByPlaceholderText('Juan');
    const apellido = screen.getByPlaceholderText('Pérez');
    expect(nombre).toHaveValue('');
    fireEvent.change(nombre, { target: { value: 'Tomás' } });
    fireEvent.change(apellido, { target: { value: 'Nuevo' } });
    fireEvent.click(screen.getByRole('button', { name: /Guardar/ }));

    // La persona quedó escrita en la base, una sola vez…
    await waitFor(async () => {
      const todas = await db.personas.toArray();
      expect(todas).toHaveLength(1);
      expect(todas[0].nombre).toBe('Tomás');
      expect(todas[0].apellido).toBe('Nuevo');
    });

    // …y su ficha quedó abierta (la insignia «Sin procesos todavía»
    // solo la pinta la ficha de una persona seleccionada).
    expect(await screen.findByText('Sin procesos todavía')).toBeInTheDocument();
    expect(screen.getAllByText('Tomás Nuevo').length).toBeGreaterThan(0);
  });
});
