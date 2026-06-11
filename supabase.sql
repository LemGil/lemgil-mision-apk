-- ============================================
-- LEMGIL - ESCHEMA DEFINITIVO DE SUPABASE
-- Generado desde types.ts - Coincidencia 100%
-- ============================================

-- BORRADO EN ORDEN CORRECTO (dependencias)
DROP TABLE IF EXISTS entregas;
DROP TABLE IF EXISTS hitos;
DROP TABLE IF EXISTS miembrosministerios;
DROP TABLE IF EXISTS miembros;
DROP TABLE IF EXISTS aportescomun;
DROP TABLE IF EXISTS reportes;
DROP TABLE IF EXISTS publicaciones;
DROP TABLE IF EXISTS negocios;
DROP TABLE IF EXISTS metas;
DROP TABLE IF EXISTS campanas;
DROP TABLE IF EXISTS beneficiarios;
DROP TABLE IF EXISTS aportes;
DROP TABLE IF EXISTS dadores;
DROP TABLE IF EXISTS certificados;
DROP TABLE IF EXISTS estudiantes;
DROP TABLE IF EXISTS lecciones;
DROP TABLE IF EXISTS cursos;
DROP TABLE IF EXISTS evangelismos;
DROP TABLE IF EXISTS grupos;
DROP TABLE IF EXISTS conversiones;
DROP TABLE IF EXISTS zonas;
DROP TABLE IF EXISTS tiposplanes;
DROP TABLE IF EXISTS planescolaborador;
DROP TABLE IF EXISTS colaboradores;
DROP TABLE IF EXISTS ministerios;
DROP TABLE IF EXISTS miembroscomun;

-- ============================================
-- RECREAR CADA TABLA CON TODOS LOS CAMPOS
-- ============================================

-- CONVERSIONES (Mission Biblical)
CREATE TABLE conversiones (
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
  grupoId TEXT NOT NULL DEFAULT '',
  hermanoMayorId TEXT,
  email TEXT NOT NULL DEFAULT '',
  profesion TEXT NOT NULL DEFAULT '',
  bautizado BOOLEAN NOT NULL DEFAULT false,
  fechaBautismo TEXT NOT NULL DEFAULT '',
  conyuge TEXT NOT NULL DEFAULT '',
  hijos TEXT NOT NULL DEFAULT '',
  estado TEXT NOT NULL DEFAULT 'Nuevo',
  notas TEXT NOT NULL DEFAULT '',
  historial JSONB NOT NULL DEFAULT '[]',
  creado TEXT NOT NULL DEFAULT ''
);

-- GRUPOS
CREATE TABLE grupos (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL DEFAULT '',
  zona TEXT NOT NULL DEFAULT '',
  lider TEXT NOT NULL DEFAULT '',
  dia TEXT NOT NULL DEFAULT '',
  hora TEXT NOT NULL DEFAULT '',
  capacidad TEXT NOT NULL DEFAULT '',
  lugar TEXT NOT NULL DEFAULT '',
  miembros INTEGER NOT NULL DEFAULT 0,
  planOfrendasMensual REAL
);

-- EVANGELISMOS
CREATE TABLE evangelismos (
  id TEXT PRIMARY KEY,
  fecha TEXT NOT NULL DEFAULT '',
  tipo TEXT NOT NULL DEFAULT '',
  zona TEXT NOT NULL DEFAULT '',
  lider TEXT NOT NULL DEFAULT '',
  participantes JSONB NOT NULL DEFAULT '[]',
  contactos INTEGER NOT NULL DEFAULT 0,
  conversiones INTEGER NOT NULL DEFAULT 0,
  notas TEXT NOT NULL DEFAULT '',
  creado TEXT NOT NULL DEFAULT ''
);

-- CURSOS
CREATE TABLE cursos (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL DEFAULT '',
  instructor TEXT NOT NULL DEFAULT '',
  nivel TEXT NOT NULL DEFAULT 'Basico',
  duracion TEXT NOT NULL DEFAULT '',
  emoji TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT '',
  estado TEXT NOT NULL DEFAULT 'Activo',
  descripcion TEXT NOT NULL DEFAULT '',
  creado TEXT NOT NULL DEFAULT ''
);

-- LECCIONES
CREATE TABLE lecciones (
  id TEXT PRIMARY KEY,
  cursoId TEXT NOT NULL DEFAULT '',
  titulo TEXT NOT NULL DEFAULT '',
  numero INTEGER NOT NULL DEFAULT 0,
  duracion REAL,
  descripcion TEXT NOT NULL DEFAULT '',
  creado TEXT NOT NULL DEFAULT ''
);

