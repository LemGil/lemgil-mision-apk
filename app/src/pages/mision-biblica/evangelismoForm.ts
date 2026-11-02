import { nombreDePersona, mapaPersonas } from '../../lib/personaDatos';
import type { EvangelismoCrudo, Persona } from '../../lib/types';

/**
 * P7 — ARREGLO FINAL, Parte B: lógica PURA del formulario de evangelismo
 * (extraída de MisionBiblica para poder probarla sin pintar la página).
 *
 * Desde P7 el evangelismo guarda SOLO vínculos y nombres libres con
 * campo propio: `liderId`/`participanteIds` (personas) y
 * `liderExterno`/`participantesExternos` (nombres sin ficha). Los textos
 * `lider`/`participantes` salieron del tipo: no se escriben jamás.
 */

export interface EquipoResueltoAlEditar {
  liderId: string;
  liderExterno: string;
  participanteIds: string[];
  participantesExternos: string[];
}

/**
 * Al EDITAR, reparte líder y equipo del registro entre ids y externos:
 * - Líder: manda `liderId`; si falta, `liderExterno`; si el registro es
 *   viejo y solo trae el texto dormido, el texto se resuelve contra las
 *   personas (coincidencia exacta de «Nombre Apellido» → ese id: el
 *   registro se sana al guardar) y lo que no coincide queda como
 *   `liderExterno` — el nombre no se pierde ni se fabrica una persona.
 * - Equipo: los `participanteIds` quedan; los `participantesExternos`
 *   quedan; y los nombres del texto dormido viejo se reparten igual
 *   (a ids si coinciden con una persona y aún no están; a externos si
 *   no), saltando los que ya cubre un id o un externo.
 */
export function resolverEquipoAlEditar(e: EvangelismoCrudo, personas: Persona[]): EquipoResueltoAlEditar {
  const porNombre = (nombre: string) =>
    personas.find((p) => `${p.nombre} ${p.apellido}` === nombre)?.id ?? '';

  let liderId = e.liderId ?? '';
  let liderExterno = '';
  if (!liderId) {
    if (e.liderExterno?.trim()) {
      liderExterno = e.liderExterno;
    } else if (e.lider?.trim()) {
      liderId = porNombre(e.lider);
      if (!liderId) liderExterno = e.lider;
    }
  }

  const mapa = mapaPersonas(personas);
  const participanteIds: string[] = [...(e.participanteIds ?? [])];
  const participantesExternos: string[] = [...(e.participantesExternos ?? [])];
  const nombresCubiertos = new Set([
    ...participanteIds.map((pid) => nombreDePersona(mapa, pid)).filter(Boolean),
    ...participantesExternos,
  ]);
  for (const nombre of e.participantes ?? []) {
    if (!nombre.trim() || nombresCubiertos.has(nombre)) continue;
    const pid = porNombre(nombre);
    if (pid) {
      if (!participanteIds.includes(pid)) {
        participanteIds.push(pid);
        nombresCubiertos.add(nombre);
      }
    } else {
      participantesExternos.push(nombre);
      nombresCubiertos.add(nombre);
    }
  }

  return { liderId, liderExterno, participanteIds, participantesExternos };
}

export interface EntradaEvangelismoForm {
  fecha: string;
  tipo: string;
  zona: string;
  liderId: string;
  liderExterno: string;
  participanteIds: string[];
  participantesExternos: string[];
  contactos: number;
  notas: string;
}

/**
 * Lo que `saveEvang` escribe: EXACTAMENTE los campos vivos del tipo
 * `Evangelismo`. Sin `lider` ni `participantes` (salieron del tipo en
 * P7): el líder es el id — o, sin id, el nombre libre en `liderExterno`
 * (si hay id, el externo se limpia: no pueden mandar dos) — y el equipo
 * son los ids más los externos en su propio campo.
 */
export function datosEvangelismoParaGuardar(entrada: EntradaEvangelismoForm) {
  return {
    fecha: entrada.fecha,
    tipo: entrada.tipo,
    zona: entrada.zona,
    liderId: entrada.liderId || null,
    liderExterno: entrada.liderId ? '' : entrada.liderExterno.trim(),
    participanteIds: [...entrada.participanteIds],
    participantesExternos: entrada.participantesExternos.map((n) => n.trim()).filter(Boolean),
    contactos: entrada.contactos,
    notas: entrada.notas.trim(),
  };
}
