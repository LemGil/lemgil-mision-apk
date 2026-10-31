import type { Dispatch, SetStateAction } from 'react';
import { EmptyState } from '../../components/EmptyState';
import { fmt } from '../../lib/utils';
import type { Beneficiario, Campana, Entrega } from '../../lib/types';

interface EntregasTabProps {
  entFiltradas: Entrega[];
  entregas: Entrega[];
  beneficiarios: Beneficiario[];
  campanas: Campana[];
  search: string; setSearch: Dispatch<SetStateAction<string>>;
  filterFechaEnt: string; setFilterFechaEnt: Dispatch<SetStateAction<string>>;
  filterCampanaEnt: string; setFilterCampanaEnt: Dispatch<SetStateAction<string>>;
  filterTipoEnt: string; setFilterTipoEnt: Dispatch<SetStateAction<string>>;
  openEditEnt: (id: string) => void;
  onDeleteEnt: (id: string) => void;
}

export function EntregasTab(props: EntregasTabProps) {
  const { entFiltradas, entregas, beneficiarios, campanas, search, setSearch, filterFechaEnt, setFilterFechaEnt, filterCampanaEnt, setFilterCampanaEnt, filterTipoEnt, setFilterTipoEnt, openEditEnt, onDeleteEnt } = props;
  return (
          <>
            <div className="search-bar">
              <input className="search-input" placeholder="🔍 Buscar beneficiario, campaña, tipo…" value={search} onChange={(e) => setSearch(e.target.value)} />
              <select className="filter-select" value={filterFechaEnt} onChange={(e) => setFilterFechaEnt(e.target.value)}>
                <option value="">Todas las fechas</option>
                {[...new Set(entregas.map(e => e.fecha?.slice(0, 7)).filter(Boolean))].sort().reverse().map(f => <option key={f} value={f}>{f}</option>)}
              </select>
              <select className="filter-select" value={filterCampanaEnt} onChange={(e) => setFilterCampanaEnt(e.target.value)}>
                <option value="">Todas las campañas</option>
                {campanas.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
              <select className="filter-select" value={filterTipoEnt} onChange={(e) => setFilterTipoEnt(e.target.value)}>
                <option value="">Todos los tipos</option>
                <option>Alimentos</option>
                <option>Ropa</option>
                <option>Medicinas</option>
                <option>Útiles</option>
                <option>Otro</option>
              </select>
            </div>

            <div className="card">
              <div className="card-header">
                <div className="card-title">📦 Historial de Entregas</div>
                <div style={{ fontSize: 12, color: 'var(--dim)' }}>{entFiltradas.length} entregas</div>
              </div>
              {entFiltradas.length === 0 ? (
                <EmptyState icon="📦" title={entregas.length ? 'Sin resultados' : 'Sin entregas aún'} sub={entregas.length ? 'Prueba otros filtros' : 'Registra la primera entrega'} />
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Beneficiario</th>
                      <th>Campaña</th>
                      <th>Tipo</th>
                      <th style={{ textAlign: 'right' }}>Cantidad</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entFiltradas.map((e) => {
                      const ben = beneficiarios.find((x) => x.id === e.beneficiarioId);
                      const camp = campanas.find((x) => x.id === e.campanaId);
                      return (
                        <tr key={e.id}>
                          <td>{fmt(e.fecha)}</td>
                          <td><strong>{ben ? `${ben.nombre} ${ben.apellido}` : '—'}</strong></td>
                          <td>{camp ? camp.nombre : '—'}</td>
                          <td><span className="badge badge-blue">{e.tipo}</span></td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--manos-terracota)' }}>{e.cantidad} {e.unidad}</td>
                          <td>
                            <div style={{ display: 'flex', gap: 5 }}>
                              <button className="btn btn-secondary btn-sm" onClick={() => openEditEnt(e.id)}>✏️</button>
                              <button className="btn btn-danger btn-sm" onClick={() => onDeleteEnt(e.id)}>🗑️</button>
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
