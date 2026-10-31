import type { Dispatch, SetStateAction } from 'react';
import { EmptyState } from '../../components/EmptyState';
import type { Beneficiario, Entrega, Zona } from '../../lib/types';
import { EST_BEN } from './constants';

interface BeneficiariosTabProps {
  benFiltrados: Beneficiario[];
  beneficiarios: Beneficiario[];
  entregas: Entrega[];
  zonas: Zona[];
  search: string; setSearch: Dispatch<SetStateAction<string>>;
  filterEstado: string; setFilterEstado: Dispatch<SetStateAction<string>>;
  filterZona: string; setFilterZona: Dispatch<SetStateAction<string>>;
  filterFamilia: string; setFilterFamilia: Dispatch<SetStateAction<string>>;
  filterTipo: string; setFilterTipo: Dispatch<SetStateAction<string>>;
  filterSource: string; setFilterSource: Dispatch<SetStateAction<string>>;
  openEditBen: (id: string) => void;
  onEntregaParaBen: (b: Beneficiario) => void;
  onDeleteBen: (id: string) => void;
}

export function BeneficiariosTab(props: BeneficiariosTabProps) {
  const { benFiltrados, beneficiarios, entregas, zonas, search, setSearch, filterEstado, setFilterEstado, filterZona, setFilterZona, filterFamilia, setFilterFamilia, filterTipo, setFilterTipo, filterSource, setFilterSource, openEditBen, onEntregaParaBen, onDeleteBen } = props;
  return (
          <>
            <div className="search-bar">
              <input className="search-input" placeholder="🔍 Buscar nombre, teléfono, dirección…" value={search} onChange={(e) => setSearch(e.target.value)} />
              <select className="filter-select" value={filterEstado} onChange={(e) => setFilterEstado(e.target.value)}>
                <option value="">Todos los estados</option>
                <option>Activo</option>
                <option>Inactivo</option>
              </select>
              <select className="filter-select" value={filterZona} onChange={(e) => setFilterZona(e.target.value)}>
                <option value="">Todas las zonas</option>
                {zonas.map((z) => <option key={z.id} value={z.nombre}>{z.nombre}</option>)}
              </select>
              <select className="filter-select" value={filterFamilia} onChange={(e) => setFilterFamilia(e.target.value)}>
                <option value="">Todas las familias</option>
                <option value="1">1 persona</option>
                <option value="2-4">2-4 personas</option>
                <option value="5+">5+ personas</option>
              </select>
              <select className="filter-select" value={filterTipo} onChange={(e) => setFilterTipo(e.target.value)}>
                  <option value="">Todos los tipos</option>
                  <option value="Persona">Persona</option>
                  <option value="Casa de Familia">Casa de Familia</option>
                  <option value="Grupo">Grupo</option>
                  <option value="Vulnerable">Vulnerable</option>
              </select>
              <select className="filter-select" value={filterSource} onChange={(e) => setFilterSource(e.target.value)}>
                  <option value="">Todos los orígenes</option>
                  <option value="Convertido">Converso</option>
                  <option value="Miembro">Miembro</option>
                  <option value="Manual">Manual</option>
              </select>
              {(search || filterEstado || filterZona || filterFamilia || filterTipo || filterSource) && (
                <button className="btn btn-secondary btn-sm" onClick={() => { setSearch(''); setFilterEstado(''); setFilterZona(''); setFilterFamilia(''); setFilterTipo(''); setFilterSource(''); }}>✕ Limpiar</button>
              )}
            </div>

            <div className="card">
              <div className="card-header">
                <div className="card-title">🏠 Registro de Beneficiarios</div>
                <div style={{ fontSize: 12, color: 'var(--dim)' }}>{benFiltrados.length} registros</div>
              </div>
              {benFiltrados.length === 0 ? (
                <EmptyState icon="🏠" title={beneficiarios.length ? 'Sin resultados' : 'Sin beneficiarios aún'} sub={beneficiarios.length ? 'Prueba otros filtros' : 'Registra el primer beneficiario'} />
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Nombre</th>
                      <th>Zona</th>
                      <th>Dirección</th>
                      <th>Familia</th>
                      <th>Entregas</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {benFiltrados.map((b, i) => {
                      const entCount = entregas.filter((e) => e.beneficiarioId === b.id).length;
                      return (
                        <tr key={b.id}>
                          <td style={{ color: 'var(--dim)' }}>{i + 1}</td>
                          <td><strong>{b.nombre} {b.apellido}</strong>{b.telefono && (<><br /><span style={{ fontSize: 10, color: 'var(--dim)' }}>{b.telefono}</span></>)}</td>
                          <td>{b.zona || '—'}</td>
                          <td style={{ fontSize: 12 }}>{b.direccion || '—'}</td>
                          <td style={{ textAlign: 'center', fontWeight: 700 }}>{b.familia || 1}</td>
                          <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--oro-apostolico)' }}>{entCount}</td>
                          <td><span className={`badge ${EST_BEN[b.estado] || 'badge-blue'}`}>{b.estado}</span></td>
                          <td>
                            <div style={{ display: 'flex', gap: 5 }}>
                              <button className="btn btn-secondary btn-sm" onClick={() => openEditBen(b.id)}>✏️</button>
                              <button className="btn btn-secondary btn-sm" onClick={() => onEntregaParaBen(b)}>📦</button>
                              <button className="btn btn-danger btn-sm" onClick={() => onDeleteBen(b.id)}>🗑️</button>
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
