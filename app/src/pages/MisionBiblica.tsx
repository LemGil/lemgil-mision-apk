import { useState } from 'react';
import { v4 as uuid } from 'uuid';
import { useLiveQuery } from 'dexie-react-hooks';
import { Layout } from '../components/Layout';
import { KpiCard } from '../components/KpiCard';
import { exportCSV } from '../lib/csvExport';
import { db } from '../lib/database';
import { createBaseRecord } from '../lib/utils/recordHelpers';
import type { Conversion } from '../lib/types';
import { MS, today } from '../lib/utils';
import { showToast } from '../lib/notification';
import { CsvImportButton } from '../components/CsvImportButton';
import { ESTADOS, ESTADOS_TIPO_HITO } from './mision-biblica/constants';
import type { DataTab, ModalType } from './mision-biblica/constants';
import { syncMemberFromConversion } from './mision-biblica/syncMember';
import { ConversionesTable } from './mision-biblica/ConversionesTable';
import { GruposTab } from './mision-biblica/GruposTab';
import { EvangelismoTable } from './mision-biblica/EvangelismoTable';
import { ConversionFormModal } from './mision-biblica/ConversionFormModal';
import { GrupoFormModal } from './mision-biblica/GrupoFormModal';
import { EvangelismoFormModal } from './mision-biblica/EvangelismoFormModal';
import { ConversionDetailModal } from './mision-biblica/ConversionDetailModal';
import { ConfirmModals } from './mision-biblica/ConfirmModals';

