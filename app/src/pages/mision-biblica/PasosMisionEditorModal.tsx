import { useState } from 'react';
import { v4 as uuid } from 'uuid';
import { Modal } from '../../components/Modal';
import { db } from '../../lib/database';
import { createBaseRecord } from '../../lib/utils/recordHelpers';
import { showToast } from '../../lib/notification';
import { contarUsoPaso, pasosDeMision, rutaDe, salidasDe } from '../../lib/pasosMision';
import type { PasoSeguimiento } from '../../lib/types';

interface PasosMisionEditorModalProps {
  open: boolean;
  onClose: () => void;
  /** El catálogo completo; aquí se gestiona solo el ámbito 'mision'. */
  pasos: PasoSeguimiento[];
}

const ROL_LABEL: Record<string, string> = {
  inicio: 'Inicio del camino',
  camino: 'Paso intermedio',
  gozne: 'Gozne · Al llegar aquí nace el miembro',
  salida: 'Salida del camino',
};

/**
 * Editor del catálogo de pasos de Misión (Fase 2): el espejo del editor
 * de pasos del miembro (Fase 1), con las reglas del camino:
 * - La identidad de cada paso es fija: se edita la etiqueta (nombre y
 *   emoji) y el orden de la RUTA; las fichas guardan la identidad, así
 *   que renombrar no rompe nada.
 * - Agregar = un paso intermedio nuevo (rol camino), insertado antes
 *   del gozne. Borrar un paso intermedio SOLO si ninguna conversión lo
 *   usa (se cuenta y se bloquea: nadie queda en el aire).
 * - Las SALIDAS también se pueden crear («➕ Nueva salida»): nacen sin
 *   proteger y se comportan con el reflejo genérico (sacan a la
 *   persona del proceso, su miembro pasa a Inactivo y Personas las
 *   muestra con su nombre). Una salida creada se borra con la misma
 *   guarda de uso que un paso intermedio.
 * - Protegidos (inicio, gozne y las salidas de la casa): sin borrar y
 *   sin mover; el inicio abre el camino, el gozne lo cierra y crea al
 *   miembro, y las salidas viven aparte, fijas al final.
 * Los cambios se guardan al momento y viajan por la cola de sync.
 */
