import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Layout } from '../components/Layout';
import { EmptyState } from '../components/EmptyState';
import { db } from '../lib/database';
import { unirPersonas, vincularProceso } from '../lib/personas';
import type { FichasDePersona } from '../lib/personas';
import { agruparProcesos, filtrarPersonas, nombrePersona, posiblesDuplicados, procesosHuerfanos, situacionPersona, tiposPresentes, PROCESO_ETIQUETA, PROCESO_ICONO, SITUACION_BADGE } from '../lib/personaVista';
import type { ProcesoHuerfano } from '../lib/personaVista';
import { showToast } from '../lib/notification';
import type { Persona } from '../lib/types';
import { PersonaDetailModal } from './personas/PersonaDetailModal';
import { PersonaFormModal } from '../components/PersonaFormModal';
import { procesosVacios } from '../lib/personaVista';

/**
 * FICHA ÚNICA — ruta /personas: la casa de la persona en la app.
 * Lista de personas con buscador, su ficha completa con una tarjeta por
 * proceso, y las dos herramientas de enlace tardío de §5.5: «Vincular
 * proceso» (abajo, sobre los huérfanos) y «Unir personas» (en la ficha).
 *
 * Regla de LemGil (2026-11-04): SOLO un formulario escribe los datos de
 * las personas nuevas — PersonaFormModal — y su puerta es ESTA página
 * («➕ Nueva persona» en el encabezado): quien no existe en la base no
 * se puede seleccionar, hay que teclear sus datos por primera vez. Los
 * formularios de proceso solo seleccionan personas ya registradas
 * (PersonaSelect ya no crea a nadie). El núcleo además se edita desde
 * la propia ficha; lo de cada proceso se gestiona en su módulo.
 * La Red de Colaboradores no aparece: no es proceso de la persona.
 */
