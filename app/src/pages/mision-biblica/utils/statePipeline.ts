/**
 * Pipeline de estados para conversiones
 * Define los estados, transiciones, badges y utilidades relacionadas
 */

import type { EstadoConversion, StepPipeline } from '../../types/mision';

export const ESTADOS: readonly EstadoConversion[] = [
  'Nuevo',
  'Discipulado',
  'Bautizado',
  'Integrado',
  'Apartado',
  'Fallecido'
] as const;

export const EST_BADGE: Record<EstadoConversion, string> = {
  Nuevo: 'badge-blue',
  Discipulado: 'badge-yellow',
  Bautizado: 'badge-green',
  Integrado: 'badge-purple',
  Apartado: 'badge-red',
  Fallecido: 'badge-gray'
};

export const ESTADOS_COLOR: Record<number, string> = {
  0: 'var(--blue)',
  1: 'var(--yellow)',
  2: 'var(--green)',
  3: 'var(--purple)',
  4: 'var(--red)',
  5: 'var(--dim)'
};

export const ESTADOS_TIPO_HITO: Record<EstadoConversion, 'Conversión' | 'Discipulado' | 'Bautismo' | 'Integración'> = {
  Nuevo: 'Conversión',
  Discipulado: 'Discipulado',
  Bautizado: 'Bautismo',
  Integrado: 'Integración',
  Apartado: 'Otro',
  Fallecido: 'Otro'
} as const;

export const ESTADOS_EMOJI: Record<EstadoConversion, string> = {
  Nuevo: '🌱',
  Discipulado: '📖',
  Bautizado: '💧',
  Integrado: '🏘️',
  Apartado: '🚪',
  Fallecido: '✝️'
};

export const TIPO_BADGE: Record<string, string> = {
  'Visita domiciliaria': 'badge-blue',
  'Campaña en plaza': 'badge-green',
  'Evangelismo en calle': 'badge-yellow',
  'Reunión de célula': 'badge-purple',
  'Invitación personal': 'badge-red'
};

/**
 * Calcula los pasos del pipeline con su estado visual
 */
export function updateSteps(estadoActual: EstadoConversion): StepPipeline[] {
  const esFinal = estadoActual === 'Apartado' || estadoActual === 'Fallecido';
  
  if (esFinal) {
    return ESTADOS.map((e, i) => ({
      estado: e,
      emoji: ['🌱', '📖', '💧', '🏘️'][i] ?? '—',
      cls: 'step'
    }));
  }
  
  const idx = ESTADOS.indexOf(estadoActual);
  
  return ESTADOS.map((e, i) => ({
    estado: e,
    emoji: ['🌱', '📖', '💧', '🏘️'][i] ?? '—',
    cls: i < idx ? 'step done' : i === idx ? 'step active' : 'step'
  }));
}

/**
 * Obtiene el siguiente estado en el pipeline
 * Returns null si está en el último estado o es un estado final
 */
export function getNextEstado(estado: EstadoConversion): EstadoConversion | null {
  if (estado === 'Apartado' || estado === 'Fallecido') return null;
  const idx = ESTADOS.indexOf(estado);
  if (idx >= 0 && idx < ESTADOS.length - 1) {
    return ESTADOS[idx + 1];
  }
  return null;
}

/**
 * Calcula el progreso porcentual basado en el estado actual
 */
export function calcularProgreso(estado: EstadoConversion): number {
  const idx = ESTADOS.indexOf(estado);
  if (idx === -1) return 0;
  return Math.round(((idx + 1) / ESTADOS.length) * 100);
}

/**
 * Verifica si un estado es terminal (no permite más transiciones)
 */
export function esEstadoFinal(estado: EstadoConversion): boolean {
  return estado === 'Apartado' || estado === 'Fallecido';
}
