import { useEffect, useMemo, useState } from 'react';
import { v4 as uuid } from 'uuid';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { KpiCard } from '../components/KpiCard';
import { exportCSV } from '../lib/csvExport';
import { db } from '../lib/database';
import { createBaseRecord } from '../lib/utils/recordHelpers';
import type { Conversion, Evangelismo } from '../lib/types';
import { conversionConDatos, evangelismoConDatos, mapaPersonas, miembroConDatos, nombreDePersona } from '../lib/personaDatos';
import { datosEvangelismoParaGuardar, resolverEquipoAlEditar } from './mision-biblica/evangelismoForm';
import { conteoConversionesPorEvangelismo } from '../lib/evangelismoStats';
import { MS, today, fechaDeEstado as getFechaEstado } from '../lib/utils';
import { zonaCanonica } from '../lib/zonas';
import { conteoGrupo } from '../lib/grupoStats';
import { showToast } from '../lib/notification';
import { CsvImportButton } from '../components/CsvImportButton';
import type { DataTab, ModalType } from './mision-biblica/constants';
import {
  PS_APARTADO, PS_BAUTIZADO, PS_DISCIPULADO, PS_FALLECIDO, PS_INTEGRADO, PS_NUEVO,
  emojiDe, estadoCoincideConFiltro, etiquetaDe, idCanonico, pasoInicio, pasosDeMision, siguientePaso, tipoHitoDe,
} from '../lib/pasosMision';
import { PasosMisionEditorModal } from './mision-biblica/PasosMisionEditorModal';
import { reflejoDeSalidaEnMiembro } from '../lib/propagacion';
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
  const convsCrudas = useLiveQuery(() => db.conversiones.toArray(), []) ?? [];
  const grupos = useLiveQuery(() => db.grupos.toArray(), []) ?? [];
  const evangels = useLiveQuery(() => db.evangelismos.toArray(), []) ?? [];
  const miembrosCrudos = useLiveQuery(() => db.miembros.toArray(), []) ?? [];
  const hitos = useLiveQuery(() => db.hitos.toArray(), []) ?? [];
  const zonas = useLiveQuery(() => db.zonas.toArray(), []) ?? [];
  const personas = useLiveQuery(() => db.personas.toArray(), []) ?? [];
  // Fase 2: el catálogo de pasos de Misión (identidad fija, etiqueta
  // libre). La página razona por id/rol y pinta con la etiqueta viva.
  const pasosSeguimiento = useLiveQuery(() => db.pasosSeguimiento.toArray(), []) ?? [];
  const [pasosEditorOpen, setPasosEditorOpen] = useState(false);

  // P2 (ficha única): lo que se PINTA resuelve los datos personales desde
  // el núcleo `personas` (única fuente). Las escrituras usan las fichas
  // crudas: el proceso ya no guarda datos personales que haya que cuidar.
  const personasMap = useMemo(() => mapaPersonas(personas), [personas]);
  const convs = useMemo(() => convsCrudas.map((c) => conversionConDatos(c, personasMap)), [convsCrudas, personasMap]);
  const miembros = useMemo(() => miembrosCrudos.map((m) => miembroConDatos(m, personasMap)), [miembrosCrudos, personasMap]);
  const conteoEvang = useMemo(() => conteoConversionesPorEvangelismo(convsCrudas), [convsCrudas]);
  const nombreConv = (c: Conversion) => nombreDePersona(personasMap, c.personaId) || `${c.nombre} ${c.apellido}`.trim();

  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

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

  // P2: el formulario de la conversión solo guarda el PROCESO; la persona
  // se elige (fPersonaId) y sus datos viven en el núcleo.
  const [fPersonaId, setFPersonaId] = useState('');
  const [fFamilia, setFFamilia] = useState('No');
  const [fFecha, setFFecha] = useState(today());
  const [fEstado, setFEstado] = useState(PS_NUEVO);
  const [fNotas, setFNotas] = useState('');
  const [fEvangelismoId, setFEvangelismoId] = useState('');
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
  // P2/P7: ministro y equipo son PERSONAS por id; los nombres sin ficha
  // viven en sus campos propios (`liderExterno`/`participantesExternos`),
  // ya no como foto de texto sobre los ids.
  const [eLiderId, setELiderId] = useState('');
  const [eLiderExterno, setELiderExterno] = useState('');
  const [eParticipanteIds, setEParticipanteIds] = useState<string[]>([]);
  const [eParticipantesExternos, setEParticipantesExternos] = useState<string[]>([]);
  const [eNuevoExterno, setENuevoExterno] = useState('');
  const [eContactos, setEContactos] = useState('0');
  const [eNotas, setENotas] = useState('');
  const [sNota, setSNota] = useState('');
  const [sHito, setSHito] = useState(false);
  const [tempEst, setTempEst] = useState<string | null>(null);

  // const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3200); };
  const resetForm = () => { setEditConvId(null); setFPersonaId(''); setFFamilia('No'); setFFecha(today()); setFEstado(pasoInicio(pasosSeguimiento).id); setFNotas(''); setFEvangelismoId(''); setFHistorial([]); };
  const resetGrupo = () => { setEditGrupoId(null); setGNombre(''); setGZona(''); setGLider(''); setGDia('Lunes'); setGHora('19:00'); setGCap('15'); setGLugar(''); setGMeta(''); };
  const resetEvang = () => { setEditEvangId(null); setETipo('Visita domiciliaria'); setEFecha(today()); setEZona('Norte'); setELiderId(''); setELiderExterno(''); setEParticipanteIds([]); setEParticipantesExternos([]); setENuevoExterno(''); setEContactos('0'); setENotas(''); };

  const mo = new Date().toISOString().slice(0, 7);
  const mesCount = convs.filter((c) => c.fecha?.startsWith(mo)).length;

  // Fase 2: los conteos se anclan a la IDENTIDAD de las semillas; las
  // etiquetas de los KPI se resuelven vivas en el render.
  const discCount = convs.filter((c) => idCanonico(c.estado) === PS_DISCIPULADO).length;
  const bautCount = convs.filter((c) => idCanonico(c.estado) === PS_BAUTIZADO).length;
  const intCount = convs.filter((c) => idCanonico(c.estado) === PS_INTEGRADO).length;
  const apaCount = convs.filter((c) => idCanonico(c.estado) === PS_APARTADO).length;
  const falCount = convs.filter((c) => idCanonico(c.estado) === PS_FALLECIDO).length;

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
      && estadoCoincideConFiltro(c.estado, filterEstado)
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
      // B4: misma semántica que la tarjeta y el PDF (helper único).
      // F4: CON el catálogo vivo, como el Panel — sin él, un paso de
      // camino creado por la iglesia no ocupaba silla en esta pantalla.
      const total = conteoGrupo(g.id, miembros, convs, pasosSeguimiento).totalAsignados;
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
    // P7: buscador y filtro «Ministro» comparan contra el líder RESUELTO
    // desde las personas (la vista), nunca contra un texto guardado.
    const vista = evangelismoConDatos(e, personasMap);
    const s = `${e.tipo} ${e.zona} ${vista.liderNombre} ${vista.equipoNombres.join(' ')} ${e.notas}`.toLowerCase();
    if (searchE && !s.includes(searchE.toLowerCase())) return false;
    if (filterETipo && e.tipo !== filterETipo) return false;
    if (filterEZona && e.zona !== filterEZona) return false;
    if (filterEMinistro && vista.liderNombre !== filterEMinistro) return false;
    if (filterEMes && !e.fecha.startsWith(filterEMes)) return false;
    if (globalAno && !e.fecha.startsWith(globalAno)) return false;
    if (globalMes && e.fecha.slice(5, 7) !== globalMes) return false;
    return true;
  });

  const selConv = convs.find((c) => c.id === selectedId);

  // B3 (solo reflejo de estados): la propagación B2 se jubiló en P2 — los
  // datos personales viven en el núcleo y ambas páginas los leen de ahí.
  // Queda la regla del proceso: las SALIDAS de la conversión se reflejan
  // en su miembro (la decisión vive en lib/propagacion.ts:
  // Fallecido→Fallecido, Traslado→Trasladado, Apartado y cualquier otra
  // salida del catálogo→Inactivo). Con la bandera de descarte (A1) o sin
  // miembro, no se toca nada.
  const reflejarEstadoEnMiembro = async (convDespues: Conversion) => {
    if (convDespues.miembroDescartado) return;
    const vinculado = await db.miembros.where('conversionId').equals(convDespues.id).first();
    if (!vinculado) return;
    const nuevoEstado = reflejoDeSalidaEnMiembro(convDespues.estado, pasosSeguimiento, vinculado.estado);
    if (nuevoEstado) {
      await db.miembros.update(vinculado.id, { estado: nuevoEstado, actualizado: new Date().toISOString() });
    }
  };

  // ── CONVERSIONES ──
  const openNewConv = () => { resetForm(); setModal('conv'); };
  // P2: alta de conversión nacida de un evangelismo — el formulario abre
  // ya enlazado (evangelismoId puesto y su fecha como fecha de conversión).
  const openNewConvDesdeEvangelismo = (e: Evangelismo) => {
    resetForm();
    setFEvangelismoId(e.id);
    setFFecha(e.fecha);
    setModal('conv');
  };
  const openEditConv = (id: string) => {
    const c = convsCrudas.find((x) => x.id === id); if (!c) return;
    setEditConvId(id);
    // La persona se hereda del proceso; si aún no tiene (registro viejo),
    // el selector permite elegirla o crearla y el guardado la enlaza.
    setFPersonaId(c.personaId || '');
    setFFamilia(c.familia); setFFecha(c.fecha);
    setFEstado(c.estado); setFNotas(c.notas);
    setFEvangelismoId(c.evangelismoId || '');
    setFHistorial(c.historial ? [...c.historial] : []);
    setModal('conv');
  };
  const saveConv = async () => {
    if (!fPersonaId) return showToast('Elige la persona de esta conversión (o créala con «➕ Nueva persona»)');
    const persona = personas.find((p) => p.id === fPersonaId);
    if (!persona) return showToast('La persona elegida ya no existe');
    if (!fFecha) return showToast('La fecha es obligatoria');
    const nombrePersona = `${persona.nombre} ${persona.apellido}`;
    // P6: el texto `lider` DEJÓ DE GUARDARSE (era la foto del hermano
    // mayor de la persona: B1 ya lo trataba como exhibición del id, y el
    // decorador lo deriva del núcleo al pintar). Al no ir en `data`, la
    // edición conserva intacta la foto dormida de los registros viejos
    // (lectura tolerante) y las altas nuevas ya no la producen.
    const data = { fecha: fFecha, familia: fFamilia, estado: fEstado, notas: fNotas.trim(), historial: fHistorial, personaId: fPersonaId, evangelismoId: fEvangelismoId || null, updatedAt: Date.now() };
    if (editConvId) {
      const c = convsCrudas.find((x) => x.id === editConvId);
      await db.conversiones.update(editConvId, data);
      if (c) {
        const despues: Conversion = { ...c, ...data };
        const synced = await syncMemberFromConversion(despues);
        if (synced) showToast(`🧑 ${persona.nombre} integrado → Miembros`);
        await reflejarEstadoEnMiembro(despues);
      }
      showToast(`${nombrePersona} actualizado/a`);
    } else {
      const id = uuid();
      // El proceso nace SIN datos personales (vacíos a propósito): la
      // identidad vive en la persona enlazada y se lee del núcleo.
      const nuevo: Conversion = {
        id, nombre: '', apellido: '', telefono: '', edad: '', direccion: '', zona: '',
        grupoId: '', hermanoMayorId: null, email: '', profesion: '', bautizado: false,
        fechaBautismo: '', conyuge: '', hijos: '', numeroIdentidad: undefined,
        ...data,
        historial: data.estado && idCanonico(data.estado) !== pasoInicio(pasosSeguimiento).id ? [{ fecha: data.fecha || today(), estado: data.estado, nota: 'Registro inicial' }] : [],
        creado: new Date().toISOString(), version: 1,
      };
      await db.conversiones.add(createBaseRecord(nuevo));
      const synced = await syncMemberFromConversion(nuevo);
      showToast(synced ? `🧑 ${persona.nombre} registrado e integrado → Miembros` : `${nombrePersona} guardado/a correctamente`);
    }
    resetForm(); setModal(null);
  };
  const delConv = async () => {
    if (!selectedId) return;
    await db.conversiones.delete(selectedId);
    showToast('Registro eliminado'); setModal(null);
  };
  // A1: vía de vuelta explícita para la bandera anti-resurrección.
  const permitirRecrear = async () => {
    if (!selConv) return;
    await db.conversiones.update(selConv.id, { miembroDescartado: false });
    showToast('Se permitirá recrear el miembro en el próximo guardado de esta conversión');
  };
  // A3: miembro vinculado a la conversión seleccionada (para la confirmación de borrado).
  const miembroVinculado = selectedId ? miembros.find((m) => m.conversionId === selectedId) : undefined;
  // C2: hitos del miembro vinculado, para mostrarlos (solo lectura) en el
  // detalle de su conversión.
  const hitosVinculado = miembroVinculado
    ? hitos.filter((h) => h.miembroId === miembroVinculado.id).slice().sort((a, b) => b.fecha.localeCompare(a.fecha))
    : [];
  const quickAdv = async (id: string) => {
    const c = convsCrudas.find((x) => x.id === id); if (!c) return;
    // Fase 2: avanzar = siguiente paso de la RUTA del catálogo. El
    // gozne y las salidas no tienen siguiente (null): el botón no hace
    // nada ahí (antes, por el arreglo plano de estados, un Integrado
    // «avanzaba» a Apartado: era un artefacto, no una regla).
    const next = siguientePaso(pasosSeguimiento, c.estado);
    if (!next) return;
    // F1: una ficha importada antes de este arreglo puede no traer
    // `historial` (el tipo lo declara, el registro real no): tolerarlo
    // como [] en vez de reventar el avance, como ya hacen utils/panel.
    const despues: Conversion = { ...c, estado: next.id, historial: [...(c.historial ?? []), { fecha: today(), estado: next.id, nota: 'Avance rápido' }] };
    await db.conversiones.update(id, { estado: next.id, historial: despues.historial });
    const synced = await syncMemberFromConversion(despues);
    await reflejarEstadoEnMiembro(despues);
    showToast(synced ? `🧑 ${nombreConv(c).split(' ')[0]} integrado → Miembros` : `${nombreConv(c)} avanzó a ${next.nombre}`);
  };
  const openDetail = (id: string) => { setSelectedId(id); setTempEst(null); setSNota(''); setSHito(false); setModal('detail'); };
  // C1: enlace cruzado «Ver conversión» (?ver=<id> en el hash): abre el
  // detalle pedido y limpia el parámetro para que no se reabra al navegar.
  useEffect(() => {
    const ver = searchParams.get('ver');
    if (!ver) return;
    const existe = convs.some((c) => c.id === ver);
    if (!existe && convs.length === 0) return; // datos aún cargando
    if (existe) openDetail(ver);
    const limpios = new URLSearchParams(searchParams);
    limpios.delete('ver');
    setSearchParams(limpios, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, convs]);
  const saveSeg = async () => {
    if (!selConv) return;
    const cruda = convsCrudas.find((x) => x.id === selConv.id) ?? selConv;
    const ne = tempEst || selConv.estado;
    // F1: mismo tolerar que en quickAdv — historial ausente = [].
    const hist = [...(cruda.historial ?? [])];
    if (sNota.trim() || ne !== selConv.estado) hist.push({ fecha: today(), estado: ne, nota: sNota.trim() || `Estado: ${etiquetaDe(pasosSeguimiento, selConv.estado)} → ${etiquetaDe(pasosSeguimiento, ne)}` });
    const despues: Conversion = { ...cruda, estado: ne, historial: hist };
    await db.conversiones.update(selConv.id, { estado: despues.estado, historial: hist });
    const synced = await syncMemberFromConversion(despues);
    await reflejarEstadoEnMiembro(despues);
    let hitoCreado = false;
    if (sHito && sNota.trim()) {
      const vinculado = await db.miembros.where('conversionId').equals(selConv.id).first();
      if (vinculado) {
        await db.hitos.add(createBaseRecord({
          id: uuid(),
          miembroId: vinculado.id,
          fecha: today(),
          tipo: tipoHitoDe(ne),
          descripcion: sNota.trim(),
          creado: new Date().toISOString(),
        }));
        hitoCreado = true;
      }
    }
    let msg = synced ? `🧑 ${etiquetaDe(pasosSeguimiento, ne)} → Miembros` : 'Seguimiento guardado';
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
    const data = { nombre: gNombre.trim(), zona: zonaCanonica(gZona, zonas), lider: gLider.trim(), dia: gDia, hora: gHora, capacidad: gCap, lugar: gLugar.trim(), planOfrendasMensual: parseInt(gMeta) || 0 };
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
  // P7: al editar, líder y equipo se reparten entre ids y campos externos
  // con `resolverEquipoAlEditar` (los textos dormidos viejos se resuelven
  // contra las personas sin escribir nada; el registro se sana al guardar
  // porque saveEvang ya no escribe `lider`/`participantes`).
  const openNewEvang = () => { resetEvang(); setModal('evang'); };
  const openEditEvang = (id: string) => {
    const e = evangels.find((x) => x.id === id); if (!e) return;
    setEditEvangId(id); setETipo(e.tipo); setEFecha(e.fecha); setEZona(e.zona);
    const equipo = resolverEquipoAlEditar(e, personas);
    setELiderId(equipo.liderId);
    setELiderExterno(equipo.liderExterno);
    setEParticipanteIds(equipo.participanteIds);
    setEParticipantesExternos(equipo.participantesExternos);
    setENuevoExterno('');
    setEContactos(String(e.contactos)); setENotas(e.notas);
    setModal('evang');
  };
  const saveEvang = async () => {
    if (!eFecha) return showToast('La fecha es obligatoria');
    // P7: se guardan SOLO vínculos y campos propios (ids + externos);
    // los textos `lider`/`participantes` no se escriben nunca más.
    const data = datosEvangelismoParaGuardar({
      fecha: eFecha, tipo: eTipo, zona: zonaCanonica(eZona, zonas),
      liderId: eLiderId, liderExterno: eLiderExterno,
      participanteIds: eParticipanteIds, participantesExternos: eParticipantesExternos,
      contactos: parseInt(eContactos) || 0, notas: eNotas,
    });
    if (editEvangId) {
      // La cifra manual vieja NO se toca: queda dormida; la viva es derivada.
      await db.evangelismos.update(editEvangId, data);
      showToast('Actividad actualizada');
    } else {
      await db.evangelismos.add(createBaseRecord({ id: uuid(), ...data, conversiones: 0, creado: new Date().toISOString() }));
      showToast('Evangelismo guardado');
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
        <KpiCard label={globalAno ? `${etiquetaDe(pasosSeguimiento, PS_DISCIPULADO)} ${globalAno}` : `En ${etiquetaDe(pasosSeguimiento, PS_DISCIPULADO)}`} value={globalAno || globalMes ? convs.filter((c) => idCanonico(c.estado) === PS_DISCIPULADO && (() => { const f = getFechaEstado(c, PS_DISCIPULADO); return (!globalAno || f.startsWith(globalAno)) && (!globalMes || f.slice(5, 7) === globalMes); })()).length : discCount} icon={emojiDe(pasosSeguimiento, PS_DISCIPULADO) || '📖'} accent="var(--oro-apostolico)" sub="seguimiento activo" />
        <KpiCard label={globalAno ? `${etiquetaDe(pasosSeguimiento, PS_BAUTIZADO)}s ${globalAno}` : `${etiquetaDe(pasosSeguimiento, PS_BAUTIZADO)}s`} value={globalAno || globalMes ? convs.filter((c) => idCanonico(c.estado) === PS_BAUTIZADO && (() => { const f = getFechaEstado(c, PS_BAUTIZADO); return (!globalAno || f.startsWith(globalAno)) && (!globalMes || f.slice(5, 7) === globalMes); })()).length : bautCount} icon={emojiDe(pasosSeguimiento, PS_BAUTIZADO) || '💧'} accent="var(--mision-blue)" sub="confirmados" />
        <KpiCard label={globalAno ? `${etiquetaDe(pasosSeguimiento, PS_INTEGRADO)}s ${globalAno}` : `${etiquetaDe(pasosSeguimiento, PS_INTEGRADO)}s`} value={globalAno || globalMes ? convs.filter((c) => idCanonico(c.estado) === PS_INTEGRADO && (() => { const f = getFechaEstado(c, PS_INTEGRADO); return (!globalAno || f.startsWith(globalAno)) && (!globalMes || f.slice(5, 7) === globalMes); })()).length : intCount} icon={emojiDe(pasosSeguimiento, PS_INTEGRADO) || '🏘️'} accent="var(--oro-luz)" sub="al ministerio" />
        {apaCount > 0 && <KpiCard label={`${etiquetaDe(pasosSeguimiento, PS_APARTADO)}s`} value={apaCount} icon={emojiDe(pasosSeguimiento, PS_APARTADO) || '🚪'} accent="var(--red, #ef4444)" sub="se apartaron" />}
        {falCount > 0 && <KpiCard label={`${etiquetaDe(pasosSeguimiento, PS_FALLECIDO)}s`} value={falCount} icon={emojiDe(pasosSeguimiento, PS_FALLECIDO) || '✝️'} accent="var(--dim)" sub="en memoria" />}
      </div>

      <div className="tabs">
        <button className={`tab ${dataTab === 'conv' ? 'active' : ''}`} onClick={() => setDataTab('conv')}>{tabLabel('conv')}</button>
        <button className={`tab ${dataTab === 'grupo' ? 'active' : ''}`} onClick={() => setDataTab('grupo')}>{tabLabel('grupo')}</button>
        <button className={`tab ${dataTab === 'evang' ? 'active' : ''}`} onClick={() => setDataTab('evang')}>{tabLabel('evang')}</button>
      </div>

      <div className="actions-row">
        {dataTab === 'conv' && <button className="btn btn-gold" onClick={openNewConv}>➕ Nueva Conversión</button>}
        {dataTab === 'conv' && <button className="btn btn-secondary" onClick={() => setPasosEditorOpen(true)}>⚙️ Pasos</button>}
        {dataTab === 'grupo' && <button className="btn btn-gold" onClick={openNewGrupo}>👥 Nuevo Grupo</button>}
        {dataTab === 'evang' && <button className="btn btn-gold" onClick={openNewEvang}>📋 Registrar Evangelismo</button>}
        {dataTab === 'conv' && (
          <button className="btn btn-secondary" onClick={() => {
            // F5/M3: se exporta la lista FILTRADA que se está viendo,
            // no el registro completo — pantalla y archivo cuentan igual.
            if (!filtered.length) return showToast('No hay datos para exportar');
            const h = ['Nombre','Apellido','Telefono','Edad','Zona','Mayor','Fecha','Estado','Notas'];
            const r = filtered.map(c => [c.nombre,c.apellido,c.telefono||'',c.edad||'',c.zona,c.lider||'',c.fecha,etiquetaDe(pasosSeguimiento, c.estado),(c.notas||'').replace(/,/g,';')]);
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
            // F1: toda conversión importada nace con su historial (vacío):
            // sin él, abrir su detalle o avanzarla lanzaba un TypeError.
            // Función: cada fila recibe SU propio arreglo.
            defaults={{ estado: PS_NUEVO, fecha: () => new Date().toISOString().split('T')[0], historial: () => [] }}
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
            {pasosDeMision(pasosSeguimiento).map((p) => <option key={p.id} value={p.id}>{p.emoji} {p.nombre}</option>)}
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
            {[...new Set(evangels.map(e => evangelismoConDatos(e, personasMap).liderNombre).filter(Boolean))].sort().map((m) => <option key={m} value={m}>{m}</option>)}
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
          pasos={pasosSeguimiento}
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
          pasos={pasosSeguimiento}
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
          convs={convsCrudas}
          personas={personas}
          openEditEvang={openEditEvang}
          onEliminar={(id) => { setSelectedId(id); setModal('confirmEvang'); }}
          onRegistrarConversion={openNewConvDesdeEvangelismo}
        />
      )}

      <ConversionFormModal
        pasos={pasosSeguimiento}
        open={modal === 'conv'}
        onClose={() => setModal(null)}
        editConvId={editConvId}
        saveConv={saveConv}
        personas={personas}
        grupos={grupos}
        evangelismos={evangels}
        fPersonaId={fPersonaId} setFPersonaId={setFPersonaId}
        fFecha={fFecha} setFFecha={setFFecha}
        fFamilia={fFamilia} setFFamilia={setFFamilia}
        fEstado={fEstado} setFEstado={setFEstado}
        fNotas={fNotas} setFNotas={setFNotas}
        fEvangelismoId={fEvangelismoId} setFEvangelismoId={setFEvangelismoId}
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
        personas={personas}
        eTipo={eTipo} setETipo={setETipo}
        eFecha={eFecha} setEFecha={setEFecha}
        eZona={eZona} setEZona={setEZona}
        eLiderId={eLiderId} setELiderId={setELiderId}
        eLiderExterno={eLiderExterno} setELiderExterno={setELiderExterno}
        eParticipanteIds={eParticipanteIds} setEParticipanteIds={setEParticipanteIds}
        eParticipantesExternos={eParticipantesExternos} setEParticipantesExternos={setEParticipantesExternos}
        eNuevoExterno={eNuevoExterno} setENuevoExterno={setENuevoExterno}
        eConvsDerivadas={editEvangId ? (conteoEvang.get(editEvangId) ?? 0) : 0}
        eContactos={eContactos} setEContactos={setEContactos}
        eNotas={eNotas} setENotas={setENotas}
      />

      <ConversionDetailModal
        pasos={pasosSeguimiento}
        open={modal === 'detail'}
        onClose={() => setModal(null)}
        onEliminar={() => setModal('confirm')}
        onPermitirRecrear={permitirRecrear}
        saveSeg={saveSeg}
        selConv={selConv}
        miembroVinculado={miembroVinculado}
        hitosVinculado={hitosVinculado}
        onVerMiembro={(id) => navigate(`/miembros?ver=${id}`)}
        grupos={grupos}
        tempEst={tempEst} setTempEst={setTempEst}
        sNota={sNota} setSNota={setSNota}
        sHito={sHito} setSHito={setSHito}
      />

      <PasosMisionEditorModal
        open={pasosEditorOpen}
        onClose={() => setPasosEditorOpen(false)}
        pasos={pasosSeguimiento}
      />

      <ConfirmModals
        modal={modal}
        selConv={selConv}
        miembroVinculadoNombre={miembroVinculado ? `${miembroVinculado.nombre} ${miembroVinculado.apellido}` : undefined}
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
