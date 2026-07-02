import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processQueue } from './api';
import { supabase } from '../supabase';
import { saveQueue } from './queue';

// Mock Supabase
vi.mock('../supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn(), // A implementar en cada test
    }),
  },
}));

describe('Sync API - Concurrencia Optimista', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('debería disparar sync-conflict cuando la versión en Supabase es mayor (conflicto)', async () => {
    // 1. Simular conflicto: Supabase devuelve resultado vacío (0 filas actualizadas)
    (supabase.from('').select as any).mockResolvedValue({ data: [], error: null });

    // 2. Encolar una operación de actualización
    saveQueue([{
      table: 'miembros',
      operation: 'update',
      id: 'miembro-1',
      data: { version: 1 },
      changes: { nombre: 'Nuevo Nombre' },
      timestamp: Date.now()
    }]);

    // 3. Spy en dispatchEvent
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');

    // 4. Procesar cola
    await processQueue();

    // 5. Verificar
    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'sync-conflict',
        detail: { table: 'miembros', id: 'miembro-1' }
      })
    );
  });
});