-- ESTUDIANTES
CREATE TABLE estudiantes (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL DEFAULT '',
  apellido TEXT NOT NULL DEFAULT '',
  telefono TEXT NOT NULL DEFAULT '',
  edad TEXT NOT NULL DEFAULT '',
  cursoId TEXT NOT NULL DEFAULT '',
  fecha TEXT NOT NULL DEFAULT '',
  estado TEXT NOT NULL DEFAULT 'Activo',
  notas TEXT NOT NULL DEFAULT '',
  creado TEXT NOT NULL DEFAULT '',
  origen TEXT NOT NULL DEFAULT 'manual',
  origenId TEXT,
  zona TEXT NOT NULL DEFAULT '',
  grupoId TEXT,
  hermanoMayorId TEXT,
  email TEXT NOT NULL DEFAULT '',
  direccion TEXT NOT NULL DEFAULT '',
  profesion TEXT NOT NULL DEFAULT '',
  bautizado BOOLEAN NOT NULL DEFAULT false,
  fechaBautismo TEXT NOT NULL DEFAULT '',
  conyuge TEXT NOT NULL DEFAULT '',
  hijos TEXT NOT NULL DEFAULT ''
);

-- CERTIFICADOS
CREATE TABLE certificados (
  id TEXT PRIMARY KEY,
  estId TEXT NOT NULL DEFAULT '',
  cursoId TEXT NOT NULL DEFAULT '',
  fecha TEXT NOT NULL DEFAULT '',
  calificacion TEXT NOT NULL DEFAULT 'Aprobado',
  observaciones TEXT NOT NULL DEFAULT '',
  emitido TEXT NOT NULL DEFAULT ''
);

-- DADORES (Red de Colaboradores)
CREATE TABLE dadores (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL DEFAULT '',
  apellido TEXT NOT NULL DEFAULT '',
  telefono TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  estado TEXT NOT NULL DEFAULT 'Activo',
  tipo TEXT NOT NULL DEFAULT 'Persona',
  planOfrendaTipo TEXT NOT NULL DEFAULT '',
  planOfrendaMonto REAL NOT NULL DEFAULT 0,
  notas TEXT NOT NULL DEFAULT '',
  creado TEXT NOT NULL DEFAULT ''
);

-- APORTES (Red de Colaboradores)
CREATE TABLE aportes (
  id TEXT PRIMARY KEY,
  dadorId TEXT NOT NULL DEFAULT '',
  fecha TEXT NOT NULL DEFAULT '',
  monto REAL NOT NULL DEFAULT 0,
  tipo TEXT NOT NULL DEFAULT 'Ofrenda',
  metodo TEXT NOT NULL DEFAULT 'Efectivo',
  referencia TEXT NOT NULL DEFAULT '',
  notas TEXT NOT NULL DEFAULT '',
  creado TEXT NOT NULL DEFAULT ''
);

-- BENEFICIARIOS (Manos Abiertas)
CREATE TABLE beneficiarios (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL DEFAULT '',
  apellido TEXT NOT NULL DEFAULT '',
  telefono TEXT NOT NULL DEFAULT '',
  direccion TEXT NOT NULL DEFAULT '',
  zona TEXT NOT NULL DEFAULT '',
  familia INTEGER NOT NULL DEFAULT 1,
  estado TEXT NOT NULL DEFAULT 'Activo',
  notas TEXT NOT NULL DEFAULT '',
  creado TEXT NOT NULL DEFAULT '',
  tipo TEXT NOT NULL DEFAULT 'Persona',
  representativeName TEXT,
  source TEXT NOT NULL DEFAULT 'Manual',
  sourceId TEXT
);

-- CAMPANAS (Manos Abiertas)
CREATE TABLE campanas (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL DEFAULT '',
  fechaInicio TEXT NOT NULL DEFAULT '',
  fechaFin TEXT NOT NULL DEFAULT '',
  zona TEXT NOT NULL DEFAULT '',
  tipo TEXT NOT NULL DEFAULT 'Alimentaria',
  metaFamilias INTEGER NOT NULL DEFAULT 0,
  metaTipo TEXT NOT NULL DEFAULT 'Familias',
  responsable TEXT NOT NULL DEFAULT '',
  estado TEXT NOT NULL DEFAULT 'Planificada',
  descripcion TEXT NOT NULL DEFAULT '',
  creado TEXT NOT NULL DEFAULT ''
);

