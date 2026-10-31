import type { Dispatch, SetStateAction } from 'react';
import { accentStyle, money } from '../../lib/utils';
import type { Aporte, Colaborador } from '../../lib/types';
import { TIPO_BADGE } from './constants';
import type { SubTab } from './constants';

interface ResumenTabProps {
  subTab: SubTab;
  setSubTab: Dispatch<SetStateAction<SubTab>>;
  anioResumen: string;
  setAnioResumen: Dispatch<SetStateAction<string>>;
  aportes: Aporte[];
  dadores: Colaborador[];
  resumenAnual: { total: number; porTipo: Array<{ tipo: string; total: number }> };
  resumenCompleto: { mesesData: Array<{ mes: string; total: number; porTipo: Array<{ tipo: string; total: number }> }>; mejorMes: { mes: string; total: number; porTipo: Array<{ tipo: string; total: number }> } | null; promedioMensual: number; totalAportes: number; activosAnio: number; topDadores: Array<{ id: string; nombre: string; apellido: string; total: number; regs: number }>; variacionTotal: number | null };
  cumplimiento: { metaGlobalAnual: number; metaGlobalMes: number; totalRecAnio: number; pctGlobal: number; metaAcumuladaEsperada: number; cumplimientoDadores: Array<{ id: string; nombre: string; apellido: string; tipo: string; plan: number; metaAnual: number; total: number; regs: number; pct: number | null }>; periodos: Array<{ etiqueta: string; tipo: 'mes'; total: number; metaEsperada: number; pct: number | null; idx: number }> };
}

