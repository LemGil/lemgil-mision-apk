import { useState, useMemo } from 'react';
import { v4 as uuid } from 'uuid';
import { useLiveQuery } from 'dexie-react-hooks';
import { Layout } from '../components/Layout';
import { db } from '../lib/database';
import { createBaseRecord } from '../lib/utils/recordHelpers';
import type { Hito, Miembro, MiembroMinisterio } from '../lib/types';
import { today } from '../lib/utils';
import { showToast } from '../lib/notification';
import { diasHastaCumple } from './miembros/constants';
import type { ModalType, Tab } from './miembros/constants';
import { CumpleanosCard } from './miembros/CumpleanosCard';
import { DirectorioTab } from './miembros/DirectorioTab';
import { MinisteriosTab } from './miembros/MinisteriosTab';
import { HitosTab } from './miembros/HitosTab';
import { MiembroFormModal } from './miembros/MiembroFormModal';
import { MinisterioFormModal } from './miembros/MinisterioFormModal';
import { AsignarFormModal } from './miembros/AsignarFormModal';
import { HitoFormModal } from './miembros/HitoFormModal';
import { MiembroDetailModal } from './miembros/MiembroDetailModal';
import { MinisterioDetailModal } from './miembros/MinisterioDetailModal';
import { DeleteModals } from './miembros/DeleteModals';

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
  const [filterGrupo, setFilterGrupo] = useState('');
  const [filterEstadoCivil, setFilterEstadoCivil] = useState('');
  const [modal, setModal] = useState<null | ModalType>(null);
  const [editMId, setEditMId] = useState<string | null>(null);
  const [editMinId, setEditMinId] = useState<string | null>(null);
  const [editAId, setEditAId] = useState<string | null>(null);
  const [editHId, setEditHId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

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
    const statusCounts = miembros.reduce((acc, m) => {
      acc[m.estado] = (acc[m.estado] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const ministeriosCount = ministerios.length;
    const cumplesProx = miembros.filter(m => { const d = diasHastaCumple(m.fechaNacimiento); return d !== null && d <= 30; }).length;
    return { statusCounts, ministeriosCount, cumplesProx };
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
        return (!s || full.includes(s)) 
          && (!filterEstado || m.estado === filterEstado) 
          && (!filterZona || m.zona === filterZona) 
          && (!filterContacto || m.contactoPreferido === filterContacto)
          && (!filterGrupo || m.grupoId === filterGrupo)
          && (!filterEstadoCivil || m.estadoCivil === filterEstadoCivil);
      })
      .sort((a, b) => `${a.apellido} ${a.nombre}`.localeCompare(`${b.apellido} ${b.nombre}`));
  }, [miembros, asignaciones, ministerios, search, filterEstado, filterZona, filterContacto, filterGrupo, filterEstadoCivil]);

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
      await db.miembros.add(createBaseRecord({ id: uuid(), ...data, actualizado: new Date().toISOString() }));
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
      await db.ministerios.add(createBaseRecord({ id: uuid(), ...data }));
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
      await db.miembrosMinisterios.add(createBaseRecord({ id: uuid(), ...data }));
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
    await db.hitos.add(createBaseRecord({
      id: uuid(), miembroId: selMiembro.id, fecha: qhFecha,
      tipo: qhTipo as Hito['tipo'], descripcion: qhDesc.trim()
    }));
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
      await db.hitos.add(createBaseRecord({ id: uuid(), ...data }));
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
        <div className="summary-item"><span className="summary-icon">🧑</span><span className="summary-value">{kpis.statusCounts['Activo'] || 0}</span><span className="summary-label">Miembros activos</span></div>
        {kpis.statusCounts['Inactivo'] > 0 && <div className="summary-item"><span className="summary-icon">💤</span><span className="summary-value">{kpis.statusCounts['Inactivo']}</span><span className="summary-label">Inactivos</span></div>}
        {kpis.statusCounts['Trasladado'] > 0 && <div className="summary-item"><span className="summary-icon">🚚</span><span className="summary-value">{kpis.statusCounts['Trasladado']}</span><span className="summary-label">Trasladados</span></div>}
        {kpis.statusCounts['Disciplinado'] > 0 && <div className="summary-item"><span className="summary-icon">⚠️</span><span className="summary-value">{kpis.statusCounts['Disciplinado']}</span><span className="summary-label">Disciplinados</span></div>}
        {kpis.statusCounts['Fallecido'] > 0 && <div className="summary-item"><span className="summary-icon">✝️</span><span className="summary-value">{kpis.statusCounts['Fallecido']}</span><span className="summary-label">Fallecidos</span></div>}
        <div className="summary-item"><span className="summary-icon">⛪</span><span className="summary-value">{kpis.ministeriosCount}</span><span className="summary-label">Ministerios</span></div>
        <div className="summary-item"><span className="summary-icon">📍</span><span className="summary-value">{hitos.filter((h) => h.fecha.startsWith(new Date().toISOString().slice(0, 7))).length}</span><span className="summary-label">Hitos este mes</span></div>
        <div className="summary-item"><span className="summary-icon">🎂</span><span className="summary-value">{kpis.cumplesProx}</span><span className="summary-label">Próximos cumpleaños</span></div>
      </div>

      {miembros.length > 0 && (
        <CumpleanosCard proximosCumples={proximosCumples} />
      )}

      <div className="tabs">
        <button className={`tab ${tab === 'directorio' ? 'active' : ''}`} onClick={() => setTab('directorio')}>📖 Directorio · {miembros.length}</button>
        <button className={`tab ${tab === 'ministerios' ? 'active' : ''}`} onClick={() => setTab('ministerios')}>⛪ Ministerios · {ministerios.length}</button>
        <button className={`tab ${tab === 'hitos' ? 'active' : ''}`} onClick={() => setTab('hitos')}>📍 Hitos · {hitos.length}</button>
      </div>

      {tab === 'directorio' && (
        <DirectorioTab
          miembrosFiltrados={miembrosFiltrados}
          asignacionesPorMiembro={asignacionesPorMiembro}
          ministerios={ministerios}
          grupos={grupos}
          zonas={zonas}
          search={search} setSearch={setSearch}
          filterEstado={filterEstado} setFilterEstado={setFilterEstado}
          filterZona={filterZona} setFilterZona={setFilterZona}
          filterGrupo={filterGrupo} setFilterGrupo={setFilterGrupo}
          filterEstadoCivil={filterEstadoCivil} setFilterEstadoCivil={setFilterEstadoCivil}
          filterContacto={filterContacto} setFilterContacto={setFilterContacto}
          openNewM={openNewM}
          openEditM={openEditM}
          onVer={(id) => { setSelectedId(id); setModal('detail'); }}
          onEliminar={(id) => { setSelectedId(id); setModal('delM'); }}
        />
      )}

      {tab === 'ministerios' && (
        <MinisteriosTab
          ministerios={ministerios}
          asignaciones={asignaciones}
          miembros={miembros}
          ministeriosConStats={ministeriosConStats}
          openNewMin={openNewMin}
          openEditMin={openEditMin}
          openNewAsig={openNewAsig}
          onEliminarMin={(id) => { setSelectedId(id); setModal('delMin'); }}
          onQuitarAsig={(id) => { setSelectedId(id); setModal('delAsig'); }}
        />
      )}

      {tab === 'hitos' && (
        <HitosTab
          hitos={hitos}
          hitosList={hitosList}
          miembros={miembros}
          search={search} setSearch={setSearch}
          openNewH={openNewH}
          openEditH={openEditH}
          onEliminarH={(id) => { setSelectedId(id); setModal('delH'); }}
        />
      )}

      <MiembroFormModal
        open={modal === 'miembro'}
        onClose={() => { setModal(null); resetM(); }}
        editMId={editMId}
        saveM={saveM}
        grupos={grupos}
        miembros={miembros}
        mNombre={mNombre} setMNombre={setMNombre}
        mApellido={mApellido} setMApellido={setMApellido}
        mTel={mTel} setMTel={setMTel}
        mEmail={mEmail} setMEmail={setMEmail}
        mDir={mDir} setMDir={setMDir}
        mZona={mZona} setMZona={setMZona}
        mGrupo={mGrupo} setMGrupo={setMGrupo}
        mNac={mNac} setMNac={setMNac}
        mIngreso={mIngreso} setMIngreso={setMIngreso}
        mEstado={mEstado} setMEstado={setMEstado}
        mContacto={mContacto} setMContacto={setMContacto}
        mProfesion={mProfesion} setMProfesion={setMProfesion}
        mCivil={mCivil} setMCivil={setMCivil}
        mBautizado={mBautizado} setMBautizado={setMBautizado}
        mBautismo={mBautismo} setMBautismo={setMBautismo}
        mConyuge={mConyuge} setMConyuge={setMConyuge}
        mHijos={mHijos} setMHijos={setMHijos}
        mHermanoMayorId={mHermanoMayorId} setMHermanoMayorId={setMHermanoMayorId}
        mNotas={mNotas} setMNotas={setMNotas}
      />

      <MinisterioFormModal
        open={modal === 'ministerio'}
        onClose={() => { setModal(null); resetMin(); }}
        editMinId={editMinId}
        saveMin={saveMin}
        miembros={miembros}
        minNombre={minNombre} setMinNombre={setMinNombre}
        minDesc={minDesc} setMinDesc={setMinDesc}
        minLider={minLider} setMinLider={setMinLider}
        minLiderCustom={minLiderCustom} setMinLiderCustom={setMinLiderCustom}
        minColor={minColor} setMinColor={setMinColor}
        minEmoji={minEmoji} setMinEmoji={setMinEmoji}
      />

      <AsignarFormModal
        open={modal === 'asignar'}
        onClose={() => { setModal(null); resetAsig(); }}
        editAId={editAId}
        saveAsig={saveAsig}
        miembros={miembros}
        ministerios={ministerios}
        asigMiembro={asigMiembro} setAsigMiembro={setAsigMiembro}
        asigMinisterio={asigMinisterio} setAsigMinisterio={setAsigMinisterio}
        asigRol={asigRol} setAsigRol={setAsigRol}
        asigDesde={asigDesde} setAsigDesde={setAsigDesde}
        asigNotas={asigNotas} setAsigNotas={setAsigNotas}
      />

      <HitoFormModal
        open={modal === 'hito'}
        onClose={() => { setModal(null); resetH(); }}
        editHId={editHId}
        saveH={saveH}
        miembros={miembros}
        hMiembro={hMiembro} setHMiembro={setHMiembro}
        hFecha={hFecha} setHFecha={setHFecha}
        hTipo={hTipo} setHTipo={setHTipo}
        hDesc={hDesc} setHDesc={setHDesc}
      />

      <MiembroDetailModal
        open={modal === 'detail' && !!selMiembro}
        onClose={() => setModal(null)}
        selMiembro={selMiembro}
        asignacionesPorMiembro={asignacionesPorMiembro}
        hitosPorMiembro={hitosPorMiembro}
        grupos={grupos}
        ministerios={ministerios}
        qhTipo={qhTipo} setQhTipo={setQhTipo}
        qhFecha={qhFecha} setQhFecha={setQhFecha}
        qhDesc={qhDesc} setQhDesc={setQhDesc}
        quickAddHito={quickAddHito}
        updateAsigRol={updateAsigRol}
        quickRemoveAsig={quickRemoveAsig}
        openEditH={openEditH}
        onAsignar={() => { if (selMiembro) { setModal(null); openNewAsig(selMiembro.id); } }}
        onEditarPerfil={() => { if (selMiembro) { setModal(null); openEditM(selMiembro.id); } }}
        onEliminar={() => setModal('delM')}
        onEliminarHito={(id) => { setSelectedId(id); setModal('delH'); }}
      />

      <MinisterioDetailModal
        open={modal === 'detail' && !!selMinisterio && !selMiembro}
        onClose={() => setModal(null)}
        selMinisterio={selMinisterio}
        asignaciones={asignaciones}
        miembros={miembros}
        onEditar={() => { if (selMinisterio) { setModal(null); openEditMin(selMinisterio.id); } }}
        onAsignar={() => { if (selMinisterio) { setModal(null); openNewAsig(undefined, selMinisterio.id); } }}
        onEliminar={() => setModal('delMin')}
      />

      <DeleteModals
        modal={modal}
        selMiembro={selMiembro}
        selMinisterio={selMinisterio}
        selAsigMiembro={selAsigMiembro}
        selAsigMinisterio={selAsigMinisterio}
        selHitoMiembro={selHitoMiembro}
        onClose={() => setModal(null)}
        delM={delM}
        delMin={delMin}
        delAsig={delAsig}
        delH={delH}
      />
    </Layout>
  );
}
