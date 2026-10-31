import type { Dispatch, SetStateAction } from 'react';
import { EmptyState } from '../../components/EmptyState';
import { fmt } from '../../lib/utils';
import type { Beneficiario, Campana, Entrega } from '../../lib/types';
import { CAMP_EST, TIPO_CAMP } from './constants';

interface CampanasTabProps {
  campFiltradas: Campana[];
  campanas: Campana[];
  entregas: Entrega[];
  beneficiarios: Beneficiario[];
  search: string; setSearch: Dispatch<SetStateAction<string>>;
  filterAnio: string; setFilterAnio: Dispatch<SetStateAction<string>>;
  filterTipoCamp: string; setFilterTipoCamp: Dispatch<SetStateAction<string>>;
  filterEstadoCamp: string; setFilterEstadoCamp: Dispatch<SetStateAction<string>>;
  openEditCamp: (id: string) => void;
  onVerCamp: (id: string) => void;
  onEntregaParaCamp: (id: string) => void;
  onDeleteCamp: (id: string) => void;
}

export function CampanasTab(props: CampanasTabProps) {
  const { campFiltradas, campanas, entregas, beneficiarios, search, setSearch, filterAnio, setFilterAnio, filterTipoCamp, setFilterTipoCamp, filterEstadoCamp, setFilterEstadoCamp, openEditCamp, onVerCamp, onEntregaParaCamp, onDeleteCamp } = props;
  return (
          <>
            <div className="search-bar">
              <input className="search-input" placeholder="🔍 Buscar nombre, responsable…" value={search} onChange={(e) => setSearch(e.target.value)} />
              <select className="filter-select" value={filterAnio} onChange={(e) => setFilterAnio(e.target.value)}>
                <option value="">Todos los años</option>
                {[...new Set(campanas.map(c => c.fechaInicio?.slice(0, 4)).filter(Boolean))].sort().reverse().map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <select className="filter-select" value={filterTipoCamp} onChange={(e) => setFilterTipoCamp(e.target.value)}>
                <option value="">Todos los tipos</option>
                <option>Alimentaria</option>
                <option>Escolar</option>
                <option>Salud</option>
                <option>Vivienda</option>
                <option>Navidad</option>
                <option>Otra</option>
              </select>
              <select className="filter-select" value={filterEstadoCamp} onChange={(e) => setFilterEstadoCamp(e.target.value)}>
                <option value="">Todos los estados</option>
                <option>Planificada</option>
                <option>En curso</option>
                <option>Finalizada</option>
              </select>
            </div>

            <div className="card">
              <div className="card-header">
                <div className="card-title">📢 Campañas Solidarias</div>
                <div style={{ fontSize: 12, color: 'var(--dim)' }}>{campFiltradas.length} campañas</div>
              </div>
              {campFiltradas.length === 0 ? (
                <EmptyState icon="📢" title={campanas.length ? 'Sin resultados' : 'Sin campañas aún'} sub={campanas.length ? 'Prueba otros filtros' : 'Crea la primera campaña'} />
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                  {campFiltradas.map((c) => {
                    const ents = entregas.filter((e) => e.campanaId === c.id);
                    const benefUnicos = new Set(ents.map((e) => e.beneficiarioId)).size;
                    const alcanzados = c.metaTipo === 'Personas'
                      ? ents.reduce((s, e) => { const b = beneficiarios.find(x => x.id === e.beneficiarioId); return s + (b?.familia || 1); }, 0)
                      : benefUnicos;
                    const progress = c.metaFamilias > 0 ? Math.min(100, Math.round((alcanzados / c.metaFamilias) * 100)) : 0;
                    const metaLabel = c.metaTipo === 'Personas' ? 'personas' : 'familias';
                    return (
                      <div key={c.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 14, borderLeft: `3px solid var(--manos-terracota)` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                          <div style={{ fontWeight: 800, fontSize: 14, flex: 1 }}>{c.nombre}</div>
                          <span className={`badge ${CAMP_EST[c.estado] || 'badge-blue'}`} style={{ marginLeft: 6 }}>{c.estado}</span>
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--dim)', marginBottom: 6 }}><span className={`badge ${TIPO_CAMP[c.tipo]}`} style={{ fontSize: 9 }}>{c.tipo}</span>{c.zona && ` · 📍 ${c.zona}`}</div>
                        <div style={{ fontSize: 12, color: 'var(--dim)', marginBottom: 4 }}>📅 {fmt(c.fechaInicio)}{c.fechaFin && ` → ${fmt(c.fechaFin)}`}</div>
                        <div style={{ fontSize: 12, color: 'var(--dim)', marginBottom: 8 }}>👤 {c.responsable || 'Sin responsable'}</div>
                        <div style={{ fontSize: 11, color: 'var(--dim)', marginBottom: 4 }}>👥 {alcanzados} / {c.metaFamilias || '∞'} {metaLabel}</div>
                        <div className="progress-bar" style={{ marginBottom: 10 }}>
                          <div className="progress-fill" style={{ width: `${progress}%`, background: 'var(--manos-terracota)' }} />
                        </div>
                        <div style={{ display: 'flex', gap: 5 }}>
                          <button className="btn btn-secondary btn-sm" onClick={() => onVerCamp(c.id)}>👁 Ver</button>
                          <button className="btn btn-secondary btn-sm" onClick={() => openEditCamp(c.id)}>✏️</button>
                          <button className="btn btn-secondary btn-sm" onClick={() => onEntregaParaCamp(c.id)}>📦</button>
                          <button className="btn btn-danger btn-sm" onClick={() => onDeleteCamp(c.id)}>🗑️</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
  );
}
