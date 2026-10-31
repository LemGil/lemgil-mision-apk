import type { Dispatch, SetStateAction } from 'react';
import { EmptyState } from '../../components/EmptyState';
import { fmt, money } from '../../lib/utils';
import type { Aporte, Colaborador, TipoPlan } from '../../lib/types';
import { APORTE_BADGE, METODO_BADGE } from './constants';

interface AportesTabProps {
  aportesFiltrados: Aporte[];
  aportes: Aporte[];
  dadores: Colaborador[];
  tiposPlanes: TipoPlan[];
  search: string; setSearch: Dispatch<SetStateAction<string>>;
  filterAnio: string; setFilterAnio: Dispatch<SetStateAction<string>>;
  filterMes: string; setFilterMes: Dispatch<SetStateAction<string>>;
  filterTipoAporte: string; setFilterTipoAporte: Dispatch<SetStateAction<string>>;
  filterMetodo: string; setFilterMetodo: Dispatch<SetStateAction<string>>;
  openEditAporte: (id: string) => void;
  onDeleteAporte: (id: string) => void;
}

export function AportesTab(props: AportesTabProps) {
  const { aportesFiltrados, aportes, dadores, tiposPlanes, search, setSearch, filterAnio, setFilterAnio, filterMes, setFilterMes, filterTipoAporte, setFilterTipoAporte, filterMetodo, setFilterMetodo, openEditAporte, onDeleteAporte } = props;
  return (
          <>
            <div className="search-bar">
              <input className="search-input" placeholder="🔍 Buscar colaborador, referencia, notas…" value={search} onChange={(e) => setSearch(e.target.value)} />
              <select className="filter-select" value={filterAnio} onChange={(e) => setFilterAnio(e.target.value)}>
                <option value="">Todos los años</option>
                {[...new Set(aportes.map(a => a.fecha?.slice(0, 4)).filter(Boolean))].sort().reverse().map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <select className="filter-select" value={filterMes} onChange={(e) => setFilterMes(e.target.value)}>
                <option value="">Todos los meses</option>
                {['01','02','03','04','05','06','07','08','09','10','11','12'].map((m, i) => <option key={m} value={m}>{['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][i]}</option>)}
              </select>
              <select className="filter-select" value={filterTipoAporte} onChange={(e) => setFilterTipoAporte(e.target.value)}>
                <option value="">Todos los tipos</option>
                <option>Diezmo</option>
                {tiposPlanes.map((t) => <option key={t.id} value={t.nombre}>{t.nombre}</option>)}
                <option>Otro</option>
              </select>
              <select className="filter-select" value={filterMetodo} onChange={(e) => setFilterMetodo(e.target.value)}>
                <option value="">Todos los métodos</option>
                <option>Efectivo</option>
                <option>Transferencia</option>
                <option>Cheque</option>
                <option>Tarjeta</option>
                <option>Otro</option>
              </select>
            </div>

            <div className="card">
              <div className="card-header">
                <div className="card-title">💰 Historial de Aportes</div>
                <div style={{ fontSize: 12, color: 'var(--dim)' }}>{money(aportesFiltrados.reduce((s, a) => s + a.monto, 0))} · {aportesFiltrados.length} aportes</div>
              </div>
              {aportesFiltrados.length === 0 ? (
                <EmptyState icon="💰" title={aportes.length ? 'Sin resultados' : 'Sin aportes aún'} sub={aportes.length ? 'Prueba otros filtros' : 'Registra el primer aporte'} />
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Colaborador</th>
                      <th>Tipo</th>
                      <th>Método</th>
                      <th style={{ textAlign: 'right' }}>Monto</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {aportesFiltrados.map((a) => {
                      const d = dadores.find((x) => x.id === a.colaboradorId);
                      return (
                        <tr key={a.id}>
                          <td>{fmt(a.fecha)}</td>
                          <td><strong>{d ? `${d.nombre} ${d.apellido}` : '—'}</strong></td>
                          <td><span className={`badge ${APORTE_BADGE[a.tipo] || 'badge-blue'}`}>{a.tipo}</span></td>
                          <td><span className={`badge ${METODO_BADGE[a.metodo] || 'badge-blue'}`}>{a.metodo}</span></td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--oro-apostolico)' }}>{money(a.monto)}</td>
                          <td>
                            <div style={{ display: 'flex', gap: 5 }}>
                              <button className="btn btn-secondary btn-sm" onClick={() => openEditAporte(a.id)}>✏️</button>
                              <button className="btn btn-danger btn-sm" onClick={() => onDeleteAporte(a.id)}>🗑️</button>
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
