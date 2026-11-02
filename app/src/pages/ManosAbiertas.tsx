import { useState, useMemo } from 'react';
import { v4 as uuid } from 'uuid';
import { useLiveQuery } from 'dexie-react-hooks';
import { Layout } from '../components/Layout';
import { KpiCard } from '../components/KpiCard';
import { db } from '../lib/database';
import { createBaseRecord } from '../lib/utils/recordHelpers';
import { beneficiarioConDatos, conversionConDatos, mapaPersonas, miembroConDatos } from '../lib/personaDatos';
import { asegurarPersonaDeBeneficiario } from '../lib/personas';
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
  const beneficiariosCrudos = useLiveQuery(() => db.beneficiarios.toArray(), []) ?? [];
  const campanas = useLiveQuery(() => db.campanas.toArray(), []) ?? [];
  const entregas = useLiveQuery(() => db.entregas.toArray(), []) ?? [];
  const zonas = useLiveQuery(() => db.zonas.toArray(), []) ?? [];
  const metasDoc = useLiveQuery(() => db.metas.get('default'), []);
  const personas = useLiveQuery(() => db.personas.toArray(), []) ?? [];
  const conversionesCrudas = useLiveQuery(() => db.conversiones.toArray(), []) ?? [];
  const miembrosCrudos = useLiveQuery(() => db.miembros.toArray(), []) ?? [];

  // P5 (ficha única): las LECTURAS pintan a los beneficiarios DECORADOS —
  // su nombre/contacto se resuelven desde el núcleo `personas` (única
  // fuente): para Persona/Vulnerable, los de la propia persona; para
  // «Casa de Familia»/«Grupo», los de su REPRESENTANTE. Las escrituras
  // usan las fichas CRUDAS; los satélites (entregas) siguen colgando del
  // proceso beneficiario, sin cambio de FK. Conversiones y miembros
  // también se decoran: el nombre que una entrega guarda como foto
  // histórica (`beneficiarioNombre`) nace de la persona, no de la copia
  // dormida del proceso.
  const personasMap = useMemo(() => mapaPersonas(personas), [personas]);
  const beneficiarios = useMemo(
    () => beneficiariosCrudos.map((b) => beneficiarioConDatos(b, personasMap)),
    [beneficiariosCrudos, personasMap],
  );
  const conversiones = useMemo(
    () => conversionesCrudas.map((c) => conversionConDatos(c, personasMap)),
    [conversionesCrudas, personasMap],
  );
  const miembros = useMemo(
    () => miembrosCrudos.map((m) => miembroConDatos(m, personasMap)),
    [miembrosCrudos, personasMap],
  );

  const [tab, setTab] = useState<Tab>('ben');
  const [search, setSearch] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [filterZona, setFilterZona] = useState('');
  const [filterFamilia, setFilterFamilia] = useState('');
  const [filterTipo, setFilterTipo] = useState('');
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

  // P5: los datos personales del beneficiario ya NO viven en estados del
  // formulario — viven en la ficha única de la persona enlazada
  // (bPersonaId): para Persona/Vulnerable, la persona ayudada; para Casa
  // de Familia/Grupo, su representante. Murió el useEffect que copiaba
  // nombre/teléfono/dirección/zona/estado desde la conversión o el
  // miembro elegidos como «origen»: la persona ES el origen.
  const [bPersonaId, setBPersonaId] = useState('');
  const [bFamilia, setBFamilia] = useState('1');
  const [bEstado, setBEstado] = useState('Activo');
  const [bNotas, setBNotas] = useState('');

  const [benefType, setBenefType] = useState<'Persona' | 'Casa de Familia' | 'Grupo' | 'Vulnerable'>('Persona');
  const [benefName, setBenefName] = useState(''); // Nombre del hogar o grupo (Casa de Familia/Grupo)

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
    setBPersonaId('');
    setBFamilia('1');
    setBEstado('Activo');
    setBNotas('');
    setBenefType('Persona');
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
        && (!filterTipo || b.tipo === filterTipo);
    });
  }, [beneficiarios, search, filterEstado, filterZona, filterFamilia, filterTipo]);

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
  const openEditBen = async (id: string) => {
    const b = beneficiariosCrudos.find((x) => x.id === id);
    if (!b) return;
    setEditBenId(id);
    let personaId = b.personaId ?? '';
    // P5: un beneficiario Persona/Vulnerable viejo y sin persona (llegó de
    // un equipo sin actualizar) se asegura la suya al editarlo, con la
    // regla determinista de P2–P4. Una Casa/Grupo NUNCA recibe persona
    // fabricada: su personaId es solo el representante que se elija.
    if ((b.tipo === 'Persona' || b.tipo === 'Vulnerable') && !personaId) {
      personaId = await asegurarPersonaDeBeneficiario(b);
    }
    setBPersonaId(personaId);
    setBenefType(b.tipo || 'Persona');
    setBenefName(b.tipo === 'Casa de Familia' || b.tipo === 'Grupo' ? b.nombre : '');
    setBFamilia(String(b.familia || 1));
    setBEstado(b.estado);
    setBNotas(b.notas);
    setModal('ben');
  };
  const saveBen = async () => {
    const esPersona = benefType === 'Persona' || benefType === 'Vulnerable';
    if (esPersona && !bPersonaId) return showToast('Elige la persona beneficiaria (o créala con «➕ Nueva persona»)');
    if (!esPersona && !benefName.trim()) return showToast('El nombre es obligatorio');
    const persona = bPersonaId ? personas.find((p) => p.id === bPersonaId) : undefined;
    if (bPersonaId && !persona) return showToast('La persona elegida ya no existe');
    const nombrePersona = persona ? `${persona.nombre} ${persona.apellido}`.trim() : '';
    const nombreVisible = esPersona ? nombrePersona : benefName.trim();
    // P5: solo datos del PROCESO y el enlace. La identidad vive en la
    // persona enlazada; ninguna escritura nueva produce source/sourceId.
    const proceso = {
      tipo: benefType,
      familia: parseInt(bFamilia) || 1,
      estado: bEstado as Beneficiario['estado'],
      notas: bNotas.trim(),
      personaId: esPersona ? bPersonaId : (bPersonaId || null),
    };
    if (editBenId) {
      // La edición NO reescribe los personales dormidos: quedan como
      // última foto en la ficha, pero ya nadie los lee. En Casa/Grupo sí
      // se guarda su nombre (es del proceso) y la foto del representante.
      await db.beneficiarios.update(editBenId, esPersona
        ? proceso
        : { ...proceso, nombre: benefName.trim(), representativeName: nombrePersona });
      showToast(`Beneficiario "${nombreVisible}" actualizado`);
    } else {
      // El proceso nace SIN datos personales (vacíos a propósito): viven
      // en la persona enlazada, una sola vez. En Casa/Grupo el nombre es
      // el del hogar/grupo y el contacto nacerá del representante.
      await db.beneficiarios.add(createBaseRecord({
        id: uuid(),
        nombre: esPersona ? '' : benefName.trim(),
        apellido: '',
        telefono: '',
        direccion: '',
        zona: '',
        representativeName: esPersona ? '' : nombrePersona,
        ...proceso,
      }));
      showToast(`Beneficiario "${nombreVisible}" registrado`);
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
          personas={personas}
          benefType={benefType} setBenefType={setBenefType}
          bPersonaId={bPersonaId} setBPersonaId={setBPersonaId}
          benefName={benefName} setBenefName={setBenefName}
          bFamilia={bFamilia} setBFamilia={setBFamilia}
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
