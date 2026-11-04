import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PersonaDetailModal } from './PersonaDetailModal';
import { db } from '../../lib/database';
import { procesosVacios } from '../../lib/personaVista';
import type { Conversion, Estudiante, Miembro, Persona } from '../../lib/types';

const persona: Persona = {
  id: 'p1', nombre: 'María', apellido: 'González', numeroIdentidad: '90050112345', telefono: '5551234',
  email: 'maria@correo.com', direccion: 'Calle 1', zona: 'Norte',
  fechaNacimiento: '1990-05-01', profesion: 'Maestra', estadoCivil: 'Casado',
  contactoPreferido: 'WhatsApp', bautizado: true, fechaBautismo: '2023-12-01',
  conyuge: 'José', hijos: '2', grupoId: 'g1', hermanoMayorId: 'p9',
  creado: '2024-01-01T00:00:00.000Z', version: 1,
};

const mentor: Persona = { ...persona, id: 'p9', nombre: 'Pedro', apellido: 'Ruiz', telefono: '111' };

const conversion: Conversion = {
  id: 'c1', nombre: 'María', apellido: 'González', telefono: '5551234',
  edad: '', direccion: '', familia: '', fecha: '2024-01-15', zona: 'Norte',
  lider: '', grupoId: 'g1', hermanoMayorId: null, email: '', profesion: '',
  bautizado: true, fechaBautismo: '', conyuge: '', hijos: '',
  estado: 'Integrado', notas: '', historial: [], personaId: 'p1',
  creado: '2024-01-15T00:00:00.000Z', version: 1,
};

const miembro: Miembro = {
  id: 'm1', nombre: 'María', apellido: 'González', telefono: '5551234',
  email: '', direccion: '', zona: 'Norte', grupoId: 'g1',
  fechaNacimiento: '1990-05-01', fechaIngreso: '2024-02-01', estado: 'Activo',
  contactoPreferido: 'WhatsApp', profesion: 'Maestra', estadoCivil: 'Casado',
  bautizado: true, fechaBautismo: '', conyuge: '', hijos: '',
  hermanoMayorId: null, conversionId: 'c1', personaId: 'p1', notas: '',
  creado: '2024-02-01T00:00:00.000Z', actualizado: '2024-02-01T00:00:00.000Z', version: 1,
};

const estudiante: Estudiante = {
  id: 'e1', nombre: 'María', apellido: 'González', telefono: '5551234',
  edad: '', cursoId: 'cur1', fecha: '2024-03-01', estado: 'Activo', notas: '',
  creado: '2024-03-01T00:00:00.000Z',
  zona: 'Norte', grupoId: null, hermanoMayorId: null, email: '', direccion: '',
  profesion: '', bautizado: false, fechaBautismo: '', conyuge: '', hijos: '',
  personaId: 'p1', version: 1,
};

describe('Ficha única P1 — render de la ficha con procesos mezclados', () => {
  it('muestra el núcleo una sola vez y una tarjeta por proceso con su enlace', () => {
    const procesos = {
      ...procesosVacios(),
      conversiones: [conversion],
      miembros: [miembro],
      estudiantes: [estudiante],
    };
    const { container } = render(
      <MemoryRouter>
        <PersonaDetailModal
          open
          onClose={() => {}}
          persona={persona}
          procesos={procesos}
          grupoNombre="Grupo Norte 1"
          hermanoMayorNombre="Pedro Ruiz"
          cursoNombre={(id) => (id === 'cur1' ? 'Fundamentos de la Fe' : undefined)}
          otrasPersonas={[mentor]}
          onUnir={vi.fn(async () => {})}
        />
      </MemoryRouter>,
    );

    // Núcleo: la identidad y el contacto viven aquí, una sola vez.
    expect(screen.getByText('María González')).toBeInTheDocument();
    expect(screen.getByText('5551234')).toBeInTheDocument();
    expect(screen.getByText('maria@correo.com')).toBeInTheDocument();
    expect(screen.getByText('Grupo Norte 1')).toBeInTheDocument();
    expect(screen.getByText('Pedro Ruiz')).toBeInTheDocument();

    // Tarjetas por proceso con su resumen (cada etiqueta sale dos veces:
    // la insignia del encabezado y el título de su tarjeta).
    expect(screen.getAllByText('Conversión')).toHaveLength(2);
    expect(screen.getByText(/Estado: Integrado/)).toBeInTheDocument();
    expect(screen.getAllByText('Miembro')).toHaveLength(2);
    expect(screen.getByText(/Estado: Activo · Ingreso/)).toBeInTheDocument();
    expect(screen.getAllByText('Estudiante')).toHaveLength(2);
    expect(screen.getByText(/Fundamentos de la Fe/)).toBeInTheDocument();
    expect(screen.getAllByText(/Ver en su módulo/)).toHaveLength(2); // conversión y miembro abren su ficha
    expect(screen.getByText(/Ir a su módulo/)).toBeInTheDocument(); // estudiante: solo ir al módulo

    // Sin el editor abierto, la ficha no muestra campos editables de
    // datos personales (el editor es un modal aparte, bajo demanda);
    // solo el selector de la herramienta «Unir personas».
    expect(container.querySelectorAll('input')).toHaveLength(0);
    expect(screen.getByText(/Unir personas/)).toBeInTheDocument();
  });

  it('muestra la situación actual junto a las insignias: miembro activo', () => {
    const procesos = {
      ...procesosVacios(),
      conversiones: [conversion],
      miembros: [miembro],
    };
    render(
      <MemoryRouter>
        <PersonaDetailModal
          open
          onClose={() => {}}
          persona={persona}
          procesos={procesos}
          otrasPersonas={[]}
          onUnir={vi.fn(async () => {})}
        />
      </MemoryRouter>,
    );
    expect(screen.getByText('Miembro activo')).toBeInTheDocument();
  });

  it('caso Martha: solo conversión en Apartado → la ficha dice «Apartado» junto a su nombre', () => {
    const procesos = {
      ...procesosVacios(),
      conversiones: [{ ...conversion, estado: 'Apartado' as Conversion['estado'] }],
    };
    render(
      <MemoryRouter>
        <PersonaDetailModal
          open
          onClose={() => {}}
          persona={{ ...persona, nombre: 'Martha', apellido: 'Ajedres' }}
          procesos={procesos}
          otrasPersonas={[]}
          onUnir={vi.fn(async () => {})}
        />
      </MemoryRouter>,
    );
    expect(screen.getByText('Martha Ajedres')).toBeInTheDocument();
    // La insignia de situación (texto exacto) — la tarjeta del proceso
    // dice «Estado: Apartado · …», que no es coincidencia exacta.
    expect(screen.getByText('Apartado')).toBeInTheDocument();
  });

  it('una persona sin procesos lo dice con claridad', () => {
    render(
      <MemoryRouter>
        <PersonaDetailModal
          open
          onClose={() => {}}
          persona={{ ...persona, id: 'p2', nombre: 'Ana', apellido: 'Sola' }}
          procesos={procesosVacios()}
          otrasPersonas={[]}
          onUnir={vi.fn(async () => {})}
        />
      </MemoryRouter>,
    );
    expect(screen.getByText('Ana Sola')).toBeInTheDocument();
    expect(screen.getByText('Sin procesos todavía')).toBeInTheDocument();
    expect(screen.getByText(/aún no tiene procesos/)).toBeInTheDocument();
  });
});