export default function MisionBiblica() {
  const convs = useLiveQuery(() => db.conversiones.toArray(), []) ?? [];
  const grupos = useLiveQuery(() => db.grupos.toArray(), []) ?? [];
  const evangels = useLiveQuery(() => db.evangelismos.toArray(), []) ?? [];
  const miembros = useLiveQuery(() => db.miembros.toArray(), []) ?? [];
  const zonas = useLiveQuery(() => db.zonas.toArray(), []) ?? [];

  const [dataTab, setDataTab] = useState<DataTab>('conv');
  const [search, setSearch] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [filterZona, setFilterZona] = useState('');
  const [filterAnoConv, setFilterAnoConv] = useState('');
  const [filterMesConv, setFilterMesConv] = useState('');
  const [filterGrupo, setFilterGrupo] = useState('');
  const [filterLider, setFilterLider] = useState('');
  const [filterBautizado, setFilterBautizado] = useState('');

  const [globalAno, setGlobalAno] = useState('');
  const [globalMes, setGlobalMes] = useState('');

  const [searchG, setSearchG] = useState('');
  const [filterGZona, setFilterGZona] = useState('');
  const [filterGEstado, setFilterGEstado] = useState('');
  const [filterGDia, setFilterGDia] = useState('');

  const [searchE, setSearchE] = useState('');
  const [filterETipo, setFilterETipo] = useState('');
  const [filterEZona, setFilterEZona] = useState('');
  const [filterEMinistro, setFilterEMinistro] = useState('');
  const [filterEMes, setFilterEMes] = useState('');
  const [modal, setModal] = useState<null | ModalType>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [editConvId, setEditConvId] = useState<string | null>(null);
  const [editGrupoId, setEditGrupoId] = useState<string | null>(null);
  const [editEvangId, setEditEvangId] = useState<string | null>(null);

  const [fNombre, setFNombre] = useState('');
  const [fApellido, setFApellido] = useState('');
  const [fTelefono, setFTelefono] = useState('');
  const [fEdad, setFEdad] = useState('');
  const [fDireccion, setFDireccion] = useState('');
  const [fFamilia, setFFamilia] = useState('No');
  const [fFecha, setFFecha] = useState(today());
  const [fZona, setFZona] = useState('');
  const [fLider, setFLider] = useState('');
  const [fLiderCustom, setFLiderCustom] = useState(false);
  const [fEstado, setFEstado] = useState('Nuevo');
  const [fGrupoId, setFGrupoId] = useState('');
  const [fNotas, setFNotas] = useState('');
const [fEmail, setFEmail] = useState('');
const [fProfesion, setFProfesion] = useState('');
const [fBautizado, setFBautizado] = useState(false);
const [fFechaBautismo, setFFechaBautismo] = useState('');
const [fConyuge, setFConyuge] = useState('');
const [fHijos, setFHijos] = useState('');
const [fHistorial, setFHistorial] = useState<{ fecha: string; estado: string; nota: string }[]>([]);
  const [gNombre, setGNombre] = useState('');
  const [gZona, setGZona] = useState('');
  const [gLider, setGLider] = useState('');
  const [gDia, setGDia] = useState('Lunes');
  const [gHora, setGHora] = useState('19:00');
  const [gCap, setGCap] = useState('15');
  const [gLugar, setGLugar] = useState('');
  const [gMeta, setGMeta] = useState('');
  const [eTipo, setETipo] = useState('Visita domiciliaria');
  const [eFecha, setEFecha] = useState(today());
  const [eZona, setEZona] = useState('Norte');
  const [eLider, setELider] = useState('');
  const [eLiderCustom, setELiderCustom] = useState(false);
  const [eParticipantes, setEParticipantes] = useState<string[]>([]);
  const [ePartCustom, setEPartCustom] = useState('');
  const [eContactos, setEContactos] = useState('0');
  const [eConvs, setEConvs] = useState('0');
  const [eNotas, setENotas] = useState('');
  const [sNota, setSNota] = useState('');
  const [sHito, setSHito] = useState(false);
  const [tempEst, setTempEst] = useState<string | null>(null);

  // const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3200); };
  const resetForm = () => { setEditConvId(null); setFNombre(''); setFApellido(''); setFTelefono(''); setFEdad(''); setFDireccion(''); setFFamilia('No'); setFFecha(today()); setFZona(''); setFLider(''); setFLiderCustom(false); setFEstado('Nuevo'); setFGrupoId(''); setFNotas(''); setFEmail(''); setFProfesion(''); setFBautizado(false); setFFechaBautismo(''); setFConyuge(''); setFHijos(''); setFHistorial([]); };
  const resetGrupo = () => { setEditGrupoId(null); setGNombre(''); setGZona(''); setGLider(''); setGDia('Lunes'); setGHora('19:00'); setGCap('15'); setGLugar(''); setGMeta(''); };
  const resetEvang = () => { setEditEvangId(null); setETipo('Visita domiciliaria'); setEFecha(today()); setEZona('Norte'); setELider(''); setELiderCustom(false); setEParticipantes([]); setEPartCustom(''); setEContactos('0'); setEConvs('0'); setENotas(''); };

  const mo = new Date().toISOString().slice(0, 7);
  const mesCount = convs.filter((c) => c.fecha?.startsWith(mo)).length;

  // Helper híbrido: obtiene la fecha en que una conversión alcanzó un estado
  // Usa historial si existe, fallback a fecha de registro
  const getFechaEstado = (c: Conversion, estado: string): string => {
    const entry = c.historial?.find((h) => h.estado === estado);
    return entry?.fecha || c.fecha || '';
  };

  const discCount = convs.filter((c) => c.estado === 'Discipulado').length;
  const bautCount = convs.filter((c) => c.estado === 'Bautizado').length;
  const intCount = convs.filter((c) => c.estado === 'Integrado').length;
  const apaCount = convs.filter((c) => c.estado === 'Apartado').length;
  const falCount = convs.filter((c) => c.estado === 'Fallecido').length;

  // Extract unique years from ALL data sources
  const anos = Array.from(
    new Set([
      ...convs.filter((c) => c.fecha).map((c) => c.fecha!.slice(0, 4)),
      ...evangels.filter((e) => e.fecha).map((e) => e.fecha!.slice(0, 4)),
    ])
  ).filter(Boolean).sort((a, b) => b.localeCompare(a));

  const meses = Array.from(
    new Set([
      ...convs.filter((c) => c.fecha).map((c) => c.fecha!.slice(5, 7)),
      ...evangels.filter((e) => e.fecha).map((e) => e.fecha!.slice(5, 7)),
    ])
  ).filter(Boolean).sort();

  const filtered = convs.filter((c) => {
    const s = `${c.nombre} ${c.apellido} ${c.zona} ${c.lider}`.toLowerCase();
    const byLocal = (!search || s.includes(search.toLowerCase())) 
      && (!filterEstado || c.estado === filterEstado) 
      && (!filterZona || c.zona === filterZona) 
      && (!filterAnoConv || c.fecha?.startsWith(filterAnoConv)) 
      && (!filterMesConv || c.fecha?.slice(5, 7) === filterMesConv)
      && (!filterGrupo || c.grupoId === filterGrupo)
      && (!filterLider || c.lider === filterLider)
      && (!filterBautizado || (filterBautizado === 'si' ? c.bautizado : !c.bautizado));
    const byGlobal = (!globalAno || c.fecha?.startsWith(globalAno)) && (!globalMes || c.fecha?.slice(5, 7) === globalMes);
    return byLocal && byGlobal;
  });

  const gruposFiltrados = grupos.filter((g) => {
    const s = `${g.nombre} ${g.lider}`.toLowerCase();
    if (searchG && !s.includes(searchG.toLowerCase())) return false;
    if (filterGZona && g.zona !== filterGZona) return false;
    if (filterGDia && g.dia !== filterGDia) return false;
    if (filterGEstado) {
      const convsEnProceso = convs.filter(c => c.grupoId === g.id && c.estado !== 'Integrado');
      const cantMiembros = miembros.filter(m => m.grupoId === g.id).length;
      const total = cantMiembros + convsEnProceso.length;
      const capacidad = parseInt(g.capacidad) || 0;
      const pct = capacidad > 0 ? (total / capacidad) * 100 : 0;
      if (filterGEstado === 'disponible' && (pct >= 70 || capacidad === 0)) return false;
      if (filterGEstado === 'casi-lleno' && (pct < 70 || pct >= 100)) return false;
      if (filterGEstado === 'saturado' && pct < 100) return false;
      if (filterGEstado === 'sin-meta' && capacidad > 0) return false;
    }
    if (globalAno || globalMes) {
      const convsEnRango = convs.filter(c => c.grupoId === g.id && c.fecha && (!globalAno || c.fecha.startsWith(globalAno)) && (!globalMes || c.fecha.slice(5, 7) === globalMes));
      const miembrosEnRango = miembros.filter(m => m.grupoId === g.id && m.fechaIngreso && (!globalAno || m.fechaIngreso.startsWith(globalAno)) && (!globalMes || m.fechaIngreso.slice(5, 7) === globalMes));
      if (convsEnRango.length === 0 && miembrosEnRango.length === 0) return false;
    }
    return true;
  });

  const evangelsFiltrados = evangels.filter((e) => {
    const s = `${e.tipo} ${e.zona} ${e.lider} ${e.notas}`.toLowerCase();
    if (searchE && !s.includes(searchE.toLowerCase())) return false;
    if (filterETipo && e.tipo !== filterETipo) return false;
    if (filterEZona && e.zona !== filterEZona) return false;
    if (filterEMinistro && e.lider !== filterEMinistro) return false;
    if (filterEMes && !e.fecha.startsWith(filterEMes)) return false;
    if (globalAno && !e.fecha.startsWith(globalAno)) return false;
    if (globalMes && e.fecha.slice(5, 7) !== globalMes) return false;
    return true;
  });

  const selConv = convs.find((c) => c.id === selectedId);

  // ── CONVERSIONES ──
  const openNewConv = () => { resetForm(); setModal('conv'); };
  const openEditConv = (id: string) => {
    const c = convs.find((x) => x.id === id); if (!c) return;
    setEditConvId(id); setFNombre(c.nombre); setFApellido(c.apellido); setFTelefono(c.telefono);
    setFEdad(c.edad); setFDireccion(c.direccion); setFFamilia(c.familia); setFFecha(c.fecha);
    setFZona(c.zona); setFLider(c.lider);
    const enLista = miembros.some((m) => `${m.nombre} ${m.apellido}` === c.lider);
    setFLiderCustom(!enLista && !!c.lider);
  setFEstado(c.estado); setFGrupoId(c.grupoId || ''); setFNotas(c.notas);
  setFEmail(c.email || ''); setFProfesion(c.profesion || '');
  setFBautizado(!!c.bautizado); setFFechaBautismo(c.fechaBautismo || '');
  setFConyuge(c.conyuge || ''); setFHijos(c.hijos || '');
  setFHistorial(c.historial ? [...c.historial] : []);
  setModal('conv');
  };
  const saveConv = async () => {
    if (!fNombre.trim() || !fApellido.trim()) return showToast('Nombre y apellido son obligatorios');
    if (!fZona) return showToast('Selecciona una zona');
    if (!fLider.trim()) return showToast('Selecciona o escribe el hermano mayor');
    const data = { nombre: fNombre.trim(), apellido: fApellido.trim(), telefono: fTelefono.trim(), edad: fEdad, direccion: fDireccion.trim(), familia: fFamilia, fecha: fFecha, zona: fZona, lider: fLider.trim(), grupoId: fGrupoId, estado: fEstado as Conversion['estado'], notas: fNotas.trim(), hermanoMayorId: editConvId ? (convs.find(x => x.id === editConvId)?.hermanoMayorId ?? null) : null, email: fEmail.trim(), profesion: fProfesion.trim(), bautizado: fBautizado, fechaBautismo: fFechaBautismo, conyuge: fConyuge.trim(), hijos: fHijos.trim(), historial: fHistorial, updatedAt: Date.now() };
    if (editConvId) {
      await db.conversiones.update(editConvId, data);
      const c = convs.find((x) => x.id === editConvId);
      if (c) {
        const synced = await syncMemberFromConversion({ ...c, ...data });
        if (synced) showToast(`🧑 ${fNombre} integrado → Miembros`);
      }
      showToast(`${fNombre} ${fApellido} actualizado/a`);
    } else {
      const id = uuid();
      const nuevo: Conversion = { id, ...data, historial: data.estado && data.estado !== 'Nuevo' ? [{ fecha: data.fecha || today(), estado: data.estado, nota: 'Registro inicial' }] : [], creado: new Date().toISOString(), version: 1 };
      await db.conversiones.add(createBaseRecord(nuevo));
      const synced = await syncMemberFromConversion(nuevo);
      showToast(synced ? `🧑 ${fNombre} registrado e integrado → Miembros` : `${fNombre} ${fApellido} guardado/a correctamente`);
    }
    resetForm(); setModal(null);
  };
  const delConv = async () => {
    if (!selectedId) return;
    await db.conversiones.delete(selectedId);
    showToast('Registro eliminado'); setModal(null);
  };
  const quickAdv = async (id: string) => {
    const c = convs.find((x) => x.id === id); if (!c) return;
    if (c.estado === 'Apartado' || c.estado === 'Fallecido') return;
    const i = ESTADOS.indexOf(c.estado);
    if (i >= 0 && i < ESTADOS.length - 1) {
      const next = ESTADOS[i + 1];
      await db.conversiones.update(id, { estado: next, historial: [...c.historial, { fecha: today(), estado: next, nota: 'Avance rápido' }] });
      const synced = await syncMemberFromConversion({ ...c, estado: next });
      showToast(synced ? `🧑 ${c.nombre} integrado → Miembros` : `${c.nombre} avanzó a ${next}`);
    }
  };
  const openDetail = (id: string) => { setSelectedId(id); setTempEst(null); setSNota(''); setSHito(false); setModal('detail'); };
  const saveSeg = async () => {
    if (!selConv) return;
    const ne = tempEst || selConv.estado;
    const hist = [...selConv.historial];
    if (sNota.trim() || ne !== selConv.estado) hist.push({ fecha: today(), estado: ne, nota: sNota.trim() || `Estado: ${selConv.estado} → ${ne}` });
    await db.conversiones.update(selConv.id, { estado: ne as Conversion['estado'], historial: hist });
    const synced = await syncMemberFromConversion({ ...selConv, estado: ne as Conversion['estado'] });
    let hitoCreado = false;
    if (sHito && sNota.trim()) {
      const vinculado = await db.miembros.where('conversionId').equals(selConv.id).first();
      if (vinculado) {
        await db.hitos.add(createBaseRecord({
          id: uuid(),
          miembroId: vinculado.id,
          fecha: today(),
          tipo: ESTADOS_TIPO_HITO[ne] || 'Otro',
          descripcion: sNota.trim(),
          creado: new Date().toISOString(),
        }));
        hitoCreado = true;
      }
    }
    let msg = synced ? '🧑 Integrado → Miembros' : 'Seguimiento guardado';
    if (hitoCreado) msg += ' + Hito';
    showToast(msg);
    setModal(null);
  };
  // ── GRUPOS ──
  const openNewGrupo = () => { resetGrupo(); setModal('grupo'); };
  const openEditGrupo = (id: string) => {
    const g = grupos.find((x) => x.id === id); if (!g) return;
    setEditGrupoId(id); setGNombre(g.nombre); setGZona(g.zona); setGLider(g.lider);
    setGDia(g.dia); setGHora(g.hora); setGCap(g.capacidad); setGLugar(g.lugar);
    setGMeta(String(g.planOfrendasMensual || ''));
    setModal('grupo');
  };
  const saveGrupo = async () => {
    if (!gNombre.trim()) return showToast('El nombre del grupo es obligatorio');
    if (!gZona) return showToast('Selecciona una zona');
    if (!gLider.trim()) return showToast('Indica el líder del grupo');
    const data = { nombre: gNombre.trim(), zona: gZona, lider: gLider.trim(), dia: gDia, hora: gHora, capacidad: gCap, lugar: gLugar.trim(), planOfrendasMensual: parseInt(gMeta) || 0 };
    if (editGrupoId) {
      await db.grupos.update(editGrupoId, data);
      showToast(`Grupo "${gNombre}" actualizado`);
    } else {
      await db.grupos.add(createBaseRecord({ id: uuid(), ...data, miembros: 0 }));
      showToast(`Grupo "${gNombre}" creado`);
    }
    resetGrupo(); setModal(null);
  };
  const delGrupo = async () => {
    if (!selectedId) return;
    await db.grupos.delete(selectedId);
    showToast('Grupo eliminado'); setModal(null);
  };

  // ── EVANGELISMO ──
  const openNewEvang = () => { resetEvang(); setModal('evang'); };
  const openEditEvang = (id: string) => {
    const e = evangels.find((x) => x.id === id); if (!e) return;
    setEditEvangId(id); setETipo(e.tipo); setEFecha(e.fecha); setEZona(e.zona);
    setELider(e.lider);
    const enLista = miembros.some((m) => `${m.nombre} ${m.apellido}` === e.lider);
    setELiderCustom(!enLista && !!e.lider);
    setEParticipantes(Array.isArray(e.participantes) ? e.participantes : []);
    setEPartCustom('');
    setEContactos(String(e.contactos)); setEConvs(String(e.conversiones)); setENotas(e.notas);
    setModal('evang');
  };
  const saveEvang = async () => {
    if (!eFecha) return showToast('La fecha es obligatoria');
    const data = { fecha: eFecha, tipo: eTipo, zona: eZona, lider: eLider.trim(), participantes: eParticipantes, contactos: parseInt(eContactos) || 0, conversiones: parseInt(eConvs) || 0, notas: eNotas.trim() };
    if (editEvangId) {
      await db.evangelismos.update(editEvangId, data);
      showToast('Actividad actualizada');
    } else {
      await db.evangelismos.add(createBaseRecord({ id: uuid(), ...data, creado: new Date().toISOString() }));
      showToast(`Evangelismo guardado — ${eConvs} conversión(es)`);
    }
    resetEvang(); setModal(null);
  };
  const delEvang = async () => {
    if (!selectedId) return;
    await db.evangelismos.delete(selectedId);
    showToast('Actividad eliminada'); setModal(null);
  };

  const tabLabel = (tab: DataTab) => {
    if (tab === 'conv') return `✝️ Conversiones (${filtered.length})`;
    if (tab === 'grupo') return `👥 Grupos (${gruposFiltrados.length})`;
    return `📋 Evangelismo (${evangelsFiltrados.length})`;
  };

  return (
    <Layout title="Misión Bíblica">
      <div className="page-mision">

      {anos.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: 'var(--dim)', fontWeight: 600 }}>📅 Filtrar por período:</span>
          <select className="filter-select" value={globalAno} onChange={(e) => setGlobalAno(e.target.value)} style={{ maxWidth: 130 }}>
            <option value="">Todos los años</option>
            {anos.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <select className="filter-select" value={globalMes} onChange={(e) => setGlobalMes(e.target.value)} style={{ maxWidth: 130 }}>
            <option value="">Todos los meses</option>
            {meses.map((m) => <option key={m} value={m}>{MS[parseInt(m) - 1]}</option>)}
          </select>
          {(globalAno || globalMes) && (
            <span style={{ fontSize: 11, color: 'var(--oro-apostolico)', fontWeight: 700 }}>
              {globalAno || ''}{globalMes ? ` ${MS[parseInt(globalMes) - 1]}` : ''}
            </span>
          )}
        </div>
      )}

      <div className="kpis">
        <KpiCard label={globalAno ? `Conversiones ${globalAno}` : 'Conversiones'} value={filtered.length} icon="✝️" accent="var(--mision-purple)" sub={globalMes ? `${MS[parseInt(globalMes) - 1]}: ${convs.filter((c) => c.fecha?.startsWith(globalAno || new Date().getFullYear().toString()) && c.fecha?.slice(5, 7) === globalMes).length}` : `este mes: ${mesCount}`} />
        <KpiCard label={globalAno ? `Discipulado ${globalAno}` : 'En Discipulado'} value={globalAno || globalMes ? convs.filter((c) => c.estado === 'Discipulado' && (() => { const f = getFechaEstado(c, 'Discipulado'); return (!globalAno || f.startsWith(globalAno)) && (!globalMes || f.slice(5, 7) === globalMes); })()).length : discCount} icon="📖" accent="var(--oro-apostolico)" sub="seguimiento activo" />
        <KpiCard label={globalAno ? `Bautizados ${globalAno}` : 'Bautizados'} value={globalAno || globalMes ? convs.filter((c) => c.estado === 'Bautizado' && (() => { const f = getFechaEstado(c, 'Bautizado'); return (!globalAno || f.startsWith(globalAno)) && (!globalMes || f.slice(5, 7) === globalMes); })()).length : bautCount} icon="💧" accent="var(--mision-blue)" sub="confirmados" />
        <KpiCard label={globalAno ? `Integrados ${globalAno}` : 'Integrados'} value={globalAno || globalMes ? convs.filter((c) => c.estado === 'Integrado' && (() => { const f = getFechaEstado(c, 'Integrado'); return (!globalAno || f.startsWith(globalAno)) && (!globalMes || f.slice(5, 7) === globalMes); })()).length : intCount} icon="🏘️" accent="var(--oro-luz)" sub="al ministerio" />
        {apaCount > 0 && <KpiCard label="Apartados" value={apaCount} icon="🚪" accent="var(--red, #ef4444)" sub="se apartaron" />}
        {falCount > 0 && <KpiCard label="Fallecidos" value={falCount} icon="✝️" accent="var(--dim)" sub="en memoria" />}
      </div>

      <div className="tabs">
        <button className={`tab ${dataTab === 'conv' ? 'active' : ''}`} onClick={() => setDataTab('conv')}>{tabLabel('conv')}</button>
        <button className={`tab ${dataTab === 'grupo' ? 'active' : ''}`} onClick={() => setDataTab('grupo')}>{tabLabel('grupo')}</button>
        <button className={`tab ${dataTab === 'evang' ? 'active' : ''}`} onClick={() => setDataTab('evang')}>{tabLabel('evang')}</button>
      </div>

      <div className="actions-row">
        {dataTab === 'conv' && <button className="btn btn-gold" onClick={openNewConv}>➕ Nueva Conversión</button>}
        {dataTab === 'grupo' && <button className="btn btn-gold" onClick={openNewGrupo}>👥 Nuevo Grupo</button>}
        {dataTab === 'evang' && <button className="btn btn-gold" onClick={openNewEvang}>📋 Registrar Evangelismo</button>}
        {dataTab === 'conv' && (
          <button className="btn btn-secondary" onClick={() => {
            if (!convs.length) return showToast('No hay datos para exportar');
            const h = ['Nombre','Apellido','Telefono','Edad','Zona','Mayor','Fecha','Estado','Notas'];
            const r = convs.map(c => [c.nombre,c.apellido,c.telefono||'',c.edad||'',c.zona,c.lider,c.fecha,c.estado,(c.notas||'').replace(/,/g,';')]);
            exportCSV(h, r, 'lemgil-conversiones.csv');
            showToast('CSV exportado');
          }}>📥 Exportar CSV</button>
        )}
        {dataTab === 'conv' && (
          <CsvImportButton<Conversion>
            table="conversiones"
            fieldMapping={{
              'Nombre': 'nombre',
              'Apellido': 'apellido',
              'Teléfono': 'telefono',
              'Telefono': 'telefono',
              'Edad': 'edad',
              'Zona': 'zona',
              'Líder': 'lider',
              'Mayor': 'lider',
              'Fecha': 'fecha',
              'Estado': 'estado',
              'Notas': 'notas',
              'Email': 'email',
              'Profesión': 'profesion',
              'Bautizado': 'bautizado',
              'Fecha Bautismo': 'fechaBautismo',
              'Cónyuge': 'conyuge',
              'Hijos': 'hijos',
            }}
            requiredFields={['nombre', 'apellido', 'fecha']}
            defaults={{ estado: 'Nuevo', fecha: () => new Date().toISOString().split('T')[0] }}
            onImport={(n) => showToast(`${n} conversión(es) importada(s)`)}
          />
        )}
      </div>

      {/* FILTROS POR TAB - Posición unificada después de Actions Row */}
      {dataTab === 'conv' && (
        <div className="search-bar">
          <input className="search-input" placeholder="🔍 Buscar nombre, zona, líder…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <select className="filter-select" value={filterEstado} onChange={(e) => setFilterEstado(e.target.value)}>
            <option value="">Todos los estados</option>
            {ESTADOS.map((e) => <option key={e}>{e}</option>)}
            <option>Apartado</option>
            <option>Fallecido</option>
          </select>
          <select className="filter-select" value={filterZona} onChange={(e) => setFilterZona(e.target.value)}>
            <option value="">Todas las zonas</option>
            {zonas.slice().sort((a, b) => a.nombre.localeCompare(b.nombre)).map((z) => <option key={z.id} value={z.nombre}>{z.nombre}</option>)}
          </select>
          <select className="filter-select" value={filterAnoConv} onChange={(e) => setFilterAnoConv(e.target.value)}>
            <option value="">Todos los años</option>
            {anos.map((ano) => (
              <option key={ano} value={ano}>{ano}</option>
            ))}
          </select>
          <select className="filter-select" value={filterMesConv} onChange={(e) => setFilterMesConv(e.target.value)}>
            <option value="">Todos los meses</option>
            {meses.map((mes) => (
              <option key={mes} value={mes}>{MS[parseInt(mes) - 1]}</option>
            ))}
          </select>
          <select className="filter-select" value={filterGrupo} onChange={(e) => setFilterGrupo(e.target.value)}>
            <option value="">Todos los grupos</option>
            {grupos.map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
          </select>
          <select className="filter-select" value={filterLider} onChange={(e) => setFilterLider(e.target.value)}>
            <option value="">Todos los líderes</option>
            {[...new Set(convs.map(c => c.lider).filter(Boolean))].sort().map(l => <option key={l} value={l}>{l}</option>)}
          </select>
          <select className="filter-select" value={filterBautizado} onChange={(e) => setFilterBautizado(e.target.value)}>
            <option value="">Bautizado?</option>
            <option value="si">Sí</option>
            <option value="no">No</option>
          </select>
          {(search || filterEstado || filterZona || filterAnoConv || filterMesConv || filterGrupo || filterLider || filterBautizado) && (
            <button className="btn btn-secondary btn-sm" onClick={() => { setSearch(''); setFilterEstado(''); setFilterZona(''); setFilterAnoConv(''); setFilterMesConv(''); setFilterGrupo(''); setFilterLider(''); setFilterBautizado(''); }}>✕ Limpiar</button>
          )}
        </div>
      )}
      {dataTab === 'grupo' && (
        <div className="search-bar">
          <input className="search-input" placeholder="🔍 Buscar grupo o mentor…" value={searchG} onChange={(e) => setSearchG(e.target.value)} />
          <select className="filter-select" value={filterGZona} onChange={(e) => setFilterGZona(e.target.value)}>
            <option value="">Todas las zonas</option>
            {zonas.slice().sort((a, b) => a.nombre.localeCompare(b.nombre)).map((z) => <option key={z.id} value={z.nombre}>{z.nombre}</option>)}
          </select>
          <select className="filter-select" value={filterGDia} onChange={(e) => setFilterGDia(e.target.value)}>
            <option value="">Todos los días</option>
            {['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'].map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <select className="filter-select" value={filterGEstado} onChange={(e) => setFilterGEstado(e.target.value)}>
            <option value="">Todos los estados</option>
            <option value="disponible">🟢 Disponible</option>
            <option value="casi-lleno">🟡 Casi Lleno</option>
            <option value="saturado">🔴 Saturado</option>
            <option value="sin-meta">⚪ Sin meta</option>
          </select>
          {(searchG || filterGZona || filterGDia || filterGEstado) && (
            <button className="btn btn-secondary btn-sm" onClick={() => { setSearchG(''); setFilterGZona(''); setFilterGDia(''); setFilterGEstado(''); }}>✕ Limpiar</button>
          )}
        </div>
      )}
      {dataTab === 'evang' && (
        <div className="search-bar">
          <input className="search-input" placeholder="🔍 Buscar ministro, notas…" value={searchE} onChange={(e) => setSearchE(e.target.value)} />
          <select className="filter-select" value={filterETipo} onChange={(e) => setFilterETipo(e.target.value)}>
            <option value="">Todos los tipos</option>
            {['Visita domiciliaria','Campaña en plaza','Evangelismo en calle','Reunión de célula','Invitación personal'].map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select className="filter-select" value={filterEZona} onChange={(e) => setFilterEZona(e.target.value)}>
            <option value="">Todas las zonas</option>
            {zonas.slice().sort((a, b) => a.nombre.localeCompare(b.nombre)).map((z) => <option key={z.id} value={z.nombre}>{z.nombre}</option>)}
          </select>
          <select className="filter-select" value={filterEMinistro} onChange={(e) => setFilterEMinistro(e.target.value)}>
            <option value="">Todos los ministros</option>
            {[...new Set(evangels.map(e => e.lider).filter(Boolean))].sort().map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <select className="filter-select" value={filterEMes} onChange={(e) => setFilterEMes(e.target.value)}>
            <option value="">Todos los meses</option>
            {[...new Set(evangels.map(e => e.fecha.slice(0, 7)))].sort().reverse().map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          {(searchE || filterETipo || filterEZona || filterEMinistro || filterEMes) && (
            <button className="btn btn-secondary btn-sm" onClick={() => { setSearchE(''); setFilterETipo(''); setFilterEZona(''); setFilterEMinistro(''); setFilterEMes(''); }}>✕ Limpiar</button>
          )}
        </div>
      )}

      {/* TAB: Conversiones */}
      {dataTab === 'conv' && (
        <ConversionesTable
          convs={convs}
          filtered={filtered}
          grupos={grupos}
          filterEstado={filterEstado}
          filterZona={filterZona}
          filterAnoConv={filterAnoConv}
          filterMesConv={filterMesConv}
          openDetail={openDetail}
          openEditConv={openEditConv}
          quickAdv={quickAdv}
        />
      )}

      {/* TAB: Grupos */}
      {dataTab === 'grupo' && (
        <GruposTab
          grupos={grupos}
          gruposFiltrados={gruposFiltrados}
          convs={convs}
          miembros={miembros}
          openEditGrupo={openEditGrupo}
          onEliminar={(id) => { setSelectedId(id); setModal('confirmGrupo'); }}
        />
      )}

      {/* TAB: Evangelismo */}
      {dataTab === 'evang' && (
        <EvangelismoTable
          evangels={evangels}
          evangelsFiltrados={evangelsFiltrados}
          openEditEvang={openEditEvang}
          onEliminar={(id) => { setSelectedId(id); setModal('confirmEvang'); }}
        />
      )}

      <ConversionFormModal
        open={modal === 'conv'}
        onClose={() => setModal(null)}
        editConvId={editConvId}
        saveConv={saveConv}
        miembros={miembros}
        grupos={grupos}
        fNombre={fNombre} setFNombre={setFNombre}
        fApellido={fApellido} setFApellido={setFApellido}
        fTelefono={fTelefono} setFTelefono={setFTelefono}
        fEdad={fEdad} setFEdad={setFEdad}
        fDireccion={fDireccion} setFDireccion={setFDireccion}
        fFamilia={fFamilia} setFFamilia={setFFamilia}
        fFecha={fFecha} setFFecha={setFFecha}
        fZona={fZona} setFZona={setFZona}
        fLider={fLider} setFLider={setFLider}
        fLiderCustom={fLiderCustom} setFLiderCustom={setFLiderCustom}
        fEstado={fEstado} setFEstado={setFEstado}
        fGrupoId={fGrupoId} setFGrupoId={setFGrupoId}
        fNotas={fNotas} setFNotas={setFNotas}
        fEmail={fEmail} setFEmail={setFEmail}
        fProfesion={fProfesion} setFProfesion={setFProfesion}
        fBautizado={fBautizado} setFBautizado={setFBautizado}
        fFechaBautismo={fFechaBautismo} setFFechaBautismo={setFFechaBautismo}
        fConyuge={fConyuge} setFConyuge={setFConyuge}
        fHijos={fHijos} setFHijos={setFHijos}
        fHistorial={fHistorial} setFHistorial={setFHistorial}
      />

      <GrupoFormModal
        open={modal === 'grupo'}
        onClose={() => setModal(null)}
        editGrupoId={editGrupoId}
        saveGrupo={saveGrupo}
        gNombre={gNombre} setGNombre={setGNombre}
        gZona={gZona} setGZona={setGZona}
        gLider={gLider} setGLider={setGLider}
        gDia={gDia} setGDia={setGDia}
        gHora={gHora} setGHora={setGHora}
        gCap={gCap} setGCap={setGCap}
        gLugar={gLugar} setGLugar={setGLugar}
        gMeta={gMeta} setGMeta={setGMeta}
      />

      <EvangelismoFormModal
        open={modal === 'evang'}
        onClose={() => setModal(null)}
        editEvangId={editEvangId}
        saveEvang={saveEvang}
        miembros={miembros}
        eTipo={eTipo} setETipo={setETipo}
        eFecha={eFecha} setEFecha={setEFecha}
        eZona={eZona} setEZona={setEZona}
        eLider={eLider} setELider={setELider}
        eLiderCustom={eLiderCustom} setELiderCustom={setELiderCustom}
        eParticipantes={eParticipantes} setEParticipantes={setEParticipantes}
        ePartCustom={ePartCustom} setEPartCustom={setEPartCustom}
        eContactos={eContactos} setEContactos={setEContactos}
        eConvs={eConvs} setEConvs={setEConvs}
        eNotas={eNotas} setENotas={setENotas}
      />

      <ConversionDetailModal
        open={modal === 'detail'}
        onClose={() => setModal(null)}
        onEliminar={() => setModal('confirm')}
        saveSeg={saveSeg}
        selConv={selConv}
        grupos={grupos}
        tempEst={tempEst} setTempEst={setTempEst}
        sNota={sNota} setSNota={setSNota}
        sHito={sHito} setSHito={setSHito}
      />

      <ConfirmModals
        modal={modal}
        selConv={selConv}
        grupoNombre={grupos.find((g) => g.id === selectedId)?.nombre}
        onClose={() => setModal(null)}
        delConv={delConv}
        delGrupo={delGrupo}
        delEvang={delEvang}
      />
          </div>
    </Layout>
  );
}
