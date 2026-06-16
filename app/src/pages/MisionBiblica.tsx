import { useState } from 'react';
import { v4 as uuid } from 'uuid';
import { useLiveQuery } from 'dexie-react-hooks';
import { Layout } from '../components/Layout';
import { KpiCard } from '../components/KpiCard';
import { exportCSV } from '../lib/csvExport';
import { Modal } from '../components/Modal';
import { EmptyState } from '../components/EmptyState';
import { ZonaSelect } from '../components/ZonaSelect';
import { db } from '../lib/database';
import type { Conversion } from '../lib/types';
import { today, fmt, MS, accentStyle } from '../lib/utils';
import { 
  exportConversionesPDF, 
  exportGruposMisionPDF, 
  exportEvangelismoPDF 
} from '../lib/pdfExport';
import { CsvImportButton } from '../components/CsvImportButton';

const syncMemberFromConversion = async (c: Conversion): Promise<string | null> => {
  if (c.estado !== 'Integrado') return null;
  const existing = await db.miembros.where('conversionId').equals(c.id).first();
  if (existing) return null;
  const now = new Date().toISOString();
  const miembroId = uuid();
  await db.miembros.add({
    id: miembroId,
    nombre: c.nombre,
    apellido: c.apellido,
    telefono: c.telefono || '',
    email: c.email || '',
    direccion: c.direccion || '',
    zona: c.zona || '',
    fechaNacimiento: '',
    fechaIngreso: c.fecha || now.split('T')[0],
    estado: 'Activo',
    contactoPreferido: 'WhatsApp',
    profesion: c.profesion || '',
    estadoCivil: 'Soltero',
    bautizado: c.bautizado || false,
    fechaBautismo: c.fechaBautismo || '',
    conyuge: c.conyuge || '',
    hijos: c.hijos || '',
    conversionId: c.id,
    hermanoMayorId: c.hermanoMayorId || null,
    grupoId: c.grupoId || null,
    notas: c.notas || '',
    creado: now,
    actualizado: now,
  });
  await db.hitos.add({
    id: uuid(),
    miembroId,
    fecha: c.fecha || now.split('T')[0],
    tipo: 'Integración',
    descripcion: `Integrado a la iglesia${c.lider ? ` · Disciplinado por ${c.lider}` : ''}`,
    creado: now,
  });
  return miembroId;
}

const ESTADOS = ['Nuevo', 'Discipulado', 'Bautizado', 'Integrado', 'Apartado', 'Fallecido'] as const;
const EST_BADGE: Record<string, string> = { Nuevo: 'badge-blue', Discipulado: 'badge-yellow', Bautizado: 'badge-green', Integrado: 'badge-purple', Apartado: 'badge-red', Fallecido: 'badge-gray' };
const ESTADOS_COLOR: Record<number, string> = { 0: 'var(--blue)', 1: 'var(--yellow)', 2: 'var(--green)', 3: 'var(--purple)', 4: 'var(--red)', 5: 'var(--dim)' };
const ESTADOS_TIPO_HITO: Record<string, 'Conversión' | 'Discipulado' | 'Bautismo' | 'Integración'> = { Nuevo: 'Conversión', Discipulado: 'Discipulado', Bautizado: 'Bautismo', Integrado: 'Integración' };
const ESTADOS_EMOJI: Record<string, string> = { Nuevo: '🌱', Discipulado: '📖', Bautizado: '💧', Integrado: '🏘️', Apartado: '🚪', Fallecido: '✝️' };
const TIPO_BADGE: Record<string, string> = { 'Visita domiciliaria': 'badge-blue', 'Campaña en plaza': 'badge-green', 'Evangelismo en calle': 'badge-yellow', 'Reunión de célula': 'badge-purple', 'Invitación personal': 'badge-red' };

