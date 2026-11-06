import { describe, it, expect, vi } from 'vitest';
import { instalarVigilanciaDeVersion, type DbVigilable } from './database';

// Vigilancia de versión de la base: cuando otra ventana (o la PWA ya
// actualizada) abre la base en un esquema mayor, IndexedDB dispara
// «versionchange» en esta conexión. Sin manejador, la conexión queda zombi
// y la siguiente sincronización falla con DatabaseClosedError / «The
// transaction is not active». El arreglo: cerrar la conexión propia y
// recargar. Aquí se prueba la función con un doble de la base, sin tocar
// la instancia real ni la ventana.
describe('instalarVigilanciaDeVersion', () => {
  function baseDoble() {
    let manejador: ((event: IDBVersionChangeEvent) => unknown) | undefined;
    const base: DbVigilable = {
      on: vi.fn((eventName: 'versionchange', subscriber: (event: IDBVersionChangeEvent) => unknown) => {
        expect(eventName).toBe('versionchange');
        manejador = subscriber;
      }),
      close: vi.fn(),
    };
    return { base, disparar: () => manejador?.({} as IDBVersionChangeEvent) };
  }

  it('registra el manejador en «versionchange» sin cerrar ni recargar todavía', () => {
    const { base } = baseDoble();
    const recargar = vi.fn();
    instalarVigilanciaDeVersion(recargar, base);
    expect(base.on).toHaveBeenCalledTimes(1);
    expect(base.on).toHaveBeenCalledWith('versionchange', expect.any(Function));
    expect(base.close).not.toHaveBeenCalled();
    expect(recargar).not.toHaveBeenCalled();
  });

  it('al dispararse, cierra la base y recarga exactamente una vez', () => {
    const { base, disparar } = baseDoble();
    const recargar = vi.fn();
    instalarVigilanciaDeVersion(recargar, base);
    disparar();
    expect(base.close).toHaveBeenCalledTimes(1);
    expect(recargar).toHaveBeenCalledTimes(1);
  });
});
