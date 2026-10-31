export const EST_BADGE: Record<string, string> = { Activo: 'badge-green', Pausado: 'badge-yellow', Inactivo: 'badge-red' };
export const TIPO_BADGE: Record<string, string> = { Persona: 'badge-blue', Empresa: 'badge-purple', Iglesia: 'badge-yellow' };
export const APORTE_BADGE: Record<string, string> = { Diezmo: 'badge-purple', Ofrenda: 'badge-blue', 'Misión': 'badge-green', Construcción: 'badge-yellow', 'Manos Abiertas': 'badge-red', Otro: 'badge-blue' };
export const METODO_BADGE: Record<string, string> = { Efectivo: 'badge-green', Transferencia: 'badge-blue', Cheque: 'badge-yellow', Tarjeta: 'badge-purple', Otro: 'badge-blue' };

export type Tab = 'diezmadores' | 'aportes' | 'resumen';
export type SubTab = 'general' | 'mensual' | 'top' | 'metas' | 'cumplimiento';
export type ModalType = 'dador' | 'aporte' | 'detail' | 'delDador' | 'delAporte';
