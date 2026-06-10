-- =============================================================
-- LemGilDB - Esquema completo para Supabase
-- =============================================================

CREATE TABLE IF NOT EXISTS conversiones (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL DEFAULT '',
  apellido TEXT NOT NULL DEFAULT '',
  telefono TEXT NOT NULL DEFAULT '',
  edad TEXT NOT NULL DEFAULT '',
  direccion TEXT NOT NULL DEFAULT '',
  familia TEXT NOT NULL DEFAULT '',
  fecha TEXT NOT NULL DEFAULT '',
  zona TEXT NOT NULL DEFAULT '',
  lider TEXT NOT NULL DEFAULT '',
  grupoId TEXT DEFAULT NULL,
  hermanoMayorId TEXT DEFAULT NULL,
  email TEXT NOT NULL DEFAULT '',
  profesion TEXT NOT NULL DEFAULT '',
  bautizado BOOLEAN NOT NULL DEFAULT FALSE,
  fechaBautismo TEXT NOT NULL DEFAULT '',
  conyuge TEXT NOT NULL DEFAULT '',
  hijos TEXT NOT NULL DEFAULT '',
  estado TEXT NOT NULL DEFAULT 'Nuevo' CHECK (estado IN ('Nuevo','Discipulado','Bautizado','Integrado','Apartado','Fallecido')),
  notas TEXT NOT NULL DEFAULT '',
  historial JSONB NOT NULL DEFAULT '[]'::jsonb,
  creado TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS grupos (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL DEFAULT '',
  zona TEXT NOT NULL DEFAULT '',
  lider TEXT NOT NULL DEFAULT '',
  dia TEXT NOT NULL DEFAULT '',
  hora TEXT NOT NULL DEFAULT '',
  capacidad TEXT NOT NULL DEFAULT '',
  lugar TEXT NOT NULL DEFAULT '',
  miembros INTEGER NOT NULL DEFAULT 0,
  planOfrendasMensual REAL NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS evangelismos (
  id TEXT PRIMARY KEY,
  fecha TEXT NOT NULL DEFAULT '',
  tipo TEXT NOT NULL DEFAULT '',
  zona TEXT NOT NULL DEFAULT '',
  lider TEXT NOT NULL DEFAULT '',
  participantes JSONB NOT NULL DEFAULT '[]'::jsonb,
  contactos INTEGER NOT NULL DEFAULT 0,
  conversiones INTEGER NOT NULL DEFAULT 0,
  notas TEXT NOT NULL DEFAULT '',
  creado TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS cursos (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL DEFAULT '',
  instructor TEXT NOT NULL DEFAULT '',
  nivel TEXT NOT NULL DEFAULT 'Basico' CHECK (nivel IN ('Basico','Intermedio','Avanzado')),
  duracion TEXT NOT NULL DEFAULT '',
  emoji TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT '',
  estado TEXT NOT NULL DEFAULT 'Activo' CHECK (estado IN ('Activo','Borrador','Archivado')),
  descripcion TEXT NOT NULL DEFAULT '',
  creado TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS lecciones (
  id TEXT PRIMARY KEY,
  cursoId TEXT NOT NULL DEFAULT '',
  titulo TEXT NOT NULL DEFAULT '',
  numero INTEGER NOT NULL DEFAULT 0,
  duracion REAL DEFAULT NULL,
  descripcion TEXT NOT NULL DEFAULT '',
  creado TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS estudiantes (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL DEFAULT '',
  apellido TEXT NOT NULL DEFAULT '',
  telefono TEXT NOT NULL DEFAULT '',
  edad TEXT NOT NULL DEFAULT '',
  cursoId TEXT NOT NULL DEFAULT '',
  fecha TEXT NOT NULL DEFAULT '',
  estado TEXT NOT NULL DEFAULT 'Activo' CHECK (estado IN ('Activo','Completado','Pausado')),
  notas TEXT NOT NULL DEFAULT '',
  creado TEXT NOT NULL DEFAULT '',
  origen TEXT NOT NULL DEFAULT 'manual' CHECK (origen IN ('convertido','miembro','manual')),
  origenId TEXT DEFAULT NULL,
  zona TEXT NOT NULL DEFAULT '',
  grupoId TEXT DEFAULT NULL,
  hermanoMayorId TEXT DEFAULT NULL,
  email TEXT NOT NULL DEFAULT '',
  direccion TEXT NOT NULL DEFAULT '',
  profesion TEXT NOT NULL DEFAULT '',
  bautizado BOOLEAN NOT NULL DEFAULT FALSE,
  fechaBautismo TEXT NOT NULL DEFAULT '',
  conyuge TEXT NOT NULL DEFAULT '',
  hijos TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS certificados (
  id TEXT PRIMARY KEY,
  estId TEXT NOT NULL DEFAULT '',
  cursoId TEXT NOT NULL DEFAULT '',
  fecha TEXT NOT NULL DEFAULT '',
  calificacion TEXT NOT NULL DEFAULT 'Aprobado' CHECK (calificacion IN ('Aprobado','Sobresaliente','Con Honores')),
  observaciones TEXT NOT NULL DEFAULT '',
  emitido TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS dadores (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL DEFAULT '',
  apellido TEXT NOT NULL DEFAULT '',
  telefono TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  estado TEXT NOT NULL DEFAULT 'Activo' CHECK (estado IN ('Activo','Pausado','Inactivo')),
  tipo TEXT NOT NULL DEFAULT 'Persona' CHECK (tipo IN ('Persona','Empresa','Iglesia')),
  planOfrendaTipo TEXT NOT NULL DEFAULT '',
  planOfrendaMonto REAL NOT NULL DEFAULT 0,
  notas TEXT NOT NULL DEFAULT '',
  creado TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS aportes (
  id TEXT PRIMARY KEY,
  dadorId TEXT NOT NULL DEFAULT '',
  fecha TEXT NOT NULL DEFAULT '',
  monto REAL NOT NULL DEFAULT 0,
  tipo TEXT NOT NULL DEFAULT 'Diezmo' CHECK (tipo IN ('Diezmo','Ofrenda','Misión','Construcción','Manos Abiertas','Otro')),
  metodo TEXT NOT NULL DEFAULT 'Efectivo' CHECK (metodo IN ('Efectivo','Transferencia','Cheque','Tarjeta','Otro')),
  referencia TEXT NOT NULL DEFAULT '',
  notas TEXT NOT NULL DEFAULT '',
  creado TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS beneficiarios (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL DEFAULT '',
  apellido TEXT NOT NULL DEFAULT '',
  telefono TEXT NOT NULL DEFAULT '',
  direccion TEXT NOT NULL DEFAULT '',
  zona TEXT NOT NULL DEFAULT '',
  familia INTEGER NOT NULL DEFAULT 0,
  estado TEXT NOT NULL DEFAULT 'Activo' CHECK (estado IN ('Activo','Inactivo')),
  notas TEXT NOT NULL DEFAULT '',
  creado TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS campanas (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL DEFAULT '',
  fechaInicio TEXT NOT NULL DEFAULT '',
  fechaFin TEXT NOT NULL DEFAULT '',
  zona TEXT NOT NULL DEFAULT '',
  tipo TEXT NOT NULL DEFAULT 'Alimentaria' CHECK (tipo IN ('Alimentaria','Escolar','Salud','Vivienda','Navidad','Otra')),
  metaFamilias INTEGER NOT NULL DEFAULT 0,
  responsable TEXT NOT NULL DEFAULT '',
  estado TEXT NOT NULL DEFAULT 'Planificada' CHECK (estado IN ('Planificada','En curso','Completada','Cancelada')),
  descripcion TEXT NOT NULL DEFAULT '',
  creado TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS entregas (
  id TEXT PRIMARY KEY,
  campanaId TEXT NOT NULL DEFAULT '',
  beneficiarioId TEXT NOT NULL DEFAULT '',
  fecha TEXT NOT NULL DEFAULT '',
  tipo TEXT NOT NULL DEFAULT '',
  cantidad REAL NOT NULL DEFAULT 0,
  unidad TEXT NOT NULL DEFAULT '',
  notas TEXT NOT NULL DEFAULT '',
  creado TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS metas (
  id TEXT PRIMARY KEY DEFAULT 'default',
  membresia INTEGER NOT NULL DEFAULT 0,
  academia INTEGER NOT NULL DEFAULT 0,
  sostenimiento INTEGER NOT NULL DEFAULT 0,
  familias INTEGER NOT NULL DEFAULT 0,
  personas INTEGER NOT NULL DEFAULT 0,
  actualizado TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS negocios (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL DEFAULT '',
  emprendedor TEXT NOT NULL DEFAULT '',
  rubro TEXT NOT NULL DEFAULT '',
  zona TEXT NOT NULL DEFAULT '',
  etapa TEXT NOT NULL DEFAULT 'Idea' CHECK (etapa IN ('Idea','Planificación','Lanzamiento','Operación','Crecimiento','Cierre')),
  estado TEXT NOT NULL DEFAULT 'Activo' CHECK (estado IN ('Activo','Pausado','Completado','Cancelado')),
  ingresosMensuales REAL NOT NULL DEFAULT 0,
  fechaInicio TEXT NOT NULL DEFAULT '',
  mentor TEXT NOT NULL DEFAULT '',
  descripcion TEXT NOT NULL DEFAULT '',
  notas TEXT NOT NULL DEFAULT '',
  creado TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS publicaciones (
  id TEXT PRIMARY KEY,
  titulo TEXT NOT NULL DEFAULT '',
  plataforma TEXT NOT NULL DEFAULT 'Otro' CHECK (plataforma IN ('YouTube','Facebook','Instagram','WhatsApp','Web','Email','Otro')),
  tipo TEXT NOT NULL DEFAULT 'Texto' CHECK (tipo IN ('Video','Reel','Imagen','Texto','Story','Live','Email','Artículo')),
  fecha TEXT NOT NULL DEFAULT '',
  estado TEXT NOT NULL DEFAULT 'Borrador' CHECK (estado IN ('Borrador','Programada','Publicada','Archivada')),
  alcance INTEGER NOT NULL DEFAULT 0,
  engagement INTEGER NOT NULL DEFAULT 0,
  url TEXT NOT NULL DEFAULT '',
  responsable TEXT NOT NULL DEFAULT '',
  notas TEXT NOT NULL DEFAULT '',
  creado TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS reportes (
  id TEXT PRIMARY KEY,
  titulo TEXT NOT NULL DEFAULT '',
  periodo TEXT NOT NULL DEFAULT '',
  desde TEXT NOT NULL DEFAULT '',
  hasta TEXT NOT NULL DEFAULT '',
  resumen TEXT NOT NULL DEFAULT '',
  generado TEXT NOT NULL DEFAULT '',
  generadoPor TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS miembrosComun (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL DEFAULT '',
  apellido TEXT NOT NULL DEFAULT '',
  telefono TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  fechaIngreso TEXT NOT NULL DEFAULT '',
  estado TEXT NOT NULL DEFAULT 'Activo' CHECK (estado IN ('Activo','Inactivo')),
  planDiezmo REAL NOT NULL DEFAULT 0,
  notas TEXT NOT NULL DEFAULT '',
  creado TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS colaboradores (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL DEFAULT '',
  apellido TEXT NOT NULL DEFAULT '',
  telefono TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  fechaIngreso TEXT NOT NULL DEFAULT '',
  estado TEXT NOT NULL DEFAULT 'Activo' CHECK (estado IN ('Activo','Inactivo')),
  planDiezmo REAL NOT NULL DEFAULT 0,
  notas TEXT NOT NULL DEFAULT '',
  creado TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS aportesComun (
  id TEXT PRIMARY KEY,
  miembroId TEXT DEFAULT NULL,
  grupoId TEXT DEFAULT NULL,
  fecha TEXT NOT NULL DEFAULT '',
  monto REAL NOT NULL DEFAULT 0,
  tipo TEXT NOT NULL DEFAULT 'Diezmo' CHECK (tipo IN ('Diezmo','Ofrenda')),
  metodo TEXT NOT NULL DEFAULT 'Efectivo' CHECK (metodo IN ('Efectivo','Transferencia','Cheque','Tarjeta','Otro')),
  mesCorrespondiente TEXT NOT NULL DEFAULT '',
  referencia TEXT NOT NULL DEFAULT '',
  notas TEXT NOT NULL DEFAULT '',
  creado TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS miembros (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL DEFAULT '',
  apellido TEXT NOT NULL DEFAULT '',
  telefono TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  direccion TEXT NOT NULL DEFAULT '',
  zona TEXT NOT NULL DEFAULT '',
  grupoId TEXT DEFAULT NULL,
  fechaNacimiento TEXT NOT NULL DEFAULT '',
  fechaIngreso TEXT NOT NULL DEFAULT '',
  estado TEXT NOT NULL DEFAULT 'Activo' CHECK (estado IN ('Activo','Inactivo','Trasladado','Disciplinado','Fallecido')),
  contactoPreferido TEXT NOT NULL DEFAULT 'Teléfono' CHECK (contactoPreferido IN ('Teléfono','WhatsApp','Email','Visita','Otro')),
  profesion TEXT NOT NULL DEFAULT '',
  estadoCivil TEXT NOT NULL DEFAULT 'Soltero' CHECK (estadoCivil IN ('Soltero','Casado','Viudo','Divorciado','Unión')),
  bautizado BOOLEAN NOT NULL DEFAULT FALSE,
  fechaBautismo TEXT NOT NULL DEFAULT '',
  conyuge TEXT NOT NULL DEFAULT '',
  hijos TEXT NOT NULL DEFAULT '',
  hermanoMayorId TEXT DEFAULT NULL,
  conversionId TEXT DEFAULT NULL,
  notas TEXT NOT NULL DEFAULT '',
  creado TEXT NOT NULL DEFAULT '',
  actualizado TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS ministerios (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL DEFAULT '',
  descripcion TEXT NOT NULL DEFAULT '',
  lider TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT '',
  emoji TEXT NOT NULL DEFAULT '',
  creado TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS miembrosMinisterios (
  id TEXT PRIMARY KEY,
  miembroId TEXT NOT NULL DEFAULT '',
  ministerioId TEXT NOT NULL DEFAULT '',
  rol TEXT NOT NULL DEFAULT 'Miembro' CHECK (rol IN ('Líder','Coordinador','Servidor','Miembro')),
  desde TEXT NOT NULL DEFAULT '',
  notas TEXT NOT NULL DEFAULT '',
  creado TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS hitos (
  id TEXT PRIMARY KEY,
  miembroId TEXT DEFAULT NULL,
  estudianteId TEXT DEFAULT NULL,
  fecha TEXT NOT NULL DEFAULT '',
  tipo TEXT NOT NULL DEFAULT 'Otro' CHECK (tipo IN ('Conversión','Bautismo','Discipulado','Curso Completado','Integración','Liderazgo','Matrimonio','Otro')),
  descripcion TEXT NOT NULL DEFAULT '',
  creado TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS zonas (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL DEFAULT '',
  creado TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS tiposPlanes (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT '#3b82f6',
  activo BOOLEAN NOT NULL DEFAULT true,
  creado TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS planesColaborador (
  id TEXT PRIMARY KEY,
  colaboradorId TEXT NOT NULL DEFAULT '',
  tipoPlanId TEXT NOT NULL DEFAULT '',
  montoMensual REAL NOT NULL DEFAULT 0,
  notas TEXT NOT NULL DEFAULT '',
  creado TEXT NOT NULL DEFAULT ''
);
