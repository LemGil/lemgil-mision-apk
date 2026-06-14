import Dexie, { type EntityTable } from 'dexie';
import type { Conversion, Grupo, Evangelismo, Curso, Leccion, Estudiante, Certificado, Diezmador, Aporte, Beneficiario, Campana, Entrega, Metas, Negocio, Publicacion, Reporte, Colaborador, AporteComun, Miembro, Ministerio, MiembroMinisterio, Hito, Zona, TipoPlan, PlanColaborador } from './types';

const database = new Dexie('LemGilDB') as Dexie & {
  conversiones: EntityTable<Conversion, 'id'>;
  grupos: EntityTable<Grupo, 'id'>;
  evangelismos: EntityTable<Evangelismo, 'id'>;
  cursos: EntityTable<Curso, 'id'>;
  lecciones: EntityTable<Leccion, 'id'>;
  estudiantes: EntityTable<Estudiante, 'id'>;
  certificados: EntityTable<Certificado, 'id'>;
  dadores: EntityTable<Diezmador, 'id'>;
  aportes: EntityTable<Aporte, 'id'>;
  beneficiarios: EntityTable<Beneficiario, 'id'>;
  campanas: EntityTable<Campana, 'id'>;
  entregas: EntityTable<Entrega, 'id'>;
  metas: EntityTable<Metas, 'id'>;
  negocios: EntityTable<Negocio, 'id'>;
  publicaciones: EntityTable<Publicacion, 'id'>;
  reportes: EntityTable<Reporte, 'id'>;
  miembrosComun: EntityTable<Colaborador, 'id'>;
  aportesComun: EntityTable<AporteComun, 'id'>;
  miembros: EntityTable<Miembro, 'id'>;
  ministerios: EntityTable<Ministerio, 'id'>;
  miembrosMinisterios: EntityTable<MiembroMinisterio, 'id'>;
  hitos: EntityTable<Hito, 'id'>;
  zonas: EntityTable<Zona, 'id'>;
  colaboradores: EntityTable<Colaborador, 'id'>;
  tiposPlanes: EntityTable<TipoPlan, 'id'>;
  planesColaborador: EntityTable<PlanColaborador, 'id'>;
};

database.version(1).stores({
  conversiones: 'id, zona, estado, fecha, lider, creado',
  grupos: 'id, zona, lider',
  evangelismos: 'id, zona, fecha, tipo, lider, creado',
  cursos: 'id, nivel, estado, creado',
  lecciones: 'id, cursoId, creado',
  estudiantes: 'id, cursoId, estado, creado',
  certificados: 'id, estId, cursoId, emitido',
  dadores: 'id, nombre, apellido, estado, tipo, creado',
  aportes: 'id, colaboradorId, fecha, tipo, metodo, creado',
  beneficiarios: 'id, nombre, apellido, zona, estado, creado',
  campanas: 'id, nombre, zona, tipo, estado, fechaInicio, creado',
  entregas: 'id, campanaId, beneficiarioId, fecha, creado',
  metas: 'id',
  negocios: 'id, nombre, emprendedor, rubro, zona, etapa, estado, creado',
  publicaciones: 'id, plataforma, estado, fecha, creado',
  reportes: 'id, generado',
  miembrosComun: 'id, nombre, apellido, estado, creado',
  aportesComun: 'id, diezmadorId, fecha, tipo, mesCorrespondiente, creado',
  miembros: 'id, nombre, apellido, zona, estado, fechaIngreso, creado',
  ministerios: 'id, nombre, creado',
  miembrosMinisterios: 'id, miembroId, ministerioId, rol, desde, creado',
   hitos: 'id, miembroId, estudianteId, fecha, tipo, creado',
});

database.version(2).stores({
  miembros: 'id, nombre, apellido, zona, estado, fechaIngreso, conversionId, creado',
});

