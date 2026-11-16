import { describe, expect, it } from 'vitest';
import { coincideBusquedaDiezmador, filtrarDiezmadores, resumenDiezmadores } from './diezmadores';
import type { DiezmadorVista } from './personaDatos';

function vista(parcial: Partial<DiezmadorVista>): DiezmadorVista {
  return {
    id: 'd1', personaId: 'p1', fechaIngreso: '2026-01-10', estado: 'Activo',
    planDiezmo: 0, notas: '', creado: '2026-01-10T10:00:00', version: 1,
    nombre: '', apellido: '', telefono: '', email: '', zona: '', grupo: '',
    ...parcial,
  };
}

const ana = vista({ id: 'd1', personaId: 'p1', nombre: 'Ana', apellido: 'Díaz', telefono: '53551234', zona: 'Sur', grupo: 'Alfa', numeroIdentidad: '90010112345' });
const luis = vista({ id: 'd2', personaId: 'p2', nombre: 'Luis', apellido: 'Pérez', telefono: '54789900', zona: 'Norte', grupo: '', estado: 'Inactivo' });

describe('lista de Diezmadores (Iglesia, solo lectura)', () => {
  it('la búsqueda encuentra por nombre sin importar acentos ni mayúsculas', () => {
    expect(coincideBusquedaDiezmador(ana, 'diaz')).toBe(true);
    expect(coincideBusquedaDiezmador(ana, 'ANA')).toBe(true);
    expect(coincideBusquedaDiezmador(ana, 'luis')).toBe(false);
  });

  it('busca por teléfono (dígitos), carné, zona y grupo', () => {
    expect(coincideBusquedaDiezmador(ana, '5512')).toBe(true);
    expect(coincideBusquedaDiezmador(ana, '900101')).toBe(true);
    expect(coincideBusquedaDiezmador(ana, 'sur')).toBe(true);
    expect(coincideBusquedaDiezmador(ana, 'alfa')).toBe(true);
    expect(coincideBusquedaDiezmador(luis, 'alfa')).toBe(false);
  });

  it('filtrar ordena por apellido y respeta el texto vacío', () => {
    const r = filtrarDiezmadores([luis, ana], '');
    expect(r.map((v) => v.apellido)).toEqual(['Díaz', 'Pérez']);
    expect(filtrarDiezmadores([luis, ana], 'norte')).toEqual([luis]);
  });

  it('el resumen cuenta el total y los activos', () => {
    expect(resumenDiezmadores([ana, luis])).toEqual({ total: 2, activos: 1 });
    expect(resumenDiezmadores([])).toEqual({ total: 0, activos: 0 });
  });
});