-- ENTREGAS (Manos Abiertas)
CREATE TABLE entregas (
  id TEXT PRIMARY KEY,
  campanaId TEXT NOT NULL DEFAULT '',
  beneficiarioId TEXT NOT NULL DEFAULT '',
  beneficiarioNombre TEXT NOT NULL DEFAULT '',
  beneficiarioTipo TEXT NOT NULL DEFAULT 'Manual',
  fecha TEXT NOT NULL DEFAULT '',
  tipo TEXT NOT NULL DEFAULT '',
  cantidad REAL NOT NULL DEFAULT 0,
  unidad TEXT NOT NULL DEFAULT '',
  notas TEXT NOT NULL DEFAULT '',
  creado TEXT NOT NULL DEFAULT ''
);

-- METAS
CREATE TABLE metas (
  id TEXT PRIMARY KEY,
  membresia INTEGER NOT NULL DEFAULT 0,
  academia INTEGER NOT NULL DEFAULT 0,
  sostenimiento INTEGER NOT NULL DEFAULT 0,
  familias INTEGER NOT NULL DEFAULT 0,
  personas INTEGER NOT NULL DEFAULT 0,
  actualizado TEXT NOT NULL DEFAULT ''
);

-- NEGOCIOS (Negocios Adonay)
CREATE TABLE negocios (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL DEFAULT '',
  emprendedor TEXT NOT NULL DEFAULT '',
  rubro TEXT NOT NULL DEFAULT '',
  zona TEXT NOT NULL DEFAULT '',
  etapa TEXT NOT NULL DEFAULT 'Idea',
  estado TEXT NOT NULL DEFAULT 'Activo',
  ingresosMensuales REAL NOT NULL DEFAULT 0,
  fechaInicio TEXT NOT NULL DEFAULT '',
  mentor TEXT NOT NULL DEFAULT '',
  descripcion TEXT NOT NULL DEFAULT '',
  notas TEXT NOT NULL DEFAULT '',
  creado TEXT NOT NULL DEFAULT ''
);

-- PUBLICACIONES (Comunicacion)
CREATE TABLE publicaciones (
  id TEXT PRIMARY KEY,
  titulo TEXT NOT NULL DEFAULT '',
  plataforma TEXT NOT NULL DEFAULT 'Otro',
  tipo TEXT NOT NULL DEFAULT 'Texto',
  fecha TEXT NOT NULL DEFAULT '',
  estado TEXT NOT NULL DEFAULT 'Borrador',
  alcance INTEGER NOT NULL DEFAULT 0,
  engagement REAL NOT NULL DEFAULT 0,
  url TEXT NOT NULL DEFAULT '',
  responsable TEXT NOT NULL DEFAULT '',
  notas TEXT NOT NULL DEFAULT '',
  creado TEXT NOT NULL DEFAULT ''
);

-- REPORTES
CREATE TABLE reportes (
  id TEXT PRIMARY KEY,
  titulo TEXT NOT NULL DEFAULT '',
  periodo TEXT NOT NULL DEFAULT '',
  desde TEXT NOT NULL DEFAULT '',
  hasta TEXT NOT NULL DEFAULT '',
  resumen TEXT NOT NULL DEFAULT '',
  generado TEXT NOT NULL DEFAULT '',
  generadoPor TEXT NOT NULL DEFAULT ''
);

-- MIEMBROS COMUN (Bien Comun - Colaboradores)
CREATE TABLE miembroscomun (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL DEFAULT '',
  apellido TEXT NOT NULL DEFAULT '',
  telefono TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  fechaIngreso TEXT NOT NULL DEFAULT '',
  estado TEXT NOT NULL DEFAULT 'Activo',
  zona TEXT NOT NULL DEFAULT '',
  grupo TEXT NOT NULL DEFAULT '',
  planDiezmo REAL NOT NULL DEFAULT 0,
  notas TEXT NOT NULL DEFAULT '',
  creado TEXT NOT NULL DEFAULT ''
);

-- APORTES COMUN (Bien Comun)
CREATE TABLE aportescomun (
  id TEXT PRIMARY KEY,
  miembroId TEXT,
  grupoId TEXT,
  fecha TEXT NOT NULL DEFAULT '',
  monto REAL NOT NULL DEFAULT 0,
  tipo TEXT NOT NULL DEFAULT 'Ofrenda',
  metodo TEXT NOT NULL DEFAULT 'Efectivo',
  mesCorrespondiente TEXT NOT NULL DEFAULT '',
  referencia TEXT NOT NULL DEFAULT '',
  notas TEXT NOT NULL DEFAULT '',
  creado TEXT NOT NULL DEFAULT ''
);

