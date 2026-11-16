import { v4 as uuid } from 'uuid';
import type { Beneficiario, Conversion, Miembro, PasoSeguimiento } from './types';
import { PS_INTEGRADO, PS_NUEVO, pasoGozne, pasoInicio } from './pasosMision';

/**
 * Altas directas desde el registro inicial (2026-11-15): el formulario
 * de nueva persona de Personas — el ÚNICO que teclea los datos — puede
 * sembrar en el mismo acto los procesos que LemGil marque:
 * - «Congregado»: nace su registro en Misión, en el paso de inicio
 *   (Congregado) o ya en Converso si aceptó la fe al registrarse
 *   (el registro llega tras la 3ª visita; las visitas no se cuentan
 *   en la app).
 * - «Integrado»: nace su miembro en Miembros (Activo, ingreso hoy).
 *   Si también va Congregado, el registro de Misión nace YA en el
 *   gozne y el miembro nace enlazado a él — el camino real, no dos
 *   piezas sueltas (el enlace lo hace syncMemberFromConversion).
 * - «Beneficiario»: nace en la lista de Manos Abiertas (tipo Persona,
 *   Activo), con los mismos valores que usa el alta de esa página.
 *
 * Los constructores son PUROS y replican campo a campo las formas que
 * ya producen las altas de cada módulo (Misión: la rama de alta de
 * saveConv; Miembros: el miembro de syncMember; Manos Abiertas: su
 * alta de beneficiario tipo Persona): el proceso nace SIN datos
 * personales — viven una sola vez en la persona enlazada.
 */

export interface OpcionesAltaDirecta {
  /** Crear el registro en Misión. */
  mision: boolean;
  /** Cómo entra a Misión: 'congregado' (asiste) o 'converso' (ya aceptó la fe). */
  entrada: 'congregado' | 'converso';
  /** Crear el miembro en Miembros. */
  integrado: boolean;
  /** Crear el beneficiario en Manos Abiertas. */
  beneficiario: boolean;
}

/** Los procesos que la persona YA tiene (al editar su ficha). */
export interface ProcesosExistentes {
  mision: boolean;
  miembro: boolean;
  beneficiario: boolean;
}

/**
 * Las altas que SÍ se aplican al guardar: las marcadas MENOS las que la
 * persona ya tiene — editar la ficha ofrece las mismas casillas que el
 * alta (pedido de LemGil, 2026-11-16), pero ningún proceso se duplica.
 * En el alta nueva no hay procesos previos y las opciones pasan enteras.
 */
export function opcionesEfectivas(opciones: OpcionesAltaDirecta, existentes: ProcesosExistentes): OpcionesAltaDirecta {
  return {
    mision: opciones.mision && !existentes.mision,
    entrada: opciones.entrada,
    integrado: opciones.integrado && !existentes.miembro,
    beneficiario: opciones.beneficiario && !existentes.beneficiario,
  };
}

/** El estado con el que nace el registro de Misión según las opciones. */
export function estadoDeAlta(opciones: OpcionesAltaDirecta, pasos?: PasoSeguimiento[]): string {
  if (opciones.integrado) return pasoGozne(pasos)?.id ?? PS_INTEGRADO;
  if (opciones.entrada === 'converso') return PS_NUEVO;
  return pasoInicio(pasos).id;
}

/**
 * El registro de Misión del alta directa; null si no se pidió Misión
 * (Integrado a solas nace como miembro manual, SIN registro de Misión:
 * inventarle una conversión de hoy falsearía las cifras). El
 * historial replica la regla del alta de Misión: nacer en el inicio
 * no deja entrada (la fecha del registro manda); nacer más adelante
 * deja su «Registro inicial».
 */
export function conversionDeAlta(
  personaId: string,
  opciones: OpcionesAltaDirecta,
  pasos: PasoSeguimiento[] | undefined,
  hoy: string,
): Conversion | null {
  if (!opciones.mision) return null;
  const estado = estadoDeAlta(opciones, pasos);
  const inicio = pasoInicio(pasos).id;
  const now = new Date().toISOString();
  const conversion: Conversion = {
    id: uuid(),
    nombre: '', apellido: '', telefono: '', edad: '', direccion: '', zona: '',
    grupoId: '', hermanoMayorId: null, email: '', profesion: '', bautizado: false,
    fechaBautismo: '', conyuge: '', hijos: '', numeroIdentidad: undefined,
    fecha: hoy, familia: 'No', estado, notas: '', personaId, evangelismoId: null,
    historial: estado !== inicio ? [{ fecha: hoy, estado, nota: 'Registro inicial' }] : [],
    creado: now, version: 1,
  };
  return conversion;
}

/**
 * El miembro del alta directa SIN registro de Misión (el alta manual
 * de Miembros): misma forma que el miembro de syncMember, con
 * conversionId null y el ingreso hoy.
 */
export function miembroDeAlta(personaId: string, hoy: string): Miembro {
  const now = new Date().toISOString();
  const miembro: Miembro = {
    id: uuid(),
    nombre: '', apellido: '', telefono: '', email: '', direccion: '', zona: '',
    grupoId: null, fechaNacimiento: '', fechaIngreso: hoy, estado: 'Activo',
    contactoPreferido: 'WhatsApp', profesion: '', estadoCivil: 'Soltero',
    bautizado: false, fechaBautismo: '', conyuge: '', hijos: '',
    hermanoMayorId: null, conversionId: null, personaId, notas: '',
    creado: now, actualizado: now, version: 1,
  };
  return miembro;
}

/** El beneficiario del alta directa: tipo Persona, Activo, familia 1. */
export function beneficiarioDeAlta(personaId: string): Beneficiario {
  const beneficiario: Beneficiario = {
    id: uuid(),
    nombre: '', apellido: '', telefono: '', direccion: '', zona: '',
    representativeName: '', tipo: 'Persona', familia: 1, estado: 'Activo',
    notas: '', personaId, creado: new Date().toISOString(), version: 1,
  };
  return beneficiario;
}
