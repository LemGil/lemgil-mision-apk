import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { db } from "./database";
import { parseCSV, mapRowsToRecords, importRecords, type ImportConfig } from "./csvImport";
// Importar personas.ts REGISTRA los tres ganchos de conversiones en
// csvImport (ajuste previo, resolvedor de dedupe y post-importación),
// igual que en la app real, donde las páginas lo cargan.
import "./personas";
import { conversionConDatos, mapaPersonas } from "./personaDatos";
import { PASOS_MISION_DEFECTO, PS_DISCIPULADO, PS_NUEVO, etiquetaDe } from "./pasosMision";
import type { Conversion, Persona } from "./types";

// ════════════════════════════════════════════════════════════════════
// Bordes de la Fase 2 · F1 + F2 — la importación CSV de conversiones:
// nace con historial, su estado se canonicaliza contra el catálogo,
// la deduplicación compara contra la vista resuelta y cada importada
// asegura su persona. El camino probado es EXACTAMENTE el de la
// página: parseCSV → mapRowsToRecords (con el mapeo y los defaults
// del CsvImportButton de Misión) → importRecords.
// ════════════════════════════════════════════════════════════════════

const CONFIG: ImportConfig = {
  table: "conversiones",
  fieldMapping: {
    'Nombre': 'nombre',
    'Apellido': 'apellido',
    'Teléfono': 'telefono',
    'Telefono': 'telefono',
    'Edad': 'edad',
    'Zona': 'zona',
    'Líder': 'lider',
    'Mayor': 'lider',
    'Fecha': 'fecha',
    'Estado': 'estado',
    'Notas': 'notas',
    'Email': 'email',
    'Profesión': 'profesion',
    'Bautizado': 'bautizado',
    'Fecha Bautismo': 'fechaBautismo',
    'Cónyuge': 'conyuge',
    'Hijos': 'hijos',
  },
  requiredFields: ['nombre', 'apellido', 'fecha'],
  defaults: {
    estado: PS_NUEVO,
    fecha: () => new Date().toISOString().split('T')[0],
    historial: () => [],
  },
};

async function importarCSV(texto: string) {
  const { headers, rows } = parseCSV(texto);
  const { records, errors } = mapRowsToRecords(headers, rows, CONFIG);
  expect(errors).toEqual([]);
  return importRecords(records, "conversiones");
}

const datosPersona = (over: Partial<Persona> = {}): Omit<Persona, "id" | "creado" | "version"> => ({
  nombre: "Rosa", apellido: "Díaz", numeroIdentidad: "", telefono: "5552222",
  email: "", direccion: "", zona: "Este", fechaNacimiento: "", profesion: "",
  estadoCivil: "Soltero", contactoPreferido: "WhatsApp", bautizado: false,
  fechaBautismo: "", conyuge: "", hijos: "", grupoId: null, hermanoMayorId: null,
  ...over,
});

