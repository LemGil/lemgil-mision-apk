import { useState, useMemo, useEffect } from 'react';
import { v4 as uuid } from 'uuid';
import { useLiveQuery } from 'dexie-react-hooks';
import { useSearchParams } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { db } from '../lib/database';
import { createBaseRecord } from '../lib/utils/recordHelpers';
import type { Hito, Miembro, MiembroMinisterio, PasoSeguimiento } from '../lib/types';
import { today } from '../lib/utils';
import { mapaPersonas, miembroConDatos } from '../lib/personaDatos';
import { reflejarFallecimientoEnConversion, reflejarTrasladoEnConversion } from '../lib/propagacion';
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
import { PasosMiembroEditorModal } from './miembros/PasosMiembroEditorModal';
import { MinisterioDetailModal } from './miembros/MinisterioDetailModal';
import { DeleteModals } from './miembros/DeleteModals';

export default function Miembros() {
  const miembrosCrudos = useLiveQuery(() => db.miembros.toArray(), []) ?? [];
  const personas = useLiveQuery(() => db.personas.toArray(), []) ?? [];
  // P2 (ficha única): lo que se PINTA resuelve los datos personales desde
  // el núcleo `personas`; las escrituras usan las fichas crudas del proceso.
  const personasMap = useMemo(() => mapaPersonas(personas), [personas]);
  const miembros = useMemo(() => miembrosCrudos.map((m) => miembroConDatos(m, personasMap)), [miembrosCrudos, personasMap]);
  const grupos = useLiveQuery(() => db.grupos.toArray(), []) ?? [];
  const ministerios = useLiveQuery(() => db.ministerios.toArray(), []) ?? [];
  const asignaciones = useLiveQuery(() => db.miembrosMinisterios.toArray(), []) ?? [];
  const hitos = useLiveQuery(() => db.hitos.toArray(), []) ?? [];
  const conversiones = useLiveQuery(() => db.conversiones.toArray(), []) ?? [];
  // Pasos del miembro (Fase 1): el catálogo editable y la fuente
  // «academia» (los estudiantes se filtran por persona en la escalera).
  const pasosSeguimiento = useLiveQuery(() => db.pasosSeguimiento.toArray(), []) ?? [];
  const estudiantes = useLiveQuery(() => db.estudiantes.toArray(), []) ?? [];
  const [pasosEditorOpen, setPasosEditorOpen] = useState(false);
   const zonasDb = useLiveQuery(() => db.zonas.toArray(), []) ?? [];

  const [searchParams, setSearchParams] = useSearchParams();

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

  // P2: el formulario del miembro solo guarda el PROCESO (ingreso, estado,
  // notas); la persona se elige (mPersonaId) y sus datos viven en el núcleo.
  const [mPersonaId, setMPersonaId] = useState('');
  const [mIngreso, setMIngreso] = useState(today());
  const [mEstado, setMEstado] = useState('Activo');
  const [mConv, setMConv] = useState('');
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
    setMPersonaId(''); setMIngreso(today()); setMEstado('Activo');
    setMConv(''); setMNotas('');
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
    // P6: los cumpleaños salen del NÚCLEO (personas), no del proceso
    // miembro: la fecha de nacimiento es de la persona, así que cuentan
    // también quienes aún no tienen proceso de miembro.
    const cumplesProx = personas.filter(p => { const d = diasHastaCumple(p.fechaNacimiento); return d !== null && d <= 30; }).length;
    return { statusCounts, ministeriosCount, cumplesProx };
  }, [miembros, ministerios, personas]);

  const proximosCumples = useMemo(() => {
    return personas
      .map(p => ({ p, dias: diasHastaCumple(p.fechaNacimiento) }))
      .filter(x => x.dias !== null && x.dias <= 30)
      .sort((a, b) => (a.dias || 0) - (b.dias || 0));
  }, [personas]);

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

  // C1: enlace cruzado «Ver miembro» (?ver=<id> en el hash): abre el
  // detalle pedido y limpia el parámetro para que no se reabra al navegar.
  useEffect(() => {
    const ver = searchParams.get('ver');
    if (!ver) return;
    const existe = miembros.some((m) => m.id === ver);
    if (!existe && miembros.length === 0) return; // datos aún cargando
    if (existe) { setSelectedId(ver); setModal('detail'); }
    const limpios = new URLSearchParams(searchParams);
    limpios.delete('ver');
    setSearchParams(limpios, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, miembros]);

  const openNewM = () => { resetM(); setModal('miembro'); };
  const openEditM = (id: string) => {
    const m = miembrosCrudos.find((x) => x.id === id); if (!m) return;
    setEditMId(id);
    // La persona se hereda del proceso; si aún no tiene (registro viejo),
    // el selector permite elegirla o crearla y el guardado la enlaza.
    setMPersonaId(m.personaId || '');
    setMIngreso(m.fechaIngreso); setMEstado(m.estado);
    setMConv(m.conversionId || ''); setMNotas(m.notas);
    setModal('miembro');
  };
  const guardarMiembro = async () => {
    const persona = personas.find((p) => p.id === mPersonaId);
    if (!persona) return;
    const nombrePersona = `${persona.nombre} ${persona.apellido}`;
    // El vínculo con la conversión nace de la PERSONA: si ella ya tiene su
    // proceso conversión, este miembro es de esa misma historia (es el
    // sucesor del diálogo A2, que comparaba nombres y teléfonos porque
    // había dos fichas; con la ficha única el vínculo es por identidad).
    const conversionId = editMId
      ? (mConv || null)
      : (conversiones.find((c) => c.personaId === mPersonaId)?.id ?? null);
    const data = {
      fechaIngreso: mIngreso,
      estado: mEstado as Miembro['estado'],
      conversionId,
      personaId: mPersonaId,
      notas: mNotas.trim(),
    };
    if (editMId) {
      // Solo se escribe el PROCESO: los campos personales dormidos de la
      // ficha no se tocan (la identidad vive en el núcleo).
      await db.miembros.update(editMId, { ...data, actualizado: new Date().toISOString() });
      showToast(`Miembro "${nombrePersona}" actualizado`);
    } else {
      await db.miembros.add(createBaseRecord({
        id: uuid(),
        // El proceso nace SIN datos personales (vacíos a propósito).
        nombre: '', apellido: '', telefono: '', email: '', direccion: '', zona: '',
        grupoId: null, fechaNacimiento: '', contactoPreferido: 'WhatsApp' as Miembro['contactoPreferido'],
        profesion: '', estadoCivil: 'Soltero' as Miembro['estadoCivil'],
        bautizado: false, fechaBautismo: '', conyuge: '', hijos: '', hermanoMayorId: null,
        ...data,
        creado: new Date().toISOString(),
        actualizado: new Date().toISOString(),
      }));
      showToast(conversionId
        ? `Miembro "${nombrePersona}" registrado y vinculado a su conversión`
        : `Miembro "${nombrePersona}" registrado`);
    }
    // B3 (sentido inverso): si el miembro queda «Fallecido» o
    // «Trasladado», reflejarlo en su conversión vinculada, dejando la
    // entrada en su historial.
    await reflejarFallecimientoEnConversion({ estado: data.estado, conversionId });
    await reflejarTrasladoEnConversion({ estado: data.estado, conversionId });
    resetM(); setModal(null);
  };
  const saveM = async () => {
    if (!mPersonaId) return showToast('Elige la persona de esta membresía (o créala con «➕ Nueva persona»)');
    const persona = personas.find((p) => p.id === mPersonaId);
    if (!persona) return showToast('La persona elegida ya no existe');
    if (persona.fechaNacimiento && mIngreso && persona.fechaNacimiento > mIngreso) return showToast('La fecha de nacimiento no puede ser posterior al ingreso');
    if (!editMId) {
      // Una persona, un solo proceso miembro: si ya lo tiene, no se crea
      // otro (el duplicado que A2 perseguía ya no puede nacer).
      const existente = miembrosCrudos.find((m) => m.personaId === mPersonaId);
      if (existente) return showToast(`⚠️ ${persona.nombre} ${persona.apellido} ya tiene ficha de miembro: edítala en vez de crear otra`);
    }
    await guardarMiembro();
  };
  const delM = async () => {
    if (!selectedId) return;
    const m = miembros.find((x) => x.id === selectedId);
    await db.miembros.delete(selectedId);
    await db.miembrosMinisterios.where('miembroId').equals(selectedId).delete();
    await db.hitos.where('miembroId').equals(selectedId).delete();
    // A1: marcar la conversión de origen para que el miembro no resucite.
    if (m?.conversionId) {
      await db.conversiones.update(m.conversionId, { miembroDescartado: true });
    }
    showToast(`Miembro "${m ? `${m.nombre} ${m.apellido}` : ''}" y sus datos eliminados`);
    setSelectedId(null); setModal(null);
  };
  // A3: quitar el vínculo con una conversión que ya no existe.
  const desvincularOrigen = async () => {
    if (!selMiembro) return;
    await db.miembros.update(selMiembro.id, { conversionId: null, actualizado: new Date().toISOString() });
    showToast('Miembro desvinculado de su conversión de origen');
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

  // Pasos del miembro (Fase 1): registrar un paso manual = crear su
  // hito con pasoId por el MISMO camino de guardado de quickAddHito
  // (db.hitos.add + createBaseRecord: entra en la cola de sync por los
  // ganchos de Dexie). Quitar el registro = borrar ese hito; el resto
  // del historial no se toca.
  const registrarPaso = async (paso: PasoSeguimiento) => {
    if (!selMiembro) return;
    await db.hitos.add(createBaseRecord({
      id: uuid(), miembroId: selMiembro.id, fecha: today(),
      tipo: 'Otro' as Hito['tipo'], descripcion: paso.nombre, pasoId: paso.id,
    }));
    showToast(`Paso «${paso.nombre}» registrado`);
  };
  const quitarPaso = async (hitoId: string) => {
    await db.hitos.delete(hitoId);
    showToast('Registro del paso eliminado');
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

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <div className="tabs" style={{ flex: 1 }}>
          <button className={`tab ${tab === 'directorio' ? 'active' : ''}`} onClick={() => setTab('directorio')}>📖 Directorio · {miembros.length}</button>
          <button className={`tab ${tab === 'ministerios' ? 'active' : ''}`} onClick={() => setTab('ministerios')}>⛪ Ministerios · {ministerios.length}</button>
          <button className={`tab ${tab === 'hitos' ? 'active' : ''}`} onClick={() => setTab('hitos')}>📍 Hitos · {hitos.length}</button>
        </div>
        <button className="btn btn-secondary btn-sm" style={{ marginTop: 4 }} onClick={() => setPasosEditorOpen(true)}>⚙️ Pasos</button>
      </div>

      {tab === 'directorio' && (
        <DirectorioTab
          miembrosFiltrados={miembrosFiltrados}
          conversiones={conversiones}
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
        personas={personas}
        grupos={grupos}
        mPersonaId={mPersonaId} setMPersonaId={setMPersonaId}
        mIngreso={mIngreso} setMIngreso={setMIngreso}
        mEstado={mEstado} setMEstado={setMEstado}
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
        conversiones={conversiones}
        onDesvincular={desvincularOrigen}
        asignacionesPorMiembro={asignacionesPorMiembro}
        hitosPorMiembro={hitosPorMiembro}
        pasosSeguimiento={pasosSeguimiento}
        estudiantes={estudiantes}
        personas={personas}
        onRegistrarPaso={(paso) => void registrarPaso(paso)}
        onQuitarPaso={(hitoId) => void quitarPaso(hitoId)}
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

      <PasosMiembroEditorModal
        open={pasosEditorOpen}
        onClose={() => setPasosEditorOpen(false)}
        pasos={pasosSeguimiento}
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
