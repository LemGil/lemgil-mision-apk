import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { db } from './database';
import { unirPersonas, vincularProceso } from './personas';
import type { Conversion, Estudiante, Hito, Miembro, Persona } from './types';

const personaBase = (over: Partial<Persona> = {}): Persona => ({
  id: 'pA', nombre: 'María', apellido: 'González', numeroIdentidad: '', telefono: '5551234',
  email: '', direccion: '', zona: 'Norte', fechaNacimiento: '', profesion: '',
  estadoCivil: 'Soltero', contactoPreferido: 'WhatsApp', bautizado: false,
  fechaBautismo: '', conyuge: '', hijos: '', grupoId: null, hermanoMayorId: null,
  creado: '2024-01-01T00:00:00.000Z', version: 1, ...over,
});

const miembroBase = (over: Partial<Miembro> = {}): Miembro => ({
  id: 'm1', nombre: 'María', apellido: 'González', telefono: '5551234',
  email: '', direccion: '', zona: 'Norte', grupoId: null,
  fechaNacimiento: '', fechaIngreso: '2024-02-01', estado: 'Activo',
  contactoPreferido: 'WhatsApp', profesion: '', estadoCivil: 'Soltero',
  bautizado: false, fechaBautismo: '', conyuge: '', hijos: '',
  hermanoMayorId: null, conversionId: null, notas: '',
  creado: '2024-02-01T00:00:00.000Z', actualizado: '2024-02-01T00:00:00.000Z',
  version: 1, ...over,
});

const convBase = (over: Partial<Conversion> = {}): Conversion => ({
  id: 'c1', nombre: 'María', apellido: 'González', telefono: '5551234',
  edad: '', direccion: '', familia: '', fecha: '2024-01-15', zona: 'Norte',
  lider: '', grupoId: '', hermanoMayorId: null, email: '', profesion: '',
  bautizado: false, fechaBautismo: '', conyuge: '', hijos: '',
  estado: 'Integrado', notas: '', historial: [], creado: '2024-01-15T00:00:00.000Z',
  version: 1, ...over,
});

const estBase = (over: Partial<Estudiante> = {}): Estudiante => ({
  id: 'e1', nombre: 'María', apellido: 'González', telefono: '5551234',
  edad: '', cursoId: 'cur1', fecha: '2024-03-01', estado: 'Activo', notas: '',
  creado: '2024-03-01T00:00:00.000Z',
  zona: 'Norte', grupoId: null, hermanoMayorId: null, email: '', direccion: '',
  profesion: '', bautizado: false, fechaBautismo: '', conyuge: '', hijos: '',
  version: 1, ...over,
});

describe('Ficha única P1 — herramientas de enlace (§5.5): vincular y unir', () => {
  beforeAll(async () => {
    await db.open();
  });

  beforeEach(async () => {
    await Promise.all([
      db.personas.clear(), db.miembros.clear(), db.conversiones.clear(),
      db.estudiantes.clear(), db.dadores.clear(), db.beneficiarios.clear(),
      db.hitos.clear(), db.syncQueue.clear(), db.syncTombstones.clear(),
    ]);
  });

  it('vincularProceso pone el personaId del proceso y respeta el resto de la ficha', async () => {
    await db.personas.add(personaBase({ id: 'pA' }));
    await db.estudiantes.add(estBase({ id: 'e1', personaId: null, notas: 'intacta' }));
    await vincularProceso('estudiantes', 'e1', 'pA');
    const e = await db.estudiantes.get('e1');
    expect(e?.personaId).toBe('pA');
    expect(e?.notas).toBe('intacta');
  });

  it('vincularProceso rechaza si la persona destino no existe', async () => {
    await db.estudiantes.add(estBase({ id: 'e1', personaId: null }));
    await expect(vincularProceso('estudiantes', 'e1', 'no-existe')).rejects.toThrow();
    expect((await db.estudiantes.get('e1'))?.personaId).toBeNull();
  });

  it('unirPersonas mueve TODOS los procesos de la absorbida y no toca los satélites', async () => {
    // Superviviente pA con su propio miembro mA; absorbida pB con miembro,
    // conversión y estudiante; el hito cuelga del PROCESO miembro mB.
    await db.personas.add(personaBase({ id: 'pA' }));
    await db.personas.add(personaBase({ id: 'pB', nombre: 'Maria', apellido: 'Gonzalez' }));
    await db.miembros.add(miembroBase({ id: 'mA', personaId: 'pA' }));
    await db.miembros.add(miembroBase({ id: 'mB', personaId: 'pB' }));
    await db.conversiones.add(convBase({ id: 'cB', personaId: 'pB' }));
    await db.estudiantes.add(estBase({ id: 'eB', personaId: 'pB' }));
    const hito: Hito = {
      id: 'h1', miembroId: 'mB', fecha: '2024-05-01', tipo: 'Integración',
      descripcion: 'Se integró', creado: '2024-05-01T00:00:00.000Z', version: 1,
    };
    await db.hitos.add(hito);

    const r = await unirPersonas('pB', 'pA');

    expect(r.procesosMovidos).toBe(3);
    expect((await db.miembros.get('mB'))?.personaId).toBe('pA');
    expect((await db.conversiones.get('cB'))?.personaId).toBe('pA');
    expect((await db.estudiantes.get('eB'))?.personaId).toBe('pA');
    expect((await db.miembros.get('mA'))?.personaId).toBe('pA');
    // Satélite intacto: el hito sigue apuntando al proceso mB, que no cambió de id.
    expect((await db.hitos.get('h1'))?.miembroId).toBe('mB');
    // La absorbida desaparece y queda como tumba de sync.
    expect(await db.personas.get('pB')).toBeUndefined();
    expect(await db.syncTombstones.get('personas:pB')).toBeTruthy();
    // La superviviente conserva su núcleo tal cual.
    expect((await db.personas.get('pA'))?.nombre).toBe('María');
  });

  it('unirPersonas reasigna los hermanoMayorId que apuntaban a la absorbida', async () => {
    await db.personas.add(personaBase({ id: 'pA', hermanoMayorId: 'pB' }));
    await db.personas.add(personaBase({ id: 'pB' }));
    await db.personas.add(personaBase({ id: 'pC', hermanoMayorId: 'pB' }));
    await unirPersonas('pB', 'pA');
    // Una tercera persona ahora tiene por mentor a la superviviente.
    expect((await db.personas.get('pC'))?.hermanoMayorId).toBe('pA');
    // La superviviente no puede ser su propia mentora: queda sin hermano mayor.
    expect((await db.personas.get('pA'))?.hermanoMayorId).toBeNull();
  });

  it('unirPersonas con el mismo id no hace nada', async () => {
    await db.personas.add(personaBase({ id: 'pA' }));
    await db.miembros.add(miembroBase({ id: 'mA', personaId: 'pA' }));
    const r = await unirPersonas('pA', 'pA');
    expect(r.procesosMovidos).toBe(0);
    expect(await db.personas.get('pA')).toBeTruthy();
    expect((await db.miembros.get('mA'))?.personaId).toBe('pA');
  });
});
