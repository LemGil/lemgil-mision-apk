import type { Dispatch, SetStateAction } from 'react';
import { exportCSV } from '../../lib/csvExport';
import { CsvImportButton } from '../../components/CsvImportButton';
import { showToast } from '../../lib/notification';
import { exportRegistrosPDF } from '../../lib/pdfExport';
import { money, MS_SHORT } from '../../lib/utils';
import type { AporteComun, Diezmador, Grupo } from '../../lib/types';

interface RegistrosTabProps {
  registrosFiltrados: AporteComun[];
  aportes: AporteComun[];
  colaboradores: Diezmador[];
  grupos: Grupo[];
  totalesReg: { total: number; diezmos: number; ofrendas: number };
  onNuevoAporte: () => void;
  handleEditAporte: (a: AporteComun) => void;
  onDeleteAporte: (id: string) => void;
  searchReg: string; setSearchReg: Dispatch<SetStateAction<string>>;
  filterAnio: string; setFilterAnio: Dispatch<SetStateAction<string>>;
  filterMes: string; setFilterMes: Dispatch<SetStateAction<string>>;
  filterTipo: string; setFilterTipo: Dispatch<SetStateAction<string>>;
  filterMetodo: string; setFilterMetodo: Dispatch<SetStateAction<string>>;
  filterDiezmador: string; setFilterDiezmador: Dispatch<SetStateAction<string>>;
  filterGrupo: string; setFilterGrupo: Dispatch<SetStateAction<string>>;
  filterMontoMin: string; setFilterMontoMin: Dispatch<SetStateAction<string>>;
  filterMontoMax: string; setFilterMontoMax: Dispatch<SetStateAction<string>>;
  filterFechaDesde: string; setFilterFechaDesde: Dispatch<SetStateAction<string>>;
  filterFechaHasta: string; setFilterFechaHasta: Dispatch<SetStateAction<string>>;
}

