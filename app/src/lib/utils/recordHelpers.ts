export function createBaseRecord<T extends Record<string, any>>(data: T): T & { version: number; updatedAt: string; creado: string } {
  const now = new Date().toISOString();
  return {
    ...data,
    version: 1,
    updatedAt: now,
    creado: data.creado || now,
  };
}
