import type { Dispatch, SetStateAction } from 'react';
import { EmptyState } from '../../components/EmptyState';
import { CsvImportButton } from '../../components/CsvImportButton';
import { exportCSV } from '../../lib/csvExport';
import { exportCursosPDF } from '../../lib/pdfExport';
import { showToast } from '../../lib/notification';
import type { Curso, Estudiante, Leccion } from '../../lib/types';
import { NIVEL_BADGE } from './constants';

interface CursosTabProps {
  cursos: Curso[];
  lecciones: Leccion[];
  estudiantes: Estudiante[];
  filteredCursos: Curso[];
  search: string; setSearch: Dispatch<SetStateAction<string>>;
  filterNivel: string; setFilterNivel: Dispatch<SetStateAction<string>>;
  filterCursoEstado: string; setFilterCursoEstado: Dispatch<SetStateAction<string>>;
  openNewCurso: () => void;
  openNewLeccion: () => void;
  openEditCurso: (id: string) => void;
  onVerCurso: (id: string) => void;
  onMatricular: (id: string) => void;
}

export function CursosTab(props: CursosTabProps) {
  const { cursos, lecciones, estudiantes, filteredCursos, search, setSearch, filterNivel, setFilterNivel, filterCursoEstado, setFilterCursoEstado, openNewCurso, openNewLeccion, openEditCurso, onVerCurso, onMatricular } = props;
  return (
    <>
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
          <select className="filter-select" value={filterCursoEstado} onChange={(e) => setFilterCursoEstado(e.target.value)}>
            <option value="">Todos los estados</option>
            <option>Activo</option><option>Borrador</option><option>Archivado</option>
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
                      <button className="btn btn-secondary btn-sm" onClick={() => onVerCurso(c.id)}>👁 Ver</button>
                      <button className="btn btn-secondary btn-sm" onClick={() => openEditCurso(c.id)}>✏️ Editar</button>
                      <button className="btn btn-gold btn-sm" onClick={() => onMatricular(c.id)}>🎓 Matricular</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
    </>
  );
}
