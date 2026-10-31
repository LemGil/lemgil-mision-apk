import { EmptyState } from '../../components/EmptyState';
import { CsvImportButton } from '../../components/CsvImportButton';
import { exportCSV } from '../../lib/csvExport';
import { exportGruposMisionPDF } from '../../lib/pdfExport';
import { showToast } from '../../lib/notification';
import type { Conversion, Grupo, Miembro } from '../../lib/types';

interface GruposTabProps {
  grupos: Grupo[];
  gruposFiltrados: Grupo[];
  convs: Conversion[];
  miembros: Miembro[];
  openEditGrupo: (id: string) => void;
  onEliminar: (id: string) => void;
}

export function GruposTab(props: GruposTabProps) {
  const { grupos, gruposFiltrados, convs, miembros, openEditGrupo, onEliminar } = props;
  return (
        <div className="card">
           <div className="card-header">
             <div style={{ display: 'flex', flexDirection: 'column' }}>
               <div className="card-title">🏘️ Grupos de Discipulado</div>
               <div style={{ fontSize: 12, color: 'var(--dim)' }}>{gruposFiltrados.length} de {grupos.length} grupos</div>
             </div>
             <div style={{ display: 'flex', gap: 5 }}>
               <button className="btn btn-secondary btn-sm" onClick={() => exportGruposMisionPDF({ grupos, miembros })}>📄 Exportar PDF</button>
                <button className="btn btn-secondary btn-sm" onClick={() => {
                  if (!grupos.length) return showToast('No hay grupos para exportar');
                  const h = ['Nombre', 'Zona', 'Líder', 'Día', 'Hora', 'Capacidad', 'Lugar'];
                  const r = grupos.map(g => [g.nombre, g.zona || '', g.lider || '', g.dia || '', g.hora || '', g.capacidad || '', g.lugar || '']);
                  exportCSV(h, r, 'lemgil-grupos-mision.csv');
                  showToast('CSV exportado');
                }}>📥 Exportar CSV</button>
                <CsvImportButton
                  table="grupos"
                  fieldMapping={{
                    'Nombre': 'nombre',
                    'Zona': 'zona',
                    'Líder': 'lider',
                    'Día': 'dia',
                    'Hora': 'hora',
                    'Capacidad': 'capacidad',
                    'Lugar': 'lugar',
                  }}
                  requiredFields={['nombre']}
                  defaults={{ zona: '', lider: '', miembros: 0, planOfrendasMensual: 0 }}
                  onImport={(n) => showToast(`${n} grupo(s) importado(s)`)}
                />
              </div>
           </div>
           {grupos.length === 0 ? (
             <EmptyState icon="👥" title="Sin grupos aún" sub="Crea el primer grupo" />
           ) : (
             <>
             {gruposFiltrados.length === 0 ? (
              <EmptyState icon="🔍" title="Sin resultados" sub="Ajusta los filtros para ver grupos" />
            ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
              {gruposFiltrados.map((g) => {
      const convsEnProceso = convs.filter(c => c.grupoId === g.id && c.estado !== 'Integrado' && c.estado !== 'Apartado' && c.estado !== 'Fallecido');
                const cantNuevo = convsEnProceso.filter(c => c.estado === 'Nuevo').length;
                const cantDiscip = convsEnProceso.filter(c => c.estado === 'Discipulado').length;
                const cantBaut = convsEnProceso.filter(c => c.estado === 'Bautizado').length;
                const cantMiembros = miembros.filter(m => m.grupoId === g.id).length;
                const totalAsignados = cantMiembros + convsEnProceso.length;
                const capacidad = parseInt(g.capacidad) || 0;
                const pctCap = capacidad > 0 ? (totalAsignados / capacidad) * 100 : 0;
                const statusColor = pctCap >= 100 ? 'var(--red)' : pctCap >= 70 ? 'var(--yellow)' : 'var(--green)';
                const statusLabel = capacidad > 0 ? (pctCap >= 100 ? '🔴 Saturado' : pctCap >= 70 ? '🟡 Casi Lleno' : '🟢 Disponible') : '⚪ Sin meta';
                const alertas = [];
                if (!g.lider || !g.lider.trim()) alertas.push({ color: 'var(--red)', icon: '⚠️', text: 'Sin líder' });
                if (totalAsignados === 0) alertas.push({ color: 'var(--blue)', icon: '🆕', text: 'Nuevo' });
                else if (capacidad > 0 && pctCap < 30) alertas.push({ color: 'var(--gold)', icon: '🌱', text: 'En desarrollo' });
                const etapas = [
                  { key: 'nuevo', icon: '🌱', label: 'Nuevos', cant: cantNuevo, color: 'var(--green)' },
                  { key: 'discip', icon: '📖', label: 'Discip.', cant: cantDiscip, color: 'var(--blue)' },
                  { key: 'baut', icon: '💧', label: 'Bautiz.', cant: cantBaut, color: 'var(--purple)' },
                  { key: 'miemb', icon: '👥', label: 'Integr.', cant: cantMiembros, color: 'var(--gold)' },
                ];
                return (
                  <div key={g.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 9, padding: 14, position: 'relative' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 5 }}>
                      <div style={{ fontWeight: 800, fontSize: 14, flex: 1 }}>{g.nombre}</div>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 10, background: `${statusColor}22`, color: statusColor, border: `1px solid ${statusColor}`, whiteSpace: 'nowrap' }}>{statusLabel}</span>
                    </div>
                    {alertas.length > 0 && (
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
                        {alertas.map((a, i) => <span key={i} style={{ fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 8, background: `${a.color}15`, color: a.color, border: `1px solid ${a.color}55` }}>{a.icon} {a.text}</span>)}
                      </div>
                    )}
                    <div style={{ fontSize: 12, color: 'var(--dim)', marginBottom: 8 }}>📍 {g.zona || '—'} · 👤 {g.lider || '—'}</div>
                    <div style={{ fontSize: 11, color: 'var(--dim)' }}>📅 {g.dia} {g.hora}{g.lugar && ` · ${g.lugar}`}</div>
                    <div style={{ marginTop: 10, padding: '8px 10px', background: 'var(--bg-input)', borderRadius: 8, border: '1px solid var(--border)' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, marginBottom: 8 }}>
                        {etapas.map((e) => (
                          <div key={e.key} style={{ textAlign: 'center', padding: '4px 2px', borderRadius: 6, background: e.cant > 0 ? `${e.color}15` : 'transparent', border: e.cant > 0 ? `1px solid ${e.color}55` : '1px solid transparent' }}>
                            <div style={{ fontSize: 16, fontWeight: 800, color: e.cant > 0 ? e.color : 'var(--dim)', lineHeight: 1 }}>{e.cant}</div>
                            <div style={{ fontSize: 9, color: e.cant > 0 ? e.color : 'var(--dim)', marginTop: 2, fontWeight: 600 }}>{e.icon} {e.label}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, paddingTop: 6, borderTop: '1px solid var(--border)' }}>
                        <span style={{ color: 'var(--dim)' }}>Total asignados</span>
                        <span style={{ fontWeight: 800, color: statusColor }}>{totalAsignados}{capacidad > 0 ? ` / ${capacidad}` : ''}</span>
                      </div>
                      {capacidad > 0 && (
                        <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden', marginTop: 6 }}>
                          <div style={{ height: '100%', width: `${Math.min(pctCap, 100)}%`, background: statusColor, transition: 'width 0.4s' }}></div>
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 5, marginTop: 10 }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => openEditGrupo(g.id)}>✏️ Editar</button>
                      <button className="btn btn-danger btn-sm" onClick={() => { onEliminar(g.id); }}>🗑️</button>
                    </div>
                  </div>
                );
              })}
            </div>
            )}
            </>
          )}
      </div>
  );
}
