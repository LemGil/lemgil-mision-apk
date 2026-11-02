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
  /**
   * P6: el texto `lider` DEJÓ DE GUARDARSE (la verdad es el hermano mayor
   * de la persona, `hermanoMayorId` del núcleo, y el decorador
   * `conversionConDatos` lo deriva al pintar). Queda opcional en el tipo
   * SOLO como lectura tolerante de los registros viejos: su foto dormida
   * sigue en la base y el decorador cae a ella cuando la persona no tiene
   * hermano mayor enlazado. Las escrituras nuevas ya no lo producen.
   */
  lider?: string;
  grupoId: string;
  hermanoMayorId: string | null;
  email: string;
  profesion: string;
  bautizado: boolean;
  fechaBautismo: string;
  conyuge: string;
  hijos: string;
  estado: 'Nuevo' | 'Discipulado' | 'Bautizado' | 'Integrado' | 'Apartado' | 'Fallecido';
  /** P0.1: Nº de Identidad capturado en esta ficha (la migración lo sube al núcleo). */
  numeroIdentidad?: string;
  /** Ficha única (P0): la persona dueña de este proceso (→ personas.id). */
  personaId?: string | null;
  /** Ficha única (P2): evangelismo del que nació esta conversión (→ evangelismos.id). */
  evangelismoId?: string | null;
  notas: string;
  /** A1: si el miembro nacido de esta conversión fue eliminado a propósito, no recrearlo. */
  miembroDescartado?: boolean;
  historial: HistorialEntry[];
  creado: string;
  version: number;
  updatedAt?: string | number;
}

export interface HistorialEntry {
  fecha: string;
  estado: string;
  nota: string;
}

/**
 * FICHA ÚNICA (P0): la persona, una sola vez. Identidad y contacto viven aquí;
 * cada módulo conserva su tabla como PROCESO de la persona (conversiones,
 * miembros, estudiantes, dadores de Bien Común y beneficiarios guardan solo
 * `personaId` + los datos de su proceso). La Red de Colaboradores NO participa
 * (decisión de LemGil 2026-11-01: apoyo financiero externo, no membresía).
 */
export interface Persona {
  id: string;
  nombre: string;
  apellido: string;
  /**
   * P0.1: Nº de Identidad (carné) — la identificación PRINCIPAL de la
   * persona: única e intransferible (corrección de LemGil 2026-11-01).
   * El teléfono queda como respaldo para unir fichas viejas sin carné.
   */
  numeroIdentidad: string;
  telefono: string;
  email: string;
  direccion: string;
  zona: string;
  fechaNacimiento: string;
  profesion: string;
  estadoCivil: 'Soltero' | 'Casado' | 'Viudo' | 'Divorciado' | 'Unión';
  contactoPreferido: 'Teléfono' | 'WhatsApp' | 'Email' | 'Visita' | 'Otro';
  bautizado: boolean;
  fechaBautismo: string;
  conyuge: string;
  hijos: string;
  /** Grupo actual de la persona (→ grupos.id). Uno solo: es de la persona. */
  grupoId: string | null;
  /** Mentor de la persona (→ personas.id, otra persona). */
  hermanoMayorId: string | null;
  creado: string;
  version: number;
  updatedAt?: string | number;
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
  version: number;
  updatedAt?: string | number;
}

export interface Evangelismo {
  id: string;
  tipo: string;
  fecha: string;
  zona: string;
  /**
   * Texto dormido: foto del nombre del líder (la verdad es `liderId`, P2).
   * P6 — HALLAZGO (verificado con grep): NO se retira ni deja de guardarse.
   * Sigue leyéndose EN VIVO como respaldo tolerante de los evangelismos
   * anteriores a P2 (sin `liderId`): la tabla cae a él para pintar al
   * líder, el filtro «Ministro» y el buscador de Misión lo comparan, y la
   * exportación CSV lo escribe; y al guardar se sigue escribiendo la foto
   * derivada de los ids junto con los nombres de respaldo sin persona —
   * sin esa escritura, esos nombres se perderían y el filtro perdería a
   * los líderes nuevos. Su retirada exige resolver filtro, buscador y
   * exportaciones desde `personas`: obra nueva, fuera del cierre P6.
   */
  lider: string;
  /**
   * Texto dormido: foto de los nombres del equipo (la verdad es
   * `participanteIds`, P2). P6 — HALLAZGO: igual que `lider`, sigue
   * leyéndose como respaldo (conteo y nombres del equipo en la tabla,
   * conteo en el PDF) y escribiéndose al guardar; no se retira.
   */
  participantes: string[];
  /** Ficha única (P2): líder del evangelismo (→ personas.id). */
  liderId?: string | null;
  /** Ficha única (P2): equipo del evangelismo (→ personas.id[]). */
  participanteIds?: string[];
  contactos: number;
  /**
   * Cifra manual vieja, dormida desde P2: la cifra viva es el CONTEO
   * DERIVADO de las conversiones con este `evangelismoId` (decisión de
   * LemGil: sin saldo histórico).
   */
  conversiones: number;
  notas: string;
  creado: string;
  version: number;
  updatedAt?: string | number;
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
  version: number;
  updatedAt?: string | number;
}

