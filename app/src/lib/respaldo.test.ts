import Dexie from 'dexie';
import { describe, expect, it } from 'vitest';
import { construirRespaldo } from './respaldo';

describe('construirRespaldo', () => {
  it('vuelca todas las tablas de datos con sus ids y enlaces, sin la infraestructura de sync', async () => {
    const base = new Dexie('respaldo-test');
    base.version(1).stores({
      personas: 'id',
      conversiones: 'id',
      syncQueue: 'clave',
      syncTombstones: 'clave',
    });
    await base.table('personas').add({ id: 'p1', nombre: 'Ana' });
    await base.table('conversiones').add({ id: 'c1', personaId: 'p1', estado: 'ps-nuevo' });
    await base.table('syncQueue').add({ clave: 'x', tabla: 'personas' });

    const respaldo = await construirRespaldo(base);
    expect(respaldo.personas).toEqual([{ id: 'p1', nombre: 'Ana' }]);
    expect(respaldo.conversiones).toEqual([{ id: 'c1', personaId: 'p1', estado: 'ps-nuevo' }]);
    expect(respaldo.syncQueue).toBeUndefined();
    expect(respaldo.syncTombstones).toBeUndefined();
    base.close();
  });
});