-- MIEMBROS (Iglesia)
CREATE TABLE miembros (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL DEFAULT '',
  apellido TEXT NOT NULL DEFAULT '',
  telefono TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  direccion TEXT NOT NULL DEFAULT '',
  zona TEXT NOT NULL DEFAULT '',
  grupoId TEXT,
  fechaNacimiento TEXT NOT NULL DEFAULT '',
  fechaIngreso TEXT NOT NULL DEFAULT '',
  estado TEXT NOT NULL DEFAULT 'Activo',
  contactoPreferido TEXT NOT NULL DEFAULT 'Otro',
  profesion TEXT NOT NULL DEFAULT '',
  estadoCivil TEXT NOT NULL DEFAULT 'Soltero',
  bautizado BOOLEAN NOT NULL DEFAULT false,
  fechaBautismo TEXT NOT NULL DEFAULT '',
  conyuge TEXT NOT NULL DEFAULT '',
  hijos TEXT NOT NULL DEFAULT '',
  hermanoMayorId TEXT,
  conversionId TEXT,
  notas TEXT NOT NULL DEFAULT '',
  creado TEXT NOT NULL DEFAULT '',
  actualizado TEXT NOT NULL DEFAULT ''
);

-- MINISTERIOS
CREATE TABLE ministerios (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL DEFAULT '',
  descripcion TEXT NOT NULL DEFAULT '',
  lider TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT '',
  emoji TEXT NOT NULL DEFAULT '',
  creado TEXT NOT NULL DEFAULT ''
);

-- MIEMBROS MINISTERIOS
CREATE TABLE miembrosministerios (
  id TEXT PRIMARY KEY,
  miembroId TEXT NOT NULL DEFAULT '',
  ministerioId TEXT NOT NULL DEFAULT '',
  rol TEXT NOT NULL DEFAULT 'Miembro',
  desde TEXT NOT NULL DEFAULT '',
  notas TEXT NOT NULL DEFAULT '',
  creado TEXT NOT NULL DEFAULT ''
);

-- HITOS
CREATE TABLE hitos (
  id TEXT PRIMARY KEY,
  miembroId TEXT,
  estudianteId TEXT,
  fecha TEXT NOT NULL DEFAULT '',
  tipo TEXT NOT NULL DEFAULT 'Otro',
  descripcion TEXT NOT NULL DEFAULT '',
  creado TEXT NOT NULL DEFAULT ''
);

-- ZONAS
CREATE TABLE zonas (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL DEFAULT '',
  creado TEXT NOT NULL DEFAULT ''
);

-- COLABORADORES (alias de miembroscomun para sync)
CREATE TABLE colaboradores (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL DEFAULT '',
  apellido TEXT NOT NULL DEFAULT '',
  telefono TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  fechaIngreso TEXT NOT NULL DEFAULT '',
  estado TEXT NOT NULL DEFAULT 'Activo',
  zona TEXT NOT NULL DEFAULT '',
  grupo TEXT NOT NULL DEFAULT '',
  planDiezmo REAL NOT NULL DEFAULT 0,
  notas TEXT NOT NULL DEFAULT '',
  creado TEXT NOT NULL DEFAULT ''
);

-- TIPOS DE PLAN
CREATE TABLE tiposplanes (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT '',
  activo BOOLEAN NOT NULL DEFAULT true,
  creado TEXT NOT NULL DEFAULT ''
);

-- PLANES COLABORADOR
CREATE TABLE planescolaborador (
  id TEXT PRIMARY KEY,
  colaboradorId TEXT NOT NULL DEFAULT '',
  tipoPlanId TEXT NOT NULL DEFAULT '',
  montoMensual REAL NOT NULL DEFAULT 0,
  notas TEXT NOT NULL DEFAULT '',
  creado TEXT NOT NULL DEFAULT ''
);

-- ============================================
-- ACTIVAR RLS + PERMISOS PUBLICOS
-- ============================================
DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'conversiones','grupos','evangelismos','cursos','lecciones',
    'estudiantes','certificados','dadores','aportes','beneficiarios',
    'campanas','entregas','metas','negocios','publicaciones',
    'reportes','miembroscomun','aportescomun','miembros',
    'ministerios','miembrosministerios','hitos','zonas','colaboradores',
    'tiposplanes','planescolaborador'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS public_all ON %I', t);
    EXECUTE format('CREATE POLICY public_all ON %I FOR ALL USING (true) WITH CHECK (true)', t);
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
