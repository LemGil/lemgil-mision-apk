import { useState, useMemo } from 'react';
import { v4 as uuid } from 'uuid';
import { useLiveQuery } from 'dexie-react-hooks';
import { Layout } from '../components/Layout';
import { Modal } from '../components/Modal';
import { EmptyState } from '../components/EmptyState';
import { ZonaSelect } from '../components/ZonaSelect';
import { db } from '../lib/database';
import type { Miembro, MiembroMinisterio, Hito } from '../lib/types';
import { exportMiembrosPDF, exportMinisteriosPDF, exportHitosPDF } from '../lib/pdfExport';

const today = () => new Date().toISOString().split('T')[0];
const fmt = (d: string) => {
  if (!d) return '—';
  const [y, m, dy] = d.split('-');
  const MS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${+dy} ${MS[+m - 1]} ${y}`;
};
const calcAge = (d: string) => {
  if (!d) return null;
  const n = new Date(d);
  const now = new Date();
  let age = now.getFullYear() - n.getFullYear();
  const m = now.getMonth() - n.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < n.getDate())) age--;
  return age;
};

const EST_BADGE: Record<string, string> = { Activo: 'badge-green', Inactivo: 'badge-red', Trasladado: 'badge-yellow', Disciplinado: 'badge-red' };
const CIVIL_BADGE: Record<string, string> = { Soltero: 'badge-blue', Casado: 'badge-green', Viudo: 'badge-yellow', Divorciado: 'badge-red', Unión: 'badge-purple' };
const ROL_BADGE: Record<string, string> = { Líder: 'badge-purple', Coordinador: 'badge-blue', Servidor: 'badge-green', Miembro: 'badge-yellow' };
const HITO_BADGE: Record<string, string> = { Conversión: 'badge-blue', Bautismo: 'badge-purple', Discipulado: 'badge-green', 'Curso Completado': 'badge-blue', Integración: 'badge-green', Liderazgo: 'badge-purple', Matrimonio: 'badge-yellow', Otro: 'badge-blue' };
const ROLES = ['Líder', 'Coordinador', 'Servidor', 'Miembro'] as const;
const HITO_TIPOS = ['Conversión', 'Bautismo', 'Discipulado', 'Curso Completado', 'Integración', 'Liderazgo', 'Matrimonio', 'Otro'] as const;

const diasHastaCumple = (fechaNac: string) => {
  if (!fechaNac) return null;
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const fc = new Date(fechaNac); fc.setHours(0, 0, 0, 0);
  const prox = new Date(hoy.getFullYear(), fc.getMonth(), fc.getDate());
  if (prox < hoy) prox.setFullYear(hoy.getFullYear() + 1);
  return Math.floor((prox.getTime() - hoy.getTime()) / 86400000);
};
const aniosEnIglesia = (fechaIngreso: string) => {
  if (!fechaIngreso) return 0;
  const fi = new Date(fechaIngreso);
  const hoy = new Date();
  let a = hoy.getFullYear() - fi.getFullYear();
  const m = hoy.getMonth() - fi.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < fi.getDate())) a--;
  return Math.max(0, a);
};
const diasEnIglesia = (fechaIngreso: string) => {
  if (!fechaIngreso) return 0;
  const fi = new Date(fechaIngreso);
  return Math.max(0, Math.floor((Date.now() - fi.getTime()) / 86400000));
};

type Tab = 'directorio' | 'ministerios' | 'hitos';
type ModalType = 'miembro' | 'ministerio' | 'asignar' | 'hito' | 'detail' | 'delM' | 'delMin' | 'delAsig' | 'delH';

export default function Miembros() {
  const miembros = useLiveQuery(() => db.miembros.toArray(), []) ?? [];
  const grupos = useLiveQuery(() => db.grupos.toArray(), []) ?? [];
  const ministerios = useLiveQuery(() => db.ministerios.toArray(), []) ?? [];
  const asignaciones = useLiveQuery(() => db.miembrosMinisterios.toArray(), []) ?? [];
  const hitos = useLiveQuery(() => db.hitos.toArray(), []) ?? [];
   const zonasDb = useLiveQuery(() => db.zonas.toArray(), []) ?? [];

  const [tab, setTab] = useState<Tab>('directorio');
  const [search, setSearch] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [filterZona, setFilterZona] = useState('');
  const [filterContacto, setFilterContacto] = useState('');
  const [modal, setModal] = useState<null | ModalType>(null);
  const [editMId, setEditMId] = useState<string | null>(null);
  const [editMinId, setEditMinId] = useState<string | null>(null);
  const [editAId, setEditAId] = useState<string | null>(null);
  const [editHId, setEditHId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [toast, setToast] = useState('');

  const [mNombre, setMNombre] = useState('');
  const [mApellido, setMApellido] = useState('');
  const [mTel, setMTel] = useState('');
  const [mEmail, setMEmail] = useState('');
  const [mDir, setMDir] = useState('');
  const [mZona, setMZona] = useState('');
  const [mGrupo, setMGrupo] = useState('');
  const [mNac, setMNac] = useState('');
  const [mIngreso, setMIngreso] = useState(today());
  const [mEstado, setMEstado] = useState('Activo');
  const [mContacto, setMContacto] = useState('WhatsApp');
  const [mProfesion, setMProfesion] = useState('');
  const [mCivil, setMCivil] = useState('Soltero');
  const [mBautizado, setMBautizado] = useState(false);
  const [mBautismo, setMBautismo] = useState('');
  const [mConyuge, setMConyuge] = useState('');
  const [mHijos, setMHijos] = useState('');
  const [mConv, setMConv] = useState('');
  const [mHermanoMayorId, setMHermanoMayorId] = useState('');
  const [mNotas, setMNotas] = useState('');

  const [minNombre, setMinNombre] = useState('');
  const [minDesc, setMinDesc] = useState('');
  const [minLider, setMinLider] = useState('');
  const [minLiderCustom, setMinLiderCustom] = useState(false);
  const [minColor, setMinColor] = useState('#5BA2C6');
  const [minEmoji, setMinEmoji] = useState('⛪');

  const [asigMiembro, setAsigMiembro] = useState('');
  const [asigMinisterio, setAsigMinisterio] = useState('');
  const [asigRol, setAsigRol] = useState('Miembro');
  const [asigDesde, setAsigDesde] = useState(today());
  const [asigNotas, setAsigNotas] = useState('');

  const [hMiembro, setHMiembro] = useState('');
  const [hFecha, setHFecha] = useState(today());
  const [hTipo, setHTipo] = useState('Conversión');
  const [hDesc, setHDesc] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3200);
  };

  const resetM = () => {
    setEditMId(null);
    setMNombre(''); setMApellido(''); setMTel(''); setMEmail(''); setMDir(''); setMZona(''); setMGrupo('');
    setMNac(''); setMIngreso(today()); setMEstado('Activo'); setMContacto('WhatsApp');
    setMProfesion(''); setMCivil('Soltero'); setMBautizado(false); setMBautismo(''); setMConyuge(''); setMHijos('');
    setMConv(''); setMHermanoMayorId(''); setMNotas('');
  };
  const resetMin = () => {
    setEditMinId(null);
    setMinNombre(''); setMinDesc(''); setMinLider(''); setMinLiderCustom(false); setMinColor('#5BA2C6'); setMinEmoji('⛪');
  };
  const resetAsig = () => {
    setEditAId(null);
    setAsigMiembro(''); setAsigMinisterio(''); setAsigRol('Miembro'); setAsigDesde(today()); setAsigNotas('');
  };
  const resetH = () => {
    setEditHId(null);
    setHMiembro(''); setHFecha(today()); setHTipo('Conversión'); setHDesc('');
  };

  const zonas = useMemo(() => {
    const set = new Set([...zonasDb.map((z) => z.nombre), ...miembros.map((m) => m.zona).filter(Boolean)]);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [zonasDb, miembros]);

  const kpis = useMemo(() => {
    const activos = miembros.filter((m) => m.estado === 'Activo').length;
    const ministeriosCount = ministerios.length;
    const cumplesProx = miembros.filter(m => { const d = diasHastaCumple(m.fechaNacimiento); return d !== null && d <= 30; }).length;
    return { activos, ministeriosCount, cumplesProx };
  }, [miembros, ministerios]);

  const proximosCumples = useMemo(() => {
    return miembros
      .map(m => ({ m, dias: diasHastaCumple(m.fechaNacimiento) }))
      .filter(x => x.dias !== null && x.dias <= 30)
      .sort((a, b) => (a.dias || 0) - (b.dias || 0));
  }, [miembros]);

  const miembrosFiltrados = useMemo(() => {
    const s = search.toLowerCase();
    return miembros
      .filter((m) => {
        const asigs = asignaciones.filter((a) => a.miembroId === m.id);
        const mints = asigs.map((a) => ministerios.find((x) => x.id === a.ministerioId)?.nombre).filter(Boolean).join(' ');
        const full = `${m.nombre} ${m.apellido} ${m.telefono} ${m.email} ${m.profesion} ${mints}`.toLowerCase();
        return (!s || full.includes(s)) && (!filterEstado || m.estado === filterEstado) && (!filterZona || m.zona === filterZona) && (!filterContacto || m.contactoPreferido === filterContacto);
      })
      .sort((a, b) => `${a.apellido} ${a.nombre}`.localeCompare(`${b.apellido} ${b.nombre}`));
  }, [miembros, asignaciones, ministerios, search, filterEstado, filterZona, filterContacto]);

  const selMiembro = miembros.find((m) => m.id === selectedId);
  const selMinisterio = ministerios.find((x) => x.id === selectedId);
  const selAsig = asignaciones.find((a) => a.id === selectedId);
  const selHito = hitos.find((h) => h.id === selectedId);

  const selAsigMiembro = selAsig ? miembros.find((m) => m.id === selAsig.miembroId) : null;
  const selAsigMinisterio = selAsig ? ministerios.find((x) => x.id === selAsig.ministerioId) : null;
  const selHitoMiembro = selHito ? miembros.find((m) => m.id === selHito.miembroId) : null;

  const openNewM = () => { resetM(); setModal('miembro'); };
  const openEditM = (id: string) => {
    const m = miembros.find((x) => x.id === id); if (!m) return;
    setEditMId(id); setMNombre(m.nombre); setMApellido(m.apellido); setMTel(m.telefono);
    setMEmail(m.email); setMDir(m.direccion); setMZona(m.zona); setMGrupo(m.grupoId || '');
    setMNac(m.fechaNacimiento); setMIngreso(m.fechaIngreso); setMEstado(m.estado); setMContacto(m.contactoPreferido);
    setMProfesion(m.profesion); setMCivil(m.estadoCivil);
    setMBautizado(!!m.bautizado); setMBautismo(m.fechaBautismo || ''); setMConyuge(m.conyuge || ''); setMHijos(m.hijos || '');
    setMConv(m.conversionId || ''); setMHermanoMayorId(m.hermanoMayorId || ''); setMNotas(m.notas);
    setModal('miembro');
  };
  const saveM = async () => {
    if (!mNombre.trim() || !mApellido.trim()) return showToast('Nombre y apellido son obligatorios');
    if (mEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mEmail.trim())) return showToast('Email no válido');
    if (mNac && mIngreso && mNac > mIngreso) return showToast('La fecha de nacimiento no puede ser posterior al ingreso');
    if (mBautismo && !mBautizado) return showToast('Marca "Bautizado" si indicas fecha de bautismo');
    const data = {
      nombre: mNombre.trim(), apellido: mApellido.trim(), telefono: mTel.trim(), email: mEmail.trim(),
      direccion: mDir.trim(), zona: mZona.trim(), grupoId: mGrupo || null, fechaNacimiento: mNac, fechaIngreso: mIngreso,
      estado: mEstado as Miembro['estado'], contactoPreferido: mContacto as Miembro['contactoPreferido'],
      profesion: mProfesion.trim(), estadoCivil: mCivil as Miembro['estadoCivil'],
      bautizado: mBautizado, fechaBautismo: mBautizado ? mBautismo : '',
      conyuge: mConyuge.trim(), hijos: mHijos.trim(),
      conversionId: mConv || null, hermanoMayorId: mHermanoMayorId || null, notas: mNotas.trim(),
    };
    if (editMId) {
      await db.miembros.update(editMId, { ...data, actualizado: new Date().toISOString() });
      showToast(`Miembro "${mNombre} ${mApellido}" actualizado`);
    } else {
      const now = new Date().toISOString();
      await db.miembros.add({ id: uuid(), creado: now, actualizado: now, ...data });
      showToast(`Miembro "${mNombre} ${mApellido}" registrado`);
    }
    resetM(); setModal(null);
  };
  const delM = async () => {
    if (!selectedId) return;
    const m = miembros.find((x) => x.id === selectedId);
    await db.miembros.delete(selectedId);
    await db.miembrosMinisterios.where('miembroId').equals(selectedId).delete();
    await db.hitos.where('miembroId').equals(selectedId).delete();
    showToast(`Miembro "${m ? `${m.nombre} ${m.apellido}` : ''}" y sus datos eliminados`);
    setSelectedId(null); setModal(null);
  };

  const openNewMin = () => { resetMin(); setModal('ministerio'); };
  const openEditMin = (id: string) => {
    const x = ministerios.find((m) => m.id === id); if (!x) return;
    setEditMinId(id); setMinNombre(x.nombre); setMinDesc(x.descripcion); setMinLider(x.lider);
    const enLista = miembros.some((m) => `${m.nombre} ${m.apellido}` === x.lider);
    setMinLiderCustom(!enLista && !!x.lider);
    setMinColor(x.color); setMinEmoji(x.emoji);
    setModal('ministerio');
  };
  const saveMin = async () => {
    if (!minNombre.trim()) return showToast('El nombre del ministerio es obligatorio');
    const data = { nombre: minNombre.trim(), descripcion: minDesc.trim(), lider: minLider.trim(), color: minColor, emoji: minEmoji };
    if (editMinId) {
      await db.ministerios.update(editMinId, data);
      showToast(`Ministerio "${minNombre}" actualizado`);
    } else {
      await db.ministerios.add({ id: uuid(), creado: new Date().toISOString(), ...data });
      showToast(`Ministerio "${minNombre}" creado`);
    }
    resetMin(); setModal(null);
  };
  const delMin = async () => {
    if (!selectedId) return;
    const x = ministerios.find((m) => m.id === selectedId);
    await db.ministerios.delete(selectedId);
    await db.miembrosMinisterios.where('ministerioId').equals(selectedId).delete();
    showToast(`Ministerio "${x ? x.nombre : ''}" eliminado`);
    setSelectedId(null); setModal(null);
  };

  const openNewAsig = (preM?: string, preMin?: string) => {
    resetAsig();
    if (preM) setAsigMiembro(preM);
    if (preMin) setAsigMinisterio(preMin);
    setModal('asignar');
  };
  const saveAsig = async () => {
    if (!asigMiembro || !asigMinisterio) return showToast('Selecciona miembro y ministerio');
    const dup = asignaciones.find((a) => a.miembroId === asigMiembro && a.ministerioId === asigMinisterio && a.id !== editAId);
    if (dup) return showToast('Este miembro ya está asignado a ese ministerio');
    const data = {
      miembroId: asigMiembro, ministerioId: asigMinisterio, rol: asigRol as MiembroMinisterio['rol'],
      desde: asigDesde, notas: asigNotas.trim(),
    };
    if (editAId) {
      await db.miembrosMinisterios.update(editAId, data);
      showToast('Asignación actualizada');
    } else {
      await db.miembrosMinisterios.add({ id: uuid(), creado: new Date().toISOString(), ...data });
      const m = miembros.find((x) => x.id === asigMiembro);
      const mn = ministerios.find((x) => x.id === asigMinisterio);
      showToast(`${m?.nombre || 'Miembro'} → ${mn?.nombre || 'Ministerio'}`);
    }
    resetAsig(); setModal(null);
  };
  const delAsig = async () => {
    if (!selectedId) return;
    await db.miembrosMinisterios.delete(selectedId);
    showToast('Asignación eliminada');
    setSelectedId(null); setModal(null);
  };
  const updateAsigRol = async (asigId: string, nuevoRol: string) => {
    await db.miembrosMinisterios.update(asigId, { rol: nuevoRol as MiembroMinisterio['rol'] });
    showToast('Rol actualizado');
  };
  const quickRemoveAsig = async (asigId: string, mn: string) => {
    await db.miembrosMinisterios.delete(asigId);
    showToast(`Removido de ${mn}`);
  };

  const [qhTipo, setQhTipo] = useState<string>('Conversión');
  const [qhFecha, setQhFecha] = useState(today());
  const [qhDesc, setQhDesc] = useState('');
  const quickAddHito = async () => {
    if (!selMiembro) return;
    if (!qhDesc.trim()) return showToast('Describe el hito');
    await db.hitos.add({
      id: uuid(), miembroId: selMiembro.id, fecha: qhFecha,
      tipo: qhTipo as Hito['tipo'], descripcion: qhDesc.trim(), creado: new Date().toISOString(),
    });
    setQhDesc(''); setQhTipo('Conversión'); setQhFecha(today());
    showToast('Hito registrado');
  };

  const openNewH = (preM?: string) => { resetH(); if (preM) setHMiembro(preM); setModal('hito'); };
  const openEditH = (id: string) => {
    const h = hitos.find((x) => x.id === id); if (!h) return;
    setEditHId(id); setHMiembro(h.miembroId || ''); setHFecha(h.fecha); setHTipo(h.tipo); setHDesc(h.descripcion);
    setModal('hito');
  };
  const saveH = async () => {
    if (!hMiembro) return showToast('Selecciona un miembro');
    if (!hDesc.trim()) return showToast('Describe el hito');
    const data = { miembroId: hMiembro, fecha: hFecha, tipo: hTipo as Hito['tipo'], descripcion: hDesc.trim() };
    if (editHId) {
      await db.hitos.update(editHId, data);
      showToast('Hito actualizado');
    } else {
      await db.hitos.add({ id: uuid(), creado: new Date().toISOString(), ...data });
      showToast('Hito registrado');
    }
    resetH(); setModal(null);
  };
  const delH = async () => {
    if (!selectedId) return;
    await db.hitos.delete(selectedId);
    showToast('Hito eliminado');
    setSelectedId(null); setModal(null);
  };

  const ministeriosConStats = useMemo(() => {
    return ministerios.map((mn) => {
      const asigs = asignaciones.filter((a) => a.ministerioId === mn.id);
      const miembrosEn = asigs.map((a) => miembros.find((m) => m.id === a.miembroId)).filter((m): m is Miembro => Boolean(m));
      const lideres = asigs.filter((a) => a.rol === 'Líder' || a.rol === 'Coordinador').length;
      return { ...mn, asignados: asigs.length, miembros: miembrosEn, lideres };
    }).sort((a, b) => b.asignados - a.asignados);
  }, [ministerios, asignaciones, miembros]);

  const asignacionesPorMiembro = useMemo(() => {
    const map: Record<string, MiembroMinisterio[]> = {};
    asignaciones.forEach((a) => { (map[a.miembroId] ||= []).push(a); });
    return map;
  }, [asignaciones]);

  const hitosPorMiembro = useMemo(() => {
    const map: Record<string, Hito[]> = {};
    hitos.forEach((h) => { if (h.miembroId) (map[h.miembroId] ||= []).push(h); });
    Object.keys(map).forEach((k) => map[k].sort((a, b) => b.fecha.localeCompare(a.fecha)));
    return map;
  }, [hitos]);

  const hitosList = useMemo(() => {
    return [...hitos]
      .filter((h) => {
        if (!search) return true;
        const m = miembros.find((x) => x.id === h.miembroId);
        return `${m?.nombre || ''} ${m?.apellido || ''} ${h.descripcion} ${h.tipo}`.toLowerCase().includes(search.toLowerCase());
      })
      .sort((a, b) => b.fecha.localeCompare(a.fecha));
  }, [hitos, miembros, search]);

  return (
    <Layout title="Miembros Integrados">
      <div className="summary-bar">
        <div className="summary-item"><span className="summary-icon">🧑</span><span className="summary-value">{kpis.activos}</span><span className="summary-label">Miembros activos</span></div>
        <div className="summary-item"><span className="summary-icon">⛪</span><span className="summary-value">{kpis.ministeriosCount}</span><span className="summary-label">Ministerios</span></div>
        <div className="summary-item"><span className="summary-icon">📍</span><span className="summary-value">{hitos.filter((h) => h.fecha.startsWith(new Date().toISOString().slice(0, 7))).length}</span><span className="summary-label">Hitos este mes</span></div>
        <div className="summary-item"><span className="summary-icon">🎂</span><span className="summary-value">{kpis.cumplesProx}</span><span className="summary-label">Próximos cumpleaños</span></div>
      </div>

      {miembros.length > 0 && (
        <div className="card" style={{ marginBottom: 16, padding: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <span style={{ fontSize: 18 }}>🎂</span>
            <span style={{ fontWeight: 700, fontSize: 14 }}>Próximos Cumpleaños</span>
            <span style={{ fontSize: 11, color: 'var(--dim)' }}>— {proximosCumples.length} {proximosCumples.length === 1 ? 'miembro' : 'miembros'} en los próximos 30 días</span>
          </div>
          {proximosCumples.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--dim)', fontSize: 13, padding: 10 }}>No hay cumpleaños en los próximos 30 días</div>
          ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {proximosCumples.map(({ m, dias }) => {
              const d = dias!;
              return (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px', borderRadius: 6, background: d === 0 ? 'var(--gold-glow)' : 'var(--surface-2)', fontSize: 13 }}>
                <span style={{ fontSize: 16 }}>{d === 0 ? '🎉' : d <= 7 ? '🎈' : '📅'}</span>
                <strong style={{ flex: 1 }}>{m.nombre} {m.apellido}</strong>
                <span style={{ color: 'var(--dim)', fontSize: 12 }}>
                  {d === 0 ? '¡Hoy!' : d === 1 ? 'Mañana' : `En ${d} días`}
                </span>
                <span style={{ fontSize: 11, color: 'var(--dim)' }}>{calcAge(m.fechaNacimiento) !== null ? `(${calcAge(m.fechaNacimiento)} años)` : ''}</span>
                {m.telefono && d <= 1 && <a href={`https://wa.me/${m.telefono.replace(/\D/g, '')}?text=${encodeURIComponent(`¡Feliz cumpleaños ${m.nombre}! 🎂🎉 Que Dios te bendiga grandemente`)}`} target="_blank" rel="noopener noreferrer" className="btn btn-gold btn-sm" style={{ padding: '2px 10px', fontSize: 11, textDecoration: 'none' }}>💬 Felicitar</a>}
              </div>
            );
            })}
          </div>
          )}
        </div>
      )}

      <div className="tabs">
        <button className={`tab ${tab === 'directorio' ? 'active' : ''}`} onClick={() => setTab('directorio')}>📖 Directorio · {miembros.length}</button>
        <button className={`tab ${tab === 'ministerios' ? 'active' : ''}`} onClick={() => setTab('ministerios')}>⛪ Ministerios · {ministerios.length}</button>
        <button className={`tab ${tab === 'hitos' ? 'active' : ''}`} onClick={() => setTab('hitos')}>📍 Hitos · {hitos.length}</button>
      </div>

      {tab === 'directorio' && (
        <div className="card">
           <div className="card-header">
             <div>
               <div className="card-title">DIRECTORIO DE MIEMBROS</div>
               <div className="card-sub">Datos personales, contacto y ministerios</div>
             </div>
             <div style={{ display: 'flex', gap: 8 }}>
               <button className="btn btn-secondary btn-sm" onClick={() => exportMiembrosPDF({ miembros: miembrosFiltrados, filtros: { estado: filterEstado, zona: filterZona, contacto: filterContacto } })}>📄 Exportar PDF</button>
               <button className="btn btn-gold" onClick={openNewM}>➕ Nuevo miembro</button>
             </div>
           </div>
          <div className="search-bar">
            <input className="search-input" placeholder="🔍 Buscar nombre, teléfono, ministerio..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <select className="filter-select" value={filterEstado} onChange={(e) => setFilterEstado(e.target.value)}>
              <option value="">Todos los estados</option>
              <option>Activo</option><option>Inactivo</option><option>Trasladado</option><option>Disciplinado</option>
            </select>
            <select className="filter-select" value={filterZona} onChange={(e) => setFilterZona(e.target.value)}>
              <option value="">Todas las zonas</option>
              {zonas.map((z) => <option key={z} value={z}>{z}</option>)}
            </select>
            <select className="filter-select" value={filterContacto} onChange={(e) => setFilterContacto(e.target.value)}>
              <option value="">Cualquier contacto</option>
              <option>Teléfono</option><option>WhatsApp</option><option>Email</option><option>Visita</option><option>Otro</option>
            </select>
          </div>
          {miembrosFiltrados.length === 0 ? (
            <EmptyState icon="🧑" title="Sin miembros registrados" sub="Agrega el primer miembro para iniciar el directorio" />
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nombre</th><th>Contacto</th><th>Edad</th><th>Zona</th><th>Grupo</th><th>Ministerios</th><th>Estado</th><th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {miembrosFiltrados.map((m) => {
                  const asigs = asignacionesPorMiembro[m.id] || [];
                  const mints = asigs.map((a) => {
                    const mn = ministerios.find((x) => x.id === a.ministerioId);
                    return mn ? `${mn.emoji}${mn.nombre.split(' ')[0]}` : '';
                  }).filter(Boolean).join(' ');
                  const grupoAsignado = m.grupoId ? grupos.find(g => g.id === m.grupoId) : null;
                  return (
                    <tr key={m.id}>
                      <td>
                        <strong>{m.nombre} {m.apellido}</strong>
                        {m.profesion && <div style={{ fontSize: 11, color: 'var(--dim)' }}>{m.profesion}</div>}
                      </td>
                      <td>
                        <div style={{ fontSize: 12 }}>
                          {m.telefono && <div>📱 {m.telefono}</div>}
                          {m.email && <div style={{ color: 'var(--dim)' }}>✉ {m.email}</div>}
                        </div>
                      </td>
                      <td>{calcAge(m.fechaNacimiento) ?? '—'}</td>
                      <td style={{ fontSize: 12 }}>{m.zona || '—'}</td>
                      <td style={{ fontSize: 12 }}>{grupoAsignado ? <span style={{ padding: '2px 8px', borderRadius: 6, background: 'var(--gold-glow)', color: 'var(--gold)', fontSize: 11, fontWeight: 700, border: '1px solid var(--gold)', whiteSpace: 'nowrap' }}>👥 {grupoAsignado.nombre}</span> : <span style={{ color: 'var(--dim)' }}>—</span>}</td>
                      <td style={{ fontSize: 12 }}>{mints || <span style={{ color: 'var(--dim)' }}>—</span>}</td>
                      <td><span className={`badge ${EST_BADGE[m.estado]}`}>{m.estado}</span></td>
                      <td>
                        <button className="btn btn-secondary btn-sm" onClick={() => { setSelectedId(m.id); setModal('detail'); }}>👁 Ver</button>{' '}
                        <button className="btn btn-secondary btn-sm" onClick={() => openEditM(m.id)}>✏</button>{' '}
                        <button className="btn btn-danger btn-sm" onClick={() => { setSelectedId(m.id); setModal('delM'); }}>🗑</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'ministerios' && (
        <div className="card">
           <div className="card-header">
             <div>
               <div className="card-title">⛪ MINISTERIOS Y ASIGNACIONES</div>
               <div className="card-sub">Gestiona tus ministerios y sus integrantes</div>
             </div>
             <div style={{ display: 'flex', gap: 8 }}>
               <button className="btn btn-secondary btn-sm" onClick={() => exportMinisteriosPDF({ ministerios, asignaciones, miembros })}>📄 Exportar PDF</button>
               <button className="btn btn-gold" onClick={openNewMin}>➕ Nuevo ministerio</button>
             </div>
           </div>
          {ministeriosConStats.length === 0 ? (
            <EmptyState icon="⛪" title="Sin ministerios" sub="Crea los ministerios de tu iglesia" />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
              {ministeriosConStats.map((mn) => (
                <div key={mn.id} className="card" style={{ borderLeft: `4px solid ${mn.color}`, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ fontSize: 24 }}>{mn.emoji}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 800 }}>{mn.nombre}</div>
                      <div style={{ fontSize: 11, color: 'var(--dim)' }}>{mn.lider ? `Ministro: ${mn.lider}` : 'Sin ministro definido'}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => openEditMin(mn.id)}>✏️</button>
                      <button className="btn btn-danger btn-sm" onClick={() => { setSelectedId(mn.id); setModal('delMin'); }}>🗑️</button>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--dim)', background: 'var(--surface-2)', padding: '6px 10px', borderRadius: 6 }}>{mn.descripcion || 'Sin descripción'}</div>
                  
                  <div style={{ marginTop: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <div style={{ fontWeight: 700, fontSize: 12 }}>Integrantes ({mn.miembros.length})</div>
                      <button className="btn btn-gold btn-sm" onClick={() => openNewAsig(undefined, mn.id)}>➕ Asignar</button>
                    </div>
                    {mn.miembros.length === 0 ? <div style={{ fontSize: 12, color: 'var(--dim)', fontStyle: 'italic' }}>Sin miembros asignados</div> : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {mn.miembros.map((m) => {
                          const asig = asignaciones.find(a => a.miembroId === m.id && a.ministerioId === mn.id);
                          return (
                            <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 8px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 4, fontSize: 12 }}>
                              <span><strong>{m.nombre} {m.apellido}</strong> <span style={{ color: 'var(--dim)' }}>({asig?.rol})</span></span>
                              <button type="button" className="btn btn-danger btn-sm" style={{ padding: '2px 6px' }} onClick={() => { if(asig) { setSelectedId(asig.id); setModal('delAsig'); } }}>🗑</button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'hitos' && (
        <div className="card">
           <div className="card-header">
             <div>
               <div className="card-title">CRECIMIENTO ESPIRITUAL</div>
               <div className="card-sub">Hitos y eventos en la vida de cada miembro</div>
             </div>
             <div style={{ display: 'flex', gap: 8 }}>
               <button className="btn btn-secondary btn-sm" onClick={() => exportHitosPDF({ hitos, miembros })}>📄 Exportar PDF</button>
               <button className="btn btn-gold" onClick={() => openNewH()}>➕ Nuevo hito</button>
             </div>
           </div>
          <div className="search-bar">
            <input className="search-input" placeholder="🔍 Buscar miembro, descripción..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          {hitosList.length === 0 ? (
            <EmptyState icon="📍" title="Sin hitos registrados" sub="Registra los momentos clave del crecimiento" />
          ) : (
            <div className="timeline">
              {hitosList.map((h) => {
                const m = miembros.find((x) => x.id === h.miembroId);
                return (
                  <div key={h.id} className="timeline-item">
                    <div className="timeline-date">{fmt(h.fecha)}</div>
                    <div className="timeline-dot" />
                    <div className="timeline-content">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span className={`badge ${HITO_BADGE[h.tipo]}`}>{h.tipo}</span>
                        {m && <strong>{m.nombre} {m.apellido}</strong>}
                      </div>
                      <div style={{ marginTop: 4, fontSize: 13 }}>{h.descripcion}</div>
                      <div style={{ marginTop: 6, display: 'flex', gap: 4 }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => openEditH(h.id)}>✏</button>
                        <button className="btn btn-danger btn-sm" onClick={() => { setSelectedId(h.id); setModal('delH'); }}>🗑</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <Modal open={modal === 'miembro'} onClose={() => { setModal(null); resetM(); }} title={editMId ? 'Editar miembro' : 'Nuevo miembro'} wide>
        {/* ─── SECCIÓN: PERSONAL ─── */}
        <div className="form-section">👤 Datos Personales</div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Nombre *</label><input className="form-input" value={mNombre} onChange={(e) => setMNombre(e.target.value)} placeholder="Juan" /></div>
          <div className="form-group"><label className="form-label">Apellido *</label><input className="form-input" value={mApellido} onChange={(e) => setMApellido(e.target.value)} placeholder="Pérez" /></div>
        </div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Fecha de nacimiento</label><input className="form-input" type="date" value={mNac} onChange={(e) => setMNac(e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Estado civil</label>
            <select className="form-select" value={mCivil} onChange={(e) => setMCivil(e.target.value)}>
              <option>Soltero</option><option>Casado</option><option>Viudo</option><option>Divorciado</option><option>Unión</option>
            </select>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Profesión</label><input className="form-input" value={mProfesion} onChange={(e) => setMProfesion(e.target.value)} placeholder="Ej: Maestro, Ingeniero…" /></div>
          <div className="form-group"><label className="form-label">Cónyuge</label><input className="form-input" value={mConyuge} onChange={(e) => setMConyuge(e.target.value)} placeholder="Si aplica" /></div>
        </div>
        <div className="form-group"><label className="form-label">Hijos</label><input className="form-input" value={mHijos} onChange={(e) => setMHijos(e.target.value)} placeholder="Ej: 2 hijos (Sofía 8, Mateo 5)" /></div>

        {/* ─── SECCIÓN: CONTACTO ─── */}
        <div className="form-section" style={{ marginTop: 16 }}>📞 Contacto</div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Teléfono</label><input className="form-input" value={mTel} onChange={(e) => setMTel(e.target.value)} placeholder="+54 11 5555 5555" /></div>
          <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" value={mEmail} onChange={(e) => setMEmail(e.target.value)} placeholder="email@ejemplo.com" /></div>
        </div>
        <div className="form-group"><label className="form-label">Dirección</label><input className="form-input" value={mDir} onChange={(e) => setMDir(e.target.value)} placeholder="Calle, número, ciudad" /></div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Zona / Sector</label><ZonaSelect value={mZona} onChange={setMZona} emptyLabel="Sin zona" /></div>
          <div className="form-group"><label className="form-label">Contacto preferido</label>
            <select className="form-select" value={mContacto} onChange={(e) => setMContacto(e.target.value)}>
              <option>Teléfono</option><option>WhatsApp</option><option>Email</option><option>Visita</option><option>Otro</option>
            </select>
          </div>
        </div>

        {/* ─── SECCIÓN: IGLESIA ─── */}
        <div className="form-section" style={{ marginTop: 16 }}>⛪ Membresía</div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Fecha de ingreso</label><input className="form-input" type="date" value={mIngreso} onChange={(e) => setMIngreso(e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Estado</label>
            <select className="form-select" value={mEstado} onChange={(e) => setMEstado(e.target.value)}>
              <option>Activo</option><option>Inactivo</option><option>Trasladado</option><option>Disciplinado</option>
            </select>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Grupo de Misión</label>
            <select className="form-select" value={mGrupo} onChange={(e) => setMGrupo(e.target.value)}>
              <option value="">— Sin grupo asignado —</option>
              {grupos.map((g) => <option key={g.id} value={g.id}>{g.nombre}</option>)}
            </select>
          </div>
          <div className="form-group"><label className="form-label">Hermano Mayor (Líder/Mentor)</label>
            <select className="form-select" value={mHermanoMayorId} onChange={(e) => setMHermanoMayorId(e.target.value)}>
              <option value="">— Sin hermano mayor asignado —</option>
              {miembros.filter(m => m.estado === 'Activo' && m.id !== editMId).sort((a, b) => `${a.apellido} ${a.nombre}`.localeCompare(`${b.apellido} ${b.nombre}`)).map((m) => (
                <option key={m.id} value={m.id}>{m.nombre} {m.apellido}</option>
              ))}
            </select>
          </div>
        </div>

        {/* ─── SECCIÓN: CRECIMIENTO ─── */}
        <div className="form-section" style={{ marginTop: 16 }}>📈 Crecimiento Espiritual</div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">¿Bautizado?</label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 8, background: 'var(--surface-2)', borderRadius: 6, cursor: 'pointer' }}>
              <input type="checkbox" checked={mBautizado} onChange={(e) => setMBautizado(e.target.checked)} style={{ width: 18, height: 18 }} />
              <span style={{ fontWeight: 600 }}>{mBautizado ? '💧 Sí, bautizado' : 'No bautizado'}</span>
            </label>
          </div>
          <div className="form-group"><label className="form-label">Fecha de bautismo</label>
            <input className="form-input" type="date" value={mBautismo} onChange={(e) => setMBautismo(e.target.value)} disabled={!mBautizado} />
          </div>
        </div>

        {/* ─── SECCIÓN: NOTAS ─── */}
        <div className="form-section" style={{ marginTop: 16 }}>📝 Notas Pastorales</div>
        <div className="form-group"><textarea className="form-textarea" rows={3} value={mNotas} onChange={(e) => setMNotas(e.target.value)} placeholder="Observaciones pastorales, necesidades, seguimiento…" /></div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => { setModal(null); resetM(); }}>Cancelar</button>
          <button className="btn btn-gold" onClick={saveM}>{editMId ? 'Guardar cambios' : 'Registrar miembro'}</button>
        </div>
      </Modal>
      
      <Modal open={modal === 'ministerio'} onClose={() => { setModal(null); resetMin(); }} title={editMinId ? 'Editar ministerio' : 'Nuevo ministerio'}>
        <div className="form-group" style={{ marginBottom: 10 }}><label className="form-label">Nombre *</label><input className="form-input" value={minNombre} onChange={(e) => setMinNombre(e.target.value)} placeholder="Ej: Alabanza, Niños, Jóvenes" /></div>
        <div className="form-group" style={{ marginBottom: 10 }}><label className="form-label">Descripción</label><textarea className="form-textarea" rows={2} value={minDesc} onChange={(e) => setMinDesc(e.target.value)} /></div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Ministro / Encargado *</label>
            {minLiderCustom ? (
              <div style={{ display: 'flex', gap: 6 }}>
                <input className="form-input" value={minLider} onChange={(e) => setMinLider(e.target.value)} placeholder="Escribe el nombre completo" autoFocus />
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setMinLiderCustom(false); setMinLider(''); }}>📋 Lista</button>
              </div>
            ) : (
              <select className="form-select" value={minLider} onChange={(e) => { if (e.target.value === '__custom__') { setMinLiderCustom(true); setMinLider(''); } else { setMinLider(e.target.value); } }}>
                <option value="">— Seleccionar de la lista —</option>
                {miembros.filter(m => m.estado === 'Activo').sort((a, b) => `${a.apellido} ${a.nombre}`.localeCompare(`${b.apellido} ${b.nombre}`)).map((m) => (
                  <option key={m.id} value={`${m.nombre} ${m.apellido}`}>{m.nombre} {m.apellido}</option>
                ))}
                <option value="__custom__">— Otro (escribir manualmente) —</option>
              </select>
            )}
          </div>
          <div className="form-group"><label className="form-label">Emoji</label>
            <input className="form-input" value={minEmoji} onChange={(e) => setMinEmoji(e.target.value)} placeholder="⛪" />
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
              {['⛪', '📖', '🎤', '👶', '🧑', '🌍', '🤲', '📸', '🙏', '📢', '👋', '🏋️', '📚'].map(e => (
                <button type="button" key={e} onClick={() => setMinEmoji(e)} style={{ border: '1px solid var(--border)', background: minEmoji === e ? 'var(--gold-glow)' : 'transparent', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer', fontSize: '18px' }}>
                  {e}
                </button>
              ))}
            </div>
          </div>
          <div className="form-group form-full">
            <label className="form-label">Color identificador</label>
            <input type="color" value={minColor} onChange={(e) => setMinColor(e.target.value)} style={{ width: '100%', height: '36px', border: 'none', borderRadius: 6, cursor: 'pointer' }} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => { setModal(null); resetMin(); }}>Cancelar</button>
          <button className="btn btn-gold" onClick={saveMin}>{editMinId ? 'Guardar cambios' : 'Crear ministerio'}</button>
        </div>
      </Modal>

      <Modal open={modal === 'asignar'} onClose={() => { setModal(null); resetAsig(); }} title={editAId ? 'Editar asignación' : 'Asignar miembro a ministerio'} wide>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Miembro *</label>
            <select className="form-select" value={asigMiembro} onChange={(e) => setAsigMiembro(e.target.value)}>
              <option value="">— Selecciona miembro —</option>
              {miembros.filter((m) => m.estado === 'Activo').sort((a, b) => `${a.apellido} ${a.nombre}`.localeCompare(`${b.apellido} ${b.nombre}`)).map((m) => (
                <option key={m.id} value={m.id}>{m.nombre} {m.apellido}</option>
              ))}
            </select>
          </div>
          <div className="form-group"><label className="form-label">Ministerio *</label>
            <select className="form-select" value={asigMinisterio} onChange={(e) => setAsigMinisterio(e.target.value)}>
              <option value="">— Selecciona ministerio —</option>
              {ministerios.map((mn) => <option key={mn.id} value={mn.id}>{mn.emoji} {mn.nombre}</option>)}
            </select>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Rol</label>
            <select className="form-select" value={asigRol} onChange={(e) => setAsigRol(e.target.value)}>
              <option>Miembro</option><option>Servidor</option><option>Coordinador</option><option>Líder</option>
            </select>
          </div>
          <div className="form-group"><label className="form-label">Desde</label><input className="form-input" type="date" value={asigDesde} onChange={(e) => setAsigDesde(e.target.value)} /></div>
        </div>
        <div className="form-group" style={{ marginTop: 10 }}><label className="form-label">Notas</label><textarea className="form-textarea" rows={2} value={asigNotas} onChange={(e) => setAsigNotas(e.target.value)} /></div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => { setModal(null); resetAsig(); }}>Cancelar</button>
          <button className="btn btn-gold" onClick={saveAsig}>{editAId ? 'Guardar cambios' : 'Asignar'}</button>
        </div>
      </Modal>

      <Modal open={modal === 'hito'} onClose={() => { setModal(null); resetH(); }} title={editHId ? 'Editar hito' : 'Registrar hito de crecimiento'} wide>
        <div className="form-group" style={{ marginBottom: 10 }}><label className="form-label">Miembro *</label>
          <select className="form-select" value={hMiembro} onChange={(e) => setHMiembro(e.target.value)}>
            <option value="">— Selecciona miembro —</option>
            {miembros.sort((a, b) => `${a.apellido} ${a.nombre}`.localeCompare(`${b.apellido} ${b.nombre}`)).map((m) => (
              <option key={m.id} value={m.id}>{m.nombre} {m.apellido}</option>
            ))}
          </select>
        </div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Fecha</label><input className="form-input" type="date" value={hFecha} onChange={(e) => setHFecha(e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Tipo de hito</label>
            <select className="form-select" value={hTipo} onChange={(e) => setHTipo(e.target.value)}>
              <option>Conversión</option><option>Bautismo</option><option>Discipulado</option>
              <option>Curso Completado</option><option>Integración</option><option>Liderazgo</option>
              <option>Matrimonio</option><option>Otro</option>
            </select>
          </div>
        </div>
        <div className="form-group" style={{ marginTop: 10 }}><label className="form-label">Descripción *</label><textarea className="form-textarea" rows={3} value={hDesc} onChange={(e) => setHDesc(e.target.value)} placeholder="Detalles del momento, curso completado, etc." /></div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => { setModal(null); resetH(); }}>Cancelar</button>
          <button className="btn btn-gold" onClick={saveH}>{editHId ? 'Guardar cambios' : 'Registrar hito'}</button>
        </div>
      </Modal>
      
      <Modal open={modal === 'detail' && !!selMiembro} onClose={() => setModal(null)} title="Perfil del miembro" wide>
        {selMiembro && (() => {
          const asigs = asignacionesPorMiembro[selMiembro.id] || [];
          const histo = hitosPorMiembro[selMiembro.id] || [];
          const grupoAsignado = selMiembro.grupoId ? grupos.find((g) => g.id === selMiembro.grupoId) : null;
          const telLimpio = (selMiembro.telefono || '').replace(/\D/g, '');
          const iniciales = `${selMiembro.nombre[0] || ''}${selMiembro.apellido[0] || ''}`.toUpperCase();
          const edad = calcAge(selMiembro.fechaNacimiento);
          const diasIglesia = diasEnIglesia(selMiembro.fechaIngreso);
          const aniosIglesia = aniosEnIglesia(selMiembro.fechaIngreso);
          const dCumple = diasHastaCumple(selMiembro.fechaNacimiento);
          const ultimoHito = histo.length > 0 ? histo[0] : null;
          const diasUltimoHito = ultimoHito ? Math.max(0, Math.floor((Date.now() - new Date(ultimoHito.fecha).getTime()) / 86400000)) : null;
          const sinHitoReciente = diasUltimoHito !== null && diasUltimoHito > 180;
          return (<>
            {/* HERO */}
            <div style={{ display: 'flex', gap: 16, alignItems: 'center', padding: '4px 0 18px', borderBottom: '1px solid var(--border)', marginBottom: 18 }}>
              <div className="avatar-lg" style={{ background: 'linear-gradient(135deg, var(--oro-apostolico), var(--oro-sombra))', color: 'var(--carbon)' }}>{iniciales || '👤'}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-display)' }}>{selMiembro.nombre} {selMiembro.apellido}</h2>
                  <span className={`badge ${EST_BADGE[selMiembro.estado]}`}>{selMiembro.estado}</span>
                  <span className={`badge ${CIVIL_BADGE[selMiembro.estadoCivil]}`}>{selMiembro.estadoCivil}</span>
                  {selMiembro.bautizado && <span className="badge badge-purple">💧 Bautizado</span>}
                </div>
                <div style={{ fontSize: 12, color: 'var(--dim)', marginTop: 6 }}>
                  {edad !== null ? `🎂 ${edad} años` : '🎂 Sin edad'} · 📍 {selMiembro.zona || 'Sin zona'} · ⛪ {aniosIglesia === 0 ? 'menos de 1 año' : `${aniosIglesia} ${aniosIglesia === 1 ? 'año' : 'años'} en la iglesia`}
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                  {dCumple !== null && dCumple === 0 && <span className="badge badge-green" style={{ fontSize: 11 }}>🎂 ¡Cumple hoy!</span>}
                  {dCumple !== null && dCumple > 0 && dCumple <= 7 && <span className="badge badge-yellow" style={{ fontSize: 11 }}>🎂 Cumple en {dCumple} {dCumple === 1 ? 'día' : 'días'}</span>}
                  {dCumple !== null && dCumple > 7 && dCumple <= 30 && <span className="badge badge-blue" style={{ fontSize: 11 }}>🎂 Cumple este mes ({dCumple} días)</span>}
                  {aniosIglesia > 0 && [1, 5, 10, 15, 20, 25, 30, 40, 50].includes(aniosIglesia) && <span className="badge badge-yellow" style={{ fontSize: 11 }}>💒 ¡{aniosIglesia} años de aniversario!</span>}
                  {aniosIglesia > 0 && ![1, 5, 10, 15, 20, 25, 30, 40, 50].includes(aniosIglesia) && <span className="badge badge-blue" style={{ fontSize: 11 }}>💒 {aniosIglesia} años</span>}
                  {sinHitoReciente && <span className="badge badge-red" style={{ fontSize: 11 }}>⚠️ Sin hitos hace {diasUltimoHito} días</span>}
                </div>
              </div>
            </div>

            {/* QUICK CONTACT */}
            {(telLimpio || selMiembro.email || selMiembro.direccion) && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
                {telLimpio && <a href={`tel:+${telLimpio}`} className="btn btn-secondary btn-sm" style={{ textDecoration: 'none' }}>📞 Llamar</a>}
                {telLimpio && <a href={`https://wa.me/${telLimpio}`} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm" style={{ textDecoration: 'none', color: 'var(--green)', borderColor: 'var(--green)' }}>💬 WhatsApp</a>}
                {selMiembro.email && <a href={`mailto:${selMiembro.email}`} className="btn btn-secondary btn-sm" style={{ textDecoration: 'none', color: 'var(--purple)', borderColor: 'var(--purple)' }}>✉ Email</a>}
                {selMiembro.direccion && <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selMiembro.direccion + ' ' + (selMiembro.zona || ''))}`} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm" style={{ textDecoration: 'none', color: 'var(--blue)', borderColor: 'var(--blue)' }}>🗺️ Ver en mapa</a>}
                {selMiembro.contactoPreferido && <span style={{ padding: '4px 10px', fontSize: 11, color: 'var(--dim)', alignSelf: 'center' }}>Prefiere: <strong>{selMiembro.contactoPreferido}</strong></span>}
              </div>
            )}

            {/* STATS */}
            <div className="kpis" style={{ marginBottom: 20 }}>
              <div className="kpi" style={{ ['--accent' as any]: 'var(--gold)' }}>
                <div className="kpi-label">⛪ Días en la iglesia</div>
                <div className="kpi-value" style={{ fontSize: 24 }}>{diasIglesia}</div>
                <div className="kpi-sub">{aniosIglesia === 0 ? 'menos de 1 año' : `${aniosIglesia} ${aniosIglesia === 1 ? 'año' : 'años'}`} · desde {fmt(selMiembro.fechaIngreso)}</div>
              </div>
              <div className="kpi" style={{ ['--accent' as any]: 'var(--blue)' }}>
                <div className="kpi-label">⛪ Ministerios</div>
                <div className="kpi-value" style={{ fontSize: 24 }}>{asigs.length}</div>
                <div className="kpi-sub">{asigs.filter((a) => a.rol === 'Líder' || a.rol === 'Coordinador').length} liderazgo · {asigs.filter((a) => a.rol === 'Servidor' || a.rol === 'Miembro').length} servicio</div>
              </div>
              <div className="kpi" style={{ ['--accent' as any]: 'var(--green)' }}>
                <div className="kpi-label">📍 Hitos</div>
                <div className="kpi-value" style={{ fontSize: 24 }}>{histo.length}</div>
                <div className="kpi-sub">{histo.filter((h) => h.tipo === 'Bautismo').length} bautismo · {histo.filter((h) => h.tipo === 'Discipulado').length} discipulado</div>
              </div>
              <div className="kpi" style={{ ['--accent' as any]: sinHitoReciente ? 'var(--red)' : 'var(--purple)' }}>
                <div className="kpi-label">🕒 Último hito</div>
                <div className="kpi-value" style={{ fontSize: 24 }}>{diasUltimoHito === null ? '—' : diasUltimoHito === 0 ? 'Hoy' : diasUltimoHito}</div>
                <div className="kpi-sub">{ultimoHito ? `${ultimoHito.tipo} · ${fmt(ultimoHito.fecha)}` : 'sin hitos registrados'}</div>
              </div>
            </div>

            {/* LINKED CARDS */}
            {grupoAsignado && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderRadius: 8, background: 'var(--surface-2)', border: '1px solid var(--gold)', marginBottom: 10 }}>
                <div style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--gold-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>👥</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 10, color: 'var(--dim)', letterSpacing: 1.2, textTransform: 'uppercase', fontWeight: 600, marginBottom: 2 }}>Grupo de misión</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--oro-sombra)' }}>{grupoAsignado.nombre}</div>
                  <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 2 }}>📍 {grupoAsignado.zona} · 🗓️ {grupoAsignado.dia} {grupoAsignado.hora} · 📌 {grupoAsignado.lugar || 'Sin lugar'} · 👤 {grupoAsignado.lider || 'Sin mentor'}</div>
                </div>
              </div>
            )}
            {/* INFO GRID */}
            <div className="form-section">Datos Personales</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0 18px' }}>
              <div className="detail-row"><span className="detail-label">📅 Nacimiento</span><span className="detail-value">{selMiembro.fechaNacimiento ? fmt(selMiembro.fechaNacimiento) : '—'}</span></div>
              <div className="detail-row"><span className="detail-label">🎂 Edad</span><span className="detail-value">{edad !== null ? `${edad} años` : '—'}</span></div>
              <div className="detail-row"><span className="detail-label">💼 Profesión</span><span className="detail-value">{selMiembro.profesion || '—'}</span></div>
              <div className="detail-row"><span className="detail-label">💒 Estado civil</span><span className="detail-value">{selMiembro.estadoCivil || '—'}</span></div>
              <div className="detail-row"><span className="detail-label">💍 Cónyuge</span><span className="detail-value">{selMiembro.conyuge || '—'}</span></div>
              <div className="detail-row"><span className="detail-label">👶 Hijos</span><span className="detail-value">{selMiembro.hijos || '—'}</span></div>
              <div className="detail-row"><span className="detail-label">💧 Bautizado</span><span className="detail-value">{selMiembro.bautizado ? (selMiembro.fechaBautismo ? `Sí · ${fmt(selMiembro.fechaBautismo)}` : 'Sí') : 'No'}</span></div>
            </div>

            <div className="form-section" style={{ marginTop: 16 }}>Contacto</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0 18px' }}>
              <div className="detail-row"><span className="detail-label">📞 Teléfono</span><span className="detail-value">{selMiembro.telefono || <span style={{ color: 'var(--dim)' }}>No registrado</span>}</span></div>
              <div className="detail-row"><span className="detail-label">✉ Email</span><span className="detail-value" style={{ fontSize: 12, wordBreak: 'break-all' }}>{selMiembro.email || '—'}</span></div>
              <div className="detail-row" style={{ gridColumn: '1 / -1' }}><span className="detail-label">🏡 Dirección</span><span className="detail-value" style={{ fontSize: 12 }}>{selMiembro.direccion || '—'}</span></div>
              <div className="detail-row"><span className="detail-label">📍 Zona</span><span className="detail-value">{selMiembro.zona || '—'}</span></div>
            </div>

            {selMiembro.notas && (
              <>
                <div className="form-section" style={{ marginTop: 16 }}>Notas Pastorales</div>
                <div style={{ padding: 12, background: 'var(--surface-2)', borderRadius: 8, fontSize: 13, whiteSpace: 'pre-wrap', borderLeft: '3px solid var(--oro-apostolico)' }}>{selMiembro.notas}</div>
              </>
            )}

            {/* MINISTERIOS con edición inline */}
            <div className="form-section" style={{ marginTop: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>⛪ Ministerios ({asigs.length})</span>
              <button className="btn btn-gold btn-sm" onClick={() => { setModal(null); openNewAsig(selMiembro.id); }}>➕ Asignar</button>
            </div>
            {asigs.length === 0 ? (
              <div style={{ color: 'var(--dim)', fontSize: 13, padding: 12, textAlign: 'center', background: 'var(--surface-2)', borderRadius: 8 }}>Sin ministerios asignados</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {asigs.map((a) => {
                  const mn = ministerios.find((x) => x.id === a.ministerioId);
                  if (!mn) return null;
                  return (
                    <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, background: 'var(--surface-2)', borderRadius: 8, borderLeft: `3px solid ${mn.color}` }}>
                      <span style={{ fontSize: 22 }}>{mn.emoji}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{mn.nombre}</div>
                        <div style={{ fontSize: 11, color: 'var(--dim)' }}>Desde {fmt(a.desde)} {mn.lider ? `· Ministro: ${mn.lider}` : ''}</div>
                      </div>
                      <select className="form-select" style={{ width: 'auto', minWidth: 120, fontSize: 12, padding: '4px 8px' }} value={a.rol} onChange={(e) => updateAsigRol(a.id, e.target.value)}>
                        {ROLES.map((r) => <option key={r}>{r}</option>)}
                      </select>
                      <button type="button" className="btn btn-danger btn-sm" onClick={() => quickRemoveAsig(a.id, mn.nombre)}>🗑</button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* HITOS con timeline + quick add */}
            <div className="form-section" style={{ marginTop: 18 }}>📍 Hitos de Crecimiento ({histo.length})</div>

            {/* QUICK ADD HITO */}
            <div style={{ display: 'grid', gridTemplateColumns: '140px 140px 1fr auto', gap: 6, marginBottom: 12, padding: 10, background: 'var(--gold-glow)', borderRadius: 8, border: '1px solid var(--gold)' }}>
              <select className="form-select" value={qhTipo} onChange={(e) => setQhTipo(e.target.value)} style={{ fontSize: 12 }}>
                {HITO_TIPOS.map((t) => <option key={t}>{t}</option>)}
              </select>
              <input type="date" className="form-input" value={qhFecha} onChange={(e) => setQhFecha(e.target.value)} style={{ fontSize: 12 }} />
              <input className="form-input" placeholder="Descripción del hito…" value={qhDesc} onChange={(e) => setQhDesc(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && quickAddHito()} style={{ fontSize: 12 }} />
              <button className="btn btn-gold btn-sm" onClick={quickAddHito} disabled={!qhDesc.trim()}>➕ Agregar</button>
            </div>

            {histo.length === 0 ? (
              <div style={{ color: 'var(--dim)', fontSize: 13, padding: 12, textAlign: 'center', background: 'var(--surface-2)', borderRadius: 8 }}>Sin hitos registrados · usa el formulario arriba para agregar el primero</div>
            ) : (
              <div className="timeline" style={{ marginLeft: 0 }}>
                {histo.map((h) => (
                  <div key={h.id} className="timeline-item">
                    <div className="timeline-date">{fmt(h.fecha)}</div>
                    <div className="timeline-dot" />
                    <div className="timeline-content">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span className={`badge ${HITO_BADGE[h.tipo]}`}>{h.tipo}</span>
                        <button className="btn btn-secondary btn-sm" style={{ padding: '2px 6px', fontSize: 10 }} onClick={() => openEditH(h.id)}>✏</button>
                        <button className="btn btn-danger btn-sm" style={{ padding: '2px 6px', fontSize: 10 }} onClick={() => { setSelectedId(h.id); setModal('delH'); }}>🗑</button>
                      </div>
                      <div style={{ marginTop: 4, fontSize: 13, whiteSpace: 'pre-wrap' }}>{h.descripcion}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="modal-footer" style={{ marginTop: 20 }}>
              <button className="btn btn-secondary" onClick={() => { setModal(null); openEditM(selMiembro.id); }}>✏ Editar perfil</button>
              <button className="btn btn-danger" onClick={() => setModal('delM')}>🗑 Eliminar</button>
            </div>
          </>);
        })()}
      </Modal>

      <Modal open={modal === 'detail' && !!selMinisterio && !selMiembro} onClose={() => setModal(null)} title="Detalle del ministerio" wide>
        {selMinisterio && (() => {
          const asigs = asignaciones.filter((a) => a.ministerioId === selMinisterio.id);
          return (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <div style={{ fontSize: 40 }}>{selMinisterio.emoji}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{selMinisterio.nombre}</div>
                  <div style={{ fontSize: 12, color: 'var(--dim)' }}>Ministro: {selMinisterio.lider || '—'}</div>
                </div>
                <div style={{ width: 24, height: 24, background: selMinisterio.color, borderRadius: 4 }} />
              </div>
              {selMinisterio.descripcion && (
                <div style={{ padding: 10, background: 'var(--bg)', borderRadius: 6, fontSize: 13, marginBottom: 12 }}>{selMinisterio.descripcion}</div>
              )}
              <h4 style={{ marginBottom: 8 }}>Miembros sirviendo ({asigs.length})</h4>
              {asigs.length === 0 ? <div style={{ color: 'var(--dim)', fontSize: 13 }}>Aún no hay miembros asignados</div> : (
                <table className="data-table">
                  <thead><tr><th>Miembro</th><th>Rol</th><th>Desde</th><th>Notas</th></tr></thead>
                  <tbody>
                    {asigs.map((a) => {
                      const m = miembros.find((x) => x.id === a.miembroId);
                      if (!m) return null;
                      return (
                        <tr key={a.id}>
                          <td><strong>{m.nombre} {m.apellido}</strong></td>
                          <td><span className={`badge ${ROL_BADGE[a.rol]}`}>{a.rol}</span></td>
                          <td style={{ fontSize: 12 }}>{fmt(a.desde)}</td>
                          <td style={{ fontSize: 12 }}>{a.notas || '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => { setModal(null); openEditMin(selMinisterio.id); }}>✏ Editar</button>
                <button className="btn btn-gold" onClick={() => { setModal(null); openNewAsig(undefined, selMinisterio.id); }}>➕ Asignar miembro</button>
                <button className="btn btn-danger" onClick={() => setModal('delMin')}>🗑 Eliminar</button>
              </div>
            </>
          );
        })()}
      </Modal>

      <Modal open={modal === 'delM'} onClose={() => setModal(null)} title="Eliminar miembro">
        <p>¿Eliminar a <strong>{selMiembro?.nombre} {selMiembro?.apellido}</strong> y todas sus asignaciones e hitos?</p>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
          <button className="btn btn-danger" onClick={delM}>Eliminar todo</button>
        </div>
      </Modal>

      <Modal open={modal === 'delMin'} onClose={() => setModal(null)} title="Eliminar ministerio">
        <p>¿Eliminar el ministerio <strong>{selMinisterio?.nombre}</strong> y todas sus asignaciones?</p>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
          <button className="btn btn-danger" onClick={delMin}>Eliminar</button>
        </div>
      </Modal>

      <Modal open={modal === 'delAsig'} onClose={() => setModal(null)} title="Eliminar asignación">
        <p>¿Quitar a <strong>{selAsigMiembro?.nombre} {selAsigMiembro?.apellido}</strong> del ministerio <strong>{selAsigMinisterio?.nombre}</strong>?</p>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
          <button className="btn btn-danger" onClick={delAsig}>Quitar</button>
        </div>
      </Modal>

      <Modal open={modal === 'delH'} onClose={() => setModal(null)} title="Eliminar hito">
        <p>¿Eliminar este hito de <strong>{selHitoMiembro?.nombre} {selHitoMiembro?.apellido}</strong>?</p>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
          <button className="btn btn-danger" onClick={delH}>Eliminar</button>
        </div>
      </Modal>

      {toast && <div className="toast-container"><div className="toast success">{toast}</div></div>}
    </Layout>
  );
}