database.version(4).stores({
  zonas: 'id, nombre, creado',
  colaboradores: 'id, nombre, apellido, estado, creado',
  aportesComun: 'id, diezmadorId, grupoId, fecha, tipo, mesCorrespondiente, creado',
});

database.version(5).stores({
  grupos: 'id, zona, lider',
}).upgrade(async (tx) => {
  await tx.table('grupos').toCollection().modify((g: any) => {
    if (typeof g.metaMensual !== 'number') g.metaMensual = 0;
  });
});

database.version(6).stores({
  conversiones: 'id, zona, estado, fecha, lider, creado, grupoId',
}).upgrade(async (tx) => {
  await tx.table('conversiones').toCollection().modify((c: any) => {
    if (typeof c.grupoId === 'undefined') c.grupoId = null;
  });
});

database.version(7).stores({
  evangelismos: 'id, zona, fecha, tipo, lider, creado',
}).upgrade(async (tx) => {
  await tx.table('evangelismos').toCollection().modify((e: any) => {
    if (!Array.isArray(e.participantes)) e.participantes = [];
  });
});

database.version(9).stores({
  hitos: 'id, miembroId, estudianteId, fecha, tipo, creado',
}).upgrade(async (tx) => {
  await tx.table('hitos').toCollection().modify((h: any) => {
    if (typeof h.estudianteId === 'undefined') h.estudianteId = null;
  });
});

database.version(10).stores({
  estudiantes: 'id, cursoId, estado, origen, zona, grupoId, creado',
}).upgrade(async (tx) => {
  await tx.table('estudiantes').toCollection().modify((e: any) => {
    if (typeof e.origen === 'undefined') e.origen = 'manual';
    if (typeof e.origenId === 'undefined') e.origenId = null;
    if (typeof e.zona === 'undefined') e.zona = '';
    if (typeof e.grupoId === 'undefined') e.grupoId = null;
    if (typeof e.hermanoMayorId === 'undefined') e.hermanoMayorId = null;
    if (typeof e.email === 'undefined') e.email = '';
    if (typeof e.direccion === 'undefined') e.direccion = '';
    if (typeof e.profesion === 'undefined') e.profesion = '';
    if (typeof e.bautizado === 'undefined') e.bautizado = false;
    if (typeof e.fechaBautismo === 'undefined') e.fechaBautismo = '';
    if (typeof e.conyuge === 'undefined') e.conyuge = '';
    if (typeof e.hijos === 'undefined') e.hijos = '';
  });
});

database.version(11).stores({
  conversiones: 'id, zona, estado, fecha, lider, creado, grupoId, hermanoMayorId',
}).upgrade(async (tx) => {
  await tx.table('conversiones').toCollection().modify((c: any) => {
    if (typeof c.hermanoMayorId === 'undefined') c.hermanoMayorId = null;
    if (typeof c.email === 'undefined') c.email = '';
    if (typeof c.profesion === 'undefined') c.profesion = '';
    if (typeof c.bautizado === 'undefined') c.bautizado = false;
    if (typeof c.fechaBautismo === 'undefined') c.fechaBautismo = '';
    if (typeof c.conyuge === 'undefined') c.conyuge = '';
    if (typeof c.hijos === 'undefined') c.hijos = '';
  });
});

database.version(12);

database.version(13);

database.version(14).stores({
  grupos: 'id, zona, lider',
}).upgrade(async (tx) => {
  await tx.table('grupos').toCollection().modify((g: any) => {
    if (typeof g.metaMensual === 'number' && typeof g.planOfrendasMensual !== 'number') {
      g.planOfrendasMensual = g.metaMensual;
    }
    if (typeof g.planOfrendasMensual !== 'number') g.planOfrendasMensual = 0;
  });
});

