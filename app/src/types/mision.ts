/**
 * Tipos específicos para el módulo de Misión Bíblica
 */

export type EstadoConversion = 'Nuevo' | 'Discipulado' | 'Bautizado' | 'Integrado' | 'Apartado' | 'Fallecido';

export interface HistorialEntry {
  fecha: string;
  estado: EstadoConversion;
  nota: string;
}

export interface Conversion {
  id: string;
  nombre: string;
  apellido: string;
  telefono: string;
  edad: string;
  direccion: string;
  familia: string;
  fecha: string;
  zona: string;
  lider: string;
  grupoId: string;
  hermanoMayorId: string | null;
  email: string;
  profesion: string;
  bautizado: boolean;
  fechaBautismo: string;
  conyuge: string;
  hijos: string;
  estado: EstadoConversion;
  notas: string;
  historial: HistorialEntry[];
  creado: string;
}

export interface Grupo {
  id: string;
  nombre: string;
  zona: string;
  lider: string;
  dia: string;
  hora: string;
  capacidad: string;
  lugar: string;
  miembros: number;
  planOfrendasMensual?: number;
}

export interface Evangelismo {
  id: string;
  fecha: string;
  tipo: string;
  zona: string;
  lider: string;
  participantes: string[];
  contactos: number;
  conversiones: number;
  notas: string;
  creado: string;
}

export type DataTab = 'conv' | 'grupo' | 'evang';

export type ModalType = 
  | 'conv' 
  | 'grupo' 
  | 'evang' 
  | 'detail' 
  | 'confirm' 
  | 'confirmGrupo' 
  | 'confirmEvang' 
  | 'verGrupo';

export interface StepPipeline {
  estado: EstadoConversion;
  emoji: string;
  cls: string;
}
