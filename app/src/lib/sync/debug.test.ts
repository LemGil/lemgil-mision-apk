import { describe, it, expect } from 'vitest';
import { toLowerCaseKeys, SUPABASE_TO_DEXIE } from './api';

describe('Debug toLowerCaseKeys', () => {
  it('should check what toLowerCaseKeys does', () => {
    const obj = { planOfrendaMonto: 0 };
    const result = toLowerCaseKeys(obj);
    console.log('SUPABASE_TO_DEXIE:', SUPABASE_TO_DEXIE);
    console.log('Result:', result);
    expect(result).toBeDefined();
  });
});
