import { EmptyState } from '../../components/EmptyState';
import { exportConversionesPDF, safeExport } from '../../lib/pdfExport';
import { fmt } from '../../lib/utils';
import type { Conversion, Grupo, PasoSeguimiento } from '../../lib/types';
import { badgeDe, esGozne, etiquetaDe } from '../../lib/pasosMision';

interface ConversionesTableProps {
  /** Catálogo de pasos (Fase 2): insignia y etiqueta vivas del estado. */
  pasos: PasoSeguimiento[];
  convs: Conversion[];
  filtered: Conversion[];
  /**
   * F11: ids de conversiones que tienen MIEMBRO de verdad (vinculado
   * por `conversionId` o porque su persona tiene proceso de miembro).
   * La insignia «✓ Miembro» sale de aquí, no solo del estado: antes la
   * tabla la afirmaba para todo el que estuviera en el gozne, tuviera
   * o no miembro — el detalle sí contrastaba y se contradecían.
   */
  convsConMiembro: Set<string>;
  grupos: Grupo[];
  filterEstado: string;
  filterZona: string;
  filterAnoConv: string;
  filterMesConv: string;
  openDetail: (id: string) => void;
  openEditConv: (id: string) => void;
  quickAdv: (id: string) => void;
}

export function ConversionesTable(props: ConversionesTableProps) {
  const { pasos, convs, filtered, convsConMiembro, grupos, filterEstado, filterZona, filterAnoConv, filterMesConv, openDetail, openEditConv, quickAdv } = props;
  return (
        <div className="card">
           <div className="card-header">
             <div style={{ display: 'flex', flexDirection: 'column' }}>
               <div className="card-title">📋 Registro de Conversiones</div>
               <div style={{ fontSize: 12, color: 'var(--dim)' }}>{convs.length} registros</div>
             </div>
             <button className="btn btn-secondary btn-sm" onClick={() => safeExport(() => exportConversionesPDF({ conversiones: convs, filtros: { estado: filterEstado, zona: filterZona, ano: filterAnoConv, mes: filterMesConv }, pasos }))}>📄 Exportar PDF</button>
           </div>
           {filtered.length === 0 ? (
             <EmptyState icon="🌱" title="Sin registros aún" sub='Presiona "➕ Nueva Conversión" para comenzar' />
           ) : (
             <table className="data-table">
                <thead><tr><th>#</th><th>Nombre</th><th>Zona</th><th>Fecha</th><th>Mayor</th><th>Grupo</th><th>Estado</th><th>Acciones</th></tr></thead>
                <tbody>
                  {filtered.map((c, i) => {
                    const grupoAsignado = c.grupoId ? grupos.find(g => g.id === c.grupoId) : null;
                    return (
                    <tr key={c.id}>
                      <td style={{ color: 'var(--dim)' }}>{i + 1}</td>
                     <td><strong>{c.nombre} {c.apellido}</strong>{c.telefono && <><br /><span style={{ fontSize: 10, color: 'var(--dim)' }}>{c.telefono}</span></>}</td>
                     <td>{c.zona || '—'}</td>
                     <td>{fmt(c.fecha)}</td>
                     <td>{c.lider || '—'}</td>
                     <td>{grupoAsignado ? <span style={{ display: 'inline-block', padding: '3px 8px', borderRadius: '6px', background: 'var(--gold-glow)', color: 'var(--gold)', fontSize: '11px', fontWeight: 700, border: '1px solid var(--gold)', whiteSpace: 'nowrap' }}>👥 {grupoAsignado.nombre}</span> : <span style={{ color: 'var(--dim)', fontSize: '11px' }}>—</span>}</td>
                     <td><span className={`badge ${badgeDe(pasos, c.estado)}`}>{etiquetaDe(pasos, c.estado)}</span>{convsConMiembro.has(c.id) ? <><br /><span style={{ padding: '1px 5px', borderRadius: 4, background: 'var(--gold-glow)', color: 'var(--gold)', fontSize: 9, fontWeight: 700, border: '1px solid var(--gold)' }}>✓ Miembro</span></> : esGozne(pasos, c.estado) && <><br /><span style={{ padding: '1px 5px', borderRadius: 4, background: 'var(--surface-2)', color: 'var(--red, #ef4444)', fontSize: 9, fontWeight: 700, border: '1px solid var(--red, #ef4444)' }}>⚠ Sin miembro</span></>}</td>
                     <td>
                       <div style={{ display: 'flex', gap: 4, whiteSpace: 'nowrap' }}>
                         <button className="btn btn-secondary btn-sm" onClick={() => openDetail(c.id)}>👁</button>
                         <button className="btn btn-secondary btn-sm" onClick={() => openEditConv(c.id)}>✏️</button>
                         <button className="btn btn-secondary btn-sm" onClick={() => quickAdv(c.id)}>⬆</button>
                       </div>
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
