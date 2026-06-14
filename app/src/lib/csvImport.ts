import { v4 as uuid } from 'uuid';
import { db } from './database';

export type FieldMapping = Record<string, string>;

export type ImportConfig<T = any> = {
  table: string;
  fieldMapping: FieldMapping;
  requiredFields: string[];
  defaults: Record<string, any>;
  validate?: (record: T, row: number) => string | null;
};

export type ImportResult = {
  total: number;
  imported: number;
  skipped: number;
  errors: { row: number; message: string }[];
  preview: Record<string, string>[];
};

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        result.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
  }
  result.push(current.trim());
  return result;
}

export function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = parseCSVLine(lines[0]);
  const rows = lines.slice(1).map(l => parseCSVLine(l));
  return { headers, rows };
}

export function mapRowsToRecords<T extends Record<string, any>>(
  headers: string[],
  rows: string[][],
  config: ImportConfig<T>,
): { records: T[]; errors: { row: number; message: string }[]; preview: Record<string, string>[] } {
  const records: T[] = [];
  const errors: { row: number; message: string }[] = [];
  const preview: Record<string, string>[] = [];

  const headerToField: Record<number, string> = {};
  headers.forEach((h, i) => {
    const field = config.fieldMapping[h];
    if (field) headerToField[i] = field;
  });

  const usedIds = new Set<string>();

  rows.forEach((row, idx) => {
    const rowNum = idx + 2;
    const record: Record<string, any> = {};

    for (const [colIdx, field] of Object.entries(headerToField)) {
      const val = row[parseInt(colIdx)] ?? '';
      record[field] = val;
    }

    for (const [field, val] of Object.entries(config.defaults)) {
      if (record[field] === undefined || record[field] === '') {
        record[field] = typeof val === 'function' ? val() : val;
      }
    }

    for (const req of config.requiredFields) {
      if (!record[req] || String(record[req]).trim() === '') {
        errors.push({ row: rowNum, message: `Falta campo obligatorio: ${req}` });
        return;
      }
    }

    const numFields: Record<string, boolean> = {};
    for (const [field, val] of Object.entries(record)) {
      if (typeof val === 'number' || (typeof val === 'string' && /^\d+(\.\d+)?$/.test(val) && field !== 'telefono' && field !== 'id')) {
        numFields[field] = true;
      }
    }
    for (const field of Object.keys(numFields)) {
      if (typeof record[field] === 'string' && record[field] !== '') {
        const n = parseFloat(record[field]);
        if (!isNaN(n)) record[field] = n;
      }
    }

    if (typeof record['planDiezmo'] === 'string') {
      record['planDiezmo'] = parseFloat(record['planDiezmo']) || 0;
    }
    if (typeof record['familia'] === 'string') {
      record['familia'] = parseInt(record['familia']) || 1;
    }
    if (typeof record['capacidad'] === 'string') {
      record['capacidad'] = record['capacidad'];
    }
    if (typeof record['miembros'] === 'string') {
      record['miembros'] = parseInt(record['miembros']) || 0;
    }
    if (typeof record['contactos'] === 'string') {
      record['contactos'] = parseInt(record['contactos']) || 0;
    }
    if (typeof record['conversiones'] === 'string') {
      record['conversiones'] = parseInt(record['conversiones']) || 0;
    }
    if (typeof record['alcance'] === 'string') {
      record['alcance'] = parseInt(record['alcance']) || 0;
    }
    if (typeof record['engagement'] === 'string') {
      record['engagement'] = parseInt(record['engagement']) || 0;
    }
    if (typeof record['metaFamilias'] === 'string') {
      record['metaFamilias'] = parseInt(record['metaFamilias']) || 0;
    }
    if (typeof record['monto'] === 'string') {
      record['monto'] = parseFloat(record['monto']) || 0;
    }
    if (typeof record['montoMensual'] === 'string') {
      record['montoMensual'] = parseFloat(record['montoMensual']) || 0;
    }
    if (typeof record['ingresosMensuales'] === 'string') {
      record['ingresosMensuales'] = parseFloat(record['ingresosMensuales']) || 0;
    }
    if (typeof record['numero'] === 'string') {
      record['numero'] = parseInt(record['numero']) || 0;
    }
    if (typeof record['duracion'] === 'string' && !isNaN(parseInt(record['duracion']))) {
      record['duracion'] = parseInt(record['duracion']);
    }
    if (typeof record['bautizado'] === 'string') {
      const v = record['bautizado'].toLowerCase();
      record['bautizado'] = v === 'true' || v === 'sí' || v === 'si' || v === '1' || v === 'x';
    }
    if (typeof record['activo'] === 'string') {
      const v = record['activo'].toLowerCase();
      record['activo'] = v === 'true' || v === 'sí' || v === 'si' || v === '1';
    }

    if (config.validate) {
      const err = config.validate(record as T, rowNum);
      if (err) {
        errors.push({ row: rowNum, message: err });
        return;
      }
    }

    let id = uuid();
    while (usedIds.has(id)) id = uuid();
    usedIds.add(id);
    record.id = id;

    if (!record.creado) record.creado = new Date().toISOString();

    const previewRow: Record<string, string> = {};
    for (const [colIdx, field] of Object.entries(headerToField)) {
      const origHeader = headers[parseInt(colIdx)];
      previewRow[origHeader] = record[field] !== undefined ? String(record[field]) : '';
    }
    preview.push(previewRow);

    records.push(record as T);
  });

  return { records, errors, preview };
}

const TABLE_DB_MAP: Record<string, any> = {
  conversiones: () => db.conversiones,
  grupos: () => db.grupos,
  evangelismos: () => db.evangelismos,
  cursos: () => db.cursos,
  lecciones: () => db.lecciones,
  estudiantes: () => db.estudiantes,
  certificados: () => db.certificados,
  dadores: () => db.dadores,
  aportes: () => db.aportes,
  beneficiarios: () => db.beneficiarios,
  campanas: () => db.campanas,
  entregas: () => db.entregas,
  negocios: () => db.negocios,
  publicaciones: () => db.publicaciones,
  reportes: () => db.reportes,
  miembrosComun: () => db.miembrosComun,
  aportesComun: () => db.aportesComun,
  miembros: () => db.miembros,
  ministerios: () => db.ministerios,
  hitos: () => db.hitos,
  zonas: () => db.zonas,
  colaboradores: () => db.colaboradores,
};

export async function importRecords<T extends Record<string, any>>(
  records: T[],
  table: string,
): Promise<number> {
  const getTable = TABLE_DB_MAP[table];
  if (!getTable) throw new Error(`Tabla desconocida: ${table}`);
  const tbl = getTable();
  await tbl.bulkAdd(records as any[]);
  return records.length;
}
