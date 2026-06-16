import { useState, useMemo } from 'react';
import { v4 as uuid } from 'uuid';
import { useLiveQuery } from 'dexie-react-hooks';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { exportCSV } from '../lib/csvExport';
import { Layout } from '../components/Layout';
import { KpiCard } from '../components/KpiCard';
import { Modal } from '../components/Modal';
import { EmptyState } from '../components/EmptyState';
import { ZonaSelect } from '../components/ZonaSelect';
import { db } from '../lib/database';
import type { Negocio } from '../lib/types';
import { CsvImportButton } from '../components/CsvImportButton';

const RUBROS = ['Alimentos', 'Tecnología', 'Ropa', 'Servicios', 'Educación', 'Construcción', 'Transporte', 'Salud', 'Belleza', 'Otro'];
const ETAPAS: { key: 'Idea' | 'Planificación' | 'Lanzamiento' | 'Operación' | 'Crecimiento' | 'Cierre'; emoji: string; order: number }[] = [
  { key: 'Idea', emoji: '💡', order: 1 },
  { key: 'Planificación', emoji: '📋', order: 2 },
  { key: 'Lanzamiento', emoji: '🚀', order: 3 },
  { key: 'Operación', emoji: '⚙️', order: 4 },
  { key: 'Crecimiento', emoji: '📈', order: 5 },
  { key: 'Cierre', emoji: '🔒', order: 6 },
];
import { today, money } from '../lib/utils';

const EST_BADGE: Record<string, string> = { Activo: 'badge-green', Pausado: 'badge-yellow', Completado: 'badge-purple', Cancelado: 'badge-red' };
const ETAPA_BADGE: Record<string, string> = { Idea: 'badge-blue', Planificación: 'badge-yellow', Lanzamiento: 'badge-purple', Operación: 'badge-green', Crecimiento: 'badge-green', Cierre: 'badge-red' };

type Tab = 'negocios' | 'resumen';
type ModalType = 'neg' | 'del';

