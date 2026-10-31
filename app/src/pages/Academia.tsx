import { useState, useMemo } from 'react';
import { v4 as uuid } from 'uuid';
import { useLiveQuery } from 'dexie-react-hooks';
import { Layout } from '../components/Layout';
import { KpiCard } from '../components/KpiCard';
import { db } from '../lib/database';
import { createBaseRecord } from '../lib/utils/recordHelpers';
import type { Curso, Estudiante, Certificado } from '../lib/types';
import { showToast } from '../lib/notification';
import { today } from '../lib/utils';
import { q } from './academia/constants';
import type { Tab } from './academia/constants';
import { CursosTab } from './academia/CursosTab';
import { EstudiantesTab } from './academia/EstudiantesTab';
import { CertificadosTab } from './academia/CertificadosTab';
import { CursoFormModal } from './academia/CursoFormModal';
import { LeccionFormModal } from './academia/LeccionFormModal';
import { CursoDetailModal } from './academia/CursoDetailModal';
import { EstudianteFormModal } from './academia/EstudianteFormModal';
import { EstudianteDetailModal } from './academia/EstudianteDetailModal';
import { CertificadoFormModal } from './academia/CertificadoFormModal';

export default function Academia() {
   const cursos = useLiveQuery(() => db.cursos.toArray(), []) ?? [];
   const lecciones = useLiveQuery(() => db.lecciones.toArray(), []) ?? [];
   const estudiantes = useLiveQuery(() => db.estudiantes.toArray(), []) ?? [];
   const certs = useLiveQuery(() => db.certificados.toArray(), []) ?? [];
   const allHitos = useLiveQuery(() => db.hitos.toArray(), []) ?? [];
   const miembros = useLiveQuery(() => db.miembros.toArray(), []) ?? [];
   const conversiones = useLiveQuery(() => db.conversiones.toArray(), []) ?? [];
   const grupos = useLiveQuery(() => db.grupos.toArray(), []) ?? [];
   const zonas = useLiveQuery(() => db.zonas.toArray(), []) ?? [];

  const [tab, setTab] = useState<Tab>('cursos');
  const [search, setSearch] = useState('');
  const [filterNivel, setFilterNivel] = useState('');
  const [filterCursoEstado, setFilterCursoEstado] = useState('');
  const [filterCursoEst, setFilterCursoEst] = useState('');
  const [filterEstadoEst, setFilterEstadoEst] = useState('');
  const [filterOrigenEst, setFilterOrigenEst] = useState('');
  const [filterZonaEst, setFilterZonaEst] = useState('');
  const [filterGrupoEst, setFilterGrupoEst] = useState('');
  const [filterBautizadoEst, setFilterBautizadoEst] = useState('');
  const [modal, setModal] = useState<null | 'curso' | 'leccion' | 'ver' | 'est' | 'cert' | 'estDetail'>(null);
  const [editCursoId, setEditCursoId] = useState<string | null>(null);
  const [editLecId, setEditLecId] = useState<string | null>(null);
  const [editEstId, setEditEstId] = useState<string | null>(null);
  const [editCertId, setEditCertId] = useState<string | null>(null);
  const [viewCursoId, setViewCursoId] = useState<string | null>(null);
  const [viewEstId, setViewEstId] = useState<string | null>(null);

   const selEst = viewEstId ? estudiantes.find((e) => e.id === viewEstId) : null;

   const selEstData = useMemo(() => {
     if (!selEst) return null;
     const myCerts = certs.filter(c => c.estId === selEst.id);
     const myCurso = cursos.find(c => c.id === selEst.cursoId);
     const totalCursos = myCerts.length + (selEst.cursoId ? 1 : 0);
     const iniciales = `${selEst.nombre[0] || ''}${selEst.apellido[0] || ''}`.toUpperCase();
     const studentHitos = allHitos.filter(h => h.estudianteId === selEst.id).sort((a, b) => b.fecha.localeCompare(a.fecha));
     const origenConv = selEst.origen === 'convertido' ? conversiones.find(c => c.id === selEst.origenId) : null;
     const origenMiem = selEst.origen === 'miembro' ? miembros.find(m => m.id === selEst.origenId) : null;
     const grupo = grupos.find(g => g.id === selEst.grupoId);
     const hermanoMayor = miembros.find(m => m.id === selEst.hermanoMayorId);
     return { myCerts, myCurso, totalCursos, iniciales, studentHitos, origenConv, origenMiem, grupo, hermanoMayor };
   }, [selEst, certs, cursos, allHitos, conversiones, miembros, grupos]);

  
   const [cNombre, setCNombre] = useState('');
   const [cNivel, setCNivel] = useState('Basico');

  const [cDur, setCDur] = useState('');
  const [cInst, setCInst] = useState('');
  const [cEmoji, setCEmoji] = useState('📖');
  const [cColor, setCColor] = useState('rgba(122,95,192,0.25)');
  const [cEstado, setCEstado] = useState('Activo');
  const [cDesc, setCDesc] = useState('');
  const [lCurso, setLCurso] = useState('');
  const [lTitulo, setLTitulo] = useState('');
  const [lNum, setLNum] = useState('');
  const [lDur, setLDur] = useState('');
  const [lDesc, setLDesc] = useState('');
  const [eNombre, setENombre] = useState('');
  const [eApellido, setEApellido] = useState('');
  const [eTel, setETel] = useState('');
  const [eEdad, setEEdad] = useState('');
  const [eCurso, setECurso] = useState('');
  const [eFecha, setEFecha] = useState(today());
  const [eEstado, setEEstado] = useState('Activo');
  const [eNotas, setENotas] = useState('');
  const [eOrigen, setEOrigen] = useState<'convertido' | 'miembro' | 'manual'>('manual');
  const [eOrigenId, setEOrigenId] = useState('');
  const [eZona, setEZona] = useState('');
  const [eGrupoId, setEGrupoId] = useState('');
  const [eHermanoMayorId, setEHermanoMayorId] = useState('');
  const [eEmail, setEEmail] = useState('');
  const [eDireccion, setEDireccion] = useState('');
  const [eProfesion, setEProfesion] = useState('');
  const [eBautizado, setEBautizado] = useState(false);
  const [eFechaBautismo, setEFechaBautismo] = useState('');
  const [eConyuge, setEConyuge] = useState('');
  const [eHijos, setEHijos] = useState('');
  const [certEst, setCertEst] = useState('');
  const [certCurso, setCertCurso] = useState('');
  const [certFecha, setCertFecha] = useState(today());
  const [certCal, setCertCal] = useState('Aprobado');
  const [certObs, setCertObs] = useState('');

  const resetCurso = () => { setCNombre(''); setCNivel('Basico'); setCDur(''); setCInst(''); setCEmoji('📖'); setCColor('rgba(122,95,192,0.25)'); setCEstado('Activo'); setCDesc(''); };
  const resetLeccion = () => { setLCurso(''); setLTitulo(''); setLNum(''); setLDur(''); setLDesc(''); };
  const resetEst = () => {
    setENombre(''); setEApellido(''); setETel(''); setEEdad('');
    setECurso(''); setEFecha(today()); setEEstado('Activo'); setENotas('');
    setEOrigen('manual'); setEOrigenId(''); setEZona(''); setEGrupoId('');
    setEHermanoMayorId(''); setEEmail(''); setEDireccion(''); setEProfesion('');
    setEBautizado(false); setEFechaBautismo(''); setEConyuge(''); setEHijos('');
  };
   const resetCert = () => { setCertEst(''); setCertCurso(''); setCertFecha(today()); setCertCal('Aprobado'); setCertObs(''); };
   const [qhTipo, setQHTipo] = useState<'Conversión' | 'Bautismo' | 'Discipulado' | 'Curso Completado' | 'Integración' | 'Liderazgo' | 'Matrimonio' | 'Otro'>('Otro');
   const [qhDesc, setQHDesc] = useState('');
   const [qhFecha, setQHFecha] = useState(today());

   const resetHito = () => { setQHTipo('Otro'); setQHDesc(''); setQHFecha(today()); };

   const saveHito = async (estId: string) => {
     if (!qhDesc.trim()) return showToast('La descripción es obligatoria');
     const data = { 
       id: uuid(), 
       estudianteId: estId, 
       fecha: qhFecha, 
       tipo: qhTipo, 
       descripcion: qhDesc.trim(), 
       creado: new Date().toISOString() 
     };
     await db.hitos.add(createBaseRecord(data));
     showToast('Hito registrado');
     setQHDesc('');
     setQHFecha(today());
   };

   const totalLecc = lecciones.length;
   const activos = cursos.filter(c => c.estado === 'Activo').length;

  // -- Cursos CRUD --
  const openNewCurso = () => { setEditCursoId(null); resetCurso(); setModal('curso'); };
  const openEditCurso = (id: string) => {
    const c = cursos.find((x) => x.id === id); if (!c) return;
    setEditCursoId(id); setCNombre(c.nombre); setCNivel(c.nivel); setCDur(c.duracion);
    setCInst(c.instructor); setCEmoji(c.emoji); setCColor(c.color); setCEstado(c.estado); setCDesc(c.descripcion);
    setModal('curso');
  };
  const saveCurso = async () => {
    if (!cNombre.trim()) return showToast('El nombre del curso es obligatorio');
    if (!cInst.trim()) return showToast('El instructor es obligatorio');
    const data = { nombre: cNombre.trim(), instructor: cInst.trim(), nivel: cNivel as Curso['nivel'], duracion: cDur, emoji: cEmoji || '📖', color: cColor, estado: cEstado as Curso['estado'], descripcion: cDesc.trim() };
    if (editCursoId) { await db.cursos.update(editCursoId, data); showToast(`Curso "${cNombre}" actualizado`); }
    else { await db.cursos.add(createBaseRecord({ id: uuid(), creado: today(), ...data })); showToast(`Curso "${cNombre}" creado`); }
    setEditCursoId(null); resetCurso(); setModal(null);
  };
  const delCurso = async () => {
    if (!editCursoId) return;
    const c = cursos.find((x) => x.id === editCursoId);
    await db.cursos.delete(editCursoId);
    await db.lecciones.where('cursoId').equals(editCursoId).delete();
    setEditCursoId(null); setModal(null);
    showToast(`Curso "${c?.nombre}" eliminado`);
  };

  // -- Lecciones CRUD --
  const openNewLeccion = () => { setEditLecId(null); resetLeccion(); setModal('leccion'); };
  const openEditLeccion = (id: string) => {
    const l = lecciones.find((x) => x.id === id); if (!l) return;
    setEditLecId(id); setLCurso(l.cursoId); setLTitulo(l.titulo); setLNum(String(l.numero || '')); setLDur(String(l.duracion || '')); setLDesc(l.descripcion);
    setModal('leccion');
  };
  const saveLeccion = async () => {
    if (!lCurso) return showToast('Selecciona un curso');
    if (!lTitulo.trim()) return showToast('El título es obligatorio');
    const leccCount = await db.lecciones.where('cursoId').equals(lCurso).count();
    const data = { cursoId: lCurso, titulo: lTitulo.trim(), numero: parseInt(lNum) || leccCount + 1, duracion: parseInt(lDur) || null, descripcion: lDesc.trim() };
    if (editLecId) { await db.lecciones.update(editLecId, data); showToast(`Lección "${lTitulo}" actualizada`); }
    else { await db.lecciones.add(createBaseRecord({ id: uuid(), creado: today(), ...data })); showToast(`Lección "${lTitulo}" agregada`); }
    setEditLecId(null); resetLeccion(); setModal(null);
  };
  const delLeccion = async () => {
    if (!editLecId) return;
    const l = lecciones.find((x) => x.id === editLecId);
    await db.lecciones.delete(editLecId);
    setEditLecId(null); setModal(null);
    showToast(`Lección "${l?.titulo}" eliminada`);
  };

  // -- Estudiantes CRUD --
  const openNewEst = () => { setEditEstId(null); resetEst(); setModal('est'); };
  const openEditEst = (id: string) => {
    const e = estudiantes.find((x) => x.id === id); if (!e) return;
    setEditEstId(id); setENombre(e.nombre); setEApellido(e.apellido); setETel(e.telefono); setEEdad(e.edad);
    setECurso(e.cursoId); setEFecha(e.fecha); setEEstado(e.estado); setENotas(e.notas);
    setEOrigen(e.origen || 'manual'); setEOrigenId(e.origenId || '');
    setEZona(e.zona || ''); setEGrupoId(e.grupoId || ''); setEHermanoMayorId(e.hermanoMayorId || '');
    setEEmail(e.email || ''); setEDireccion(e.direccion || ''); setEProfesion(e.profesion || '');
    setEBautizado(!!e.bautizado); setEFechaBautismo(e.fechaBautismo || '');
    setEConyuge(e.conyuge || ''); setEHijos(e.hijos || '');
    setModal('est');
  };
  const saveEst = async () => {
    if (!eNombre.trim() || !eApellido.trim()) return showToast('Nombre y apellido son obligatorios');
    if (!eCurso) return showToast('Selecciona un curso');
    const data = {
      nombre: eNombre.trim(), apellido: eApellido.trim(), cursoId: eCurso, fecha: eFecha,
      telefono: eTel.trim(), edad: eEdad, estado: eEstado as Estudiante['estado'], notas: eNotas.trim(),
      origen: eOrigen, origenId: eOrigenId || null, zona: eZona, grupoId: eGrupoId || null,
      hermanoMayorId: eHermanoMayorId || null, email: eEmail.trim(), direccion: eDireccion.trim(),
      profesion: eProfesion.trim(), bautizado: eBautizado, fechaBautismo: eFechaBautismo,
      conyuge: eConyuge.trim(), hijos: eHijos.trim(),
    };
    if (editEstId) { await db.estudiantes.update(editEstId, data); showToast(`${eNombre} ${eApellido} actualizado/a`); }
    else { await db.estudiantes.add(createBaseRecord({ id: uuid(), creado: today(), ...data })); showToast(`${eNombre} ${eApellido} matriculado/a`); }
    setEditEstId(null); resetEst(); setModal(null);
  };
  const delEst = async () => {
    if (!editEstId) return;
    const e = estudiantes.find((x) => x.id === editEstId);
    await db.estudiantes.delete(editEstId);
    setEditEstId(null); setModal(null);
    showToast(`${e?.nombre} ${e?.apellido} eliminado/a`);
  };

  const calcEdad = (nac: string) => {
    if (!nac) return '';
    const n = new Date(nac), h = new Date();
    let edad = h.getFullYear() - n.getFullYear();
    const m = h.getMonth() - n.getMonth();
    if (m < 0 || (m === 0 && h.getDate() < n.getDate())) edad--;
    return String(edad);
  };

  const autoFillOrigen = (origen: 'convertido' | 'miembro' | 'manual', id: string) => {
    if (!id) return;
    if (origen === 'convertido') {
      const c = conversiones.find(x => x.id === id);
      if (!c) return;
      setENombre(c.nombre); setEApellido(c.apellido); setETel(c.telefono); setEEdad(c.edad);
      setEZona(c.zona || ''); setEGrupoId(c.grupoId || '');
      const hm = miembros.find(m => `${m.nombre} ${m.apellido}` === c.lider);
      setEHermanoMayorId(hm ? hm.id : c.hermanoMayorId || '');
      setEEmail(c.email || ''); setEDireccion(c.direccion || ''); setEProfesion(c.profesion || '');
      setEBautizado(!!c.bautizado); setEFechaBautismo(c.fechaBautismo || '');
      setEConyuge(c.conyuge || ''); setEHijos(c.hijos || '');
    } else if (origen === 'miembro') {
      const m = miembros.find(x => x.id === id);
      if (!m) return;
      setENombre(m.nombre); setEApellido(m.apellido); setETel(m.telefono); setEEdad(calcEdad(m.fechaNacimiento));
      setEZona(m.zona); setEGrupoId(m.grupoId || ''); setEEmail(m.email);
      setEDireccion(m.direccion); setEProfesion(m.profesion);
      setEBautizado(!!m.bautizado); setEFechaBautismo(m.fechaBautismo || '');
      setEConyuge(m.conyuge || ''); setEHijos(m.hijos || '');
    }
  };

  // -- Certificados CRUD --
  const openNewCert = () => { setEditCertId(null); resetCert(); setModal('cert'); };
  const openEditCert = (id: string) => {
    const c = certs.find((x) => x.id === id); if (!c) return;
    setEditCertId(id); setCertEst(c.estId); setCertCurso(c.cursoId); setCertFecha(c.fecha); setCertCal(c.calificacion); setCertObs(c.observaciones);
    setModal('cert');
  };
  const saveCert = async () => {
    if (!certEst) return showToast('Selecciona un estudiante');
    if (!certCurso) return showToast('Selecciona un curso');
    const data = { estId: certEst, cursoId: certCurso, fecha: certFecha, calificacion: certCal as Certificado['calificacion'], observaciones: certObs.trim() };
    if (editCertId) { await db.certificados.update(editCertId, data); showToast('Certificado actualizado'); }
    else {
      await db.estudiantes.update(certEst, { estado: 'Completado' as const });
      await db.certificados.add(createBaseRecord({ id: uuid(), emitido: today(), ...data }));
      showToast('¡Certificado emitido!');
    }
    setEditCertId(null); resetCert(); setModal(null);
  };
  const delCert = async () => {
    if (!editCertId) return;
    await db.certificados.delete(editCertId);
    setEditCertId(null); setModal(null);
    showToast('Certificado eliminado');
  };

  const filteredCursos = cursos.filter((c) => {
    const s = search.toLowerCase();
    return (!s || c.nombre.toLowerCase().includes(s) || c.instructor.toLowerCase().includes(s)) && (!filterNivel || c.nivel === filterNivel) && (!filterCursoEstado || c.estado === filterCursoEstado);
  });

  const filteredEst = estudiantes.filter((e) => {
    const full = `${e.nombre} ${e.apellido} ${e.telefono}`.toLowerCase();
    return (!q(search, full)) && (!filterCursoEst || e.cursoId === filterCursoEst) && (!filterEstadoEst || e.estado === filterEstadoEst) && (!filterOrigenEst || e.origen === filterOrigenEst) && (!filterZonaEst || e.zona === filterZonaEst) && (!filterGrupoEst || e.grupoId === filterGrupoEst) && (!filterBautizadoEst || (filterBautizadoEst === 'si' ? e.bautizado : !e.bautizado));
  });

  const viewCurso = viewCursoId ? cursos.find((c) => c.id === viewCursoId) : null;
  const viewLeccs = viewCursoId ? lecciones.filter((l) => l.cursoId === viewCursoId).sort((a, b) => a.numero - b.numero) : [];
  const viewEsts = viewCursoId ? estudiantes.filter((e) => e.cursoId === viewCursoId) : [];

  return (
    <Layout title="Academia del Espíritu">
      <div className="page-academia">
      <div className="kpis">
        <KpiCard label="Cursos Activos" value={activos} icon="📚" accent="var(--academia-teal)" sub={`de ${cursos.length} total`} />
        <KpiCard label="Estudiantes" value={estudiantes.length} icon="🎓" accent="var(--oro-apostolico)" sub="matriculados" />
        <KpiCard label="Certificados" value={certs.length} icon="🏆" accent="var(--oro-luz)" sub="emitidos" />
        <KpiCard label="Lecciones Totales" value={totalLecc} icon="📝" accent="var(--academia-pergamino)" sub="en todos los cursos" />
      </div>

      <div className="tabs">
        <button className={`tab ${tab === 'cursos' ? 'active' : ''}`} onClick={() => setTab('cursos')}>📚 Cursos</button>
        <button className={`tab ${tab === 'estudiantes' ? 'active' : ''}`} onClick={() => setTab('estudiantes')}>🎓 Estudiantes</button>
        <button className={`tab ${tab === 'certificados' ? 'active' : ''}`} onClick={() => setTab('certificados')}>🏆 Certificados</button>
      </div>

      {tab === 'cursos' && (
        <CursosTab
          cursos={cursos}
          lecciones={lecciones}
          estudiantes={estudiantes}
          filteredCursos={filteredCursos}
          search={search} setSearch={setSearch}
          filterNivel={filterNivel} setFilterNivel={setFilterNivel}
          filterCursoEstado={filterCursoEstado} setFilterCursoEstado={setFilterCursoEstado}
          openNewCurso={openNewCurso}
          openNewLeccion={openNewLeccion}
          openEditCurso={openEditCurso}
          onVerCurso={(id) => { setViewCursoId(id); setModal('ver'); }}
          onMatricular={(id) => { openNewEst(); setTimeout(() => setECurso(id), 50); }}
        />
      )}

      {tab === 'estudiantes' && (
        <EstudiantesTab
          estudiantes={estudiantes}
          filteredEst={filteredEst}
          cursos={cursos}
          zonas={zonas}
          grupos={grupos}
          search={search} setSearch={setSearch}
          filterCursoEst={filterCursoEst} setFilterCursoEst={setFilterCursoEst}
          filterEstadoEst={filterEstadoEst} setFilterEstadoEst={setFilterEstadoEst}
          filterOrigenEst={filterOrigenEst} setFilterOrigenEst={setFilterOrigenEst}
          filterZonaEst={filterZonaEst} setFilterZonaEst={setFilterZonaEst}
          filterGrupoEst={filterGrupoEst} setFilterGrupoEst={setFilterGrupoEst}
          filterBautizadoEst={filterBautizadoEst} setFilterBautizadoEst={setFilterBautizadoEst}
          openNewEst={openNewEst}
          openEditEst={openEditEst}
          onVerEst={(id) => { setViewEstId(id); setModal('estDetail'); }}
          onCertificar={(e) => { openNewCert(); setTimeout(() => { setCertEst(e.id); setCertCurso(e.cursoId); }, 50); }}
        />
      )}

      {tab === 'certificados' && (
        <CertificadosTab
          certs={certs}
          estudiantes={estudiantes}
          cursos={cursos}
          openNewCert={openNewCert}
          openEditCert={openEditCert}
        />
      )}

      <CursoFormModal
        open={modal === 'curso'}
        onClose={() => setModal(null)}
        editCursoId={editCursoId}
        delCurso={delCurso}
        saveCurso={saveCurso}
        cNombre={cNombre} setCNombre={setCNombre}
        cNivel={cNivel} setCNivel={setCNivel}
        cDur={cDur} setCDur={setCDur}
        cInst={cInst} setCInst={setCInst}
        cEmoji={cEmoji} setCEmoji={setCEmoji}
        cColor={cColor} setCColor={setCColor}
        cEstado={cEstado} setCEstado={setCEstado}
        cDesc={cDesc} setCDesc={setCDesc}
      />

      <LeccionFormModal
        open={modal === 'leccion'}
        onClose={() => setModal(null)}
        editLecId={editLecId}
        delLeccion={delLeccion}
        saveLeccion={saveLeccion}
        cursos={cursos}
        lCurso={lCurso} setLCurso={setLCurso}
        lTitulo={lTitulo} setLTitulo={setLTitulo}
        lNum={lNum} setLNum={setLNum}
        lDur={lDur} setLDur={setLDur}
        lDesc={lDesc} setLDesc={setLDesc}
      />

      <CursoDetailModal
        open={modal === 'ver'}
        onClose={() => setModal(null)}
        viewCurso={viewCurso}
        viewLeccs={viewLeccs}
        viewEsts={viewEsts}
        onEditarCurso={() => { setModal(null); if (viewCursoId) openEditCurso(viewCursoId); }}
        onNuevaLeccion={() => { setModal(null); openNewLeccion(); setTimeout(() => setLCurso(viewCursoId || ''), 50); }}
        onMatricular={() => { setModal(null); openNewEst(); setTimeout(() => setECurso(viewCursoId || ''), 50); }}
        onEditarLeccion={(id) => { setModal(null); openEditLeccion(id); }}
      />

      <EstudianteFormModal
        open={modal === 'est'}
        onClose={() => setModal(null)}
        editEstId={editEstId}
        delEst={delEst}
        saveEst={saveEst}
        autoFillOrigen={autoFillOrigen}
        conversiones={conversiones}
        miembros={miembros}
        grupos={grupos}
        cursos={cursos}
        eOrigen={eOrigen} setEOrigen={setEOrigen}
        eOrigenId={eOrigenId} setEOrigenId={setEOrigenId}
        eNombre={eNombre} setENombre={setENombre}
        eApellido={eApellido} setEApellido={setEApellido}
        eEdad={eEdad} setEEdad={setEEdad}
        eProfesion={eProfesion} setEProfesion={setEProfesion}
        eTel={eTel} setETel={setETel}
        eEmail={eEmail} setEEmail={setEEmail}
        eDireccion={eDireccion} setEDireccion={setEDireccion}
        eZona={eZona} setEZona={setEZona}
        eGrupoId={eGrupoId} setEGrupoId={setEGrupoId}
        eHermanoMayorId={eHermanoMayorId} setEHermanoMayorId={setEHermanoMayorId}
        eBautizado={eBautizado} setEBautizado={setEBautizado}
        eFechaBautismo={eFechaBautismo} setEFechaBautismo={setEFechaBautismo}
        eConyuge={eConyuge} setEConyuge={setEConyuge}
        eHijos={eHijos} setEHijos={setEHijos}
        eCurso={eCurso} setECurso={setECurso}
        eFecha={eFecha} setEFecha={setEFecha}
        eEstado={eEstado} setEEstado={setEEstado}
        eNotas={eNotas} setENotas={setENotas}
      />

      <EstudianteDetailModal
        open={modal === 'estDetail' && !!selEst}
        onClose={() => setModal(null)}
        selEst={selEst}
        selEstData={selEstData}
        cursos={cursos}
        qhTipo={qhTipo} setQHTipo={setQHTipo}
        qhDesc={qhDesc} setQHDesc={setQHDesc}
        qhFecha={qhFecha} setQHFecha={setQHFecha}
        saveHito={saveHito}
        resetHito={resetHito}
        onEditarPerfil={() => { setModal(null); if (selEst) openEditEst(selEst.id); }}
        onEliminar={() => { setModal(null); if (selEst) { setEditEstId(selEst.id); setModal('est'); } }}
      />

      <CertificadoFormModal
        open={modal === 'cert'}
        onClose={() => setModal(null)}
        editCertId={editCertId}
        delCert={delCert}
        saveCert={saveCert}
        estudiantes={estudiantes}
        cursos={cursos}
        certEst={certEst} setCertEst={setCertEst}
        certCurso={certCurso} setCertCurso={setCertCurso}
        certFecha={certFecha} setCertFecha={setCertFecha}
        certCal={certCal} setCertCal={setCertCal}
        certObs={certObs} setCertObs={setCertObs}
      />
      </div>
    </Layout>
  );
}
