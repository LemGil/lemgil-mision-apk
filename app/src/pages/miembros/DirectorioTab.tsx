import type { Dispatch, SetStateAction } from 'react';
import { EmptyState } from '../../components/EmptyState';
import { CsvImportButton } from '../../components/CsvImportButton';
import { exportCSV } from '../../lib/csvExport';
import { exportMiembrosPDF } from '../../lib/pdfExport';
import { showToast } from '../../lib/notification';
import type { Grupo, Miembro, MiembroMinisterio, Ministerio } from '../../lib/types';
import { EST_BADGE, calcAge } from './constants';

interface DirectorioTabProps {
  miembrosFiltrados: Miembro[];
  asignacionesPorMiembro: Record<string, MiembroMinisterio[]>;
  ministerios: Ministerio[];
  grupos: Grupo[];
  zonas: string[];
  search: string; setSearch: Dispatch<SetStateAction<string>>;
  filterEstado: string; setFilterEstado: Dispatch<SetStateAction<string>>;
  filterZona: string; setFilterZona: Dispatch<SetStateAction<string>>;
  filterGrupo: string; setFilterGrupo: Dispatch<SetStateAction<string>>;
  filterEstadoCivil: string; setFilterEstadoCivil: Dispatch<SetStateAction<string>>;
  filterContacto: string; setFilterContacto: Dispatch<SetStateAction<string>>;
  openNewM: () => void;
  openEditM: (id: string) => void;
  onVer: (id: string) => void;
  onEliminar: (id: string) => void;
}

export function DirectorioTab(props: DirectorioTabProps) {
  const { miembrosFiltrados, asignacionesPorMiembro, ministerios, grupos, zonas, search, setSearch, filterEstado, setFilterEstado, filterZona, setFilterZona, filterGrupo, setFilterGrupo, filterEstadoCivil, setFilterEstadoCivil, filterContacto, setFilterContacto, openNewM, openEditM, onVer, onEliminar } = props;
  return (
        <div className="card">
           <div className="card-header">
              <div>
                <div className="card-title">DIRECTORIO DE MIEMBROS</div>
                <div className="card-sub">Datos personales, contacto y ministerios</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-secondary btn-sm" onClick={() => exportMiembrosPDF({ miembros: miembrosFiltrados, filtros: { estado: filterEstado, zona: filterZona, contacto: filterContacto } })}>📄 Exportar PDF</button>
                <button className="btn btn-secondary btn-sm" onClick={() => {
                  if (!miembrosFiltrados.length) return showToast('No hay miembros para exportar');
                  const h = ['#', 'Nombre', 'Apellido', 'Estado Civil', 'Zona', 'Teléfono', 'Email', 'Estado'];
                  const r = miembrosFiltrados.map((m, i) => [i + 1, m.nombre, m.apellido, m.estadoCivil || '', m.zona || '', m.telefono || '', m.email || '', m.estado]);
                  exportCSV(h, r, 'lemgil-miembros.csv');
                  showToast('CSV exportado');
                }}>📥 Exportar CSV</button>
                <CsvImportButton<Miembro>
                  table="miembros"
                  fieldMapping={{
                    'Nombre': 'nombre',
                    'Apellido': 'apellido',
                    'Teléfono': 'telefono',
                    'Email': 'email',
                    'Dirección': 'direccion',
                    'Zona': 'zona',
                    'Estado Civil': 'estadoCivil',
                    'Estado': 'estado',
                    'Contacto Preferido': 'contactoPreferido',
                    'Profesión': 'profesion',
                    'Fecha Nacimiento': 'fechaNacimiento',
                    'Fecha Ingreso': 'fechaIngreso',
                    'Bautizado': 'bautizado',
                    'Fecha Bautismo': 'fechaBautismo',
                    'Cónyuge': 'conyuge',
                    'Hijos': 'hijos',
                    'Notas': 'notas',
                  }}
                  requiredFields={['nombre', 'apellido']}
                  defaults={{ estado: 'Activo', estadoCivil: 'Soltero', contactoPreferido: 'WhatsApp' }}
                  onImport={(n) => showToast(`${n} miembro(s) importado(s)`)}
                />
                <button className="btn btn-gold" onClick={openNewM}>➕ Nuevo miembro</button>
              </div>
           </div>
          <div className="search-bar">
            <input className="search-input" placeholder="🔍 Buscar nombre, teléfono, ministerio..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <select className="filter-select" value={filterEstado} onChange={(e) => setFilterEstado(e.target.value)}>
              <option value="">Todos los estados</option>
              <option>Activo</option><option>Inactivo</option><option>Trasladado</option><option>Disciplinado</option><option>Fallecido</option>
            </select>
            <select className="filter-select" value={filterZona} onChange={(e) => setFilterZona(e.target.value)}>
              <option value="">Todas las zonas</option>
              {zonas.map((z) => <option key={z} value={z}>{z}</option>)}
            </select>
            <select className="filter-select" value={filterGrupo} onChange={(e) => setFilterGrupo(e.target.value)}>
              <option value="">Todos los grupos</option>
              {grupos.map((g) => <option key={g.id} value={g.id}>{g.nombre}</option>)}
            </select>
            <select className="filter-select" value={filterEstadoCivil} onChange={(e) => setFilterEstadoCivil(e.target.value)}>
              <option value="">Estado Civil</option>
              <option>Soltero</option><option>Casado</option><option>Viudo</option><option>Divorciado</option><option>Unión</option>
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
                      <td style={{ fontSize: 12, maxWidth: 160, overflow: 'hidden' }}>{grupoAsignado ? <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 6, background: 'var(--gold-glow)', color: 'var(--gold)', fontSize: 11, fontWeight: 700, border: '1px solid var(--gold)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 140 }}>👥 {grupoAsignado.nombre}</span> : <span style={{ color: 'var(--dim)' }}>—</span>}</td>
                      <td style={{ fontSize: 12 }}>{mints || <span style={{ color: 'var(--dim)' }}>—</span>}</td>
                      <td><span className={`badge ${EST_BADGE[m.estado]}`}>{m.estado}</span></td>
                      <td>
                        <button className="btn btn-secondary btn-sm" onClick={() => onVer(m.id)}>👁 Ver</button>{' '}
                        <button className="btn btn-secondary btn-sm" onClick={() => openEditM(m.id)}>✏</button>{' '}
                        <button className="btn btn-danger btn-sm" onClick={() => onEliminar(m.id)}>🗑</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
  );
}