export function PasosMisionEditorModal({ open, onClose, pasos }: PasosMisionEditorModalProps) {
  const todos = pasosDeMision(pasos);
  const ruta = rutaDe(pasos);
  const salidas = salidasDe(pasos);
  const [borradores, setBorradores] = useState<Record<string, { nombre: string; emoji: string }>>({});
  const borradorDe = (p: PasoSeguimiento) => borradores[p.id] ?? { nombre: p.nombre, emoji: p.emoji };

  const guardarEtiqueta = async (p: PasoSeguimiento) => {
    const b = borradorDe(p);
    const nombre = b.nombre.trim();
    const emoji = b.emoji.trim();
    if (!nombre) { showToast('El nombre del paso no puede quedar vacío'); return; }
    if (nombre === p.nombre && emoji === (p.emoji || '')) return;
    await db.pasosSeguimiento.update(p.id, { nombre, emoji });
    showToast(`Paso «${nombre}» actualizado`);
  };

  /** Reescribe `orden` como 1..N sobre la lista dada (solo toca las filas que cambian). */
  const persistirOrden = async (lista: PasoSeguimiento[]) => {
    for (let i = 0; i < lista.length; i++) {
      if (lista[i].orden !== i + 1) await db.pasosSeguimiento.update(lista[i].id, { orden: i + 1 });
    }
  };

  const mover = async (p: PasoSeguimiento, dir: -1 | 1) => {
    const idx = ruta.findIndex((x) => x.id === p.id);
    const otro = ruta[idx + dir];
    if (!otro) return;
    if (p.protegido || otro.protegido) {
      showToast('Los pasos protegidos no se mueven: el inicio abre el camino y el gozne lo cierra');
      return;
    }
    const nuevaRuta = [...ruta];
    [nuevaRuta[idx], nuevaRuta[idx + dir]] = [nuevaRuta[idx + dir], nuevaRuta[idx]];
    await persistirOrden([...nuevaRuta, ...salidas]);
  };

  const agregar = async () => {
    const gozne = ruta.find((x) => x.rol === 'gozne');
    const nuevo = createBaseRecord({
      id: uuid(), ambito: 'mision' as const, nombre: 'Nuevo paso', emoji: '📌',
      orden: 0, fuente: 'manual' as PasoSeguimiento['fuente'], rol: 'camino' as PasoSeguimiento['rol'],
    });
    await db.pasosSeguimiento.add(nuevo);
    const sinGozne = ruta.filter((x) => x.rol !== 'gozne');
    await persistirOrden([...sinGozne, nuevo, ...(gozne ? [gozne] : []), ...salidas]);
    showToast('Paso agregado al camino: edita su nombre en la lista');
  };

  const agregarSalida = async () => {
    const nuevo = createBaseRecord({
      id: uuid(), ambito: 'mision' as const, nombre: 'Nueva salida', emoji: '🚪',
      orden: 0, fuente: 'manual' as PasoSeguimiento['fuente'], rol: 'salida' as PasoSeguimiento['rol'],
    });
    await db.pasosSeguimiento.add(nuevo);
    await persistirOrden([...todos, nuevo]);
    showToast('Salida agregada: edita su nombre en la lista');
  };

  const borrar = async (p: PasoSeguimiento) => {
    if (p.protegido || (p.rol !== 'camino' && p.rol !== 'salida')) return;
    // El uso se cuenta por IDENTIDAD canónica: una ficha que aún guarda
    // la etiqueta legada de un paso cuenta como uso suyo igual.
    const convs = await db.conversiones.toArray();
    const enUso = contarUsoPaso(convs.map((c) => c.estado), p.id);
    const esSalidaPaso = p.rol === 'salida';
    if (enUso > 0) {
      showToast(`No se puede eliminar «${p.nombre}»: ${enUso} conversión(es) están en ${esSalidaPaso ? 'esa salida' : 'ese paso'}. Muévelas primero a otro ${esSalidaPaso ? 'estado' : 'paso'}.`);
      return;
    }
    const pregunta = esSalidaPaso
      ? `¿Eliminar la salida «${p.nombre}»? Ninguna conversión la está usando.`
      : `¿Eliminar el paso «${p.nombre}» del camino? Ninguna conversión lo está usando.`;
    if (!window.confirm(pregunta)) return;
    await db.pasosSeguimiento.delete(p.id);
    await persistirOrden(todos.filter((x) => x.id !== p.id));
    showToast(`${esSalidaPaso ? 'Salida' : 'Paso'} «${p.nombre}» ${esSalidaPaso ? 'eliminada' : 'eliminado'}`);
  };

  const fila = (p: PasoSeguimiento, i: number, enRuta: boolean) => {
    const b = borradorDe(p);
    return (
      <div key={p.id} style={{ padding: 10, background: 'var(--surface-2)', borderRadius: 8, border: p.protegido ? '1px solid var(--gold)' : '1px solid var(--border)' }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            className="form-input" style={{ width: 52, textAlign: 'center', fontSize: 16 }} aria-label="Emoji del paso"
            value={b.emoji}
            onChange={(e) => setBorradores((d) => ({ ...d, [p.id]: { ...borradorDe(p), emoji: e.target.value } }))}
            onBlur={() => void guardarEtiqueta(p)}
          />
          <input
            className="form-input" style={{ flex: 1, minWidth: 140 }} aria-label="Nombre del paso"
            value={b.nombre}
            onChange={(e) => setBorradores((d) => ({ ...d, [p.id]: { ...borradorDe(p), nombre: e.target.value } }))}
            onBlur={() => void guardarEtiqueta(p)}
            onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
          />
          {enRuta && (
            <>
              <button type="button" className="btn btn-secondary btn-sm" disabled={i === 0} onClick={() => void mover(p, -1)} title="Subir">⬆</button>
              <button type="button" className="btn btn-secondary btn-sm" disabled={i === ruta.length - 1} onClick={() => void mover(p, 1)} title="Bajar">⬇</button>
            </>
          )}
          {(p.rol === 'camino' || p.rol === 'salida') && !p.protegido && (
            <button type="button" className="btn btn-danger btn-sm" onClick={() => void borrar(p)} title={p.rol === 'salida' ? 'Eliminar salida' : 'Eliminar paso'}>🗑</button>
          )}
        </div>
        <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 6 }}>
          {ROL_LABEL[p.rol ?? 'camino']}
          {p.protegido && <span style={{ color: 'var(--oro-sombra)' }}> · 🔒 Protegido: puedes renombrarlo, pero no borrarlo ni moverlo.</span>}
        </div>
      </div>
    );
  };

  return (
    <Modal open={open} onClose={onClose} title="⚙️ Pasos de Misión" wide>
      <div style={{ fontSize: 13, color: 'var(--dim)', marginBottom: 14 }}>
        El camino que recorre una conversión hasta integrarse. Cada paso tiene una
        <strong> identidad fija</strong>: puedes renombrarlo, cambiar su emoji, reordenar los
        pasos intermedios o agregar nuevos, y las fichas, los conteos y el historial no se
        rompen — las conversiones guardan la identidad del paso, no su nombre. Un paso
        intermedio solo se puede eliminar si ninguna conversión está en él.
      </div>

      <div className="form-section">🛤️ El camino</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {ruta.map((p, i) => fila(p, i, true))}
        {ruta.length === 0 && (
          <div style={{ color: 'var(--dim)', fontSize: 13, padding: 12, textAlign: 'center', background: 'var(--surface-2)', borderRadius: 8 }}>
            El camino aún no tiene pasos.
          </div>
        )}
      </div>

      <div className="form-section" style={{ marginTop: 18 }}>🚪 Salidas</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {salidas.map((p, i) => fila(p, i, false))}
      </div>
      <div style={{ fontSize: 12, color: 'var(--dim)', marginTop: 10 }}>
        Las salidas de la casa (Apartado, Trasladado, Fallecido) son fijas. Puedes crear
        otras salidas para las formas de salir que tu iglesia conozca: quien entra en una
        sale del proceso, su miembro pasa a Inactivo y en Personas se muestra con el
        nombre de la salida. Una salida creada solo se puede eliminar si ninguna
        conversión está en ella.
      </div>
      <div style={{ marginTop: 10 }}>
        <button type="button" className="btn btn-secondary" onClick={() => void agregarSalida()}>➕ Nueva salida</button>
      </div>

      <div className="modal-footer">
        <button className="btn btn-gold" onClick={() => void agregar()}>➕ Agregar paso al camino</button>
        <button className="btn btn-secondary" onClick={onClose}>Cerrar</button>
      </div>
    </Modal>
  );
}