export default function Personas() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creando, setCreando] = useState(false);

  const personas = useLiveQuery(() => db.personas.toArray()) ?? [];
  const conversiones = useLiveQuery(() => db.conversiones.toArray()) ?? [];
  const miembros = useLiveQuery(() => db.miembros.toArray()) ?? [];
  const estudiantes = useLiveQuery(() => db.estudiantes.toArray()) ?? [];
  const dadores = useLiveQuery(() => db.dadores.toArray()) ?? [];
  const beneficiarios = useLiveQuery(() => db.beneficiarios.toArray()) ?? [];
  const grupos = useLiveQuery(() => db.grupos.toArray()) ?? [];
  const cursos = useLiveQuery(() => db.cursos.toArray()) ?? [];
  const pasosSeguimiento = useLiveQuery(() => db.pasosSeguimiento.toArray()) ?? [];

  const data = useMemo<FichasDePersona>(
    () => ({ miembros, conversiones, estudiantes, dadores, beneficiarios }),
    [miembros, conversiones, estudiantes, dadores, beneficiarios],
  );
  const agrupados = useMemo(() => agruparProcesos(data), [data]);
  const idsPersonas = useMemo(() => new Set(personas.map((p) => p.id)), [personas]);
  const cursoNombre = useMemo(() => {
    const porId = new Map(cursos.map((c) => [c.id, c.nombre]));
    return (cursoId: string) => porId.get(cursoId);
  }, [cursos]);
  const huerfanos = useMemo(() => procesosHuerfanos(data, idsPersonas, cursoNombre), [data, idsPersonas, cursoNombre]);
  const duplicados = useMemo(() => posiblesDuplicados(personas), [personas]);
  const filtradas = useMemo(
    () => [...filtrarPersonas(personas, search)].sort((a, b) =>
      `${a.apellido} ${a.nombre}`.localeCompare(`${b.apellido} ${b.nombre}`)),
    [personas, search],
  );

  const selPersona = personas.find((p) => p.id === selectedId);
  const selProcesos = selPersona ? (agrupados.get(selPersona.id) ?? procesosVacios()) : procesosVacios();
  const selGrupo = selPersona?.grupoId ? grupos.find((g) => g.id === selPersona.grupoId) : undefined;
  const selHermano = selPersona?.hermanoMayorId ? personas.find((p) => p.id === selPersona.hermanoMayorId) : undefined;

  // Enlace «Ver ficha completa» (?ver=<personaId>): abre la ficha pedida
  // y limpia el parámetro para que no se reabra al navegar (patrón C1).
  useEffect(() => {
    const ver = searchParams.get('ver');
    if (!ver) return;
    const existe = personas.some((p) => p.id === ver);
    if (!existe && personas.length === 0) return; // datos aún cargando
    if (existe) setSelectedId(ver);
    const limpios = new URLSearchParams(searchParams);
    limpios.delete('ver');
    setSearchParams(limpios, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, personas]);

  const handleVincular = async (h: ProcesoHuerfano, personaId: string) => {
    try {
      await vincularProceso(h.proceso, h.id, personaId);
      const destino = personas.find((p) => p.id === personaId);
      showToast(`Proceso vinculado a ${destino ? nombrePersona(destino) : 'la persona'}`);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'No se pudo vincular el proceso', 'error');
    }
  };

  const handleUnir = async (absorbidaId: string) => {
    if (!selPersona) return;
    try {
      const r = await unirPersonas(absorbidaId, selPersona.id);
      showToast(`Fichas unidas: ${r.procesosMovidos} proceso(s) pasaron a ${nombrePersona(selPersona)}`);
    } catch {
      showToast('No se pudieron unir las fichas', 'error');
    }
  };

  return (
    <Layout title="Personas">
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">👤 FICHA ÚNICA DE PERSONAS</div>
            <div className="card-sub">Cada persona, una sola vez: su identidad y todos sus procesos en un sitio · {personas.length} persona(s)</div>
          </div>
          <button type="button" className="btn btn-gold" onClick={() => setCreando(true)}>➕ Nueva persona</button>
        </div>
        <div className="search-bar">
          <input className="search-input" placeholder="🔍 Buscar por nombre, teléfono o Nº de Identidad..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {filtradas.length === 0 ? (
          <EmptyState icon="👤" title="Sin personas" sub={search ? 'Ninguna persona coincide con la búsqueda.' : 'Aún no hay personas en la ficha única.'} />
        ) : (
          <table className="data-table">
            <thead>
              <tr><th>Persona</th><th>Zona</th><th>Procesos</th><th></th></tr>
            </thead>
            <tbody>
              {filtradas.map((p) => {
                const g = agrupados.get(p.id) ?? procesosVacios();
                const tipos = tiposPresentes(g);
                const situacion = situacionPersona(g, pasosSeguimiento);
                return (
                  <tr key={p.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{nombrePersona(p)}</div>
                      <div style={{ fontSize: 11, color: 'var(--dim)' }}>{p.telefono || 'Sin teléfono'}</div>
                    </td>
                    <td>{p.zona || '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {tipos.length === 0 && <span style={{ fontSize: 11, color: 'var(--dim)' }}>Sin procesos</span>}
                        {tipos.map((t) => (
                          <span key={t} className="badge badge-purple">{PROCESO_ICONO[t]} {PROCESO_ETIQUETA[t]}</span>
                        ))}
                        {situacion && (
                          <span className={`badge ${SITUACION_BADGE[situacion.tono]}`}>{situacion.texto}</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <button className="btn btn-secondary btn-sm" onClick={() => setSelectedId(p.id)}>👁 Ver ficha</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {duplicados.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-header">
            <div>
              <div className="card-title">👥 POSIBLES DUPLICADOS</div>
              <div className="card-sub">Sospechas para revisar: fichas que podrían ser la misma persona creada dos veces. Nada se une solo — el nombre por sí solo nunca une dos fichas. Si confirmas que es la misma persona, abre la ficha que debe quedar y usa «Unir personas»: se conservan los datos de ESA ficha y los procesos de la otra pasan a ella.</div>
            </div>
          </div>
          {duplicados.map((g) => (
            <div key={g.personas.map((p) => p.id).join('|')} style={{ padding: '10px 0', borderTop: '1px solid var(--border)' }}>
              <div style={{ fontSize: 13, marginBottom: 2 }}>
                <strong>{nombrePersona(g.personas[0])}</strong>
                <span style={{ color: 'var(--dim)', fontSize: 12 }}> · {g.senales.join(' · ')}</span>
              </div>
              {g.personas.map((p) => {
                const tipos = tiposPresentes(agrupados.get(p.id) ?? procesosVacios());
                return (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 160 }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{nombrePersona(p)}</div>
                      <div style={{ fontSize: 11, color: 'var(--dim)' }}>
                        {p.telefono || 'Sin teléfono'}{p.numeroIdentidad ? ` · 🪪 ${p.numeroIdentidad}` : ''}{p.zona ? ` · ${p.zona}` : ''}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {tipos.length === 0 && <span style={{ fontSize: 11, color: 'var(--dim)' }}>Sin procesos</span>}
                      {tipos.map((t) => (
                        <span key={t} className="badge badge-purple">{PROCESO_ICONO[t]} {PROCESO_ETIQUETA[t]}</span>
                      ))}
                    </div>
                    <button className="btn btn-secondary btn-sm" onClick={() => setSelectedId(p.id)}>👁 Ver ficha</button>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {huerfanos.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-header">
            <div>
              <div className="card-title">⚠️ PROCESOS SIN PERSONA</div>
              <div className="card-sub">Fichas que llegaron sin vínculo (p. ej. de un equipo sin actualizar). Vincúlalas a su persona para que aparezcan en su ficha.</div>
            </div>
          </div>
          {huerfanos.map((h) => (
            <FilaHuerfano key={`${h.proceso}:${h.id}`} huerfano={h} personas={personas} onVincular={handleVincular} />
          ))}
        </div>
      )}

      {/* REGISTRO INICIAL: el único formulario que teclea los datos de
          una persona nueva vive aquí. Se monta solo al abrirlo (Modal
          pinta sus hijos aunque esté cerrado). Al guardar, la ficha de
          la persona recién creada queda abierta. */}
      {creando && (
        <PersonaFormModal
          open
          onClose={() => setCreando(false)}
          onSaved={(id) => { setCreando(false); setSelectedId(id); }}
        />
      )}

      <PersonaDetailModal
        open={!!selPersona}
        onClose={() => setSelectedId(null)}
        persona={selPersona}
        procesos={selProcesos}
        grupoNombre={selGrupo?.nombre}
        hermanoMayorNombre={selHermano ? nombrePersona(selHermano) : undefined}
        cursoNombre={cursoNombre}
        pasosMision={pasosSeguimiento}
        otrasPersonas={personas.filter((p) => p.id !== selPersona?.id)}
        onUnir={handleUnir}
      />
    </Layout>
  );
}

function FilaHuerfano({ huerfano, personas, onVincular }: {
  huerfano: ProcesoHuerfano;
  personas: Persona[];
  onVincular: (h: ProcesoHuerfano, personaId: string) => Promise<void>;
}) {
  const [personaId, setPersonaId] = useState('');
  const [vinculando, setVinculando] = useState(false);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderTop: '1px solid var(--border)', flexWrap: 'wrap' }}>
      <span className="badge badge-yellow">{PROCESO_ICONO[huerfano.proceso]} {PROCESO_ETIQUETA[huerfano.proceso]}</span>
      <div style={{ flex: 1, minWidth: 160 }}>
        <div style={{ fontWeight: 600, fontSize: 13 }}>{huerfano.nombreVisible}</div>
        <div style={{ fontSize: 11, color: 'var(--dim)' }}>{huerfano.detalle}</div>
      </div>
      <select className="filter-select" value={personaId} onChange={(e) => setPersonaId(e.target.value)}>
        <option value="">Elegir su persona…</option>
        {personas.map((p) => (
          <option key={p.id} value={p.id}>{nombrePersona(p)}{p.telefono ? ` · ${p.telefono}` : ''}</option>
        ))}
      </select>
      <button
        type="button"
        className="btn btn-gold btn-sm"
        disabled={!personaId || vinculando}
        onClick={async () => { setVinculando(true); try { await onVincular(huerfano, personaId); } finally { setVinculando(false); } }}
      >
        {vinculando ? 'Vinculando…' : '🔗 Vincular'}
      </button>
    </div>
  );
}
