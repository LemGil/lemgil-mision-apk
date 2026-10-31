import { useState, useMemo, useEffect } from 'react';
import { v4 as uuid } from 'uuid';
import { useLiveQuery } from 'dexie-react-hooks';
import { Layout } from '../components/Layout';
import { KpiCard } from '../components/KpiCard';
import { db } from '../lib/database';
import { createBaseRecord } from '../lib/utils/recordHelpers';
import type { Beneficiario, Campana } from '../lib/types';
import { showToast } from '../lib/notification';
import { today, money, monthKey } from '../lib/utils';
import type { ModalType, Tab } from './manos-abiertas/constants';
import { ActionsRow } from './manos-abiertas/ActionsRow';
import { BeneficiariosTab } from './manos-abiertas/BeneficiariosTab';
import { CampanasTab } from './manos-abiertas/CampanasTab';
import { EntregasTab } from './manos-abiertas/EntregasTab';
import { BeneficiarioFormModal } from './manos-abiertas/BeneficiarioFormModal';
import { CampanaFormModal } from './manos-abiertas/CampanaFormModal';
import { EntregaFormModal } from './manos-abiertas/EntregaFormModal';
import { CampanaDetailModal } from './manos-abiertas/CampanaDetailModal';
import { DeleteModals } from './manos-abiertas/DeleteModals';

