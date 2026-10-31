import { useState, useMemo } from 'react';
import { v4 as uuid } from 'uuid';
import { useLiveQuery } from 'dexie-react-hooks';
import { Layout } from '../components/Layout';
import { db } from '../lib/database';
import { createBaseRecord } from '../lib/utils/recordHelpers';
import type { Diezmador, Grupo, Miembro, TipoPlan, PlanColaborador, AporteComun } from '../lib/types';
import { showToast } from '../lib/notification';
import { ResumenTab } from '../components/biencomun/ResumenTab';
import { OfrendasGruposTab } from '../components/biencomun/OfrendasGruposTab';
import { today, monthKey, money, accentStyle } from '../lib/utils';
import type { ModalType, Tab } from './bien-comun/constants';
import { ResumenAniosCard } from './bien-comun/ResumenAniosCard';
import { RegistrosTab } from './bien-comun/RegistrosTab';
import { DiezmadoresTab } from './bien-comun/DiezmadoresTab';
import { PlanesTab } from './bien-comun/PlanesTab';
import { DiezmadorFormModal } from './bien-comun/DiezmadorFormModal';
import { AporteFormModal } from './bien-comun/AporteFormModal';
import { DiezmadorDetailModal } from './bien-comun/DiezmadorDetailModal';
import { GrupoDetailModal } from './bien-comun/GrupoDetailModal';
import { TipoPlanFormModal } from './bien-comun/TipoPlanFormModal';
import { PlanDiezmadorFormModal } from './bien-comun/PlanDiezmadorFormModal';
import { DeleteModals } from './bien-comun/DeleteModals';

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
  const [viewDiezmador, setViewDiezmador] = useState<Diezmador | null>(null);
  const [viewGrupo, setViewGrupo] = useState<Grupo | null>(null);

  const [filterTipo, setFilterTipo] = useState('');
  const [filterMes, setFilterMes] = useState('');
  const [filterDiezmador, setFilterDiezmador] = useState('');
  const [filterGrupo, setFilterGrupo] = useState('');
  const [filterAnio, setFilterAnio] = useState(new Date().getFullYear().toString());
  const [filterMetodo, setFilterMetodo] = useState('');
  const [filterMontoMin, setFilterMontoMin] = useState('');
  const [filterMontoMax, setFilterMontoMax] = useState('');
  const [filterFechaDesde, setFilterFechaDesde] = useState('');
  const [filterFechaHasta, setFilterFechaHasta] = useState('');
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
  const [aNotas, setANotas] = useState('');

    const resetD = () => { setEditDId(null); setDNombre(''); setDApellido(''); setDTel(''); setDEmail(''); setDZona(''); setDGrupo(''); setDEstado('Activo'); setDPlanDiezmo(''); setDNotas(''); setPlanTipoId(''); setPlanMonto(''); };
  const resetA = () => { setEditAId(null); setAMiembro(''); setAGrupo(''); setAFecha(today()); setAMonto(''); setATipo('Diezmo'); setAMetodo('Efectivo'); setAServicio('General'); setANotas(''); };

  const saveD = async () => {
    if (!dNombre.trim() || !dApellido.trim()) return showToast('Nombre y apellido obligatorios');
    const data = { nombre: dNombre.trim(), apellido: dApellido.trim(), telefono: dTel.trim(), email: dEmail.trim(), zona: dZona, grupo: dGrupo, estado: dEstado as Diezmador['estado'], planDiezmo: parseFloat(dPlanDiezmo) || 0, notas: dNotas.trim(), creado: new Date().toISOString(), fechaIngreso: today() };
    if (editDId) {
      await db.dadores.update(editDId, data);
      showToast('Diezmador actualizado');
    } else {
      const newId = uuid();
      await db.dadores.add(createBaseRecord({ id: newId, ...data }));
      if (planTipoId && parseFloat(planMonto) > 0) {
        await db.planesColaborador.add(createBaseRecord({ id: uuid(), diezmadorId: newId, tipoPlanId: planTipoId, montoMensual: parseFloat(planMonto) || 0, notas: '', creado: new Date().toISOString() }));
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
    const data = { diezmadorId: aMiembro || null, grupoId: aGrupo || null, fecha: aFecha, monto, tipo: aTipo as AporteComun['tipo'], metodo: aMetodo as AporteComun['metodo'], referencia: '', notas: `${aServicio} | ${aNotas.trim()}`, mesCorrespondiente: monthKey(aFecha), creado: new Date().toISOString() };
    if (editAId) {
      await db.aportesComun.update(editAId, data);
    } else {
      await db.aportesComun.add(createBaseRecord({ id: uuid(), ...data }));
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
      await db.tiposPlanes.add(createBaseRecord({ id: uuid(), nombre: tpNombre.trim(), color: tpColor, activo: true }));
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
    const data = { diezmadorId: planDiezmadorId, tipoPlanId: planTipoId, montoMensual: monto, notas: planNotas.trim() };
    if (editPlanId) {
      await db.planesColaborador.update(editPlanId, data);
      showToast('Plan actualizado');
    } else {
      await db.planesColaborador.add(createBaseRecord({ id: uuid(), ...data }));
      showToast('Plan registrado');
    }
    resetPlan(); setModal(null);
  };
  const delPlan = async () => { if (!delPlanId) return; await db.planesColaborador.delete(delPlanId); setModal(null); showToast('Plan eliminado'); };
  const openEditPlan = (p: PlanColaborador) => { setEditPlanId(p.id); setPlanDiezmadorId(p.diezmadorId); setPlanTipoId(p.tipoPlanId); setPlanMonto(p.montoMensual.toString()); setPlanNotas(p.notas || ''); setModal('planDiezmador'); };

  const registrosFiltrados = useMemo(() => {
    return aportes.filter(a => {
      const full = `${a.diezmadorId} ${a.tipo} ${a.notas}`.toLowerCase();
      const monto = a.monto || 0;
      return (!searchReg || full.includes(searchReg.toLowerCase())) &&
             (!filterTipo || a.tipo === filterTipo) &&
             (!filterMes || monthKey(a.fecha) === filterMes) &&
             (!filterDiezmador || a.diezmadorId === filterDiezmador) &&
             (!filterGrupo || a.grupoId === filterGrupo) &&
             (!filterAnio || a.fecha?.startsWith(filterAnio)) &&
             (!filterMetodo || a.metodo === filterMetodo) &&
             (filterMontoMin === '' || monto >= parseFloat(filterMontoMin)) &&
             (filterMontoMax === '' || monto <= parseFloat(filterMontoMax)) &&
             (!filterFechaDesde || a.fecha >= filterFechaDesde) &&
             (!filterFechaHasta || a.fecha <= filterFechaHasta);
    });
  }, [aportes, searchReg, filterTipo, filterMes, filterDiezmador, filterGrupo, filterAnio, filterMetodo, filterMontoMin, filterMontoMax, filterFechaDesde, filterFechaHasta]);

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
    const filtered = filterAnio ? aportes.filter(a => a.fecha?.startsWith(filterAnio)) : aportes;
    const totalRec = filtered.reduce((s, a) => s + (a.monto || 0), 0);
    const activos = colaboradores.filter(c => c.estado === 'Activo').length;
    const diezmos = filtered.filter(a => a.tipo === 'Diezmo').reduce((s, a) => s + (a.monto || 0), 0);
    const ofrendas = filtered.filter(a => a.tipo === 'Ofrenda').reduce((s, a) => s + (a.monto || 0), 0);
    return { totalRec, activos, diezmos, ofrendas };
  }, [aportes, colaboradores, filterAnio]);

  const anosDatos = useMemo(() => {
    const anos = [...new Set(aportes.map(a => a.fecha?.slice(0, 4)).filter(Boolean))].sort().reverse();
    return anos.map(ano => {
      const regs = aportes.filter(a => a.fecha?.startsWith(ano));
      const total = regs.reduce((s, a) => s + (a.monto || 0), 0);
      const diezmos = regs.filter(a => a.tipo === 'Diezmo').reduce((s, a) => s + (a.monto || 0), 0);
      const ofrendas = regs.filter(a => a.tipo === 'Ofrenda').reduce((s, a) => s + (a.monto || 0), 0);
      return { ano, total, diezmos, ofrendas, count: regs.length };
    });
  }, [aportes]);

  return (
    <Layout title="Bien Común">
        <div className="kpis">
            <div className="kpi" style={accentStyle('var(--gold)')}>
                <div className="kpi-label">{filterAnio ? `Total ${filterAnio}` : 'Total Recaudado'}</div>
                <div className="kpi-value">{money(kpisGlobales.totalRec)}</div>
                <div className="kpi-icon">💰</div>
            </div>
            <div className="kpi" style={accentStyle('var(--green)')}>
                <div className="kpi-label">{filterAnio ? `Diezmos ${filterAnio}` : 'Diezmos'}</div>
                <div className="kpi-value">{money(kpisGlobales.diezmos)}</div>
                <div className="kpi-icon">📅</div>
            </div>
            <div className="kpi" style={accentStyle('var(--purple)')}>
                <div className="kpi-label">{filterAnio ? `Ofrendas ${filterAnio}` : 'Ofrendas'}</div>
                <div className="kpi-value">{money(kpisGlobales.ofrendas)}</div>
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

        {anosDatos.length > 1 && (
          <ResumenAniosCard
            anosDatos={anosDatos}
            filterAnio={filterAnio} setFilterAnio={setFilterAnio}
          />
        )}

        {tab === 'registros' && (
          <RegistrosTab
            registrosFiltrados={registrosFiltrados}
            aportes={aportes}
            colaboradores={colaboradores}
            grupos={grupos}
            totalesReg={totalesReg}
            onNuevoAporte={() => { resetA(); setModal('aporte'); }}
            handleEditAporte={handleEditAporte}
            onDeleteAporte={(id) => { setSelectedId(id); setModal('delA'); }}
            searchReg={searchReg} setSearchReg={setSearchReg}
            filterAnio={filterAnio} setFilterAnio={setFilterAnio}
            filterMes={filterMes} setFilterMes={setFilterMes}
            filterTipo={filterTipo} setFilterTipo={setFilterTipo}
            filterMetodo={filterMetodo} setFilterMetodo={setFilterMetodo}
            filterDiezmador={filterDiezmador} setFilterDiezmador={setFilterDiezmador}
            filterGrupo={filterGrupo} setFilterGrupo={setFilterGrupo}
            filterMontoMin={filterMontoMin} setFilterMontoMin={setFilterMontoMin}
            filterMontoMax={filterMontoMax} setFilterMontoMax={setFilterMontoMax}
            filterFechaDesde={filterFechaDesde} setFilterFechaDesde={setFilterFechaDesde}
            filterFechaHasta={filterFechaHasta} setFilterFechaHasta={setFilterFechaHasta}
          />
        )}

        {tab === 'diezmadores' && (
          <DiezmadoresTab
            colaboradores={colaboradores}
            aportes={aportes}
            onNuevoDiezmador={() => { resetD(); setModal('dador'); }}
            onVerDiezmador={(d) => { setViewDiezmador(d); setModal('verD'); }}
            onDeleteDiezmador={(id) => { setSelectedId(id); setModal('delD'); }}
            searchDz={searchDz} setSearchDz={setSearchDz}
            filterZona={filterZona} setFilterZona={setFilterZona}
            filterEstado={filterEstado} setFilterEstado={setFilterEstado}
            filterPlanDz={filterPlanDz} setFilterPlanDz={setFilterPlanDz}
          />
        )}

        {tab === 'resumen' &&             <ResumenTab aportes={aportes} colaboradores={colaboradores} grupos={grupos} />
}
         {tab === 'ofrendasGrupos' && <OfrendasGruposTab
           aportes={aportes} grupos={grupos}
           searchG={searchG} setSearchG={setSearchG}
           filterGZona={filterGZona} setFilterGZona={setFilterGZona}
           filterGEstado={filterGEstado} setFilterGEstado={setFilterGEstado}
           setViewGrupo={setViewGrupo} setModal={setModal}
           resetA={resetA} setATipo={setATipo}
         />}

        {tab === 'planes' && (
          <PlanesTab
            todosTiposPlanes={todosTiposPlanes}
            planesColaborador={planesColaborador}
            colaboradores={colaboradores}
            openEditTp={openEditTp}
            openEditPlan={openEditPlan}
            onNuevoTipo={() => { resetTp(); setModal('tipoPlan'); }}
            onNuevoPlan={() => { resetPlan(); setModal('planDiezmador'); }}
            onDeleteTipo={(id) => { setDelTpId(id); setModal('delTipoPlan'); }}
            onDeletePlan={(id) => { setDelPlanId(id); setModal('delPlanDiezmador'); }}
          />
        )}

        <DiezmadorFormModal
          open={modal === 'dador'}
          onClose={() => setModal(null)}
          editDId={editDId}
          saveD={saveD}
          miembros={miembros}
          selectMiembro={selectMiembro}
          tiposPlanes={tiposPlanes}
          todosTiposPlanes={todosTiposPlanes}
          planesColaborador={planesColaborador}
          openEditPlan={openEditPlan}
          onAgregarPlan={() => { setPlanDiezmadorId(editDId); setPlanTipoId(''); setPlanMonto(''); setPlanNotas(''); setEditPlanId(null); setModal('planDiezmador'); }}
          onDeletePlan={(id) => { setDelPlanId(id); setModal('delPlanDiezmador'); }}
          dNombre={dNombre} setDNombre={setDNombre}
          dApellido={dApellido} setDApellido={setDApellido}
          dTel={dTel} setDTel={setDTel}
          dEmail={dEmail} setDEmail={setDEmail}
          dZona={dZona} setDZona={setDZona}
          dGrupo={dGrupo} setDGrupo={setDGrupo}
          dEstado={dEstado} setDEstado={setDEstado}
          dPlanDiezmo={dPlanDiezmo} setDPlanDiezmo={setDPlanDiezmo}
          dNotas={dNotas} setDNotas={setDNotas}
          planTipoId={planTipoId} setPlanTipoId={setPlanTipoId}
          planMonto={planMonto} setPlanMonto={setPlanMonto}
        />

        <AporteFormModal
          open={modal === 'aporte'}
          onClose={() => setModal(null)}
          saveA={saveA}
          colaboradores={colaboradores}
          grupos={grupos}
          aMiembro={aMiembro} setAMiembro={setAMiembro}
          aGrupo={aGrupo} setAGrupo={setAGrupo}
          aTipo={aTipo} setATipo={setATipo}
          aMonto={aMonto} setAMonto={setAMonto}
          aFecha={aFecha} setAFecha={setAFecha}
          aMetodo={aMetodo} setAMetodo={setAMetodo}
          aServicio={aServicio} setAServicio={setAServicio}
          aNotas={aNotas} setANotas={setANotas}
        />

        <DiezmadorDetailModal
          open={modal === 'verD'}
          onClose={() => setModal(null)}
          onEliminar={() => { setModal('delD'); if (viewDiezmador) setSelectedId(viewDiezmador.id); }}
          onEditar={() => { if (viewDiezmador) handleEditDiezmador(viewDiezmador); }}
          viewDiezmador={viewDiezmador}
          aportes={aportes}
        />

        <GrupoDetailModal
          open={modal === 'verG'}
          onClose={() => setModal(null)}
          onNuevaOfrenda={() => { if (viewGrupo) { setModal(null); resetA(); setATipo('Ofrenda'); setAGrupo(viewGrupo.id); setModal('aporte'); } }}
          viewGrupo={viewGrupo}
          ofrendasGruposFiltradas={ofrendasGruposFiltradas}
          onEditAporte={(a) => { setModal(null); handleEditAporte(a); }}
          onDeleteAporte={(id) => { setSelectedId(id); setModal('delA'); }}
        />

        <TipoPlanFormModal
          open={modal === 'tipoPlan'}
          onClose={() => setModal(null)}
          editTpId={editTpId}
          saveTp={saveTp}
          tpNombre={tpNombre} setTpNombre={setTpNombre}
          tpColor={tpColor} setTpColor={setTpColor}
        />

        <PlanDiezmadorFormModal
          open={modal === 'planDiezmador'}
          onClose={() => setModal(null)}
          editPlanId={editPlanId}
          savePlan={savePlan}
          planDiezmadorId={planDiezmadorId} setPlanDiezmadorId={setPlanDiezmadorId}
          colaboradores={colaboradores}
          tiposPlanes={tiposPlanes}
          planTipoId={planTipoId} setPlanTipoId={setPlanTipoId}
          planMonto={planMonto} setPlanMonto={setPlanMonto}
          planNotas={planNotas} setPlanNotas={setPlanNotas}
        />

        <DeleteModals
          modal={modal}
          onClose={() => setModal(null)}
          delD={delD}
          delA={delA}
          delTp={delTp}
          delPlan={delPlan}
        />
    </Layout>
  );
}