export function ResumenTab(props: ResumenTabProps) {
  const { subTab, setSubTab, anioResumen, setAnioResumen, aportes, dadores, resumenAnual, resumenCompleto, cumplimiento } = props;
  return (
          <div className="page-content">
            <div className="actions-row between">
              <div style={{display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap'}}>
                <span style={{fontSize: '18px', fontWeight: 700}}>📅 Año:</span>
                <select className="filter-select" value={anioResumen} onChange={e => setAnioResumen(e.target.value)} style={{fontWeight: 600}}>
                  {[...new Set(aportes.map(a => a.fecha.slice(0, 4)))].sort().reverse().map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div style={{padding: '8px 16px', background: 'var(--gold-glow)', borderRadius: '12px', border: '1px solid var(--gold)', fontSize: '14px', fontWeight: 700, color: 'var(--gold)', display: 'flex', alignItems: 'center', gap: '8px'}}>
                <span style={{fontSize: '18px'}}>💰</span> Total Anual: {money(resumenAnual.total)}
              </div>
            </div>

            <div className="tabs" style={{marginBottom: '20px', flexWrap: 'wrap'}}>
              {[{k: 'general', l: '📈 GENERAL'}, {k: 'mensual', l: '📊 MENSUAL'}, {k: 'top', l: '🏅 TOP'}, {k: 'metas', l: '🎯 METAS'}, {k: 'cumplimiento', l: '✅ CUMPLIMIENTO'}].map(s => (
                <button key={s.k} className={`tab ${subTab === s.k ? 'active' : ''}`} onClick={() => setSubTab(s.k as SubTab)}>{s.l}</button>
              ))}
            </div>

            {subTab === 'general' && (
              <>
                <div className="kpis" style={{marginBottom: '24px'}}>
                  <div className="kpi" style={accentStyle('var(--gold)')}>
                    <div className="kpi-label">Total Recaudado</div>
                    <div className="kpi-value">{money(resumenAnual.total)}</div>
                    {resumenCompleto.variacionTotal !== null && (
                      <div style={{fontSize: '12px', fontWeight: 700, marginTop: '4px', color: resumenCompleto.variacionTotal >= 0 ? 'var(--green)' : 'var(--red)'}}>
                        {resumenCompleto.variacionTotal >= 0 ? '↗' : '↘'} {Math.abs(resumenCompleto.variacionTotal).toFixed(1)}% vs {parseInt(anioResumen) - 1}
                      </div>
                    )}
                    <div className="kpi-icon">💰</div>
                  </div>
                  {resumenAnual.porTipo.map(t => (
                    <div key={t.tipo} className="kpi" style={accentStyle('var(--blue)')}>
                      <div className="kpi-label">{t.tipo}</div>
                      <div className="kpi-value">{money(t.total)}</div>
                      <div className="kpi-icon">📊</div>
                    </div>
                  ))}
                  <div className="kpi" style={accentStyle('var(--green)')}>
                    <div className="kpi-label">Colaboradores Activos</div>
                    <div className="kpi-value">{resumenCompleto.activosAnio}</div>
                    <div style={{fontSize: '12px', fontWeight: 600, marginTop: '4px', color: 'var(--dim)'}}>de {dadores.length} registrados</div>
                    <div className="kpi-icon">👥</div>
                  </div>
                </div>

                <div className="card">
                  <div className="card-header">
                    <h3 className="card-title">📈 Estadísticas Destacadas</h3>
                  </div>
                  <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px'}}>
                    <div style={{padding: '16px', background: 'var(--bg-input)', borderRadius: '12px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '12px'}}>
                      <div style={{width: '44px', height: '44px', borderRadius: '12px', background: 'var(--gold-glow)', border: '1px solid var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px'}}>🏆</div>
                      <div>
                        <div style={{fontSize: '11px', color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600}}>Mejor Mes</div>
                        <div style={{fontSize: '16px', fontWeight: 800, color: 'var(--gold)'}}>{resumenCompleto.mejorMes ? resumenCompleto.mejorMes.mes : '—'}</div>
                        {resumenCompleto.mejorMes && <div style={{fontSize: '12px', color: 'var(--dim)'}}>{money(resumenCompleto.mejorMes.total)}</div>}
                      </div>
                    </div>
                    <div style={{padding: '16px', background: 'var(--bg-input)', borderRadius: '12px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '12px'}}>
                      <div style={{width: '44px', height: '44px', borderRadius: '12px', background: 'var(--bg-input)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px'}}>📊</div>
                      <div>
                        <div style={{fontSize: '11px', color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600}}>Promedio Mensual</div>
                        <div style={{fontSize: '16px', fontWeight: 800, color: 'var(--green)'}}>{money(resumenCompleto.promedioMensual)}</div>
                        <div style={{fontSize: '12px', color: 'var(--dim)'}}>con actividad</div>
                      </div>
                    </div>
                    <div style={{padding: '16px', background: 'var(--bg-input)', borderRadius: '12px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '12px'}}>
                      <div style={{width: '44px', height: '44px', borderRadius: '12px', background: 'var(--bg-input)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px'}}>📋</div>
                      <div>
                        <div style={{fontSize: '11px', color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600}}>Total Aportes</div>
                        <div style={{fontSize: '16px', fontWeight: 800, color: 'var(--blue)'}}>{resumenCompleto.totalAportes}</div>
                        <div style={{fontSize: '12px', color: 'var(--dim)'}}>registros del año</div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {subTab === 'mensual' && (
              <>
                <div className="card" style={{marginBottom: '24px'}}>
                  <div className="card-header">
                    <h3 className="card-title">📊 Recaudación Mensual Visual</h3>
                  </div>
                  <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                    {resumenCompleto.mesesData.map((m, i) => {
                      const isCurrent = i === new Date().getMonth() && parseInt(anioResumen) === new Date().getFullYear();
                      return (
                        <div key={m.mes} style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                          <div style={{width: '40px', fontSize: '12px', fontWeight: 700, color: isCurrent ? 'var(--gold)' : 'var(--dim)', textTransform: 'uppercase'}}>{m.mes}</div>
                          <div style={{flex: 1, height: '32px', background: 'var(--bg-input)', borderRadius: '8px', overflow: 'hidden', position: 'relative', border: isCurrent ? '1px solid var(--gold)' : '1px solid var(--border)'}}>
                            {m.total > 0 && (
                              <div style={{position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', background: 'var(--green)', display: 'flex', alignItems: 'center', paddingLeft: '8px', fontSize: '10px', fontWeight: 700, color: 'white', transition: 'width 0.5s'}}></div>
                            )}
                          </div>
                          <div style={{width: '90px', textAlign: 'right', fontSize: '13px', fontWeight: 700, color: m.total > 0 ? 'var(--gold)' : 'var(--dim)'}}>{money(m.total)}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="card">
                  <div className="card-header">
                    <h3 className="card-title">📅 Detalle Mensual de Recaudación</h3>
                  </div>
                  <table className="data-table">
                    <thead>
                      <tr style={{background: 'var(--bg-input)'}}>
                        <th style={{textAlign: 'left'}}>MES</th>
                        {resumenAnual.porTipo.map(t => (
                          <th key={t.tipo} style={{textAlign: 'right'}}>{t.tipo.toUpperCase()}</th>
                        ))}
                        <th style={{textAlign: 'right', color: 'var(--gold)'}}>TOTAL</th>
                        <th style={{textAlign: 'center'}}>%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resumenCompleto.mesesData.map((m, i) => {
                        const isCurrent = i === new Date().getMonth() && parseInt(anioResumen) === new Date().getFullYear();
                        const pctAnual = resumenAnual.total > 0 ? (m.total / resumenAnual.total) * 100 : 0;
                        return (
                          <tr key={m.mes} style={{background: isCurrent ? 'var(--gold-glow)' : (m.total > 0 ? 'var(--bg-input)' : 'transparent'), transition: 'background 0.2s', borderLeft: isCurrent ? '3px solid var(--gold)' : 'none'}}>
                            <td style={{fontWeight: 600}}>{m.mes} {isCurrent && '⭐'}</td>
                            {resumenAnual.porTipo.map(t => {
                              const val = m.porTipo.find(p => p.tipo === t.tipo)?.total || 0;
                              return <td key={t.tipo} style={{textAlign: 'right', color: val > 0 ? 'var(--green)' : 'var(--dim)'}}>{money(val)}</td>;
                            })}
                            <td style={{textAlign: 'right', fontWeight: 700, color: m.total > 0 ? 'var(--gold)' : 'var(--dim)'}}>{money(m.total)}</td>
                            <td style={{textAlign: 'center', color: 'var(--dim)', fontSize: '12px'}}>{pctAnual > 0 ? `${pctAnual.toFixed(1)}%` : '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr style={{background: 'var(--bg-input)', fontWeight: 800, fontSize: '15px'}}>
                        <td>TOTAL ANUAL</td>
                        {resumenAnual.porTipo.map(t => (
                          <td key={t.tipo} style={{textAlign: 'right', color: 'var(--green)'}}>{money(t.total)}</td>
                        ))}
                        <td style={{textAlign: 'right', color: 'var(--gold)'}}>{money(resumenAnual.total)}</td>
                        <td style={{textAlign: 'center', color: 'var(--gold)'}}>100%</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </>
            )}

            {subTab === 'top' && (
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">🏅 Top 5 Colaboradores del Año</h3>
                </div>
                {resumenCompleto.topDadores.length > 0 ? (
                  <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                    {resumenCompleto.topDadores.map((d, i) => {
                      const medals = ['🥇', '🥈', '🥉'];
                      const color = ['var(--gold)', 'var(--blue)', 'var(--purple)'];
                      const pct = resumenCompleto.topDadores[0].total > 0 ? (d.total / resumenCompleto.topDadores[0].total) * 100 : 0;
                      return (
                        <div key={d.id} style={{display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', background: 'var(--bg-input)', borderRadius: '10px', border: '1px solid var(--border)'}}>
                          <div style={{width: '36px', height: '36px', borderRadius: '50%', background: i < 3 ? 'var(--gold-glow)' : 'var(--bg)', border: `2px solid ${i < 3 ? color[i] : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 800, color: i < 3 ? color[i] : 'var(--dim)'}}>
                            {i < 3 ? medals[i] : (i + 1)}
                          </div>
                          <div style={{flex: 1, minWidth: 0}}>
                            <div style={{fontWeight: 700, fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{d.nombre} {d.apellido}</div>
                            <div style={{fontSize: '11px', color: 'var(--dim)'}}>{d.regs} aportes</div>
                            <div style={{height: '4px', background: 'var(--border)', borderRadius: '2px', overflow: 'hidden', marginTop: '4px'}}>
                              <div style={{height: '100%', width: `${pct}%`, background: i === 0 ? 'var(--gold)' : i === 1 ? 'var(--blue)' : 'var(--purple)', transition: 'width 0.5s'}}></div>
                            </div>
                          </div>
                          <div style={{fontWeight: 800, color: 'var(--gold)', fontSize: '14px', whiteSpace: 'nowrap'}}>{money(d.total)}</div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{textAlign: 'center', padding: '30px', color: 'var(--dim)'}}>No hay aportes este año</div>
                )}
              </div>
            )}

            {subTab === 'metas' && (
              <>
                <div className="card" style={{marginBottom: '24px'}}>
                  <div className="card-header">
                    <h3 className="card-title">🎯 Resumen del Plan Propuesto</h3>
                  </div>
                  <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px'}}>
                    <div style={{padding: '16px', background: 'var(--bg-input)', borderRadius: '12px', border: '1px solid var(--border)', textAlign: 'center'}}>
                      <div style={{fontSize: '12px', color: 'var(--dim)', marginBottom: '6px', textTransform: 'uppercase', fontWeight: 600}}>Meta Mensual Global</div>
                      <div style={{fontSize: '20px', fontWeight: 800, color: 'var(--blue)'}}>{money(cumplimiento.metaGlobalMes)}</div>
                      <div style={{fontSize: '11px', color: 'var(--dim)', marginTop: '4px'}}>{dadores.filter(d => (d.planOfrendaMonto || 0) > 0).length} colaboradores</div>
                    </div>
                    <div style={{padding: '16px', background: 'var(--gold-glow)', borderRadius: '12px', border: '1px solid var(--gold)', textAlign: 'center'}}>
                      <div style={{fontSize: '12px', color: 'var(--gold)', marginBottom: '6px', textTransform: 'uppercase', fontWeight: 700}}>Meta Anual Global</div>
                      <div style={{fontSize: '20px', fontWeight: 800, color: 'var(--gold)'}}>{money(cumplimiento.metaGlobalAnual)}</div>
                      <div style={{fontSize: '11px', color: 'var(--gold)', marginTop: '4px'}}>Plan total del año</div>
                    </div>
                    <div style={{padding: '16px', background: 'var(--bg-input)', borderRadius: '12px', border: '1px solid var(--border)', textAlign: 'center'}}>
                      <div style={{fontSize: '12px', color: 'var(--dim)', marginBottom: '6px', textTransform: 'uppercase', fontWeight: 600}}>Recaudado a la Fecha</div>
                      <div style={{fontSize: '20px', fontWeight: 800, color: 'var(--green)'}}>{money(cumplimiento.totalRecAnio)}</div>
                      <div style={{fontSize: '11px', color: 'var(--dim)', marginTop: '4px'}}>de {cumplimiento.metaGlobalAnual > 0 ? money(cumplimiento.metaGlobalAnual) : 'sin meta'}</div>
                    </div>
                    <div style={{padding: '16px', background: cumplimiento.pctGlobal >= 100 ? 'var(--gold-glow)' : 'var(--bg-input)', borderRadius: '12px', border: `1px solid ${cumplimiento.pctGlobal >= 100 ? 'var(--gold)' : 'var(--border)'}`, textAlign: 'center'}}>
                      <div style={{fontSize: '12px', color: 'var(--dim)', marginBottom: '6px', textTransform: 'uppercase', fontWeight: 600}}>% Cumplimiento</div>
                      <div style={{fontSize: '20px', fontWeight: 800, color: cumplimiento.pctGlobal >= 100 ? 'var(--gold)' : cumplimiento.pctGlobal >= 70 ? 'var(--green)' : 'var(--red)'}}>{cumplimiento.metaGlobalAnual > 0 ? `${cumplimiento.pctGlobal.toFixed(1)}%` : '—'}</div>
                      <div style={{fontSize: '11px', color: 'var(--dim)', marginTop: '4px'}}>vs meta anual</div>
                    </div>
                  </div>
                </div>

                <div className="card">
                  <div className="card-header">
                    <h3 className="card-title">👥 Plan de Ofrendas por Colaborador</h3>
                  </div>
                  <table className="data-table">
                    <thead>
                      <tr style={{background: 'var(--bg-input)'}}>
                        <th style={{textAlign: 'left'}}>COLABORADOR</th>
                        <th style={{textAlign: 'left'}}>TIPO</th>
                        <th style={{textAlign: 'right'}}>PLAN MENSUAL</th>
                        <th style={{textAlign: 'right'}}>PLAN ANUAL</th>
                        <th style={{textAlign: 'right'}}>RECAUDADO</th>
                        <th style={{textAlign: 'center'}}>% CUMPLIMIENTO</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cumplimiento.cumplimientoDadores.filter(c => c.plan > 0).map(c => (
                        <tr key={c.id}>
                          <td style={{fontWeight: 600}}>{c.nombre} {c.apellido}</td>
                          <td><span className={`badge ${TIPO_BADGE[c.tipo] || 'badge-blue'}`}>{c.tipo}</span></td>
                          <td style={{textAlign: 'right'}}>{money(c.plan)}</td>
                          <td style={{textAlign: 'right'}}>{money(c.metaAnual)}</td>
                          <td style={{textAlign: 'right', fontWeight: 700, color: c.total >= c.metaAnual ? 'var(--green)' : 'var(--dim)'}}>{money(c.total)}</td>
                          <td style={{textAlign: 'center'}}>
                            {c.pct !== null ? (
                              <span style={{fontWeight: 700, color: c.pct >= 100 ? 'var(--green)' : c.pct >= 70 ? 'var(--gold)' : 'var(--red)'}}>{Math.round(c.pct)}%</span>
                            ) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {subTab === 'cumplimiento' && (
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">✅ Cumplimiento Mensual vs Plan</h3>
                </div>
                <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                  {cumplimiento.periodos.map((p) => {
                    const isCurrent = p.idx === new Date().getMonth() && parseInt(anioResumen) === new Date().getFullYear();
                    const pctBar = p.pct !== null ? Math.min(p.pct, 100) : 0;
                    return (
                      <div key={p.etiqueta} style={{display: 'flex', alignItems: 'center', gap: '12px', padding: '8px', background: isCurrent ? 'var(--gold-glow)' : 'transparent', borderRadius: '8px', border: isCurrent ? '1px solid var(--gold)' : '1px solid transparent'}}>
                        <div style={{width: '40px', fontSize: '12px', fontWeight: 700, color: isCurrent ? 'var(--gold)' : 'var(--dim)', textTransform: 'uppercase'}}>{p.etiqueta}</div>
                        <div style={{flex: 1, height: '24px', background: 'var(--bg-input)', borderRadius: '6px', overflow: 'hidden', position: 'relative'}}>
                          <div style={{position: 'absolute', left: 0, top: 0, width: `${pctBar}%`, height: '100%', background: p.pct !== null && p.pct >= 100 ? 'var(--green)' : p.pct !== null && p.pct >= 70 ? 'var(--gold)' : 'var(--red)', transition: 'width 0.5s'}}></div>
                          <div style={{position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', fontSize: '11px', fontWeight: 700, color: 'var(--dim)'}}>{money(p.total)} / {money(p.metaEsperada)}</div>
                        </div>
                        <div style={{width: '50px', textAlign: 'right', fontSize: '12px', fontWeight: 700, color: p.pct !== null && p.pct >= 100 ? 'var(--green)' : p.pct !== null && p.pct >= 70 ? 'var(--gold)' : 'var(--red)'}}>
                          {p.pct !== null ? `${Math.round(p.pct)}%` : '—'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
  );
}
