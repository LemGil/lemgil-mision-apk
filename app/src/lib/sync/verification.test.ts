import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processQueue, pushAllLocal, toLowerCaseKeys } from './api';
import { supabase } from '../supabase';
import { getQueue } from './queue';

// Use vi.hoisted to define the mock object so it's available inside vi.mock
const { mockDb } = vi.hoisted(() => ({
  mockDb: {
    dadores: { toArray: vi.fn().mockResolvedValue([]) },
    colaboradores: { toArray: vi.fn().mockResolvedValue([]) },
    miembros: { toArray: vi.fn().mockResolvedValue([]) },
    conversiones: { toArray: vi.fn().mockResolvedValue([]) },
    grupos: { toArray: vi.fn().mockResolvedValue([]) },
    evangelismos: { toArray: vi.fn().mockResolvedValue([]) },
    cursos: { toArray: vi.fn().mockResolvedValue([]) },
    lecciones: { toArray: vi.fn().mockResolvedValue([]) },
    estudiantes: { toArray: vi.fn().mockResolvedValue([]) },
    certificados: { toArray: vi.fn().mockResolvedValue([]) },
    aportes: { toArray: vi.fn().mockResolvedValue([]) },
    beneficiarios: { toArray: vi.fn().mockResolvedValue([]) },
    campanas: { toArray: vi.fn().mockResolvedValue([]) },
    entregas: { toArray: vi.fn().mockResolvedValue([]) },
    metas: { toArray: vi.fn().mockResolvedValue([]) },
    negocios: { toArray: vi.fn().mockResolvedValue([]) },
    publicaciones: { toArray: vi.fn().mockResolvedValue([]) },
    reportes: { toArray: vi.fn().mockResolvedValue([]) },
    miembrosComun: { toArray: vi.fn().mockResolvedValue([]) },
    aportesComun: { toArray: vi.fn().mockResolvedValue([]) },
    ministerios: { toArray: vi.fn().mockResolvedValue([]) },
    miembrosMinisterios: { toArray: vi.fn().mockResolvedValue([]) },
    hitos: { toArray: vi.fn().mockResolvedValue([]) },
    zonas: { toArray: vi.fn().mockResolvedValue([]) },
    tiposPlanes: { toArray: vi.fn().mockResolvedValue([]) },
    planesColaborador: { toArray: vi.fn().mockResolvedValue([]) },
  },
}));

// Mock Supabase
vi.mock('../supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn(),
      insert: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
    }),
  },
}));

// Mock queue
vi.mock('./queue', () => ({
  getQueue: vi.fn(),
  saveQueue: vi.fn(),
  enqueue: vi.fn(),
  getDeletedIds: vi.fn(() => ({})),
  unmarkDeleted: vi.fn(),
}));

// Mock database (Dexie)
vi.mock('../database', () => ({
  db: mockDb,
}));

// Mock status
vi.mock('./status', () => ({
  emitStatus: vi.fn(),
}));

describe('Sync API - Verification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset all toArray mocks to return empty array
    Object.values(mockDb).forEach((table: any) => {
      table.toArray.mockResolvedValue([]);
    });
  });

  describe('Bug Check: toLowerCaseKeys', () => {
    it('should lowercase keys correctly', () => {
      const obj = { planOfrendaMonto: 0 };
      const result = toLowerCaseKeys(obj);
      expect(result).toHaveProperty('planofrendamonto');
      expect(result.planofrendamonto).toBe(0);
    });
  });

  describe('processQueue', () => {
    it('should strip updatedAt, codigo, and version during update', async () => {
      const changes = {
        nombre: 'Nuevo Nombre',
        updatedAt: 123456789,
        codigo: 'ABC',
        version: 1,
      };
      const op = {
        table: 'miembros',
        operation: 'update' as const,
        id: 'miembro-1',
        data: { version: 1 },
        changes: changes,
        timestamp: Date.now(),
      };

      (getQueue as any).mockReturnValue([op]);
      (supabase.from as any).mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({ data: [{ id: 'miembro-1' }], error: null }),
      });

      await processQueue();

      const updateCall = (supabase.from as any)().update.mock.calls[0][0];
      
      expect(updateCall).not.toHaveProperty('updatedAt');
      expect(updateCall).not.toHaveProperty('codigo');
      // version is expected to be the NEXT version and it is lowercased by toLowerCaseKeys
      expect(updateCall.version).toBe(2);
    });

    it('should strip base for dadores during update', async () => {
      const changes = {
        nombre: 'Nuevo Nombre',
        base: 'some-base-data',
      };
      const op = {
        table: 'dadores' as const,
        operation: 'update' as const,
        id: 'dador-1',
        data: { version: 1, base: 'old-base' },
        changes: changes,
        timestamp: Date.now(),
      };

      (getQueue as any).mockReturnValue([op]);
      (supabase.from as any).mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({ data: [{ id: 'dador-1' }], error: null }),
      });

      await processQueue();

      const updateCall = (supabase.from as any)().update.mock.calls[0][0];
      expect(updateCall).not.toHaveProperty('base');
    });
  });

  describe('pushAllLocal', () => {
    it('should strip _primKey, updatedAt, and codigo during pushAllLocal', async () => {
      const localData = [
        { id: '1', nombre: 'Test', _primKey: 'pk1', updatedAt: 123, codigo: 'c1' },
      ];
      (mockDb.miembros.toArray as any).mockResolvedValue(localData);
      (supabase.from as any).mockReturnValue({
        upsert: vi.fn().mockResolvedValue({ error: null }),
      });

      await pushAllLocal();

      const upsertCall = (supabase.from as any)().upsert.mock.calls[0][0];
      expect(upsertCall[0]).not.toHaveProperty('_primKey');
      expect(upsertCall[0]).not.toHaveProperty('updatedAt');
      expect(upsertCall[0]).not.toHaveProperty('codigo');
    });

    it('should strip base for dadores during pushAllLocal', async () => {
      const localData = [
        { id: '1', nombre: 'Test', base: 'some-base' },
      ];
      (mockDb.dadores.toArray as any).mockResolvedValue(localData);
      (supabase.from as any).mockReturnValue({
        upsert: vi.fn().mockResolvedValue({ error: null }),
      });

      await pushAllLocal();

      const upsertCall = (supabase.from as any)().upsert.mock.calls[0][0];
      expect(upsertCall[0]).not.toHaveProperty('base');
    });

    it('should ensure planOfrendaMonto is 0 for colaboradores if null during pushAllLocal', async () => {
      const localData = [
        { id: '1', nombre: 'Test', planOfrendaMonto: null },
      ];
      (mockDb.colaboradores.toArray as any).mockResolvedValue(localData);
      (supabase.from as any).mockReturnValue({
        upsert: vi.fn().mockResolvedValue({ error: null }),
      });

      await pushAllLocal();

      const upsertCall = (supabase.from as any)().upsert.mock.calls[0][0];
      // The key should be lowercased for Supabase
      expect(upsertCall[0].planofrendamonto).toBe(0);
    });
  });
});