export function RegistrosTab(props: RegistrosTabProps) {
  const { registrosFiltrados, aportes, colaboradores, grupos, totalesReg, onNuevoAporte, handleEditAporte, onDeleteAporte, searchReg, setSearchReg, filterAnio, setFilterAnio, filterMes, setFilterMes, filterTipo, setFilterTipo, filterMetodo, setFilterMetodo, filterDiezmador, setFilterDiezmador, filterGrupo, setFilterGrupo, filterMontoMin, setFilterMontoMin, filterMontoMax, setFilterMontoMax, filterFechaDesde, setFilterFechaDesde, filterFechaHasta, setFilterFechaHasta } = props;
  return (
            <div className="page-content">
                <div className="actions-row">
                    <button className="btn btn-gold" onClick={onNuevoAporte}>➕ Registrar Aporte</button>
                    <button className="btn btn-secondary" onClick={() => exportRegistrosPDF({ aportes: registrosFiltrados, colaboradores, grupos, filters: { tipo: filterTipo, mes: filterMes, dador: filterDiezmador } })}>📄 Exportar PDF</button>
                    <button className="btn btn-secondary" onClick={() => {
                        if (!registrosFiltrados.length) return showToast('No hay registros para exportar');
                        const h = ['Fecha', 'Colaborador', 'Tipo', 'Monto', 'Método', 'Referencia', 'Notas'];
                        const r = registrosFiltrados.map(a => {
                            const c = colaboradores.find(x => x.id === a.diezmadorId);
                            return [a.fecha, c ? `${c.nombre} ${c.apellido}` : '—', a.tipo, a.monto, a.metodo, a.referencia || '', (a.notas || '').replace(/,/g, ';')];
                        });
                        exportCSV(h, r, 'lemgil-registros.csv');
                        showToast('CSV exportado');
                    }}>📥 Exportar CSV</button>
                    <CsvImportButton
                      table="aportesComun"
                      fieldMapping={{
                        'Fecha': 'fecha',
                        'Colaborador': 'diezmadorId',
                        'Grupo': 'grupoId',
                        'Tipo': 'tipo',
                        'Monto': 'monto',
                        'Método': 'metodo',
                        'Mes': 'mesCorrespondiente',
                        'Referencia': 'referencia',
                        'Notas': 'notas',
                      }}
                      requiredFields={['fecha', 'monto']}
                      defaults={{ fecha: () => new Date().toISOString().split('T')[0], tipo: 'Diezmo', metodo: 'Efectivo' }}
                      onImport={(n) => showToast(`${n} registro(s) importado(s)`)}
                    />
                </div>
                <div className="search-bar">
                    <input className="search-input" placeholder="🔍 Buscar..." value={searchReg} onChange={e => setSearchReg(e.target.value)} />
                    <select className="filter-select" value={filterAnio} onChange={e => { setFilterAnio(e.target.value); setFilterMes(''); }}>
                        <option value="">Todos los años</option>
                        {[...new Set(aportes.map(a => a.fecha?.slice(0, 4)).filter(Boolean))].sort().reverse().map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <select className="filter-select" value={filterMes} onChange={e => setFilterMes(e.target.value)}>
                        <option value="">Todos los meses</option>
                        {MS_SHORT.map((m, i) => <option key={m} value={`${filterAnio || new Date().getFullYear()}-${String(i+1).padStart(2, '0')}`}>{m}</option>)}
                    </select>
                    <select className="filter-select" value={filterTipo} onChange={e => setFilterTipo(e.target.value)}><option value="">Todos los tipos</option><option>Diezmo</option><option>Ofrenda</option></select>
                    <select className="filter-select" value={filterMetodo} onChange={e => setFilterMetodo(e.target.value)}>
                        <option value="">Todos los métodos</option>
                        <option>Efectivo</option>
                        <option>Transferencia</option>
                        <option>Cheque</option>
                        <option>Tarjeta</option>
                        <option>Otro</option>
                    </select>
                    <select className="filter-select" value={filterDiezmador} onChange={e => setFilterDiezmador(e.target.value)}><option value="">Todos los diezmadores</option>{colaboradores.map(c => <option key={c.id} value={c.id}>{c.nombre} {c.apellido}</option>)}</select>
                    <select className="filter-select" value={filterGrupo} onChange={e => setFilterGrupo(e.target.value)}><option value="">Todos los grupos</option>{grupos.map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}</select>
                    <input className="search-input" style={{maxWidth: 100}} type="number" placeholder="Mín ($)" value={filterMontoMin} onChange={(e) => setFilterMontoMin(e.target.value)} />
                    <input className="search-input" style={{maxWidth: 100}} type="number" placeholder="Máx ($)" value={filterMontoMax} onChange={(e) => setFilterMontoMax(e.target.value)} />
                    <input className="search-input" style={{maxWidth: 140}} type="date" value={filterFechaDesde} onChange={(e) => setFilterFechaDesde(e.target.value)} />
                    <input className="search-input" style={{maxWidth: 140}} type="date" value={filterFechaHasta} onChange={(e) => setFilterFechaHasta(e.target.value)} />
                    {(searchReg || filterTipo || filterMes || filterDiezmador || filterGrupo || filterAnio || filterMetodo || filterMontoMin || filterMontoMax || filterFechaDesde || filterFechaHasta) && (
                        <button className="btn btn-secondary btn-sm" onClick={() => { setSearchReg(''); setFilterTipo(''); setFilterMes(''); setFilterDiezmador(''); setFilterGrupo(''); setFilterAnio(''); setFilterMetodo(''); setFilterMontoMin(''); setFilterMontoMax(''); setFilterFechaDesde(''); setFilterFechaHasta(''); }}>✕ Limpiar</button>
                    )}
                </div>
                <div className="card">
                    <div className="card-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px'}}>
                        <h3 className="card-title">📋 Historial de Diezmos y Ofrendas</h3>
                        <span style={{fontSize: '12px', color: 'var(--dim)'}}>{registrosFiltrados.length} registros</span>
                    </div>
                    <div className="totales-row" style={{display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', padding: '12px', background: 'var(--bg-input)', borderRadius: '8px', marginBottom: '20px', border: '1px solid var(--border)'}}>
                        <div className="total-item" style={{textAlign: 'center'}}>
                            <div className="total-label">TOTAL</div><div className="total-val" style={{color: 'var(--gold)'}}>{money(totalesReg.total)}</div>
                        </div>
                        <div className="total-item" style={{textAlign: 'center'}}>
                            <div className="total-label">DIEZMOS</div><div className="total-val" style={{color: 'var(--green)'}}>{money(totalesReg.diezmos)}</div>
                        </div>
                        <div className="total-item" style={{textAlign: 'center'}}>
                            <div className="total-label">OFRENDAS</div><div className="total-val" style={{color: 'var(--yellow)'}}>{money(totalesReg.ofrendas)}</div>
                        </div>
                        <div className="total-item" style={{textAlign: 'center'}}>
                            <div className="total-label">REGISTROS</div><div className="total-val" style={{color: 'var(--blue)'}}>{registrosFiltrados.length}</div>
                        </div>
                    </div>
                    <table className="data-table">
                        <thead><tr><th>#</th><th>Diezmador</th><th>Tipo</th><th>Monto</th><th>Fecha</th><th>Servicio</th><th>Método</th><th>Acciones</th></tr></thead>
                        <tbody>
                                 {registrosFiltrados.map((a) => (
                                     <tr key={a.id}>
                                         <td style={{color: 'var(--dim)'}}>{aportes.indexOf(a) + 1}</td>
                                         <td style={{fontWeight: 600}}>{colaboradores.find(c => c.id === a.diezmadorId)?.nombre || grupos.find(g => g.id === a.grupoId)?.nombre || 'Anónimo'}</td>
                                         <td><span className={`badge ${a.tipo === 'Diezmo' ? 'badge-purple' : 'badge-blue'}`}>{a.tipo}</span></td>
                                         <td style={{fontWeight: 700, color: 'var(--gold)'}}>{money(a.monto)}</td>
                                         <td>{a.fecha}</td>
                                         <td style={{color: 'var(--dim)'}}>{a.notas.split('|')[0]?.trim() || 'General'}</td>
                                         <td style={{color: 'var(--dim)'}}>{a.metodo || '—'}</td>
                                          <td>
                                             <div style={{display: 'flex', gap: '5px'}}>
                                                 <button className="btn btn-secondary btn-sm" onClick={() => handleEditAporte(a)}>✏️</button>
                                                 <button className="btn btn-danger btn-sm" onClick={() => onDeleteAporte(a.id)}>🗑</button>
                                             </div>
                                         </td>
                                     </tr>
                                 ))}

                        </tbody>
                    </table>
                </div>
            </div>
  );
}
