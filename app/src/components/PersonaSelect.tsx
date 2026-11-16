import { useEffect, useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/database';
import { PersonaFormModal } from './PersonaFormModal';
import { filtrarPersonas, nombrePersona } from '../lib/personaVista';
import type { Persona } from '../lib/types';

interface PersonaSelectProps {
  /** personaId elegido ('' = ninguno). */
  value: string;
  onChange: (personaId: string) => void;
  className?: string;
  required?: boolean;
  emptyLabel?: string;
  /**
   * Guardia opcional «ya registrada» (2026-11-07): texto corto a
   * mostrar junto al nombre de algunas personas (personaId → texto,
   * p. ej. «ya en Misión» para quien ya tiene conversión). Quien no
   * pasa el mapa no marca a nadie y su selector queda como siempre.
   */
  avisos?: Map<string, string>;
}

/**
 * Ficha única: selector de personas SOLO entre las ya registradas, con
 * la puerta del registro inicial al lado.
 *
 * Modelo final (regla de LemGil, 2026-11-04 — «el ideal: un solo
 * formulario, puerta en cada formulario de proceso»): un solo
 * formulario escribe los datos de las personas nuevas —
 * PersonaFormModal («➕ Nueva persona») — porque quien no existe en la
 * base no se puede seleccionar: hay que teclear sus datos por primera
 * vez. Ese formulario tiene varias puertas: la oficina del registro es
 * la página Personas, y cada formulario de proceso abre la suya con el
 * botón «➕ Nueva persona» junto a este selector; al guardar, la persona
 * recién registrada queda SELECCIONADA aquí y se sigue donde se estaba,
 * sin pantallas intermedias. La LISTA sigue conteniendo solo
 * registradas: crear no es seleccionar, por eso la opción de crear no
 * vive dentro de la lista sino en su propio botón.
 *
 * Implementación (2026-11-16): la lista es PROPIA (un buscador con
 * resultados), no el `<select>` nativo. El nativo, dentro de los
 * modales, se abría y se cerraba solo en el teléfono de LemGil (la
 * ventana del sistema se cae con los contenedores del modal) y además
 * no dejaba buscar: con el registro creciendo, encontrar un nombre en
 * la lista nativa era desplazarse a ciegas. Esta lista se abre al
 * tocar el campo, filtra al teclear (nombre, teléfono o carné, con
 * `filtrarPersonas`) y se cierra solo al elegir, con Escape o al
 * tocar FUERA del componente — el toque que la abre nace dentro, así
 * que nunca se cierra a sí misma.
 */
export function PersonaSelect({ value, onChange, className, required, emptyLabel = 'Seleccionar persona…', avisos }: PersonaSelectProps) {
  const personas = useLiveQuery(() => db.personas.toArray(), []) ?? [];
  const ordenadas = useMemo(
    () => [...personas].sort((a, b) => `${a.apellido} ${a.nombre}`.localeCompare(`${b.apellido} ${b.nombre}`)),
    [personas],
  );
  const [creando, setCreando] = useState(false);
  const [abierto, setAbierto] = useState(false);
  // Texto del buscador mientras se edita; null = se muestra la elegida.
  const [texto, setTexto] = useState<string | null>(null);
  const cajaRef = useRef<HTMLDivElement>(null);

  const elegida = ordenadas.find((p) => p.id === value);
  const consulta = texto ?? (elegida ? nombrePersona(elegida) : '');
  const visibles = useMemo(() => filtrarPersonas(ordenadas, texto ?? ''), [ordenadas, texto]);

  // Cerrar al tocar fuera — el listener solo vive con la lista abierta
  // y el toque que la abre cae DENTRO de la caja: jamás se auto-cierra.
  useEffect(() => {
    if (!abierto) return;
    const alTocarFuera = (e: MouseEvent | TouchEvent) => {
      if (cajaRef.current && !cajaRef.current.contains(e.target as Node)) {
        setAbierto(false);
        setTexto(null);
      }
    };
    document.addEventListener('mousedown', alTocarFuera);
    document.addEventListener('touchstart', alTocarFuera);
    return () => {
      document.removeEventListener('mousedown', alTocarFuera);
      document.removeEventListener('touchstart', alTocarFuera);
    };
  }, [abierto]);

  const elegir = (p: Persona) => {
    onChange(p.id);
    setAbierto(false);
    setTexto(null);
  };

  return (
    <>
      <div style={{ display: 'flex', gap: 8 }}>
        <div ref={cajaRef} style={{ flex: 1, minWidth: 0, position: 'relative' }}>
          <input
            className={className || 'form-input'}
            style={{ width: '100%' }}
            value={consulta}
            required={required}
            placeholder={emptyLabel}
            autoComplete="off"
            onClick={() => setAbierto(true)}
            onFocus={() => setAbierto(true)}
            onChange={(e) => { setTexto(e.target.value); setAbierto(true); }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') { setAbierto(false); setTexto(null); }
              if (e.key === 'Enter' && abierto && visibles.length > 0) {
                e.preventDefault();
                elegir(visibles[0]);
              }
            }}
          />
          {abierto && (
            <div className="persona-picker-list" role="listbox">
              {visibles.length === 0 && (
                <div className="persona-picker-vacio">Sin coincidencias — regístrala con «➕ Nueva persona»</div>
              )}
              {visibles.map((p) => (
                <button
                  type="button"
                  key={p.id}
                  role="option"
                  aria-selected={p.id === value}
                  className={`persona-picker-item ${p.id === value ? 'elegida' : ''}`}
                  onClick={() => elegir(p)}
                >
                  <span className="persona-picker-nombre">{p.nombre} {p.apellido}</span>
                  <span className="persona-picker-meta">
                    {p.telefono || 'Sin teléfono'}{avisos?.get(p.id) ? ` · ${avisos.get(p.id)}` : ''}
                  </span>
                </button>
              ))}
              {value && !elegida && (
                <div className="persona-picker-vacio">📌 Persona existente (ya no aparece en la lista)</div>
              )}
            </div>
          )}
        </div>
        <button type="button" className="btn btn-secondary btn-sm" style={{ flexShrink: 0 }} onClick={() => setCreando(true)}>
          ➕ Nueva persona
        </button>
      </div>

      {/* REGISTRO INICIAL desde el proceso: el mismo PersonaFormModal
          de siempre (el único que teclea datos de personas nuevas),
          montado solo al abrirlo — Modal pinta sus hijos aunque esté
          cerrado. Al guardar, onSaved trae el id y la persona queda
          seleccionada en el formulario de proceso. */}
      {creando && (
        <PersonaFormModal
          open
          onClose={() => setCreando(false)}
          onSaved={(id) => { onChange(id); setCreando(false); }}
        />
      )}
    </>
  );
}
