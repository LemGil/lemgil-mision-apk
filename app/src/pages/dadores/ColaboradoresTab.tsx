import type { Dispatch, SetStateAction } from 'react';
import { EmptyState } from '../../components/EmptyState';
import { money } from '../../lib/utils';
import type { Aporte, Colaborador, TipoPlan } from '../../lib/types';
import { EST_BADGE, TIPO_BADGE } from './constants';

interface ColaboradoresTabProps {
  dadoresFiltrados: Colaborador[];
  dadores: Colaborador[];
  aportes: Aporte[];
  tiposPlanes: TipoPlan[];
  search: string; setSearch: Dispatch<SetStateAction<string>>;
  filterEstado: string; setFilterEstado: Dispatch<SetStateAction<string>>;
  filterTipo: string; setFilterTipo: Dispatch<SetStateAction<string>>;
  filterPlanTipo: string; setFilterPlanTipo: Dispatch<SetStateAction<string>>;
  filterMontoMin: string; setFilterMontoMin: Dispatch<SetStateAction<string>>;
  filterMontoMax: string; setFilterMontoMax: Dispatch<SetStateAction<string>>;
  openDetail: (id: string) => void;
  openEditDador: (id: string) => void;
  onDeleteDador: (id: string) => void;
}

export function ColaboradoresTab(props: ColaboradoresTabProps) {
  const { dadoresFiltrados, dadores, aportes, tiposPlanes, search, setSearch, filterEstado, setFilterEstado, filterTipo, setFilterTipo, filterPlanTipo, setFilterPlanTipo, filterMontoMin, setFilterMontoMin, filterMontoMax, setFilterMontoMax, openDetail, openEditDador, onDeleteDador } = props;
  return (
          <>
             <div className="search-bar">
              <input className="search-input" placeholder="🔍 Buscar nombre, teléfono, email…" value={search} onChange={(e) => setSearch(e.target.value)} />
              <select className="filter-select" value={filterEstado} onChange={(e) => setFilterEstado(e.target.value)}>
                <option value="">Todos los estados</option>
                <option>Activo</option>
                <option>Pausado</option>
                <option>Inactivo</option>
              </select>
              <select className="filter-select" value={filterTipo} onChange={(e) => setFilterTipo(e.target.value)}>
                <option value="">Todos los tipos</option>
                <option>Persona</option>
                <option>Empresa</option>
                <option>Iglesia</option>
              </select>
              <select className="filter-select" value={filterPlanTipo} onChange={(e) => setFilterPlanTipo(e.target.value)}>
                <option value="">Todos los planes</option>
                {tiposPlanes.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
              </select>
              <input className="search-input" style={{maxWidth: 100}} type="number" placeholder="Mín ($)" value={filterMontoMin} onChange={(e) => setFilterMontoMin(e.target.value)} />
              <input className="search-input" style={{maxWidth: 100}} type="number" placeholder="Máx ($)" value={filterMontoMax} onChange={(e) => setFilterMontoMax(e.target.value)} />
              {(search || filterEstado || filterTipo || filterPlanTipo || filterMontoMin || filterMontoMax) && (
                <button className="btn btn-secondary btn-sm" onClick={() => { setSearch(''); setFilterEstado(''); setFilterTipo(''); setFilterPlanTipo(''); setFilterMontoMin(''); setFilterMontoMax(''); }}>✕ Limpiar</button>
              )}
            </div>

            <div className="card">
              <div className="card-header">
                <div className="card-title">🤝 Registro de Colaboradores</div>
                <div style={{ fontSize: 12, color: 'var(--dim)' }}>{dadoresFiltrados.length} registros</div>
              </div>
              {dadoresFiltrados.length === 0 ? (
                <EmptyState icon="🤝" title={dadores.length ? 'Sin resultados' : 'Sin colaboradores aún'} sub={dadores.length ? 'Prueba otros filtros' : 'Registra el primer colaborador'} />
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Nombre</th>
                      <th>Tipo</th>
                      <th>Contacto</th>
                      <th>Aportes</th>
                      <th>Total</th>
                      <th>Compromiso</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dadoresFiltrados.map((d, i) => {
                      const dAportes = aportes.filter((a) => a.colaboradorId === d.id);
                      const total = dAportes.reduce((s, a) => s + (a.monto || 0), 0);
                      return (
                        <tr key={d.id}>
                          <td style={{ color: 'var(--dim)' }}>{i + 1}</td>
                          <td>
                            <strong>{d.nombre} {d.apellido}</strong>
                            {d.email && (<><br /><span style={{ fontSize: 10, color: 'var(--dim)' }}>{d.email}</span></>)}
                          </td>
                          <td><span className={`badge ${TIPO_BADGE[d.tipo] || 'badge-blue'}`}>{d.tipo}</span></td>
                          <td style={{ fontSize: 12 }}>{d.telefono || '—'}</td>
                          <td style={{ textAlign: 'center', fontWeight: 700 }}>{dAportes.length}</td>
                          <td style={{ fontWeight: 700, color: 'var(--oro-apostolico)' }}>{money(total)}</td>
                          <td style={{ fontWeight: 700, color: 'var(--oro-luz)' }}>{d.planOfrendaMonto ? money(d.planOfrendaMonto) : '—'}</td>
                          <td><span className={`badge ${EST_BADGE[d.estado] || 'badge-blue'}`}>{d.estado}</span></td>
                          <td>
                            <div style={{ display: 'flex', gap: 5 }}>
                              <button className="btn btn-secondary btn-sm" onClick={() => openDetail(d.id)}>👁 Ver</button>
                              <button className="btn btn-secondary btn-sm" onClick={() => openEditDador(d.id)}>✏️</button>
                              <button className="btn btn-danger btn-sm" onClick={() => onDeleteDador(d.id)}>🗑️</button>
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
