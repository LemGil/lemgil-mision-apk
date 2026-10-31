export const NIVEL_BADGE: Record<string, string> = { Basico: 'badge-blue', Intermedio: 'badge-yellow', Avanzado: 'badge-red' };
export const EST_BADGE: Record<string, string> = { Activo: 'badge-green', Completado: 'badge-purple', Pausado: 'badge-yellow' };
export const CAL_BADGE: Record<string, string> = { Aprobado: 'badge-green', Sobresaliente: 'badge-purple', 'Con Honores': 'badge-yellow' };

export type Tab = 'cursos' | 'estudiantes' | 'certificados';
export type ModalType = 'curso' | 'leccion' | 'ver' | 'est' | 'cert' | 'estDetail';
export type HitoTipo = 'Conversión' | 'Bautismo' | 'Discipulado' | 'Curso Completado' | 'Integración' | 'Liderazgo' | 'Matrimonio' | 'Otro';

export function q(search: string, text: string) {
  return search && !text.toLowerCase().includes(search.toLowerCase());
}
