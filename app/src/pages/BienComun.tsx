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
  const [viewDiezmador, setViewDiezmador] = useState<any>(null);
  const [viewGrupo, setViewGrupo] = useState<any>(null);
  const [anioResumen, setAnioResumen] = useState(new Date().getFullYear().toString());
  const [subTab, setSubTab] = useState<'general' | 'mensual' | 'top' | 'metas' | 'cumplimiento'>('general');

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
    const data = { nombre: dNombre.trim(), apellido: dApellido.trim(), telefono: dTel.trim(), email: dEmail.trim(), zona: dZona, grupo: dGrupo, estado: dEstado as any, planDiezmo: parseFloat(dPlanDiezmo) || 0, notas: dNotas.trim(), creado: new Date().toISOString(), fechaIngreso: today() };
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
    if (aTipo === 'Diezmo' && !aMiembro) return showToast('Selecciona un diezmador para el diezmo');
    if (aTipo === 'Ofrenda' && !aMiembro && !aGrupo) return showToast('Selecciona un diezmador o grupo para la ofrenda');
    if (monto <= 0) return showToast('Monto inválido');
    const data = { diezmadorId: aMiembro || null, grupoId: aGrupo || null, fecha: aFecha, monto, tipo: aTipo, metodo: aMetodo as any, referencia: aRecibo.trim(), notas: `${aServicio} | ${aNotas.trim()}`, mesCorrespondiente: monthKey(aFecha), creado: new Date().toISOString() };
    if (editAId) {
      await db.aportesComun.update(editAId, data as any);
      showToast('Aporte actualizado');
    } else {
      await db.aportesComun.add({ id: uuid(), ...data as any });
      showToast('Aporte registrado');
    }
    resetA(); setModal(null);
  };

  const handleEditDiezmador = (d: any) => {
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

  const handleEditAporte = (a: any) => {
    setEditAId(a.id);
    setAMiembro(a.diezmadorId || '');
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
  const openEditTp = (tp: any) => { setEditTpId(tp.id); setTpNombre(tp.nombre); setTpColor(tp.color); setModal('tipoPlan'); };

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
  const openEditPlan = (p: any) => { setEditPlanId(p.id); setPlanDiezmadorId(p.diezmadorId); setPlanTipoId(p.tipoPlanId); setPlanMonto(p.montoMensual.toString()); setPlanNotas(p.notas || ''); setModal('planDiezmador'); };

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
    const idsActivos = new Set(regsAnio.map(a => a.diezmadorId).filter(Boolean));
    const diezmadoresActivosAnio = colaboradores.filter(c => idsActivos.has(c.id)).length;
    const topDiezmadores = colaboradores.map(c => {
      const regs = regsAnio.filter(a => a.diezmadorId === c.id);
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
    return { mesesData, mejorMes, peorMes, promedioMensual, diezmadoresActivosAnio, topDiezmadores, topGrupos, maxMes, totalAportes: regsAnio.length, gruposConOfrenda: topGrupos.length, variacionTotal, variacionDiezmos, variacionOfrendas };
  }, [aportes, anioResumen, colaboradores, grupos, resumenAnual]);

  const cumplimiento = useMemo(() => {
    const anio = parseInt(anioResumen);
    const regsAnio = aportes.filter(a => a.fecha.startsWith(anioResumen));
    const metaGlobalAnual = colaboradores.reduce((s, c) => s + ((c as any).planDiezmo || 0) * 12, 0);
    const metaGlobalMes = metaGlobalAnual / 12;
    const totalRecAnio = regsAnio.reduce((s, a) => s + (a.monto || 0), 0);
    const totalRecMesActual = regsAnio.filter(a => monthKey(a.fecha) === new Date().toISOString().slice(0, 7)).reduce((s, a) => s + (a.monto || 0), 0);
    const pctGlobal = metaGlobalAnual > 0 ? (totalRecAnio / metaGlobalAnual) * 100 : 0;
    const mesActualNum = new Date().getMonth() + 1;
    const metaAcumuladaEsperada = metaGlobalAnual > 0 ? (metaGlobalMes * mesActualNum) : 0;
    const cumplimientoDiezmadores = colaboradores.map(c => {
      const regs = regsAnio.filter(a => a.diezmadorId === c.id);
      const total = regs.reduce((s, a) => s + (a.monto || 0), 0);
      const planDiezmo = (c as any).planDiezmo || 0;
      const metaAnual = planDiezmo * 12;
      const pct = metaAnual > 0 ? (total / metaAnual) * 100 : null;
      return { id: c.id, nombre: c.nombre, apellido: c.apellido, zona: (c as any).zona || '—', planDiezmo, metaAnual, total, regs: regs.length, pct };
    }).sort((a, b) => (b.pct ?? -1) - (a.pct ?? -1));
    const cumplimientoGrupos = grupos.map(g => {
      const regs = regsAnio.filter(a => a.grupoId === g.id && a.tipo === 'Ofrenda');
      const total = regs.reduce((s, a) => s + (a.monto || 0), 0);
      const metaMes = (g as any).planOfrendasMensual || 0;
      const metaAnual = metaMes * 12;
      const pct = metaAnual > 0 ? (total / metaAnual) * 100 : null;
      return { id: g.id, nombre: g.nombre, zona: g.zona || '—', planOfrendasMensual: metaMes, metaAnual, total, regs: regs.length, pct };
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
    const metaGruposMes = cumplimientoGrupos.reduce((s, g) => s + g.planOfrendasMensual, 0);
    return { metaGlobalAnual, metaGlobalMes, metaGruposMes, totalRecAnio, totalRecMesActual, pctGlobal, metaAcumuladaEsperada, cumplimientoDiezmadores, cumplimientoGrupos, mensuales: acumulados, trimestres, semestres, anual };
  }, [aportes, anioResumen, colaboradores, grupos]);

  return (
    <Layout title="Bien Común">
        <div className="kpis">
            <div className="kpi" style={{'--accent': 'var(--gold)'} as any}>
                <div className="kpi-label">Total Recaudado</div>
                <div className="kpi-value">{money(resumenAnual.total)}</div>
                <div className="kpi-sub" style={{fontSize:11,color:'var(--dim)'}}>Plan anual: {money(cumplimiento.metaGlobalAnual + cumplimiento.metaGruposMes * 12)}</div>
                <div className="kpi-icon">💰</div>
            </div>
            <div className="kpi" style={{'--accent': 'var(--green)'} as any}>
                <div className="kpi-label">Total Diezmos</div>
                <div className="kpi-value">{money(resumenAnual.diezmos)}</div>
                <div className="kpi-sub" style={{fontSize:11,color:'var(--dim)'}}>Plan: {money(cumplimiento.metaGlobalAnual)}</div>
                <div className="kpi-icon">📅</div>
            </div>
            <div className="kpi" style={{'--accent': 'var(--purple)'} as any}>
                <div className="kpi-label">Total Ofrendas</div>
                <div className="kpi-value">{money(resumenAnual.ofrendas)}</div>
                <div className="kpi-sub" style={{fontSize:11,color:'var(--dim)'}}>Plan: {money(cumplimiento.metaGruposMes * 12)}</div>
                <div className="kpi-icon">🎁</div>
            </div>
            <div className="kpi" style={{'--accent': 'var(--blue)'} as any}>
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
                        const csv = [h, ...r].map(x => x.join(',')).join('\n');
                        const b = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
                        const u = URL.createObjectURL(b);
                        const a2 = document.createElement('a');
                        a2.href = u;
                        a2.download = 'lemgil-registros.csv';
                        a2.click();
                        showToast('CSV exportado');
                    }}>📥 Exportar CSV</button>
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
                            return [i + 1, c.nombre, c.apellido, (c as any).zona || '', c.estado, (c as any).planDiezmo || 0, total];
                        });
                        const csv = [h, ...r].map(x => x.join(',')).join('\n');
                        const b = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
                        const u = URL.createObjectURL(b);
                        const a2 = document.createElement('a');
                        a2.href = u;
                        a2.download = 'lemgil-diezmadores.csv';
                        a2.click();
                        showToast('CSV exportado');
                    }}>📥 Exportar CSV</button>
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
                        if (filterZona && (d as any).zona !== filterZona) return false;
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
                                             <div style={{color: 'var(--gold)', fontSize: '13px'}}>{(d as any).zona || 'Sin zona'}</div>
                                         </div>
                                         <span className={`badge ${d.estado === 'Activo' ? 'badge-green' : 'badge-red'}`} style={{fontSize: '11px', padding: '4px 12px'}}>{d.estado}</span>
                                    // Después del badge de estado (línea 536), agregar:
                                    <button className="btn btn-danger btn-sm" onClick={(e) => { e.stopPropagation(); setSelectedId(d.id); setModal('delD'); }} style={{fontSize: '11px', padding: '4px 8px'}}>🗑️</button>
                                     </div>
                                     <div style={{display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', marginBottom: '8px', color: 'var(--dim)'}}>
                                         <span>💰 Total: <span style={{color: 'var(--gold)', fontWeight: 700}}>{money(total)}</span></span>
                                         <span style={{opacity: 0.5}}>•</span>
                                         <span>📋 {regs.length} registros</span>
                                         <span style={{opacity: 0.5}}>•</span>
                                         <span>Plan: <span style={{color: 'var(--dim)'}}>{money((d as any).planDiezmo || 0)}</span></span>
                                     </div>
                                     {(() => {
                                         const planDiezmo = (d as any).planDiezmo || 0;
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
                            else if (subTab === 'top') exportTopPDF({ topDadores: resumenCompleto.topDiezmadores, topGrupos: resumenCompleto.topGrupos, anio: anioResumen });
                            else if (subTab === 'metas') exportMetasPDF({ cumplimiento, anio: anioResumen, colaboradores, grupos });
                            else if (subTab === 'cumplimiento') exportCumplimientoPDF({ cumplimiento, anio: anioResumen });
                        }}>📄 Exportar PDF</button>
                        <button className="btn btn-secondary" onClick={() => {
                            const h = ['Métrica', 'Valor'];
                            let r: (string | number)[][] = [];
                            if (subTab === 'general') {
                                r = [
                                    ['Año', anioResumen],
                                    ['Total Recaudado', resumenAnual.total],
                                    ['Diezmos', resumenAnual.diezmos],
                                    ['Ofrendas', resumenAnual.ofrendas],
                                    ['Diezmadores Activos', resumenCompleto.diezmadoresActivosAnio],
                                    ['Grupos con Ofrendas', resumenCompleto.gruposConOfrenda],
                                    ['Promedio Mensual', Math.round(resumenCompleto.promedioMensual)],
                                ];
                            } else if (subTab === 'mensual') {
                                r = resumenCompleto.mesesData.map(m => [m.mes, `Diezmos: ${m.diezmos} | Ofrendas: ${m.ofrendas} | Total: ${m.total}`]);
                            } else if (subTab === 'top') {
                                r = [
                                    ...resumenCompleto.topDiezmadores.map((d, i) => [`Top ${i+1} Diezmador`, `${d.nombre} ${d.apellido}: ${money(d.total)}`]),
                                    ...resumenCompleto.topGrupos.map((g, i) => [`Top ${i+1} Grupo`, `${g.nombre}: ${money(g.total)}`]),
                                ];
                            } else if (subTab === 'metas') {
                                r = cumplimiento.cumplimientoDiezmadores.map(c => [`${c.nombre} ${c.apellido}`, `Plan: ${money(c.metaAnual)} | Real: ${money(c.total)} | ${c.pct !== null ? `${Math.round(c.pct)}%` : '—'}`]);
                            } else if (subTab === 'cumplimiento') {
                                r = cumplimiento.mensuales.map(m => [m.etiqueta, `${money(m.total)} / ${money(m.metaEsperada)} | ${m.pct !== null ? `${Math.round(m.pct)}%` : '—'}`]);
                            }
                            const csv = [h, ...r].map(x => x.join(',')).join('\n');
                            const b = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
                            const u = URL.createObjectURL(b);
                            const a = document.createElement('a');
                            a.href = u;
                            a.download = `lemgil-resumen-${subTab}-${anioResumen}.csv`;
                            a.click();
                            showToast('CSV exportado');
                        }}>📥 Exportar CSV</button>
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
                                <div className="kpi-label">Diezmadores Activos</div>
                                <div className="kpi-value">{resumenCompleto.diezmadoresActivosAnio}</div>
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
                                <h3 className="card-title">🏅 Top 5 Diezmadores del Año</h3>
                            </div>
                            {resumenCompleto.topDiezmadores.length > 0 ? (
                                <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                                    {resumenCompleto.topDiezmadores.map((d, i) => {
                                        const medals = ['🥇', '🥈', '🥉'];
                                        const color = ['var(--gold)', 'var(--blue)', 'var(--purple)'];
                                        const pct = resumenCompleto.topDiezmadores[0].total > 0 ? (d.total / resumenCompleto.topDiezmadores[0].total) * 100 : 0;
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
                                    <div style={{fontSize: '11px', color: 'var(--dim)', marginTop: '4px'}}>{colaboradores.filter(c => (c as any).planDiezmo > 0).length} diezmadores + {grupos.filter(g => (g as any).planOfrendasMensual > 0).length} grupos</div>
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
                                <h3 className="card-title">👥 Plan de Diezmos por Diezmador</h3>
                            </div>
                            <table className="data-table">
                                <thead>
                                    <tr style={{background: 'var(--bg-input)'}}>
                                        <th style={{textAlign: 'left'}}>DADOR</th>
                                        <th style={{textAlign: 'left'}}>ZONA</th>
                                        <th style={{textAlign: 'right'}}>PLAN DIEZMO</th>
                                        <th style={{textAlign: 'right'}}>META ANUAL</th>
                                        <th style={{textAlign: 'right'}}>RECAUDADO</th>
                                        <th style={{textAlign: 'center'}}>%</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {cumplimiento.cumplimientoDiezmadores.map(d => {
                                        const semaforo = d.pct === null ? 'none' : d.pct >= 100 ? 'green' : d.pct >= 70 ? 'yellow' : 'red';
                                        const colorSem = semaforo === 'green' ? 'var(--green)' : semaforo === 'yellow' ? 'var(--yellow)' : semaforo === 'red' ? 'var(--red)' : 'var(--dim)';
                                        return (
                                            <tr key={d.id}>
                                                <td style={{fontWeight: 600}}>{d.nombre} {d.apellido}</td>
                                                <td style={{color: 'var(--dim)'}}>{d.zona}</td>
                                                <td style={{textAlign: 'right'}}>{d.planDiezmo > 0 ? money(d.planDiezmo) : '—'}</td>
                                                <td style={{textAlign: 'right'}}>{d.planDiezmo > 0 ? money(d.metaAnual) : '—'}</td>
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
                                        <td style={{textAlign: 'right'}}>{money(cumplimiento.cumplimientoDiezmadores.reduce((s, d) => s + d.planDiezmo, 0))}</td>
                                        <td style={{textAlign: 'right'}}>{money(cumplimiento.cumplimientoDiezmadores.reduce((s, d) => s + d.metaAnual, 0))}</td>
                                        <td style={{textAlign: 'right', color: 'var(--gold)'}}>{money(cumplimiento.cumplimientoDiezmadores.reduce((s, d) => s + d.total, 0))}</td>
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
                                                    <input type="number" min="0" step="0.01" defaultValue={g.planOfrendasMensual} onBlur={async (e) => {
                                                        const v = parseFloat(e.target.value) || 0;
                                                        if (v !== g.planOfrendasMensual) {
                                                            await db.grupos.update(g.id, { planOfrendasMensual: v } as any);
                                                            showToast(`Meta de ${g.nombre} actualizada`);
                                                        }
                                                    }} style={{width: '90px', textAlign: 'right', padding: '4px 8px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--gold)', fontWeight: 600, fontSize: '13px'}} />
                                                </td>
                                                <td style={{textAlign: 'right'}}>{g.planOfrendasMensual > 0 ? money(g.metaAnual) : '—'}</td>
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
                                        <td style={{textAlign: 'right'}}>{money(cumplimiento.cumplimientoGrupos.reduce((s, g) => s + g.planOfrendasMensual, 0))}</td>
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
                                <div className="card-header"><h3 className="card-title">👥 Cumplimiento por Diezmador</h3></div>
                                {cumplimiento.cumplimientoDiezmadores.length > 0 ? (
                                    <div style={{display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '400px', overflowY: 'auto'}}>
                                        {cumplimiento.cumplimientoDiezmadores.map(d => {
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
                                                        <span>{money(d.total)} / {d.planDiezmo > 0 ? money(d.metaAnual) : 'sin meta'}</span>
                                                        <span>{d.zona}</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : <div style={{textAlign: 'center', padding: '30px', color: 'var(--dim)'}}>Sin diezmadores</div>}
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
                                                        <span>{money(g.total)} / {g.planOfrendasMensual > 0 ? money(g.metaAnual) : 'sin meta'}</span>
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
                        <button className="btn btn-secondary" onClick={() => {
                            if (!grupos.length) return showToast('No hay grupos para exportar');
                            const mesK = new Date().toISOString().slice(0, 7);
                            const h = ['#', 'Grupo', 'Zona', 'Líder', 'Plan Mensual', 'Total Ofrendas', 'Este Mes'];
                            const r = grupos.map((g, i) => {
                                const regs = ofrendasGruposFiltradas.filter(a => a.grupoId === g.id);
                                const total = regs.reduce((s, a) => s + (a.monto || 0), 0);
                                const mes = regs.filter(a => a.fecha?.startsWith(mesK)).reduce((s, a) => s + (a.monto || 0), 0);
                                return [i + 1, g.nombre, g.zona || '', g.lider || '', (g as any).planOfrendasMensual || 0, total, mes];
                            });
                            const csv = [h, ...r].map(x => x.join(',')).join('\n');
                            const b = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
                            const u = URL.createObjectURL(b);
                            const a2 = document.createElement('a');
                            a2.href = u;
                            a2.download = 'lemgil-grupos-ofrendas.csv';
                            a2.click();
                            showToast('CSV exportado');
                        }}>📥 Exportar CSV</button>
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
                                    const metaMes = (g as any).planOfrendasMensual || 0;
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
// En el footer del modal verD, cambiar de:
footer={<><button className="btn btn-secondary" onClick={() => { setModal(null); }}>Cerrar</button><button className="btn btn-gold" onClick={() => handleEditDiezmador(viewDiezmador)}>✏️ Editar Diezmador</button></>}

// A:
footer={<><button className="btn btn-danger btn-sm" onClick={() => { setModal('delD'); setSelectedId(viewDiezmador.id); }}>🗑️ Eliminar</button><button className="btn btn-secondary" onClick={() => { setModal(null); }}>Cerrar</button><button className="btn btn-gold" onClick={() => handleEditDiezmador(viewDiezmador)}>✏️ Editar Diezmador</button></>}
        <Modal open={modal === 'verD'} onClose={() => setModal(null)} title={`🙏 Detalle del Diezmador`} footer={<><button className="btn btn-secondary" onClick={() => { setModal(null); }}>Cerrar</button><button className="btn btn-gold" onClick={() => handleEditDiezmador(viewDiezmador)}>✏️ Editar Diezmador</button></>}>
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
                                    <span style={{fontWeight: 600, fontSize: '13px'}}>{(viewDiezmador as any).zona || '—'}</span>
                                </div>
                                <div style={{display: 'flex', flexDirection: 'column', gap: '4px'}}>
                                    <span style={{color: 'var(--dim)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Grupo</span>
                                    <span style={{fontWeight: 600, fontSize: '13px'}}>{(viewDiezmador as any).grupo || '—'}</span>
                                </div>
                                <div style={{display: 'flex', flexDirection: 'column', gap: '4px'}}>
                                    <span style={{color: 'var(--dim)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Estado</span>
                                    <span style={{fontWeight: 600, fontSize: '13px'}}>{viewDiezmador.estado || '—'}</span>
                                </div>
                                <div style={{display: 'flex', flexDirection: 'column', gap: '4px'}}>
                                    <span style={{color: 'var(--dim)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Plan de Diezmo</span>
                                    <span style={{fontWeight: 600, fontSize: '13px', color: 'var(--gold)'}}>{money((viewDiezmador as any).planDiezmo || 0)}</span>
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
