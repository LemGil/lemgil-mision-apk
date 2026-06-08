import { useState, useMemo } from 'react';
import { v4 as uuid } from 'uuid';
import { useLiveQuery } from 'dexie-react-hooks';
import { Layout } from '../components/Layout';
import { Modal } from '../components/Modal';
import { ZonaSelect } from '../components/ZonaSelect';
import { db } from '../lib/database';
import {
  exportRegistrosPDF,
  exportDiezmadoresPDF,
  exportGruposPDF,
  exportResumenGeneralPDF,
  exportResumenMensualPDF,
  exportTopPDF,
  exportMetasPDF,
  exportCumplimientoPDF,
} from '../lib/pdfExport';

const today = () => new Date().toISOString().split('T')[0];
const monthKey = (d: string) => (d && d.length >= 7 ? d.slice(0, 7) : '');
const money = (n: number) => `$${n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const MS_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

type Tab = 'registros' | 'diezmadores' | 'resumen' | 'ofrendasGrupos';
type ModalType = 'dador' | 'aporte' | 'delD' | 'delA' | 'verD' | 'verG';

export default function BienComun() {
  const colaboradores = useLiveQuery(() => db.colaboradores.toArray(), []) ?? [];
  const grupos = useLiveQuery(() => db.grupos.toArray(), []) ?? [];
  const miembros = useLiveQuery(() => db.miembros.toArray(), []) ?? [];
  const aportes = useLiveQuery(() => db.aportesComun.toArray(), []) ?? [];

  const [tab, setTab] = useState<Tab>('registros');
  const [modal, setModal] = useState<null | ModalType>(null);
  const [editDId, setEditDId] = useState<string | null>(null);
  const [editAId, setEditAId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const [viewDador, setViewDador] = useState<any>(null);
  const [viewGrupo, setViewGrupo] = useState<any>(null);
  const [anioResumen, setAnioResumen] = useState(new Date().getFullYear().toString());
  const [subTab, setSubTab] = useState<'general' | 'mensual' | 'top' | 'metas' | 'cumplimiento'>('general');

  const [filterTipo, setFilterTipo] = useState('');
  const [filterMes, setFilterMes] = useState('');
  const [filterDador, setFilterDador] = useState('');
  const [searchReg, setSearchReg] = useState('');

  const [searchDz, setSearchDz] = useState('');
  const [filterZona, setFilterZona] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
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
  const [dBase, setDBase] = useState('');
  const [dNotas, setDNotas] = useState('');

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
  const resetD = () => { setEditDId(null); setDNombre(''); setDApellido(''); setDTel(''); setDEmail(''); setDZona(''); setDGrupo(''); setDEstado('Activo'); setDBase(''); setDNotas(''); };
  const resetA = () => { setEditAId(null); setAMiembro(''); setAGrupo(''); setAFecha(today()); setAMonto(''); setATipo('Diezmo'); setAMetodo('Efectivo'); setAServicio('General'); setARecibo(''); setANotas(''); };

  const saveD = async () => {
    if (!dNombre.trim() || !dApellido.trim()) return showToast('Nombre y apellido obligatorios');
    const data = { nombre: dNombre.trim(), apellido: dApellido.trim(), telefono: dTel.trim(), email: dEmail.trim(), zona: dZona, grupo: dGrupo, estado: dEstado as any, base: parseFloat(dBase) || 0, notas: dNotas.trim(), creado: new Date().toISOString(), fechaIngreso: today() };
    if (editDId) {
      await db.colaboradores.update(editDId, data);
      showToast('Dador actualizado');
    } else {
      await db.colaboradores.add({ id: uuid(), ...data });
      showToast('Dador registrado');
    }
    resetD(); setModal(null);
  };

  const selectMiembro = (m: any) => {
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
    if (aTipo === 'Diezmo' && !aMiembro) return showToast('Selecciona un dador para el diezmo');
    if (aTipo === 'Ofrenda' && !aMiembro && !aGrupo) return showToast('Selecciona un dador o grupo para la ofrenda');
    if (monto <= 0) return showToast('Monto inválido');
    const data = { miembroId: aMiembro || null, grupoId: aGrupo || null, fecha: aFecha, monto, tipo: aTipo, metodo: aMetodo as any, referencia: aRecibo.trim(), notas: `${aServicio} | ${aNotas.trim()}`, mesCorrespondiente: monthKey(aFecha), creado: new Date().toISOString() };
    if (editAId) {
      await db.aportesComun.update(editAId, data as any);
      showToast('Aporte actualizado');
    } else {
      await db.aportesComun.add({ id: uuid(), ...data as any });
      showToast('Aporte registrado');
    }
    resetA(); setModal(null);
  };

  const handleEditDador = (d: any) => {
    setEditDId(d.id);
    setDNombre(d.nombre);
    setDApellido(d.apellido);
    setDTel(d.telefono || '');
    setDEmail(d.email || '');
    setDZona(d.zona || '');
    setDGrupo(d.grupo || '');
    setDEstado(d.estado);
    setDBase(d.base?.toString() || '');
    setDNotas(d.notas || '');
    setModal('dador');
  };

  const handleEditAporte = (a: any) => {
    setEditAId(a.id);
    setAMiembro(a.miembroId || '');
    setAGrupo(a.grupoId || '');
    setAFecha(a.fecha);
    setAMonto(a.monto.toString());
    setATipo(a.tipo as any);
    setAMetodo(a.metodo as any);
    const [serv, notas] = a.notas.split('|');
    setAServicio(serv?.trim() || 'General');
    setANotas(notas?.trim() || '');
    setARecibo(a.referencia || '');
    setModal('aporte');
  };

  const delD = async () => { if (!selectedId) return; await db.colaboradores.delete(selectedId); await db.aportesComun.where('miembroId').equals(selectedId).modify({ miembroId: null }); setModal(null); };
  const delA = async () => { if (!selectedId) return; await db.aportesComun.delete(selectedId); setModal(null); };

  const registrosFiltrados = useMemo(() => {
    return aportes.filter(a => {
      const full = `${a.miembroId} ${a.tipo} ${a.notas}`.toLowerCase();
      return (!searchReg || full.includes(searchReg.toLowerCase())) &&
             (!filterTipo || a.tipo === filterTipo) &&
             (!filterMes || monthKey(a.fecha) === filterMes) &&
             (!filterDador || a.miembroId === filterDador);
    });
  }, [aportes, searchReg, filterTipo, filterMes, filterDador]);

  const totalesReg = useMemo(() => {
    const total = registrosFiltrados.reduce((s, a) => s + (a.monto || 0), 0);
    const diezmos = registrosFiltrados.filter(a => a.tipo === 'Diezmo').reduce((s, a) => s + (a.monto || 0), 0);
    const ofrendas = registrosFiltrados.filter(a => a.tipo === 'Ofrenda').reduce((s, a) => s + (a.monto || 0), 0);
    return { total, diezmos, ofrendas };
  }, [registrosFiltrados]);

  const ofrendasGruposFiltradas = useMemo(() => {
    return aportes.filter(a => a.tipo === 'Ofrenda' && a.grupoId);
  }, [aportes]);

  const totalOfrendasGrupos = useMemo(() => {
    return ofrendasGruposFiltradas.reduce((s, a) => s + (a.monto || 0), 0);
  }, [ofrendasGruposFiltradas]);

  const kpisGlobales = useMemo(() => {
    const totalRec = aportes.reduce((s, a) => s + (a.monto || 0), 0);
    const activos = colaboradores.filter(c => c.estado === 'Activo').length;
    const mesK = new Date().toISOString().slice(0, 7);
    const mesRegs = aportes.filter(a => monthKey(a.fecha) === mesK);
    const diezmes = mesRegs.filter(a => a.tipo === 'Diezmo').reduce((s, a) => s + (a.monto || 0), 0);
    const ofrmes = mesRegs.filter(a => a.tipo === 'Ofrenda').reduce((s, a) => s + (a.monto || 0), 0);
    return { totalRec, activos, diezmes, ofrmes };
  }, [aportes, colaboradores]);

  const resumenAnual = useMemo(() => {
    const regsAnio = aportes.filter(a => a.fecha.startsWith(anioResumen));
    const total = regsAnio.reduce((s, a) => s + (a.monto || 0), 0);
    const diezmos = regsAnio.filter(a => a.tipo === 'Diezmo').reduce((s, a) => s + (a.monto || 0), 0);
    const ofrendas = regsAnio.filter(a => a.tipo === 'Ofrenda').reduce((s, a) => s + (a.monto || 0), 0);
    return { total, diezmos, ofrendas };
  }, [aportes, anioResumen]);

  const resumenCompleto = useMemo(() => {
    const regsAnio = aportes.filter(a => a.fecha.startsWith(anioResumen));
    const mesesData = MS_SHORT.map((m, i) => {
      const mesIdx = (i + 1).toString().padStart(2, '0');
      const regsMes = regsAnio.filter(a => a.fecha.startsWith(`${anioResumen}-${mesIdx}`));
      const totMes = regsMes.reduce((s, a) => s + (a.monto || 0), 0);
      const dzMes = regsMes.filter(a => a.tipo === 'Diezmo').reduce((s, a) => s + (a.monto || 0), 0);
      const ofMes = regsMes.filter(a => a.tipo === 'Ofrenda').reduce((s, a) => s + (a.monto || 0), 0);
      return { mes: m, idx: i, total: totMes, diezmos: dzMes, ofrendas: ofMes, regs: regsMes.length };
    });
    const anioPrev = (parseInt(anioResumen) - 1).toString();
    const regsAnioPrev = aportes.filter(a => a.fecha.startsWith(anioPrev));
    const totalPrev = regsAnioPrev.reduce((s, a) => s + (a.monto || 0), 0);
    const diezmosPrev = regsAnioPrev.filter(a => a.tipo === 'Diezmo').reduce((s, a) => s + (a.monto || 0), 0);
    const ofrendasPrev = regsAnioPrev.filter(a => a.tipo === 'Ofrenda').reduce((s, a) => s + (a.monto || 0), 0);
    const mesesConData = mesesData.filter(m => m.total > 0);
    const mejorMes = mesesConData.length > 0 ? mesesConData.reduce((max, m) => m.total > max.total ? m : max, mesesConData[0]) : null;
    const peorMes = mesesConData.length > 1 ? mesesConData.reduce((min, m) => m.total < min.total ? m : min, mesesConData[0]) : null;
    const promedioMensual = mesesConData.length > 0 ? mesesConData.reduce((s, m) => s + m.total, 0) / mesesConData.length : 0;
    const idsActivos = new Set(regsAnio.map(a => a.miembroId).filter(Boolean));
    const dadoresActivosAnio = colaboradores.filter(c => idsActivos.has(c.id)).length;
    const topDadores = colaboradores.map(c => {
      const regs = regsAnio.filter(a => a.miembroId === c.id);
      const tot = regs.reduce((s, a) => s + (a.monto || 0), 0);
      return { id: c.id, nombre: c.nombre, apellido: c.apellido, zona: (c as any).zona, total: tot, regs: regs.length };
    }).filter(c => c.total > 0).sort((a, b) => b.total - a.total).slice(0, 5);
    const topGrupos = grupos.map(g => {
      const regs = regsAnio.filter(a => a.grupoId === g.id && a.tipo === 'Ofrenda');
      const tot = regs.reduce((s, a) => s + (a.monto || 0), 0);
      return { id: g.id, nombre: g.nombre, zona: g.zona, total: tot, regs: regs.length };
    }).filter(g => g.total > 0).sort((a, b) => b.total - a.total).slice(0, 5);
    const maxMes = mesesConData.length > 0 ? Math.max(...mesesConData.map(m => m.total)) : 0;
    const variacionTotal = totalPrev > 0 ? ((resumenAnual.total - totalPrev) / totalPrev) * 100 : null;
    const variacionDiezmos = diezmosPrev > 0 ? ((resumenAnual.diezmos - diezmosPrev) / diezmosPrev) * 100 : null;
    const variacionOfrendas = ofrendasPrev > 0 ? ((resumenAnual.ofrendas - ofrendasPrev) / ofrendasPrev) * 100 : null;
    return { mesesData, mejorMes, peorMes, promedioMensual, dadoresActivosAnio, topDadores, topGrupos, maxMes, totalAportes: regsAnio.length, gruposConOfrenda: topGrupos.length, variacionTotal, variacionDiezmos, variacionOfrendas };
  }, [aportes, anioResumen, colaboradores, grupos, resumenAnual]);

  const cumplimiento = useMemo(() => {
    const anio = parseInt(anioResumen);
    const regsAnio = aportes.filter(a => a.fecha.startsWith(anioResumen));
    const metaGlobalAnual = colaboradores.reduce((s, c) => s + ((c as any).base || 0) * 12, 0) + grupos.reduce((s, g) => s + ((g as any).metaMensual || 0) * 12, 0);
    const metaGlobalMes = metaGlobalAnual / 12;
    const totalRecAnio = regsAnio.reduce((s, a) => s + (a.monto || 0), 0);
    const totalRecMesActual = regsAnio.filter(a => monthKey(a.fecha) === new Date().toISOString().slice(0, 7)).reduce((s, a) => s + (a.monto || 0), 0);
    const pctGlobal = metaGlobalAnual > 0 ? (totalRecAnio / metaGlobalAnual) * 100 : 0;
    const mesActualNum = new Date().getMonth() + 1;
    const metaAcumuladaEsperada = metaGlobalAnual > 0 ? (metaGlobalMes * mesActualNum) : 0;
    const cumplimientoDadores = colaboradores.map(c => {
      const regs = regsAnio.filter(a => a.miembroId === c.id);
      const total = regs.reduce((s, a) => s + (a.monto || 0), 0);
      const base = (c as any).base || 0;
      const metaAnual = base * 12;
      const pct = metaAnual > 0 ? (total / metaAnual) * 100 : null;
      return { id: c.id, nombre: c.nombre, apellido: c.apellido, zona: (c as any).zona || '—', base, metaAnual, total, regs: regs.length, pct };
    }).sort((a, b) => (b.pct ?? -1) - (a.pct ?? -1));
    const cumplimientoGrupos = grupos.map(g => {
      const regs = regsAnio.filter(a => a.grupoId === g.id && a.tipo === 'Ofrenda');
      const total = regs.reduce((s, a) => s + (a.monto || 0), 0);
      const metaMes = (g as any).metaMensual || 0;
      const metaAnual = metaMes * 12;
      const pct = metaAnual > 0 ? (total / metaAnual) * 100 : null;
      return { id: g.id, nombre: g.nombre, zona: g.zona || '—', metaMensual: metaMes, metaAnual, total, regs: regs.length, pct };
    }).sort((a, b) => (b.pct ?? -1) - (a.pct ?? -1));
    const periodos = MS_SHORT.map((m, i) => {
      const mesIdx = (i + 1).toString().padStart(2, '0');
      const regsMes = regsAnio.filter(a => a.fecha.startsWith(`${anioResumen}-${mesIdx}`));
      const total = regsMes.reduce((s, a) => s + (a.monto || 0), 0);
      const metaEsperada = metaGlobalMes;
      const pct = metaEsperada > 0 ? (total / metaEsperada) * 100 : null;
      return { etiqueta: m, tipo: 'mes' as const, total, metaEsperada, pct, idx: i };
    });
    const acumulados = [];
    let acum = 0;
    for (let i = 0; i < 12; i++) {
      acum += periodos[i].total;
      const metaAcum = metaGlobalMes * (i + 1);
      acumulados.push({ ...periodos[i], acumulado: acum, metaAcumulada: metaAcum, pctAcumulado: metaAcum > 0 ? (acum / metaAcum) * 100 : null });
    }
    const trimestres: any[] = [];
    for (let t = 0; t < 4; t++) {
      const regsT = regsAnio.filter(a => {
        const mes = parseInt(a.fecha.slice(5, 7));
        return Math.floor((mes - 1) / 3) === t;
      });
      const total = regsT.reduce((s, a) => s + (a.monto || 0), 0);
      const metaEsperada = metaGlobalAnual / 4;
      const pct = metaEsperada > 0 ? (total / metaEsperada) * 100 : null;
      trimestres.push({ etiqueta: `Q${t + 1}`, tipo: 'trimestre' as const, total, metaEsperada, pct });
    }
    const semestres: any[] = [];
    for (let s = 0; s < 2; s++) {
      const regsS = regsAnio.filter(a => {
        const mes = parseInt(a.fecha.slice(5, 7));
        return Math.floor((mes - 1) / 6) === s;
      });
      const total = regsS.reduce((s, a) => s + (a.monto || 0), 0);
      const metaEsperada = metaGlobalAnual / 2;
      const pct = metaEsperada > 0 ? (total / metaEsperada) * 100 : null;
      semestres.push({ etiqueta: s === 0 ? '1er Semestre' : '2do Semestre', tipo: 'semestre' as const, total, metaEsperada, pct });
    }
    const anual = { etiqueta: `${anio}`, tipo: 'año' as const, total: totalRecAnio, metaEsperada: metaGlobalAnual, pct: metaGlobalAnual > 0 ? (totalRecAnio / metaGlobalAnual) * 100 : null };
    return { metaGlobalAnual, metaGlobalMes, totalRecAnio, totalRecMesActual, pctGlobal, metaAcumuladaEsperada, cumplimientoDadores, cumplimientoGrupos, mensuales: acumulados, trimestres, semestres, anual };
  }, [aportes, anioResumen, colaboradores, grupos]);

  return (
    <Layout title="Bien Común">
        <div className="kpis">
            <div className="kpi" style={{'--accent': 'var(--gold)'} as any}><div className="kpi-label">Total Recaudado</div><div className="kpi-value">{money(kpisGlobales.totalRec)}</div><div className="kpi-icon">💰</div></div>
            <div className="kpi" style={{'--accent': 'var(--green)'} as any}><div className="kpi-label">Dadores Activos</div><div className="kpi-value">{kpisGlobales.activos}</div><div className="kpi-icon">🙏</div></div>
            <div className="kpi" style={{'--accent': 'var(--blue)'} as any}><div className="kpi-label">Diezmos Mes</div><div className="kpi-value">{money(kpisGlobales.diezmes)}</div><div className="kpi-icon">📅</div></div>
            <div className="kpi" style={{'--accent': 'var(--purple)'} as any}><div className="kpi-label">Ofrendas Mes</div><div className="kpi-value">{money(kpisGlobales.ofrmes)}</div><div className="kpi-icon">🎁</div></div>
        </div>

        <div className="tabs">
            {['registros', 'diezmadores', 'ofrendasGrupos', 'resumen'].map(t => <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t as Tab)}>{t === 'ofrendasGrupos' ? 'GRUPOS' : t.toUpperCase()}</button>)}
        </div>

        {tab === 'registros' && (
            <div className="page-content">
                <div className="actions-row">
                    <button className="btn btn-gold" onClick={() => { resetA(); setModal('aporte'); }}>➕ Registrar Aporte</button>
                    <button className="btn btn-secondary" onClick={() => exportRegistrosPDF({ aportes: registrosFiltrados, colaboradores, grupos, filters: { tipo: filterTipo, mes: filterMes, dador: filterDador } })}>📄 Exportar PDF</button>
                </div>
                <div className="search-bar">
                    <input className="search-input" placeholder="🔍 Buscar..." value={searchReg} onChange={e => setSearchReg(e.target.value)} />
                    <select className="filter-select" value={filterTipo} onChange={e => setFilterTipo(e.target.value)}><option value="">Todos los tipos</option><option>Diezmo</option><option>Ofrenda</option></select>
                    <select className="filter-select" value={filterMes} onChange={e => setFilterMes(e.target.value)}><option value="">Todos los meses</option>{MS_SHORT.map((m, i) => <option key={m} value={`${new Date().getFullYear()}-${String(i+1).padStart(2, '0')}`}>{m}</option>)}</select>
                    <select className="filter-select" value={filterDador} onChange={e => setFilterDador(e.target.value)}><option value="">Todos los dadores</option>{colaboradores.map(c => <option key={c.id} value={c.id}>{c.nombre} {c.apellido}</option>)}</select>
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
                        <thead><tr><th>#</th><th>Dador</th><th>Tipo</th><th>Monto</th><th>Fecha</th><th>Servicio</th><th>Método</th><th>Recibo</th><th>Acciones</th></tr></thead>
                        <tbody>
                                 {registrosFiltrados.map((a) => (
                                     <tr key={a.id}>
                                         <td style={{color: 'var(--dim)'}}>{aportes.indexOf(a) + 1}</td>
                                         <td style={{fontWeight: 600}}>{colaboradores.find(c => c.id === a.miembroId)?.nombre || grupos.find(g => g.id === a.grupoId)?.nombre || 'Anónimo'}</td>
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
                    <button className="btn btn-gold" onClick={() => { resetD(); setModal('dador'); }}>➕ Nuevo Dador</button>
                    <button className="btn btn-secondary" onClick={() => exportDiezmadoresPDF({ colaboradores, aportes, anio: new Date().getFullYear().toString() })}>📄 Exportar PDF</button>
                </div>
                <div className="search-bar">
                    <input className="search-input" placeholder="🔍 Buscar dador..." value={searchDz} onChange={e => setSearchDz(e.target.value)} />
                    <select className="filter-select" value={filterZona} onChange={e => setFilterZona(e.target.value)}><option value="">Todas las zonas</option><option>Norte</option><option>Sur</option><option>Este</option><option>Oeste</option><option>Centro</option></select>
                    <select className="filter-select" value={filterEstado} onChange={e => setFilterEstado(e.target.value)}><option value="">Todos</option><option>Activo</option><option>Irregular</option><option>Inactivo</option></select>
                </div>
                <div className="dz-grid">
                    {colaboradores.filter(d => (!searchDz || `${d.nombre} ${d.apellido}`.toLowerCase().includes(searchDz.toLowerCase())) && (!filterZona || (d as any).zona === filterZona) && (!filterEstado || d.estado === filterEstado)).map(d => {
                        const regs = aportes.filter(a => a.miembroId === d.id);
                        const total = regs.reduce((s, a) => s + (a.monto || 0), 0);
                        const mesK = new Date().toISOString().slice(0, 7);
                        const alDia = regs.some(a => monthKey(a.fecha) === mesK);
                        return (
                                 <div key={d.id} className="card" onClick={() => { setViewDador(d); setModal('verD'); }} style={{cursor: 'pointer', border: '1px solid var(--border)', background: 'var(--bg)', padding: '16px', borderRadius: '16px', position: 'relative', overflow: 'hidden'}}>
                                     <div style={{display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px'}}>
                                         <div style={{width: '50px', height: '50px', borderRadius: '50%', background: 'var(--gold-glow)', border: '2px solid var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: 'var(--gold)', fontSize: '16px'}}>{d.nombre[0]}{d.apellido[0]}</div>
                                         <div style={{flex: 1}}>
                                             <div style={{fontWeight: 800, fontSize: '18px', lineHeight: '1.2'}}>{d.nombre} {d.apellido}</div>
                                             <div style={{color: 'var(--gold)', fontSize: '13px'}}>{(d as any).zona || 'Sin zona'}</div>
                                         </div>
                                         <span className={`badge ${d.estado === 'Activo' ? 'badge-green' : 'badge-red'}`} style={{fontSize: '11px', padding: '4px 12px'}}>{d.estado}</span>
                                     </div>
                                     <div style={{display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', marginBottom: '8px', color: 'var(--dim)'}}>
                                         <span>💰 Total: <span style={{color: 'var(--gold)', fontWeight: 700}}>{money(total)}</span></span>
                                         <span style={{opacity: 0.5}}>•</span>
                                         <span>📋 {regs.length} registros</span>
                                         <span style={{opacity: 0.5}}>•</span>
                                         <span>Base: <span style={{color: 'var(--dim)'}}>{money((d as any).base || 0)}</span></span>
                                     </div>
                                     {(() => {
                                         const base = (d as any).base || 0;
                                         const metaAnual = base * 12;
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

        {tab === 'resumen' && (
            <div className="page-content">
                <div className="actions-row" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px'}}>
                    <div style={{display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap'}}>
                        <span style={{fontSize: '18px', fontWeight: 700}}>📅 Año:</span>
                        <select className="filter-select" value={anioResumen} onChange={e => setAnioResumen(e.target.value)} style={{fontWeight: 600}}>
                            {[...new Set(aportes.map(a => a.fecha.slice(0, 4)))].sort().reverse().map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                        <button className="btn btn-secondary" onClick={() => {
                            if (subTab === 'general') exportResumenGeneralPDF({ resumenAnual, resumenCompleto, anio: anioResumen });
                            else if (subTab === 'mensual') exportResumenMensualPDF({ mesesData: resumenCompleto.mesesData, resumenAnual, anio: anioResumen });
                            else if (subTab === 'top') exportTopPDF({ topDadores: resumenCompleto.topDadores, topGrupos: resumenCompleto.topGrupos, anio: anioResumen });
                            else if (subTab === 'metas') exportMetasPDF({ cumplimiento, anio: anioResumen, colaboradores, grupos });
                            else if (subTab === 'cumplimiento') exportCumplimientoPDF({ cumplimiento, anio: anioResumen });
                        }}>📄 Exportar PDF</button>
                    </div>
                    <div style={{padding: '8px 16px', background: 'var(--gold-glow)', borderRadius: '12px', border: '1px solid var(--gold)', fontSize: '14px', fontWeight: 700, color: 'var(--gold)', display: 'flex', alignItems: 'center', gap: '8px'}}>
                        <span style={{fontSize: '18px'}}>💰</span> Total Anual: {money(resumenAnual.total)}
                    </div>
                </div>

                <div className="tabs" style={{marginBottom: '20px', flexWrap: 'wrap'}}>
                    {[{k: 'general', l: '📈 GENERAL'}, {k: 'mensual', l: '📊 MENSUAL'}, {k: 'top', l: '🏅 TOP'}, {k: 'metas', l: '🎯 METAS'}, {k: 'cumplimiento', l: '✅ CUMPLIMIENTO'}].map(s => (
                        <button key={s.k} className={`tab ${subTab === s.k ? 'active' : ''}`} onClick={() => setSubTab(s.k as any)}>{s.l}</button>
                    ))}
                </div>

                {subTab === 'general' && (
                    <>
                        <div className="kpis" style={{marginBottom: '24px'}}>
                            <div className="kpi" style={{'--accent': 'var(--gold)'} as any}>
                                <div className="kpi-label">Total Recaudado</div>
                                <div className="kpi-value">{money(resumenAnual.total)}</div>
                                {resumenCompleto.variacionTotal !== null && (
                                    <div style={{fontSize: '12px', fontWeight: 700, marginTop: '4px', color: resumenCompleto.variacionTotal >= 0 ? 'var(--green)' : 'var(--red)'}}>
                                        {resumenCompleto.variacionTotal >= 0 ? '↗' : '↘'} {Math.abs(resumenCompleto.variacionTotal).toFixed(1)}% vs {parseInt(anioResumen) - 1}
                                    </div>
                                )}
                                <div className="kpi-icon">💰</div>
                            </div>
                            <div className="kpi" style={{'--accent': 'var(--green)'} as any}>
                                <div className="kpi-label">Diezmos</div>
                                <div className="kpi-value">{money(resumenAnual.diezmos)}</div>
                                {resumenCompleto.variacionDiezmos !== null && (
                                    <div style={{fontSize: '12px', fontWeight: 700, marginTop: '4px', color: resumenCompleto.variacionDiezmos >= 0 ? 'var(--green)' : 'var(--red)'}}>
                                        {resumenCompleto.variacionDiezmos >= 0 ? '↗' : '↘'} {Math.abs(resumenCompleto.variacionDiezmos).toFixed(1)}% vs {parseInt(anioResumen) - 1}
                                    </div>
                                )}
                                <div className="kpi-icon">🙏</div>
                            </div>
                            <div className="kpi" style={{'--accent': 'var(--yellow)'} as any}>
                                <div className="kpi-label">Ofrendas</div>
                                <div className="kpi-value">{money(resumenAnual.ofrendas)}</div>
                                {resumenCompleto.variacionOfrendas !== null && (
                                    <div style={{fontSize: '12px', fontWeight: 700, marginTop: '4px', color: resumenCompleto.variacionOfrendas >= 0 ? 'var(--green)' : 'var(--red)'}}>
                                        {resumenCompleto.variacionOfrendas >= 0 ? '↗' : '↘'} {Math.abs(resumenCompleto.variacionOfrendas).toFixed(1)}% vs {parseInt(anioResumen) - 1}
                                    </div>
                                )}
                                <div className="kpi-icon">🎁</div>
                            </div>
                            <div className="kpi" style={{'--accent': 'var(--blue)'} as any}>
                                <div className="kpi-label">Dadores Activos</div>
                                <div className="kpi-value">{resumenCompleto.dadoresActivosAnio}</div>
                                <div style={{fontSize: '12px', fontWeight: 600, marginTop: '4px', color: 'var(--dim)'}}>de {colaboradores.length} registrados</div>
                                <div className="kpi-icon">👥</div>
                            </div>
                        </div>

                        <div className="card">
                            <div className="card-header">
                                <h3 className="card-title">📈 Estadísticas Destacadas</h3>
                            </div>
                            <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px'}}>
                                <div style={{padding: '16px', background: 'var(--bg-input)', borderRadius: '12px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '12px'}}>
                                    <div style={{width: '44px', height: '44px', borderRadius: '12px', background: 'var(--gold-glow)', border: '1px solid var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px'}}>🏆</div>
                                    <div>
                                        <div style={{fontSize: '11px', color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600}}>Mejor Mes</div>
                                        <div style={{fontSize: '16px', fontWeight: 800, color: 'var(--gold)'}}>{resumenCompleto.mejorMes ? resumenCompleto.mejorMes.mes : '—'}</div>
                                        {resumenCompleto.mejorMes && <div style={{fontSize: '12px', color: 'var(--dim)'}}>{money(resumenCompleto.mejorMes.total)}</div>}
                                    </div>
                                </div>
                                <div style={{padding: '16px', background: 'var(--bg-input)', borderRadius: '12px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '12px'}}>
                                    <div style={{width: '44px', height: '44px', borderRadius: '12px', background: 'var(--bg-input)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px'}}>📊</div>
                                    <div>
                                        <div style={{fontSize: '11px', color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600}}>Promedio Mensual</div>
                                        <div style={{fontSize: '16px', fontWeight: 800, color: 'var(--green)'}}>{money(resumenCompleto.promedioMensual)}</div>
                                        <div style={{fontSize: '12px', color: 'var(--dim)'}}>con actividad</div>
                                    </div>
                                </div>
                                <div style={{padding: '16px', background: 'var(--bg-input)', borderRadius: '12px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '12px'}}>
                                    <div style={{width: '44px', height: '44px', borderRadius: '12px', background: 'var(--bg-input)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px'}}>📋</div>
                                    <div>
                                        <div style={{fontSize: '11px', color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600}}>Total Aportes</div>
                                        <div style={{fontSize: '16px', fontWeight: 800, color: 'var(--blue)'}}>{resumenCompleto.totalAportes}</div>
                                        <div style={{fontSize: '12px', color: 'var(--dim)'}}>registros del año</div>
                                    </div>
                                </div>
                                <div style={{padding: '16px', background: 'var(--bg-input)', borderRadius: '12px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '12px'}}>
                                    <div style={{width: '44px', height: '44px', borderRadius: '12px', background: 'var(--bg-input)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px'}}>⛪</div>
                                    <div>
                                        <div style={{fontSize: '11px', color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600}}>Grupos Activos</div>
                                        <div style={{fontSize: '16px', fontWeight: 800, color: 'var(--yellow)'}}>{resumenCompleto.gruposConOfrenda}</div>
                                        <div style={{fontSize: '12px', color: 'var(--dim)'}}>con ofrenda</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {subTab === 'mensual' && (
                    <>
                        <div className="card" style={{marginBottom: '24px'}}>
                            <div className="card-header">
                                <h3 className="card-title">📊 Recaudación Mensual Visual</h3>
                            </div>
                            <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                                {resumenCompleto.mesesData.map((m, i) => {
                                    const isCurrent = i === new Date().getMonth() && parseInt(anioResumen) === new Date().getFullYear();
                                    const pctDz = m.total > 0 ? (m.diezmos / m.total) * 100 : 0;
                                    const pctOf = m.total > 0 ? (m.ofrendas / m.total) * 100 : 0;
                                    return (
                                        <div key={m.mes} style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                                            <div style={{width: '40px', fontSize: '12px', fontWeight: 700, color: isCurrent ? 'var(--gold)' : 'var(--dim)', textTransform: 'uppercase'}}>{m.mes}</div>
                                            <div style={{flex: 1, height: '32px', background: 'var(--bg-input)', borderRadius: '8px', overflow: 'hidden', position: 'relative', border: isCurrent ? '1px solid var(--gold)' : '1px solid var(--border)'}}>
                                                {m.total > 0 && (
                                                    <>
                                                        <div style={{position: 'absolute', left: 0, top: 0, width: `${pctDz}%`, height: '100%', background: 'var(--green)', display: 'flex', alignItems: 'center', paddingLeft: '8px', fontSize: '10px', fontWeight: 700, color: 'white', transition: 'width 0.5s'}}>
                                                            {pctDz >= 20 && `${pctDz.toFixed(0)}%`}
                                                        </div>
                                                        <div style={{position: 'absolute', left: `${pctDz}%`, top: 0, width: `${pctOf}%`, height: '100%', background: 'var(--yellow)', display: 'flex', alignItems: 'center', paddingLeft: '8px', fontSize: '10px', fontWeight: 700, color: '#1a1a1a', transition: 'width 0.5s'}}>
                                                            {pctOf >= 20 && `${pctOf.toFixed(0)}%`}
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                            <div style={{width: '90px', textAlign: 'right', fontSize: '13px', fontWeight: 700, color: m.total > 0 ? 'var(--gold)' : 'var(--dim)'}}>{money(m.total)}</div>
                                        </div>
                                    );
                                })}
                            </div>
                            <div style={{display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border)', fontSize: '12px'}}>
                                <div style={{display: 'flex', alignItems: 'center', gap: '6px'}}><div style={{width: '12px', height: '12px', borderRadius: '3px', background: 'var(--green)'}}></div><span style={{color: 'var(--dim)'}}>Diezmos</span></div>
                                <div style={{display: 'flex', alignItems: 'center', gap: '6px'}}><div style={{width: '12px', height: '12px', borderRadius: '3px', background: 'var(--yellow)'}}></div><span style={{color: 'var(--dim)'}}>Ofrendas</span></div>
                                <div style={{display: 'flex', alignItems: 'center', gap: '6px'}}><div style={{width: '12px', height: '12px', borderRadius: '3px', border: '1px solid var(--gold)'}}></div><span style={{color: 'var(--dim)'}}>Mes actual</span></div>
                            </div>
                        </div>

                        <div className="card">
                            <div className="card-header">
                                <h3 className="card-title">📅 Detalle Mensual de Recaudación</h3>
                            </div>
                            <table className="data-table">
                                <thead>
                                    <tr style={{background: 'var(--bg-input)'}}>
                                        <th style={{textAlign: 'left'}}>MES</th>
                                        <th style={{textAlign: 'right'}}>DIEZMOS</th>
                                        <th style={{textAlign: 'right'}}>OFRENDAS</th>
                                        <th style={{textAlign: 'right', color: 'var(--gold)'}}>TOTAL</th>
                                        <th style={{textAlign: 'center'}}>%</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {resumenCompleto.mesesData.map((m, i) => {
                                        const isCurrent = i === new Date().getMonth() && parseInt(anioResumen) === new Date().getFullYear();
                                        const pctAnual = resumenAnual.total > 0 ? (m.total / resumenAnual.total) * 100 : 0;
                                        return (
                                            <tr key={m.mes} style={{background: isCurrent ? 'var(--gold-glow)' : (m.total > 0 ? 'var(--bg-input)' : 'transparent'), transition: 'background 0.2s', borderLeft: isCurrent ? '3px solid var(--gold)' : 'none'}}>
                                                <td style={{fontWeight: 600}}>{m.mes} {isCurrent && '⭐'}</td>
                                                <td style={{textAlign: 'right', color: m.diezmos > 0 ? 'var(--green)' : 'var(--dim)'}}>{money(m.diezmos)}</td>
                                                <td style={{textAlign: 'right', color: m.ofrendas > 0 ? 'var(--yellow)' : 'var(--dim)'}}>{money(m.ofrendas)}</td>
                                                <td style={{textAlign: 'right', fontWeight: 700, color: m.total > 0 ? 'var(--gold)' : 'var(--dim)'}}>{money(m.total)}</td>
                                                <td style={{textAlign: 'center', color: 'var(--dim)', fontSize: '12px'}}>{pctAnual > 0 ? `${pctAnual.toFixed(1)}%` : '—'}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                <tfoot>
                                    <tr style={{background: 'var(--bg-input)', fontWeight: 800, fontSize: '15px'}}>
                                        <td>TOTAL ANUAL</td>
                                        <td style={{textAlign: 'right', color: 'var(--green)'}}>{money(resumenAnual.diezmos)}</td>
                                        <td style={{textAlign: 'right', color: 'var(--yellow)'}}>{money(resumenAnual.ofrendas)}</td>
                                        <td style={{textAlign: 'right', color: 'var(--gold)'}}>{money(resumenAnual.total)}</td>
                                        <td style={{textAlign: 'center', color: 'var(--gold)'}}>100%</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </>
                )}

                {subTab === 'top' && (
                    <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px'}}>
                        <div className="card">
                            <div className="card-header">
                                <h3 className="card-title">🏅 Top 5 Dadores del Año</h3>
                            </div>
                            {resumenCompleto.topDadores.length > 0 ? (
                                <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                                    {resumenCompleto.topDadores.map((d, i) => {
                                        const medals = ['🥇', '🥈', '🥉'];
                                        const color = ['var(--gold)', 'var(--blue)', 'var(--purple)'];
                                        const pct = resumenCompleto.topDadores[0].total > 0 ? (d.total / resumenCompleto.topDadores[0].total) * 100 : 0;
                                        return (
                                            <div key={d.id} style={{display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', background: 'var(--bg-input)', borderRadius: '10px', border: '1px solid var(--border)'}}>
                                                <div style={{width: '36px', height: '36px', borderRadius: '50%', background: i < 3 ? 'var(--gold-glow)' : 'var(--bg)', border: `2px solid ${i < 3 ? color[i] : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 800, color: i < 3 ? color[i] : 'var(--dim)'}}>
                                                    {i < 3 ? medals[i] : (i + 1)}
                                                </div>
                                                <div style={{flex: 1, minWidth: 0}}>
                                                    <div style={{fontWeight: 700, fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{d.nombre} {d.apellido}</div>
                                                    <div style={{fontSize: '11px', color: 'var(--dim)'}}>{d.zona || 'Sin zona'} • {d.regs} aportes</div>
                                                    <div style={{height: '4px', background: 'var(--border)', borderRadius: '2px', overflow: 'hidden', marginTop: '4px'}}>
                                                        <div style={{height: '100%', width: `${pct}%`, background: i === 0 ? 'var(--gold)' : i === 1 ? 'var(--blue)' : 'var(--purple)', transition: 'width 0.5s'}}></div>
                                                    </div>
                                                </div>
                                                <div style={{fontWeight: 800, color: 'var(--gold)', fontSize: '14px', whiteSpace: 'nowrap'}}>{money(d.total)}</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div style={{textAlign: 'center', padding: '30px', color: 'var(--dim)'}}>No hay aportes este año</div>
                            )}
                        </div>

                        <div className="card">
                            <div className="card-header">
                                <h3 className="card-title">⛪ Top 5 Grupos con Ofrendas</h3>
                            </div>
                            {resumenCompleto.topGrupos.length > 0 ? (
                                <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                                    {resumenCompleto.topGrupos.map((g, i) => {
                                        const medals = ['🥇', '🥈', '🥉'];
                                        const color = ['var(--gold)', 'var(--blue)', 'var(--purple)'];
                                        const pct = resumenCompleto.topGrupos[0].total > 0 ? (g.total / resumenCompleto.topGrupos[0].total) * 100 : 0;
                                        return (
                                            <div key={g.id} style={{display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', background: 'var(--bg-input)', borderRadius: '10px', border: '1px solid var(--border)'}}>
                                                <div style={{width: '36px', height: '36px', borderRadius: '50%', background: i < 3 ? 'var(--gold-glow)' : 'var(--bg)', border: `2px solid ${i < 3 ? color[i] : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 800, color: i < 3 ? color[i] : 'var(--dim)'}}>
                                                    {i < 3 ? medals[i] : (i + 1)}
                                                </div>
                                                <div style={{flex: 1, minWidth: 0}}>
                                                    <div style={{fontWeight: 700, fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{g.nombre}</div>
                                                    <div style={{fontSize: '11px', color: 'var(--dim)'}}>{g.zona || 'Sin zona'} • {g.regs} ofrendas</div>
                                                    <div style={{height: '4px', background: 'var(--border)', borderRadius: '2px', overflow: 'hidden', marginTop: '4px'}}>
                                                        <div style={{height: '100%', width: `${pct}%`, background: i === 0 ? 'var(--gold)' : i === 1 ? 'var(--blue)' : 'var(--purple)', transition: 'width 0.5s'}}></div>
                                                    </div>
                                                </div>
                                                <div style={{fontWeight: 800, color: 'var(--gold)', fontSize: '14px', whiteSpace: 'nowrap'}}>{money(g.total)}</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div style={{textAlign: 'center', padding: '30px', color: 'var(--dim)'}}>No hay ofrendas de grupos este año</div>
                            )}
                        </div>
                    </div>
                )}

                {subTab === 'metas' && (
                    <>
                        <div className="card" style={{marginBottom: '24px'}}>
                            <div className="card-header">
                                <h3 className="card-title">🎯 Resumen del Plan Propuesto</h3>
                            </div>
                            <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px'}}>
                                <div style={{padding: '16px', background: 'var(--bg-input)', borderRadius: '12px', border: '1px solid var(--border)', textAlign: 'center'}}>
                                    <div style={{fontSize: '12px', color: 'var(--dim)', marginBottom: '6px', textTransform: 'uppercase', fontWeight: 600}}>Meta Mensual Global</div>
                                    <div style={{fontSize: '20px', fontWeight: 800, color: 'var(--blue)'}}>{money(cumplimiento.metaGlobalMes)}</div>
                                    <div style={{fontSize: '11px', color: 'var(--dim)', marginTop: '4px'}}>{colaboradores.filter(c => (c as any).base > 0).length} dadores + {grupos.filter(g => (g as any).metaMensual > 0).length} grupos</div>
                                </div>
                                <div style={{padding: '16px', background: 'var(--gold-glow)', borderRadius: '12px', border: '1px solid var(--gold)', textAlign: 'center'}}>
                                    <div style={{fontSize: '12px', color: 'var(--gold)', marginBottom: '6px', textTransform: 'uppercase', fontWeight: 700}}>Meta Anual Global</div>
                                    <div style={{fontSize: '20px', fontWeight: 800, color: 'var(--gold)'}}>{money(cumplimiento.metaGlobalAnual)}</div>
                                    <div style={{fontSize: '11px', color: 'var(--gold)', marginTop: '4px'}}>Plan total del año</div>
                                </div>
                                <div style={{padding: '16px', background: 'var(--bg-input)', borderRadius: '12px', border: '1px solid var(--border)', textAlign: 'center'}}>
                                    <div style={{fontSize: '12px', color: 'var(--dim)', marginBottom: '6px', textTransform: 'uppercase', fontWeight: 600}}>Recaudado a la Fecha</div>
                                    <div style={{fontSize: '20px', fontWeight: 800, color: 'var(--green)'}}>{money(cumplimiento.totalRecAnio)}</div>
                                    <div style={{fontSize: '11px', color: 'var(--dim)', marginTop: '4px'}}>de {cumplimiento.metaGlobalAnual > 0 ? money(cumplimiento.metaGlobalAnual) : 'sin meta'}</div>
                                </div>
                                <div style={{padding: '16px', background: cumplimiento.pctGlobal >= 100 ? 'var(--gold-glow)' : 'var(--bg-input)', borderRadius: '12px', border: `1px solid ${cumplimiento.pctGlobal >= 100 ? 'var(--gold)' : 'var(--border)'}`, textAlign: 'center'}}>
                                    <div style={{fontSize: '12px', color: 'var(--dim)', marginBottom: '6px', textTransform: 'uppercase', fontWeight: 600}}>% Cumplimiento</div>
                                    <div style={{fontSize: '20px', fontWeight: 800, color: cumplimiento.pctGlobal >= 100 ? 'var(--gold)' : cumplimiento.pctGlobal >= 70 ? 'var(--green)' : 'var(--red)'}}>{cumplimiento.metaGlobalAnual > 0 ? `${cumplimiento.pctGlobal.toFixed(1)}%` : '—'}</div>
                                    <div style={{fontSize: '11px', color: 'var(--dim)', marginTop: '4px'}}>vs meta anual</div>
                                </div>
                            </div>
                        </div>

                        <div className="card" style={{marginBottom: '24px'}}>
                            <div className="card-header">
                                <h3 className="card-title">👥 Plan de Diezmos por Dador</h3>
                            </div>
                            <table className="data-table">
                                <thead>
                                    <tr style={{background: 'var(--bg-input)'}}>
                                        <th style={{textAlign: 'left'}}>DADOR</th>
                                        <th style={{textAlign: 'left'}}>ZONA</th>
                                        <th style={{textAlign: 'right'}}>BASE MENSUAL</th>
                                        <th style={{textAlign: 'right'}}>META ANUAL</th>
                                        <th style={{textAlign: 'right'}}>RECAUDADO</th>
                                        <th style={{textAlign: 'center'}}>%</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {cumplimiento.cumplimientoDadores.map(d => {
                                        const semaforo = d.pct === null ? 'none' : d.pct >= 100 ? 'green' : d.pct >= 70 ? 'yellow' : 'red';
                                        const colorSem = semaforo === 'green' ? 'var(--green)' : semaforo === 'yellow' ? 'var(--yellow)' : semaforo === 'red' ? 'var(--red)' : 'var(--dim)';
                                        return (
                                            <tr key={d.id}>
                                                <td style={{fontWeight: 600}}>{d.nombre} {d.apellido}</td>
                                                <td style={{color: 'var(--dim)'}}>{d.zona}</td>
                                                <td style={{textAlign: 'right'}}>{d.base > 0 ? money(d.base) : '—'}</td>
                                                <td style={{textAlign: 'right'}}>{d.base > 0 ? money(d.metaAnual) : '—'}</td>
                                                <td style={{textAlign: 'right', fontWeight: 700, color: 'var(--gold)'}}>{money(d.total)}</td>
                                                <td style={{textAlign: 'center'}}>
                                                    {d.pct !== null ? (
                                                        <span style={{padding: '4px 10px', borderRadius: '12px', background: `${colorSem}22`, color: colorSem, fontWeight: 700, fontSize: '12px', border: `1px solid ${colorSem}`}}>{d.pct.toFixed(0)}%</span>
                                                    ) : <span style={{color: 'var(--dim)'}}>—</span>}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                <tfoot>
                                    <tr style={{background: 'var(--bg-input)', fontWeight: 800}}>
                                        <td colSpan={2}>TOTAL DADORES</td>
                                        <td style={{textAlign: 'right'}}>{money(cumplimiento.cumplimientoDadores.reduce((s, d) => s + d.base, 0))}</td>
                                        <td style={{textAlign: 'right'}}>{money(cumplimiento.cumplimientoDadores.reduce((s, d) => s + d.metaAnual, 0))}</td>
                                        <td style={{textAlign: 'right', color: 'var(--gold)'}}>{money(cumplimiento.cumplimientoDadores.reduce((s, d) => s + d.total, 0))}</td>
                                        <td style={{textAlign: 'center'}}>—</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        <div className="card">
                            <div className="card-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                                <h3 className="card-title">⛪ Plan de Ofrendas por Grupo</h3>
                                <div style={{fontSize: '12px', color: 'var(--dim)'}}>Edita la meta mensual haciendo clic en el valor</div>
                            </div>
                            <table className="data-table">
                                <thead>
                                    <tr style={{background: 'var(--bg-input)'}}>
                                        <th style={{textAlign: 'left'}}>GRUPO</th>
                                        <th style={{textAlign: 'left'}}>ZONA</th>
                                        <th style={{textAlign: 'right'}}>META MENSUAL</th>
                                        <th style={{textAlign: 'right'}}>META ANUAL</th>
                                        <th style={{textAlign: 'right'}}>RECAUDADO</th>
                                        <th style={{textAlign: 'center'}}>%</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {cumplimiento.cumplimientoGrupos.map(g => {
                                        const semaforo = g.pct === null ? 'none' : g.pct >= 100 ? 'green' : g.pct >= 70 ? 'yellow' : 'red';
                                        const colorSem = semaforo === 'green' ? 'var(--green)' : semaforo === 'yellow' ? 'var(--yellow)' : semaforo === 'red' ? 'var(--red)' : 'var(--dim)';
                                        return (
                                            <tr key={g.id}>
                                                <td style={{fontWeight: 600}}>{g.nombre}</td>
                                                <td style={{color: 'var(--dim)'}}>{g.zona}</td>
                                                <td style={{textAlign: 'right'}}>
                                                    <input type="number" min="0" step="0.01" defaultValue={g.metaMensual} onBlur={async (e) => {
                                                        const v = parseFloat(e.target.value) || 0;
                                                        if (v !== g.metaMensual) {
                                                            await db.grupos.update(g.id, { metaMensual: v } as any);
                                                            showToast(`Meta de ${g.nombre} actualizada`);
                                                        }
                                                    }} style={{width: '90px', textAlign: 'right', padding: '4px 8px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--gold)', fontWeight: 600, fontSize: '13px'}} />
                                                </td>
                                                <td style={{textAlign: 'right'}}>{g.metaMensual > 0 ? money(g.metaAnual) : '—'}</td>
                                                <td style={{textAlign: 'right', fontWeight: 700, color: 'var(--gold)'}}>{money(g.total)}</td>
                                                <td style={{textAlign: 'center'}}>
                                                    {g.pct !== null ? (
                                                        <span style={{padding: '4px 10px', borderRadius: '12px', background: `${colorSem}22`, color: colorSem, fontWeight: 700, fontSize: '12px', border: `1px solid ${colorSem}`}}>{g.pct.toFixed(0)}%</span>
                                                    ) : <span style={{color: 'var(--dim)'}}>—</span>}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                <tfoot>
                                    <tr style={{background: 'var(--bg-input)', fontWeight: 800}}>
                                        <td colSpan={2}>TOTAL GRUPOS</td>
                                        <td style={{textAlign: 'right'}}>{money(cumplimiento.cumplimientoGrupos.reduce((s, g) => s + g.metaMensual, 0))}</td>
                                        <td style={{textAlign: 'right'}}>{money(cumplimiento.cumplimientoGrupos.reduce((s, g) => s + g.metaAnual, 0))}</td>
                                        <td style={{textAlign: 'right', color: 'var(--gold)'}}>{money(cumplimiento.cumplimientoGrupos.reduce((s, g) => s + g.total, 0))}</td>
                                        <td style={{textAlign: 'center'}}>—</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </>
                )}

                {subTab === 'cumplimiento' && (
                    <>
                        <div className="kpis" style={{marginBottom: '24px'}}>
                            <div className="kpi" style={{'--accent': 'var(--gold)'} as any}>
                                <div className="kpi-label">Meta Anual</div>
                                <div className="kpi-value">{money(cumplimiento.metaGlobalAnual)}</div>
                                <div className="kpi-icon">🎯</div>
                            </div>
                            <div className="kpi" style={{'--accent': 'var(--green)'} as any}>
                                <div className="kpi-label">Recaudado</div>
                                <div className="kpi-value">{money(cumplimiento.totalRecAnio)}</div>
                                <div className="kpi-icon">💰</div>
                            </div>
                            <div className="kpi" style={{'--accent': cumplimiento.pctGlobal >= 100 ? 'var(--gold)' : cumplimiento.pctGlobal >= 70 ? 'var(--green)' : 'var(--red)'} as any}>
                                <div className="kpi-label">% Cumplimiento</div>
                                <div className="kpi-value">{cumplimiento.metaGlobalAnual > 0 ? `${cumplimiento.pctGlobal.toFixed(1)}%` : '—'}</div>
                                <div style={{fontSize: '11px', fontWeight: 600, marginTop: '4px'}}>
                                    {cumplimiento.pctGlobal >= 100 ? '🎉 ¡Meta alcanzada!' : cumplimiento.pctGlobal >= 70 ? '👍 En camino' : '⚠️ Por debajo'}
                                </div>
                                <div className="kpi-icon">{cumplimiento.pctGlobal >= 100 ? '🏆' : cumplimiento.pctGlobal >= 70 ? '📈' : '⚠️'}</div>
                            </div>
                            <div className="kpi" style={{'--accent': 'var(--blue)'} as any}>
                                <div className="kpi-label">{cumplimiento.totalRecAnio >= cumplimiento.metaGlobalAnual ? 'Superávit' : 'Faltante'}</div>
                                <div className="kpi-value">{money(Math.abs(cumplimiento.metaGlobalAnual - cumplimiento.totalRecAnio))}</div>
                                <div className="kpi-icon">{cumplimiento.totalRecAnio >= cumplimiento.metaGlobalAnual ? '✨' : '⏳'}</div>
                            </div>
                        </div>

                        <div className="card" style={{marginBottom: '24px'}}>
                            <div className="card-header">
                                <h3 className="card-title">📊 Progreso General del Año</h3>
                            </div>
                            <div style={{padding: '8px 0'}}>
                                <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px'}}>
                                    <span style={{color: 'var(--dim)'}}>{money(cumplimiento.totalRecAnio)} de {money(cumplimiento.metaGlobalAnual)}</span>
                                    <span style={{fontWeight: 700, color: cumplimiento.pctGlobal >= 100 ? 'var(--gold)' : cumplimiento.pctGlobal >= 70 ? 'var(--green)' : 'var(--red)'}}>{cumplimiento.metaGlobalAnual > 0 ? `${cumplimiento.pctGlobal.toFixed(1)}%` : '—'}</span>
                                </div>
                                <div style={{height: '24px', background: 'var(--bg-input)', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border)', position: 'relative'}}>
                                    <div style={{height: '100%', width: `${Math.min(cumplimiento.pctGlobal, 100)}%`, background: `linear-gradient(90deg, var(--green), var(--gold))`, transition: 'width 0.6s', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '8px', fontSize: '11px', fontWeight: 700, color: 'white'}}></div>
                                </div>
                                <div style={{display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '12px', color: 'var(--dim)'}}>
                                    <span>📍 Mes actual: {money(cumplimiento.totalRecMesActual)} / esperado {money(cumplimiento.metaGlobalMes)}</span>
                                    <span>📈 Acumulado esperado: {money(cumplimiento.metaAcumuladaEsperada)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="card" style={{marginBottom: '24px'}}>
                            <div className="card-header">
                                <h3 className="card-title">📅 Cumplimiento Mensual</h3>
                            </div>
                            <table className="data-table">
                                <thead>
                                    <tr style={{background: 'var(--bg-input)'}}>
                                        <th style={{textAlign: 'left'}}>MES</th>
                                        <th style={{textAlign: 'right'}}>META DEL MES</th>
                                        <th style={{textAlign: 'right'}}>REAL</th>
                                        <th style={{textAlign: 'center'}}>% MES</th>
                                        <th style={{textAlign: 'right'}}>META ACUM.</th>
                                        <th style={{textAlign: 'right'}}>REAL ACUM.</th>
                                        <th style={{textAlign: 'center'}}>% ACUM.</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {cumplimiento.mensuales.map((m, i) => {
                                        const semaforoM = m.pct === null ? 'none' : m.pct >= 100 ? 'green' : m.pct >= 70 ? 'yellow' : 'red';
                                        const semaforoA = m.pctAcumulado === null ? 'none' : m.pctAcumulado >= 100 ? 'green' : m.pctAcumulado >= 70 ? 'yellow' : 'red';
                                        const colorM = semaforoM === 'green' ? 'var(--green)' : semaforoM === 'yellow' ? 'var(--yellow)' : semaforoM === 'red' ? 'var(--red)' : 'var(--dim)';
                                        const colorA = semaforoA === 'green' ? 'var(--green)' : semaforoA === 'yellow' ? 'var(--yellow)' : semaforoA === 'red' ? 'var(--red)' : 'var(--dim)';
                                        const isCurrent = i === new Date().getMonth();
                                        return (
                                            <tr key={m.etiqueta} style={{background: isCurrent ? 'var(--gold-glow)' : (m.total > 0 ? 'var(--bg-input)' : 'transparent'), borderLeft: isCurrent ? '3px solid var(--gold)' : 'none'}}>
                                                <td style={{fontWeight: 600}}>{m.etiqueta} {isCurrent && '⭐'}</td>
                                                <td style={{textAlign: 'right', color: 'var(--dim)'}}>{cumplimiento.metaGlobalMes > 0 ? money(m.metaEsperada) : '—'}</td>
                                                <td style={{textAlign: 'right', fontWeight: 700, color: m.total > 0 ? 'var(--gold)' : 'var(--dim)'}}>{money(m.total)}</td>
                                                <td style={{textAlign: 'center'}}>
                                                    {m.pct !== null ? (
                                                        <div style={{display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center'}}>
                                                            <div style={{width: '40px', height: '6px', background: 'var(--border)', borderRadius: '3px', overflow: 'hidden'}}>
                                                                <div style={{height: '100%', width: `${Math.min(m.pct, 100)}%`, background: colorM}}></div>
                                                            </div>
                                                            <span style={{color: colorM, fontWeight: 700, fontSize: '12px'}}>{m.pct.toFixed(0)}%</span>
                                                        </div>
                                                    ) : <span style={{color: 'var(--dim)'}}>—</span>}
                                                </td>
                                                <td style={{textAlign: 'right', color: 'var(--dim)'}}>{cumplimiento.metaGlobalMes > 0 ? money(m.metaAcumulada) : '—'}</td>
                                                <td style={{textAlign: 'right', fontWeight: 700, color: 'var(--gold)'}}>{money(m.acumulado)}</td>
                                                <td style={{textAlign: 'center'}}>
                                                    {m.pctAcumulado !== null ? (
                                                        <span style={{padding: '3px 8px', borderRadius: '10px', background: `${colorA}22`, color: colorA, fontWeight: 700, fontSize: '12px', border: `1px solid ${colorA}`}}>{m.pctAcumulado.toFixed(0)}%</span>
                                                    ) : <span style={{color: 'var(--dim)'}}>—</span>}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px', marginBottom: '24px'}}>
                            <div className="card">
                                <div className="card-header"><h3 className="card-title">📆 Por Trimestre</h3></div>
                                <table className="data-table">
                                    <thead><tr style={{background: 'var(--bg-input)'}}><th style={{textAlign: 'left'}}>PERÍODO</th><th style={{textAlign: 'right'}}>META</th><th style={{textAlign: 'right'}}>REAL</th><th style={{textAlign: 'center'}}>%</th></tr></thead>
                                    <tbody>
                                        {cumplimiento.trimestres.map(t => {
                                            const semaforo = t.pct === null ? 'none' : t.pct >= 100 ? 'green' : t.pct >= 70 ? 'yellow' : 'red';
                                            const color = semaforo === 'green' ? 'var(--green)' : semaforo === 'yellow' ? 'var(--yellow)' : semaforo === 'red' ? 'var(--red)' : 'var(--dim)';
                                            return (
                                                <tr key={t.etiqueta}>
                                                    <td style={{fontWeight: 600}}>{t.etiqueta}</td>
                                                    <td style={{textAlign: 'right', color: 'var(--dim)'}}>{cumplimiento.metaGlobalAnual > 0 ? money(t.metaEsperada) : '—'}</td>
                                                    <td style={{textAlign: 'right', fontWeight: 700, color: 'var(--gold)'}}>{money(t.total)}</td>
                                                    <td style={{textAlign: 'center'}}>{t.pct !== null ? <span style={{padding: '3px 10px', borderRadius: '10px', background: `${color}22`, color, fontWeight: 700, fontSize: '12px', border: `1px solid ${color}`}}>{t.pct.toFixed(0)}%</span> : '—'}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            <div className="card">
                                <div className="card-header"><h3 className="card-title">🗓️ Por Semestre</h3></div>
                                <table className="data-table">
                                    <thead><tr style={{background: 'var(--bg-input)'}}><th style={{textAlign: 'left'}}>PERÍODO</th><th style={{textAlign: 'right'}}>META</th><th style={{textAlign: 'right'}}>REAL</th><th style={{textAlign: 'center'}}>%</th></tr></thead>
                                    <tbody>
                                        {cumplimiento.semestres.map(s => {
                                            const semaforo = s.pct === null ? 'none' : s.pct >= 100 ? 'green' : s.pct >= 70 ? 'yellow' : 'red';
                                            const color = semaforo === 'green' ? 'var(--green)' : semaforo === 'yellow' ? 'var(--yellow)' : semaforo === 'red' ? 'var(--red)' : 'var(--dim)';
                                            return (
                                                <tr key={s.etiqueta}>
                                                    <td style={{fontWeight: 600}}>{s.etiqueta}</td>
                                                    <td style={{textAlign: 'right', color: 'var(--dim)'}}>{cumplimiento.metaGlobalAnual > 0 ? money(s.metaEsperada) : '—'}</td>
                                                    <td style={{textAlign: 'right', fontWeight: 700, color: 'var(--gold)'}}>{money(s.total)}</td>
                                                    <td style={{textAlign: 'center'}}>{s.pct !== null ? <span style={{padding: '3px 10px', borderRadius: '10px', background: `${color}22`, color, fontWeight: 700, fontSize: '12px', border: `1px solid ${color}`}}>{s.pct.toFixed(0)}%</span> : '—'}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                    <tfoot>
                                        <tr style={{background: 'var(--bg-input)', fontWeight: 800}}>
                                            <td>AÑO COMPLETO</td>
                                            <td style={{textAlign: 'right'}}>{cumplimiento.metaGlobalAnual > 0 ? money(cumplimiento.anual.metaEsperada) : '—'}</td>
                                            <td style={{textAlign: 'right', color: 'var(--gold)'}}>{money(cumplimiento.anual.total)}</td>
                                            <td style={{textAlign: 'center', color: 'var(--gold)'}}>{cumplimiento.anual.pct !== null ? `${cumplimiento.anual.pct.toFixed(1)}%` : '—'}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>

                        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px'}}>
                            <div className="card">
                                <div className="card-header"><h3 className="card-title">👥 Cumplimiento por Dador</h3></div>
                                {cumplimiento.cumplimientoDadores.length > 0 ? (
                                    <div style={{display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '400px', overflowY: 'auto'}}>
                                        {cumplimiento.cumplimientoDadores.map(d => {
                                            const semaforo = d.pct === null ? 'none' : d.pct >= 100 ? 'green' : d.pct >= 70 ? 'yellow' : 'red';
                                            const color = semaforo === 'green' ? 'var(--green)' : semaforo === 'yellow' ? 'var(--yellow)' : semaforo === 'red' ? 'var(--red)' : 'var(--dim)';
                                            return (
                                                <div key={d.id} style={{padding: '8px 12px', background: 'var(--bg-input)', borderRadius: '8px', border: '1px solid var(--border)'}}>
                                                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px'}}>
                                                        <span style={{fontWeight: 600, fontSize: '13px'}}>{d.nombre} {d.apellido}</span>
                                                        <span style={{color, fontWeight: 700, fontSize: '13px'}}>{d.pct !== null ? `${d.pct.toFixed(0)}%` : '—'}</span>
                                                    </div>
                                                    <div style={{height: '6px', background: 'var(--border)', borderRadius: '3px', overflow: 'hidden'}}>
                                                        <div style={{height: '100%', width: `${Math.min(d.pct || 0, 100)}%`, background: color, transition: 'width 0.5s'}}></div>
                                                    </div>
                                                    <div style={{display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '11px', color: 'var(--dim)'}}>
                                                        <span>{money(d.total)} / {d.base > 0 ? money(d.metaAnual) : 'sin meta'}</span>
                                                        <span>{d.zona}</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : <div style={{textAlign: 'center', padding: '30px', color: 'var(--dim)'}}>Sin dadores</div>}
                            </div>
                            <div className="card">
                                <div className="card-header"><h3 className="card-title">⛪ Cumplimiento por Grupo</h3></div>
                                {cumplimiento.cumplimientoGrupos.length > 0 ? (
                                    <div style={{display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '400px', overflowY: 'auto'}}>
                                        {cumplimiento.cumplimientoGrupos.map(g => {
                                            const semaforo = g.pct === null ? 'none' : g.pct >= 100 ? 'green' : g.pct >= 70 ? 'yellow' : 'red';
                                            const color = semaforo === 'green' ? 'var(--green)' : semaforo === 'yellow' ? 'var(--yellow)' : semaforo === 'red' ? 'var(--red)' : 'var(--dim)';
                                            return (
                                                <div key={g.id} style={{padding: '8px 12px', background: 'var(--bg-input)', borderRadius: '8px', border: '1px solid var(--border)'}}>
                                                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px'}}>
                                                        <span style={{fontWeight: 600, fontSize: '13px'}}>{g.nombre}</span>
                                                        <span style={{color, fontWeight: 700, fontSize: '13px'}}>{g.pct !== null ? `${g.pct.toFixed(0)}%` : '—'}</span>
                                                    </div>
                                                    <div style={{height: '6px', background: 'var(--border)', borderRadius: '3px', overflow: 'hidden'}}>
                                                        <div style={{height: '100%', width: `${Math.min(g.pct || 0, 100)}%`, background: color, transition: 'width 0.5s'}}></div>
                                                    </div>
                                                    <div style={{display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '11px', color: 'var(--dim)'}}>
                                                        <span>{money(g.total)} / {g.metaMensual > 0 ? money(g.metaAnual) : 'sin meta'}</span>
                                                        <span>{g.zona}</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : <div style={{textAlign: 'center', padding: '30px', color: 'var(--dim)'}}>Sin grupos</div>}
                            </div>
                        </div>
                    </>
                )}
            </div>
        )}
        {tab === 'ofrendasGrupos' && (
            <div className="page-content">
                <div className="actions-row" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '12px', flexWrap: 'wrap'}}>
                    <div style={{display: 'flex', gap: '10px', flexWrap: 'wrap'}}>
                        <button className="btn btn-gold" onClick={() => { resetA(); setATipo('Ofrenda'); setModal('aporte'); }}>➕ Registrar Ofrenda Grupo</button>
                        <button className="btn btn-secondary" onClick={() => exportGruposPDF({ grupos, aportes, anio: new Date().getFullYear().toString() })}>📄 Exportar PDF</button>
                    </div>
                    <div style={{padding: '8px 16px', background: 'var(--gold-glow)', borderRadius: '8px', border: '1px solid var(--gold)', fontSize: '14px', fontWeight: 700, color: 'var(--gold)'}}>
                        💰 Total: {money(totalOfrendasGrupos)}
                    </div>
                </div>
                <div className="search-bar">
                    <input className="search-input" placeholder="🔍 Buscar grupo..." value={searchG} onChange={e => setSearchG(e.target.value)} />
                    <select className="filter-select" value={filterGZona} onChange={e => setFilterGZona(e.target.value)}><option value="">Todas las zonas</option>{[...new Set(grupos.map(g => g.zona).filter(Boolean))].sort().map(z => <option key={z} value={z}>{z}</option>)}</select>
                    <select className="filter-select" value={filterGEstado} onChange={e => setFilterGEstado(e.target.value)}><option value="">Todos</option><option value="aldia">✅ Al día</option><option value="pendiente">⏳ Pendientes</option></select>
                </div>
                <div className="dz-grid">
                    {grupos.filter(g => {
                        if (searchG && !g.nombre.toLowerCase().includes(searchG.toLowerCase())) return false;
                        if (filterGZona && g.zona !== filterGZona) return false;
                        if (filterGEstado) {
                            const regs = ofrendasGruposFiltradas.filter(a => a.grupoId === g.id);
                            const mesK = new Date().toISOString().slice(0, 7);
                            const alDia = regs.some(a => monthKey(a.fecha) === mesK);
                            if (filterGEstado === 'aldia' && !alDia) return false;
                            if (filterGEstado === 'pendiente' && alDia) return false;
                        }
                        return true;
                    }).map(g => {
                        const regs = ofrendasGruposFiltradas.filter(a => a.grupoId === g.id);
                        const total = regs.reduce((s, a) => s + (a.monto || 0), 0);
                        const regsCount = regs.length;
                        const ultima = regs.length > 0 ? [...regs].sort((a, b) => b.fecha.localeCompare(a.fecha))[0].fecha : null;
                        const mesK = new Date().toISOString().slice(0, 7);
                        const alDia = regs.some(a => monthKey(a.fecha) === mesK);
                        const iniciales = g.nombre.split(' ').map(w => w[0] || '').join('').slice(0, 2).toUpperCase();
                        return (
                            <div key={g.id} className="card" onClick={() => { setViewGrupo(g); setModal('verG'); }} style={{cursor: 'pointer', border: '1px solid var(--border)', background: 'var(--bg)', padding: '16px', borderRadius: '16px', position: 'relative', overflow: 'hidden'}}>
                                <div style={{display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px'}}>
                                    <div style={{width: '50px', height: '50px', borderRadius: '50%', background: 'var(--gold-glow)', border: '2px solid var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: 'var(--gold)', fontSize: '16px'}}>{iniciales}</div>
                                    <div style={{flex: 1}}>
                                        <div style={{fontWeight: 800, fontSize: '18px', lineHeight: '1.2'}}>{g.nombre}</div>
                                        <div style={{color: 'var(--dim)', fontSize: '13px'}}>Grupo de Misión</div>
                                    </div>
                                </div>
                                <div style={{display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', marginBottom: '8px', color: 'var(--dim)', flexWrap: 'wrap'}}>
                                    <span>💰 Total: <span style={{color: 'var(--gold)', fontWeight: 700}}>{money(total)}</span></span>
                                    <span style={{opacity: 0.5}}>•</span>
                                    <span>📋 {regsCount} ofrendas</span>
                                    <span style={{opacity: 0.5}}>•</span>
                                    <span>📅 Última: <span style={{color: 'var(--dim)'}}>{ultima || '—'}</span></span>
                                </div>
                                {(() => {
                                    const metaMes = (g as any).metaMensual || 0;
                                    const metaAnual = metaMes * 12;
                                    if (metaAnual <= 0) return null;
                                    const pctCump = Math.min((total / metaAnual) * 100, 100);
                                    const semaforo = pctCump >= 100 ? 'var(--gold)' : pctCump >= 70 ? 'var(--green)' : 'var(--red)';
                                    return (
                                        <div style={{marginBottom: '14px'}}>
                                            <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--dim)', marginBottom: '3px'}}>
                                                <span>🎯 Meta anual: {money(metaAnual)} ({money(metaMes)}/mes)</span>
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
                                        <div style={{display: 'flex', alignItems: 'center', gap: '4px'}}><div style={{width: '8px', height: '8px', borderRadius: '50%', background: 'var(--green)'}}></div>Con ofrenda</div>
                                        <div style={{display: 'flex', alignItems: 'center', gap: '4px'}}><div style={{width: '8px', height: '8px', borderRadius: '50%', background: 'var(--border)'}}></div>Sin ofrenda</div>
                                    </div>
                                    <div style={{display: 'flex', alignItems: 'center', gap: '4px', color: alDia ? 'var(--green)' : 'var(--dim)'}}>
                                        {alDia && <span style={{fontSize: '12px'}}>✅</span>} {alDia ? 'Al día' : 'Sin ofrenda este mes'}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    {grupos.length === 0 && (
                        <div style={{gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'var(--dim)'}}>No hay grupos registrados</div>
                    )}
                    {grupos.length > 0 && grupos.filter(g => {
                        if (searchG && !g.nombre.toLowerCase().includes(searchG.toLowerCase())) return false;
                        if (filterGZona && g.zona !== filterGZona) return false;
                        if (filterGEstado) {
                            const regs = ofrendasGruposFiltradas.filter(a => a.grupoId === g.id);
                            const mesK = new Date().toISOString().slice(0, 7);
                            const alDia = regs.some(a => monthKey(a.fecha) === mesK);
                            if (filterGEstado === 'aldia' && !alDia) return false;
                            if (filterGEstado === 'pendiente' && alDia) return false;
                        }
                        return true;
                    }).length === 0 && (
                        <div style={{gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'var(--dim)'}}>No se encontraron grupos con los filtros aplicados</div>
                    )}
                </div>
            </div>
        )}


        <Modal open={modal === 'dador'} onClose={() => setModal(null)} title={editDId ? '✏️ Editar Dador' : '🤝 Nuevo Dador'} footer={<><button className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button><button className="btn btn-gold" onClick={saveD}>💾 Registrar Dador</button></>}>
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
                    <div className="form-group"><label className="form-label">Diezmo Base</label><input className="form-input" type="number" value={dBase} onChange={e => setDBase(e.target.value)} /></div>
                </div>
                <div className="form-group"><label className="form-label">Notas</label><textarea className="form-textarea" value={dNotas} onChange={e => setDNotas(e.target.value)} /></div>
            </div>
        </Modal>

        <Modal open={modal === 'aporte'} onClose={() => setModal(null)} title={aTipo === 'Diezmo' ? '💰 Registrar Diezmo' : '🎁 Registrar Ofrenda'} footer={<><button className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button><button className="btn btn-gold" onClick={saveA}>💾 Registrar</button></>}>
            <div className="form-grid">
                <div className="form-group">
                    <label className="form-label">Dador {aTipo === 'Diezmo' && '*'}</label>
                    {aTipo === 'Diezmo' ? (
                        <select className="form-select" value={aMiembro} onChange={e => { setAMiembro(e.target.value); setAGrupo(''); }}>
                            <option value="">Seleccionar Dador *</option>
                            {colaboradores.map(c => <option key={c.id} value={c.id}>{c.nombre} {c.apellido}</option>)}
                        </select>
                    ) : (
                        <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                            <select className="form-select" value={aMiembro} onChange={e => { setAMiembro(e.target.value); setAGrupo(''); }}>
                                <option value="">Seleccionar Dador (Opcional)</option>
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

        <Modal open={modal === 'verD'} onClose={() => setModal(null)} title={`🙏 Detalle del Dador`} footer={<><button className="btn btn-secondary" onClick={() => { setModal(null); }}>Cerrar</button><button className="btn btn-gold" onClick={() => handleEditDador(viewDador)}>✏️ Editar Dador</button></>}>
            {viewDador && (() => {
                const regs = aportes.filter(a => a.miembroId === viewDador.id);
                const total = regs.reduce((s, a) => s + (a.monto || 0), 0);
                const diezmos = regs.filter(a => a.tipo === 'Diezmo').reduce((s, a) => s + (a.monto || 0), 0);
                const ofrendas = total - diezmos;
                const mesK = new Date().toISOString().slice(0, 7);
                const esteMes = regs.filter(a => monthKey(a.fecha) === mesK).reduce((s, a) => s + (a.monto || 0), 0);
                return (
                    <div style={{display: 'flex', flexDirection: 'column', gap: '24px'}}>
                        <div style={{display: 'flex', alignItems: 'center', gap: '16px', paddingBottom: '20px', borderBottom: '1px solid var(--border)'}}>
                            <div style={{width: '60px', height: '60px', borderRadius: '50%', background: 'var(--gold-glow)', border: '2px solid var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: 'var(--gold)', fontSize: '20px'}}>
                                {viewDador.nombre[0]}{viewDador.apellido[0]}
                            </div>
                            <div>
                                <div style={{fontSize: '22px', fontWeight: 800}}>{viewDador.nombre} {viewDador.apellido}</div>
                                <span className={`badge ${viewDador.estado === 'Activo' ? 'badge-green' : 'badge-red'}`} style={{fontSize: '12px'}}>{viewDador.estado}</span>
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
                                    <span style={{fontWeight: 600, fontSize: '13px'}}>{(viewDador as any).zona || '—'}</span>
                                </div>
                                <div style={{display: 'flex', flexDirection: 'column', gap: '4px'}}>
                                    <span style={{color: 'var(--dim)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Grupo</span>
                                    <span style={{fontWeight: 600, fontSize: '13px'}}>{(viewDador as any).grupo || '—'}</span>
                                </div>
                                <div style={{display: 'flex', flexDirection: 'column', gap: '4px'}}>
                                    <span style={{color: 'var(--dim)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Estado</span>
                                    <span style={{fontWeight: 600, fontSize: '13px'}}>{viewDador.estado || '—'}</span>
                                </div>
                                <div style={{display: 'flex', flexDirection: 'column', gap: '4px'}}>
                                    <span style={{color: 'var(--dim)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Base Approx.</span>
                                    <span style={{fontWeight: 600, fontSize: '13px', color: 'var(--gold)'}}>{money((viewDador as any).base || 0)}</span>
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

        <Modal open={modal === 'delD'} onClose={() => setModal(null)} title="Eliminar Dador" footer={<><button className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button><button className="btn btn-danger" onClick={delD}>🗑️ Eliminar</button></>}>¿Está seguro que desea eliminar este dador?</Modal>
        <Modal open={modal === 'delA'} onClose={() => setModal(null)} title="Eliminar Aporte" footer={<><button className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button><button className="btn btn-danger" onClick={delA}>🗑️ Eliminar</button></>}>¿Está seguro que desea eliminar este aporte?</Modal>

        <Modal open={modal === 'verG'} onClose={() => setModal(null)} title={`🎁 Detalle del Grupo`} footer={<><button className="btn btn-secondary" onClick={() => setModal(null)}>Cerrar</button><button className="btn btn-gold" onClick={() => { setModal(null); resetA(); setATipo('Ofrenda'); setAGrupo(viewGrupo.id); setModal('aporte'); }}>➕ Nueva Ofrenda</button></>}>
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
        {toast && <div className="toast-container"><div className="toast success">{toast}</div></div>}
    </Layout>
  );
}