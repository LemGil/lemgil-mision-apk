import { db } from '../database';
import { enqueueSync, SYNC_TABLES } from './api';
import { markDeleted } from './queue';

export function setupHooks() {
  const tableMap = {
    conversiones: db.conversiones, grupos: db.grupos, evangelismos: db.evangelismos,
    cursos: db.cursos, lecciones: db.lecciones, estudiantes: db.estudiantes,
    certificados: db.certificados, dadores: db.dadores, aportes: db.aportes,
    beneficiarios: db.beneficiarios, campanas: db.campanas, entregas: db.entregas,
    metas: db.metas, negocios: db.negocios, publicaciones: db.publicaciones,
    reportes: db.reportes, miembrosComun: db.miembrosComun, aportesComun: db.aportesComun,
    miembros: db.miembros, ministerios: db.ministerios, miembrosMinisterios: db.miembrosMinisterios,
    hitos: db.hitos, zonas: db.zonas, colaboradores: db.colaboradores,
    tiposPlanes: db.tiposPlanes, planesColaborador: db.planesColaborador
  } as const;

  for (const table of SYNC_TABLES) {
    const dbTable = (tableMap as any)[table];
    if (!dbTable) continue;

    dbTable.hook('creating', (_primKey: any, obj: any) => {
      enqueueSync(table, 'create', obj);
    });
    dbTable.hook('updating', (modifications: any, _primKey: any) => {
      enqueueSync(table, 'update', { id: _primKey, changes: modifications });
    });
    dbTable.hook('deleting', (_primKey: any) => {
      markDeleted(_primKey);
      enqueueSync(table, 'delete', _primKey);
    });
  }
}
