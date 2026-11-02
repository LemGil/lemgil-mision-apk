export const calcAge = (d: string) => {
  if (!d) return null;
  const n = new Date(d);
  const now = new Date();
  let age = now.getFullYear() - n.getFullYear();
  const m = now.getMonth() - n.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < n.getDate())) age--;
  return age;
};

export const EST_BADGE: Record<string, string> = { Activo: 'badge-green', Inactivo: 'badge-red', Trasladado: 'badge-yellow', Disciplinado: 'badge-red', Fallecido: 'badge-gray' };
export const CIVIL_BADGE: Record<string, string> = { Soltero: 'badge-blue', Casado: 'badge-green', Viudo: 'badge-yellow', Divorciado: 'badge-red', Unión: 'badge-purple' };
export const ROL_BADGE: Record<string, string> = { Líder: 'badge-purple', Coordinador: 'badge-blue', Servidor: 'badge-green', Miembro: 'badge-yellow' };
export const HITO_BADGE: Record<string, string> = { Conversión: 'badge-blue', Bautismo: 'badge-purple', Discipulado: 'badge-green', 'Curso Completado': 'badge-blue', Integración: 'badge-green', Liderazgo: 'badge-purple', Matrimonio: 'badge-yellow', Otro: 'badge-blue' };
export const ROLES = ['Líder', 'Coordinador', 'Servidor', 'Miembro'] as const;
export const HITO_TIPOS = ['Conversión', 'Bautismo', 'Discipulado', 'Curso Completado', 'Integración', 'Liderazgo', 'Matrimonio', 'Otro'] as const;

export const diasHastaCumple = (fechaNac: string) => {
  if (!fechaNac) return null;
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const fc = new Date(fechaNac); fc.setHours(0, 0, 0, 0);
  const prox = new Date(hoy.getFullYear(), fc.getMonth(), fc.getDate());
  if (prox < hoy) prox.setFullYear(hoy.getFullYear() + 1);
  return Math.floor((prox.getTime() - hoy.getTime()) / 86400000);
};
export const aniosEnIglesia = (fechaIngreso: string) => {
  if (!fechaIngreso) return 0;
  const fi = new Date(fechaIngreso);
  const hoy = new Date();
  let a = hoy.getFullYear() - fi.getFullYear();
  const m = hoy.getMonth() - fi.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < fi.getDate())) a--;
  return Math.max(0, a);
};
export const diasEnIglesia = (fechaIngreso: string) => {
  if (!fechaIngreso) return 0;
  const fi = new Date(fechaIngreso);
  return Math.max(0, Math.floor((Date.now() - fi.getTime()) / 86400000));
};

export type Tab = 'directorio' | 'ministerios' | 'hitos';
export type ModalType = 'miembro' | 'ministerio' | 'asignar' | 'hito' | 'detail' | 'delM' | 'delMin' | 'delAsig' | 'delH';