export default function ManosAbiertas() {
  const beneficiarios = useLiveQuery(() => db.beneficiarios.toArray(), []) ?? [];
  const campanas = useLiveQuery(() => db.campanas.toArray(), []) ?? [];
  const entregas = useLiveQuery(() => db.entregas.toArray(), []) ?? [];
  const zonas = useLiveQuery(() => db.zonas.toArray(), []) ?? [];
  const metasDoc = useLiveQuery(() => db.metas.get('default'), []);

  const [tab, setTab] = useState<Tab>('ben');
  const [search, setSearch] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [filterZona, setFilterZona] = useState('');
  const [filterFamilia, setFilterFamilia] = useState('');
  const [filterTipo, setFilterTipo] = useState('');
  const [filterSource, setFilterSource] = useState('');
  const [filterTipoCamp, setFilterTipoCamp] = useState('');
  const [filterEstadoCamp, setFilterEstadoCamp] = useState('');
  const [filterAnio, setFilterAnio] = useState(new Date().getFullYear().toString());
  const [filterCampanaEnt, setFilterCampanaEnt] = useState('');
  const [filterTipoEnt, setFilterTipoEnt] = useState('');
  const [filterFechaEnt, setFilterFechaEnt] = useState('');
  const [modal, setModal] = useState<null | ModalType>(null);
  const [editBenId, setEditBenId] = useState<string | null>(null);
  const [editCampId, setEditCampId] = useState<string | null>(null);
  const [editEntId, setEditEntId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [bNombre, setBNombre] = useState('');
  const [bApellido, setBApellido] = useState('');
  const [bTel, setBTel] = useState('');
  const [bDir, setBDir] = useState('');
  const [bZona, setBZona] = useState('');
  const [bFamilia, setBFamilia] = useState('1');
  const [bEstado, setBEstado] = useState('Activo');
  const [bNotas, setBNotas] = useState('');

  const [benefSource, setBenefSource] = useState<'Convertido' | 'Miembro' | 'Manual'>('Manual');
  const [benefSourceId, setBenefSourceId] = useState('');
  const [benefType, setBenefType] = useState<'Persona' | 'Casa de Familia' | 'Grupo' | 'Vulnerable'>('Persona');
  const [benefRepresentativeName, setBenefRepresentativeName] = useState('');
  const [benefName, setBenefName] = useState(''); // Nombre del grupo o grupo de vulnerables

  const conversiones = useLiveQuery(() => db.conversiones.toArray(), []) ?? [];
  const miembros = useLiveQuery(() => db.miembros.toArray(), []) ?? [];

  useEffect(() => {
    if (benefSource === 'Convertido' && benefSourceId) {
      const conv = conversiones.find(c => c.id === benefSourceId);
      if (conv) {
        setBNombre(conv.nombre);
        setBApellido(conv.apellido);
        setBTel(conv.telefono);
        setBDir(conv.direccion || '');
        setBZona(conv.zona);
        setBEstado(conv.estado === 'Integrado' ? 'Activo' : conv.estado === 'Bautizado' ? 'Activo' : 'Inactivo');
        setBenefType('Persona');
        setBenefRepresentativeName('');
      }
    } else if (benefSource === 'Miembro' && benefSourceId) {
      const member = miembros.find(m => m.id === benefSourceId);
      if (member) {
        setBNombre(member.nombre);
        setBApellido(member.apellido);
        setBTel(member.telefono);
        setBDir(member.direccion || '');
        setBZona(member.zona);
        setBEstado(member.estado === 'Activo' ? 'Activo' : 'Inactivo');
        setBenefType('Persona');
        setBenefRepresentativeName('');
      }
    } else if (benefSource === 'Manual') {
      setBNombre('');
      setBApellido('');
      setBTel('');
      setBDir('');
      setBZona('');
      setBEstado('Activo');
      setBenefRepresentativeName('');
    }
  }, [benefSource, benefSourceId, conversiones, miembros]);

  const [cNombre, setCNombre] = useState('');
  const [cInicio, setCInicio] = useState(today());
  const [cFin, setCFin] = useState('');
  const [cZona, setCZona] = useState('');
  const [cTipo, setCTipo] = useState('Alimentaria');
  const [cMeta, setCMeta] = useState('');
  const [cMetaTipo, setCMetaTipo] = useState<'Familias' | 'Personas'>('Familias');
  const [cResp, setCResp] = useState('');
  const [cEstado, setCEstado] = useState('Planificada');
  const [cDesc, setCDesc] = useState('');

  const [eCampana, setECampana] = useState('');
  const [eBenefOrigen, setEBenefOrigen] = useState<'Convertido' | 'Miembro' | 'Manual'>('Manual');
  const [eBenefId, setEBenefId] = useState('');
  const [eBenefManual, setEBenefManual] = useState('');
  const [eFecha, setEFecha] = useState(today());
  const [eTipo, setETipo] = useState('Canasta básica');
  const [eCant, setECant] = useState('1');
  const [eUnidad, setEUnidad] = useState('unidad');
  const [eNotas, setENotas] = useState('');

  const typeColors: Record<string, string> = { Persona: 'var(--blue)', 'Casa de Familia': 'var(--gold)', Grupo: 'var(--green)', Vulnerable: 'var(--red)' };
  const typeAccent = typeColors[benefType] || 'var(--gold)';

  const resetBen = () => {
    setEditBenId(null);
    setBNombre('');
    setBApellido('');
    setBTel('');
    setBDir('');
    setBZona('');
    setBFamilia('1');
    setBEstado('Activo');
    setBNotas('');
    setBenefSource('Manual');
    setBenefSourceId('');
    setBenefType('Persona');
    setBenefRepresentativeName('');
    setBenefName('');
  };
  const resetCamp = () => {
    setEditCampId(null);
    setCNombre('');
    setCInicio(today());
    setCFin('');
    setCZona('');
    setCTipo('Alimentaria');
    setCMeta('');
    setCMetaTipo('Familias');
    setCResp('');
    setCEstado('Planificada');
    setCDesc('');
  };
  const resetEnt = () => {
    setEditEntId(null);
    setECampana('');
    setEBenefOrigen('Manual');
    setEBenefId('');
    setEBenefManual('');
    setEFecha(today());
    setETipo('Canasta básica');
    setECant('1');
    setEUnidad('unidad');
    setENotas('');
  };

  const mo = new Date().toISOString().slice(0, 7);
  const kpis = useMemo(() => {
    const activos = beneficiarios.filter((b) => b.estado === 'Activo').length;
    const campActivas = campanas.filter((c) => c.estado === 'En curso' || c.estado === 'Planificada').length;
    const entMes = entregas.filter((e) => monthKey(e.fecha) === mo).length;
    const uniqIds = new Set(entregas.map((e) => e.beneficiarioId));
    const familias = uniqIds.size;
    const personas = beneficiarios
      .filter((b) => uniqIds.has(b.id))
      .reduce((s, b) => s + (b.familia || 1), 0);
    return { activos, campActivas, entMes, familias, personas };
  }, [beneficiarios, campanas, entregas, mo]);

  const benFiltrados = useMemo(() => {
    const s = search.toLowerCase();
    return beneficiarios.filter((b) => {
      const full = `${b.nombre} ${b.apellido} ${b.telefono} ${b.direccion}`.toLowerCase();
      let matchFamilia = true;
      if (filterFamilia === '1') matchFamilia = b.familia === 1;
      else if (filterFamilia === '2-4') matchFamilia = b.familia >= 2 && b.familia <= 4;
      else if (filterFamilia === '5+') matchFamilia = b.familia >= 5;
      return (!s || full.includes(s))
        && (!filterEstado || b.estado === filterEstado)
        && (!filterZona || b.zona === filterZona)
        && matchFamilia
        && (!filterTipo || b.tipo === filterTipo)
        && (!filterSource || b.source === filterSource);
    });
  }, [beneficiarios, search, filterEstado, filterZona, filterFamilia, filterTipo, filterSource]);

  const campFiltradas = useMemo(() => {
    const s = search.toLowerCase();
    return campanas.filter((c) => {
      return (!s || c.nombre.toLowerCase().includes(s) || c.responsable?.toLowerCase().includes(s))
        && (!filterTipoCamp || c.tipo === filterTipoCamp)
        && (!filterEstadoCamp || c.estado === filterEstadoCamp)
        && (!filterAnio || c.fechaInicio?.startsWith(filterAnio));
    });
  }, [campanas, search, filterTipoCamp, filterEstadoCamp, filterAnio]);

  const entFiltradas = useMemo(() => {
    const s = search.toLowerCase();
    return entregas
      .filter((e) => {
        const ben = beneficiarios.find((b) => b.id === e.beneficiarioId);
        const camp = campanas.find((c) => c.id === e.campanaId);
        const text = `${ben?.nombre || ''} ${ben?.apellido || ''} ${camp?.nombre || ''} ${e.tipo} ${e.notas || ''}`.toLowerCase();
        return (!s || text.includes(s))
          && (!filterCampanaEnt || e.campanaId === filterCampanaEnt)
          && (!filterTipoEnt || e.tipo === filterTipoEnt)
          && (!filterFechaEnt || e.fecha?.startsWith(filterFechaEnt));
      })
      .sort((a, b) => b.fecha.localeCompare(a.fecha));
  }, [entregas, beneficiarios, campanas, search, filterCampanaEnt, filterTipoEnt, filterFechaEnt]);

  const selCamp = campanas.find((c) => c.id === selectedId);
  const selEntregas = selCamp ? entregas.filter((e) => e.campanaId === selCamp.id) : [];
  const selBenefsUnicos = new Set(selEntregas.map((e) => e.beneficiarioId)).size;
  const selAlcanzados = selCamp?.metaTipo === 'Personas'
    ? selEntregas.reduce((s, e) => { const b = beneficiarios.find(x => x.id === e.beneficiarioId); return s + (b?.familia || 1); }, 0)
    : selBenefsUnicos;
  const selProgress = selCamp && selCamp.metaFamilias > 0 ? Math.min(100, Math.round((selAlcanzados / selCamp.metaFamilias) * 100)) : 0;

  const openNewBen = (type: 'Persona' | 'Casa de Familia' | 'Grupo' | 'Vulnerable') => {
    resetBen();
    setBenefType(type);
    setModal('ben');
  };
  const openEditBen = (id: string) => {
    const b = beneficiarios.find((x) => x.id === id);
    if (!b) return;
    setEditBenId(id);
    setBNombre(b.nombre);
    setBApellido(b.apellido);
    setBTel(b.telefono);
    setBDir(b.direccion);
    setBZona(b.zona);
    setBFamilia(String(b.familia || 1));
    setBEstado(b.estado);
    setBNotas(b.notas);
    setBenefSource(b.source || 'Manual');
    setBenefSourceId(b.sourceId || '');
    setBenefType(b.tipo || 'Persona');
    setBenefRepresentativeName(b.representativeName || '');
    setBenefName(b.nombre); // Assuming nombre stores the group/vulnerable name
    setModal('ben');
  };
  const saveBen = async () => {
    if (benefType === 'Persona' && (!bNombre.trim() || !bApellido.trim())) return showToast('Nombre y apellido son obligatorios');
    if ((benefType === 'Grupo' || benefType === 'Vulnerable') && !benefName.trim()) return showToast('El nombre es obligatorio');
    
    const data = { 
      nombre: benefType === 'Persona' ? bNombre.trim() : benefName.trim(), 
      apellido: benefType === 'Persona' ? bApellido.trim() : '', 
      telefono: bTel.trim(), 
      direccion: bDir.trim(), 
      zona: bZona, 
      familia: parseInt(bFamilia) || 1, 
      estado: bEstado as Beneficiario['estado'], 
      notas: bNotas.trim(), 
      tipo: benefType, 
      source: benefSource, 
      sourceId: benefSource !== 'Manual' ? benefSourceId : undefined,
      representativeName: (benefType === 'Casa de Familia' || benefType === 'Grupo') ? benefRepresentativeName.trim() : undefined 
    };
    if (editBenId) {
      await db.beneficiarios.update(editBenId, data);
      showToast(`Beneficiario "${bNombre} ${bApellido}" actualizado`);
    } else {
      await db.beneficiarios.add(createBaseRecord({ id: uuid(), ...data }));
      showToast(`Beneficiario "${bNombre} ${bApellido}" registrado`);
    }
    resetBen();
    setModal(null);
  };
  const delBen = async () => {
    if (!selectedId) return;
    const b = beneficiarios.find((x) => x.id === selectedId);
    await db.beneficiarios.delete(selectedId);
    showToast(`Beneficiario "${b?.nombre}" eliminado`);
    setModal(null);
  };

  const openNewCamp = () => {
    resetCamp();
    setModal('camp');
  };
  const openEditCamp = (id: string) => {
    const c = campanas.find((x) => x.id === id);
    if (!c) return;
    setEditCampId(id);
    setCNombre(c.nombre);
    setCInicio(c.fechaInicio);
    setCFin(c.fechaFin);
    setCZona(c.zona);
    setCTipo(c.tipo);
    setCMeta(String(c.metaFamilias || ''));
    setCMetaTipo(c.metaTipo || 'Familias');
    setCResp(c.responsable);
    setCEstado(c.estado);
    setCDesc(c.descripcion);
    setModal('camp');
  };
  const saveCamp = async () => {
    if (!cNombre.trim()) return showToast('El nombre de la campaña es obligatorio');
    if (!cInicio) return showToast('La fecha de inicio es obligatoria');
    const data = { nombre: cNombre.trim(), fechaInicio: cInicio, fechaFin: cFin, zona: cZona, tipo: cTipo as Campana['tipo'], metaFamilias: parseInt(cMeta) || 0, metaTipo: cMetaTipo, responsable: cResp.trim(), estado: cEstado as Campana['estado'], descripcion: cDesc.trim() };
    if (editCampId) {
      await db.campanas.update(editCampId, data);
      showToast(`Campaña "${cNombre}" actualizada`);
    } else {
      await db.campanas.add(createBaseRecord({ id: uuid(), ...data }));
      showToast(`Campaña "${cNombre}" creada`);
    }
    resetCamp();
    setModal(null);
  };
  const delCamp = async () => {
    if (!selectedId) return;
    const c = campanas.find((x) => x.id === selectedId);
    await db.campanas.delete(selectedId);
    await db.entregas.where('campanaId').equals(selectedId).delete();
    showToast(`Campaña "${c?.nombre}" eliminada`);
    setModal(null);
  };

  const openNewEnt = () => {
    resetEnt();
    setModal('ent');
  };
  const openEditEnt = (id: string) => {
    const e = entregas.find((x) => x.id === id);
    if (!e) return;
    setEditEntId(id);
    setECampana(e.campanaId);
    setEBenefOrigen((e.beneficiarioTipo as 'Convertido' | 'Miembro' | 'Manual') || 'Manual');
    setEBenefId(e.beneficiarioId || '');
    setEBenefManual(e.beneficiarioNombre ?? '');
    setEFecha(e.fecha);
    setETipo(e.tipo);
    setECant(String(e.cantidad));
    setEUnidad(e.unidad);
    setENotas(e.notas);
    setModal('ent');
  };
  const saveEnt = async () => {
    if (!eCampana) return showToast('Selecciona una campaña');
    
    let beneficiarioId = '';
    let nombreBeneficiario = '';

    if (eBenefOrigen === 'Manual') {
        if (!eBenefManual.trim()) return showToast('Escribe el nombre del beneficiario');
        nombreBeneficiario = eBenefManual.trim();
    } else {
        if (!eBenefId) return showToast('Selecciona un beneficiario de la lista');
        const lista = eBenefOrigen === 'Convertido' ? conversiones : miembros;
        const b = lista.find(x => x.id === eBenefId);
        if (!b) return showToast('Beneficiario no encontrado');
        beneficiarioId = b.id;
        nombreBeneficiario = `${b.nombre} ${b.apellido}`;
    }

    const data = { 
        campanaId: eCampana, 
        beneficiarioId: beneficiarioId, 
        beneficiarioNombre: nombreBeneficiario, 
        beneficiarioTipo: eBenefOrigen,
        fecha: eFecha, 
        tipo: eTipo.trim() || 'Canasta básica', 
        cantidad: parseFloat(eCant) || 1, 
        unidad: eUnidad.trim() || 'unidad', 
        notas: eNotas.trim() 
    };

    if (editEntId) {
      await db.entregas.update(editEntId, data);
      showToast('Entrega actualizada');
    } else {
      await db.entregas.add(createBaseRecord({ id: uuid(), ...data }));
      showToast('Entrega registrada');
    }
    resetEnt();
    setModal(null);
  };
  const delEnt = async () => {
    if (!selectedId) return;
    await db.entregas.delete(selectedId);
    showToast('Entrega eliminada');
    setModal(null);
  };

  return (
    <Layout title="Manos Abiertas">
      <div className="page-manos">
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--manos-terracota)', letterSpacing: 1 }}>
            Manos Abiertas
          </div>
          <div style={{ fontFamily: 'var(--font-reading)', color: 'var(--dim)', fontSize: 14, marginTop: 4, fontStyle: 'italic' }}>
            Acción social · Beneficiarios · Campañas
          </div>
        </div>

        <div className="kpis">
          <KpiCard label="Beneficiarios Activos" value={kpis.activos} icon="🏠" accent="var(--manos-terracota)" sub={`${beneficiarios.length} totales`} />
          <KpiCard label="Campañas Activas" value={kpis.campActivas} icon="📢" accent="var(--oro-apostolico)" sub={`${campanas.length} totales`} />
          <KpiCard label="Familias Impactadas" value={kpis.familias} icon="👪" accent="var(--green)" sub={metasDoc?.familias ? `${money(kpis.familias)} / ${money(metasDoc.familias)} (${Math.round((kpis.familias / metasDoc.familias) * 100)}%)` : `${kpis.personas} personas`} />
          <KpiCard label="Personas Impactadas" value={kpis.personas} icon="🧑" accent="var(--manos-terracota)" sub={metasDoc?.personas ? `${money(kpis.personas)} / ${money(metasDoc.personas)} (${Math.round((kpis.personas / metasDoc.personas) * 100)}%)` : `${kpis.familias} familias`} />
        </div>

        <div className="tabs">
          <button className={`tab ${tab === 'ben' ? 'active' : ''}`} onClick={() => { setTab('ben'); setSearch(''); setFilterEstado(''); setFilterZona(''); setFilterFamilia(''); }}>
            🏠 Beneficiarios ({beneficiarios.length})
          </button>
          <button className={`tab ${tab === 'camp' ? 'active' : ''}`} onClick={() => { setTab('camp'); setSearch(''); setFilterTipoCamp(''); setFilterEstadoCamp(''); setFilterAnio(new Date().getFullYear().toString()); }}>
            📢 Campañas ({campanas.length})
          </button>
          <button className={`tab ${tab === 'ent' ? 'active' : ''}`} onClick={() => { setTab('ent'); setSearch(''); setFilterCampanaEnt(''); setFilterTipoEnt(''); setFilterFechaEnt(''); }}>
            📦 Entregas ({entregas.length})
          </button>
        </div>

        <ActionsRow
          tab={tab}
          benFiltrados={benFiltrados}
          campFiltradas={campFiltradas}
          entFiltradas={entFiltradas}
          entregas={entregas}
          beneficiarios={beneficiarios}
          campanas={campanas}
          openNewBen={openNewBen}
          openNewCamp={openNewCamp}
          openNewEnt={openNewEnt}
        />

        {tab === 'ben' && (
          <BeneficiariosTab
            benFiltrados={benFiltrados}
            beneficiarios={beneficiarios}
            entregas={entregas}
            zonas={zonas}
            search={search} setSearch={setSearch}
            filterEstado={filterEstado} setFilterEstado={setFilterEstado}
            filterZona={filterZona} setFilterZona={setFilterZona}
            filterFamilia={filterFamilia} setFilterFamilia={setFilterFamilia}
            filterTipo={filterTipo} setFilterTipo={setFilterTipo}
            filterSource={filterSource} setFilterSource={setFilterSource}
            openEditBen={openEditBen}
            onEntregaParaBen={(b) => { openNewEnt(); setTimeout(() => { setEBenefOrigen('Manual'); setEBenefManual(`${b.nombre} ${b.apellido}`); }, 50); }}
            onDeleteBen={(id) => { setSelectedId(id); setModal('delBen'); }}
          />
        )}

        {tab === 'camp' && (
          <CampanasTab
            campFiltradas={campFiltradas}
            campanas={campanas}
            entregas={entregas}
            beneficiarios={beneficiarios}
            search={search} setSearch={setSearch}
            filterAnio={filterAnio} setFilterAnio={setFilterAnio}
            filterTipoCamp={filterTipoCamp} setFilterTipoCamp={setFilterTipoCamp}
            filterEstadoCamp={filterEstadoCamp} setFilterEstadoCamp={setFilterEstadoCamp}
            openEditCamp={openEditCamp}
            onVerCamp={(id) => { setSelectedId(id); setModal('detailCamp'); }}
            onEntregaParaCamp={(id) => { openNewEnt(); setTimeout(() => setECampana(id), 50); }}
            onDeleteCamp={(id) => { setSelectedId(id); setModal('delCamp'); }}
          />
        )}

        {tab === 'ent' && (
          <EntregasTab
            entFiltradas={entFiltradas}
            entregas={entregas}
            beneficiarios={beneficiarios}
            campanas={campanas}
            search={search} setSearch={setSearch}
            filterFechaEnt={filterFechaEnt} setFilterFechaEnt={setFilterFechaEnt}
            filterCampanaEnt={filterCampanaEnt} setFilterCampanaEnt={setFilterCampanaEnt}
            filterTipoEnt={filterTipoEnt} setFilterTipoEnt={setFilterTipoEnt}
            openEditEnt={openEditEnt}
            onDeleteEnt={(id) => { setSelectedId(id); setModal('delEnt'); }}
          />
        )}

        <BeneficiarioFormModal
          open={modal === 'ben'}
          onClose={() => setModal(null)}
          editBenId={editBenId}
          saveBen={saveBen}
          typeAccent={typeAccent}
          benefType={benefType} setBenefType={setBenefType}
          benefSource={benefSource} setBenefSource={setBenefSource}
          benefSourceId={benefSourceId} setBenefSourceId={setBenefSourceId}
          conversiones={conversiones}
          miembros={miembros}
          bNombre={bNombre} setBNombre={setBNombre}
          bApellido={bApellido} setBApellido={setBApellido}
          benefName={benefName} setBenefName={setBenefName}
          benefRepresentativeName={benefRepresentativeName} setBenefRepresentativeName={setBenefRepresentativeName}
          bTel={bTel} setBTel={setBTel}
          bDir={bDir} setBDir={setBDir}
          bFamilia={bFamilia} setBFamilia={setBFamilia}
          bZona={bZona} setBZona={setBZona}
          bEstado={bEstado} setBEstado={setBEstado}
          bNotas={bNotas} setBNotas={setBNotas}
        />

        <CampanaFormModal
          open={modal === 'camp'}
          onClose={() => setModal(null)}
          editCampId={editCampId}
          saveCamp={saveCamp}
          cNombre={cNombre} setCNombre={setCNombre}
          cTipo={cTipo} setCTipo={setCTipo}
          cEstado={cEstado} setCEstado={setCEstado}
          cInicio={cInicio} setCInicio={setCInicio}
          cFin={cFin} setCFin={setCFin}
          cZona={cZona} setCZona={setCZona}
          cMetaTipo={cMetaTipo} setCMetaTipo={setCMetaTipo}
          cMeta={cMeta} setCMeta={setCMeta}
          cResp={cResp} setCResp={setCResp}
          cDesc={cDesc} setCDesc={setCDesc}
        />

        <EntregaFormModal
          open={modal === 'ent'}
          onClose={() => setModal(null)}
          editEntId={editEntId}
          saveEnt={saveEnt}
          eCampana={eCampana} setECampana={setECampana}
          campanas={campanas}
          eBenefOrigen={eBenefOrigen} setEBenefOrigen={setEBenefOrigen}
          eBenefManual={eBenefManual} setEBenefManual={setEBenefManual}
          eBenefId={eBenefId} setEBenefId={setEBenefId}
          conversiones={conversiones}
          miembros={miembros}
          eFecha={eFecha} setEFecha={setEFecha}
          eTipo={eTipo} setETipo={setETipo}
          eCant={eCant} setECant={setECant}
          eUnidad={eUnidad} setEUnidad={setEUnidad}
          eNotas={eNotas} setENotas={setENotas}
        />

        <CampanaDetailModal
          open={modal === 'detailCamp'}
          onClose={() => setModal(null)}
          selCamp={selCamp}
          selEntregas={selEntregas}
          beneficiarios={beneficiarios}
          selAlcanzados={selAlcanzados}
          selProgress={selProgress}
        />

        <DeleteModals
          modal={modal}
          onClose={() => setModal(null)}
          delBen={delBen}
          delCamp={delCamp}
          delEnt={delEnt}
        />
      </div>
    </Layout>
  );
}
