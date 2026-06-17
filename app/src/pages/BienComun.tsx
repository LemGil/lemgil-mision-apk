import { useState, useMemo } from 'react';
import { v4 as uuid } from 'uuid';
import { useLiveQuery } from 'dexie-react-hooks';
import { Layout } from '../components/Layout';
import { Modal } from '../components/Modal';
import { exportCSV } from '../lib/csvExport';
import { ZonaSelect } from '../components/ZonaSelect';
import { db } from '../lib/database';
import type { Diezmador, Grupo, Miembro, TipoPlan, PlanColaborador, AporteComun } from '../lib/types';
import {
  exportRegistrosPDF,
  exportDiezmadoresPDF,
} from '../lib/pdfExport';
import { CsvImportButton } from '../components/CsvImportButton';
import { ResumenTab } from '../components/biencomun/ResumenTab';
import { OfrendasGruposTab } from '../components/biencomun/OfrendasGruposTab';
import { today, monthKey, money, MS_SHORT, accentStyle } from '../lib/utils';

type Tab = 'registros' | 'diezmadores' | 'resumen' | 'ofrendasGrupos' | 'planes';
type ModalType = 'dador' | 'aporte' | 'delD' | 'delA' | 'verD' | 'verG' | 'tipoPlan' | 'delTipoPlan' | 'planDiezmador' | 'delPlanDiezmador';