describe("Importación de conversiones (F1 + F2)", () => {
  beforeAll(async () => { await db.open(); });
  beforeEach(async () => {
    await db.conversiones.clear();
    await db.personas.clear();
    await db.pasosSeguimiento.clear();
  });

  it("F1+F2 · la importada nace con historial [], su estado se canonicaliza y asegura su persona", async () => {
    const res = await importarCSV(
      "Nombre,Apellido,Telefono,Zona,Fecha,Estado\n" +
      "Luis,Pérez,5557777,Oeste,2024-05-01,Discipulado",
    );
    expect(res.imported).toBe(1);
    expect(res.duplicates).toBe(0);
    expect(res.avisos).toEqual([]);

    const guardadas = await db.conversiones.toArray();
    expect(guardadas).toHaveLength(1);
    const c = guardadas[0];
    // F1: el historial EXISTE (sin él, el detalle y el avance reventaban).
    expect(Array.isArray(c.historial)).toBe(true);
    expect(c.historial).toEqual([]);
    // F2.1: la etiqueta del CSV quedó canonicalizada a la identidad.
    expect(c.estado).toBe(PS_DISCIPULADO);
    // F2.3: nació enlazada a su persona, con los datos de la fila.
    expect(c.personaId).toBe(c.id);
    const persona = await db.personas.get(c.id);
    expect(persona).toBeTruthy();
    expect(persona!.nombre).toBe("Luis");
    expect(persona!.apellido).toBe("Pérez");
    expect(persona!.telefono).toBe("5557777");
    expect(persona!.zona).toBe("Oeste");
  });

  it("F2 · reimportar el export de la propia página da 0 altas nuevas (dedupe contra la vista resuelta)", async () => {
    // La realidad post–ficha única: la conversión guarda los personales
    // VACÍOS y la identidad vive en la persona enlazada.
    await db.personas.add({ id: "p-rosa", creado: "2024-01-01T00:00:00.000Z", version: 1, ...datosPersona() });
    const original: Conversion = {
      id: "c-rosa", nombre: "", apellido: "", telefono: "", edad: "", direccion: "",
      zona: "", lider: "", grupoId: "", hermanoMayorId: null, email: "", profesion: "",
      bautizado: false, fechaBautismo: "", conyuge: "", hijos: "", familia: "No",
      fecha: "2024-02-01", estado: PS_DISCIPULADO, personaId: "p-rosa", evangelismoId: null,
      notas: "", historial: [], creado: "2024-02-01T00:00:00.000Z", version: 1,
    };
    await db.conversiones.add(original);

    // El CSV tal como lo escribe el botón «Exportar CSV» de la página:
    // datos RESUELTOS desde la persona y estado como etiqueta viva.
    const vista = conversionConDatos(original, mapaPersonas(await db.personas.toArray()));
    const csv =
      "Nombre,Apellido,Telefono,Edad,Zona,Mayor,Fecha,Estado,Notas\n" +
      [vista.nombre, vista.apellido, vista.telefono, vista.edad, vista.zona, vista.lider ?? "",
       vista.fecha, etiquetaDe(undefined, vista.estado), vista.notas].join(",");

    const res = await importarCSV(csv);
    expect(res.imported).toBe(0);
    expect(res.duplicates).toBe(1);
    expect(await db.conversiones.count()).toBe(1);
    expect(await db.personas.count()).toBe(1);
  });

  it("F2 · tras RENOMBRAR un paso, el export viejo y el nuevo aterrizan en el mismo paso", async () => {
    // Catálogo vivo con ps-discipulado renombrado a «Formación».
    await db.pasosSeguimiento.bulkAdd(
      PASOS_MISION_DEFECTO.map((p) => p.id === PS_DISCIPULADO ? { ...p, nombre: "Formación" } : p),
    );
    const res = await importarCSV(
      "Nombre,Apellido,Telefono,Fecha,Estado\n" +
      "Ana,Ruiz,111,2024-01-10,Discipulado\n" + // export anterior al renombre
      "Eva,Sosa,222,2024-01-11,Formación",       // export posterior al renombre
    );
    expect(res.imported).toBe(2);
    expect(res.avisos).toEqual([]);
    const estados = (await db.conversiones.toArray()).map((c) => c.estado).sort();
    expect(estados).toEqual([PS_DISCIPULADO, PS_DISCIPULADO]);
  });

  it("F2 · un estado no reconocido nace en el inicio y se CUENTA en el resumen (no hay éxito silencioso)", async () => {
    const res = await importarCSV(
      "Nombre,Apellido,Telefono,Fecha,Estado\n" +
      "Leo,Mena,333,2024-01-12,Crecimiento\n" + // paso que ya no existe en el catálogo
      "Ada,Paz,444,2024-01-13,ps-bautizado",     // un id directo también vale
    );
    expect(res.imported).toBe(2);
    expect(res.avisos).toHaveLength(1);
    expect(res.avisos[0]).toContain("1 fila(s) con estado no reconocido");
    expect(res.avisos[0]).toContain("Nuevo"); // la etiqueta viva del paso de inicio

    const porNombre = new Map((await db.conversiones.toArray()).map((c) => [c.nombre, c]));
    expect(porNombre.get("Leo")!.estado).toBe(PS_NUEVO);
    expect(porNombre.get("Ada")!.estado).toBe("ps-bautizado");
  });
});
