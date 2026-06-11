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
  estado: 'Nuevo' | 'Discipulado' | 'Bautizado' | 'Integrado' | 'Apartado' | 'Fallecido';
  notas: string;
  historial: HistorialEntry[];
  creado: string;
}

export interface HistorialEntry {
  fecha: string;
  estado: string;
  nota: string;
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

export interface Curso {
  id: string;
  nombre: string;
  instructor: string;
  nivel: 'Basico' | 'Intermedio' | 'Avanzado';
  duracion: string;
  emoji: string;
  color: string;
  estado: 'Activo' | 'Borrador' | 'Archivado';
  descripcion: string;
  creado: string;
}

export interface Leccion {
  id: string;
  cursoId: string;
  titulo: string;
  numero: number;
  duracion: number | null;
  descripcion: string;
  creado: string;
}

export interface Estudiante {
  id: string;
  nombre: string;
  apellido: string;
  telefono: string;
  edad: string;
  cursoId: string;
  fecha: string;
  estado: 'Activo' | 'Completado' | 'Pausado';
  notas: string;
  creado: string;
  origen: 'convertido' | 'miembro' | 'manual';
  origenId: string | null;
  zona: string;
  grupoId: string | null;
  hermanoMayorId: string | null;
  email: string;
  direccion: string;
  profesion: string;
  bautizado: boolean;
  fechaBautismo: string;
  conyuge: string;
  hijos: string;
}

export interface Certificado {
  id: string;
  estId: string;
  cursoId: string;
  fecha: string;
  calificacion: 'Aprobado' | 'Sobresaliente' | 'Con Honores';
  observaciones: string;
  emitido: string;
}

export interface Dador {
  id: string;
  nombre: string;
  apellido: string;
  telefono: string;
  email: string;
  estado: 'Activo' | 'Pausado' | 'Inactivo';
  tipo: 'Persona' | 'Empresa' | 'Iglesia';
  planOfrendaTipo: string;
  planOfrendaMonto: number;
  notas: string;
  creado: string;
}

export interface Aporte {
  id: string;
  dadorId: string;
  fecha: string;
  monto: number;
  tipo: 'Diezmo' | 'Ofrenda' | 'Misión' | 'Construcción' | 'Manos Abiertas' | 'Otro';
  metodo: 'Efectivo' | 'Transferencia' | 'Cheque' | 'Tarjeta' | 'Otro';
  referencia: string;
  notas: string;
  creado: string;
}

export interface Beneficiario {
  id: string;
  nombre: string;
  apellido: string;
  telefono: string;
  direccion: string;
  zona: string;
  familia: number;
  estado: 'Activo' | 'Inactivo';
  notas: string;
  creado: string;
  tipo: 'Persona' | 'Casa de Familia' | 'Grupo' | 'Vulnerable';
  representativeName?: string;
  source: 'Convertido' | 'Miembro' | 'Manual';
  sourceId?: string;
}

export interface Campana {
  id: string;
  nombre: string;
  fechaInicio: string;
  fechaFin: string;
  zona: string;
  tipo: 'Alimentaria' | 'Escolar' | 'Salud' | 'Vivienda' | 'Navidad' | 'Otra';
  metaFamilias: number;
  metaTipo: 'Familias' | 'Personas';
  responsable: string;
  estado: 'Planificada' | 'En curso' | 'Completada' | 'Cancelada';
  descripcion: string;
  creado: string;
}

export interface Entrega {
  id: string;
  campanaId: string;
  beneficiarioId: string;
  beneficiarioNombre: string;
  beneficiarioTipo: string;
  fecha: string;
  tipo: string;
  cantidad: number;
  unidad: string;
  notas: string;
  creado: string;
}

export interface Metas {
  id: string;
  membresia: number;
  academia: number;
  sostenimiento: number;
  familias: number;
  personas: number;
  actualizado: string;
}

export interface Negocio {
  id: string;
  nombre: string;
  emprendedor: string;
  rubro: string;
  zona: string;
  etapa: 'Idea' | 'Planificación' | 'Lanzamiento' | 'Operación' | 'Crecimiento' | 'Cierre';
  estado: 'Activo' | 'Pausado' | 'Completado' | 'Cancelado';
  ingresosMensuales: number;
  fechaInicio: string;
  mentor: string;
  descripcion: string;
  notas: string;
  creado: string;
}

export interface Publicacion {
  id: string;
  titulo: string;
  plataforma: 'YouTube' | 'Facebook' | 'Instagram' | 'WhatsApp' | 'Web' | 'Email' | 'Otro';
  tipo: 'Video' | 'Reel' | 'Imagen' | 'Texto' | 'Story' | 'Live' | 'Email' | 'Artículo';
  fecha: string;
  estado: 'Borrador' | 'Programada' | 'Publicada' | 'Archivada';
  alcance: number;
  engagement: number;
  url: string;
  responsable: string;
  notas: string;
  creado: string;
}

export interface Reporte {
  id: string;
  titulo: string;
  periodo: string;
  desde: string;
  hasta: string;
  resumen: string;
  generado: string;
  generadoPor: string;
}

export interface MiembroComun {
  id: string;
  nombre: string;
  apellido: string;
  telefono: string;
  email: string;
  fechaIngreso: string;
  estado: 'Activo' | 'Inactivo';
  zona: string;
  grupo: string;
  planDiezmo: number;
  notas: string;
  creado: string;
}

export interface AporteComun {
  id: string;
  miembroId: string | null;
  grupoId: string | null;
  fecha: string;
  monto: number;
  tipo: 'Diezmo' | 'Ofrenda';
  metodo: 'Efectivo' | 'Transferencia' | 'Cheque' | 'Tarjeta' | 'Otro';
  mesCorrespondiente: string;
  referencia: string;
  notas: string;
  creado: string;
}

export interface Miembro {
  id: string;
  nombre: string;
  apellido: string;
  telefono: string;
  email: string;
  direccion: string;
  zona: string;
  grupoId?: string | null;
  fechaNacimiento: string;
  fechaIngreso: string;
  estado: 'Activo' | 'Inactivo' | 'Trasladado' | 'Disciplinado' | 'Fallecido';
  contactoPreferido: 'Teléfono' | 'WhatsApp' | 'Email' | 'Visita' | 'Otro';
  profesion: string;
  estadoCivil: 'Soltero' | 'Casado' | 'Viudo' | 'Divorciado' | 'Unión';
  bautizado: boolean;
  fechaBautismo: string;
  conyuge: string;
  hijos: string;
  hermanoMayorId: string | null;
  conversionId: string | null;
  notas: string;
  creado: string;
  actualizado: string;
}

export interface Ministerio {
  id: string;
  nombre: string;
  descripcion: string;
  lider: string;
  color: string;
  emoji: string;
  creado: string;
}

export interface MiembroMinisterio {
  id: string;
  miembroId: string;
  ministerioId: string;
  rol: 'Líder' | 'Coordinador' | 'Servidor' | 'Miembro';
  desde: string;
  notas: string;
  creado: string;
}

export interface Hito {
  id: string;
  miembroId?: string;
  estudianteId?: string;
  fecha: string;
  tipo: 'Conversión' | 'Bautismo' | 'Discipulado' | 'Curso Completado' | 'Integración' | 'Liderazgo' | 'Matrimonio' | 'Otro';
  descripcion: string;
  creado: string;
}

export interface Zona {
  id: string;
  nombre: string;
  creado: string;
}

export interface TipoPlan {
  id: string;
  nombre: string;
  color: string;
  activo: boolean;
  creado: string;
}

export interface PlanColaborador {
  id: string;
  colaboradorId: string;
  tipoPlanId: string;
  montoMensual: number;
  notas: string;
  creado: string;
}
