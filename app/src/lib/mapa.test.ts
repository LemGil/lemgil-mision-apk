import { describe, it, expect } from 'vitest';
import { centroDePuntos, idRealDePunto, puntosDeReferencia, puntosDelMapa, tieneUbicacion } from './mapa';
import type { Grupo, Persona } from './types';

const persona = (extra: Partial<Persona>): Persona =>
  ({
    id: 'p1',
    nombre: 'Ana',
    apellido: 'Pérez',
    direccion: 'Calle 1 #2',
    zona: 'Centro',
    ...extra,
  }) as Persona;

const grupo = (extra: Partial<Grupo>): Grupo =>
  ({
    id: 'g1',
    nombre: 'Grupo Vida',
    lugar: 'Casa de Ana',
    zona: 'Centro',
    ...extra,
  }) as Grupo;

describe('tieneUbicacion', () => {
  it('acepta coordenadas numéricas y rechaza nulos, ausentes y NaN', () => {
    expect(tieneUbicacion({ lat: 23.1, lng: -82.4 })).toBe(true);
    expect(tieneUbicacion({ lat: 0, lng: 0 })).toBe(true);
    expect(tieneUbicacion({ lat: null, lng: -82.4 })).toBe(false);
    expect(tieneUbicacion({})).toBe(false);
    expect(tieneUbicacion({ lat: NaN, lng: 0 })).toBe(false);
  });
});

describe('puntosDelMapa', () => {
  it('solo entran las fichas con ubicación, con su enlace a la ficha', () => {
    const puntos = puntosDelMapa(
      [persona({ lat: 23.1, lng: -82.4 }), persona({ id: 'p2' })],
      [grupo({ lat: 23.2, lng: -82.3 }), grupo({ id: 'g2', lat: null, lng: null })],
    );
    expect(puntos).toHaveLength(2);
    const dePersona = puntos.find((p) => p.tipo === 'persona');
    expect(dePersona?.nombre).toBe('Ana Pérez');
    expect(dePersona?.detalle).toBe('Calle 1 #2');
    expect(dePersona?.href).toBe('/personas?ver=p1');
    const deGrupo = puntos.find((p) => p.tipo === 'grupo');
    expect(deGrupo?.detalle).toBe('Casa de Ana');
    expect(deGrupo?.href).toBe('/mision?tab=grupos');
  });
});

describe('centroDePuntos', () => {
  it('sin puntos cae al centro por defecto; con puntos, al medio', () => {
    expect(centroDePuntos([])).toEqual([23.1136, -82.3666]);
    const puntos = puntosDelMapa(
      [persona({ lat: 23.0, lng: -82.0 }), persona({ id: 'p2', lat: 23.2, lng: -82.2 })],
      [],
    );
    const [lat, lng] = centroDePuntos(puntos);
    expect(lat).toBeCloseTo(23.1);
    expect(lng).toBeCloseTo(-82.1);
  });
});

describe('puntosDeReferencia', () => {
  const personas = [persona({ lat: 23.1, lng: -82.4 }), persona({ id: 'p2', nombre: 'Luis', lat: 23.11, lng: -82.41 })];
  const grupos = [grupo({ lat: 23.2, lng: -82.3 })];

  it('sin excluir: todas las fijadas', () => {
    expect(puntosDeReferencia(personas, grupos)).toHaveLength(3);
  });

  it('excluye la ficha que se está fijando (la suya es la movible)', () => {
    const refs = puntosDeReferencia(personas, grupos, { tipo: 'persona', id: 'p1' });
    expect(refs.map((p) => p.id)).toEqual(['persona:p2', 'grupo:g1']);
    const refsGrupo = puntosDeReferencia(personas, grupos, { tipo: 'grupo', id: 'g1' });
    expect(refsGrupo.map((p) => p.id)).toEqual(['persona:p1', 'persona:p2']);
  });
});

describe('idRealDePunto', () => {
  it('despega el prefijo del tipo y deja la identidad de la ficha', () => {
    const [pp, pg] = puntosDelMapa(
      [persona({ lat: 23.1, lng: -82.4 })],
      [grupo({ lat: 23.2, lng: -82.3 })],
    );
    expect(idRealDePunto(pp)).toBe('p1');
    expect(idRealDePunto(pg)).toBe('g1');
  });
});
