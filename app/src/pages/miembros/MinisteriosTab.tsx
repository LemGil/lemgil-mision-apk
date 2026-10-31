import { EmptyState } from '../../components/EmptyState';
import { CsvImportButton } from '../../components/CsvImportButton';
import { exportCSV } from '../../lib/csvExport';
import { exportMinisteriosPDF } from '../../lib/pdfExport';
import { showToast } from '../../lib/notification';
import type { Miembro, MiembroMinisterio, Ministerio } from '../../lib/types';

type MinisterioConStats = Ministerio & { asignados: number; miembros: Miembro[]; lideres: number };

interface MinisteriosTabProps {
  ministerios: Ministerio[];
  asignaciones: MiembroMinisterio[];
  miembros: Miembro[];
  ministeriosConStats: MinisterioConStats[];
  openNewMin: () => void;
  openEditMin: (id: string) => void;
  openNewAsig: (preM?: string, preMin?: string) => void;
  onEliminarMin: (id: string) => void;
  onQuitarAsig: (id: string) => void;
}

export function MinisteriosTab(props: MinisteriosTabProps) {
  const { ministerios, asignaciones, miembros, ministeriosConStats, openNewMin, openEditMin, openNewAsig, onEliminarMin, onQuitarAsig } = props;
  return (
        <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">⛪ MINISTERIOS Y ASIGNACIONES</div>
                <div className="card-sub">Gestiona tus ministerios y sus integrantes</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-secondary btn-sm" onClick={() => exportMinisteriosPDF({ ministerios, asignaciones, miembros })}>📄 Exportar PDF</button>
                <button className="btn btn-secondary btn-sm" onClick={() => {
                  if (!ministerios.length) return showToast('No hay ministerios para exportar');
                  const h = ['Ministerio', 'Líder', 'Miembros'];
                  const r = ministerios.map(m => {
                    const count = asignaciones.filter(a => a.ministerioId === m.id).length;
                    return [m.nombre, m.lider || '', count];
                  });
                  exportCSV(h, r, 'lemgil-ministerios.csv');
                  showToast('CSV exportado');
                }}>📥 Exportar CSV</button>
                <CsvImportButton
                  table="ministerios"
                  fieldMapping={{
                    'Ministerio': 'nombre',
                    'Nombre': 'nombre',
                    'Líder': 'lider',
                    'Descripción': 'descripcion',
                    'Color': 'color',
                    'Emoji': 'emoji',
                  }}
                  requiredFields={['nombre']}
                  defaults={{ color: '#C9A24A', emoji: '⛪' }}
                  onImport={(n) => showToast(`${n} ministerio(s) importado(s)`)}
                />
                <button className="btn btn-gold" onClick={openNewMin}>➕ Nuevo ministerio</button>
              </div>
            </div>
          {ministeriosConStats.length === 0 ? (
            <EmptyState icon="⛪" title="Sin ministerios" sub="Crea los ministerios de tu iglesia" />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
              {ministeriosConStats.map((mn) => (
                <div key={mn.id} className="card" style={{ borderLeft: `4px solid ${mn.color}`, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ fontSize: 24 }}>{mn.emoji}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 800 }}>{mn.nombre}</div>
                      <div style={{ fontSize: 11, color: 'var(--dim)' }}>{mn.lider ? `Ministro: ${mn.lider}` : 'Sin ministro definido'}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => openEditMin(mn.id)}>✏️</button>
                      <button className="btn btn-danger btn-sm" onClick={() => onEliminarMin(mn.id)}>🗑️</button>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--dim)', background: 'var(--surface-2)', padding: '6px 10px', borderRadius: 6 }}>{mn.descripcion || 'Sin descripción'}</div>
                  
                  <div style={{ marginTop: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <div style={{ fontWeight: 700, fontSize: 12 }}>Integrantes ({mn.miembros.length})</div>
                      <button className="btn btn-gold btn-sm" onClick={() => openNewAsig(undefined, mn.id)}>➕ Asignar</button>
                    </div>
                    {mn.miembros.length === 0 ? <div style={{ fontSize: 12, color: 'var(--dim)', fontStyle: 'italic' }}>Sin miembros asignados</div> : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {mn.miembros.map((m) => {
                          const asig = asignaciones.find(a => a.miembroId === m.id && a.ministerioId === mn.id);
                          return (
                            <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 8px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 4, fontSize: 12 }}>
                              <span><strong>{m.nombre} {m.apellido}</strong> <span style={{ color: 'var(--dim)' }}>({asig?.rol})</span></span>
                              <button type="button" className="btn btn-danger btn-sm" style={{ padding: '2px 6px' }} onClick={() => { if(asig) { onQuitarAsig(asig.id); } }}>🗑</button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
  );
}
