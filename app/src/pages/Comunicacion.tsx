import { useState, useMemo } from 'react';
import { v4 as uuid } from 'uuid';
import { useLiveQuery } from 'dexie-react-hooks';
import { Layout } from '../components/Layout';
import { KpiCard } from '../components/KpiCard';
import { Modal } from '../components/Modal';
import { EmptyState } from '../components/EmptyState';
import { db } from '../lib/database';
import type { Publicacion } from '../lib/types';

const PLATAFORMAS: Publicacion['plataforma'][] = ['YouTube', 'Facebook', 'Instagram', 'WhatsApp', 'Web', 'Email', 'Otro'];
const TIPOS: Publicacion['tipo'][] = ['Video', 'Reel', 'Imagen', 'Texto', 'Story', 'Live', 'Email', 'Artículo'];
const PLAT_ICON: Record<string, string> = { YouTube: '▶️', Facebook: '📘', Instagram: '📸', WhatsApp: '💬', Web: '🌐', Email: '✉️', Otro: '📌' };
const PLAT_COLOR: Record<string, string> = { YouTube: 'var(--red)', Facebook: 'var(--mision-blue)', Instagram: 'var(--mision-purple)', WhatsApp: 'var(--green)', Web: 'var(--oro-apostolico)', Email: 'var(--oro-luz)', Otro: 'var(--dim)' };
const EST_BADGE: Record<string, string> = { Borrador: 'badge-yellow', Programada: 'badge-blue', Publicada: 'badge-green', Archivada: 'badge-red' };
const today = () => new Date().toISOString().split('T')[0];
const fmt = (d: string) => {
  if (!d) return '—';
  const [y, m, dy] = d.split('-');
  const MS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${+dy} ${MS[+m - 1]} ${y}`;
};
const monthKey = (d: string) => (d && d.length >= 7 ? d.slice(0, 7) : '');
const num = (n: number) => n.toLocaleString('en-US');

type Tab = 'pub' | 'calendar' | 'resumen';
type ModalType = 'pub' | 'del';

export default function Comunicacion() {
  const pubs = useLiveQuery(() => db.publicaciones.toArray(), []) ?? [];

  const [tab, setTab] = useState<Tab>('pub');
  const [search, setSearch] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [filterPlat, setFilterPlat] = useState('');
  const [modal, setModal] = useState<null | ModalType>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [toast, setToast] = useState('');

  const [pTitulo, setPTitulo] = useState('');
  const [pPlat, setPPlat] = useState<Publicacion['plataforma']>('Facebook');
  const [pTipo, setPTipo] = useState<Publicacion['tipo']>('Texto');
  const [pFecha, setPFecha] = useState(today());
  const [pEstado, setPEstado] = useState('Publicada');
  const [pAlcance, setPAlcance] = useState('0');
  const [pEng, setPEng] = useState('0');
  const [pUrl, setPUrl] = useState('');
  const [pResp, setPResp] = useState('');
  const [pNotas, setPNotas] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3200);
  };

  const reset = () => {
    setEditId(null);
    setPTitulo('');
    setPPlat('Facebook');
    setPTipo('Texto');
    setPFecha(today());
    setPEstado('Publicada');
    setPAlcance('0');
    setPEng('0');
    setPUrl('');
    setPResp('');
    setPNotas('');
  };

  const mo = new Date().toISOString().slice(0, 7);
  const kpis = useMemo(() => {
    const totalAlcance = pubs.filter((p) => p.estado === 'Publicada').reduce((s, p) => s + (p.alcance || 0), 0);
    const totalEng = pubs.filter((p) => p.estado === 'Publicada').reduce((s, p) => s + (p.engagement || 0), 0);
    const mesAlcance = pubs.filter((p) => p.estado === 'Publicada' && monthKey(p.fecha) === mo).reduce((s, p) => s + (p.alcance || 0), 0);
    const mesCount = pubs.filter((p) => monthKey(p.fecha) === mo).length;
    const progCount = pubs.filter((p) => p.estado === 'Programada').length;
    return { totalAlcance, totalEng, mesAlcance, mesCount, progCount };
  }, [pubs, mo]);

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return pubs.filter((p) => {
      const text = `${p.titulo} ${p.responsable} ${p.url} ${p.notas}`.toLowerCase();
      return (!s || text.includes(s)) && (!filterEstado || p.estado === filterEstado) && (!filterPlat || p.plataforma === filterPlat);
    });
  }, [pubs, search, filterEstado, filterPlat]);

  const platDist = useMemo(() => {
    const dist: Record<string, { count: number; alcance: number; eng: number }> = {};
    pubs.filter((p) => p.estado === 'Publicada').forEach((p) => {
      if (!dist[p.plataforma]) dist[p.plataforma] = { count: 0, alcance: 0, eng: 0 };
      dist[p.plataforma].count++;
      dist[p.plataforma].alcance += p.alcance || 0;
      dist[p.plataforma].eng += p.engagement || 0;
    });
    return Object.entries(dist).map(([k, v]) => ({ plataforma: k, ...v })).sort((a, b) => b.alcance - a.alcance);
  }, [pubs]);

  const upcoming = useMemo(() => {
    const now = today();
    return pubs
      .filter((p) => p.estado === 'Programada' && p.fecha >= now)
      .sort((a, b) => a.fecha.localeCompare(b.fecha))
      .slice(0, 8);
  }, [pubs]);

  const monthGroups = useMemo(() => {
    const groups: Record<string, Publicacion[]> = {};
    pubs
      .filter((p) => p.estado === 'Programada')
      .sort((a, b) => a.fecha.localeCompare(b.fecha))
      .forEach((p) => {
        const k = p.fecha.slice(0, 7);
        if (!groups[k]) groups[k] = [];
        groups[k].push(p);
      });
    return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
  }, [pubs]);

  const monthLabel = (k: string) => {
    const [y, m] = k.split('-');
    const MS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    return `${MS[+m - 1]} ${y}`;
  };

  const selPub = pubs.find((p) => p.id === selectedId);

  const openNew = () => {
    reset();
    setModal('pub');
  };
  const openEdit = (id: string) => {
    const p = pubs.find((x) => x.id === id);
    if (!p) return;
    setEditId(id);
    setPTitulo(p.titulo);
    setPPlat(p.plataforma);
    setPTipo(p.tipo);
    setPFecha(p.fecha);
    setPEstado(p.estado);
    setPAlcance(String(p.alcance || 0));
    setPEng(String(p.engagement || 0));
    setPUrl(p.url);
    setPResp(p.responsable);
    setPNotas(p.notas);
    setModal('pub');
  };
  const save = async () => {
    if (!pTitulo.trim()) return showToast('El título es obligatorio');
    if (!pFecha) return showToast('La fecha es obligatoria');
    const data = {
      titulo: pTitulo.trim(),
      plataforma: pPlat,
      tipo: pTipo,
      fecha: pFecha,
      estado: pEstado as Publicacion['estado'],
      alcance: parseInt(pAlcance) || 0,
      engagement: parseInt(pEng) || 0,
      url: pUrl.trim(),
      responsable: pResp.trim(),
      notas: pNotas.trim(),
    };
    if (editId) {
      await db.publicaciones.update(editId, data);
      showToast(`Publicación "${pTitulo}" actualizada`);
    } else {
      await db.publicaciones.add({ id: uuid(), creado: new Date().toISOString(), ...data });
      showToast(`Publicación "${pTitulo}" registrada`);
    }
    reset();
    setModal(null);
  };
  const del = async () => {
    if (!selectedId) return;
    const p = pubs.find((x) => x.id === selectedId);
    await db.publicaciones.delete(selectedId);
    showToast(`Publicación "${p?.titulo}" eliminada`);
    setModal(null);
  };

  return (
    <Layout title="Comunicación">
      <div className="page-comunicacion">
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--mision-blue)', letterSpacing: 1 }}>
            Comunicación
          </div>
          <div style={{ fontFamily: 'var(--font-reading)', color: 'var(--dim)', fontSize: 14, marginTop: 4, fontStyle: 'italic' }}>
            Publicaciones · YouTube · Redes sociales · Calendario
          </div>
        </div>

        <div className="kpis">
          <KpiCard label="Alcance del Mes" value={num(kpis.mesAlcance)} icon="📡" accent="var(--mision-blue)" sub={`${kpis.mesCount} publicaciones`} />
          <KpiCard label="Alcance Total" value={num(kpis.totalAlcance)} icon="🌐" accent="var(--green)" sub="publicadas" />
          <KpiCard label="Engagement Total" value={num(kpis.totalEng)} icon="❤️" accent="var(--mision-purple)" sub="interacciones" />
          <KpiCard label="Programadas" value={kpis.progCount} icon="📅" accent="var(--oro-luz)" sub="próximas a publicar" />
        </div>

        <div className="tabs">
          <button className={`tab ${tab === 'pub' ? 'active' : ''}`} onClick={() => setTab('pub')}>📰 Publicaciones ({pubs.length})</button>
          <button className={`tab ${tab === 'calendar' ? 'active' : ''}`} onClick={() => setTab('calendar')}>📅 Calendario</button>
          <button className={`tab ${tab === 'resumen' ? 'active' : ''}`} onClick={() => setTab('resumen')}>📊 Resumen por Plataforma</button>
        </div>

        <div className="actions-row">
          {tab === 'pub' && <button className="btn btn-gold" onClick={openNew}>➕ Nueva Publicación</button>}
        </div>

        {tab === 'pub' && (
          <>
            <div className="search-bar">
              <input className="search-input" placeholder="🔍 Buscar título, responsable…" value={search} onChange={(e) => setSearch(e.target.value)} />
              <select className="filter-select" value={filterEstado} onChange={(e) => setFilterEstado(e.target.value)}>
                <option value="">Todos los estados</option>
                <option>Borrador</option>
                <option>Programada</option>
                <option>Publicada</option>
                <option>Archivada</option>
              </select>
              <select className="filter-select" value={filterPlat} onChange={(e) => setFilterPlat(e.target.value)}>
                <option value="">Todas las plataformas</option>
                {PLATAFORMAS.map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>

            <div className="card">
              <div className="card-header">
                <div className="card-title">📰 Registro de Publicaciones</div>
                <div style={{ fontSize: 12, color: 'var(--dim)' }}>{filtered.length} publicaciones</div>
              </div>
              {filtered.length === 0 ? (
                <EmptyState icon="📡" title={pubs.length ? 'Sin resultados' : 'Sin publicaciones aún'} sub={pubs.length ? 'Prueba otros filtros' : 'Registra la primera publicación'} />
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Título</th>
                      <th>Plataforma</th>
                      <th>Tipo</th>
                      <th style={{ textAlign: 'right' }}>Alcance</th>
                      <th style={{ textAlign: 'right' }}>Engagement</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered
                      .sort((a, b) => b.fecha.localeCompare(a.fecha))
                      .map((p) => {
                        const engRate = p.alcance > 0 ? Math.round((p.engagement / p.alcance) * 100) : 0;
                        return (
                          <tr key={p.id}>
                            <td>{fmt(p.fecha)}</td>
                            <td>
                              <strong>{p.titulo}</strong>
                              {p.url && (<><br /><a href={p.url} target="_blank" rel="noopener" style={{ fontSize: 10, color: 'var(--mision-blue)' }}>🔗 Ver enlace</a></>)}
                            </td>
                            <td><span style={{ color: PLAT_COLOR[p.plataforma], fontWeight: 700 }}>{PLAT_ICON[p.plataforma]} {p.plataforma}</span></td>
                            <td><span className="badge badge-blue" style={{ fontSize: 9 }}>{p.tipo}</span></td>
                            <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--mision-blue)' }}>{num(p.alcance)}</td>
                            <td style={{ textAlign: 'right' }}>
                              <div style={{ fontWeight: 700 }}>{num(p.engagement)}</div>
                              {p.alcance > 0 && <div style={{ fontSize: 9, color: 'var(--dim)' }}>{engRate}%</div>}
                            </td>
                            <td><span className={`badge ${EST_BADGE[p.estado]}`}>{p.estado}</span></td>
                            <td>
                              <div style={{ display: 'flex', gap: 5 }}>
                                <button className="btn btn-secondary btn-sm" onClick={() => openEdit(p.id)}>✏️</button>
                                <button className="btn btn-danger btn-sm" onClick={() => { setSelectedId(p.id); setModal('del'); }}>🗑️</button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {tab === 'calendar' && (
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 18 }}>
            <div className="card">
              <div className="card-header"><div className="card-title">📅 Calendario de Publicaciones Programadas</div></div>
              {monthGroups.length === 0 ? (
                <EmptyState icon="📅" title="Sin publicaciones programadas" sub='Usa "Programada" en el estado de una publicación para verla aquí' />
              ) : (
                monthGroups.map(([key, items]) => (
                  <div key={key} style={{ marginBottom: 18 }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: 'var(--oro-apostolico)', marginBottom: 8, textTransform: 'capitalize' }}>
                      📆 {monthLabel(key)} ({items.length})
                    </div>
                    {items.map((p) => (
                      <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, marginBottom: 6, borderLeft: `3px solid ${PLAT_COLOR[p.plataforma]}` }}>
                        <div style={{ width: 44, textAlign: 'center', flexShrink: 0 }}>
                          <div style={{ fontSize: 9, color: 'var(--dim)', textTransform: 'uppercase', fontWeight: 700 }}>{p.fecha.slice(8, 10)}</div>
                          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--txt)' }}>{['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'][+p.fecha.slice(5, 7) - 1]}</div>
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 700 }}>{p.titulo}</div>
                          <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 2 }}>{PLAT_ICON[p.plataforma]} {p.plataforma} · {p.tipo}{p.responsable && ` · ${p.responsable}`}</div>
                        </div>
                        <button className="btn btn-secondary btn-sm" onClick={() => openEdit(p.id)}>✏️</button>
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>

            <div className="card">
              <div className="card-header"><div className="card-title">🚀 Próximas a Publicar</div></div>
              {upcoming.length === 0 ? (
                <div style={{ color: 'var(--dim)', fontSize: 13, padding: 18, textAlign: 'center' }}>Sin publicaciones próximas</div>
              ) : (
                upcoming.map((p) => (
                  <div key={p.id} style={{ padding: 10, background: 'var(--surface)', borderRadius: 7, marginBottom: 6, borderLeft: `3px solid ${PLAT_COLOR[p.plataforma]}` }}>
                    <div style={{ fontSize: 12, fontWeight: 700 }}>{p.titulo}</div>
                    <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 2 }}>{fmt(p.fecha)} · {PLAT_ICON[p.plataforma]} {p.plataforma}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {tab === 'resumen' && (
          <div>
            {platDist.length === 0 ? (
              <div className="card"><EmptyState icon="📊" title="Sin publicaciones publicadas" sub="Publica contenido para ver estadísticas por plataforma" /></div>
            ) : (
              <>
                <div className="card" style={{ marginBottom: 18 }}>
                  <div className="card-header"><div className="card-title">🌐 Desempeño por Plataforma</div></div>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Plataforma</th>
                        <th style={{ textAlign: 'center' }}>Publicaciones</th>
                        <th style={{ textAlign: 'right' }}>Alcance Total</th>
                        <th style={{ textAlign: 'right' }}>Engagement</th>
                        <th style={{ textAlign: 'right' }}>Eng. Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {platDist.map((p) => {
                        const engRate = p.alcance > 0 ? ((p.eng / p.alcance) * 100).toFixed(1) : '0.0';
                        return (
                          <tr key={p.plataforma}>
                            <td><strong style={{ color: PLAT_COLOR[p.plataforma] }}>{PLAT_ICON[p.plataforma]} {p.plataforma}</strong></td>
                            <td style={{ textAlign: 'center', fontWeight: 700 }}>{p.count}</td>
                            <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--mision-blue)' }}>{num(p.alcance)}</td>
                            <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--mision-purple)' }}>{num(p.eng)}</td>
                            <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--green)' }}>{engRate}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
                  {platDist.map((p) => {
                    const totalAlc = platDist.reduce((s, x) => s + x.alcance, 0) || 1;
                    const pct = Math.round((p.alcance / totalAlc) * 100);
                    return (
                      <div key={p.plataforma} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 14, borderTop: `3px solid ${PLAT_COLOR[p.plataforma]}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                          <div style={{ fontSize: 13, fontWeight: 800, color: PLAT_COLOR[p.plataforma] }}>{PLAT_ICON[p.plataforma]} {p.plataforma}</div>
                          <div style={{ fontSize: 11, color: 'var(--dim)' }}>{p.count} pubs</div>
                        </div>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--txt)' }}>{num(p.alcance)}</div>
                        <div style={{ fontSize: 10, color: 'var(--dim)', marginBottom: 8 }}>alcance · {pct}% del total</div>
                        <div className="progress-bar">
                          <div className="progress-fill" style={{ width: `${pct}%`, background: PLAT_COLOR[p.plataforma] }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        <Modal
          open={modal === 'pub'}
          onClose={() => setModal(null)}
          title={editId ? '✏️ Editar Publicación' : '📰 Nueva Publicación'}
          footer={<><button className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button><button className="btn btn-gold" onClick={save}>💾 {editId ? 'Guardar Cambios' : 'Registrar'}</button></>}
        >
          <div className="form-section">Datos de la Publicación</div>
          <div className="form-row">
            <div className="form-group" style={{ gridColumn: 'span 2' }}><label className="form-label">Título *</label><input className="form-input" value={pTitulo} onChange={(e) => setPTitulo(e.target.value)} placeholder="Ej: Devocional matutino — Salmo 23" /></div>
            <div className="form-group"><label className="form-label">Plataforma</label><select className="form-select" value={pPlat} onChange={(e) => setPPlat(e.target.value as Publicacion['plataforma'])}>{PLATAFORMAS.map((p) => <option key={p}>{p}</option>)}</select></div>
            <div className="form-group"><label className="form-label">Tipo de Contenido</label><select className="form-select" value={pTipo} onChange={(e) => setPTipo(e.target.value as Publicacion['tipo'])}>{TIPOS.map((t) => <option key={t}>{t}</option>)}</select></div>
            <div className="form-group"><label className="form-label">Fecha *</label><input className="form-input" type="date" value={pFecha} onChange={(e) => setPFecha(e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Estado</label><select className="form-select" value={pEstado} onChange={(e) => setPEstado(e.target.value)}><option>Borrador</option><option>Programada</option><option>Publicada</option><option>Archivada</option></select></div>
            <div className="form-group"><label className="form-label">Alcance / Vistas</label><input className="form-input" type="number" value={pAlcance} onChange={(e) => setPAlcance(e.target.value)} min="0" /></div>
            <div className="form-group"><label className="form-label">Engagement (likes, comentarios…)</label><input className="form-input" type="number" value={pEng} onChange={(e) => setPEng(e.target.value)} min="0" /></div>
            <div className="form-group" style={{ gridColumn: 'span 2' }}><label className="form-label">URL</label><input className="form-input" value={pUrl} onChange={(e) => setPUrl(e.target.value)} placeholder="https://…" /></div>
            <div className="form-group"><label className="form-label">Responsable</label><input className="form-input" value={pResp} onChange={(e) => setPResp(e.target.value)} placeholder="Nombre" /></div>
          </div>
          <div className="form-group" style={{ marginTop: 12 }}><label className="form-label">Notas / Guion</label><textarea className="form-textarea" value={pNotas} onChange={(e) => setPNotas(e.target.value)} placeholder="Detalles, guion, hashtags…" style={{ minHeight: 55 }} /></div>
        </Modal>

        <Modal
          open={modal === 'del'}
          onClose={() => setModal(null)}
          title="⚠️ Eliminar Publicación"
          footer={<><button className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button><button className="btn btn-danger" onClick={del}>Sí, Eliminar</button></>}
        >
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 44, marginBottom: 10 }}>🗑️</div>
            <p style={{ color: 'var(--dim)', fontSize: 14, lineHeight: 1.6 }}>¿Eliminar <strong style={{ color: 'var(--txt)' }}>{selPub?.titulo}</strong>?<br />Esta acción no se puede deshacer.</p>
          </div>
        </Modal>

        {toast && <div className="toast-container"><div className="toast success">{toast}</div></div>}
      </div>
    </Layout>
  );
}