describe('Ficha única — editar el núcleo desde la propia ficha', () => {
  const renderFicha = () => render(
    <MemoryRouter>
      <PersonaDetailModal
        open
        onClose={() => {}}
        persona={persona}
        procesos={procesosVacios()}
        otrasPersonas={[]}
        onUnir={vi.fn(async () => {})}
      />
    </MemoryRouter>,
  );

  it('muestra el botón «Editar datos» en la ficha', () => {
    renderFicha();
    expect(screen.getByRole('button', { name: /Editar datos/ })).toBeInTheDocument();
  });

  it('al pulsar «Editar datos» se abre PersonaFormModal con los datos de la persona cargados', async () => {
    renderFicha();
    fireEvent.click(screen.getByRole('button', { name: /Editar datos/ }));
    // El mismo formulario del núcleo que usan los módulos, en modo edición.
    expect(await screen.findByText('✏️ Editar persona')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByPlaceholderText('Juan')).toHaveValue('María'));
    expect(screen.getByPlaceholderText('Pérez')).toHaveValue('González');
    expect(screen.getByPlaceholderText('85010112345')).toHaveValue('90050112345');
    expect(screen.getByPlaceholderText('5551234')).toHaveValue('5551234');
  });

  describe('con la base sembrada (guardia de carné y guardado)', () => {
    const otra: Persona = {
      ...persona, id: 'p2', nombre: 'Lucía', apellido: 'Mora',
      numeroIdentidad: '80020299999', telefono: '222', grupoId: null, hermanoMayorId: null,
    };

    beforeEach(async () => {
      await db.personas.clear();
      await db.personas.bulkAdd([persona, otra]);
    });
    afterEach(async () => { await db.personas.clear(); });

    it('su propio carné NO la bloquea; el carné de otra persona, sí', async () => {
      renderFicha();
      fireEvent.click(screen.getByRole('button', { name: /Editar datos/ }));
      const carnet = await screen.findByPlaceholderText('85010112345');
      await waitFor(() => expect(carnet).toHaveValue('90050112345'));
      const guardar = screen.getByRole('button', { name: /Guardar/ });

      // Teclear el carné de Lucía despierta la guardia (prueba de que la
      // lista de personas sí cargó de la base): aviso y Guardar bloqueado.
      fireEvent.change(carnet, { target: { value: '80020299999' } });
      expect(await screen.findByText(/Ya existe una persona con este Nº de Identidad/)).toBeInTheDocument();
      expect(guardar).toBeDisabled();

      // Al volver a SU carné, la guardia se apaga: su propio carné no es
      // duplicado (buscarPorIdentidad excluye a la persona en edición).
      fireEvent.change(carnet, { target: { value: '90050112345' } });
      await waitFor(() => expect(screen.queryByText(/Ya existe una persona con este Nº de Identidad/)).not.toBeInTheDocument());
      expect(guardar).not.toBeDisabled();
    });

    it('al guardar, el cambio queda en la base y el formulario se cierra', async () => {
      renderFicha();
      fireEvent.click(screen.getByRole('button', { name: /Editar datos/ }));
      const tel = await screen.findByPlaceholderText('5551234');
      await waitFor(() => expect(tel).toHaveValue('5551234'));
      fireEvent.change(tel, { target: { value: '5559999' } });
      fireEvent.click(screen.getByRole('button', { name: /Guardar/ }));
      await waitFor(async () => {
        expect((await db.personas.get('p1'))?.telefono).toBe('5559999');
      });
      // El editor se desmonta al guardar (la página, que lee con
      // useLiveQuery, re-renderiza la ficha ya con el dato nuevo).
      await waitFor(() => expect(screen.queryByText('✏️ Editar persona')).not.toBeInTheDocument());
    });
  });
});
