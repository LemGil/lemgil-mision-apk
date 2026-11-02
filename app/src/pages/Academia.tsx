import { useState, useMemo } from 'react';
import { v4 as uuid } from 'uuid';
import { useLiveQuery } from 'dexie-react-hooks';
import { Layout } from '../components/Layout';
import { KpiCard } from '../components/KpiCard';
import { db } from '../lib/database';
import { createBaseRecord } from '../lib/utils/recordHelpers';
import type { Curso, Estudiante, Certificado } from '../lib/types';
import { estudianteConDatos, mapaPersonas, miembroConDatos, nombreDePersona } from '../lib/personaDatos';
import { asegurarPersonaDeEstudiante } from '../lib/personas';
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
   const estudiantesCrudos = useLiveQuery(() => db.estudiantes.toArray(), []) ?? [];
   const personas = useLiveQuery(() => db.personas.toArray(), []) ?? [];
   // P3 (ficha única): lo que se PINTA resuelve los datos personales desde
   // el núcleo `personas` (única fuente). Las escrituras usan las fichas
   // crudas; las vistas (lista, detalle, certificados y sus PDF/CSV) usan
   // las decoradas, así que el nombre/contacto sale siempre de la persona.
   const personasMap = useMemo(() => mapaPersonas(personas), [personas]);
   const estudiantes = useMemo(() => estudiantesCrudos.map((e) => estudianteConDatos(e, personasMap)), [estudiantesCrudos, personasMap]);
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
     // P3: el «origen» murió — lo que expresaba lo dice ahora la persona:
     // sus otros procesos (su conversión y/o su miembro) se buscan por el
     // personaId compartido, no por una copia guardada al matricular.
     const conversionDePersona = selEst.personaId ? (conversiones.find(c => c.personaId === selEst.personaId) ?? null) : null;
     const miembroDePersona = selEst.personaId ? (miembros.find(m => m.personaId === selEst.personaId) ?? null) : null;
     const grupo = grupos.find(g => g.id === selEst.grupoId);
     // El hermano mayor decorado ya es un personas.id; si es un id viejo
     // de miembro (ficha sin enlazar), se resuelve por su ficha decorada.
     let hermanoMayorNombre = selEst.hermanoMayorId ? nombreDePersona(personasMap, selEst.hermanoMayorId) : '';
     if (!hermanoMayorNombre && selEst.hermanoMayorId) {
       const hm = miembros.find(m => m.id === selEst.hermanoMayorId);
       if (hm) { const d = miembroConDatos(hm, personasMap); hermanoMayorNombre = `${d.nombre} ${d.apellido}`.trim(); }
     }
     return { myCerts, myCurso, totalCursos, iniciales, studentHitos, conversionDePersona, miembroDePersona, grupo, hermanoMayorNombre };
   }, [selEst, certs, cursos, allHitos, conversiones, miembros, grupos, personasMap]);

  
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
  // P3: el formulario del estudiante solo guarda la PERSONA elegida y los
  // datos del proceso (curso, fecha, estado, notas). Los personales viven
  // en el núcleo y se teclean en el formulario de la persona, una vez.
  const [ePersonaId, setEPersonaId] = useState('');
  const [eCurso, setECurso] = useState('');
  const [eFecha, setEFecha] = useState(today());
  const [eEstado, setEEstado] = useState('Activo');
  const [eNotas, setENotas] = useState('');
  const [certEst, setCertEst] = useState('');
  const [certCurso, setCertCurso] = useState('');
  const [certFecha, setCertFecha] = useState(today());
  const [certCal, setCertCal] = useState('Aprobado');
  const [certObs, setCertObs] = useState('');

  const resetCurso = () => { setCNombre(''); setCNivel('Basico'); setCDur(''); setCInst(''); setCEmoji('📖'); setCColor('rgba(122,95,192,0.25)'); setCEstado('Activo'); setCDesc(''); };
  const resetLeccion = () => { setLCurso(''); setLTitulo(''); setLNum(''); setLDur(''); setLDesc(''); };
  const resetEst = () => {
    setEPersonaId('');
    setECurso(''); setEFecha(today()); setEEstado('Activo'); setENotas('');
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
  const openEditEst = async (id: string) => {
    const e = estudiantesCrudos.find((x) => x.id === id); if (!e) return;
    setEditEstId(id);
    // La persona se hereda del proceso; si es un estudiante viejo aún sin
    // persona (llegó de un equipo sin actualizar), se le asegura la suya
    // con la regla determinista del diseño (id = el del propio estudiante,
    // núcleo nacido de sus datos dormidos) y queda elegida en el selector.
    const personaId = await asegurarPersonaDeEstudiante(e);
    setEPersonaId(personaId);
    setECurso(e.cursoId); setEFecha(e.fecha); setEEstado(e.estado); setENotas(e.notas);
    setModal('est');
  };
  const saveEst = async () => {
    if (!ePersonaId) return showToast('Elige la persona de este estudiante (o créala con «➕ Nueva persona»)');
    const persona = personas.find((p) => p.id === ePersonaId);
    if (!persona) return showToast('La persona elegida ya no existe');
    if (!eCurso) return showToast('Selecciona un curso');
    const nombrePersona = `${persona.nombre} ${persona.apellido}`;
    // Solo datos del PROCESO: la identidad vive en la persona enlazada.
    const data = { cursoId: eCurso, fecha: eFecha, estado: eEstado as Estudiante['estado'], notas: eNotas.trim(), personaId: ePersonaId };
    if (editEstId) { await db.estudiantes.update(editEstId, data); showToast(`${nombrePersona} actualizado/a`); }
    else {
      // El proceso nace SIN datos personales (vacíos a propósito) y SIN
      // origen/origenId: murieron en P3 — la persona ES el origen.
      const nuevo: Estudiante = {
        id: uuid(), nombre: '', apellido: '', telefono: '', edad: '', email: '', direccion: '', zona: '',
        profesion: '', bautizado: false, fechaBautismo: '', conyuge: '', hijos: '', numeroIdentidad: undefined,
        grupoId: null, hermanoMayorId: null,
        ...data, creado: today(), version: 1,
      };
      await db.estudiantes.add(createBaseRecord(nuevo));
      showToast(`${nombrePersona} matriculado/a`);
    }
    setEditEstId(null); resetEst(); setModal(null);
  };
  const delEst = async () => {
    if (!editEstId) return;
    const e = estudiantes.find((x) => x.id === editEstId);
    await db.estudiantes.delete(editEstId);
    setEditEstId(null); setModal(null);
    showToast(`${e?.nombre} ${e?.apellido} eliminado/a`);
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
    return (!q(search, full)) && (!filterCursoEst || e.cursoId === filterCursoEst) && (!filterEstadoEst || e.estado === filterEstadoEst) && (!filterZonaEst || e.zona === filterZonaEst) && (!filterGrupoEst || e.grupoId === filterGrupoEst) && (!filterBautizadoEst || (filterBautizadoEst === 'si' ? e.bautizado : !e.bautizado));
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
        personas={personas}
        grupos={grupos}
        cursos={cursos}
        ePersonaId={ePersonaId} setEPersonaId={setEPersonaId}
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
