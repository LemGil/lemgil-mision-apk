/**
 * Fase 2: los estados de la conversión YA NO viven aquí — son el
 * catálogo editable `pasosSeguimiento` (ámbito 'mision') y su lógica
 * vive en lib/pasosMision.ts (identidad fija, etiqueta libre, roles).
 * Aquí quedan solo las insignias de los tipos de evangelismo y los
 * tipos de pestañas/modales de la página.
 */
export const TIPO_BADGE: Record<string, string> = { 'Visita domiciliaria': 'badge-blue', 'Campaña en plaza': 'badge-green', 'Evangelismo en calle': 'badge-yellow', 'Reunión de célula': 'badge-purple', 'Invitación personal': 'badge-red' };

export type DataTab = 'conv' | 'grupo' | 'evang';
export type ModalType = 'conv' | 'grupo' | 'evang' | 'detail' | 'confirm' | 'confirmGrupo' | 'confirmEvang' | 'verGrupo';
