import { EmptyState } from '../../components/EmptyState';
import { CsvImportButton } from '../../components/CsvImportButton';
import { exportCSV } from '../../lib/csvExport';
import { exportEvangelismoPDF } from '../../lib/pdfExport';
import { showToast } from '../../lib/notification';
import { fmt } from '../../lib/utils';
import type { Evangelismo } from '../../lib/types';
import { TIPO_BADGE } from './constants';

interface EvangelismoTableProps {
  evangels: Evangelismo[];
  evangelsFiltrados: Evangelismo[];
  openEditEvang: (id: string) => void;
  onEliminar: (id: string) => void;
}

export function EvangelismoTable(props: EvangelismoTableProps) {
  const { evangels, evangelsFiltrados, openEditEvang, onEliminar } = props;
  return (
        <div className="card">
           <div className="card-header">
             <div style={{ display: 'flex', flexDirection: 'column' }}>
               <div className="card-title">📋 Actividades de Evangelismo</div>
               <div style={{ fontSize: 12, color: 'var(--dim)' }}>{evangelsFiltrados.length} de {evangels.length} actividades</div>
             </div>
             <div style={{ display: 'flex', gap: 5 }}>
               <button className="btn btn-secondary btn-sm" onClick={() => exportEvangelismoPDF({ evangelismos: evangels })}>📄 Exportar PDF</button>
                <button className="btn btn-secondary btn-sm" onClick={() => {
                  if (!evangels.length) return showToast('No hay actividades para exportar');
                  const h = ['Fecha', 'Tipo', 'Zona', 'Líder', 'Contactos', 'Conversiones', 'Notas'];
                  const r = evangels.map(e => [e.fecha, e.tipo, e.zona || '', e.lider || '', e.contactos || 0, e.conversiones || 0, (e.notas || '').replace(/,/g, ';')]);
                  exportCSV(h, r, 'lemgil-evangelismo.csv');
                  showToast('CSV exportado');
                }}>📥 Exportar CSV</button>
                <CsvImportButton
                  table="evangelismos"
                  fieldMapping={{
                    'Fecha': 'fecha',
                    'Tipo': 'tipo',
                    'Zona': 'zona',
                    'Líder': 'lider',
                    'Contactos': 'contactos',
                    'Conversiones': 'conversiones',
                    'Notas': 'notas',
                  }}
                  requiredFields={['fecha']}
                  defaults={{ fecha: () => new Date().toISOString().split('T')[0], contactos: 0, conversiones: 0, participantes: [] }}
                  onImport={(n) => showToast(`${n} actividad(es) importada(s)`)}
                />
              </div>
           </div>
           {evangels.length === 0 ? (
             <EmptyState icon="📢" title="Sin actividades aún" sub='Presiona "📋 Registrar Evangelismo" para comenzar' />
           ) : (
             <>
             {evangelsFiltrados.length === 0 ? (
              <EmptyState icon="🔍" title="Sin resultados" sub="Ajusta los filtros para ver actividades" />
            ) : (
            <table className="data-table">
              <thead><tr><th>#</th><th>Tipo</th><th>Zona</th><th>Fecha</th><th>Ministro</th><th>Equipo</th><th>Contactos</th><th>Conversiones</th><th>Acciones</th></tr></thead>
              <tbody>
                {evangelsFiltrados.map((e, i) => (
                  <tr key={e.id}>
                    <td style={{ color: 'var(--dim)' }}>{i + 1}</td>
                    <td><span className={`badge ${TIPO_BADGE[e.tipo] || 'badge-blue'}`}>{e.tipo}</span></td>
                    <td>{e.zona || '—'}</td>
                    <td>{fmt(e.fecha)}</td>
                    <td>{e.lider || '—'}</td>
                    <td>{e.participantes && e.participantes.length > 0 ? <span style={{ padding: '2px 8px', borderRadius: 6, background: 'var(--gold-glow)', color: 'var(--gold)', fontSize: 11, fontWeight: 700, border: '1px solid var(--gold)' }}>👥 {e.participantes.length}</span> : <span style={{ color: 'var(--dim)' }}>—</span>}</td>
                    <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--blue)' }}>{e.contactos}</td>
                    <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--green)' }}>{e.conversiones}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 5 }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => openEditEvang(e.id)}>✏️ Editar</button>
                        <button className="btn btn-danger btn-sm" onClick={() => { onEliminar(e.id); }}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            )}
            </>
          )}
        </div>
  );
}