database.version(15).stores({
  miembrosComun: 'id, nombre, apellido, estado, creado',
  colaboradores: 'id, nombre, apellido, estado, creado',
}).upgrade(async (tx) => {
  const migrate = async (tableName: string) => {
    await tx.table(tableName).toCollection().modify((c: any) => {
      if (typeof c.base === 'number' && typeof c.planDiezmo !== 'number') {
        c.planDiezmo = c.base;
      }
      if (typeof c.planDiezmo !== 'number') c.planDiezmo = 0;
    });
  };
  await migrate('miembrosComun');
  await migrate('colaboradores');
});

database.version(16).stores({
  tiposPlanes: 'id, nombre, activo',
  planesColaborador: 'id, diezmadorId, tipoPlanId',
}).upgrade(async (tx) => {
  const count = await tx.table('tiposPlanes').count();
  if (count === 0) {
    const now = new Date().toISOString();
    const defaults = [
      { id: 'tp-1', nombre: 'Ofrenda General', color: '#3b82f6', activo: true, creado: now },
      { id: 'tp-2', nombre: 'Misión', color: '#8b5cf6', activo: true, creado: now },
      { id: 'tp-3', nombre: 'Manos Abiertas', color: '#f97316', activo: true, creado: now },
      { id: 'tp-4', nombre: 'Negocios Adonay', color: '#10b981', activo: true, creado: now },
      { id: 'tp-5', nombre: 'Construcción', color: '#6366f1', activo: true, creado: now },
    ];
    await tx.table('tiposPlanes').bulkAdd(defaults);
  }
  await tx.table('dadores').toCollection().modify((d: any) => {
    if (typeof d.planDiezmo === 'undefined') d.planDiezmo = 0;
  });
});

database.version(17).stores({}).upgrade(async (tx) => {
  await tx.table('campanas').toCollection().modify((c: any) => {
    if (typeof c.metaTipo === 'undefined') c.metaTipo = 'Familias';
  });
});

database.version(18).stores({
  dadores: 'id, nombre, apellido, estado, tipo, creado',
  colaboradores: 'id, nombre, apellido, estado, creado',
  aportes: 'id, colaboradorId, fecha, tipo, metodo, creado',
  aportesComun: 'id, diezmadorId, grupoId, fecha, tipo, mesCorrespondiente, creado',
  planesColaborador: 'id, diezmadorId, tipoPlanId',
});

database.version(19).stores({
  dadores: 'id, nombre, apellido, estado, tipo, creado',
  colaboradores: 'id, nombre, apellido, estado, creado',
  aportes: 'id, colaboradorId, fecha, tipo, metodo, creado',
  aportesComun: 'id, diezmadorId, grupoId, fecha, tipo, mesCorrespondiente, creado',
  planesColaborador: 'id, diezmadorId, tipoPlanId',
}).upgrade(async (tx) => {
  // 1. Asegurar renames de FKs (por si v18 se saltó en algunos clientes)
  await tx.table('aportes').toCollection().modify((a: any) => {
    if (typeof a.dadorId !== 'undefined' && typeof a.colaboradorId === 'undefined') {
      a.colaboradorId = a.dadorId;
      delete a.dadorId;
    }
  });
  await tx.table('aportesComun').toCollection().modify((a: any) => {
    if (typeof a.miembroId !== 'undefined' && typeof a.diezmadorId === 'undefined') {
      a.diezmadorId = a.miembroId;
      delete a.miembroId;
    }
  });
  await tx.table('planesColaborador').toCollection().modify((p: any) => {
    if (typeof p.colaboradorId !== 'undefined' && typeof p.diezmadorId === 'undefined') {
      p.diezmadorId = p.colaboradorId;
      delete p.colaboradorId;
    }
  });

  // 2. Intercambio de datos local definitivo
  const tempDadores = await tx.table('dadores').toArray();
  const tempColabs = await tx.table('colaboradores').toArray();
  await tx.table('dadores').clear();
  await tx.table('colaboradores').clear();
  if (tempColabs.length) await tx.table('dadores').bulkAdd(tempColabs);
  if (tempDadores.length) await tx.table('colaboradores').bulkAdd(tempDadores);
});

export { database as db };