export interface Leccion {
  id: string;
  cursoId: string;
  titulo: string;
  numero: number;
  duracion: number | null;
  descripcion: string;
  creado: string;
  version: number;
  updatedAt?: string | number;
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
  /** P0.1: Nº de Identidad capturado en esta ficha (la migración lo sube al núcleo). */
  numeroIdentidad?: string;
  /** Ficha única (P0): la persona dueña de este proceso (→ personas.id). */
  personaId?: string | null;
  notas: string;
  creado: string;
  // P6: `origen`/`origenId` RETIRADOS del tipo (murieron en P3: con
  // `personaId`, la persona ES el origen). Los registros viejos los traen
  // dormidos en la base y así se quedan — retirar el campo del tipo no
  // toca datos —; el mapeo de tolerancia en sync y el upgrade histórico
  // v10 de Dexie los siguen conociendo como historia.
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
  version: number;
  updatedAt?: string | number;
}

export interface Certificado {
  id: string;
  estId: string;
  cursoId: string;
  fecha: string;
  calificacion: 'Aprobado' | 'Sobresaliente' | 'Con Honores';
  observaciones: string;
  emitido: string;
  version: number;
  updatedAt?: string | number;
}

export interface Diezmador {
  id: string;
  /**
   * Datos personales DORMIDOS desde P4 (ficha única): la identidad vive en
   * la persona enlazada (`personaId`) y las lecturas la resuelven desde el
   * núcleo (`diezmadorConDatos`). Las altas nuevas los escriben vacíos;
   * los registros viejos conservan su última copia. El `grupo` era TEXTO
   * tecleado: murió como escritura — el grupo es el de la persona
   * (`grupoId` del núcleo, resuelto a nombre al pintar).
   *
   * P6 — HALLAZGO (verificado con grep y con tsc): estos campos NO se
   * retiran del tipo. No están muertos del todo: son los campos que las
   * pantallas de Bien Común pintan (el decorador los sobrescribe desde el
   * núcleo cuando hay persona) y la lectura TOLERANTE de los procesos sin
   * persona enlazada (el decorador devuelve la ficha tal cual, §4.3.3);
   * además son la semilla de `asegurarPersonaDeDiezmador` y de los
   * importados por CSV aún sin enlazar. Retirarlos exigiría re-tipificar
   * toda la capa de lectura de Bien Común: obra nueva, fuera del cierre.
   */
  nombre: string;
  apellido: string;
  telefono: string;
  email: string;
  fechaIngreso: string;
  estado: 'Activo' | 'Inactivo';
  zona: string;
  grupo: string;
  /** P0.1: Nº de Identidad capturado en esta ficha (la migración lo sube al núcleo). */
  numeroIdentidad?: string;
  /** Ficha única (P0): la persona dueña de este proceso (→ personas.id). */
  personaId?: string | null;
  planDiezmo: number;
  notas: string;
  creado: string;
  version: number;
  updatedAt?: string | number;
}