export default function BienComun() {
  const colaboradores = useLiveQuery(() => db.dadores.toArray(), []) ?? [];
  const grupos = useLiveQuery(() => db.grupos.toArray(), []) ?? [];
  const miembros = useLiveQuery(() => db.miembros.toArray(), []) ?? [];
  const aportes = useLiveQuery(() => db.aportesComun.toArray(), []) ?? [];
  const tiposPlanes = useLiveQuery(() => db.tiposPlanes.filter(t => t.activo).toArray(), []) ?? [];
  const todosTiposPlanes = useLiveQuery(() => db.tiposPlanes.toArray(), []) ?? [];
  const planesColaborador = useLiveQuery(() => db.planesColaborador.toArray(), []) ?? [];

  const [tab, setTab] = useState<Tab>('registros');
  const [modal, setModal] = useState<null | ModalType>(null);
  const [editDId, setEditDId] = useState<string | null>(null);
  const [editAId, setEditAId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const [viewDiezmador, setViewDiezmador] = useState<Diezmador | null>(null);
  const [viewGrupo, setViewGrupo] = useState<Grupo | null>(null);

  const [filterTipo, setFilterTipo] = useState('');
  const [filterMes, setFilterMes] = useState('');
  const [filterDiezmador, setFilterDiezmador] = useState('');
  const [filterAnio, setFilterAnio] = useState(new Date().getFullYear().toString());
  const [filterMetodo, setFilterMetodo] = useState('');
  const [searchReg, setSearchReg] = useState('');

  const [searchDz, setSearchDz] = useState('');
  const [filterZona, setFilterZona] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [filterPlanDz, setFilterPlanDz] = useState('');
  const [searchG, setSearchG] = useState('');
  const [filterGZona, setFilterGZona] = useState('');
  const [filterGEstado, setFilterGEstado] = useState('');

  const [dNombre, setDNombre] = useState('');
  const [dApellido, setDApellido] = useState('');
  const [dTel, setDTel] = useState('');
  const [dEmail, setDEmail] = useState('');
  const [dZona, setDZona] = useState('');
  const [dGrupo, setDGrupo] = useState('');
  const [dEstado, setDEstado] = useState('Activo');
  const [dPlanDiezmo, setDPlanDiezmo] = useState('');
  const [dNotas, setDNotas] = useState('');

  const [tpNombre, setTpNombre] = useState('');
  const [tpColor, setTpColor] = useState('#3b82f6');
  const [editTpId, setEditTpId] = useState<string | null>(null);
  const [delTpId, setDelTpId] = useState<string | null>(null);

  const [planDiezmadorId, setPlanDiezmadorId] = useState<string | null>(null);
  const [planTipoId, setPlanTipoId] = useState('');
  const [planMonto, setPlanMonto] = useState('');
  const [planNotas, setPlanNotas] = useState('');
  const [editPlanId, setEditPlanId] = useState<string | null>(null);
  const [delPlanId, setDelPlanId] = useState<string | null>(null);

  const [aMiembro, setAMiembro] = useState('');
  const [aGrupo, setAGrupo] = useState('');
  const [aFecha, setAFecha] = useState(today());
  const [aMonto, setAMonto] = useState('');
  const [aTipo, setATipo] = useState<'Diezmo' | 'Ofrenda'>('Diezmo');
  const [aMetodo, setAMetodo] = useState('Efectivo');
  const [aServicio, setAServicio] = useState('General');
  const [aRecibo, setARecibo] = useState('');
  const [aNotas, setANotas] = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3200); };
  const resetD = () => { setEditDId(null); setDNombre(''); setDApellido(''); setDTel(''); setDEmail(''); setDZona(''); setDGrupo(''); setDEstado('Activo'); setDPlanDiezmo(''); setDNotas(''); setPlanTipoId(''); setPlanMonto(''); };
  const resetA = () => { setEditAId(null); setAMiembro(''); setAGrupo(''); setAFecha(today()); setAMonto(''); setATipo('Diezmo'); setAMetodo('Efectivo'); setAServicio('General'); setARecibo(''); setANotas(''); };

  const saveD = async () => {
    if (!dNombre.trim() || !dApellido.trim()) return showToast('Nombre y apellido obligatorios');
    const data = { nombre: dNombre.trim(), apellido: dApellido.trim(), telefono: dTel.trim(), email: dEmail.trim(), zona: dZona, grupo: dGrupo, estado: dEstado as Diezmador['estado'], planDiezmo: parseFloat(dPlanDiezmo) || 0, notas: dNotas.trim(), creado: new Date().toISOString(), fechaIngreso: today() };
    if (editDId) {
      await db.dadores.update(editDId, data);
      showToast('Diezmador actualizado');
    } else {
      const newId = uuid();
      await db.dadores.add({ id: newId, ...data });
      if (planTipoId && parseFloat(planMonto) > 0) {
        await db.planesColaborador.add({ id: uuid(), diezmadorId: newId, tipoPlanId: planTipoId, montoMensual: parseFloat(planMonto) || 0, notas: '', creado: new Date().toISOString() });
      }
      showToast('Diezmador registrado');
    }
    resetD(); setModal(null);
  };

  const selectMiembro = (m: Miembro) => {
    const grupo = grupos.find(g => g.id === m.grupoId);
    setDNombre(m.nombre);
    setDApellido(m.apellido);
    setDTel(m.telefono || '');
    setDEmail(m.email || '');
    setDZona(m.zona || '');
    setDGrupo(grupo ? grupo.nombre : '');
    setDEstado(m.estado === 'Activo' ? 'Activo' : 'Inactivo');
    setDNotas(m.notas || '');
  };

  const saveA = async () => {
    const monto = parseFloat(aMonto) || 0;
    if (aTipo === 'Diezmo' && !aMiembro) return showToast('Selecciona un diezmador para el diezmo');
    if (aTipo === 'Ofrenda' && !aMiembro && !aGrupo) return showToast('Selecciona un diezmador o grupo para la ofrenda');
    if (monto <= 0) return showToast('Monto inválido');
    const data = { diezmadorId: aMiembro || null, grupoId: aGrupo || null, fecha: aFecha, monto, tipo: aTipo as AporteComun['tipo'], metodo: aMetodo as AporteComun['metodo'], referencia: aRecibo.trim(), notas: `${aServicio} | ${aNotas.trim()}`, mesCorrespondiente: monthKey(aFecha), creado: new Date().toISOString() };
    if (editAId) {
      await db.aportesComun.update(editAId, data);
    } else {
      await db.aportesComun.add({ id: uuid(), ...data });
      showToast('Aporte registrado');
    }
    resetA(); setModal(null);
  };

  const handleEditDiezmador = (d: Diezmador) => {
    setEditDId(d.id);
    setDNombre(d.nombre);
    setDApellido(d.apellido);
    setDTel(d.telefono || '');
    setDEmail(d.email || '');
    setDZona(d.zona || '');
    setDGrupo(d.grupo || '');
    setDEstado(d.estado);
    setDPlanDiezmo(d.planDiezmo?.toString() || '');
    setDNotas(d.notas || '');
    setModal('dador');
  };

  const handleEditAporte = (a: AporteComun) => {
    setEditAId(a.id);
    setAMiembro(a.diezmadorId || '');
    setAGrupo(a.grupoId || '');
    setAFecha(a.fecha);
    setAMonto(a.monto.toString());
    setATipo(a.tipo);
    setAMetodo(a.metodo);
    const [serv, notas] = a.notas.split('|');
    setAServicio(serv?.trim() || 'General');
    setANotas(notas?.trim() || '');
    setARecibo(a.referencia || '');
    setModal('aporte');
  };

  const delD = async () => { if (!selectedId) return; await db.dadores.delete(selectedId); await db.aportesComun.where('diezmadorId').equals(selectedId).modify({ diezmadorId: null }); await db.planesColaborador.where('diezmadorId').equals(selectedId).delete(); setModal(null); };
  const delA = async () => { if (!selectedId) return; await db.aportesComun.delete(selectedId); setModal(null); };

  const resetTp = () => { setEditTpId(null); setTpNombre(''); setTpColor('#3b82f6'); };
  const saveTp = async () => {
    if (!tpNombre.trim()) return showToast('El nombre del tipo es obligatorio');
    if (editTpId) {
      await db.tiposPlanes.update(editTpId, { nombre: tpNombre.trim(), color: tpColor });
      showToast('Tipo de plan actualizado');
    } else {
      await db.tiposPlanes.add({ id: uuid(), nombre: tpNombre.trim(), color: tpColor, activo: true, creado: new Date().toISOString() });
      showToast('Tipo de plan creado');
    }
    resetTp(); setModal(null);
  };
  const delTp = async () => { if (!delTpId) return; await db.tiposPlanes.update(delTpId, { activo: false }); setModal(null); showToast('Tipo de plan desactivado'); };
  const openEditTp = (tp: TipoPlan) => { setEditTpId(tp.id); setTpNombre(tp.nombre); setTpColor(tp.color); setModal('tipoPlan'); };

  const resetPlan = () => { setEditPlanId(null); setPlanDiezmadorId(null); setPlanTipoId(''); setPlanMonto(''); setPlanNotas(''); };
  const savePlan = async () => {
    if (!planDiezmadorId) return showToast('Selecciona un diezmador');
    if (!planTipoId) return showToast('Selecciona un tipo de plan');
    const monto = parseFloat(planMonto) || 0;
    if (monto <= 0) return showToast('El monto debe ser mayor a 0');
    const data = { diezmadorId: planDiezmadorId, tipoPlanId: planTipoId, montoMensual: monto, notas: planNotas.trim(), creado: new Date().toISOString() };
    if (editPlanId) {
      await db.planesColaborador.update(editPlanId, data);
      showToast('Plan actualizado');
    } else {
      await db.planesColaborador.add({ id: uuid(), ...data });
      showToast('Plan registrado');
    }
    resetPlan(); setModal(null);
  };
  const delPlan = async () => { if (!delPlanId) return; await db.planesColaborador.delete(delPlanId); setModal(null); showToast('Plan eliminado'); };
  const openEditPlan = (p: PlanColaborador) => { setEditPlanId(p.id); setPlanDiezmadorId(p.diezmadorId); setPlanTipoId(p.tipoPlanId); setPlanMonto(p.montoMensual.toString()); setPlanNotas(p.notas || ''); setModal('planDiezmador'); };

  const registrosFiltrados = useMemo(() => {
    return aportes.filter(a => {
      const full = `${a.diezmadorId} ${a.tipo} ${a.notas}`.toLowerCase();
      return (!searchReg || full.includes(searchReg.toLowerCase())) &&
             (!filterTipo || a.tipo === filterTipo) &&
             (!filterMes || monthKey(a.fecha) === filterMes) &&
             (!filterDiezmador || a.diezmadorId === filterDiezmador) &&
             (!filterAnio || a.fecha?.startsWith(filterAnio)) &&
             (!filterMetodo || a.metodo === filterMetodo);
    });
  }, [aportes, searchReg, filterTipo, filterMes, filterDiezmador, filterAnio, filterMetodo]);

  const totalesReg = useMemo(() => {
    const total = registrosFiltrados.reduce((s, a) => s + (a.monto || 0), 0);
    const diezmos = registrosFiltrados.filter(a => a.tipo === 'Diezmo').reduce((s, a) => s + (a.monto || 0), 0);
    const ofrendas = registrosFiltrados.filter(a => a.tipo === 'Ofrenda').reduce((s, a) => s + (a.monto || 0), 0);
    return { total, diezmos, ofrendas };
  }, [registrosFiltrados]);

  const ofrendasGruposFiltradas = useMemo(() => {
    return aportes.filter(a => a.tipo === 'Ofrenda' && a.grupoId);
  }, [aportes]);

  const kpisGlobales = useMemo(() => {
    const totalRec = aportes.reduce((s, a) => s + (a.monto || 0), 0);
    const activos = colaboradores.filter(c => c.estado === 'Activo').length;
    const mesK = new Date().toISOString().slice(0, 7);
    const mesRegs = aportes.filter(a => monthKey(a.fecha) === mesK);
    const diezmes = mesRegs.filter(a => a.tipo === 'Diezmo').reduce((s, a) => s + (a.monto || 0), 0);
    const ofrmes = mesRegs.filter(a => a.tipo === 'Ofrenda').reduce((s, a) => s + (a.monto || 0), 0);
    return { totalRec, activos, diezmes, ofrmes };
  }, [aportes, colaboradores]);

  return (
    <Layout title="Bien Común">
        <div className="kpis">
            <div className="kpi" style={accentStyle('var(--gold)')}>
                <div className="kpi-label">Total Recaudado</div>
                <div className="kpi-value">{money(kpisGlobales.totalRec)}</div>
                <div className="kpi-icon">💰</div>
            </div>
            <div className="kpi" style={accentStyle('var(--green)')}>
                <div className="kpi-label">Diezmos Mes</div>
                <div className="kpi-value">{money(kpisGlobales.diezmes)}</div>
                <div className="kpi-icon">📅</div>
            </div>
            <div className="kpi" style={accentStyle('var(--purple)')}>
                <div className="kpi-label">Ofrendas Mes</div>
                <div className="kpi-value">{money(kpisGlobales.ofrmes)}</div>
                <div className="kpi-icon">🎁</div>
            </div>
            <div className="kpi" style={accentStyle('var(--blue)')}>
                <div className="kpi-label">Diezmadores Activos</div>
                <div className="kpi-value">{kpisGlobales.activos}</div>
                <div className="kpi-icon">🙏</div>
            </div>
        </div>

        <div className="tabs">
            {['registros', 'diezmadores', 'ofrendasGrupos', 'resumen', 'planes'].map(t => <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t as Tab)}>{t === 'ofrendasGrupos' ? 'GRUPOS' : t.toUpperCase()}</button>)}
        </div>

        {tab === 'registros' && (
            <div className="page-content">
                <div className="actions-row">
                    <button className="btn btn-gold" onClick={() => { resetA(); setModal('aporte'); }}>➕ Registrar Aporte</button>
                    <button className="btn btn-secondary" onClick={() => exportRegistrosPDF({ aportes: registrosFiltrados, colaboradores, grupos, filters: { tipo: filterTipo, mes: filterMes, dador: filterDiezmador } })}>📄 Exportar PDF</button>
                    <button className="btn btn-secondary" onClick={() => {
                        if (!registrosFiltrados.length) return showToast('No hay registros para exportar');
                        const h = ['Fecha', 'Colaborador', 'Tipo', 'Monto', 'Método', 'Referencia', 'Notas'];
                        const r = registrosFiltrados.map(a => {
                            const c = colaboradores.find(x => x.id === a.diezmadorId);
                            return [a.fecha, c ? `${c.nombre} ${c.apellido}` : '—', a.tipo, a.monto, a.metodo, a.referencia || '', (a.notas || '').replace(/,/g, ';')];
                        });
                        exportCSV(h, r, 'lemgil-registros.csv');
                        showToast('CSV exportado');
                    }}>📥 Exportar CSV</button>
                    <CsvImportButton
                      table="aportesComun"
                      fieldMapping={{
                        'Fecha': 'fecha',
                        'Colaborador': 'diezmadorId',
                        'Grupo': 'grupoId',
                        'Tipo': 'tipo',
                        'Monto': 'monto',
                        'Método': 'metodo',
                        'Mes': 'mesCorrespondiente',
                        'Referencia': 'referencia',
                        'Notas': 'notas',
                      }}
                      requiredFields={['fecha', 'monto']}
                      defaults={{ fecha: () => new Date().toISOString().split('T')[0], tipo: 'Diezmo', metodo: 'Efectivo' }}
                      onImport={(n) => showToast(`${n} registro(s) importado(s)`)}
                    />
                </div>
                <div className="search-bar">
                    <input className="search-input" placeholder="🔍 Buscar..." value={searchReg} onChange={e => setSearchReg(e.target.value)} />
                    <select className="filter-select" value={filterAnio} onChange={e => { setFilterAnio(e.target.value); setFilterMes(''); }}>
                        <option value="">Todos los años</option>
                        {[...new Set(aportes.map(a => a.fecha?.slice(0, 4)).filter(Boolean))].sort().reverse().map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <select className="filter-select" value={filterMes} onChange={e => setFilterMes(e.target.value)}>
                        <option value="">Todos los meses</option>
                        {MS_SHORT.map((m, i) => <option key={m} value={`${filterAnio || new Date().getFullYear()}-${String(i+1).padStart(2, '0')}`}>{m}</option>)}
                    </select>
                    <select className="filter-select" value={filterTipo} onChange={e => setFilterTipo(e.target.value)}><option value="">Todos los tipos</option><option>Diezmo</option><option>Ofrenda</option></select>
                    <select className="filter-select" value={filterMetodo} onChange={e => setFilterMetodo(e.target.value)}>
                        <option value="">Todos los métodos</option>
                        <option>Efectivo</option>
                        <option>Transferencia</option>
                        <option>Cheque</option>
                        <option>Tarjeta</option>
                        <option>Otro</option>
                    </select>
                    <select className="filter-select" value={filterDiezmador} onChange={e => setFilterDiezmador(e.target.value)}><option value="">Todos los diezmadores</option>{colaboradores.map(c => <option key={c.id} value={c.id}>{c.nombre} {c.apellido}</option>)}</select>
                </div>
                <div className="card">
                    <div className="card-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px'}}>
                        <h3 className="card-title">📋 Historial de Diezmos y Ofrendas</h3>
                        <span style={{fontSize: '12px', color: 'var(--dim)'}}>{registrosFiltrados.length} registros</span>
                    </div>
                    <div className="totales-row" style={{display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', padding: '12px', background: 'var(--bg-input)', borderRadius: '8px', marginBottom: '20px', border: '1px solid var(--border)'}}>
                        <div className="total-item" style={{textAlign: 'center'}}>
                            <div className="total-label">TOTAL</div><div className="total-val" style={{color: 'var(--gold)'}}>{money(totalesReg.total)}</div>
                        </div>
                        <div className="total-item" style={{textAlign: 'center'}}>
                            <div className="total-label">DIEZMOS</div><div className="total-val" style={{color: 'var(--green)'}}>{money(totalesReg.diezmos)}</div>
                        </div>
                        <div className="total-item" style={{textAlign: 'center'}}>
                            <div className="total-label">OFRENDAS</div><div className="total-val" style={{color: 'var(--yellow)'}}>{money(totalesReg.ofrendas)}</div>
                        </div>
                        <div className="total-item" style={{textAlign: 'center'}}>
                            <div className="total-label">REGISTROS</div><div className="total-val" style={{color: 'var(--blue)'}}>{registrosFiltrados.length}</div>
                        </div>
                    </div>
                    <table className="data-table">
                        <thead><tr><th>#</th><th>Diezmador</th><th>Tipo</th><th>Monto</th><th>Fecha</th><th>Servicio</th><th>Método</th><th>Recibo</th><th>Acciones</th></tr></thead>
                        <tbody>
                                 {registrosFiltrados.map((a) => (
                                     <tr key={a.id}>
                                         <td style={{color: 'var(--dim)'}}>{aportes.indexOf(a) + 1}</td>
                                         <td style={{fontWeight: 600}}>{colaboradores.find(c => c.id === a.diezmadorId)?.nombre || grupos.find(g => g.id === a.grupoId)?.nombre || 'Anónimo'}</td>
                                         <td><span className={`badge ${a.tipo === 'Diezmo' ? 'badge-purple' : 'badge-blue'}`}>{a.tipo}</span></td>
                                         <td style={{fontWeight: 700, color: 'var(--gold)'}}>{money(a.monto)}</td>
                                         <td>{a.fecha}</td>
                                         <td style={{color: 'var(--dim)'}}>{a.notas.split('|')[0]?.trim() || 'General'}</td>
                                         <td style={{color: 'var(--dim)'}}>{a.metodo || '—'}</td>
                                         <td style={{color: 'var(--dim)'}}>{a.referencia || '—'}</td>
                                         <td>
                                             <div style={{display: 'flex', gap: '5px'}}>
                                                 <button className="btn btn-secondary btn-sm" onClick={() => handleEditAporte(a)}>✏️</button>
                                                 <button className="btn btn-danger btn-sm" onClick={() => { setSelectedId(a.id); setModal('delA'); }}>🗑</button>
                                             </div>
                                         </td>
                                     </tr>
                                 ))}

                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {tab === 'diezmadores' && (
            <div className="page-content">
                <div className="actions-row" style={{display: 'flex', gap: '10px', flexWrap: 'wrap'}}>
                    <button className="btn btn-gold" onClick={() => { resetD(); setModal('dador'); }}>➕ Nuevo Diezmador</button>
                    <button className="btn btn-secondary" onClick={() => exportDiezmadoresPDF({ colaboradores, aportes, anio: new Date().getFullYear().toString() })}>📄 Exportar PDF</button>
                    <button className="btn btn-secondary" onClick={() => {
                        if (!colaboradores.length) return showToast('No hay diezmadores para exportar');
                        const h = ['#', 'Nombre', 'Apellido', 'Zona', 'Estado', 'Plan Diezmo', 'Total Aportado'];
                        const r = colaboradores.map((c, i) => {
                            const regs = aportes.filter(a => a.diezmadorId === c.id);
                            const total = regs.reduce((s, a) => s + (a.monto || 0), 0);
                            return [i + 1, c.nombre, c.apellido, c.zona || '', c.estado, c.planDiezmo || 0, total];
                        });
                        exportCSV(h, r, 'lemgil-diezmadores.csv');
                        showToast('CSV exportado');
                    }}>📥 Exportar CSV</button>
                    <CsvImportButton
                      table="dadores"
                      fieldMapping={{
                        'Nombre': 'nombre',
                        'Apellido': 'apellido',
                        'Teléfono': 'telefono',
                        'Email': 'email',
                        'Zona': 'zona',
                        'Grupo': 'grupo',
                        'Estado': 'estado',
                        'Plan Diezmo': 'planDiezmo',
                        'Notas': 'notas',
                      }}
                      requiredFields={['nombre', 'apellido']}
                      defaults={{ estado: 'Activo', planDiezmo: 0 }}
                      onImport={(n) => showToast(`${n} diezmador(es) importado(s)`)}
                    />
                </div>
                <div className="search-bar">
                    <input className="search-input" placeholder="🔍 Buscar diezmador..." value={searchDz} onChange={e => setSearchDz(e.target.value)} />
                    <select className="filter-select" value={filterZona} onChange={e => setFilterZona(e.target.value)}><option value="">Todas las zonas</option><option>Norte</option><option>Sur</option><option>Este</option><option>Oeste</option><option>Centro</option></select>
                    <select className="filter-select" value={filterEstado} onChange={e => setFilterEstado(e.target.value)}><option value="">Todos</option><option>Activo</option><option>Irregular</option><option>Inactivo</option></select>
                    <select className="filter-select" value={filterPlanDz} onChange={e => setFilterPlanDz(e.target.value)}>
                        <option value="">Todos los planes</option>
                        <option value="con">Con plan diezmo</option>
                        <option value="sin">Sin plan diezmo</option>
                    </select>
                </div>
                <div className="dz-grid">
                    {colaboradores.filter(d => {
                        if (searchDz && !`${d.nombre} ${d.apellido}`.toLowerCase().includes(searchDz.toLowerCase())) return false;
                        if (filterZona && d.zona !== filterZona) return false;
                        if (filterEstado && d.estado !== filterEstado) return false;
                        if (filterPlanDz === 'con' && !(d.planDiezmo > 0)) return false;
                        if (filterPlanDz === 'sin' && (d.planDiezmo > 0)) return false;
                        return true;
                    }).map(d => {
                        const regs = aportes.filter(a => a.diezmadorId === d.id);
                        const total = regs.reduce((s, a) => s + (a.monto || 0), 0);
                        const mesK = new Date().toISOString().slice(0, 7);
                        const alDia = regs.some(a => monthKey(a.fecha) === mesK);
                        return (
                                 <div key={d.id} className="card" onClick={() => { setViewDiezmador(d); setModal('verD'); }} style={{cursor: 'pointer', border: '1px solid var(--border)', background: 'var(--bg)', padding: '16px', borderRadius: '16px', position: 'relative', overflow: 'hidden'}}>
                                     <div style={{display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px'}}>
                                         <div style={{width: '50px', height: '50px', borderRadius: '50%', background: 'var(--gold-glow)', border: '2px solid var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: 'var(--gold)', fontSize: '16px'}}>{d.nombre[0]}{d.apellido[0]}</div>
                                         <div style={{flex: 1}}>
                                             <div style={{fontWeight: 800, fontSize: '18px', lineHeight: '1.2'}}>{d.nombre} {d.apellido}</div>
                                             <div style={{color: 'var(--gold)', fontSize: '13px'}}>{d.zona || 'Sin zona'}</div>
                                         </div>
                                         <span className={`badge ${d.estado === 'Activo' ? 'badge-green' : 'badge-red'}`} style={{fontSize: '11px', padding: '4px 12px'}}>{d.estado}</span>
                                         <button className="btn btn-danger btn-sm" onClick={(e) => { e.stopPropagation(); setSelectedId(d.id); setModal('delD'); }} style={{fontSize: '11px', padding: '4px 8px'}}>🗑️</button>
                                    <button className="btn btn-danger btn-sm" onClick={(e) => { e.stopPropagation(); setSelectedId(d.id); setModal('delD'); }} style={{fontSize: '11px', padding: '4px 8px'}}>🗑️</button>
                                     </div>
                                     <div style={{display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', marginBottom: '8px', color: 'var(--dim)'}}>
                                         <span>💰 Total: <span style={{color: 'var(--gold)', fontWeight: 700}}>{money(total)}</span></span>
                                         <span style={{opacity: 0.5}}>•</span>
                                         <span>📋 {regs.length} registros</span>
                                         <span style={{opacity: 0.5}}>•</span>
                                         <span>Plan: <span style={{color: 'var(--dim)'}}>{money(d.planDiezmo || 0)}</span></span>
                                     </div>
                                     {(() => {
                                         const planDiezmo = d.planDiezmo || 0;
                                         const metaAnual = planDiezmo * 12;
                                         if (metaAnual <= 0) return null;
                                         const pctCump = Math.min((total / metaAnual) * 100, 100);
                                         const semaforo = pctCump >= 100 ? 'var(--gold)' : pctCump >= 70 ? 'var(--green)' : 'var(--red)';
                                         return (
                                             <div style={{marginBottom: '14px'}}>
                                                 <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--dim)', marginBottom: '3px'}}>
                                                     <span>🎯 Meta anual: {money(metaAnual)}</span>
                                                     <span style={{color: semaforo, fontWeight: 700}}>{pctCump.toFixed(0)}%</span>
                                                 </div>
                                                 <div style={{height: '5px', background: 'var(--border)', borderRadius: '3px', overflow: 'hidden'}}>
                                                     <div style={{height: '100%', width: `${pctCump}%`, background: semaforo, transition: 'width 0.5s'}}></div>
                                                 </div>
                                             </div>
                                         );
                                     })()}
                                     <div className="grid-meses" style={{display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '6px', marginBottom: '16px'}}>
                                         {MS_SHORT.map((m, i) => {
                                             const mk = `${new Date().getFullYear()}-${String(i+1).padStart(2, '0')}`;
                                             const hasAporte = regs.some(a => monthKey(a.fecha) === mk);
                                             const isCurrent = new Date().getMonth() === i;
                                             return <div key={m} style={{fontSize: '10px', textAlign: 'center', background: hasAporte ? 'var(--green)' : 'var(--border)', color: hasAporte ? 'white' : 'var(--dim)', borderRadius: '4px', padding: '4px 0', border: isCurrent ? '1px solid var(--gold)' : 'none', fontWeight: isCurrent ? 700 : 400}}>{m}</div>;
                                         })}
                                     </div>
                                     <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px', color: 'var(--dim)'}}>
                                         <div style={{display: 'flex', gap: '10px'}}>
                                             <div style={{display: 'flex', alignItems: 'center', gap: '4px'}}><div style={{width: '8px', height: '8px', borderRadius: '50%', background: 'var(--green)'}}></div>Con aporte</div>
                                             <div style={{display: 'flex', alignItems: 'center', gap: '4px'}}><div style={{width: '8px', height: '8px', borderRadius: '50%', background: 'var(--border)'}}></div>Sin aporte</div>
                                         </div>
                                         <div style={{display: 'flex', alignItems: 'center', gap: '4px', color: alDia ? 'var(--green)' : 'var(--dim)'}}>
                                             {alDia && <span style={{fontSize: '12px'}}>✅</span>} Al día
                                         </div>
                                     </div>
                                 </div>

                        );
                    })}
                </div>
            </div>
        )}

        {tab === 'resumen' && <ResumenTab aportes={aportes} colaboradores={colaboradores} grupos={grupos} showToast={showToast} />}
        {tab === 'ofrendasGrupos' && <OfrendasGruposTab
          aportes={aportes} grupos={grupos} showToast={showToast}
          searchG={searchG} setSearchG={setSearchG}
          filterGZona={filterGZona} setFilterGZona={setFilterGZona}
          filterGEstado={filterGEstado} setFilterGEstado={setFilterGEstado}
          setViewGrupo={setViewGrupo} setModal={setModal}
          resetA={resetA} setATipo={setATipo}
        />}
        {tab === 'planes' && (
            <div className="page-content">
                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start'}}>
                    <div>
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px'}}>
                            <h3 style={{margin: 0, fontSize: '16px', fontWeight: 700}}>📋 Tipos de Plan</h3>
                            <button className="btn btn-gold" onClick={() => { resetTp(); setModal('tipoPlan'); }}>➕ Nuevo Tipo</button>
                        </div>
                        <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                            {todosTiposPlanes.map(tp => (
                                <div key={tp.id} style={{display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '10px', opacity: tp.activo ? 1 : 0.5}}>
                                    <div style={{width: '14px', height: '14px', borderRadius: '50%', background: tp.color, flexShrink: 0}}></div>
                                    <span style={{flex: 1, fontWeight: 600, fontSize: '14px'}}>{tp.nombre}</span>
                                    {!tp.activo && <span style={{fontSize: '11px', color: 'var(--dim)'}}>Inactivo</span>}
                                    {tp.activo && (
                                        <div style={{display: 'flex', gap: '6px'}}>
                                            <button className="btn btn-secondary" style={{padding: '4px 8px', fontSize: '12px'}} onClick={() => openEditTp(tp)}>✏️</button>
                                            <button className="btn btn-secondary" style={{padding: '4px 8px', fontSize: '12px', color: 'var(--red)'}} onClick={() => { setDelTpId(tp.id); setModal('delTipoPlan'); }}>🗑️</button>
                                        </div>
                                    )}
                                </div>
                            ))}
                            {todosTiposPlanes.length === 0 && <div style={{textAlign: 'center', padding: '30px', color: 'var(--dim)'}}>No hay tipos de plan creados</div>}
                        </div>
                    </div>
                    <div>
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px'}}>
                            <h3 style={{margin: 0, fontSize: '16px', fontWeight: 700}}>🤝 Planes por Diezmador</h3>
                            <button className="btn btn-gold" onClick={() => { resetPlan(); setModal('planDiezmador'); }}>➕ Nuevo Plan</button>
                        </div>
                        <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                            {planesColaborador.map(p => {
                                const colab = colaboradores.find(c => c.id === p.diezmadorId);
                                const tipo = todosTiposPlanes.find(t => t.id === p.tipoPlanId);
                                return (
                                    <div key={p.id} style={{display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '10px'}}>
                                        <div style={{width: '14px', height: '14px', borderRadius: '50%', background: tipo?.color || '#999', flexShrink: 0}}></div>
                                        <div style={{flex: 1}}>
                                            <div style={{fontWeight: 600, fontSize: '14px'}}>{colab ? `${colab.nombre} ${colab.apellido}` : '—'}</div>
                                            <div style={{fontSize: '12px', color: 'var(--dim)'}}>{tipo?.nombre || '—'} — {money(p.montoMensual)}/mes</div>
                                        </div>
                                        <div style={{display: 'flex', gap: '6px'}}>
                                            <button className="btn btn-secondary" style={{padding: '4px 8px', fontSize: '12px'}} onClick={() => openEditPlan(p)}>✏️</button>
                                            <button className="btn btn-secondary" style={{padding: '4px 8px', fontSize: '12px', color: 'var(--red)'}} onClick={() => { setDelPlanId(p.id); setModal('delPlanDiezmador'); }}>🗑️</button>
                                        </div>
                                    </div>
                                );
                            })}
                            {planesColaborador.length === 0 && <div style={{textAlign: 'center', padding: '30px', color: 'var(--dim)'}}>No hay planes asignados</div>}
                        </div>
                    </div>
                </div>
            </div>
        )}


        <Modal open={modal === 'dador'} onClose={() => setModal(null)} title={editDId ? '✏️ Editar Diezmador' : '🤝 Nuevo Diezmador'} footer={<><button className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button><button className="btn btn-gold" onClick={saveD}>💾 Registrar Diezmador</button></>}>
            <div className="form-grid">
                {!editDId && (
                    <div className="form-group" style={{marginBottom: '15px', padding: '10px', background: 'var(--bg-input)', borderRadius: '8px', border: '1px solid var(--border)'}}>
                        <label className="form-label">🔍 Buscar en Miembros de Misión</label>
                        <select className="form-select" onChange={e => {
                            const m = miembros.find(mi => mi.id === e.target.value);
                            if (m) selectMiembro(m);
                        }}>
                            <option value="">Seleccionar un miembro...</option>
                            {miembros.map(m => <option key={m.id} value={m.id}>{m.nombre} {m.apellido}</option>)}
                        </select>
                    </div>
                )}
                <div className="form-row">
                    <div className="form-group"><label className="form-label">Nombre *</label><input className="form-input" value={dNombre} onChange={e => setDNombre(e.target.value)} /></div>
                    <div className="form-group"><label className="form-label">Apellido *</label><input className="form-input" value={dApellido} onChange={e => setDApellido(e.target.value)} /></div>
                </div>
                <div className="form-row">
                    <div className="form-group"><label className="form-label">Teléfono</label><input className="form-input" value={dTel} onChange={e => setDTel(e.target.value)} /></div>
                    <div className="form-group"><label className="form-label">Email</label><input className="form-input" value={dEmail} onChange={e => setDEmail(e.target.value)} /></div>
                </div>
                <div className="form-row">
                    <div className="form-group"><label className="form-label">Zona</label><ZonaSelect value={dZona} onChange={setDZona} emptyLabel="Seleccionar..." /></div>
                    <div className="form-group"><label className="form-label">Grupo</label><input className="form-input" value={dGrupo} onChange={e => setDGrupo(e.target.value)} /></div>
                </div>
                <div className="form-row">
                    <div className="form-group"><label className="form-label">Estado</label><select className="form-select" value={dEstado} onChange={e => setDEstado(e.target.value)}><option>Activo</option><option>Irregular</option><option>Inactivo</option></select></div>
                    <div className="form-group"><label className="form-label">Plan de Diezmo</label><input className="form-input" type="number" value={dPlanDiezmo} onChange={e => setDPlanDiezmo(e.target.value)} /></div>
                </div>
                {!editDId && tiposPlanes.length > 0 && (
                    <div style={{padding: '12px', background: 'var(--bg-input)', borderRadius: '10px', border: '1px solid var(--border)', marginTop: '8px'}}>
                        <label className="form-label" style={{fontSize: '13px', fontWeight: 700, marginBottom: '8px', display: 'block'}}>📋 Plan de Ofrenda (Opcional)</label>
                        <div className="form-row">
                            <div className="form-group"><label className="form-label" style={{fontSize: '12px'}}>Tipo</label><select className="form-select" value={planTipoId} onChange={e => setPlanTipoId(e.target.value)}><option value="">Sin plan</option>{tiposPlanes.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}</select></div>
                            <div className="form-group"><label className="form-label" style={{fontSize: '12px'}}>Monto mensual ($)</label><input className="form-input" type="number" value={planMonto} onChange={e => setPlanMonto(e.target.value)} min="0" disabled={!planTipoId} placeholder={planTipoId ? 'Ej: 100' : 'Selecciona tipo primero'} /></div>
                        </div>
                    </div>
                )}
                <div className="form-group"><label className="form-label">Notas</label><textarea className="form-textarea" value={dNotas} onChange={e => setDNotas(e.target.value)} /></div>
                {editDId && (
                    <div style={{marginTop: '16px', padding: '14px', background: 'var(--bg-input)', borderRadius: '10px', border: '1px solid var(--border)'}}>
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px'}}>
                            <label className="form-label" style={{margin: 0, fontSize: '13px', fontWeight: 700}}>📋 Planes de Ofrenda</label>
                            <button className="btn btn-gold" style={{padding: '4px 10px', fontSize: '12px'}} onClick={() => { setPlanDiezmadorId(editDId); setPlanTipoId(''); setPlanMonto(''); setPlanNotas(''); setEditPlanId(null); setModal('planDiezmador'); }}>➕ Agregar Plan</button>
                        </div>
                        {planesColaborador.filter(p => p.diezmadorId === editDId).length === 0 ? (
                            <div style={{fontSize: '12px', color: 'var(--dim)', textAlign: 'center', padding: '10px'}}>Sin planes asignados</div>
                        ) : (
                            <div style={{display: 'flex', flexDirection: 'column', gap: '6px'}}>
                                {planesColaborador.filter(p => p.diezmadorId === editDId).map(p => {
                                    const tipo = todosTiposPlanes.find(t => t.id === p.tipoPlanId);
                                    return (
                                        <div key={p.id} style={{display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', background: 'var(--bg)', borderRadius: '8px', border: '1px solid var(--border)'}}>
                                            <div style={{width: '10px', height: '10px', borderRadius: '50%', background: tipo?.color || '#999', flexShrink: 0}}></div>
                                            <span style={{flex: 1, fontSize: '13px', fontWeight: 600}}>{tipo?.nombre || '—'}</span>
                                            <span style={{fontSize: '13px', color: 'var(--gold)', fontWeight: 700}}>{money(p.montoMensual)}/mes</span>
                                            <button className="btn btn-secondary" style={{padding: '2px 6px', fontSize: '11px'}} onClick={() => openEditPlan(p)}>✏️</button>
                                            <button className="btn btn-secondary" style={{padding: '2px 6px', fontSize: '11px', color: 'var(--red)'}} onClick={() => { setDelPlanId(p.id); setModal('delPlanDiezmador'); }}>🗑️</button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </Modal>

        <Modal open={modal === 'aporte'} onClose={() => setModal(null)} title={aTipo === 'Diezmo' ? '💰 Registrar Diezmo' : '🎁 Registrar Ofrenda'} footer={<><button className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button><button className="btn btn-gold" onClick={saveA}>💾 Registrar</button></>}>
            <div className="form-grid">
                <div className="form-group">
                    <label className="form-label">Diezmador {aTipo === 'Diezmo' && '*'}</label>
                    {aTipo === 'Diezmo' ? (
                        <select className="form-select" value={aMiembro} onChange={e => { setAMiembro(e.target.value); setAGrupo(''); }}>
                            <option value="">Seleccionar Diezmador *</option>
                            {colaboradores.map(c => <option key={c.id} value={c.id}>{c.nombre} {c.apellido}</option>)}
                        </select>
                    ) : (
                        <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                            <select className="form-select" value={aMiembro} onChange={e => { setAMiembro(e.target.value); setAGrupo(''); }}>
                                <option value="">Seleccionar Diezmador (Opcional)</option>
                                {colaboradores.map(c => <option key={c.id} value={c.id}>{c.nombre} {c.apellido}</option>)}
                            </select>
                            <div style={{textAlign: 'center', fontSize: '12px', color: 'var(--dim)'}}>O</div>
                            <select className="form-select" value={aGrupo} onChange={e => { setAGrupo(e.target.value); setAMiembro(''); }}>
                                <option value="">Seleccionar Grupo (Opcional)</option>
                                {grupos.map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
                            </select>
                        </div>
                    )}
                </div>
                <div className="form-row">
                    <div className="form-group"><label className="form-label">Tipo *</label><select className="form-select" value={aTipo} onChange={e => setATipo(e.target.value as 'Diezmo' | 'Ofrenda')}><option>Diezmo</option><option>Ofrenda</option></select></div>
                    <div className="form-group"><label className="form-label">Monto *</label><input className="form-input" type="number" value={aMonto} onChange={e => setAMonto(e.target.value)} /></div>
                </div>
                <div className="form-row">
                    <div className="form-group"><label className="form-label">Fecha *</label><input className="form-input" type="date" value={aFecha} onChange={e => setAFecha(e.target.value)} /></div>
                    <div className="form-group"><label className="form-label">Método</label><select className="form-select" value={aMetodo} onChange={e => setAMetodo(e.target.value)}><option>Efectivo</option><option>Transferencia</option><option>Tarjeta</option><option>Cheque</option></select></div>
                </div>
                <div className="form-row">
                    <div className="form-group"><label className="form-label">Servicio</label><input className="form-input" value={aServicio} onChange={e => setAServicio(e.target.value)} /></div>
                    <div className="form-group"><label className="form-label">Recibo</label><input className="form-input" value={aRecibo} onChange={e => setARecibo(e.target.value)} /></div>
                </div>
                <div className="form-group"><label className="form-label">Notas</label><textarea className="form-textarea" value={aNotas} onChange={e => setANotas(e.target.value)} /></div>
            </div>
        </Modal>
        <Modal open={modal === 'verD'} onClose={() => setModal(null)} title={`🙏 Detalle del Diezmador`} footer={<><button className="btn btn-danger btn-sm" onClick={() => { setModal('delD'); if (viewDiezmador) setSelectedId(viewDiezmador.id); }}>🗑️ Eliminar</button><button className="btn btn-secondary" onClick={() => setModal(null)}>Cerrar</button><button className="btn btn-gold" onClick={() => { if (viewDiezmador) handleEditDiezmador(viewDiezmador); }}>✏️ Editar Diezmador</button></>}>
            {viewDiezmador && (() => {
                const regs = aportes.filter(a => a.diezmadorId === viewDiezmador.id);
                const total = regs.reduce((s, a) => s + (a.monto || 0), 0);
                const diezmos = regs.filter(a => a.tipo === 'Diezmo').reduce((s, a) => s + (a.monto || 0), 0);
                const ofrendas = total - diezmos;
                const mesK = new Date().toISOString().slice(0, 7);
                const esteMes = regs.filter(a => monthKey(a.fecha) === mesK).reduce((s, a) => s + (a.monto || 0), 0);
                return (
                    <div style={{display: 'flex', flexDirection: 'column', gap: '24px'}}>
                        <div style={{display: 'flex', alignItems: 'center', gap: '16px', paddingBottom: '20px', borderBottom: '1px solid var(--border)'}}>
                            <div style={{width: '60px', height: '60px', borderRadius: '50%', background: 'var(--gold-glow)', border: '2px solid var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: 'var(--gold)', fontSize: '20px'}}>
                                {viewDiezmador.nombre[0]}{viewDiezmador.apellido[0]}
                            </div>
                            <div>
                                <div style={{fontSize: '22px', fontWeight: 800}}>{viewDiezmador.nombre} {viewDiezmador.apellido}</div>
                                <span className={`badge ${viewDiezmador.estado === 'Activo' ? 'badge-green' : 'badge-red'}`} style={{fontSize: '12px'}}>{viewDiezmador.estado}</span>
                            </div>
                        </div>

                        <div style={{display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px'}}>
                            <div style={{padding: '12px', background: 'var(--bg-input)', borderRadius: '12px', border: '1px solid var(--border)', textAlign: 'center'}}>
                                <div style={{fontSize: '12px', color: 'var(--dim)', marginBottom: '4px'}}>Acumulado</div>
                                <div style={{fontSize: '18px', fontWeight: 700, color: 'var(--gold)'}}>{money(total)}</div>
                            </div>
                            <div style={{padding: '12px', background: 'var(--bg-input)', borderRadius: '12px', border: '1px solid var(--border)', textAlign: 'center'}}>
                                <div style={{fontSize: '12px', color: 'var(--dim)', marginBottom: '4px'}}>Diezmos</div>
                                <div style={{fontSize: '18px', fontWeight: 700, color: 'var(--green)'}}>{money(diezmos)}</div>
                            </div>
                            <div style={{padding: '12px', background: 'var(--bg-input)', borderRadius: '12px', border: '1px solid var(--border)', textAlign: 'center'}}>
                                <div style={{fontSize: '12px', color: 'var(--dim)', marginBottom: '4px'}}>Ofrendas</div>
                                <div style={{fontSize: '18px', fontWeight: 700, color: 'var(--yellow)'}}>{money(ofrendas)}</div>
                            </div>
                            <div style={{padding: '12px', background: 'var(--bg-input)', borderRadius: '12px', border: '1px solid var(--border)', textAlign: 'center'}}>
                                <div style={{fontSize: '12px', color: 'var(--dim)', marginBottom: '4px'}}>Este Mes</div>
                                <div style={{fontSize: '18px', fontWeight: 700, color: 'var(--blue)'}}>{money(esteMes)}</div>
                            </div>
                        </div>

                        <div>
                            <div style={{fontSize: '14px', fontWeight: 700, marginBottom: '12px', color: 'var(--gold)', display: 'flex', alignItems: 'center', gap: '8px'}}>
                                <span>ℹ️</span> Información General
                            </div>
                            <div style={{display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', background: 'var(--bg)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)'}}>
                                <div style={{display: 'flex', flexDirection: 'column', gap: '4px'}}>
                                    <span style={{color: 'var(--dim)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Zona</span>
                                    <span style={{fontWeight: 600, fontSize: '13px'}}>{viewDiezmador.zona || '—'}</span>
                                </div>
                                <div style={{display: 'flex', flexDirection: 'column', gap: '4px'}}>
                                    <span style={{color: 'var(--dim)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Grupo</span>
                                    <span style={{fontWeight: 600, fontSize: '13px'}}>{viewDiezmador.grupo || '—'}</span>
                                </div>
                                <div style={{display: 'flex', flexDirection: 'column', gap: '4px'}}>
                                    <span style={{color: 'var(--dim)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Estado</span>
                                    <span style={{fontWeight: 600, fontSize: '13px'}}>{viewDiezmador.estado || '—'}</span>
                                </div>
                                <div style={{display: 'flex', flexDirection: 'column', gap: '4px'}}>
                                    <span style={{color: 'var(--dim)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Plan de Diezmo</span>
                                    <span style={{fontWeight: 600, fontSize: '13px', color: 'var(--gold)'}}>{money(viewDiezmador.planDiezmo || 0)}</span>
                                </div>
                            </div>
                        </div>

                        <div>
                            <div style={{fontSize: '14px', fontWeight: 700, marginBottom: '12px', color: 'var(--gold)', display: 'flex', alignItems: 'center', gap: '8px'}}>
                                <span>📅</span> Historial de Aportes
                            </div>
                            <table className="data-table" style={{fontSize: '13px'}}>
                                <thead><tr><th>Fecha</th><th>Tipo</th><th>Monto</th></tr></thead>
                                <tbody>{regs.sort((a, b) => b.fecha.localeCompare(a.fecha)).map(r => (
                                    <tr key={r.id}>
                                        <td>{r.fecha}</td>
                                        <td><span className={`badge ${r.tipo === 'Diezmo' ? 'badge-purple' : 'badge-blue'}`} style={{fontSize: '10px'}}>{r.tipo}</span></td>
                                        <td style={{fontWeight: 700, color: 'var(--gold)'}}>{money(r.monto)}</td>
                                    </tr>
                                ))}</tbody>
                            </table>
                        </div>
                    </div>
                );
            })()}
        </Modal>

        <Modal open={modal === 'delD'} onClose={() => setModal(null)} title="Eliminar Diezmador" footer={<><button className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button><button className="btn btn-danger" onClick={delD}>🗑️ Eliminar</button></>}>¿Está seguro que desea eliminar este diezmador?</Modal>
        <Modal open={modal === 'delA'} onClose={() => setModal(null)} title="Eliminar Aporte" footer={<><button className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button><button className="btn btn-danger" onClick={delA}>🗑️ Eliminar</button></>}>¿Está seguro que desea eliminar este aporte?</Modal>

        <Modal open={modal === 'verG'} onClose={() => setModal(null)} title={`🎁 Detalle del Grupo`} footer={<><button className="btn btn-secondary" onClick={() => setModal(null)}>Cerrar</button><button className="btn btn-gold" onClick={() => { if (viewGrupo) { setModal(null); resetA(); setATipo('Ofrenda'); setAGrupo(viewGrupo.id); setModal('aporte'); } }}>➕ Nueva Ofrenda</button></>}>
            {viewGrupo && (() => {
                const regs = ofrendasGruposFiltradas.filter(a => a.grupoId === viewGrupo.id);
                const total = regs.reduce((s, a) => s + (a.monto || 0), 0);
                const regsCount = regs.length;
                const promedio = regsCount > 0 ? total / regsCount : 0;
                const mesK = new Date().toISOString().slice(0, 7);
                const esteMes = regs.filter(a => monthKey(a.fecha) === mesK).reduce((s, a) => s + (a.monto || 0), 0);
                const iniciales = viewGrupo.nombre.split(' ').map((w: string) => w[0] || '').join('').slice(0, 2).toUpperCase();
                return (
                    <div style={{display: 'flex', flexDirection: 'column', gap: '24px'}}>
                        <div style={{display: 'flex', alignItems: 'center', gap: '16px', paddingBottom: '20px', borderBottom: '1px solid var(--border)'}}>
                            <div style={{width: '60px', height: '60px', borderRadius: '50%', background: 'var(--gold-glow)', border: '2px solid var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: 'var(--gold)', fontSize: '20px'}}>
                                {iniciales}
                            </div>
                            <div>
                                <div style={{fontSize: '22px', fontWeight: 800}}>{viewGrupo.nombre}</div>
                                <div style={{color: 'var(--dim)', fontSize: '13px'}}>Grupo de Misión</div>
                            </div>
                        </div>

                        <div style={{display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px'}}>
                            <div style={{padding: '12px', background: 'var(--bg-input)', borderRadius: '12px', border: '1px solid var(--border)', textAlign: 'center'}}>
                                <div style={{fontSize: '12px', color: 'var(--dim)', marginBottom: '4px'}}>Total Acumulado</div>
                                <div style={{fontSize: '18px', fontWeight: 700, color: 'var(--gold)'}}>{money(total)}</div>
                            </div>
                            <div style={{padding: '12px', background: 'var(--bg-input)', borderRadius: '12px', border: '1px solid var(--border)', textAlign: 'center'}}>
                                <div style={{fontSize: '12px', color: 'var(--dim)', marginBottom: '4px'}}>N° Ofrendas</div>
                                <div style={{fontSize: '18px', fontWeight: 700, color: 'var(--green)'}}>{regsCount}</div>
                            </div>
                            <div style={{padding: '12px', background: 'var(--bg-input)', borderRadius: '12px', border: '1px solid var(--border)', textAlign: 'center'}}>
                                <div style={{fontSize: '12px', color: 'var(--dim)', marginBottom: '4px'}}>Promedio</div>
                                <div style={{fontSize: '18px', fontWeight: 700, color: 'var(--yellow)'}}>{money(promedio)}</div>
                            </div>
                            <div style={{padding: '12px', background: 'var(--bg-input)', borderRadius: '12px', border: '1px solid var(--border)', textAlign: 'center'}}>
                                <div style={{fontSize: '12px', color: 'var(--dim)', marginBottom: '4px'}}>Este Mes</div>
                                <div style={{fontSize: '18px', fontWeight: 700, color: 'var(--blue)'}}>{money(esteMes)}</div>
                            </div>
                        </div>

                        <div>
                            <div style={{fontSize: '14px', fontWeight: 700, marginBottom: '12px', color: 'var(--gold)', display: 'flex', alignItems: 'center', gap: '8px'}}>
                                <span>ℹ️</span> Información General
                            </div>
                            <div style={{display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', background: 'var(--bg)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)'}}>
                                <div style={{display: 'flex', flexDirection: 'column', gap: '4px'}}>
                                    <span style={{color: 'var(--dim)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Zona</span>
                                    <span style={{fontWeight: 600, fontSize: '13px'}}>{viewGrupo.zona || '—'}</span>
                                </div>
                                <div style={{display: 'flex', flexDirection: 'column', gap: '4px'}}>
                                    <span style={{color: 'var(--dim)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Líder</span>
                                    <span style={{fontWeight: 600, fontSize: '13px'}}>{viewGrupo.lider || '—'}</span>
                                </div>
                                <div style={{display: 'flex', flexDirection: 'column', gap: '4px'}}>
                                    <span style={{color: 'var(--dim)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Día</span>
                                    <span style={{fontWeight: 600, fontSize: '13px'}}>{viewGrupo.dia || '—'}</span>
                                </div>
                                <div style={{display: 'flex', flexDirection: 'column', gap: '4px'}}>
                                    <span style={{color: 'var(--dim)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Hora</span>
                                    <span style={{fontWeight: 600, fontSize: '13px'}}>{viewGrupo.hora || '—'}</span>
                                </div>
                                <div style={{display: 'flex', flexDirection: 'column', gap: '4px'}}>
                                    <span style={{color: 'var(--dim)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Lugar</span>
                                    <span style={{fontWeight: 600, fontSize: '13px'}}>{viewGrupo.lugar || '—'}</span>
                                </div>
                                <div style={{display: 'flex', flexDirection: 'column', gap: '4px'}}>
                                    <span style={{color: 'var(--dim)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Capacidad</span>
                                    <span style={{fontWeight: 600, fontSize: '13px'}}>{viewGrupo.capacidad || '—'}</span>
                                </div>
                                <div style={{display: 'flex', flexDirection: 'column', gap: '4px'}}>
                                    <span style={{color: 'var(--dim)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Miembros</span>
                                    <span style={{fontWeight: 600, fontSize: '13px'}}>{viewGrupo.miembros || 0}</span>
                                </div>
                                <div style={{display: 'flex', flexDirection: 'column', gap: '4px'}}>
                                    <span style={{color: 'var(--dim)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Estado</span>
                                    <span style={{fontWeight: 600, fontSize: '13px', color: esteMes > 0 ? 'var(--green)' : 'var(--dim)'}}>{esteMes > 0 ? '✅ Al día' : '⏳ Sin ofrenda'}</span>
                                </div>
                            </div>
                        </div>

                        <div>
                            <div style={{fontSize: '14px', fontWeight: 700, marginBottom: '12px', color: 'var(--gold)', display: 'flex', alignItems: 'center', gap: '8px'}}>
                                <span>📅</span> Historial de Ofrendas
                            </div>
                            {regs.length > 0 ? (
                                <table className="data-table" style={{fontSize: '13px'}}>
                                    <thead><tr><th>Fecha</th><th>Monto</th><th>Método</th><th>Recibo</th><th>Acciones</th></tr></thead>
                                    <tbody>{[...regs].sort((a, b) => b.fecha.localeCompare(a.fecha)).map(r => (
                                        <tr key={r.id}>
                                            <td>{r.fecha}</td>
                                            <td style={{fontWeight: 700, color: 'var(--gold)'}}>{money(r.monto)}</td>
                                            <td style={{color: 'var(--dim)'}}>{r.metodo || '—'}</td>
                                            <td style={{color: 'var(--dim)'}}>{r.referencia || '—'}</td>
                                            <td>
                                                <div style={{display: 'flex', gap: '5px'}} onClick={e => e.stopPropagation()}>
                                                    <button className="btn btn-secondary btn-sm" onClick={() => { setModal(null); handleEditAporte(r); }}>✏️</button>
                                                    <button className="btn btn-danger btn-sm" onClick={() => { setSelectedId(r.id); setModal('delA'); }}>🗑</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}</tbody>
                                </table>
                            ) : (
                                <div style={{textAlign: 'center', padding: '30px', color: 'var(--dim)', background: 'var(--bg-input)', borderRadius: '12px', border: '1px solid var(--border)'}}>No hay ofrendas registradas para este grupo</div>
                            )}
                        </div>
                    </div>
                );
            })()}
        </Modal>

        <Modal open={modal === 'tipoPlan'} onClose={() => setModal(null)} title={editTpId ? '✏️ Editar Tipo de Plan' : '➕ Nuevo Tipo de Plan'} footer={<><button className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button><button className="btn btn-gold" onClick={saveTp}>💾 {editTpId ? 'Guardar' : 'Crear'}</button></>}>
            <div className="form-group"><label className="form-label">Nombre del Tipo *</label><input className="form-input" value={tpNombre} onChange={e => setTpNombre(e.target.value)} placeholder="Ej: Ofrenda General" /></div>
            <div className="form-group" style={{marginTop: 12}}><label className="form-label">Color</label><input className="form-input" type="color" value={tpColor} onChange={e => setTpColor(e.target.value)} style={{height: '40px', padding: '4px'}} /></div>
        </Modal>

        <Modal open={modal === 'delTipoPlan'} onClose={() => setModal(null)} title="Desactivar Tipo" footer={<><button className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button><button className="btn btn-danger" onClick={delTp}>🗑️ Desactivar</button></>}>¿Desactivar este tipo de plan? Los planes existentes con este tipo se mantendrán.</Modal>

        <Modal open={modal === 'planDiezmador'} onClose={() => setModal(null)} title={editPlanId ? '✏️ Editar Plan' : '➕ Nuevo Plan de Diezmador'} footer={<><button className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button><button className="btn btn-gold" onClick={savePlan}>💾 {editPlanId ? 'Guardar' : 'Crear'}</button></>}>
            <div className="form-group"><label className="form-label">Diezmador *</label><select className="form-select" value={planDiezmadorId || ''} onChange={e => setPlanDiezmadorId(e.target.value)} disabled={!!editPlanId}><option value="">Seleccionar diezmador...</option>{colaboradores.map(c => <option key={c.id} value={c.id}>{c.nombre} {c.apellido}</option>)}</select></div>
            <div className="form-group" style={{marginTop: 12}}><label className="form-label">Tipo de Plan *</label><select className="form-select" value={planTipoId} onChange={e => setPlanTipoId(e.target.value)}><option value="">Seleccionar tipo...</option>{tiposPlanes.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}</select></div>
            <div className="form-group" style={{marginTop: 12}}><label className="form-label">Monto Mensual ($) *</label><input className="form-input" type="number" value={planMonto} onChange={e => setPlanMonto(e.target.value)} min="0" placeholder="Ej: 100" /></div>
            <div className="form-group" style={{marginTop: 12}}><label className="form-label">Notas</label><input className="form-input" value={planNotas} onChange={e => setPlanNotas(e.target.value)} placeholder="Opcional" /></div>
        </Modal>

        <Modal open={modal === 'delPlanDiezmador'} onClose={() => setModal(null)} title="Eliminar Plan" footer={<><button className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button><button className="btn btn-danger" onClick={delPlan}>🗑️ Eliminar</button></>}>¿Está seguro que desea eliminar este plan?</Modal>

        {toast && <div className="toast-container"><div className="toast success">{toast}</div></div>}
    </Layout>
  );
}