export default function Negocios() {
  const negocios = useLiveQuery(() => db.negocios.toArray(), []) ?? [];

  const [tab, setTab] = useState<Tab>('negocios');
  const [search, setSearch] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [filterRubro, setFilterRubro] = useState('');
  const [filterEtapa, setFilterEtapa] = useState('');
  const [filterAnio, setFilterAnio] = useState(new Date().getFullYear().toString());
  const [modal, setModal] = useState<null | ModalType>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [toast, setToast] = useState('');

  const [nNombre, setNNombre] = useState('');
  const [nEmprendedor, setNEmprendedor] = useState('');
  const [nRubro, setNRubro] = useState('Servicios');
  const [nZona, setNZona] = useState('');
  const [nEtapa, setNEtapa] = useState<Negocio['etapa']>('Idea');
  const [nEstado, setNEstado] = useState('Activo');
  const [nIngresos, setNIngresos] = useState('0');
  const [nFecha, setNFecha] = useState(today());
  const [nMentor, setNMentor] = useState('');
  const [nDesc, setNDesc] = useState('');
  const [nNotas, setNNotas] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3200);
  };

  const reset = () => {
    setEditId(null);
    setNNombre('');
    setNEmprendedor('');
    setNRubro('Servicios');
    setNZona('');
    setNEtapa('Idea');
    setNEstado('Activo');
    setNIngresos('0');
    setNFecha(today());
    setNMentor('');
    setNDesc('');
    setNNotas('');
  };

  const kpis = useMemo(() => {
    const activos = negocios.filter((n) => n.estado === 'Activo').length;
    const emprendedoresUniq = new Set(negocios.map((n) => n.emprendedor?.toLowerCase().trim()).filter(Boolean)).size;
    const mentoresUniq = new Set(negocios.map((n) => n.mentor?.toLowerCase().trim()).filter(Boolean)).size;
    const ingresosTotal = negocios.filter((n) => n.estado === 'Activo').reduce((s, n) => s + (n.ingresosMensuales || 0), 0);
    return { activos, emprendedoresUniq, mentoresUniq, ingresosTotal };
  }, [negocios]);

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return negocios.filter((n) => {
      const text = `${n.nombre} ${n.emprendedor} ${n.mentor} ${n.descripcion}`.toLowerCase();
      return (!s || text.includes(s))
        && (!filterEstado || n.estado === filterEstado)
        && (!filterRubro || n.rubro === filterRubro)
        && (!filterEtapa || n.etapa === filterEtapa)
        && (!filterAnio || n.fechaInicio?.startsWith(filterAnio));
    });
  }, [negocios, search, filterEstado, filterRubro, filterEtapa, filterAnio]);

  const etapaDist = useMemo(() => {
    const dist: Record<string, number> = {};
    negocios.forEach((n) => {
      if (n.estado === 'Activo') dist[n.etapa] = (dist[n.etapa] || 0) + 1;
    });
    const total = Object.values(dist).reduce((s, n) => s + n, 0) || 1;
    return ETAPAS.map((e) => ({ ...e, count: dist[e.key] || 0, pct: Math.round(((dist[e.key] || 0) / total) * 100) }));
  }, [negocios]);

  const rubroDist = useMemo(() => {
    const dist: Record<string, number> = {};
    negocios.forEach((n) => {
      if (n.estado === 'Activo') dist[n.rubro] = (dist[n.rubro] || 0) + 1;
    });
    return Object.entries(dist)
      .map(([k, v]) => ({ key: k, count: v }))
      .sort((a, b) => b.count - a.count);
  }, [negocios]);

  const selNegocio = negocios.find((n) => n.id === selectedId);

  const openNew = () => {
    reset();
    setModal('neg');
  };
  const openEdit = (id: string) => {
    const n = negocios.find((x) => x.id === id);
    if (!n) return;
    setEditId(id);
    setNNombre(n.nombre);
    setNEmprendedor(n.emprendedor);
    setNRubro(n.rubro);
    setNZona(n.zona);
    setNEtapa(n.etapa);
    setNEstado(n.estado);
    setNIngresos(String(n.ingresosMensuales || 0));
    setNFecha(n.fechaInicio);
    setNMentor(n.mentor);
    setNDesc(n.descripcion);
    setNNotas(n.notas);
    setModal('neg');
  };
  const save = async () => {
    if (!nNombre.trim()) return showToast('El nombre del negocio es obligatorio');
    if (!nEmprendedor.trim()) return showToast('Indica el emprendedor');
    const data = {
      nombre: nNombre.trim(),
      emprendedor: nEmprendedor.trim(),
      rubro: nRubro,
      zona: nZona,
      etapa: nEtapa,
      estado: nEstado as Negocio['estado'],
      ingresosMensuales: parseFloat(nIngresos) || 0,
      fechaInicio: nFecha,
      mentor: nMentor.trim(),
      descripcion: nDesc.trim(),
      notas: nNotas.trim(),
    };
    if (editId) {
      await db.negocios.update(editId, data);
      showToast(`Negocio "${nNombre}" actualizado`);
    } else {
      await db.negocios.add({ id: uuid(), creado: new Date().toISOString(), ...data });
      showToast(`Negocio "${nNombre}" registrado`);
    }
    reset();
    setModal(null);
  };
  const del = async () => {
    if (!selectedId) return;
    const n = negocios.find((x) => x.id === selectedId);
    await db.negocios.delete(selectedId);
    showToast(`Negocio "${n?.nombre}" eliminado`);
    setModal(null);
  };

  return (
    <Layout title="Negocios Adonay">
      <div className="page-negocios">
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--oro-apostolico)', letterSpacing: 1 }}>
            Negocios Adonay
          </div>
          <div style={{ fontFamily: 'var(--font-reading)', color: 'var(--dim)', fontSize: 14, marginTop: 4, fontStyle: 'italic' }}>
            Emprendimientos · Mentorías · Progreso económico
          </div>
        </div>

        <div className="kpis">
          <KpiCard label="Proyectos Activos" value={kpis.activos} icon="🚀" accent="var(--oro-apostolico)" sub={`${negocios.length} totales`} />
          <KpiCard label="Emprendedores" value={kpis.emprendedoresUniq} icon="👥" accent="var(--green)" sub="únicos" />
          <KpiCard label="Mentores" value={kpis.mentoresUniq} icon="🧑‍🏫" accent="var(--academia-teal)" sub="asignados" />
          <KpiCard label="Ingresos Mensuales" value={money(kpis.ingresosTotal)} icon="💰" accent="var(--oro-luz)" sub="total acumulado" />
        </div>

        <div className="tabs">
          <button className={`tab ${tab === 'negocios' ? 'active' : ''}`} onClick={() => { setTab('negocios'); setSearch(''); setFilterEstado(''); setFilterRubro(''); setFilterEtapa(''); setFilterAnio(new Date().getFullYear().toString()); }}>
            💼 Negocios ({negocios.length})
          </button>
          <button className={`tab ${tab === 'resumen' ? 'active' : ''}`} onClick={() => { setTab('resumen'); setSearch(''); setFilterEstado(''); setFilterRubro(''); setFilterEtapa(''); setFilterAnio(new Date().getFullYear().toString()); }}>
            📊 Resumen
          </button>
        </div>

        <div className="actions-row">
          {tab === 'negocios' && <button className="btn btn-gold" onClick={openNew}>➕ Nuevo Negocio</button>}
          {tab === 'negocios' && (
            <>
              <button className="btn btn-secondary" onClick={() => {
                if (!filtered.length) return showToast('No hay negocios para exportar');
                const doc = new jsPDF();
                doc.setFontSize(18);
                doc.text('Emprendimientos Adonay', 14, 20);
                doc.setFontSize(10);
                doc.setTextColor(120);
                doc.text(`Generado: ${new Date().toLocaleDateString('es-ES')} · Total: ${filtered.length}`, 14, 28);
                const rows = filtered.map(n => [n.nombre, n.emprendedor, n.rubro, n.etapa, n.estado, `$${(n.ingresosMensuales || 0).toLocaleString()}`, n.zona || '—']);
                autoTable(doc, { startY: 34, head: [['Nombre', 'Emprendedor', 'Rubro', 'Etapa', 'Estado', 'Ingresos', 'Zona']], body: rows, styles: { fontSize: 9 }, headStyles: { fillColor: [212, 168, 67] } });
                doc.save('lemgil-negocios.pdf');
                showToast('PDF exportado');
              }}>📄 Exportar PDF</button>
              <button className="btn btn-secondary" onClick={() => {
                if (!filtered.length) return showToast('No hay negocios para exportar');
                const h = ['Nombre', 'Emprendedor', 'Rubro', 'Zona', 'Etapa', 'Estado', 'Ingresos Mensuales', 'Fecha Inicio', 'Descripción'];
                const r = filtered.map(n => [n.nombre, n.emprendedor, n.rubro, n.zona || '', n.etapa, n.estado, n.ingresosMensuales || 0, n.fechaInicio || '', (n.descripcion || '').replace(/,/g, ';')]);
                exportCSV(h, r, 'lemgil-negocios.csv');
                showToast('CSV exportado');
              }}>📥 Exportar CSV</button>
              <CsvImportButton<Negocio>
                table="negocios"
                fieldMapping={{
                  'Nombre': 'nombre',
                  'Emprendedor': 'emprendedor',
                  'Rubro': 'rubro',
                  'Zona': 'zona',
                  'Etapa': 'etapa',
                  'Estado': 'estado',
                  'Ingresos Mensuales': 'ingresosMensuales',
                  'Fecha Inicio': 'fechaInicio',
                  'Mentor': 'mentor',
                  'Descripción': 'descripcion',
                  'Notas': 'notas',
                }}
                requiredFields={['nombre', 'emprendedor']}
                defaults={{ estado: 'Activo', etapa: 'Idea', ingresosMensuales: 0, rubro: 'Otro' }}
                onImport={(n) => showToast(`${n} negocio(s) importado(s)`)}
              />
            </>
          )}
        </div>

        {tab === 'negocios' && (
          <>
            <div className="search-bar">
              <input className="search-input" placeholder="🔍 Buscar nombre, emprendedor, mentor…" value={search} onChange={(e) => setSearch(e.target.value)} />
              <select className="filter-select" value={filterAnio} onChange={(e) => setFilterAnio(e.target.value)}>
                <option value="">Todos los años</option>
                {[...new Set(negocios.map(n => n.fechaInicio?.slice(0, 4)).filter(Boolean))].sort().reverse().map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <select className="filter-select" value={filterEstado} onChange={(e) => setFilterEstado(e.target.value)}>
                <option value="">Todos los estados</option>
                <option>Activo</option>
                <option>Pausado</option>
                <option>Completado</option>
                <option>Cancelado</option>
              </select>
              <select className="filter-select" value={filterRubro} onChange={(e) => setFilterRubro(e.target.value)}>
                <option value="">Todos los rubros</option>
                {RUBROS.map((r) => <option key={r}>{r}</option>)}
              </select>
              <select className="filter-select" value={filterEtapa} onChange={(e) => setFilterEtapa(e.target.value)}>
                <option value="">Todas las etapas</option>
                {ETAPAS.map((e) => <option key={e.key}>{e.key}</option>)}
              </select>
            </div>

            <div className="card">
              <div className="card-header">
                <div className="card-title">💼 Emprendimientos del Ministerio</div>
                <div style={{ fontSize: 12, color: 'var(--dim)' }}>{filtered.length} proyectos</div>
              </div>
              {filtered.length === 0 ? (
                <EmptyState icon="💼" title={negocios.length ? 'Sin resultados' : 'Sin negocios aún'} sub={negocios.length ? 'Prueba otros filtros' : 'Registra el primer emprendimiento'} />
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
                  {filtered.map((n) => {
                    const etapaIdx = ETAPAS.findIndex((e) => e.key === n.etapa);
                    const etapaOrder = ETAPAS[etapaIdx]?.order || 0;
                    const progressPct = Math.round((etapaOrder / 6) * 100);
                    return (
                      <div key={n.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: 'linear-gradient(90deg, var(--oro-luz), var(--oro-apostolico))' }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, marginTop: 4 }}>
                          <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--txt)', flex: 1 }}>{n.nombre}</div>
                          <span className={`badge ${EST_BADGE[n.estado] || 'badge-blue'}`} style={{ marginLeft: 6 }}>{n.estado}</span>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--dim)', marginBottom: 4 }}>👤 <strong style={{ color: 'var(--txt)' }}>{n.emprendedor}</strong></div>
                        {n.mentor && <div style={{ fontSize: 11, color: 'var(--dim)', marginBottom: 8 }}>🧑‍🏫 Mentor: {n.mentor}</div>}
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                          <span className="badge badge-blue" style={{ fontSize: 9 }}>{n.rubro}</span>
                          <span className={`badge ${ETAPA_BADGE[n.etapa]}`} style={{ fontSize: 9 }}>{ETAPAS[etapaIdx]?.emoji} {n.etapa}</span>
                          {n.zona && <span className="badge badge-yellow" style={{ fontSize: 9 }}>📍 {n.zona}</span>}
                        </div>
                        {n.descripcion && <div style={{ fontSize: 12, color: 'var(--dim)', marginBottom: 8, lineHeight: 1.5 }}>{n.descripcion.slice(0, 90)}{n.descripcion.length > 90 ? '…' : ''}</div>}
                        <div style={{ fontSize: 11, color: 'var(--oro-apostolico)', fontWeight: 700, marginBottom: 6 }}>💰 {money(n.ingresosMensuales)} / mes</div>
                        <div className="progress-bar" style={{ marginBottom: 10 }}>
                          <div className="progress-fill" style={{ width: `${progressPct}%`, background: 'var(--oro-apostolico)' }} />
                        </div>
                        <div style={{ display: 'flex', gap: 5 }}>
                          <button className="btn btn-secondary btn-sm" onClick={() => openEdit(n.id)}>✏️</button>
                          <button className="btn btn-danger btn-sm" onClick={() => { setSelectedId(n.id); setModal('del'); }}>🗑️</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {tab === 'resumen' && (
          <>
            <div className="actions-row">
              <button className="btn btn-secondary" onClick={() => {
                if (!negocios.length) return showToast('No hay negocios para exportar');
                const doc = new jsPDF();
                doc.setFontSize(18);
                doc.text('Resumen Negocios Adonay', 14, 20);
                doc.setFontSize(10);
                doc.setTextColor(120);
                doc.text(`Generado: ${new Date().toLocaleDateString('es-ES')} · Total: ${negocios.length} negocios`, 14, 28);
                doc.text(`Activos: ${negocios.filter(n => n.estado === 'Activo').length} · Ingresos: $${negocios.filter(n => n.estado === 'Activo').reduce((s, n) => s + (n.ingresosMensuales || 0), 0).toLocaleString()}/mes`, 14, 34);
                const rows = etapaDist.map(e => [e.key, e.count, `${e.pct}%`]);
                autoTable(doc, { startY: 40, head: [['Etapa', 'Cantidad', '%']], body: rows, styles: { fontSize: 9 }, headStyles: { fillColor: [212, 168, 67] } });
                const lastY = doc.lastAutoTable?.finalY || 40;
                const rubRows = rubroDist.map(r => [r.key, r.count, `${Math.round((r.count / (rubroDist.reduce((s, x) => s + x.count, 0) || 1)) * 100)}%`]);
                autoTable(doc, { startY: lastY + 10, head: [['Rubro', 'Cantidad', '%']], body: rubRows, styles: { fontSize: 9 }, headStyles: { fillColor: [212, 168, 67] } });
                doc.save('lemgil-resumen-negocios.pdf');
                showToast('PDF exportado');
              }}>📄 Exportar PDF</button>
              <button className="btn btn-secondary" onClick={() => {
                if (!negocios.length) return showToast('No hay negocios para exportar');
                const h = ['Métrica', 'Valor'];
                const r = [
                  ['Total negocios', negocios.length],
                  ['Activos', negocios.filter(n => n.estado === 'Activo').length],
                  ['Pausados', negocios.filter(n => n.estado === 'Pausado').length],
                  ['Completados', negocios.filter(n => n.estado === 'Completado').length],
                  ['Cancelados', negocios.filter(n => n.estado === 'Cancelado').length],
                  ['Ingresos totales/mes', `$${negocios.filter(n => n.estado === 'Activo').reduce((s, n) => s + (n.ingresosMensuales || 0), 0)}`],
                  ['', ''],
                  ['DISTRIBUCIÓN POR ETAPA', ''],
                  ...etapaDist.map(e => [e.key, `${e.count} (${e.pct}%)`]),
                  ['', ''],
                  ['DISTRIBUCIÓN POR RUBRO', ''],
                  ...rubroDist.map(r => [r.key, `${r.count} (${Math.round((r.count / (rubroDist.reduce((s, x) => s + x.count, 0) || 1)) * 100)}%)`]),
                ];
                exportCSV(h, r, 'lemgil-resumen-negocios.csv');
                showToast('CSV exportado');
              }}>📥 Exportar CSV</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
            <div className="card">
              <div className="card-header"><div className="card-title">🚀 Distribución por Etapa</div></div>
              {etapaDist.every((e) => e.count === 0) ? (
                <div style={{ color: 'var(--dim)', fontSize: 13, padding: 18, textAlign: 'center' }}>Sin negocios activos</div>
              ) : (
                etapaDist.map((e) => (
                  <div key={e.key} className="progress-row">
                    <div className="progress-header">
                      <span style={{ color: 'var(--txt)' }}>{e.emoji} {e.key}</span>
                      <span style={{ color: 'var(--oro-apostolico)', fontWeight: 700 }}>{e.count} {e.count === 1 ? 'negocio' : 'negocios'} · {e.pct}%</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${e.pct}%`, background: 'var(--oro-apostolico)' }} />
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="card">
              <div className="card-header"><div className="card-title">🏷️ Distribución por Rubro</div></div>
              {rubroDist.length === 0 ? (
                <div style={{ color: 'var(--dim)', fontSize: 13, padding: 18, textAlign: 'center' }}>Sin negocios activos</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {rubroDist.map((r) => {
                    const total = rubroDist.reduce((s, x) => s + x.count, 0) || 1;
                    const pct = Math.round((r.count / total) * 100);
                    return (
                      <div key={r.key} style={{ padding: 10, background: 'var(--surface)', borderRadius: 8, border: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 12, fontWeight: 600 }}>{r.key}</span>
                          <span style={{ fontSize: 12, color: 'var(--oro-apostolico)', fontWeight: 700 }}>{r.count} · {pct}%</span>
                        </div>
                        <div className="progress-bar">
                          <div className="progress-fill" style={{ width: `${pct}%`, background: 'var(--green)' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="card" style={{ gridColumn: 'span 2' }}>
              <div className="card-header"><div className="card-title">💡 Top Emprendedores</div></div>
              {(() => {
                const empMap: Record<string, { count: number; ingresos: number }> = {};
                negocios.filter((n) => n.estado === 'Activo').forEach((n) => {
                  const k = n.emprendedor?.trim() || 'Sin nombre';
                  if (!empMap[k]) empMap[k] = { count: 0, ingresos: 0 };
                  empMap[k].count++;
                  empMap[k].ingresos += n.ingresosMensuales || 0;
                });
                const top = Object.entries(empMap).sort((a, b) => b[1].ingresos - a[1].ingresos).slice(0, 5);
                if (top.length === 0) return <div style={{ color: 'var(--dim)', fontSize: 13, padding: 18, textAlign: 'center' }}>Sin emprendedores activos</div>;
                return (
                  <table className="data-table">
                    <thead>
                      <tr><th>#</th><th>Emprendedor</th><th style={{ textAlign: 'center' }}>Negocios</th><th style={{ textAlign: 'right' }}>Ingresos / mes</th></tr>
                    </thead>
                    <tbody>
                      {top.map(([nombre, data], i) => (
                        <tr key={nombre}>
                          <td style={{ color: 'var(--dim)' }}>{i + 1}</td>
                          <td><strong>{nombre}</strong></td>
                          <td style={{ textAlign: 'center', fontWeight: 700 }}>{data.count}</td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--oro-apostolico)' }}>{money(data.ingresos)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                );
              })()}
            </div>
          </div>
          </>
        )}

        <Modal
          open={modal === 'neg'}
          onClose={() => setModal(null)}
          title={editId ? '✏️ Editar Negocio' : '💼 Nuevo Emprendimiento'}
          wide
          footer={<><button className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button><button className="btn btn-gold" onClick={save}>💾 {editId ? 'Guardar Cambios' : 'Registrar Negocio'}</button></>}
        >
          <div className="form-section">Datos del Emprendimiento</div>
          <div className="form-row">
            <div className="form-group" style={{ gridColumn: 'span 2' }}><label className="form-label">Nombre del Negocio *</label><input className="form-input" value={nNombre} onChange={(e) => setNNombre(e.target.value)} placeholder="Ej: Panadería Esperanza" /></div>
            <div className="form-group"><label className="form-label">Emprendedor *</label><input className="form-input" value={nEmprendedor} onChange={(e) => setNEmprendedor(e.target.value)} placeholder="Nombre completo" /></div>
            <div className="form-group"><label className="form-label">Rubro</label><select className="form-select" value={nRubro} onChange={(e) => setNRubro(e.target.value)}>{RUBROS.map((r) => <option key={r}>{r}</option>)}</select></div>
            <div className="form-group"><label className="form-label">Zona</label><ZonaSelect value={nZona} onChange={setNZona} /></div>
            <div className="form-group"><label className="form-label">Fecha de Inicio</label><input className="form-input" type="date" value={nFecha} onChange={(e) => setNFecha(e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Etapa Actual</label><select className="form-select" value={nEtapa} onChange={(e) => setNEtapa(e.target.value as Negocio['etapa'])}>{ETAPAS.map((e) => <option key={e.key}>{e.key}</option>)}</select></div>
            <div className="form-group"><label className="form-label">Estado</label><select className="form-select" value={nEstado} onChange={(e) => setNEstado(e.target.value)}><option>Activo</option><option>Pausado</option><option>Completado</option><option>Cancelado</option></select></div>
            <div className="form-group"><label className="form-label">Ingresos Mensuales ($)</label><input className="form-input" type="number" value={nIngresos} onChange={(e) => setNIngresos(e.target.value)} min="0" step="0.01" /></div>
            <div className="form-group"><label className="form-label">Mentor Asignado</label><input className="form-input" value={nMentor} onChange={(e) => setNMentor(e.target.value)} placeholder="Nombre del mentor" /></div>
          </div>
          <div className="form-group" style={{ marginTop: 12 }}><label className="form-label">Descripción</label><textarea className="form-textarea" value={nDesc} onChange={(e) => setNDesc(e.target.value)} placeholder="¿En qué consiste el negocio?" style={{ minHeight: 55 }} /></div>
          <div className="form-group" style={{ marginTop: 12 }}><label className="form-label">Notas / Seguimiento</label><textarea className="form-textarea" value={nNotas} onChange={(e) => setNNotas(e.target.value)} placeholder="Avances, obstáculos, próximos pasos…" style={{ minHeight: 55 }} /></div>
        </Modal>

        <Modal
          open={modal === 'del'}
          onClose={() => setModal(null)}
          title="⚠️ Eliminar Negocio"
          footer={<><button className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button><button className="btn btn-danger" onClick={del}>Sí, Eliminar</button></>}
        >
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 44, marginBottom: 10 }}>🗑️</div>
            <p style={{ color: 'var(--dim)', fontSize: 14, lineHeight: 1.6 }}>¿Eliminar el negocio <strong style={{ color: 'var(--txt)' }}>{selNegocio?.nombre}</strong>?<br />Esta acción no se puede deshacer.</p>
          </div>
        </Modal>

        {toast && <div className="toast-container"><div className="toast success">{toast}</div></div>}
      </div>
    </Layout>
  );
}
