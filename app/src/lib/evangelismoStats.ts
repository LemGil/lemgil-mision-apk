import type { Conversion } from './types';

/**
 * Ficha única (P2, §3.5 del diseño): la cifra de conversiones de un
 * evangelismo es un CONTEO DERIVADO — cuántas conversiones llevan su
 * `evangelismoId`. La cifra manual vieja (`Evangelismo.conversiones`)
 * queda dormida: LemGil decidió expresamente que no hay saldo histórico
 * que preservar. Funciones puras, al patrón de `grupoStats.ts`.
 */

/** Mapa evangelismoId → nº de conversiones enlazadas. */
export function conteoConversionesPorEvangelismo(conversiones: Conversion[]): Map<string, number> {
  const mapa = new Map<string, number>();
  for (const c of conversiones) {
    if (!c.evangelismoId) continue;
    mapa.set(c.evangelismoId, (mapa.get(c.evangelismoId) ?? 0) + 1);
  }
  return mapa;
}

/** Nº de conversiones enlazadas a UN evangelismo (0 si no tiene ninguna). */
export function conversionesDeEvangelismo(conversiones: Conversion[], evangelismoId: string): number {
  return conteoConversionesPorEvangelismo(conversiones).get(evangelismoId) ?? 0;
}
