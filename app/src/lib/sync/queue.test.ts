import { describe, it, expect, beforeEach } from 'vitest';
import { getQueue, enqueue } from './queue';
import type { SyncOp } from './types';

describe('Sync Queue', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('debería retornar una cola vacía inicialmente', () => {
    expect(getQueue()).toEqual([]);
  });

  it('debería persistir y recuperar operaciones en la cola', () => {
    const op: SyncOp = {
      table: 'miembros',
      operation: 'create',
      id: 'test-1',
      data: { nombre: 'Test' },
      timestamp: Date.now()
    };
    
    enqueue(op);
    
    const queue = getQueue();
    expect(queue.length).toBe(1);
    expect(queue[0]).toEqual(op);
  });

  it('debería mantener el orden de las operaciones', () => {
    const op1: SyncOp = { table: 'miembros', operation: 'create', id: '1', timestamp: 1 };
    const op2: SyncOp = { table: 'miembros', operation: 'update', id: '1', timestamp: 2 };
    
    enqueue(op1);
    enqueue(op2);
    
    const queue = getQueue();
    expect(queue).toEqual([op1, op2]);
  });
});
