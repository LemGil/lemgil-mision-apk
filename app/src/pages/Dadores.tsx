import { useState, useMemo } from 'react';
import { v4 as uuid } from 'uuid';
import { useLiveQuery } from 'dexie-react-hooks';
import { Layout } from '../components/Layout';
import { KpiCard } from '../components/KpiCard';
import { Modal } from '../components/Modal';
import { EmptyState } from '../components/EmptyState';
import { db } from '../lib/database';
import type { Dador, Aporte } from '../lib/types';

const today = () => new Date().toISOString().split('T')[0];
const fmt = (d: string) => {
  if (!d) return '—';
  const [y, m, dy] = d.split('-');
  const MS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${+dy} ${MS[+m - 1]} ${y}`;
};
const monthKey = (d: string) => (d && d.length >= 7 ? d.slice(0, 7) : '');
const money = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

const EST_BADGE: Record<string, string> = { Activo: 'badge-green', Pausado: 'badge-yellow', Inactivo: 'badge-red' };
const TIPO_BADGE: Record<string, string> = { Persona: 'badge-blue', Empresa: 'badge-purple', Iglesia: 'badge-yellow' };
const APORTE_BADGE: Record<string, string> = { Diezmo: 'badge-purple', Ofrenda: 'badge-blue', Misión: 'badge-green', Construcción: 'badge-yellow', 'Manos Abiertas': 'badge-red', Otro: 'badge-blue' };
const METODO_BADGE: Record<string, string> = { Efectivo: 'badge-green', Transferencia: 'badge-blue', Cheque: 'badge-yellow', Tarjeta: 'badge-purple', Otro: 'badge-blue' };

type Tab = 'dadores' | 'aportes';
type ModalType = 'dador' | 'aporte' | 'detail' | 'delDador' | 'delAporte';

export default function Dadores() {
  const dadores = useLiveQuery(() => db.dadores.toArray(), []) ?? [];
  const aportes = useLiveQuery(() => db.aportes.toArray(), []) ?? [];

  const [tab, setTab] = useState<Tab>('dadores');
  const [search, setSearch] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [filterTipoAporte, setFilterTipoAporte] = useState('');
  const [modal, setModal] = useState<null | ModalType>(null);
  const [editDadorId, setEditDadorId] = useState<string | null>(null);
  const [editAporteId, setEditAporteId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [toast, setToast] = useState('');

  const [dNombre, setDNombre] = useState('');
  const [dApellido, setDApellido] = useState('');
  const [dTel, setDTel] = useState('');
  const [dEmail, setDEmail] = useState('');
  const [dTipo, setDTipo] = useState('Persona');
  const [dEstado, setDEstado] = useState('Activo');
  const [dNotas, setDNotas] = useState('');

  const [aDador, setADador] = useState('');
  const [aFecha, setAFecha] = useState(today());
  const [aMonto, setAMonto] = useState('');
  const [aTipo, setATipo] = useState('Diezmo');
  const [aMetodo, setAMetodo] = useState('Efectivo');
  const [aRef, setARef] = useState('');
  const [aNotas, setANotas] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3200);
  };

  const resetDador = () => {
    setEditDadorId(null);
    setDNombre('');
    setDApellido('');
    setDTel('');
    setDEmail('');
    setDTipo('Persona');
    setDEstado('Activo');
    setDNotas('');
  };
  const resetAporte = () => {
    setEditAporteId(null);
    setADador('');
    setAFecha(today());
    setAMonto('');
    setATipo('Diezmo');
    setAMetodo('Efectivo');
    setARef('');
    setANotas('');
  };

  const mo = new Date().toISOString().slice(0, 7);
  const kpis = useMemo(() => {
    const activos = dadores.filter((d) => d.estado === 'Activo').length;
    const mesTotal = aportes.filter((a) => monthKey(a.fecha) === mo).reduce((s, a) => s + (a.monto || 0), 0);
    const mesCount = aportes.filter((a) => monthKey(a.fecha) === mo).length;
    const yearTotal = aportes.filter((a) => a.fecha?.startsWith(new Date().getFullYear().toString())).reduce((s, a) => s + (a.monto || 0), 0);
    return { activos, mesTotal, mesCount, yearTotal };
  }, [dadores, aportes, mo]);

  const dadoresFiltrados = useMemo(() => {
    const s = search.toLowerCase();
    return dadores.filter((d) => {
      const full = `${d.nombre} ${d.apellido} ${d.telefono} ${d.email}`.toLowerCase();
      return (!s || full.includes(s)) && (!filterEstado || d.estado === filterEstado);
    });
  }, [dadores, search, filterEstado]);

  const aportesFiltrados = useMemo(() => {
    const s = search.toLowerCase();
    return aportes
      .filter((a) => {
        const dador = dadores.find((d) => d.id === a.dadorId);
        const dadorName = dador ? `${dador.nombre} ${dador.apellido}`.toLowerCase() : '';
        return (!s || dadorName.includes(s) || a.referencia?.toLowerCase().includes(s) || a.notas?.toLowerCase().includes(s)) && (!filterTipoAporte || a.tipo === filterTipoAporte);
      })
      .sort((a, b) => b.fecha.localeCompare(a.fecha));
  }, [aportes, dadores, search, filterTipoAporte]);

  const selDador = dadores.find((d) => d.id === selectedId);
  const selAportes = selDador ? aportes.filter((a) => a.dadorId === selDador.id).sort((a, b) => b.fecha.localeCompare(a.fecha)) : [];
  const selTotal = selAportes.reduce((s, a) => s + (a.monto || 0), 0);

  const openNewDador = () => {
    resetDador();
    setModal('dador');
  };
  const openEditDador = (id: string) => {
    const d = dadores.find((x) => x.id === id);
    if (!d) return;
    setEditDadorId(id);
    setDNombre(d.nombre);
    setDApellido(d.apellido);
    setDTel(d.telefono);
    setDEmail(d.email);
    setDTipo(d.tipo);
    setDEstado(d.estado);
    setDNotas(d.notas);
    setModal('dador');
  };
  const saveDador = async () => {
    if (!dNombre.trim() || !dApellido.trim()) return showToast('Nombre y apellido son obligatorios');
    const data = { nombre: dNombre.trim(), apellido: dApellido.trim(), telefono: dTel.trim(), email: dEmail.trim(), tipo: dTipo as Dador['tipo'], estado: dEstado as Dador['estado'], notas: dNotas.trim() };
    if (editDadorId) {
      await db.dadores.update(editDadorId, data);
      showToast(`Colaborador "${dNombre} ${dApellido}" actualizado`);
    } else {
      await db.dadores.add({ id: uuid(), creado: new Date().toISOString(), ...data });
      showToast(`Colaborador "${dNombre} ${dApellido}" registrado`);
    }
    resetDador();
    setModal(null);
  };
  const delDador = async () => {
    if (!selectedId) return;
    const d = dadores.find((x) => x.id === selectedId);
    await db.dadores.delete(selectedId);
    showToast(`Colaborador "${d?.nombre} ${d?.apellido}" eliminado`);
    setModal(null);
  };

  const openNewAporte = () => {
    resetAporte();
    setModal('aporte');
  };
  const openEditAporte = (id: string) => {
    const a = aportes.find((x) => x.id === id);
    if (!a) return;
    setEditAporteId(id);
    setADador(a.dadorId);
    setAFecha(a.fecha);
    setAMonto(String(a.monto));
    setATipo(a.tipo);
    setAMetodo(a.metodo);
    setARef(a.referencia);
    setANotas(a.notas);
    setModal('aporte');
  };
  const saveAporte = async () => {
    if (!aDador) return showToast('Selecciona un colaborador');
    if (!aFecha) return showToast('La fecha es obligatoria');
    const monto = parseFloat(aMonto) || 0;
    if (monto <= 0) return showToast('El monto debe ser mayor a 0');
    const data = { dadorId: aDador, fecha: aFecha, monto, tipo: aTipo as Aporte['tipo'], metodo: aMetodo as Aporte['metodo'], referencia: aRef.trim(), notas: aNotas.trim() };
    if (editAporteId) {
      await db.aportes.update(editAporteId, data);
      showToast('Aporte actualizado');
    } else {
      await db.aportes.add({ id: uuid(), creado: new Date().toISOString(), ...data });
      showToast(`Aporte de ${money(monto)} registrado`);
    }
    resetAporte();
    setModal(null);
  };
  const delAporte = async () => {
    if (!selectedId) return;
    const a = aportes.find((x) => x.id === selectedId);
    await db.aportes.delete(selectedId);
    showToast(`Aporte de ${money(a?.monto || 0)} eliminado`);
    setModal(null);
  };
  const openDetail = (id: string) => {
    setSelectedId(id);
    setModal('detail');
  };

  return (
    <Layout title="Red de Colaboradores">
      <div className="page-dadores">
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--oro-luz)', letterSpacing: 1 }}>
            Red de Colaboradores
          </div>
          <div style={{ fontFamily: 'var(--font-reading)', color: 'var(--dim)', fontSize: 14, marginTop: 4, fontStyle: 'italic' }}>
            Aportes · Historial · Impacto · Sostenimiento
          </div>
        </div>

        <div className="kpis">
          <KpiCard label="Colaboradores Activos" value={kpis.activos} icon="🤝" accent="var(--oro-apostolico)" sub={`${dadores.length} totales`} />
          <KpiCard label="Aportes del Mes" value={money(kpis.mesTotal)} icon="📈" accent="var(--green)" sub={`${kpis.mesCount} aportes`} />
          <KpiCard label="Meta Mensual" value={`${Math.round((kpis.mesTotal / 8000) * 100)}%`} icon="🎯" accent="var(--oro-luz)" sub={`${money(kpis.mesTotal)} / $8,000`} />
          <KpiCard label="Aportado — 2026" value={money(kpis.yearTotal)} icon="💎" accent="var(--mision-purple)" sub="acumulado anual" />
        </div>

        <div className="tabs">
          <button className={`tab ${tab === 'dadores' ? 'active' : ''}`} onClick={() => { setTab('dadores'); setSearch(''); setFilterTipoAporte(''); }}>
            🙏 Colaboradores ({dadores.length})
          </button>
          <button className={`tab ${tab === 'aportes' ? 'active' : ''}`} onClick={() => { setTab('aportes'); setSearch(''); setFilterEstado(''); }}>
            💰 Aportes ({aportes.length})
          </button>
        </div>

        <div className="actions-row">
          {tab === 'dadores' && <button className="btn btn-gold" onClick={openNewDador}>➕ Nuevo Colaborador</button>}
          {tab === 'aportes' && <button className="btn btn-gold" onClick={openNewAporte}>💰 Registrar Aporte</button>}
          {tab === 'aportes' && (
            <button
              className="btn btn-secondary"
              onClick={() => {
                if (!aportes.length) return showToast('No hay aportes para exportar');
                const h = ['Fecha', 'Colaborador', 'Tipo', 'Método', 'Monto', 'Referencia', 'Notas'];
                const r = aportes.map((a) => {
                  const d = dadores.find((x) => x.id === a.dadorId);
                  return [a.fecha, d ? `${d.nombre} ${d.apellido}` : '—', a.tipo, a.metodo, a.monto, a.referencia || '', (a.notas || '').replace(/,/g, ';')];
                });
                const csv = [h, ...r].map((x) => x.join(',')).join('\n');
                const b = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
                const u = URL.createObjectURL(b);
                const a2 = document.createElement('a');
                a2.href = u;
                a2.download = 'lemgil-aportes.csv';
                a2.click();
                showToast('CSV exportado');
              }}
            >
              📥 Exportar CSV
            </button>
          )}
        </div>

        {tab === 'dadores' && (
          <>
            <div className="search-bar">
              <input className="search-input" placeholder="🔍 Buscar nombre, teléfono, email…" value={search} onChange={(e) => setSearch(e.target.value)} />
              <select className="filter-select" value={filterEstado} onChange={(e) => setFilterEstado(e.target.value)}>
                <option value="">Todos los estados</option>
                <option>Activo</option>
                <option>Pausado</option>
                <option>Inactivo</option>
              </select>
            </div>

            <div className="card">
              <div className="card-header">
                <div className="card-title">🤝 Registro de Colaboradores</div>
                <div style={{ fontSize: 12, color: 'var(--dim)' }}>{dadoresFiltrados.length} registros</div>
              </div>
              {dadoresFiltrados.length === 0 ? (
                <EmptyState icon="🤝" title={dadores.length ? 'Sin resultados' : 'Sin colaboradores aún'} sub={dadores.length ? 'Prueba otros filtros' : 'Registra el primer colaborador'} />
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Nombre</th>
                      <th>Tipo</th>
                      <th>Contacto</th>
                      <th>Aportes</th>
                      <th>Total</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dadoresFiltrados.map((d, i) => {
                      const dAportes = aportes.filter((a) => a.dadorId === d.id);
                      const total = dAportes.reduce((s, a) => s + (a.monto || 0), 0);
                      return (
                        <tr key={d.id}>
                          <td style={{ color: 'var(--dim)' }}>{i + 1}</td>
                          <td>
                            <strong>{d.nombre} {d.apellido}</strong>
                            {d.email && (<><br /><span style={{ fontSize: 10, color: 'var(--dim)' }}>{d.email}</span></>)}
                          </td>
                          <td><span className={`badge ${TIPO_BADGE[d.tipo] || 'badge-blue'}`}>{d.tipo}</span></td>
                          <td style={{ fontSize: 12 }}>{d.telefono || '—'}</td>
                          <td style={{ textAlign: 'center', fontWeight: 700 }}>{dAportes.length}</td>
                          <td style={{ fontWeight: 700, color: 'var(--oro-apostolico)' }}>{money(total)}</td>
                          <td><span className={`badge ${EST_BADGE[d.estado] || 'badge-blue'}`}>{d.estado}</span></td>
                          <td>
                            <div style={{ display: 'flex', gap: 5 }}>
                              <button className="btn btn-secondary btn-sm" onClick={() => openDetail(d.id)}>👁 Ver</button>
                              <button className="btn btn-secondary btn-sm" onClick={() => openEditDador(d.id)}>✏️</button>
                              <button className="btn btn-secondary btn-sm" onClick={() => { openNewAporte(); setTimeout(() => setADador(d.id), 50); }}>💰</button>
                              <button className="btn btn-danger btn-sm" onClick={() => { setSelectedId(d.id); setModal('delDador'); }}>🗑️</button>
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

        {tab === 'aportes' && (
          <>
            <div className="search-bar">
              <input className="search-input" placeholder="🔍 Buscar colaborador, referencia, notas…" value={search} onChange={(e) => setSearch(e.target.value)} />
              <select className="filter-select" value={filterTipoAporte} onChange={(e) => setFilterTipoAporte(e.target.value)}>
                <option value="">Todos los tipos</option>
                <option>Diezmo</option>
                <option>Ofrenda</option>
                <option>Misión</option>
                <option>Construcción</option>
                <option>Manos Abiertas</option>
                <option>Otro</option>
              </select>
            </div>

            <div className="card">
              <div className="card-header">
                <div className="card-title">💰 Historial de Aportes</div>
                <div style={{ fontSize: 12, color: 'var(--dim)' }}>{money(aportesFiltrados.reduce((s, a) => s + a.monto, 0))} · {aportesFiltrados.length} aportes</div>
              </div>
              {aportesFiltrados.length === 0 ? (
                <EmptyState icon="💰" title={aportes.length ? 'Sin resultados' : 'Sin aportes aún'} sub={aportes.length ? 'Prueba otros filtros' : 'Registra el primer aporte'} />
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Colaborador</th>
                      <th>Tipo</th>
                      <th>Método</th>
                      <th style={{ textAlign: 'right' }}>Monto</th>
                      <th>Referencia</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {aportesFiltrados.map((a) => {
                      const d = dadores.find((x) => x.id === a.dadorId);
                      return (
                        <tr key={a.id}>
                          <td>{fmt(a.fecha)}</td>
                          <td><strong>{d ? `${d.nombre} ${d.apellido}` : '—'}</strong></td>
                          <td><span className={`badge ${APORTE_BADGE[a.tipo] || 'badge-blue'}`}>{a.tipo}</span></td>
                          <td><span className={`badge ${METODO_BADGE[a.metodo] || 'badge-blue'}`}>{a.metodo}</span></td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--oro-apostolico)' }}>{money(a.monto)}</td>
                          <td style={{ fontSize: 11, color: 'var(--dim)' }}>{a.referencia || '—'}</td>
                          <td>
                            <div style={{ display: 'flex', gap: 5 }}>
                              <button className="btn btn-secondary btn-sm" onClick={() => openEditAporte(a.id)}>✏️</button>
                              <button className="btn btn-danger btn-sm" onClick={() => { setSelectedId(a.id); setModal('delAporte'); }}>🗑️</button>
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

        <Modal
          open={modal === 'dador'}
          onClose={() => setModal(null)}
          title={editDadorId ? '✏️ Editar Colaborador' : '🤝 Nuevo Colaborador'}
          footer={
            <>
              {editDadorId && <button className="btn btn-danger btn-sm" style={{ marginRight: 'auto' }} onClick={() => setModal('delDador')}>🗑️ Eliminar</button>}
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
              <button className="btn btn-gold" onClick={saveDador}>💾 {editDadorId ? 'Guardar Cambios' : 'Registrar Colaborador'}</button>
            </>
          }
        >
          <div className="form-section">Datos del Colaborador</div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Nombre *</label><input className="form-input" value={dNombre} onChange={(e) => setDNombre(e.target.value)} placeholder="Nombre" /></div>
            <div className="form-group"><label className="form-label">Apellido *</label><input className="form-input" value={dApellido} onChange={(e) => setDApellido(e.target.value)} placeholder="Apellido" /></div>
            <div className="form-group"><label className="form-label">Teléfono</label><input className="form-input" value={dTel} onChange={(e) => setDTel(e.target.value)} placeholder="+1 555 000 0000" /></div>
            <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" value={dEmail} onChange={(e) => setDEmail(e.target.value)} placeholder="correo@ejemplo.com" /></div>
            <div className="form-group"><label className="form-label">Tipo</label><select className="form-select" value={dTipo} onChange={(e) => setDTipo(e.target.value)}><option>Persona</option><option>Empresa</option><option>Iglesia</option></select></div>
            <div className="form-group"><label className="form-label">Estado</label><select className="form-select" value={dEstado} onChange={(e) => setDEstado(e.target.value)}><option>Activo</option><option>Pausado</option><option>Inactivo</option></select></div>
          </div>
          <div className="form-group" style={{ marginTop: 12 }}><label className="form-label">Notas</label><textarea className="form-textarea" value={dNotas} onChange={(e) => setDNotas(e.target.value)} placeholder="Información adicional, observaciones…" style={{ minHeight: 55 }} /></div>
        </Modal>

        <Modal
          open={modal === 'aporte'}
          onClose={() => setModal(null)}
          title={editAporteId ? '✏️ Editar Aporte' : '💰 Registrar Aporte'}
          footer={
            <>
              {editAporteId && <button className="btn btn-danger btn-sm" style={{ marginRight: 'auto' }} onClick={() => setModal('delAporte')}>🗑️ Eliminar</button>}
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
              <button className="btn btn-gold" onClick={saveAporte}>💾 {editAporteId ? 'Guardar Cambios' : 'Registrar Aporte'}</button>
            </>
          }
        >
          <div className="form-section">Datos del Aporte</div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Colaborador *</label><select className="form-select" value={aDador} onChange={(e) => setADador(e.target.value)}><option value="">Seleccionar colaborador…</option>{dadores.map((d) => <option key={d.id} value={d.id}>{d.nombre} {d.apellido}</option>)}</select></div>
            <div className="form-group"><label className="form-label">Fecha *</label><input className="form-input" type="date" value={aFecha} onChange={(e) => setAFecha(e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Monto *</label><input className="form-input" type="number" value={aMonto} onChange={(e) => setAMonto(e.target.value)} placeholder="0.00" min="0" step="0.01" /></div>
            <div className="form-group"><label className="form-label">Tipo de Aporte</label><select className="form-select" value={aTipo} onChange={(e) => setATipo(e.target.value)}><option>Diezmo</option><option>Ofrenda</option><option>Misión</option><option>Construcción</option><option>Manos Abiertas</option><option>Otro</option></select></div>
            <div className="form-group"><label className="form-label">Método de Pago</label><select className="form-select" value={aMetodo} onChange={(e) => setAMetodo(e.target.value)}><option>Efectivo</option><option>Transferencia</option><option>Cheque</option><option>Tarjeta</option><option>Otro</option></select></div>
            <div className="form-group"><label className="form-label">Referencia</label><input className="form-input" value={aRef} onChange={(e) => setARef(e.target.value)} placeholder="Nº recibo, transacción…" /></div>
          </div>
          <div className="form-group" style={{ marginTop: 12 }}><label className="form-label">Notas</label><textarea className="form-textarea" value={aNotas} onChange={(e) => setANotas(e.target.value)} placeholder="Detalles adicionales…" style={{ minHeight: 55 }} /></div>
        </Modal>

        <Modal
          open={modal === 'detail'}
          onClose={() => setModal(null)}
          title={`🤝 ${selDador?.nombre} ${selDador?.apellido}`}
          wide
          footer={<button className="btn btn-secondary" onClick={() => setModal(null)}>Cerrar</button>}
        >
          {selDador && (
            <>
              <div className="detail-row"><span className="detail-label">Tipo</span><span className="detail-value"><span className={`badge ${TIPO_BADGE[selDador.tipo]}`}>{selDador.tipo}</span></span></div>
              <div className="detail-row"><span className="detail-label">Estado</span><span className="detail-value"><span className={`badge ${EST_BADGE[selDador.estado]}`}>{selDador.estado}</span></span></div>
              <div className="detail-row"><span className="detail-label">Teléfono</span><span className="detail-value">{selDador.telefono || 'No registrado'}</span></div>
              <div className="detail-row"><span className="detail-label">Email</span><span className="detail-value">{selDador.email || 'No registrado'}</span></div>
              <div className="detail-row"><span className="detail-label">Registrado</span><span className="detail-value">{fmt(selDador.creado.slice(0, 10))}</span></div>
              {selDador.notas && <div className="detail-row"><span className="detail-label">Notas</span><span className="detail-value" style={{ fontSize: 12, color: 'var(--dim)' }}>{selDador.notas}</span></div>}

              <div className="form-section" style={{ marginTop: 14 }}>Resumen Financiero</div>
              <div className="grid-3" style={{ marginBottom: 14 }}>
                <div style={{ padding: 12, background: 'var(--surface-2)', borderRadius: 8, textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: 'var(--dim)', marginBottom: 4 }}>APORTES TOTALES</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--oro-apostolico)' }}>{money(selTotal)}</div>
                </div>
                <div style={{ padding: 12, background: 'var(--surface-2)', borderRadius: 8, textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: 'var(--dim)', marginBottom: 4 }}>CANTIDAD</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700 }}>{selAportes.length}</div>
                </div>
                <div style={{ padding: 12, background: 'var(--surface-2)', borderRadius: 8, textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: 'var(--dim)', marginBottom: 4 }}>PROMEDIO</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--green)' }}>{selAportes.length ? money(selTotal / selAportes.length) : '$0'}</div>
                </div>
              </div>

              <div className="form-section">Historial de Aportes</div>
              {selAportes.length === 0 ? (
                <div style={{ color: 'var(--dim)', fontSize: 13, padding: '10px 0' }}>Sin aportes registrados</div>
              ) : (
                selAportes.map((a) => (
                  <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: 'var(--surface-2)', borderRadius: 8, marginBottom: 6 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 700 }}>{fmt(a.fecha)} · <span className={`badge ${APORTE_BADGE[a.tipo] || 'badge-blue'}`} style={{ fontSize: 9 }}>{a.tipo}</span></div>
                      <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 2 }}>{a.metodo}{a.referencia && ` · ${a.referencia}`}</div>
                    </div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: 'var(--oro-apostolico)' }}>{money(a.monto)}</div>
                  </div>
                ))
              )}
            </>
          )}
        </Modal>

        <Modal
          open={modal === 'delDador'}
          onClose={() => setModal(null)}
          title="⚠️ Eliminar Colaborador"
          footer={<><button className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button><button className="btn btn-danger" onClick={delDador}>Sí, Eliminar</button></>}
        >
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 44, marginBottom: 10 }}>🗑️</div>
            <p style={{ color: 'var(--dim)', fontSize: 14, lineHeight: 1.6 }}>
              ¿Eliminar a <strong style={{ color: 'var(--txt)' }}>{selDador?.nombre} {selDador?.apellido}</strong>?
              {selAportes.length > 0 && (<><br />Tiene <strong style={{ color: 'var(--txt)' }}>{selAportes.length} aporte(s)</strong> registrado(s) que también se verán afectados.</>)}
              <br />Esta acción no se puede deshacer.
            </p>
          </div>
        </Modal>

        <Modal
          open={modal === 'delAporte'}
          onClose={() => setModal(null)}
          title="⚠️ Eliminar Aporte"
          footer={<><button className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button><button className="btn btn-danger" onClick={delAporte}>Sí, Eliminar</button></>}
        >
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 44, marginBottom: 10 }}>🗑️</div>
            <p style={{ color: 'var(--dim)', fontSize: 14, lineHeight: 1.6 }}>¿Eliminar este aporte?<br />Esta acción no se puede deshacer.</p>
          </div>
        </Modal>

        {toast && <div className="toast-container"><div className="toast success">{toast}</div></div>}
      </div>
    </Layout>
  );
}
