export const EST_BEN: Record<string, string> = { Activo: 'badge-green', Inactivo: 'badge-red' };
export const CAMP_EST: Record<string, string> = { Planificada: 'badge-blue', 'En curso': 'badge-yellow', Completada: 'badge-green', Cancelada: 'badge-red' };
export const TIPO_CAMP: Record<string, string> = { Alimentaria: 'badge-red', Escolar: 'badge-blue', Salud: 'badge-green', Vivienda: 'badge-yellow', Navidad: 'badge-purple', Otra: 'badge-blue' };

export type Tab = 'ben' | 'camp' | 'ent';
export type ModalType = 'ben' | 'camp' | 'ent' | 'detailCamp' | 'delBen' | 'delCamp' | 'delEnt';
