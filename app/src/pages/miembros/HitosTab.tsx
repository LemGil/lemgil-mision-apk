import type { Dispatch, SetStateAction } from 'react';
import { EmptyState } from '../../components/EmptyState';
import { CsvImportButton } from '../../components/CsvImportButton';
import { exportCSV } from '../../lib/csvExport';
import { exportHitosPDF } from '../../lib/pdfExport';
import { showToast } from '../../lib/notification';
import { fmt } from '../../lib/utils';
import type { Hito, Miembro } from '../../lib/types';
import { HITO_BADGE } from './constants';

interface HitosTabProps {
  hitos: Hito[];
  hitosList: Hito[];
  miembros: Miembro[];
  search: string; setSearch: Dispatch<SetStateAction<string>>;
  openNewH: (preM?: string) => void;
  openEditH: (id: string) => void;
  onEliminarH: (id: string) => void;
}

export function HitosTab(props: HitosTabProps) {
  const { hitos, hitosList, miembros, search, setSearch, openNewH, openEditH, onEliminarH } = props;
  return (
        <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">CRECIMIENTO ESPIRITUAL</div>
                <div className="card-sub">Hitos y eventos en la vida de cada miembro</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-secondary btn-sm" onClick={() => exportHitosPDF({ hitos, miembros })}>📄 Exportar PDF</button>
                <button className="btn btn-secondary btn-sm" onClick={() => {
                  if (!hitos.length) return showToast('No hay hitos para exportar');
                  const h = ['Fecha', 'Miembro', 'Tipo', 'Descripción'];
                  const r = hitos.map(h => {
                    const m = miembros.find(x => x.id === h.miembroId);
                    return [h.fecha, m ? `${m.nombre} ${m.apellido}` : '—', h.tipo, (h.descripcion || '').replace(/,/g, ';')];
                  });
                  exportCSV(h, r, 'lemgil-hitos.csv');
                  showToast('CSV exportado');
                }}>📥 Exportar CSV</button>
                <CsvImportButton
                  table="hitos"
                  fieldMapping={{
                    'Fecha': 'fecha',
                    'Tipo': 'tipo',
                    'Descripción': 'descripcion',
                    'Miembro': 'miembroId',
                  }}
                  requiredFields={['fecha', 'tipo', 'descripcion']}
                  defaults={{ fecha: () => new Date().toISOString().split('T')[0] }}
                  onImport={(n) => showToast(`${n} hito(s) importado(s)`)}
                />
                <button className="btn btn-gold" onClick={() => openNewH()}>➕ Nuevo hito</button>
              </div>
            </div>
          <div className="search-bar">
            <input className="search-input" placeholder="🔍 Buscar miembro, descripción..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          {hitosList.length === 0 ? (
            <EmptyState icon="📍" title="Sin hitos registrados" sub="Registra los momentos clave del crecimiento" />
          ) : (
            <div className="timeline">
              {hitosList.map((h) => {
                const m = miembros.find((x) => x.id === h.miembroId);
                return (
                  <div key={h.id} className="timeline-item">
                    <div className="timeline-date">{fmt(h.fecha)}</div>
                    <div className="timeline-dot" />
                    <div className="timeline-content">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span className={`badge ${HITO_BADGE[h.tipo]}`}>{h.tipo}</span>
                        {m && <strong>{m.nombre} {m.apellido}</strong>}
                      </div>
                      <div style={{ marginTop: 4, fontSize: 13 }}>{h.descripcion}</div>
                      <div style={{ marginTop: 6, display: 'flex', gap: 4 }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => openEditH(h.id)}>✏</button>
                        <button className="btn btn-danger btn-sm" onClick={() => onEliminarH(h.id)}>🗑</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
  );
}