type DataTab = 'conv' | 'grupo' | 'evang';
type ModalType = 'conv' | 'grupo' | 'evang' | 'detail' | 'confirm' | 'confirmGrupo' | 'confirmEvang' | 'verGrupo';

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
  const [toast, setToast] = useState('');

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

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3200); };
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
    const byLocal = (!search || s.includes(search.toLowerCase())) && (!filterEstado || c.estado === filterEstado) && (!filterZona || c.zona === filterZona) && (!filterAnoConv || c.fecha?.startsWith(filterAnoConv)) && (!filterMesConv || c.fecha?.slice(5, 7) === filterMesConv);
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
      const nuevo: Conversion = { id, ...data, historial: data.estado && data.estado !== 'Nuevo' ? [{ fecha: data.fecha || today(), estado: data.estado, nota: 'Registro inicial' }] : [], creado: new Date().toISOString() };
      await db.conversiones.add(nuevo);
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
        await db.hitos.add({
          id: uuid(),
          miembroId: vinculado.id,
          fecha: today(),
          tipo: ESTADOS_TIPO_HITO[ne] || 'Otro',
          descripcion: sNota.trim(),
          creado: new Date().toISOString(),
        });
        hitoCreado = true;
      }
    }
    let msg = synced ? '🧑 Integrado → Miembros' : 'Seguimiento guardado';
    if (hitoCreado) msg += ' + Hito';
    showToast(msg);
    setModal(null);
  };
  const updateSteps = (est: string) => {
    if (est === 'Apartado' || est === 'Fallecido') {
      return ESTADOS.map((e, i) => ({ estado: e, emoji: ['🌱', '📖', '💧', '🏘️'][i], cls: 'step' }));
    }
    const idx = ESTADOS.indexOf(est as typeof ESTADOS[number]);
    return ESTADOS.map((e, i) => ({ estado: e, emoji: ['🌱', '📖', '💧', '🏘️'][i], cls: i < idx ? 'step done' : i === idx ? 'step active' : 'step' }));
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
      await db.grupos.add({ id: uuid(), ...data, miembros: 0 });
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
      await db.evangelismos.add({ id: uuid(), ...data, creado: new Date().toISOString() });
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

       {/* TAB: Conversiones */}
       {dataTab === 'conv' && (
         <div className="card">
            <div className="card-header">
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div className="card-title">📋 Registro de Conversiones</div>
                <div style={{ fontSize: 12, color: 'var(--dim)' }}>{convs.length} registros</div>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => exportConversionesPDF({ conversiones: convs, filtros: { estado: filterEstado, zona: filterZona, ano: filterAnoConv, mes: filterMesConv } })}>📄 Exportar PDF</button>
            </div>
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
            </div>
           {filtered.length === 0 ? (
             <EmptyState icon="🌱" title="Sin registros aún" sub='Presiona "➕ Nueva Conversión" para comenzar' />
           ) : (
             <table className="data-table">
               <thead><tr><th>#</th><th>Nombre</th><th>Zona</th><th>Fecha</th><th>Mayor</th><th>Grupo</th><th>Estado</th><th>Acciones</th></tr></thead>
               <tbody>
                 {filtered.map((c, i) => {
                   const grupoAsignado = c.grupoId ? grupos.find(g => g.id === c.grupoId) : null;
                   return (
                   <tr key={c.id}>
                     <td style={{ color: 'var(--dim)' }}>{i + 1}</td>
                     <td><strong>{c.nombre} {c.apellido}</strong>{c.telefono && <><br /><span style={{ fontSize: 10, color: 'var(--dim)' }}>{c.telefono}</span></>}</td>
                     <td>{c.zona || '—'}</td>
                     <td>{fmt(c.fecha)}</td>
                     <td>{c.lider || '—'}</td>
                     <td>{grupoAsignado ? <span style={{ display: 'inline-block', padding: '3px 8px', borderRadius: '6px', background: 'var(--gold-glow)', color: 'var(--gold)', fontSize: '11px', fontWeight: 700, border: '1px solid var(--gold)', whiteSpace: 'nowrap' }}>👥 {grupoAsignado.nombre}</span> : <span style={{ color: 'var(--dim)', fontSize: '11px' }}>—</span>}</td>
                     <td><span className={`badge ${EST_BADGE[c.estado] || 'badge-blue'}`}>{c.estado}</span>{c.estado === 'Integrado' && <><br /><span style={{ padding: '1px 5px', borderRadius: 4, background: 'var(--gold-glow)', color: 'var(--gold)', fontSize: 9, fontWeight: 700, border: '1px solid var(--gold)' }}>✓ Miembro</span></>}</td>
                     <td>
                       <div style={{ display: 'flex', gap: 4, whiteSpace: 'nowrap' }}>
                         <button className="btn btn-secondary btn-sm" onClick={() => openDetail(c.id)}>👁</button>
                         <button className="btn btn-secondary btn-sm" onClick={() => openEditConv(c.id)}>✏️</button>
                         <button className="btn btn-secondary btn-sm" onClick={() => quickAdv(c.id)}>⬆</button>
                       </div>
                     </td>
                   </tr>
                   );
                 })}
               </tbody>
             </table>
           )}
         </div>
       )}

      {/* TAB: Grupos */}
      {dataTab === 'grupo' && (
        <div className="card">
           <div className="card-header">
             <div style={{ display: 'flex', flexDirection: 'column' }}>
               <div className="card-title">🏘️ Grupos de Discipulado</div>
               <div style={{ fontSize: 12, color: 'var(--dim)' }}>{gruposFiltrados.length} de {grupos.length} grupos</div>
             </div>
             <div style={{ display: 'flex', gap: 5 }}>
               <button className="btn btn-secondary btn-sm" onClick={() => exportGruposMisionPDF({ grupos, miembros })}>📄 Exportar PDF</button>
                <button className="btn btn-secondary btn-sm" onClick={() => {
                  if (!grupos.length) return showToast('No hay grupos para exportar');
                  const h = ['Nombre', 'Zona', 'Líder', 'Día', 'Hora', 'Capacidad', 'Lugar'];
                  const r = grupos.map(g => [g.nombre, g.zona || '', g.lider || '', g.dia || '', g.hora || '', g.capacidad || '', g.lugar || '']);
                  exportCSV(h, r, 'lemgil-grupos-mision.csv');
                  showToast('CSV exportado');
                }}>📥 Exportar CSV</button>
                <CsvImportButton
                  table="grupos"
                  fieldMapping={{
                    'Nombre': 'nombre',
                    'Zona': 'zona',
                    'Líder': 'lider',
                    'Día': 'dia',
                    'Hora': 'hora',
                    'Capacidad': 'capacidad',
                    'Lugar': 'lugar',
                  }}
                  requiredFields={['nombre']}
                  defaults={{ zona: '', lider: '', miembros: 0, planOfrendasMensual: 0 }}
                  onImport={(n) => showToast(`${n} grupo(s) importado(s)`)}
                />
              </div>
           </div>
          {grupos.length === 0 ? (
            <EmptyState icon="👥" title="Sin grupos aún" sub="Crea el primer grupo" />
          ) : (
            <>
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
            {gruposFiltrados.length === 0 ? (
              <EmptyState icon="🔍" title="Sin resultados" sub="Ajusta los filtros para ver grupos" />
            ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
              {gruposFiltrados.map((g) => {
      const convsEnProceso = convs.filter(c => c.grupoId === g.id && c.estado !== 'Integrado' && c.estado !== 'Apartado' && c.estado !== 'Fallecido');
                const cantNuevo = convsEnProceso.filter(c => c.estado === 'Nuevo').length;
                const cantDiscip = convsEnProceso.filter(c => c.estado === 'Discipulado').length;
                const cantBaut = convsEnProceso.filter(c => c.estado === 'Bautizado').length;
                const cantMiembros = miembros.filter(m => m.grupoId === g.id).length;
                const totalAsignados = cantMiembros + convsEnProceso.length;
                const capacidad = parseInt(g.capacidad) || 0;
                const pctCap = capacidad > 0 ? (totalAsignados / capacidad) * 100 : 0;
                const statusColor = pctCap >= 100 ? 'var(--red)' : pctCap >= 70 ? 'var(--yellow)' : 'var(--green)';
                const statusLabel = capacidad > 0 ? (pctCap >= 100 ? '🔴 Saturado' : pctCap >= 70 ? '🟡 Casi Lleno' : '🟢 Disponible') : '⚪ Sin meta';
                const alertas = [];
                if (!g.lider || !g.lider.trim()) alertas.push({ color: 'var(--red)', icon: '⚠️', text: 'Sin líder' });
                if (totalAsignados === 0) alertas.push({ color: 'var(--blue)', icon: '🆕', text: 'Nuevo' });
                else if (capacidad > 0 && pctCap < 30) alertas.push({ color: 'var(--gold)', icon: '🌱', text: 'En desarrollo' });
                const etapas = [
                  { key: 'nuevo', icon: '🌱', label: 'Nuevos', cant: cantNuevo, color: 'var(--green)' },
                  { key: 'discip', icon: '📖', label: 'Discip.', cant: cantDiscip, color: 'var(--blue)' },
                  { key: 'baut', icon: '💧', label: 'Bautiz.', cant: cantBaut, color: 'var(--purple)' },
                  { key: 'miemb', icon: '👥', label: 'Integr.', cant: cantMiembros, color: 'var(--gold)' },
                ];
                return (
                  <div key={g.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 9, padding: 14, position: 'relative' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 5 }}>
                      <div style={{ fontWeight: 800, fontSize: 14, flex: 1 }}>{g.nombre}</div>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 10, background: `${statusColor}22`, color: statusColor, border: `1px solid ${statusColor}`, whiteSpace: 'nowrap' }}>{statusLabel}</span>
                    </div>
                    {alertas.length > 0 && (
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
                        {alertas.map((a, i) => <span key={i} style={{ fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 8, background: `${a.color}15`, color: a.color, border: `1px solid ${a.color}55` }}>{a.icon} {a.text}</span>)}
                      </div>
                    )}
                    <div style={{ fontSize: 12, color: 'var(--dim)', marginBottom: 8 }}>📍 {g.zona || '—'} · 👤 {g.lider || '—'}</div>
                    <div style={{ fontSize: 11, color: 'var(--dim)' }}>📅 {g.dia} {g.hora}{g.lugar && ` · ${g.lugar}`}</div>
                    <div style={{ marginTop: 10, padding: '8px 10px', background: 'var(--bg-input)', borderRadius: 8, border: '1px solid var(--border)' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, marginBottom: 8 }}>
                        {etapas.map((e) => (
                          <div key={e.key} style={{ textAlign: 'center', padding: '4px 2px', borderRadius: 6, background: e.cant > 0 ? `${e.color}15` : 'transparent', border: e.cant > 0 ? `1px solid ${e.color}55` : '1px solid transparent' }}>
                            <div style={{ fontSize: 16, fontWeight: 800, color: e.cant > 0 ? e.color : 'var(--dim)', lineHeight: 1 }}>{e.cant}</div>
                            <div style={{ fontSize: 9, color: e.cant > 0 ? e.color : 'var(--dim)', marginTop: 2, fontWeight: 600 }}>{e.icon} {e.label}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, paddingTop: 6, borderTop: '1px solid var(--border)' }}>
                        <span style={{ color: 'var(--dim)' }}>Total asignados</span>
                        <span style={{ fontWeight: 800, color: statusColor }}>{totalAsignados}{capacidad > 0 ? ` / ${capacidad}` : ''}</span>
                      </div>
                      {capacidad > 0 && (
                        <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden', marginTop: 6 }}>
                          <div style={{ height: '100%', width: `${Math.min(pctCap, 100)}%`, background: statusColor, transition: 'width 0.4s' }}></div>
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 5, marginTop: 10 }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => openEditGrupo(g.id)}>✏️ Editar</button>
                      <button className="btn btn-danger btn-sm" onClick={() => { setSelectedId(g.id); setModal('confirmGrupo'); }}>🗑️</button>
                    </div>
                  </div>
                );
              })}
            </div>
            )}
            </>
          )}
        </div>
      )}

      {/* TAB: Evangelismo */}
      {dataTab === 'evang' && (
        <div className="card">
           <div className="card-header">
             <div style={{ display: 'flex', flexDirection: 'column' }}>
               <div className="card-title">📋 Actividades de Evangelismo</div>
               <div style={{ fontSize: 12, color: 'var(--dim)' }}>{evangelsFiltrados.length} de {evangels.length} actividades</div>
             </div>
             <div style={{ display: 'flex', gap: 5 }}>
               <button className="btn btn-secondary btn-sm" onClick={() => exportEvangelismoPDF({ evangelismos: evangels })}>📄 Exportar PDF</button>
                <button className="btn btn-secondary btn-sm" onClick={() => {
                  if (!evangels.length) return showToast('No hay actividades para exportar');
                  const h = ['Fecha', 'Tipo', 'Zona', 'Líder', 'Contactos', 'Conversiones', 'Notas'];
                  const r = evangels.map(e => [e.fecha, e.tipo, e.zona || '', e.lider || '', e.contactos || 0, e.conversiones || 0, (e.notas || '').replace(/,/g, ';')]);
                  exportCSV(h, r, 'lemgil-evangelismo.csv');
                  showToast('CSV exportado');
                }}>📥 Exportar CSV</button>
                <CsvImportButton
                  table="evangelismos"
                  fieldMapping={{
                    'Fecha': 'fecha',
                    'Tipo': 'tipo',
                    'Zona': 'zona',
                    'Líder': 'lider',
                    'Contactos': 'contactos',
                    'Conversiones': 'conversiones',
                    'Notas': 'notas',
                  }}
                  requiredFields={['fecha']}
                  defaults={{ fecha: () => new Date().toISOString().split('T')[0], contactos: 0, conversiones: 0, participantes: [] }}
                  onImport={(n) => showToast(`${n} actividad(es) importada(s)`)}
                />
              </div>
           </div>
          {evangels.length === 0 ? (
            <EmptyState icon="📢" title="Sin actividades aún" sub='Presiona "📋 Registrar Evangelismo" para comenzar' />
          ) : (
            <>
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
            {evangelsFiltrados.length === 0 ? (
              <EmptyState icon="🔍" title="Sin resultados" sub="Ajusta los filtros para ver actividades" />
            ) : (
            <table className="data-table">
              <thead><tr><th>#</th><th>Tipo</th><th>Zona</th><th>Fecha</th><th>Ministro</th><th>Equipo</th><th>Contactos</th><th>Conversiones</th><th>Acciones</th></tr></thead>
              <tbody>
                {evangelsFiltrados.map((e, i) => (
                  <tr key={e.id}>
                    <td style={{ color: 'var(--dim)' }}>{i + 1}</td>
                    <td><span className={`badge ${TIPO_BADGE[e.tipo] || 'badge-blue'}`}>{e.tipo}</span></td>
                    <td>{e.zona || '—'}</td>
                    <td>{fmt(e.fecha)}</td>
                    <td>{e.lider || '—'}</td>
                    <td>{e.participantes && e.participantes.length > 0 ? <span style={{ padding: '2px 8px', borderRadius: 6, background: 'var(--gold-glow)', color: 'var(--gold)', fontSize: 11, fontWeight: 700, border: '1px solid var(--gold)' }}>👥 {e.participantes.length}</span> : <span style={{ color: 'var(--dim)' }}>—</span>}</td>
                    <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--blue)' }}>{e.contactos}</td>
                    <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--green)' }}>{e.conversiones}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 5 }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => openEditEvang(e.id)}>✏️ Editar</button>
                        <button className="btn btn-danger btn-sm" onClick={() => { setSelectedId(e.id); setModal('confirmEvang'); }}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            )}
            </>
          )}
        </div>
      )}

      {/* MODAL: Conversión (Nueva / Editar) */}
      <Modal open={modal === 'conv'} onClose={() => setModal(null)} title={editConvId ? '✏️ Editar Conversión' : '✝️ Nueva Conversión'} footer={<><button className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button><button className="btn btn-gold" onClick={saveConv}>💾 {editConvId ? 'Guardar Cambios' : 'Guardar'}</button></>} wide>

        {/* ─── SECCIÓN: PERSONAL ─── */}
        <div className="form-section">👤 Datos Personales</div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Nombre *</label><input className="form-input" value={fNombre} onChange={(e) => setFNombre(e.target.value)} placeholder="Nombre" /></div>
          <div className="form-group"><label className="form-label">Apellido *</label><input className="form-input" value={fApellido} onChange={(e) => setFApellido(e.target.value)} placeholder="Apellido" /></div>
        </div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Edad</label><input className="form-input" type="number" value={fEdad} onChange={(e) => setFEdad(e.target.value)} placeholder="28" /></div>
          <div className="form-group"><label className="form-label">Profesión</label><input className="form-input" value={fProfesion} onChange={(e) => setFProfesion(e.target.value)} placeholder="Ej: Maestro, Ingeniero…" /></div>
        </div>

        {/* ─── SECCIÓN: CONTACTO ─── */}
        <div className="form-section" style={{ marginTop: 16 }}>📞 Contacto</div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Teléfono</label><input className="form-input" value={fTelefono} onChange={(e) => setFTelefono(e.target.value)} placeholder="+1 555 000 0000" /></div>
          <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" value={fEmail} onChange={(e) => setFEmail(e.target.value)} placeholder="email@ejemplo.com" /></div>
        </div>
        <div className="form-group"><label className="form-label">Dirección / Barrio</label><input className="form-input" value={fDireccion} onChange={(e) => setFDireccion(e.target.value)} placeholder="Sector, barrio…" /></div>

        {/* ─── SECCIÓN: IGLESIA ─── */}
        <div className="form-section" style={{ marginTop: 16 }}>⛪ Iglesia</div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Fecha *</label><input className="form-input" type="date" value={fFecha} onChange={(e) => setFFecha(e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Zona *</label><ZonaSelect value={fZona} onChange={setFZona} required /></div>
        </div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Hermano Mayor *</label>{fLiderCustom ? (<div style={{ display: 'flex', gap: 6 }}><input className="form-input" value={fLider} onChange={(e) => setFLider(e.target.value)} placeholder="Escribe el nombre completo" autoFocus /><button type="button" className="btn btn-secondary btn-sm" onClick={() => { setFLiderCustom(false); setFLider(''); }}>📋 Lista</button></div>) : (<select className="form-select" value={fLider} onChange={(e) => { if (e.target.value === '__custom__') { setFLiderCustom(true); setFLider(''); } else { setFLider(e.target.value); } }}><option value="">— Seleccionar de la lista —</option>{miembros.slice().sort((a, b) => `${a.apellido} ${a.nombre}`.localeCompare(`${b.apellido} ${b.nombre}`)).map((m) => <option key={m.id} value={`${m.nombre} ${m.apellido}`}>{m.nombre} {m.apellido}</option>)}<option value="__custom__">— Otro (escribir manualmente) —</option></select>)}{miembros.length === 0 && !fLiderCustom && <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 4 }}>No hay miembros — selecciona "Otro" o crea uno primero</div>}</div>
          <div className="form-group"><label className="form-label">Grupo a Asignar</label><select className="form-select" value={fGrupoId} onChange={(e) => setFGrupoId(e.target.value)}><option value="">— Sin asignar —</option>{grupos.slice().sort((a, b) => a.nombre.localeCompare(b.nombre)).map((g) => <option key={g.id} value={g.id}>{g.nombre} {g.zona ? `· ${g.zona}` : ''}</option>)}</select>{grupos.length === 0 && <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 4 }}>No hay grupos creados — crea uno primero en la pestaña Grupos</div>}</div>
        </div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">¿Familia en el ministerio?</label><select className="form-select" value={fFamilia} onChange={(e) => setFFamilia(e.target.value)}><option>No</option><option>Sí</option></select></div>
          <div className="form-group"><label className="form-label">Estado Inicial</label><select className="form-select" value={fEstado} onChange={(e) => setFEstado(e.target.value)}>{ESTADOS.map((e) => <option key={e}>{e}</option>)}</select></div>
        </div>

        {/* ─── SECCIÓN: FAMILIA ─── */}
        <div className="form-section" style={{ marginTop: 16 }}>👪 Vida Espiritual y Familiar</div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">¿Bautizado?</label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 8, background: 'var(--surface-2)', borderRadius: 6, cursor: 'pointer' }}>
              <input type="checkbox" checked={fBautizado} onChange={(e) => setFBautizado(e.target.checked)} style={{ width: 18, height: 18 }} />
              <span style={{ fontWeight: 600 }}>{fBautizado ? '💧 Sí, bautizado' : 'No bautizado'}</span>
            </label>
          </div>
          <div className="form-group"><label className="form-label">Fecha de Bautismo</label>
            <input className="form-input" type="date" value={fFechaBautismo} onChange={(e) => setFFechaBautismo(e.target.value)} disabled={!fBautizado} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Cónyuge</label><input className="form-input" value={fConyuge} onChange={(e) => setFConyuge(e.target.value)} placeholder="Si aplica" /></div>
          <div className="form-group"><label className="form-label">Hijos</label><input className="form-input" value={fHijos} onChange={(e) => setFHijos(e.target.value)} placeholder="Ej: 2 hijos (Sofía 8, Mateo 5)" /></div>
        </div>

        {/* ─── SECCIÓN: NOTAS ─── */}
        <div className="form-section" style={{ marginTop: 16 }}>📝 Notas</div>
        <div className="form-group"><textarea className="form-textarea" value={fNotas} onChange={(e) => setFNotas(e.target.value)} placeholder="¿Cómo fue contactado?" style={{ minHeight: 55 }} /></div>

        {/* ─── SECCIÓN: HISTORIAL DE ESTADOS ─── */}
        <div className="form-section" style={{ marginTop: 16 }}>📋 Historial de Estados</div>
        <div style={{ fontSize: 12, color: 'var(--dim)', marginBottom: 8 }}>Registra las fechas reales de cada cambio de estado</div>
        {fHistorial.length > 0 && fHistorial.map((h, i) => (
          <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6, background: 'var(--surface-2)', borderRadius: 8, padding: '8px 10px' }}>
            <input className="form-input" type="date" value={h.fecha} onChange={(e) => { const n = [...fHistorial]; n[i] = { ...n[i], fecha: e.target.value }; setFHistorial(n); }} style={{ flex: '0 0 140px' }} />
            <select className="form-select" value={h.estado} onChange={(e) => { const n = [...fHistorial]; n[i] = { ...n[i], estado: e.target.value }; setFHistorial(n); }} style={{ flex: 1 }}>
              {ESTADOS.map((e) => <option key={e} value={e}>{e}</option>)}
            </select>
            <input className="form-input" value={h.nota} onChange={(e) => { const n = [...fHistorial]; n[i] = { ...n[i], nota: e.target.value }; setFHistorial(n); }} placeholder="Nota (opcional)" style={{ flex: 1 }} />
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setFHistorial(fHistorial.filter((_, j) => j !== i))} title="Eliminar">🗑️</button>
          </div>
        ))}
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setFHistorial([...fHistorial, { fecha: today(), estado: fEstado, nota: '' }])} style={{ marginTop: 4 }}>➕ Agregar entrada al historial</button>
      </Modal>

      {/* MODAL: Grupo (Nuevo / Editar) */}
      <Modal open={modal === 'grupo'} onClose={() => setModal(null)} title={editGrupoId ? '✏️ Editar Grupo' : '👥 Nuevo Grupo de Discipulado'} footer={<><button className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button><button className="btn btn-gold" onClick={saveGrupo}>💾 {editGrupoId ? 'Guardar Cambios' : 'Crear Grupo'}</button></>}>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Nombre del Grupo *</label><input className="form-input" value={gNombre} onChange={(e) => setGNombre(e.target.value)} placeholder="Ej: Grupo Esperanza Norte" /></div>
          <div className="form-group"><label className="form-label">Zona *</label><ZonaSelect value={gZona} onChange={setGZona} required /></div>
          <div className="form-group"><label className="form-label">Mentor *</label><input className="form-input" value={gLider} onChange={(e) => setGLider(e.target.value)} placeholder="Nombre del mentor" /></div>
          <div className="form-group"><label className="form-label">Día de Reunión</label><select className="form-select" value={gDia} onChange={(e) => setGDia(e.target.value)}>{['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'].map((d) => <option key={d}>{d}</option>)}</select></div>
          <div className="form-group"><label className="form-label">Hora</label><input className="form-input" type="time" value={gHora} onChange={(e) => setGHora(e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Capacidad Máx.</label><input className="form-input" type="number" value={gCap} onChange={(e) => setGCap(e.target.value)} min="1" /></div>
        </div>
        <div className="form-group" style={{ marginTop: 12 }}><label className="form-label">Lugar</label><input className="form-input" value={gLugar} onChange={(e) => setGLugar(e.target.value)} placeholder="Casa, iglesia, salón…" /></div>
        <div className="form-group" style={{ marginTop: 12 }}><label className="form-label">Plan de Ofrendas Mensual ($)</label><input className="form-input" type="number" value={gMeta} onChange={(e) => setGMeta(e.target.value)} placeholder="Ej: 500" min="0" /></div>
      </Modal>

      {/* MODAL: Evangelismo (Nuevo / Editar) */}
      <Modal open={modal === 'evang'} onClose={() => setModal(null)} title={editEvangId ? '✏️ Editar Evangelismo' : '📋 Registrar Evangelismo'} footer={<><button className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button><button className="btn btn-gold" onClick={saveEvang}>💾 {editEvangId ? 'Guardar Cambios' : 'Guardar'}</button></>}>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Tipo de Actividad *</label><select className="form-select" value={eTipo} onChange={(e) => setETipo(e.target.value)}>{['Visita domiciliaria','Campaña en plaza','Evangelismo en calle','Reunión de célula','Invitación personal'].map((t) => <option key={t}>{t}</option>)}</select></div>
          <div className="form-group"><label className="form-label">Fecha *</label><input className="form-input" type="date" value={eFecha} onChange={(e) => setEFecha(e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Zona</label><ZonaSelect value={eZona} onChange={setEZona} allowEmpty={false} emptyLabel="" /></div>
          <div className="form-group"><label className="form-label">Ministro</label>{eLiderCustom ? (<div style={{ display: 'flex', gap: 6 }}><input className="form-input" value={eLider} onChange={(e) => setELider(e.target.value)} placeholder="Escribe el nombre completo" autoFocus /><button type="button" className="btn btn-secondary btn-sm" onClick={() => { setELiderCustom(false); setELider(''); }}>📋 Lista</button></div>) : (<select className="form-select" value={eLider} onChange={(e) => { if (e.target.value === '__custom__') { setELiderCustom(true); setELider(''); } else { setELider(e.target.value); } }}><option value="">— Seleccionar de la lista —</option>{miembros.slice().sort((a, b) => `${a.apellido} ${a.nombre}`.localeCompare(`${b.apellido} ${b.nombre}`)).map((m) => <option key={m.id} value={`${m.nombre} ${m.apellido}`}>{m.nombre} {m.apellido}</option>)}<option value="__custom__">— Otro (escribir manualmente) —</option></select>)}{miembros.length === 0 && !eLiderCustom && <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 4 }}>No hay miembros — selecciona "Otro" o crea uno primero</div>}</div>
          <div className="form-group" style={{ marginTop: 12 }}>
            <label className="form-label">Equipo / Participantes</label>
            {eParticipantes.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                {eParticipantes.map((p, i) => (
                  <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 8px 4px 10px', borderRadius: 14, background: 'var(--bg-input)', border: '1px solid var(--border)', fontSize: 12, fontWeight: 600 }}>
                    <span>{p}</span>
                    <button type="button" onClick={() => setEParticipantes(eParticipantes.filter((_, idx) => idx !== i))} style={{ background: 'transparent', border: 'none', color: 'var(--red)', cursor: 'pointer', padding: 0, fontSize: 14, lineHeight: 1, fontWeight: 700 }}>×</button>
                  </span>
                ))}
              </div>
            )}
            <select className="form-select" value="" onChange={(e) => {
              const v = e.target.value;
              if (!v) return;
              if (v === '__custom__') {
                const nombre = (ePartCustom || '').trim();
                if (nombre && !eParticipantes.includes(nombre)) setEParticipantes([...eParticipantes, nombre]);
                setEPartCustom('');
              } else if (!eParticipantes.includes(v) && v !== eLider) {
                setEParticipantes([...eParticipantes, v]);
              }
              e.target.value = '';
            }}>
              <option value="">{eParticipantes.length === 0 ? '➕ Agregar participante…' : '➕ Agregar otro…'}</option>
              {miembros.filter(m => `${m.nombre} ${m.apellido}` !== eLider && !eParticipantes.includes(`${m.nombre} ${m.apellido}`)).slice().sort((a, b) => `${a.apellido} ${a.nombre}`.localeCompare(`${b.apellido} ${b.nombre}`)).map((m) => <option key={m.id} value={`${m.nombre} ${m.apellido}`}>{m.nombre} {m.apellido}</option>)}
              <option value="__custom__">— Otro (escribir manualmente) —</option>
            </select>
            {eParticipantes.length === 0 && <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 4 }}>Opcional · Agrega miembros que participaron además del ministro</div>}
          </div>
          <div className="form-group"><label className="form-label">Personas Contactadas</label><input className="form-input" type="number" value={eContactos} onChange={(e) => setEContactos(e.target.value)} min="0" /></div>
          <div className="form-group"><label className="form-label">Conversiones del evento</label><input className="form-input" type="number" value={eConvs} onChange={(e) => setEConvs(e.target.value)} min="0" /></div>
        </div>
        <div className="form-group" style={{ marginTop: 12 }}><label className="form-label">Observaciones</label><textarea className="form-textarea" value={eNotas} onChange={(e) => setENotas(e.target.value)} placeholder="Resultados, situaciones especiales…" /></div>
      </Modal>

      {/* MODAL: Detalle Conversión */}
      <Modal open={modal === 'detail'} onClose={() => setModal(null)} title={`📄 ${selConv?.nombre} ${selConv?.apellido}`} wide footer={<><button className="btn btn-danger btn-sm" onClick={() => { setModal('confirm'); }}>🗑️ Eliminar</button><button className="btn btn-secondary" onClick={() => setModal(null)}>Cerrar</button><button className="btn btn-gold" onClick={saveSeg}>💾 Guardar Cambios</button></>}>
        {selConv && (() => {
          const iniciales = `${selConv.nombre[0] || ''}${selConv.apellido[0] || ''}`.toUpperCase();
          const fechaCreado = new Date(selConv.creado);
          const diasEnProceso = isNaN(fechaCreado.getTime()) ? 0 : Math.max(0, Math.floor((Date.now() - fechaCreado.getTime()) / 86400000));
          const lastHistDate = selConv.historial.length > 0 ? new Date(selConv.historial[selConv.historial.length - 1].fecha) : fechaCreado;
          const diasEnEstado = isNaN(lastHistDate.getTime()) ? 0 : Math.max(0, Math.floor((Date.now() - lastHistDate.getTime()) / 86400000));
          const idxActual = selConv.estado === 'Apartado' || selConv.estado === 'Fallecido' ? -1 : ESTADOS.indexOf(selConv.estado);
          const proxEstado = idxActual >= 0 && idxActual < ESTADOS.length - 1 ? ESTADOS[idxActual + 1] : null;
          const progreso = Math.round(((idxActual + 1) / ESTADOS.length) * 100);
          const grupoAsignado = selConv.grupoId ? grupos.find((g) => g.id === selConv.grupoId) : null;
          const telLimpio = (selConv.telefono || '').replace(/\D/g, '');
          const esFinal = idxActual === ESTADOS.length - 1;
          return (<>
            {/* HERO */}
            <div style={{ display: 'flex', gap: 16, alignItems: 'center', padding: '4px 0 18px', borderBottom: '1px solid var(--border)', marginBottom: 18 }}>
              <div className="avatar-lg" style={{ background: 'linear-gradient(135deg, var(--oro-apostolico), var(--oro-sombra))', color: 'var(--carbon)' }}>{iniciales || '👤'}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-display)' }}>{selConv.nombre} {selConv.apellido}</h2>
                  <span className={`badge ${EST_BADGE[selConv.estado]}`}>{ESTADOS_EMOJI[selConv.estado]} {selConv.estado}</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--dim)', marginTop: 6 }}>
                  📍 {selConv.zona || 'Sin zona'} · 👤 Mayor: {selConv.lider || '—'} · ⏱️ {diasEnProceso === 0 ? 'registrado hoy' : `${diasEnProceso} ${diasEnProceso === 1 ? 'día' : 'días'} en proceso`}
                </div>
              </div>
            </div>

            {/* QUICK CONTACT */}
            {(telLimpio || selConv.direccion) && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
                {telLimpio && <a href={`tel:+${telLimpio}`} className="btn btn-secondary btn-sm" style={{ textDecoration: 'none' }}>📞 Llamar</a>}
                {telLimpio && <a href={`https://wa.me/${telLimpio}`} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm" style={{ textDecoration: 'none', color: 'var(--green)', borderColor: 'var(--green)' }}>💬 WhatsApp</a>}
                {selConv.direccion && <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selConv.direccion + ' ' + (selConv.zona || ''))}`} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm" style={{ textDecoration: 'none', color: 'var(--blue)', borderColor: 'var(--blue)' }}>🗺️ Ver en mapa</a>}
              </div>
            )}

            {/* STATS */}
            <div className="kpis" style={{ marginBottom: 20 }}>
              <div className="kpi" style={accentStyle('var(--gold)')}>
                <div className="kpi-label">📅 Días en proceso</div>
                <div className="kpi-value" style={{ fontSize: 24 }}>{diasEnProceso}</div>
                <div className="kpi-sub">desde {fmt(selConv.fecha)}</div>
              </div>
              <div className="kpi" style={accentStyle(ESTADOS_COLOR[idxActual] || 'var(--gold)')}>
                <div className="kpi-label">⏱️ En estado actual</div>
                <div className="kpi-value" style={{ fontSize: 24 }}>{diasEnEstado}</div>
                <div className="kpi-sub">{diasEnEstado === 0 ? 'cambió hoy' : `hace ${diasEnEstado} ${diasEnEstado === 1 ? 'día' : 'días'}`}</div>
              </div>
              <div className="kpi" style={accentStyle('var(--green)')}>
                <div className="kpi-label">🎯 Próximo objetivo</div>
                <div className="kpi-value" style={{ fontSize: 16 }}>{proxEstado ? `${ESTADOS_EMOJI[proxEstado]} ${proxEstado}` : '✓ Completo'}</div>
                <div className="kpi-sub">{proxEstado ? `avanzar a ${proxEstado}` : 'proceso finalizado'}</div>
              </div>
              <div className="kpi" style={accentStyle('var(--purple)')}>
                <div className="kpi-label">📊 Progreso</div>
                <div className="kpi-value" style={{ fontSize: 24 }}>{progreso}%</div>
                <div className="kpi-sub">paso {idxActual + 1} de {ESTADOS.length}</div>
              </div>
            </div>

            {/* PROGRESS BAR */}
            <div style={{ height: 6, borderRadius: 3, background: 'var(--surface-2)', overflow: 'hidden', marginBottom: 8, display: 'flex' }}>
              {ESTADOS.map((e, i) => {
                const fill = i < idxActual ? '100%' : i === idxActual ? `${((diasEnEstado % 30) / 30) * 100}%` : '0%';
                return <div key={e} title={e} style={{ flex: 1, height: '100%', background: i <= idxActual ? ESTADOS_COLOR[i] : 'transparent', borderRight: i < ESTADOS.length - 1 ? '1px solid var(--surface)' : 'none', position: 'relative' }}><div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: fill, background: i === idxActual ? `${ESTADOS_COLOR[i]}cc` : ESTADOS_COLOR[i] }} /></div>;
              })}
            </div>

            {/* PIPELINE */}
            <div className="form-section">Pipeline — clic para avanzar</div>
            <div className="steps">
              {updateSteps(tempEst || selConv.estado).map((s) => (
                <div key={s.estado} className={s.cls} onClick={() => setTempEst(s.estado)}>
                  <div className="step-dot">{s.emoji}</div>
                  <div className="step-label">{s.estado}</div>
                </div>
              ))}
            </div>

            {/* QUICK ADVANCE */}
            {!esFinal && (() => {
              const nextEst = ESTADOS[idxActual + 1] as typeof ESTADOS[number];
              const yaSeleccionado = tempEst === nextEst;
              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8, marginBottom: 18, padding: '10px 12px', background: 'var(--gold-glow)', borderRadius: 8, border: '1px solid var(--gold)' }}>
                  <span style={{ fontSize: 20 }}>⚡</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--oro-sombra)' }}>Acción rápida</div>
                    <div style={{ fontSize: 11, color: 'var(--dim)' }}>{yaSeleccionado ? `Listo para promover a ${nextEst}` : `Promover al siguiente estado del pipeline`}</div>
                  </div>
                  <button type="button" className="btn btn-gold btn-sm" disabled={yaSeleccionado} onClick={() => setTempEst(nextEst)}>
                    {ESTADOS_EMOJI[nextEst]} {yaSeleccionado ? 'Seleccionado' : `Promover a ${nextEst}`} →
                  </button>
                </div>
              );
            })()}

            {/* LINKED CARDS */}
            {grupoAsignado && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderRadius: 8, background: 'var(--surface-2)', border: '1px solid var(--gold)', marginBottom: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--gold-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>👥</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 10, color: 'var(--dim)', letterSpacing: 1.2, textTransform: 'uppercase', fontWeight: 600, marginBottom: 2 }}>Grupo asignado</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--oro-sombra)' }}>{grupoAsignado.nombre}</div>
                  <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 2 }}>📍 {grupoAsignado.zona} · 🗓️ {grupoAsignado.dia} {grupoAsignado.hora} · 👤 {grupoAsignado.lider || 'Sin mentor'}</div>
                </div>
              </div>
            )}
            {selConv.estado === 'Integrado' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderRadius: 8, background: 'var(--gold-glow)', border: '1px solid var(--gold)', marginBottom: 18 }}>
                <div style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--gold)', color: 'var(--carbon)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700 }}>✓</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 10, color: 'var(--dim)', letterSpacing: 1.2, textTransform: 'uppercase', fontWeight: 600, marginBottom: 2 }}>Miembro de la iglesia</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--oro-sombra)' }}>Activo en el sistema</div>
                  <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 2 }}>Visible en la pestaña Miembros</div>
                </div>
              </div>
            )}

            {/* INFO GRID */}
            <div className="form-section">Datos Registrados</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0 18px' }}>
              <div className="detail-row"><span className="detail-label">📞 Teléfono</span><span className="detail-value">{selConv.telefono || <span style={{ color: 'var(--dim)' }}>No registrado</span>}</span></div>
              <div className="detail-row"><span className="detail-label">🎂 Edad</span><span className="detail-value">{selConv.edad || '—'}</span></div>
              <div className="detail-row"><span className="detail-label">📍 Zona</span><span className="detail-value">{selConv.zona || '—'}</span></div>
              <div className="detail-row"><span className="detail-label">👤 Mayor</span><span className="detail-value">{selConv.lider || '—'}</span></div>
              <div className="detail-row"><span className="detail-label">🏠 Familia en ministerio</span><span className="detail-value">{selConv.familia || 'No'}</span></div>
              <div className="detail-row"><span className="detail-label">📅 Fecha conversión</span><span className="detail-value">{fmt(selConv.fecha)}</span></div>
              {selConv.direccion && <div className="detail-row" style={{ gridColumn: '1 / -1' }}><span className="detail-label">🏡 Dirección</span><span className="detail-value" style={{ fontSize: 12 }}>{selConv.direccion}</span></div>}
              {selConv.notas && <div className="detail-row" style={{ gridColumn: '1 / -1', flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}><span className="detail-label">📝 Notas</span><span className="detail-value" style={{ fontSize: 12, color: 'var(--dim)', whiteSpace: 'pre-wrap' }}>{selConv.notas}</span></div>}
            </div>

            {/* TIMELINE */}
            {selConv.historial.length > 0 && <>
              <div className="form-section" style={{ marginTop: 20 }}>Historial de Seguimiento</div>
              <div className="timeline">
                {selConv.historial.slice().reverse().map((h, i) => {
                  const idxH = h.estado === 'Apartado' || h.estado === 'Fallecido' ? -1 : ESTADOS.indexOf(h.estado as typeof ESTADOS[number]);
                  return (
                    <div key={i} className="timeline-item">
                      <div className="timeline-dot" style={{ background: idxH >= 0 ? ESTADOS_COLOR[idxH] : h.estado === 'Fallecido' ? 'var(--dim)' : 'var(--red, #ef4444)' }} />
                      <div className="timeline-date">{fmt(h.fecha)}</div>
                      <div className="timeline-content">
                        <span className={`badge ${EST_BADGE[h.estado] || 'badge-blue'}`} style={{ fontSize: 10 }}>{h.estado}</span>
                        <div style={{ fontSize: 12, marginTop: 4, whiteSpace: 'pre-wrap' }}>{h.nota || <em style={{ color: 'var(--dim)' }}>Sin nota descriptiva</em>}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>}

            {/* AGREGAR NOTA */}
            <div className="form-section" style={{ marginTop: 20 }}>Agregar Nota de Seguimiento</div>
            <textarea className="form-textarea" value={sNota} onChange={(e) => setSNota(e.target.value)} placeholder="Visita, bautismo, integración, conversación…" />
            {selConv.estado === 'Integrado' && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, fontSize: 12, color: 'var(--oro-sombra)', cursor: 'pointer', userSelect: 'none' }}>
                <input type="checkbox" checked={sHito} onChange={(e) => setSHito(e.target.checked)} disabled={!sNota.trim()} style={{ width: 16, height: 16, cursor: sNota.trim() ? 'pointer' : 'not-allowed' }} />
                <span>📌 También registrar como <strong>Hito</strong> en el miembro vinculado</span>
              </label>
            )}
            {!sNota.trim() && tempEst && tempEst !== selConv.estado && (
              <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 6, fontStyle: 'italic' }}>💡 El cambio de estado se registrará sin nota descriptiva</div>
            )}
          </>);
        })()}
      </Modal>

      {/* MODAL: Confirm Delete Conversión */}
      <Modal open={modal === 'confirm'} onClose={() => setModal(null)} title="⚠️ Confirmar" footer={<><button className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button><button className="btn btn-danger" onClick={delConv}>Sí, Eliminar</button></>}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 44, marginBottom: 10 }}>🗑️</div>
          <p style={{ color: 'var(--dim)', fontSize: 14, lineHeight: 1.6 }}>¿Eliminar el registro de <strong style={{ color: 'var(--txt)' }}>{selConv?.nombre} {selConv?.apellido}</strong>?<br />Esta acción no se puede deshacer.</p>
        </div>
      </Modal>

      {/* MODAL: Confirm Delete Grupo */}
      <Modal open={modal === 'confirmGrupo'} onClose={() => setModal(null)} title="⚠️ Eliminar Grupo" footer={<><button className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button><button className="btn btn-danger" onClick={delGrupo}>Sí, Eliminar</button></>}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 44, marginBottom: 10 }}>🗑️</div>
          <p style={{ color: 'var(--dim)', fontSize: 14, lineHeight: 1.6 }}>¿Eliminar el grupo <strong style={{ color: 'var(--txt)' }}>{grupos.find((g) => g.id === selectedId)?.nombre}</strong>?<br />Esta acción no se puede deshacer.</p>
        </div>
      </Modal>

      {/* MODAL: Confirm Delete Evangelismo */}
      <Modal open={modal === 'confirmEvang'} onClose={() => setModal(null)} title="⚠️ Eliminar Actividad" footer={<><button className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button><button className="btn btn-danger" onClick={delEvang}>Sí, Eliminar</button></>}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 44, marginBottom: 10 }}>🗑️</div>
          <p style={{ color: 'var(--dim)', fontSize: 14, lineHeight: 1.6 }}>¿Eliminar esta actividad de evangelismo?<br />Esta acción no se puede deshacer.</p>
        </div>
      </Modal>

      {toast && <div className="toast-container"><div className="toast success">{toast}</div></div>}
      </div>
    </Layout>
  );
}
