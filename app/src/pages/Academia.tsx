import { useState, useMemo } from 'react';
import { v4 as uuid } from 'uuid';
import { useLiveQuery } from 'dexie-react-hooks';
import { Layout } from '../components/Layout';
import { KpiCard } from '../components/KpiCard';
import { exportCSV } from '../lib/csvExport';
import { Modal } from '../components/Modal';
import { EmptyState } from '../components/EmptyState';
import { ZonaSelect } from '../components/ZonaSelect';
import { db } from '../lib/database';
import type { Curso, Estudiante, Certificado } from '../lib/types';
import { 
  exportEstudiantesPDF, 
  exportCursosPDF 
} from '../lib/pdfExport';
import { CsvImportButton } from '../components/CsvImportButton';

const NIVEL_BADGE: Record<string, string> = { Basico: 'badge-blue', Intermedio: 'badge-yellow', Avanzado: 'badge-red' };
const EST_BADGE: Record<string, string> = { Activo: 'badge-green', Completado: 'badge-purple', Pausado: 'badge-yellow' };
const CAL_BADGE: Record<string, string> = { Aprobado: 'badge-green', Sobresaliente: 'badge-purple', 'Con Honores': 'badge-yellow' };
const today = () => new Date().toISOString().split('T')[0];
const fmt = (d: string) => { if (!d) return '—'; const [y, m, dy] = d.split('-'); const ms = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']; return `${+dy} ${ms[+m - 1]} ${y}`; };

type Tab = 'cursos' | 'estudiantes' | 'certificados';

function q(search: string, text: string) {
  return search && !text.toLowerCase().includes(search.toLowerCase());
}

export default function Academia() {
   const cursos = useLiveQuery(() => db.cursos.toArray(), []) ?? [];
   const lecciones = useLiveQuery(() => db.lecciones.toArray(), []) ?? [];
   const estudiantes = useLiveQuery(() => db.estudiantes.toArray(), []) ?? [];
   const certs = useLiveQuery(() => db.certificados.toArray(), []) ?? [];
   const allHitos = useLiveQuery(() => db.hitos.toArray(), []) ?? [];
   const miembros = useLiveQuery(() => db.miembros.toArray(), []) ?? [];
   const conversiones = useLiveQuery(() => db.conversiones.toArray(), []) ?? [];
   const grupos = useLiveQuery(() => db.grupos.toArray(), []) ?? [];

  const [tab, setTab] = useState<Tab>('cursos');
  const [search, setSearch] = useState('');
  const [filterNivel, setFilterNivel] = useState('');
  const [filterCursoEst, setFilterCursoEst] = useState('');
  const [filterEstadoEst, setFilterEstadoEst] = useState('');
  const [modal, setModal] = useState<null | 'curso' | 'leccion' | 'ver' | 'est' | 'cert' | 'estDetail'>(null);
  const [editCursoId, setEditCursoId] = useState<string | null>(null);
  const [editLecId, setEditLecId] = useState<string | null>(null);
  const [editEstId, setEditEstId] = useState<string | null>(null);
  const [editCertId, setEditCertId] = useState<string | null>(null);
  const [viewCursoId, setViewCursoId] = useState<string | null>(null);
   const [viewEstId, setViewEstId] = useState<string | null>(null);
   const [toast, setToast] = useState('');

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

   const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3200); };


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
     await db.hitos.add(data);
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
    else { await db.cursos.add({ id: uuid(), creado: today(), ...data }); showToast(`Curso "${cNombre}" creado`); }
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
    else { await db.lecciones.add({ id: uuid(), creado: today(), ...data }); showToast(`Lección "${lTitulo}" agregada`); }
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
    else { await db.estudiantes.add({ id: uuid(), creado: today(), ...data }); showToast(`${eNombre} ${eApellido} matriculado/a`); }
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
      await db.certificados.add({ id: uuid(), emitido: today(), ...data });
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
    return (!s || c.nombre.toLowerCase().includes(s) || c.instructor.toLowerCase().includes(s)) && (!filterNivel || c.nivel === filterNivel);
  });

  const filteredEst = estudiantes.filter((e) => {
    const full = `${e.nombre} ${e.apellido} ${e.telefono}`.toLowerCase();
    return (!q(search, full)) && (!filterCursoEst || e.cursoId === filterCursoEst) && (!filterEstadoEst || e.estado === filterEstadoEst);
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

      {/* TAB: Cursos */}
      {tab === 'cursos' && <>
        <div className="actions-row">
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary btn-sm" onClick={() => exportCursosPDF({ cursos, lecciones })}>📄 Exportar PDF</button>
            <button className="btn btn-secondary btn-sm" onClick={() => {
              if (!cursos.length) return showToast('No hay cursos para exportar');
              const h = ['Nombre', 'Instructor', 'Nivel', 'Estado', 'Lecciones', 'Duración'];
              const r = cursos.map(c => {
                const count = lecciones.filter(l => l.cursoId === c.id).length;
                return [c.nombre, c.instructor || '', c.nivel || '', c.estado || '', count, c.duracion || ''];
              });
              exportCSV(h, r, 'lemgil-cursos.csv');
              showToast('CSV exportado');
            }}>📥 Exportar CSV</button>
            <CsvImportButton<Curso>
              table="cursos"
              fieldMapping={{
                'Nombre': 'nombre',
                'Instructor': 'instructor',
                'Nivel': 'nivel',
                'Estado': 'estado',
                'Duración': 'duracion',
                'Descripción': 'descripcion',
                'Emoji': 'emoji',
                'Color': 'color',
              }}
              requiredFields={['nombre']}
              defaults={{ nivel: 'Basico', estado: 'Activo', emoji: '📚', color: '#3b82f6' }}
              onImport={(n) => showToast(`${n} curso(s) importado(s)`)}
            />
            <button className="btn btn-gold" onClick={openNewCurso}>➕ Nuevo Curso</button>
            <button className="btn btn-secondary" onClick={openNewLeccion}>📝 Agregar Lección</button>
          </div>
        </div>
        <div className="search-bar">
          <input className="search-input" placeholder="🔍 Buscar curso…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <select className="filter-select" value={filterNivel} onChange={(e) => setFilterNivel(e.target.value)}>
            <option value="">Todos los niveles</option>
            <option>Basico</option><option>Intermedio</option><option>Avanzado</option>
          </select>
        </div>
        {filteredCursos.length === 0 ? (
          <EmptyState icon="📚" title={cursos.length ? 'Sin resultados' : 'Sin cursos aún'} sub={cursos.length ? 'Prueba otros filtros' : 'Crea el primer curso de la Academia'} />
        ) : (
          <div className="grid-3">
            {filteredCursos.map((c) => {
              const lecs = lecciones.filter((l) => l.cursoId === c.id);
              const ests = estudiantes.filter((e) => e.cursoId === c.id);
              return (
                <div key={c.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', cursor: 'pointer', transition: 'border-color .2s, transform .2s' }}>
                  <div style={{ height: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 38, background: c.color, position: 'relative' }}>
                    {c.emoji}
                    <div style={{ position: 'absolute', top: 8, right: 8 }}><span className={`badge ${NIVEL_BADGE[c.nivel] || 'badge-blue'}`}>{c.nivel}</span></div>
                    {c.estado !== 'Activo' && <div style={{ position: 'absolute', top: 8, left: 8 }}><span className="badge badge-yellow">{c.estado}</span></div>}
                  </div>
                  <div style={{ padding: 14 }}>
                    <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 3 }}>{c.nombre}</div>
                    <div style={{ fontSize: 11, color: 'var(--dim)', marginBottom: 10 }}>👤 {c.instructor}{c.duracion && ` · ${c.duracion} sem`} · 📝 {lecs.length} lecciones · 🎓 {ests.length} estudiantes</div>
                    {c.descripcion && <div style={{ fontSize: 12, color: 'var(--dim)', marginBottom: 8, lineHeight: 1.5 }}>{c.descripcion.slice(0, 80)}{c.descripcion.length > 80 ? '…' : ''}</div>}
                    <div className="progress-bar"><div className="progress-fill" style={{ width: `${Math.min(100, lecs.length * 8)}%`, background: 'var(--purple)' }} /></div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => { setViewCursoId(c.id); setModal('ver'); }}>👁 Ver</button>
                      <button className="btn btn-secondary btn-sm" onClick={() => openEditCurso(c.id)}>✏️ Editar</button>
                      <button className="btn btn-gold btn-sm" onClick={() => { openNewEst(); setTimeout(() => setECurso(c.id), 50); }}>🎓 Matricular</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </>}

      {/* TAB: Estudiantes */}
      {tab === 'estudiantes' && <>
        <div className="actions-row">
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary btn-sm" onClick={() => exportEstudiantesPDF({ estudiantes, filtros: { curso: filterCursoEst, estado: filterEstadoEst } })}>📄 Exportar PDF</button>
            <button className="btn btn-gold" onClick={openNewEst}>➕ Matricular Estudiante</button>
          </div>
        </div>
        <div className="search-bar">
          <input className="search-input" placeholder="🔍 Buscar estudiante…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <select className="filter-select" value={filterCursoEst} onChange={(e) => setFilterCursoEst(e.target.value)}>
            <option value="">Todos los cursos</option>
            {cursos.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
          <select className="filter-select" value={filterEstadoEst} onChange={(e) => setFilterEstadoEst(e.target.value)}>
            <option value="">Todos los estados</option>
            <option>Activo</option><option>Completado</option><option>Pausado</option>
          </select>
        </div>
        <div className="card">
           <div className="card-header">
             <div className="card-title">🎓 Registro de Estudiantes</div>
             <div style={{ fontSize: 12, color: 'var(--dim)' }}>{estudiantes.length} estudiantes</div>
           </div>
           <div style={{ display: 'flex', gap: 8, padding: '0 16px', marginBottom: 12 }}>
             <button className="btn btn-secondary btn-sm" onClick={() => exportEstudiantesPDF({ estudiantes, filtros: { curso: filterCursoEst, estado: filterEstadoEst } })}>📄 Exportar PDF</button>
              <button className="btn btn-secondary btn-sm" onClick={() => {
                if (!filteredEst.length) return showToast('No hay estudiantes para exportar');
                const h = ['#', 'Nombre', 'Apellido', 'Curso', 'Teléfono', 'Email', 'Estado'];
                const r = filteredEst.map((e, i) => {
                  const curso = cursos.find(c => c.id === e.cursoId);
                  return [i + 1, e.nombre, e.apellido, curso?.nombre || '', e.telefono || '', e.email || '', e.estado || ''];
                });
                exportCSV(h, r, 'lemgil-estudiantes.csv');
                showToast('CSV exportado');
              }}>📥 Exportar CSV</button>
              <CsvImportButton<Estudiante>
                table="estudiantes"
                fieldMapping={{
                  'Nombre': 'nombre',
                  'Apellido': 'apellido',
                  'Teléfono': 'telefono',
                  'Email': 'email',
                  'Curso': 'cursoId',
                  'Estado': 'estado',
                  'Zona': 'zona',
                  'Dirección': 'direccion',
                  'Profesión': 'profesion',
                  'Notas': 'notas',
                }}
                requiredFields={['nombre', 'apellido']}
                defaults={{ estado: 'Activo', origen: 'manual' }}
                onImport={(n) => showToast(`${n} estudiante(s) importado(s)`)}
              />
           </div>
          {filteredEst.length === 0 ? (
            <EmptyState icon="🎓" title={estudiantes.length ? 'Sin resultados' : 'Sin estudiantes aún'} sub={estudiantes.length ? 'Prueba otros filtros' : 'Matricula el primer estudiante'} />
          ) : (
            <table className="data-table">
              <thead><tr><th>#</th><th>Nombre</th><th>Curso</th><th>Inicio</th><th>Estado</th><th>Acciones</th></tr></thead>
              <tbody>
                {filteredEst.map((e, i) => {
                  const curso = cursos.find((c) => c.id === e.cursoId);
                  return (
                    <tr key={e.id}>
                      <td style={{ color: 'var(--dim)' }}>{i + 1}</td>
                      <td><strong>{e.nombre} {e.apellido}</strong>{e.telefono && <><br /><span style={{ fontSize: 10, color: 'var(--dim)' }}>{e.telefono}</span></>}</td>
                      <td>{curso ? `${curso.emoji} ${curso.nombre}` : '—'}</td>
                      <td>{fmt(e.fecha)}</td>
                      <td><span className={`badge ${EST_BADGE[e.estado] || 'badge-blue'}`}>{e.estado}</span></td>
                       <td>
                         <div style={{ display: 'flex', gap: 5 }}>
                           <button className="btn btn-secondary btn-sm" onClick={() => { setViewEstId(e.id); setModal('estDetail'); }}>👁 Ver</button>
                           <button className="btn btn-secondary btn-sm" onClick={() => openEditEst(e.id)}>✏️ Editar</button>
                           <button className="btn btn-gold btn-sm" onClick={() => { openNewCert(); setTimeout(() => { setCertEst(e.id); setCertCurso(e.cursoId); }, 50); }}>🏆 Cert.</button>
                         </div>
                       </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </>}

      {/* TAB: Certificados */}
      {tab === 'certificados' && <>
        <div className="actions-row"><button className="btn btn-gold" onClick={openNewCert}>🏆 Emitir Certificado</button></div>
        <div className="card">
          <div className="card-header">
            <div className="card-title">🏆 Certificados Emitidos</div>
            <div style={{ fontSize: 12, color: 'var(--dim)' }}>{certs.length} certificados</div>
          </div>
          {certs.length === 0 ? (
            <EmptyState icon="🏆" title="Sin certificados aún" sub="Emite el primer certificado" />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
              {certs.map((c) => {
                const est = estudiantes.find((e) => e.id === c.estId);
                const curso = cursos.find((x) => x.id === c.cursoId);
                return (
                  <div key={c.id} style={{ background: 'linear-gradient(135deg, var(--surface), var(--surface-2))', border: '1px solid var(--gold)', borderRadius: 12, padding: 16, position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, background: 'var(--gold-glow)', borderRadius: '50%' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontFamily: "'Cinzel', serif", fontSize: 15, fontWeight: 700, color: 'var(--gold)' }}>{est ? `${est.nombre} ${est.apellido}` : '—'}</div>
                        <div style={{ fontSize: 12, color: 'var(--dim)', marginTop: 3 }}>{curso ? `${curso.emoji} ${curso.nombre}` : '—'}</div>
                        <div style={{ fontSize: 11, color: 'var(--gold-deep)', marginTop: 6 }}>📅 {fmt(c.fecha)}</div>
                      </div>
                      <span className={`badge ${CAL_BADGE[c.calificacion] || 'badge-green'}`} style={{ marginTop: 4 }}>{c.calificacion}</span>
                    </div>
                    {c.observaciones && <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 8 }}>{c.observaciones}</div>}
                    <div style={{ marginTop: 10 }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => openEditCert(c.id)}>✏️ Editar</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </>}

      {/* MODAL: Curso */}
      <Modal open={modal === 'curso'} onClose={() => setModal(null)} title={editCursoId ? '✏️ Editar Curso' : '📚 Nuevo Curso'} footer={<>{editCursoId && <button className="btn btn-danger btn-sm" style={{ marginRight: 'auto' }} onClick={delCurso}>🗑️ Eliminar</button>}<button className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button><button className="btn btn-gold" onClick={saveCurso}>{editCursoId ? '💾 Guardar Cambios' : '💾 Crear Curso'}</button></>}>
        <div className="form-row">
          <div className="form-group" style={{ gridColumn: 'span 2' }}><label className="form-label">Nombre del Curso *</label><input className="form-input" value={cNombre} onChange={(e) => setCNombre(e.target.value)} placeholder="Ej: Cristología Bíblica" /></div>
          <div className="form-group"><label className="form-label">Nivel</label><select className="form-select" value={cNivel} onChange={(e) => setCNivel(e.target.value)}><option>Basico</option><option>Intermedio</option><option>Avanzado</option></select></div>
          <div className="form-group"><label className="form-label">Duración (semanas)</label><input className="form-input" type="number" value={cDur} onChange={(e) => setCDur(e.target.value)} placeholder="8" min="1" /></div>
          <div className="form-group"><label className="form-label">Instructor *</label><input className="form-input" value={cInst} onChange={(e) => setCInst(e.target.value)} placeholder="Nombre del instructor" /></div>
          <div className="form-group"><label className="form-label">Emoji / Ícono</label><input className="form-input" value={cEmoji} onChange={(e) => setCEmoji(e.target.value)} placeholder="📖" maxLength={4} /></div>
          <div className="form-group"><label className="form-label">Color de fondo</label><select className="form-select" value={cColor} onChange={(e) => setCColor(e.target.value)}><option value="rgba(122,95,192,0.25)">🟣 Púrpura</option><option value="rgba(76,175,125,0.25)">🟢 Verde</option><option value="rgba(201,146,42,0.25)">🟡 Dorado</option><option value="rgba(74,127,212,0.25)">🔵 Azul</option><option value="rgba(224,85,85,0.25)">🔴 Rojo</option></select></div>
          <div className="form-group"><label className="form-label">Estado</label><select className="form-select" value={cEstado} onChange={(e) => setCEstado(e.target.value)}><option>Activo</option><option>Borrador</option><option>Archivado</option></select></div>
        </div>
        <div className="form-group" style={{ marginTop: 12 }}><label className="form-label">Descripción</label><textarea className="form-textarea" value={cDesc} onChange={(e) => setCDesc(e.target.value)} placeholder="Describe el contenido y objetivos del curso…" /></div>
      </Modal>

      {/* MODAL: Lección */}
      <Modal open={modal === 'leccion'} onClose={() => setModal(null)} title={editLecId ? '✏️ Editar Lección' : '📝 Agregar Lección'} footer={<>{editLecId && <button className="btn btn-danger btn-sm" style={{ marginRight: 'auto' }} onClick={delLeccion}>🗑️ Eliminar</button>}<button className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button><button className="btn btn-gold" onClick={saveLeccion}>💾 Guardar Lección</button></>}>
        <div className="form-row">
          <div className="form-group" style={{ gridColumn: 'span 2' }}><label className="form-label">Curso *</label><select className="form-select" value={lCurso} onChange={(e) => setLCurso(e.target.value)}><option value="">Seleccionar curso…</option>{cursos.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select></div>
          <div className="form-group" style={{ gridColumn: 'span 2' }}><label className="form-label">Título de la Lección *</label><input className="form-input" value={lTitulo} onChange={(e) => setLTitulo(e.target.value)} placeholder="Ej: La naturaleza divina de Cristo" /></div>
          <div className="form-group"><label className="form-label">Número de Lección</label><input className="form-input" type="number" value={lNum} onChange={(e) => setLNum(e.target.value)} placeholder="1" min="1" /></div>
          <div className="form-group"><label className="form-label">Duración (min)</label><input className="form-input" type="number" value={lDur} onChange={(e) => setLDur(e.target.value)} placeholder="45" min="1" /></div>
        </div>
        <div className="form-group" style={{ marginTop: 12 }}><label className="form-label">Descripción / Contenido</label><textarea className="form-textarea" value={lDesc} onChange={(e) => setLDesc(e.target.value)} placeholder="Temas, referencias bíblicas, objetivos de la lección…" /></div>
      </Modal>

      {/* MODAL: Ver Curso */}
      <Modal open={modal === 'ver'} onClose={() => setModal(null)} title={`${viewCurso?.emoji || '📖'} ${viewCurso?.nombre || ''}`} wide footer={<><button className="btn btn-secondary btn-sm" onClick={() => { setModal(null); if (viewCursoId) openEditCurso(viewCursoId); }}>✏️ Editar Curso</button><button className="btn btn-gold btn-sm" onClick={() => { setModal(null); openNewLeccion(); setTimeout(() => setLCurso(viewCursoId || ''), 50); }}>📝 + Lección</button><button className="btn btn-gold" onClick={() => { setModal(null); openNewEst(); setTimeout(() => setECurso(viewCursoId || ''), 50); }}>🎓 Matricular</button></>}>
        {viewCurso && <>
          <div className="detail-row"><span className="detail-label">Instructor</span><span className="detail-value">{viewCurso.instructor}</span></div>
          <div className="detail-row"><span className="detail-label">Nivel</span><span className="detail-value"><span className={`badge ${NIVEL_BADGE[viewCurso.nivel]}`}>{viewCurso.nivel}</span></span></div>
          <div className="detail-row"><span className="detail-label">Duración</span><span className="detail-value">{viewCurso.duracion ? `${viewCurso.duracion} semanas` : '—'}</span></div>
          <div className="detail-row"><span className="detail-label">Estado</span><span className="detail-value"><span className={`badge ${viewCurso.estado === 'Activo' ? 'badge-green' : 'badge-yellow'}`}>{viewCurso.estado}</span></span></div>
          {viewCurso.descripcion && <div className="detail-row"><span className="detail-label">Descripción</span><span className="detail-value" style={{ fontSize: 12, color: 'var(--dim)' }}>{viewCurso.descripcion}</span></div>}
          <div className="form-section" style={{ marginTop: 14 }}>Lecciones</div>
          {viewLeccs.length === 0 ? <div style={{ color: 'var(--dim)', fontSize: 13, padding: '10px 0' }}>No hay lecciones. Agrega la primera.</div> :
            viewLeccs.map((l) => (
              <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: 'var(--surface-2)', borderRadius: 8, marginBottom: 6 }}>
                <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--surface-2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{l.numero || '?'}</div>
                <div style={{ flex: 1, fontSize: 13 }}>{l.titulo}{l.duracion && <span style={{ fontSize: 10, color: 'var(--dim)' }}> · {l.duracion}min</span>}</div>
                <button className="btn btn-secondary btn-sm" onClick={() => { setModal(null); openEditLeccion(l.id); }}>✏️</button>
              </div>
            ))
          }
          <div className="form-section" style={{ marginTop: 14 }}>Estudiantes Matriculados</div>
          {viewEsts.length === 0 ? <div style={{ color: 'var(--dim)', fontSize: 13, padding: '10px 0' }}>Sin estudiantes matriculados.</div> :
            viewEsts.map((e) => (
              <div key={e.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', background: 'var(--surface-2)', borderRadius: 7, marginBottom: 5 }}>
                <div><div style={{ fontSize: 13, fontWeight: 700 }}>{e.nombre} {e.apellido}</div><div style={{ fontSize: 11, color: 'var(--dim)' }}>Desde {fmt(e.fecha)}</div></div>
                <span className={`badge ${EST_BADGE[e.estado] || 'badge-blue'}`}>{e.estado}</span>
              </div>
            ))
          }
        </>}
      </Modal>

      <Modal open={modal === 'est'} onClose={() => setModal(null)} title={editEstId ? '✏️ Editar Estudiante' : '🎓 Matricular Estudiante'} footer={<>{editEstId && <button className="btn btn-danger btn-sm" style={{ marginRight: 'auto' }} onClick={delEst}>🗑️ Eliminar</button>}<button className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button><button className="btn btn-gold" onClick={saveEst}>{editEstId ? '💾 Guardar Cambios' : '💾 Matricular'}</button></>} wide>

        {/* ─── SECCIÓN: ORIGEN ─── */}
        <div className="form-section">📋 Origen del Estudiante</div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Fuente de datos</label>
            <select className="form-select" value={eOrigen} onChange={(e) => { const v = e.target.value as 'convertido' | 'miembro' | 'manual'; setEOrigen(v); setEOrigenId(''); if (v === 'manual') { setENombre(''); setEApellido(''); setETel(''); setEEdad(''); setEEmail(''); setEDireccion(''); setEProfesion(''); setEBautizado(false); setEFechaBautismo(''); setEConyuge(''); setEHijos(''); setEZona(''); setEGrupoId(''); setEHermanoMayorId(''); } }}>
              <option value="manual">— Ingreso manual —</option>
              <option value="convertido">🕊 Nuevo Convertido</option>
              <option value="miembro">👥 Miembro de la Iglesia</option>
            </select>
          </div>
          {eOrigen !== 'manual' && (
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">{eOrigen === 'convertido' ? 'Seleccionar Convertido' : 'Seleccionar Miembro'}</label>
              <select className="form-select" value={eOrigenId} onChange={(e) => { setEOrigenId(e.target.value); autoFillOrigen(eOrigen, e.target.value); }}>
                <option value="">— Seleccionar —</option>
                {(eOrigen === 'convertido' ? conversiones : miembros.filter(m => m.estado === 'Activo')).map((item: any) => (
                  <option key={item.id} value={item.id}>{item.nombre} {item.apellido}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* ─── SECCIÓN: PERSONAL ─── */}
        <div className="form-section">👤 Datos Personales</div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Nombre *</label><input className="form-input" value={eNombre} onChange={(e) => setENombre(e.target.value)} placeholder="Nombre" /></div>
          <div className="form-group"><label className="form-label">Apellido *</label><input className="form-input" value={eApellido} onChange={(e) => setEApellido(e.target.value)} placeholder="Apellido" /></div>
        </div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Edad</label><input className="form-input" type="number" value={eEdad} onChange={(e) => setEEdad(e.target.value)} placeholder="25" min="5" max="120" /></div>
          <div className="form-group"><label className="form-label">Profesión</label><input className="form-input" value={eProfesion} onChange={(e) => setEProfesion(e.target.value)} placeholder="Ej: Maestro, Ingeniero…" /></div>
        </div>

        {/* ─── SECCIÓN: CONTACTO ─── */}
        <div className="form-section" style={{ marginTop: 16 }}>📞 Contacto</div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Teléfono</label><input className="form-input" value={eTel} onChange={(e) => setETel(e.target.value)} placeholder="+1 555 000 0000" /></div>
          <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" value={eEmail} onChange={(e) => setEEmail(e.target.value)} placeholder="email@ejemplo.com" /></div>
        </div>
        <div className="form-group"><label className="form-label">Dirección</label><input className="form-input" value={eDireccion} onChange={(e) => setEDireccion(e.target.value)} placeholder="Calle, número, ciudad" /></div>

        {/* ─── SECCIÓN: IGLESIA ─── */}
        <div className="form-section" style={{ marginTop: 16 }}>⛪ Ubicación en la Iglesia</div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Zona / Sector</label><ZonaSelect value={eZona} onChange={setEZona} emptyLabel="Sin zona" /></div>
          <div className="form-group"><label className="form-label">Grupo de Misión</label>
            <select className="form-select" value={eGrupoId} onChange={(e) => setEGrupoId(e.target.value)}>
              <option value="">— Sin grupo —</option>
              {grupos.map((g) => <option key={g.id} value={g.id}>{g.nombre}</option>)}
            </select>
          </div>
        </div>
        <div className="form-group"><label className="form-label">Hermano Mayor (Líder/Mentor)</label>
          <select className="form-select" value={eHermanoMayorId} onChange={(e) => setEHermanoMayorId(e.target.value)}>
            <option value="">— Sin hermano mayor asignado —</option>
            {miembros.filter(m => m.estado === 'Activo').sort((a, b) => `${a.apellido} ${a.nombre}`.localeCompare(`${b.apellido} ${b.nombre}`)).map((m) => (
              <option key={m.id} value={m.id}>{m.nombre} {m.apellido}</option>
            ))}
          </select>
        </div>

        {/* ─── SECCIÓN: FAMILIA ─── */}
        <div className="form-section" style={{ marginTop: 16 }}>👪 Familia</div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">¿Bautizado?</label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 8, background: 'var(--surface-2)', borderRadius: 6, cursor: 'pointer' }}>
              <input type="checkbox" checked={eBautizado} onChange={(e) => setEBautizado(e.target.checked)} style={{ width: 18, height: 18 }} />
              <span style={{ fontWeight: 600 }}>{eBautizado ? '💧 Sí, bautizado' : 'No bautizado'}</span>
            </label>
          </div>
          <div className="form-group"><label className="form-label">Fecha de Bautismo</label>
            <input className="form-input" type="date" value={eFechaBautismo} onChange={(e) => setEFechaBautismo(e.target.value)} disabled={!eBautizado} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Cónyuge</label><input className="form-input" value={eConyuge} onChange={(e) => setEConyuge(e.target.value)} placeholder="Si aplica" /></div>
          <div className="form-group"><label className="form-label">Hijos</label><input className="form-input" value={eHijos} onChange={(e) => setEHijos(e.target.value)} placeholder="Ej: 2 hijos (Sofía 8, Mateo 5)" /></div>
        </div>

        {/* ─── SECCIÓN: MATRÍCULA ─── */}
        <div className="form-section" style={{ marginTop: 16 }}>🎓 Matrícula</div>
        <div className="form-row">
          <div className="form-group" style={{ gridColumn: 'span 2' }}><label className="form-label">Curso *</label><select className="form-select" value={eCurso} onChange={(e) => setECurso(e.target.value)}><option value="">Seleccionar curso…</option>{cursos.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select></div>
          <div className="form-group"><label className="form-label">Fecha de Inicio *</label><input className="form-input" type="date" value={eFecha} onChange={(e) => setEFecha(e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Estado</label><select className="form-select" value={eEstado} onChange={(e) => setEEstado(e.target.value)}><option>Activo</option><option>Pausado</option></select></div>
        </div>
        <div className="form-group" style={{ marginTop: 12 }}><label className="form-label">Notas</label><textarea className="form-textarea" value={eNotas} onChange={(e) => setENotas(e.target.value)} placeholder="Observaciones de ingreso…" style={{ minHeight: 55 }} /></div>
      </Modal>

      <Modal open={modal === 'estDetail' && !!selEst} onClose={() => setModal(null)} title="Perfil del Estudiante" wide>
        {selEstData ? (
          <>
            {/* ─── HEADER ─── */}
            <div style={{ display: 'flex', gap: 16, alignItems: 'center', padding: '4px 0 18px', borderBottom: '1px solid var(--border)', marginBottom: 18 }}>
              <div className="avatar-lg" style={{ background: 'linear-gradient(135deg, var(--academia-teal), var(--academia-pergamino))', color: 'var(--carbon)' }}>{selEstData.iniciales || '👤'}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-display)' }}>{selEst!.nombre} {selEst!.apellido}</h2>
                  <span className={`badge ${EST_BADGE[selEst!.estado] || 'badge-blue'}`}>{selEst!.estado}</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--dim)', marginTop: 6 }}>
                  🎓 {selEstData.myCurso ? selEstData.myCurso.nombre : 'sin curso'} · 📅 Ingreso: {fmt(selEst!.fecha)}
                </div>
              </div>
            </div>

            {/* ─── KPIS ─── */}
            <div className="kpis" style={{ marginBottom: 20 }}>
              <div className="kpi" style={{ ['--accent' as any]: 'var(--blue)' }}>
                <div className="kpi-label">Cursos Totales</div>
                <div className="kpi-value" style={{ fontSize: 20 }}>{selEstData.totalCursos}</div>
                <div className="kpi-sub">incluye actual</div>
              </div>
              <div className="kpi" style={{ ['--accent' as any]: 'var(--gold)' }}>
                <div className="kpi-label">Certificados</div>
                <div className="kpi-value" style={{ fontSize: 20 }}>{selEstData.myCerts.length}</div>
                <div className="kpi-sub">obtidos</div>
              </div>
              <div className="kpi" style={{ ['--accent' as any]: 'var(--green)' }}>
                <div className="kpi-label">Estado</div>
                <div className="kpi-value" style={{ fontSize: 16 }}>{selEst!.estado}</div>
                <div className="kpi-sub">estatus académico</div>
              </div>
              <div className="kpi" style={{ ['--accent' as any]: 'var(--purple)' }}>
                <div className="kpi-label">Progreso</div>
                <div className="kpi-value" style={{ fontSize: 16 }}>{selEstData.totalCursos > 0 ? `${Math.round((selEstData.myCerts.length / selEstData.totalCursos) * 100)}%` : '—'}</div>
                <div className="kpi-sub">completado</div>
              </div>
            </div>

            {/* ─── ORIGEN ─── */}
            <div className="form-section">📋 Origen</div>
            <div style={{ marginBottom: 18 }}>
              {selEst!.origen === 'convertido' && selEstData.origenConv ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 10, background: 'var(--surface-2)', borderRadius: 8, fontSize: 13 }}>
                  <span>🕊</span>
                  <span>Convertido · <strong>{selEstData.origenConv.nombre} {selEstData.origenConv.apellido}</strong></span>
                  <span style={{ color: 'var(--dim)' }}>· {selEstData.origenConv.lider}</span>
                </div>
              ) : selEst!.origen === 'miembro' && selEstData.origenMiem ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 10, background: 'var(--surface-2)', borderRadius: 8, fontSize: 13 }}>
                  <span>👥</span>
                  <span>Miembro · <strong>{selEstData.origenMiem.nombre} {selEstData.origenMiem.apellido}</strong></span>
                </div>
              ) : (
                <div style={{ color: 'var(--dim)', fontSize: 13, padding: '4px 0' }}>📝 Ingreso manual</div>
              )}
            </div>

            {/* ─── CERTIFICADOS ─── */}
            {selEstData.myCerts.length > 0 && (
              <>
                <div className="form-section">🏆 Certificados</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 18 }}>
                  {selEstData.myCerts.map(c => {
                    const curso = cursos.find(x => x.id === c.cursoId);
                    return (
                      <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--surface-2)', borderRadius: 8, fontSize: 13 }}>
                        <span>{curso?.emoji || '🏆'}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600 }}>{curso?.nombre || 'Curso'}</div>
                          <div style={{ fontSize: 11, color: 'var(--dim)' }}>{fmt(c.fecha)}</div>
                        </div>
                        <span className={`badge ${CAL_BADGE[c.calificacion] || 'badge-green'}`}>{c.calificacion}</span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* ─── INFORMACIÓN PERSONAL ─── */}
            <div className="form-section">👤 Información Personal</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '6px 16px', marginBottom: 18 }}>
              <div className="detail-row"><span className="detail-label">📞 Teléfono</span><span className="detail-value">{selEst!.telefono ? <a href={`tel:${selEst!.telefono}`} style={{ color: 'var(--academia-teal)', textDecoration: 'none', fontWeight: 600 }}>{selEst!.telefono}</a> : '—'}{selEst!.telefono && <a href={`https://wa.me/${selEst!.telefono.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" style={{ marginLeft: 8, fontSize: 11, color: 'var(--green)', textDecoration: 'none' }}>💬 WhatsApp</a>}</span></div>
              <div className="detail-row"><span className="detail-label">✉ Email</span><span className="detail-value">{selEst!.email ? <a href={`mailto:${selEst!.email}`} style={{ color: 'var(--academia-teal)', textDecoration: 'none' }}>{selEst!.email}</a> : '—'}</span></div>
              <div className="detail-row"><span className="detail-label">🎂 Edad</span><span className="detail-value">{selEst!.edad || '—'}</span></div>
              <div className="detail-row"><span className="detail-label">💼 Profesión</span><span className="detail-value">{selEst!.profesion || '—'}</span></div>
              <div className="detail-row" style={{ gridColumn: '1 / -1' }}><span className="detail-label">📍 Dirección</span><span className="detail-value">{selEst!.direccion ? <a href={`https://www.google.com/maps/search/${encodeURIComponent(selEst!.direccion)}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--academia-teal)', textDecoration: 'none' }}>{selEst!.direccion} 🗺</a> : '—'}</span></div>
            </div>

            {/* ─── IGLESIA ─── */}
            <div className="form-section">⛪ Iglesia</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '6px 16px', marginBottom: 18 }}>
              <div className="detail-row"><span className="detail-label">📍 Zona</span><span className="detail-value">{selEst!.zona || '—'}</span></div>
              <div className="detail-row"><span className="detail-label">👥 Grupo</span><span className="detail-value">{selEstData.grupo?.nombre || '—'}</span></div>
              <div className="detail-row"><span className="detail-label">🧑 Hermano Mayor</span><span className="detail-value">{selEstData.hermanoMayor ? `${selEstData.hermanoMayor.nombre} ${selEstData.hermanoMayor.apellido}` : '—'}</span></div>
              <div className="detail-row"><span className="detail-label">💧 Bautismo</span><span className="detail-value">{selEst!.bautizado ? (selEst!.fechaBautismo ? fmt(selEst!.fechaBautismo) : 'Sí') : 'No'}</span></div>
              <div className="detail-row"><span className="detail-label">👪 Cónyuge</span><span className="detail-value">{selEst!.conyuge || '—'}</span></div>
              <div className="detail-row"><span className="detail-label">👶 Hijos</span><span className="detail-value">{selEst!.hijos || '—'}</span></div>
            </div>

            {/* ─── NOTAS ─── */}
            {selEst!.notas && (
              <div style={{ marginBottom: 18 }}>
                <div className="form-section">📝 Notas</div>
                <div style={{ fontSize: 13, color: 'var(--dim)', whiteSpace: 'pre-wrap', padding: '6px 0' }}>{selEst!.notas}</div>
              </div>
            )}

            {/* ─── HITOS ─── */}
            <div className="form-section">📍 Hitos Recientes</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
              {selEstData.studentHitos.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--dim)', fontSize: 13, padding: 10 }}>Sin hitos registrados</div>
              ) : (
                selEstData.studentHitos.slice(0, 5).map(h => (
                  <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 10, background: 'var(--surface-2)', borderRadius: 8, fontSize: 13 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--gold)' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>{h.tipo}</div>
                      <div style={{ fontSize: 11, color: 'var(--dim)' }}>{fmt(h.fecha)}</div>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--dim)', fontStyle: 'italic' }}>{h.descripcion}</div>
                  </div>
                ))
              )}
            </div>

            {/* ─── REGISTRAR HITO RÁPIDO ─── */}
            <div className="form-section">➕ Registrar Hito Rápido</div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Tipo</label>
                <select className="form-select" value={qhTipo} onChange={(e) => setQHTipo(e.target.value as any)}>
                  <option>Conversión</option><option>Bautismo</option><option>Discipulado</option>
                  <option>Curso Completado</option><option>Integración</option><option>Liderazgo</option>
                  <option>Matrimonio</option><option>Otro</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Fecha</label>
                <input className="form-input" type="date" value={qhFecha} onChange={(e) => setQHFecha(e.target.value)} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Descripción</label>
              <input className="form-input" value={qhDesc} onChange={(e) => setQHDesc(e.target.value)} placeholder="Ej: Completó curso de ..." />
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button className="btn btn-gold btn-sm" style={{ flex: 1 }} onClick={() => saveHito(selEst!.id)}>💾 Registrar</button>
              <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={resetHito}>🧹 Limpiar</button>
            </div>

            {/* ─── FOOTER ─── */}
            <div className="modal-footer" style={{ marginTop: 20 }}>
              <button className="btn btn-secondary" onClick={() => { setModal(null); openEditEst(selEst!.id); }}>✏ Editar perfil</button>
              <button className="btn btn-danger" onClick={() => { setModal(null); setEditEstId(selEst!.id); setModal('est'); }}>🗑 Eliminar</button>
            </div>
          </>
        ) : null}
      </Modal>

      <Modal open={modal === 'cert'} onClose={() => setModal(null)} title={editCertId ? '✏️ Editar Certificado' : '🏆 Emitir Certificado'} footer={<>{editCertId && <button className="btn btn-danger btn-sm" style={{ marginRight: 'auto' }} onClick={delCert}>🗑️ Eliminar</button>}<button className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button><button className="btn btn-gold" onClick={saveCert}>🏆 Emitir Certificado</button></>}>
        <div className="form-row">
          <div className="form-group" style={{ gridColumn: 'span 2' }}><label className="form-label">Estudiante *</label><select className="form-select" value={certEst} onChange={(e) => setCertEst(e.target.value)}><option value="">Seleccionar estudiante…</option>{estudiantes.map((e) => <option key={e.id} value={e.id}>{e.nombre} {e.apellido}</option>)}</select></div>
          <div className="form-group" style={{ gridColumn: 'span 2' }}><label className="form-label">Curso *</label><select className="form-select" value={certCurso} onChange={(e) => setCertCurso(e.target.value)}><option value="">Seleccionar curso…</option>{cursos.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select></div>
          <div className="form-group"><label className="form-label">Fecha de Emisión *</label><input className="form-input" type="date" value={certFecha} onChange={(e) => setCertFecha(e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Calificación Final</label><select className="form-select" value={certCal} onChange={(e) => setCertCal(e.target.value)}><option>Aprobado</option><option>Sobresaliente</option><option>Con Honores</option></select></div>
        </div>
        <div className="form-group" style={{ marginTop: 12 }}><label className="form-label">Observaciones</label><textarea className="form-textarea" value={certObs} onChange={(e) => setCertObs(e.target.value)} placeholder="Logros destacados, menciones especiales…" style={{ minHeight: 55 }} /></div>
      </Modal>

      {toast && <div className="toast-container"><div className="toast success">{toast}</div></div>}
      </div>
    </Layout>
  );
}
