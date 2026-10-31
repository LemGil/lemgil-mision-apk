import { useState, useMemo } from 'react';
import { v4 as uuid } from 'uuid';
import { useLiveQuery } from 'dexie-react-hooks';
import { Layout } from '../components/Layout';
import { KpiCard } from '../components/KpiCard';
import { db } from '../lib/database';
import { createBaseRecord } from '../lib/utils/recordHelpers';
import type { Colaborador, Aporte } from '../lib/types';
import { showToast } from '../lib/notification';
import { today, money, MS_SHORT } from '../lib/utils';
import type { ModalType, SubTab, Tab } from './dadores/constants';
import { ActionsRow } from './dadores/ActionsRow';
import { ColaboradoresTab } from './dadores/ColaboradoresTab';
import { AportesTab } from './dadores/AportesTab';
import { ResumenTab } from './dadores/ResumenTab';
import { DadorFormModal } from './dadores/DadorFormModal';
import { AporteFormModal } from './dadores/AporteFormModal';
import { DadorDetailModal } from './dadores/DadorDetailModal';
import { DeleteModals } from './dadores/DeleteModals';

export default function Dadores() {
  const dadores = useLiveQuery(() => db.colaboradores.toArray(), []) ?? [];
  const aportes = useLiveQuery(() => db.aportes.toArray(), []) ?? [];
  const tiposPlanes = useLiveQuery(() => db.tiposPlanes.filter(t => t.activo).toArray(), []) ?? [];

  const [tab, setTab] = useState<Tab>('diezmadores');
  const [subTab, setSubTab] = useState<SubTab>('general');
  const [anioResumen, setAnioResumen] = useState(new Date().getFullYear().toString());
  const [search, setSearch] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [filterTipo, setFilterTipo] = useState('');
  const [filterPlan, setFilterPlan] = useState('');
  const [filterPlanTipo, setFilterPlanTipo] = useState('');
  const [filterMontoMin, setFilterMontoMin] = useState('');
  const [filterMontoMax, setFilterMontoMax] = useState('');
  const [filterTipoAporte, setFilterTipoAporte] = useState('');
  const [filterMetodo, setFilterMetodo] = useState('');
  const [filterMes, setFilterMes] = useState('');
  const [filterAnio, setFilterAnio] = useState(new Date().getFullYear().toString());
  const [modal, setModal] = useState<null | ModalType>(null);
  const [editDadorId, setEditDadorId] = useState<string | null>(null);
  const [editAporteId, setEditAporteId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [dNombre, setDNombre] = useState('');
  const [dApellido, setDApellido] = useState('');
  const [dTel, setDTel] = useState('');
  const [dEmail, setDEmail] = useState('');
  const [dTipo, setDTipo] = useState('Persona');
  const [dEstado, setDEstado] = useState('Activo');
  const [dNotas, setDNotas] = useState('');

  const [planTipoId, setPlanTipoId] = useState('');
  const [planMonto, setPlanMonto] = useState('');

  const [aDador, setADador] = useState('');
  const [aFecha, setAFecha] = useState(today());
  const [aMonto, setAMonto] = useState('');
  const [aTipo, setATipo] = useState('Diezmo');
  const [aMetodo, setAMetodo] = useState('Efectivo');
  const [aNotas, setANotas] = useState('');

  

  const resetDador = () => {
    setEditDadorId(null);
    setDNombre('');
    setDApellido('');
    setDTel('');
    setDEmail('');
    setDTipo('Persona');
    setDEstado('Activo');
    setDNotas('');
    setPlanTipoId('');
    setPlanMonto('');
  };
  const resetAporte = () => {
    setEditAporteId(null);
    setADador('');
    setAFecha(today());
    setAMonto('');
    setATipo('Diezmo');
    setAMetodo('Efectivo');
    setANotas('');
  };

  const mo = new Date().toISOString().slice(0, 7);
  const kpis = useMemo(() => {
    const activos = dadores.filter((d) => d.estado === 'Activo').length;
    const planMeta = dadores.filter((d) => d.estado === 'Activo').reduce((s, d) => s + (d.planOfrendaMonto || 0), 0);
    const anioActual = new Date().getFullYear().toString();
    const aportesAnio = aportes.filter((a) => a.fecha?.startsWith(anioActual));
    const yearTotal = aportesAnio.reduce((s, a) => s + (a.monto || 0), 0);
    const tiposUnicos = [...new Set(aportesAnio.map((a) => a.tipo).filter(Boolean))];
    const porTipo = tiposUnicos.map((tipo) => ({
      tipo,
      total: aportesAnio.filter((a) => a.tipo === tipo).reduce((s, a) => s + (a.monto || 0), 0),
    }));
    const planAnual = planMeta * 12;
    return { activos, planMeta, planAnual, yearTotal, porTipo };
  }, [dadores, aportes]);

  const dadoresFiltrados = useMemo(() => {
    const s = search.toLowerCase();
    const min = parseFloat(filterMontoMin) || 0;
    const max = parseFloat(filterMontoMax) || Infinity;
    return dadores.filter((d) => {
      const full = `${d.nombre} ${d.apellido} ${d.telefono} ${d.email}`.toLowerCase();
      const planMonto = d.planOfrendaMonto || 0;
      return (!s || full.includes(s))
        && (!filterEstado || d.estado === filterEstado)
        && (!filterTipo || d.tipo === filterTipo)
        && (!filterPlan || (filterPlan === 'con' ? planMonto > 0 : planMonto === 0))
        && (!filterPlanTipo || d.planOfrendaTipo === filterPlanTipo)
        && (planMonto >= min && planMonto <= max);
    });
  }, [dadores, search, filterEstado, filterTipo, filterPlan, filterPlanTipo, filterMontoMin, filterMontoMax]);

  const aportesFiltrados = useMemo(() => {
    const s = search.toLowerCase();
    return aportes
      .filter((a) => {
        const dador = dadores.find((d) => d.id === a.colaboradorId);
        const dadorName = dador ? `${dador.nombre} ${dador.apellido}`.toLowerCase() : '';
        return (!s || dadorName.includes(s) || a.referencia?.toLowerCase().includes(s) || a.notas?.toLowerCase().includes(s))
          && (!filterTipoAporte || a.tipo === filterTipoAporte)
          && (!filterMetodo || a.metodo === filterMetodo)
          && (!filterMes || a.fecha?.startsWith(`${filterAnio}-${filterMes}`))
          && (!filterAnio || a.fecha?.startsWith(filterAnio));
      })
      .sort((a, b) => b.fecha.localeCompare(a.fecha));
  }, [aportes, dadores, search, filterTipoAporte, filterMetodo, filterMes, filterAnio]);

  const selDador = dadores.find((d) => d.id === selectedId);
  const selAportes = selDador ? aportes.filter((a) => a.colaboradorId === selDador.id).sort((a, b) => b.fecha.localeCompare(a.fecha)) : [];
  const selTotal = selAportes.reduce((s, a) => s + (a.monto || 0), 0);

  const resumenAnual = useMemo(() => {
    const regsAnio = aportes.filter(a => a.fecha.startsWith(anioResumen));
    const total = regsAnio.reduce((s, a) => s + (a.monto || 0), 0);
    const porTipo = [...new Set(regsAnio.map(a => a.tipo).filter(Boolean))].map(tipo => ({
      tipo,
      total: regsAnio.filter(a => a.tipo === tipo).reduce((s, a) => s + (a.monto || 0), 0),
    }));
    return { total, porTipo };
  }, [aportes, anioResumen]);

  const resumenCompleto = useMemo(() => {
    const regsAnio = aportes.filter(a => a.fecha.startsWith(anioResumen));
    const mesesData = MS_SHORT.map((m, i) => {
      const mesIdx = (i + 1).toString().padStart(2, '0');
      const regsMes = regsAnio.filter(a => a.fecha.startsWith(`${anioResumen}-${mesIdx}`));
      const totMes = regsMes.reduce((s, a) => s + (a.monto || 0), 0);
      const porTipoMes = [...new Set(regsMes.map(a => a.tipo).filter(Boolean))].map(tipo => ({
        tipo,
        total: regsMes.filter(a => a.tipo === tipo).reduce((s, a) => s + (a.monto || 0), 0),
      }));
      return { mes: m, total: totMes, porTipo: porTipoMes };
    });
    const mesesConActividad = mesesData.filter(m => m.total > 0);
    const mejorMes = mesesConActividad.length ? mesesConActividad.reduce((a, b) => b.total > a.total ? b : a) : null;
    const promedioMensual = mesesConActividad.length > 0 ? mesesConActividad.reduce((s, m) => s + m.total, 0) / mesesConActividad.length : 0;
    const totalAportes = regsAnio.length;
    const activosAnio = [...new Set(regsAnio.map(a => a.colaboradorId).filter(Boolean))].length;
    const topDadores = dadores.map(d => {
      const regs = regsAnio.filter(a => a.colaboradorId === d.id);
      const total = regs.reduce((s, a) => s + (a.monto || 0), 0);
      return { id: d.id, nombre: d.nombre, apellido: d.apellido, total, regs: regs.length };
    }).filter(d => d.total > 0).sort((a, b) => b.total - a.total).slice(0, 5);
    const variacionTotal = (() => {
      const prev = aportes.filter(a => a.fecha.startsWith((parseInt(anioResumen) - 1).toString())).reduce((s, a) => s + (a.monto || 0), 0);
      if (prev === 0) return null;
      return ((resumenAnual.total - prev) / prev) * 100;
    })();
    return { mesesData, mejorMes, promedioMensual, totalAportes, activosAnio, topDadores, variacionTotal };
  }, [aportes, anioResumen, dadores, resumenAnual]);

  const cumplimiento = useMemo(() => {
    const regsAnio = aportes.filter(a => a.fecha.startsWith(anioResumen));
    const planMeta = dadores.filter(d => d.estado === 'Activo').reduce((s, d) => s + (d.planOfrendaMonto || 0), 0);
    const metaGlobalAnual = planMeta * 12;
    const metaGlobalMes = planMeta;
    const totalRecAnio = regsAnio.reduce((s, a) => s + (a.monto || 0), 0);
    const pctGlobal = metaGlobalAnual > 0 ? (totalRecAnio / metaGlobalAnual) * 100 : 0;
    const mesActualNum = new Date().getMonth() + 1;
    const metaAcumuladaEsperada = metaGlobalAnual > 0 ? (metaGlobalMes * mesActualNum) : 0;
    const cumplimientoDadores = dadores.map(d => {
      const regs = regsAnio.filter(a => a.colaboradorId === d.id);
      const total = regs.reduce((s, a) => s + (a.monto || 0), 0);
      const plan = d.planOfrendaMonto || 0;
      const metaAnual = plan * 12;
      const pct = metaAnual > 0 ? (total / metaAnual) * 100 : null;
      return { id: d.id, nombre: d.nombre, apellido: d.apellido, tipo: d.tipo || '—', plan, metaAnual, total, regs: regs.length, pct };
    }).sort((a, b) => (b.pct ?? -1) - (a.pct ?? -1));
    const periodos = MS_SHORT.map((m, i) => {
      const mesIdx = (i + 1).toString().padStart(2, '0');
      const regsMes = regsAnio.filter(a => a.fecha.startsWith(`${anioResumen}-${mesIdx}`));
      const total = regsMes.reduce((s, a) => s + (a.monto || 0), 0);
      const metaEsperada = metaGlobalMes;
      const pct = metaEsperada > 0 ? (total / metaEsperada) * 100 : null;
      return { etiqueta: m, tipo: 'mes' as const, total, metaEsperada, pct, idx: i };
    });
    return { metaGlobalAnual, metaGlobalMes, totalRecAnio, pctGlobal, metaAcumuladaEsperada, cumplimientoDadores, periodos };
  }, [aportes, anioResumen, dadores]);

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
    setPlanTipoId(d.planOfrendaTipo || '');
    setPlanMonto(d.planOfrendaMonto?.toString() || '');
    setDNotas(d.notas);
    setModal('dador');
  };
  const saveDador = async () => {
    if (!dNombre.trim() || !dApellido.trim()) return showToast('Nombre y apellido son obligatorios');
    const data = { nombre: dNombre.trim(), apellido: dApellido.trim(), telefono: dTel.trim(), email: dEmail.trim(), tipo: dTipo as Colaborador['tipo'], estado: dEstado as Colaborador['estado'], planOfrendaTipo: planTipoId, planOfrendaMonto: parseFloat(planMonto) || 0, notas: dNotas.trim() };
    if (editDadorId) {
      await db.colaboradores.update(editDadorId, data);
      showToast(`Colaborador "${dNombre} ${dApellido}" actualizado`);
    } else {
      const newId = uuid();
      await db.colaboradores.add(createBaseRecord({ id: newId, ...data }));
      showToast(`Colaborador "${dNombre} ${dApellido}" registrado`);
    }
    resetDador();
    setModal(null);
  };
  const delDador = async () => {
    if (!selectedId) return;
    const d = dadores.find((x) => x.id === selectedId);
    await db.colaboradores.delete(selectedId);
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
    setADador(a.colaboradorId);
    setAFecha(a.fecha);
    setAMonto(String(a.monto));
    setATipo(a.tipo);
    setAMetodo(a.metodo);
    setANotas(a.notas);
    setModal('aporte');
  };
  const saveAporte = async () => {
    if (!aDador) return showToast('Selecciona un colaborador');
    if (!aFecha) return showToast('La fecha es obligatoria');
    const monto = parseFloat(aMonto) || 0;
    if (monto <= 0) return showToast('El monto debe ser mayor a 0');
    const data = { colaboradorId: aDador, fecha: aFecha, monto, tipo: aTipo as Aporte['tipo'], metodo: aMetodo as Aporte['metodo'], referencia: '', notas: aNotas.trim() };
    if (editAporteId) {
      await db.aportes.update(editAporteId, data);
      showToast('Aporte actualizado');
    } else {
      await db.aportes.add(createBaseRecord({ id: uuid(), ...data }));
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
          <KpiCard label="Total Recaudado" value={money(kpis.yearTotal)} icon="💰" accent="var(--gold)" sub={`Plan anual: ${money(kpis.planAnual)}`} />
          {kpis.porTipo.map((t) => (
            <KpiCard key={t.tipo} label={t.tipo} value={money(t.total)} icon="📊" accent="var(--blue)" />
          ))}
          <KpiCard label="Colaboradores Activos" value={kpis.activos} icon="🤝" accent="var(--green)" sub={`${dadores.length} totales`} />
        </div>

        <div className="tabs">
          <button className={`tab ${tab === 'diezmadores' ? 'active' : ''}`} onClick={() => { setTab('diezmadores'); setSearch(''); setFilterEstado(''); setFilterTipo(''); setFilterPlan(''); }}>
            🙏 Colaboradores ({dadores.length})
          </button>
          <button className={`tab ${tab === 'aportes' ? 'active' : ''}`} onClick={() => { setTab('aportes'); setSearch(''); setFilterTipoAporte(''); setFilterMetodo(''); setFilterMes(''); setFilterAnio(new Date().getFullYear().toString()); }}>
            💰 Aportes ({aportes.length})
          </button>
          <button className={`tab ${tab === 'resumen' ? 'active' : ''}`} onClick={() => setTab('resumen')}>
            📊 RESUMEN
          </button>
        </div>

        <ActionsRow
          tab={tab}
          dadores={dadores}
          aportes={aportes}
          tiposPlanes={tiposPlanes}
          mo={mo}
          openNewDador={openNewDador}
          openNewAporte={openNewAporte}
        />

        {tab === 'diezmadores' && (
          <ColaboradoresTab
            dadoresFiltrados={dadoresFiltrados}
            dadores={dadores}
            aportes={aportes}
            tiposPlanes={tiposPlanes}
            search={search} setSearch={setSearch}
            filterEstado={filterEstado} setFilterEstado={setFilterEstado}
            filterTipo={filterTipo} setFilterTipo={setFilterTipo}
            filterPlanTipo={filterPlanTipo} setFilterPlanTipo={setFilterPlanTipo}
            filterMontoMin={filterMontoMin} setFilterMontoMin={setFilterMontoMin}
            filterMontoMax={filterMontoMax} setFilterMontoMax={setFilterMontoMax}
            openDetail={openDetail}
            openEditDador={openEditDador}
            onDeleteDador={(id) => { setSelectedId(id); setModal('delDador'); }}
          />
        )}

        {tab === 'aportes' && (
          <AportesTab
            aportesFiltrados={aportesFiltrados}
            aportes={aportes}
            dadores={dadores}
            tiposPlanes={tiposPlanes}
            search={search} setSearch={setSearch}
            filterAnio={filterAnio} setFilterAnio={setFilterAnio}
            filterMes={filterMes} setFilterMes={setFilterMes}
            filterTipoAporte={filterTipoAporte} setFilterTipoAporte={setFilterTipoAporte}
            filterMetodo={filterMetodo} setFilterMetodo={setFilterMetodo}
            openEditAporte={openEditAporte}
            onDeleteAporte={(id) => { setSelectedId(id); setModal('delAporte'); }}
          />
        )}

        {tab === 'resumen' && (
          <ResumenTab
            subTab={subTab} setSubTab={setSubTab}
            anioResumen={anioResumen} setAnioResumen={setAnioResumen}
            aportes={aportes}
            dadores={dadores}
            resumenAnual={resumenAnual}
            resumenCompleto={resumenCompleto}
            cumplimiento={cumplimiento}
          />
        )}

        <DadorFormModal
          open={modal === 'dador'}
          onClose={() => setModal(null)}
          editDadorId={editDadorId}
          saveDador={saveDador}
          onDelete={() => setModal('delDador')}
          tiposPlanes={tiposPlanes}
          dNombre={dNombre} setDNombre={setDNombre}
          dApellido={dApellido} setDApellido={setDApellido}
          dTel={dTel} setDTel={setDTel}
          dEmail={dEmail} setDEmail={setDEmail}
          dTipo={dTipo} setDTipo={setDTipo}
          dEstado={dEstado} setDEstado={setDEstado}
          dNotas={dNotas} setDNotas={setDNotas}
          planTipoId={planTipoId} setPlanTipoId={setPlanTipoId}
          planMonto={planMonto} setPlanMonto={setPlanMonto}
        />

        <AporteFormModal
          open={modal === 'aporte'}
          onClose={() => setModal(null)}
          editAporteId={editAporteId}
          saveAporte={saveAporte}
          onDelete={() => setModal('delAporte')}
          dadores={dadores}
          tiposPlanes={tiposPlanes}
          aDador={aDador} setADador={setADador}
          aFecha={aFecha} setAFecha={setAFecha}
          aMonto={aMonto} setAMonto={setAMonto}
          aTipo={aTipo} setATipo={setATipo}
          aMetodo={aMetodo} setAMetodo={setAMetodo}
          aNotas={aNotas} setANotas={setANotas}
        />

        <DadorDetailModal
          open={modal === 'detail'}
          onClose={() => setModal(null)}
          selDador={selDador}
          selAportes={selAportes}
          selTotal={selTotal}
          tiposPlanes={tiposPlanes}
          mo={mo}
        />

        <DeleteModals
          modal={modal}
          onClose={() => setModal(null)}
          selDador={selDador}
          selAportes={selAportes}
          delDador={delDador}
          delAporte={delAporte}
        />
      </div>
    </Layout>
  );
}
