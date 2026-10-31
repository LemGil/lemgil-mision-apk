export const ESTADOS = ['Nuevo', 'Discipulado', 'Bautizado', 'Integrado', 'Apartado', 'Fallecido'] as const;
export const EST_BADGE: Record<string, string> = { Nuevo: 'badge-blue', Discipulado: 'badge-yellow', Bautizado: 'badge-green', Integrado: 'badge-purple', Apartado: 'badge-red', Fallecido: 'badge-gray' };
export const ESTADOS_COLOR: Record<number, string> = { 0: 'var(--blue)', 1: 'var(--yellow)', 2: 'var(--green)', 3: 'var(--purple)', 4: 'var(--red)', 5: 'var(--dim)' };
export const ESTADOS_TIPO_HITO: Record<string, 'Conversión' | 'Discipulado' | 'Bautismo' | 'Integración'> = { Nuevo: 'Conversión', Discipulado: 'Discipulado', Bautizado: 'Bautismo', Integrado: 'Integración' };
export const ESTADOS_EMOJI: Record<string, string> = { Nuevo: '🌱', Discipulado: '📖', Bautizado: '💧', Integrado: '🏘️', Apartado: '🚪', Fallecido: '✝️' };
export const TIPO_BADGE: Record<string, string> = { 'Visita domiciliaria': 'badge-blue', 'Campaña en plaza': 'badge-green', 'Evangelismo en calle': 'badge-yellow', 'Reunión de célula': 'badge-purple', 'Invitación personal': 'badge-red' };

export type DataTab = 'conv' | 'grupo' | 'evang';
export type ModalType = 'conv' | 'grupo' | 'evang' | 'detail' | 'confirm' | 'confirmGrupo' | 'confirmEvang' | 'verGrupo';
