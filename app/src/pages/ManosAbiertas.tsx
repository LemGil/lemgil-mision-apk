import { useState, useMemo, useEffect } from 'react';
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
import type { Beneficiario, Campana } from '../lib/types';
import { CsvImportButton } from '../components/CsvImportButton';

import { today, fmt, money, monthKey } from '../lib/utils';

const EST_BEN: Record<string, string> = { Activo: 'badge-green', Inactivo: 'badge-red' };
const CAMP_EST: Record<string, string> = { Planificada: 'badge-blue', 'En curso': 'badge-yellow', Completada: 'badge-green', Cancelada: 'badge-red' };
const TIPO_CAMP: Record<string, string> = { Alimentaria: 'badge-red', Escolar: 'badge-blue', Salud: 'badge-green', Vivienda: 'badge-yellow', Navidad: 'badge-purple', Otra: 'badge-blue' };

type Tab = 'ben' | 'camp' | 'ent';
type ModalType = 'ben' | 'camp' | 'ent' | 'detailCamp' | 'delBen' | 'delCamp' | 'delEnt';

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
  const [toast, setToast] = useState('');

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

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3200);
  };

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
        && matchFamilia;
    });
  }, [beneficiarios, search, filterEstado, filterZona, filterFamilia]);

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
      await db.beneficiarios.add({ id: uuid(), creado: new Date().toISOString(), ...data });
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
      await db.campanas.add({ id: uuid(), creado: new Date().toISOString(), ...data });
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
    setEBenefOrigen((e as any).beneficiarioTipo || 'Manual');
    setEBenefId(e.beneficiarioId || '');
    setEBenefManual((e as any).beneficiarioNombre || '');
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
      await db.entregas.add({ id: uuid(), creado: new Date().toISOString(), ...data });
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

        <div className="actions-row">
      {tab === 'ben' && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button className="btn" style={{ background: '#fff', border: '2px solid var(--blue)', color: 'var(--blue)', fontWeight: 600 }} onClick={() => openNewBen('Persona')}>➕ Persona</button>
          <button className="btn" style={{ background: '#fff', border: '2px solid var(--gold)', color: 'var(--gold)', fontWeight: 600 }} onClick={() => openNewBen('Casa de Familia')}>➕ Casa</button>
          <button className="btn" style={{ background: '#fff', border: '2px solid var(--green)', color: 'var(--green)', fontWeight: 600 }} onClick={() => openNewBen('Grupo')}>➕ Grupo</button>
          <button className="btn" style={{ background: '#fff', border: '2px solid var(--red)', color: 'var(--red)', fontWeight: 600 }} onClick={() => openNewBen('Vulnerable')}>➕ Vulnerable</button>
        </div>
      )}
          {tab === 'ben' && (
            <>
              <button className="btn btn-secondary" onClick={() => {
                if (!benFiltrados.length) return showToast('No hay beneficiarios para exportar');
                const doc = new jsPDF();
                doc.setFontSize(18);
                doc.text('Beneficiarios Manos Abiertas', 14, 20);
                doc.setFontSize(10);
                doc.setTextColor(120);
                doc.text(`Generado: ${new Date().toLocaleDateString('es-ES')} · Total: ${benFiltrados.length}`, 14, 28);
                const rows = benFiltrados.map(b => [`${b.nombre} ${b.apellido}`, b.telefono || '—', b.zona || '—', b.direccion || '—', b.familia, b.estado]);
                autoTable(doc, { startY: 34, head: [['Nombre', 'Teléfono', 'Zona', 'Dirección', 'Familia', 'Estado']], body: rows, styles: { fontSize: 9 }, headStyles: { fillColor: [212, 168, 67] } });
                doc.save('lemgil-beneficiarios.pdf');
                showToast('PDF exportado');
              }}>📄 Exportar PDF</button>
              <button className="btn btn-secondary" onClick={() => {
                if (!benFiltrados.length) return showToast('No hay beneficiarios para exportar');
                const h = ['Nombre', 'Apellido', 'Teléfono', 'Zona', 'Dirección', 'Familia', 'Estado', 'Notas'];
                const r = benFiltrados.map(b => [b.nombre, b.apellido, b.telefono || '', b.zona || '', b.direccion || '', b.familia, b.estado, (b.notas || '').replace(/,/g, ';')]);
                exportCSV(h, r, 'lemgil-beneficiarios.csv');
                showToast('CSV exportado');
              }}>📥 Exportar CSV</button>
              <CsvImportButton<Beneficiario>
                table="beneficiarios"
                fieldMapping={{
                  'Nombre': 'nombre',
                  'Apellido': 'apellido',
                  'Teléfono': 'telefono',
                  'Dirección': 'direccion',
                  'Zona': 'zona',
                  'Familia': 'familia',
                  'Estado': 'estado',
                  'Notas': 'notas',
                  'Tipo': 'tipo',
                }}
                requiredFields={['nombre', 'apellido']}
                defaults={{ estado: 'Activo', familia: 1, tipo: 'Persona', source: 'Manual' }}
                onImport={(n) => showToast(`${n} beneficiario(s) importado(s)`)}
              />
            </>
          )}
          {tab === 'camp' && <button className="btn btn-gold" onClick={openNewCamp}>📢 Nueva Campaña</button>}
          {tab === 'camp' && (
            <>
              <button className="btn btn-secondary" onClick={() => {
                if (!campFiltradas.length) return showToast('No hay campañas para exportar');
                const doc = new jsPDF();
                doc.setFontSize(18);
                doc.text('Campañas Solidarias', 14, 20);
                doc.setFontSize(10);
                doc.setTextColor(120);
                doc.text(`Generado: ${new Date().toLocaleDateString('es-ES')} · Total: ${campFiltradas.length}`, 14, 28);
                const rows = campFiltradas.map(c => {
                  const ents = entregas.filter(e => e.campanaId === c.id);
                  const metaLabel = c.metaTipo === 'Personas' ? 'personas' : 'familias';
                  return [c.nombre, c.tipo, c.responsable || '—', c.estado, `${ents.length} entregas`, `${c.metaFamilias || '—'} ${metaLabel}`];
                });
                autoTable(doc, { startY: 34, head: [['Nombre', 'Tipo', 'Responsable', 'Estado', 'Entregas', 'Meta']], body: rows, styles: { fontSize: 9 }, headStyles: { fillColor: [212, 168, 67] } });
                doc.save('lemgil-campanas.pdf');
                showToast('PDF exportado');
              }}>📄 Exportar PDF</button>
              <button className="btn btn-secondary" onClick={() => {
                if (!campFiltradas.length) return showToast('No hay campañas para exportar');
                const h = ['Nombre', 'Tipo', 'Responsable', 'Estado', 'Fecha Inicio', 'Meta', 'Tipo Meta', 'Descripción'];
                const r = campFiltradas.map(c => [c.nombre, c.tipo, c.responsable || '', c.estado, c.fechaInicio || '', c.metaFamilias || '', c.metaTipo || 'Familias', (c.descripcion || '').replace(/,/g, ';')]);
                exportCSV(h, r, 'lemgil-campanas.csv');
                showToast('CSV exportado');
              }}>📥 Exportar CSV</button>
              <CsvImportButton<Campana>
                table="campanas"
                fieldMapping={{
                  'Nombre': 'nombre',
                  'Tipo': 'tipo',
                  'Responsable': 'responsable',
                  'Estado': 'estado',
                  'Fecha Inicio': 'fechaInicio',
                  'Fecha Fin': 'fechaFin',
                  'Meta': 'metaFamilias',
                  'Tipo Meta': 'metaTipo',
                  'Zona': 'zona',
                  'Descripción': 'descripcion',
                }}
                requiredFields={['nombre']}
                defaults={{ estado: 'Planificada', metaFamilias: 0, metaTipo: 'Familias', tipo: 'Otra' }}
                onImport={(n) => showToast(`${n} campaña(s) importada(s)`)}
              />
            </>
          )}
          {tab === 'ent' && <button className="btn btn-gold" onClick={openNewEnt}>📦 Registrar Entrega</button>}
          {tab === 'ent' && (
            <>
              <button className="btn btn-secondary" onClick={() => {
                if (!entFiltradas.length) return showToast('No hay entregas para exportar');
                const doc = new jsPDF();
                doc.setFontSize(18);
                doc.text('Historial de Entregas', 14, 20);
                doc.setFontSize(10);
                doc.setTextColor(120);
                doc.text(`Generado: ${new Date().toLocaleDateString('es-ES')} · Total: ${entFiltradas.length}`, 14, 28);
                const rows = entFiltradas.map(e => {
                  const ben = beneficiarios.find(b => b.id === e.beneficiarioId);
                  const camp = campanas.find(c => c.id === e.campanaId);
                  return [e.fecha, ben ? `${ben.nombre} ${ben.apellido}` : '—', camp?.nombre || '—', e.tipo, e.cantidad, (e.notas || '').slice(0, 30)];
                });
                autoTable(doc, { startY: 34, head: [['Fecha', 'Beneficiario', 'Campaña', 'Tipo', 'Cantidad', 'Notas']], body: rows, styles: { fontSize: 9 }, headStyles: { fillColor: [212, 168, 67] } });
                doc.save('lemgil-entregas.pdf');
                showToast('PDF exportado');
              }}>📄 Exportar PDF</button>
              <button className="btn btn-secondary" onClick={() => {
                if (!entFiltradas.length) return showToast('No hay entregas para exportar');
                const h = ['Fecha', 'Beneficiario', 'Campaña', 'Tipo', 'Cantidad', 'Notas'];
                const r = entFiltradas.map(e => {
                  const ben = beneficiarios.find(b => b.id === e.beneficiarioId);
                  const camp = campanas.find(c => c.id === e.campanaId);
                  return [e.fecha, ben ? `${ben.nombre} ${ben.apellido}` : '—', camp?.nombre || '—', e.tipo, e.cantidad, (e.notas || '').replace(/,/g, ';')];
                });
                exportCSV(h, r, 'lemgil-entregas.csv');
                showToast('CSV exportado');
              }}>📥 Exportar CSV</button>
            </>
          )}
        </div>

        {tab === 'ben' && (
          <>
            <div className="search-bar">
              <input className="search-input" placeholder="🔍 Buscar nombre, teléfono, dirección…" value={search} onChange={(e) => setSearch(e.target.value)} />
              <select className="filter-select" value={filterEstado} onChange={(e) => setFilterEstado(e.target.value)}>
                <option value="">Todos los estados</option>
                <option>Activo</option>
                <option>Inactivo</option>
              </select>
              <select className="filter-select" value={filterZona} onChange={(e) => setFilterZona(e.target.value)}>
                <option value="">Todas las zonas</option>
                {zonas.slice().sort((a, b) => a.nombre.localeCompare(b.nombre)).map((z) => <option key={z.id}>{z.nombre}</option>)}
              </select>
              <select className="filter-select" value={filterFamilia} onChange={(e) => setFilterFamilia(e.target.value)}>
                <option value="">Todas las familias</option>
                <option value="1">1 persona</option>
                <option value="2-4">2-4 personas</option>
                <option value="5+">5+ personas</option>
              </select>
            </div>

            <div className="card">
              <div className="card-header">
                <div className="card-title">🏠 Registro de Beneficiarios</div>
                <div style={{ fontSize: 12, color: 'var(--dim)' }}>{benFiltrados.length} registros</div>
              </div>
              {benFiltrados.length === 0 ? (
                <EmptyState icon="🏠" title={beneficiarios.length ? 'Sin resultados' : 'Sin beneficiarios aún'} sub={beneficiarios.length ? 'Prueba otros filtros' : 'Registra el primer beneficiario'} />
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Nombre</th>
                      <th>Zona</th>
                      <th>Dirección</th>
                      <th>Familia</th>
                      <th>Entregas</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {benFiltrados.map((b, i) => {
                      const entCount = entregas.filter((e) => e.beneficiarioId === b.id).length;
                      return (
                        <tr key={b.id}>
                          <td style={{ color: 'var(--dim)' }}>{i + 1}</td>
                          <td><strong>{b.nombre} {b.apellido}</strong>{b.telefono && (<><br /><span style={{ fontSize: 10, color: 'var(--dim)' }}>{b.telefono}</span></>)}</td>
                          <td>{b.zona || '—'}</td>
                          <td style={{ fontSize: 12 }}>{b.direccion || '—'}</td>
                          <td style={{ textAlign: 'center', fontWeight: 700 }}>{b.familia || 1}</td>
                          <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--oro-apostolico)' }}>{entCount}</td>
                          <td><span className={`badge ${EST_BEN[b.estado] || 'badge-blue'}`}>{b.estado}</span></td>
                          <td>
                            <div style={{ display: 'flex', gap: 5 }}>
                              <button className="btn btn-secondary btn-sm" onClick={() => openEditBen(b.id)}>✏️</button>
                              <button className="btn btn-secondary btn-sm" onClick={() => { openNewEnt(); setTimeout(() => { setEBenefOrigen('Manual'); setEBenefManual(`${b.nombre} ${b.apellido}`); }, 50); }}>📦</button>
                              <button className="btn btn-danger btn-sm" onClick={() => { setSelectedId(b.id); setModal('delBen'); }}>🗑️</button>
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

        {tab === 'camp' && (
          <>
            <div className="search-bar">
              <input className="search-input" placeholder="🔍 Buscar nombre, responsable…" value={search} onChange={(e) => setSearch(e.target.value)} />
              <select className="filter-select" value={filterAnio} onChange={(e) => setFilterAnio(e.target.value)}>
                <option value="">Todos los años</option>
                {[...new Set(campanas.map(c => c.fechaInicio?.slice(0, 4)).filter(Boolean))].sort().reverse().map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <select className="filter-select" value={filterTipoCamp} onChange={(e) => setFilterTipoCamp(e.target.value)}>
                <option value="">Todos los tipos</option>
                <option>Alimentaria</option>
                <option>Escolar</option>
                <option>Salud</option>
                <option>Vivienda</option>
                <option>Navidad</option>
                <option>Otra</option>
              </select>
              <select className="filter-select" value={filterEstadoCamp} onChange={(e) => setFilterEstadoCamp(e.target.value)}>
                <option value="">Todos los estados</option>
                <option>Planificada</option>
                <option>En curso</option>
                <option>Finalizada</option>
              </select>
            </div>

            <div className="card">
              <div className="card-header">
                <div className="card-title">📢 Campañas Solidarias</div>
                <div style={{ fontSize: 12, color: 'var(--dim)' }}>{campFiltradas.length} campañas</div>
              </div>
              {campFiltradas.length === 0 ? (
                <EmptyState icon="📢" title={campanas.length ? 'Sin resultados' : 'Sin campañas aún'} sub={campanas.length ? 'Prueba otros filtros' : 'Crea la primera campaña'} />
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                  {campFiltradas.map((c) => {
                    const ents = entregas.filter((e) => e.campanaId === c.id);
                    const benefUnicos = new Set(ents.map((e) => e.beneficiarioId)).size;
                    const alcanzados = c.metaTipo === 'Personas'
                      ? ents.reduce((s, e) => { const b = beneficiarios.find(x => x.id === e.beneficiarioId); return s + (b?.familia || 1); }, 0)
                      : benefUnicos;
                    const progress = c.metaFamilias > 0 ? Math.min(100, Math.round((alcanzados / c.metaFamilias) * 100)) : 0;
                    const metaLabel = c.metaTipo === 'Personas' ? 'personas' : 'familias';
                    return (
                      <div key={c.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 14, borderLeft: `3px solid var(--manos-terracota)` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                          <div style={{ fontWeight: 800, fontSize: 14, flex: 1 }}>{c.nombre}</div>
                          <span className={`badge ${CAMP_EST[c.estado] || 'badge-blue'}`} style={{ marginLeft: 6 }}>{c.estado}</span>
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--dim)', marginBottom: 6 }}><span className={`badge ${TIPO_CAMP[c.tipo]}`} style={{ fontSize: 9 }}>{c.tipo}</span>{c.zona && ` · 📍 ${c.zona}`}</div>
                        <div style={{ fontSize: 12, color: 'var(--dim)', marginBottom: 4 }}>📅 {fmt(c.fechaInicio)}{c.fechaFin && ` → ${fmt(c.fechaFin)}`}</div>
                        <div style={{ fontSize: 12, color: 'var(--dim)', marginBottom: 8 }}>👤 {c.responsable || 'Sin responsable'}</div>
                        <div style={{ fontSize: 11, color: 'var(--dim)', marginBottom: 4 }}>👥 {alcanzados} / {c.metaFamilias || '∞'} {metaLabel}</div>
                        <div className="progress-bar" style={{ marginBottom: 10 }}>
                          <div className="progress-fill" style={{ width: `${progress}%`, background: 'var(--manos-terracota)' }} />
                        </div>
                        <div style={{ display: 'flex', gap: 5 }}>
                          <button className="btn btn-secondary btn-sm" onClick={() => { setSelectedId(c.id); setModal('detailCamp'); }}>👁 Ver</button>
                          <button className="btn btn-secondary btn-sm" onClick={() => openEditCamp(c.id)}>✏️</button>
                          <button className="btn btn-secondary btn-sm" onClick={() => { openNewEnt(); setTimeout(() => setECampana(c.id), 50); }}>📦</button>
                          <button className="btn btn-danger btn-sm" onClick={() => { setSelectedId(c.id); setModal('delCamp'); }}>🗑️</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {tab === 'ent' && (
          <>
            <div className="search-bar">
              <input className="search-input" placeholder="🔍 Buscar beneficiario, campaña, tipo…" value={search} onChange={(e) => setSearch(e.target.value)} />
              <select className="filter-select" value={filterFechaEnt} onChange={(e) => setFilterFechaEnt(e.target.value)}>
                <option value="">Todas las fechas</option>
                {[...new Set(entregas.map(e => e.fecha?.slice(0, 7)).filter(Boolean))].sort().reverse().map(f => <option key={f} value={f}>{f}</option>)}
              </select>
              <select className="filter-select" value={filterCampanaEnt} onChange={(e) => setFilterCampanaEnt(e.target.value)}>
                <option value="">Todas las campañas</option>
                {campanas.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
              <select className="filter-select" value={filterTipoEnt} onChange={(e) => setFilterTipoEnt(e.target.value)}>
                <option value="">Todos los tipos</option>
                <option>Alimentos</option>
                <option>Ropa</option>
                <option>Medicinas</option>
                <option>Útiles</option>
                <option>Otro</option>
              </select>
            </div>

            <div className="card">
              <div className="card-header">
                <div className="card-title">📦 Historial de Entregas</div>
                <div style={{ fontSize: 12, color: 'var(--dim)' }}>{entFiltradas.length} entregas</div>
              </div>
              {entFiltradas.length === 0 ? (
                <EmptyState icon="📦" title={entregas.length ? 'Sin resultados' : 'Sin entregas aún'} sub={entregas.length ? 'Prueba otros filtros' : 'Registra la primera entrega'} />
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Beneficiario</th>
                      <th>Campaña</th>
                      <th>Tipo</th>
                      <th style={{ textAlign: 'right' }}>Cantidad</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entFiltradas.map((e) => {
                      const ben = beneficiarios.find((x) => x.id === e.beneficiarioId);
                      const camp = campanas.find((x) => x.id === e.campanaId);
                      return (
                        <tr key={e.id}>
                          <td>{fmt(e.fecha)}</td>
                          <td><strong>{ben ? `${ben.nombre} ${ben.apellido}` : '—'}</strong></td>
                          <td>{camp ? camp.nombre : '—'}</td>
                          <td><span className="badge badge-blue">{e.tipo}</span></td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--manos-terracota)' }}>{e.cantidad} {e.unidad}</td>
                          <td>
                            <div style={{ display: 'flex', gap: 5 }}>
                              <button className="btn btn-secondary btn-sm" onClick={() => openEditEnt(e.id)}>✏️</button>
                              <button className="btn btn-danger btn-sm" onClick={() => { setSelectedId(e.id); setModal('delEnt'); }}>🗑️</button>
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
          open={modal === 'ben'}
          onClose={() => setModal(null)}
          title={editBenId ? '✏️ Editar Beneficiario' : `🏠 Nuevo Beneficiario (${benefType})`}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
              <button className="btn" style={{ background: typeAccent, color: 'white' }} onClick={saveBen}>💾 {editBenId ? 'Guardar Cambios' : `Registrar ${benefType}`}</button>
            </>
          }
        >
          <div className="form-section" style={{ color: typeAccent }}>Datos del Beneficiario ({benefType})</div>
          <div className="form-row" style={{ border: `2px solid ${typeAccent}`, padding: '16px', borderRadius: '12px' }}>
            <div className="form-group"><label className="form-label">Origen</label><select className="form-select" value={benefSource} onChange={(e) => { setBenefSource(e.target.value as any); setBenefSourceId(''); }}><option value="Manual">Manual</option><option value="Convertido">Converso (Misión)</option><option value="Miembro">Miembro (Iglesia)</option></select></div>
            
            {benefSource === 'Convertido' && (
              <div className="form-group"><label className="form-label">Converso *</label><select className="form-select" value={benefSourceId} onChange={(e) => setBenefSourceId(e.target.value)}><option value="">Seleccionar converso…</option>{conversiones.map((c) => <option key={c.id} value={c.id}>{c.nombre} {c.apellido}</option>)}</select></div>
            )}
            {benefSource === 'Miembro' && (
              <div className="form-group"><label className="form-label">Miembro *</label><select className="form-select" value={benefSourceId} onChange={(e) => setBenefSourceId(e.target.value)}><option value="">Seleccionar miembro…</option>{miembros.map((m) => <option key={m.id} value={m.id}>{m.nombre} {m.apellido}</option>)}</select></div>
            )}

            <div className="form-group"><label className="form-label">Tipo</label><select className="form-select" value={benefType} onChange={(e) => setBenefType(e.target.value as any)}><option value="Persona">Persona</option><option value="Casa de Familia">Casa de Familia</option><option value="Grupo">Grupo</option><option value="Vulnerable">Vulnerable</option></select></div>
            
            {benefType === 'Persona' ? (
                <>
                    <div className="form-group"><label className="form-label">Nombre *</label><input className="form-input" value={bNombre} onChange={(e) => setBNombre(e.target.value)} placeholder="Nombre" /></div>
                    <div className="form-group"><label className="form-label">Apellido *</label><input className="form-input" value={bApellido} onChange={(e) => setBApellido(e.target.value)} placeholder="Apellido" /></div>
                </>
            ) : (
                <div className="form-group" style={{ gridColumn: 'span 2' }}><label className="form-label">Nombre {benefType} *</label><input className="form-input" value={benefName} onChange={(e) => setBenefName(e.target.value)} placeholder="Ej: Comedor calle 5, Familia Pérez..." /></div>
            )}

            {(benefType === 'Casa de Familia' || benefType === 'Grupo') && (
              <div className="form-group"><label className="form-label">Representante</label><input className="form-input" value={benefRepresentativeName} onChange={(e) => setBenefRepresentativeName(e.target.value)} placeholder="Nombre del representante" /></div>
            )}
            
            {benefType !== 'Vulnerable' && (
                <>
                    <div className="form-group"><label className="form-label">Teléfono</label><input className="form-input" value={bTel} onChange={(e) => setBTel(e.target.value)} placeholder="+1 555 000 0000" /></div>
                    <div className="form-group"><label className="form-label">Dirección / Barrio</label><input className="form-input" value={bDir} onChange={(e) => setBDir(e.target.value)} placeholder="Sector, calle, número…" /></div>
                </>
            )}

            <div className="form-group"><label className="form-label">{benefType === 'Vulnerable' ? 'Personas Aprox.' : 'Cantidad de Familia/Miembros'}</label><input className="form-input" type="number" value={bFamilia} onChange={(e) => setBFamilia(e.target.value)} min="1" /></div>
            <div className="form-group"><label className="form-label">Zona</label><ZonaSelect value={bZona} onChange={setBZona} /></div>
            <div className="form-group"><label className="form-label">Estado</label><select className="form-select" value={bEstado} onChange={(e) => setBEstado(e.target.value)}><option>Activo</option><option>Inactivo</option></select></div>
          </div>
          <div className="form-group" style={{ marginTop: 12 }}><label className="form-label">Notas / Contexto</label><textarea className="form-textarea" value={bNotas} onChange={(e) => setBNotas(e.target.value)} placeholder="Situación familiar, necesidades especiales…" style={{ minHeight: 55 }} /></div>
        </Modal>

        <Modal
          open={modal === 'camp'}
          onClose={() => setModal(null)}
          title={editCampId ? '✏️ Editar Campaña' : '📢 Nueva Campaña'}
          wide
          footer={<><button className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button><button className="btn btn-gold" onClick={saveCamp}>💾 {editCampId ? 'Guardar Cambios' : 'Crear Campaña'}</button></>}
        >
          <div className="form-section">Datos de la Campaña</div>
          <div className="form-row">
            <div className="form-group" style={{ gridColumn: 'span 2' }}><label className="form-label">Nombre de la Campaña *</label><input className="form-input" value={cNombre} onChange={(e) => setCNombre(e.target.value)} placeholder="Ej: Alimentaria Sector Norte" /></div>
            <div className="form-group"><label className="form-label">Tipo</label><select className="form-select" value={cTipo} onChange={(e) => setCTipo(e.target.value)}><option>Alimentaria</option><option>Escolar</option><option>Salud</option><option>Vivienda</option><option>Navidad</option><option>Otra</option></select></div>
            <div className="form-group"><label className="form-label">Estado</label><select className="form-select" value={cEstado} onChange={(e) => setCEstado(e.target.value)}><option>Planificada</option><option>En curso</option><option>Completada</option><option>Cancelada</option></select></div>
            <div className="form-group"><label className="form-label">Fecha de Inicio *</label><input className="form-input" type="date" value={cInicio} onChange={(e) => setCInicio(e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Fecha de Cierre</label><input className="form-input" type="date" value={cFin} onChange={(e) => setCFin(e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Zona</label><ZonaSelect value={cZona} onChange={setCZona} /></div>
            <div className="form-group"><label className="form-label">Meta de</label><select className="form-select" value={cMetaTipo} onChange={(e) => setCMetaTipo(e.target.value as any)}><option value="Familias">Familias</option><option value="Personas">Personas</option></select></div>
            <div className="form-group"><label className="form-label">Meta</label><input className="form-input" type="number" value={cMeta} onChange={(e) => setCMeta(e.target.value)} min="0" placeholder="50" /></div>
            <div className="form-group"><label className="form-label">Responsable</label><input className="form-input" value={cResp} onChange={(e) => setCResp(e.target.value)} placeholder="Nombre del líder" /></div>
          </div>
          <div className="form-group" style={{ marginTop: 12 }}><label className="form-label">Descripción / Objetivos</label><textarea className="form-textarea" value={cDesc} onChange={(e) => setCDesc(e.target.value)} placeholder="¿Qué busca lograr esta campaña?" style={{ minHeight: 55 }} /></div>
        </Modal>

        <Modal
          open={modal === 'ent'}
          onClose={() => setModal(null)}
          title={editEntId ? '✏️ Editar Entrega' : '📦 Registrar Entrega'}
          footer={<><button className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button><button className="btn btn-gold" onClick={saveEnt}>💾 {editEntId ? 'Guardar Cambios' : 'Registrar Entrega'}</button></>}
        >
          <div className="form-section">Datos de la Entrega</div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Campaña *</label><select className="form-select" value={eCampana} onChange={(e) => setECampana(e.target.value)}><option value="">Seleccionar campaña…</option>{campanas.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select></div>
            
            <div className="form-group"><label className="form-label">Origen *</label><select className="form-select" value={eBenefOrigen} onChange={(e) => setEBenefOrigen(e.target.value as any)}><option value="Manual">Manual</option><option value="Convertido">Converso (Misión)</option><option value="Miembro">Miembro (Iglesia)</option></select></div>
            
            {eBenefOrigen === 'Manual' ? (
                <div className="form-group"><label className="form-label">Nombre *</label><input className="form-input" value={eBenefManual} onChange={(e) => setEBenefManual(e.target.value)} placeholder="Nombre del beneficiario" /></div>
            ) : (
                <div className="form-group"><label className="form-label">Beneficiario *</label><select className="form-select" value={eBenefId} onChange={(e) => setEBenefId(e.target.value)}><option value="">Seleccionar…</option>{(eBenefOrigen === 'Convertido' ? conversiones : miembros).map((b) => <option key={b.id} value={b.id}>{b.nombre} {b.apellido}</option>)}</select></div>
            )}

            <div className="form-group"><label className="form-label">Fecha</label><input className="form-input" type="date" value={eFecha} onChange={(e) => setEFecha(e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Tipo de Ayuda</label><input className="form-input" value={eTipo} onChange={(e) => setETipo(e.target.value)} placeholder="Canasta básica" /></div>
            <div className="form-group"><label className="form-label">Cantidad</label><input className="form-input" type="number" value={eCant} onChange={(e) => setECant(e.target.value)} min="0" step="0.5" /></div>
            <div className="form-group"><label className="form-label">Unidad</label><input className="form-input" value={eUnidad} onChange={(e) => setEUnidad(e.target.value)} placeholder="kg, unidades, cajas…" /></div>
          </div>
          <div className="form-group" style={{ marginTop: 12 }}><label className="form-label">Notas</label><textarea className="form-textarea" value={eNotas} onChange={(e) => setENotas(e.target.value)} placeholder="Detalles de la entrega, observaciones…" style={{ minHeight: 55 }} /></div>
        </Modal>

        <Modal
          open={modal === 'detailCamp'}
          onClose={() => setModal(null)}
          title={`📢 ${selCamp?.nombre}`}
          wide
          footer={<button className="btn btn-secondary" onClick={() => setModal(null)}>Cerrar</button>}
        >
          {selCamp && (
            <>
              <div className="detail-row"><span className="detail-label">Tipo</span><span className="detail-value"><span className={`badge ${TIPO_CAMP[selCamp.tipo]}`}>{selCamp.tipo}</span></span></div>
              <div className="detail-row"><span className="detail-label">Estado</span><span className="detail-value"><span className={`badge ${CAMP_EST[selCamp.estado]}`}>{selCamp.estado}</span></span></div>
              <div className="detail-row"><span className="detail-label">Período</span><span className="detail-value">{fmt(selCamp.fechaInicio)}{selCamp.fechaFin && ` → ${fmt(selCamp.fechaFin)}`}</span></div>
              <div className="detail-row"><span className="detail-label">Zona</span><span className="detail-value">{selCamp.zona || '—'}</span></div>
              <div className="detail-row"><span className="detail-label">Responsable</span><span className="detail-value">{selCamp.responsable || '—'}</span></div>
              <div className="detail-row"><span className="detail-label">Meta</span><span className="detail-value">{selCamp.metaFamilias} {selCamp.metaTipo === 'Personas' ? 'personas' : 'familias'}</span></div>
              {selCamp.descripcion && <div className="detail-row"><span className="detail-label">Descripción</span><span className="detail-value" style={{ fontSize: 12, color: 'var(--dim)' }}>{selCamp.descripcion}</span></div>}

              <div className="form-section" style={{ marginTop: 14 }}>Progreso</div>
              <div className="progress-row">
                <div className="progress-header">
                  <span style={{ color: 'var(--txt)' }}>👥 {selCamp.metaTipo === 'Personas' ? 'Personas alcanzadas' : 'Familias alcanzadas'}</span>
                  <span style={{ color: 'var(--manos-terracota)', fontWeight: 700 }}>{selAlcanzados} / {selCamp.metaFamilias || '∞'} · {selProgress}%</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${selProgress}%`, background: 'var(--manos-terracota)' }} />
                </div>
              </div>

              <div className="form-section" style={{ marginTop: 14 }}>Entregas ({selEntregas.length})</div>
              {selEntregas.length === 0 ? (
                <div style={{ color: 'var(--dim)', fontSize: 13, padding: '10px 0' }}>Sin entregas registradas</div>
              ) : (
                selEntregas
                  .sort((a, b) => b.fecha.localeCompare(a.fecha))
                  .map((e) => {
                    const ben = beneficiarios.find((b) => b.id === e.beneficiarioId);
                    return (
                      <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: 'var(--surface-2)', borderRadius: 8, marginBottom: 6 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12, fontWeight: 700 }}>{ben ? `${ben.nombre} ${ben.apellido}` : '—'}</div>
                          <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 2 }}>{fmt(e.fecha)} · {e.tipo}</div>
                        </div>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, color: 'var(--manos-terracota)' }}>{e.cantidad} {e.unidad}</div>
                      </div>
                    );
                  })
              )}
            </>
          )}
        </Modal>

        <Modal open={modal === 'delBen'} onClose={() => setModal(null)} title="⚠️ Eliminar Beneficiario" footer={<><button className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button><button className="btn btn-danger" onClick={delBen}>Sí, Eliminar</button></>}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 44, marginBottom: 10 }}>🗑️</div>
            <p style={{ color: 'var(--dim)', fontSize: 14, lineHeight: 1.6 }}>¿Eliminar este beneficiario?<br />Esta acción no se puede deshacer.</p>
          </div>
        </Modal>

        <Modal open={modal === 'delCamp'} onClose={() => setModal(null)} title="⚠️ Eliminar Campaña" footer={<><button className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button><button className="btn btn-danger" onClick={delCamp}>Sí, Eliminar</button></>}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 44, marginBottom: 10 }}>🗑️</div>
            <p style={{ color: 'var(--dim)', fontSize: 14, lineHeight: 1.6 }}>¿Eliminar la campaña y todas sus entregas asociadas?<br />Esta acción no se puede deshacer.</p>
          </div>
        </Modal>

        <Modal open={modal === 'delEnt'} onClose={() => setModal(null)} title="⚠️ Eliminar Entrega" footer={<><button className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button><button className="btn btn-danger" onClick={delEnt}>Sí, Eliminar</button></>}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 44, marginBottom: 10 }}>🗑️</div>
            <p style={{ color: 'var(--dim)', fontSize: 14, lineHeight: 1.6 }}>¿Eliminar este registro de entrega?<br />Esta acción no se puede deshacer.</p>
          </div>
        </Modal>

        {toast && <div className="toast-container"><div className="toast success">{toast}</div></div>}
      </div>
    </Layout>
  );
}