export interface Aporte {
  id: string;
  colaboradorId: string;
  fecha: string;
  monto: number;
  tipo: 'Diezmo' | 'Ofrenda' | 'Misión' | 'Construcción' | 'Manos Abiertas' | 'Otro';
  metodo: 'Efectivo' | 'Transferencia' | 'Cheque' | 'Tarjeta' | 'Otro';
  referencia: string;
  notas: string;
  creado: string;
  version: number;
  updatedAt?: string | number;
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
  /** P0.1: Nº de Identidad capturado en esta ficha (la migración lo sube al núcleo). */
  numeroIdentidad?: string;
  /**
   * Ficha única (P0; enlace completado en P5): la persona de este proceso
   * (→ personas.id). Para Persona/Vulnerable es la propia persona ayudada;
   * para «Casa de Familia»/«Grupo» — que NO son una persona del núcleo —
   * es su REPRESENTANTE: la persona que recibe y firma, de cuya ficha se
   * resuelven el teléfono, la dirección y la zona de contacto. Nullable:
   * un hogar o grupo puede no tener representante enlazado todavía.
   */
  personaId?: string | null;
  notas: string;
  creado: string;
  tipo: 'Persona' | 'Casa de Familia' | 'Grupo' | 'Vulnerable';
  representativeName?: string;
  // P6: `source`/`sourceId` RETIRADOS del tipo (murieron en P5: con
  // `personaId`, la persona ES el origen). Los registros viejos los traen
  // dormidos en la base y así se quedan — retirar el campo del tipo no
  // toca datos.
  version: number;
  updatedAt?: string | number;
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
  version: number;
  updatedAt?: string | number;
}

export interface Entrega {
  id: string;
  campanaId: string;
  beneficiarioId: string;
  beneficiarioTipo?: string;
  beneficiarioNombre?: string;
  fecha: string;
  tipo: string;
  cantidad: number;
  unidad: string;
  notas: string;
  creado: string;
  version: number;
  updatedAt?: string | number;
}

export interface Metas {
  id: string;
  membresia: number;
  academia: number;
  sostenimiento: number;
  familias: number;
  personas: number;
  actualizado: string;
  version: number;
  updatedAt?: string | number;
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
  version: number;
  updatedAt?: string | number;
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
  version: number;
  updatedAt?: string | number;
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
  version: number;
  updatedAt?: string | number;
}

export interface Colaborador {
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
  version: number;
  updatedAt?: string | number;
}

export interface AporteComun {
  id: string;
  diezmadorId: string | null;
  grupoId: string | null;
  fecha: string;
  monto: number;
  tipo: 'Diezmo' | 'Ofrenda';
  metodo: 'Efectivo' | 'Transferencia' | 'Cheque' | 'Tarjeta' | 'Otro';
  mesCorrespondiente: string;
  referencia: string;
  notas: string;
  creado: string;
  version: number;
  updatedAt?: string | number;
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
  /** P0.1: Nº de Identidad capturado en esta ficha (la migración lo sube al núcleo). */
  numeroIdentidad?: string;
  /** Ficha única (P0): la persona dueña de este proceso (→ personas.id). */
  personaId?: string | null;
  notas: string;
  creado: string;
  actualizado: string;
  version: number;
  updatedAt?: string | number;
}

export interface Ministerio {
  id: string;
  nombre: string;
  descripcion: string;
  lider: string;
  color: string;
  emoji: string;
  creado: string;
  version: number;
  updatedAt?: string | number;
}

export interface MiembroMinisterio {
  id: string;
  miembroId: string;
  ministerioId: string;
  rol: 'Líder' | 'Coordinador' | 'Servidor' | 'Miembro';
  desde: string;
  notas: string;
  creado: string;
  version: number;
  updatedAt?: string | number;
}

export interface Hito {
  id: string;
  miembroId?: string;
  estudianteId?: string;
  fecha: string;
  tipo: 'Conversión' | 'Bautismo' | 'Discipulado' | 'Curso Completado' | 'Integración' | 'Liderazgo' | 'Matrimonio' | 'Otro';
  descripcion: string;
  creado: string;
  version: number;
  updatedAt?: string | number;
}

export interface Zona {
  id: string;
  nombre: string;
  creado: string;
  version: number;
  updatedAt?: string | number;
}

export interface TipoPlan {
  id: string;
  nombre: string;
  color: string;
  activo: boolean;
  creado: string;
  version: number;
  updatedAt?: string | number;
}

export interface PlanColaborador {
  id: string;
  diezmadorId: string;
  tipoPlanId: string;
  montoMensual: number;
  notas: string;
  creado: string;
  version: number;
  updatedAt?: string | number;
}
