import type { Dispatch, SetStateAction } from 'react';
import { EmptyState } from '../../components/EmptyState';
import { CsvImportButton } from '../../components/CsvImportButton';
import { exportCSV } from '../../lib/csvExport';
import { exportEstudiantesPDF } from '../../lib/pdfExport';
import { showToast } from '../../lib/notification';
import { fmt } from '../../lib/utils';
import type { Curso, Estudiante, Grupo, Zona } from '../../lib/types';
import { EST_BADGE } from './constants';

interface EstudiantesTabProps {
  estudiantes: Estudiante[];
  filteredEst: Estudiante[];
  cursos: Curso[];
  zonas: Zona[];
  grupos: Grupo[];
  search: string; setSearch: Dispatch<SetStateAction<string>>;
  filterCursoEst: string; setFilterCursoEst: Dispatch<SetStateAction<string>>;
  filterEstadoEst: string; setFilterEstadoEst: Dispatch<SetStateAction<string>>;
  filterOrigenEst: string; setFilterOrigenEst: Dispatch<SetStateAction<string>>;
  filterZonaEst: string; setFilterZonaEst: Dispatch<SetStateAction<string>>;
  filterGrupoEst: string; setFilterGrupoEst: Dispatch<SetStateAction<string>>;
  filterBautizadoEst: string; setFilterBautizadoEst: Dispatch<SetStateAction<string>>;
  openNewEst: () => void;
  openEditEst: (id: string) => void;
  onVerEst: (id: string) => void;
  onCertificar: (e: Estudiante) => void;
}

export function EstudiantesTab(props: EstudiantesTabProps) {
  const { estudiantes, filteredEst, cursos, zonas, grupos, search, setSearch, filterCursoEst, setFilterCursoEst, filterEstadoEst, setFilterEstadoEst, filterOrigenEst, setFilterOrigenEst, filterZonaEst, setFilterZonaEst, filterGrupoEst, setFilterGrupoEst, filterBautizadoEst, setFilterBautizadoEst, openNewEst, openEditEst, onVerEst, onCertificar } = props;
  return (
    <>
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
          <select className="filter-select" value={filterOrigenEst} onChange={(e) => setFilterOrigenEst(e.target.value)}>
            <option value="">Todos los orígenes</option>
            <option value="convertido">Convertido</option>
            <option value="miembro">Miembro</option>
            <option value="manual">Manual</option>
          </select>
          <select className="filter-select" value={filterZonaEst} onChange={(e) => setFilterZonaEst(e.target.value)}>
            <option value="">Todas las zonas</option>
            {zonas.map((z) => <option key={z.id} value={z.nombre}>{z.nombre}</option>)}
          </select>
          <select className="filter-select" value={filterGrupoEst} onChange={(e) => setFilterGrupoEst(e.target.value)}>
            <option value="">Todos los grupos</option>
            {grupos.map((g) => <option key={g.id} value={g.id}>{g.nombre}</option>)}
          </select>
          <select className="filter-select" value={filterBautizadoEst} onChange={(e) => setFilterBautizadoEst(e.target.value)}>
            <option value="">Todos</option>
            <option value="si">Sí</option>
            <option value="no">No</option>
          </select>
          {(search || filterCursoEst || filterEstadoEst || filterOrigenEst || filterZonaEst || filterGrupoEst || filterBautizadoEst) && (
            <button className="btn btn-secondary btn-sm" onClick={() => { setSearch(''); setFilterCursoEst(''); setFilterEstadoEst(''); setFilterOrigenEst(''); setFilterZonaEst(''); setFilterGrupoEst(''); setFilterBautizadoEst(''); }}>✕ Limpiar</button>
          )}
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
                           <button className="btn btn-secondary btn-sm" onClick={() => onVerEst(e.id)}>👁 Ver</button>
                           <button className="btn btn-secondary btn-sm" onClick={() => openEditEst(e.id)}>✏️ Editar</button>
                           <button className="btn btn-gold btn-sm" onClick={() => onCertificar(e)}>🏆 Cert.</button>
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
  );
}
