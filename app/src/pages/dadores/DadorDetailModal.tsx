import { Modal } from '../../components/Modal';
import { fmt, money } from '../../lib/utils';
import type { Aporte, Colaborador, TipoPlan } from '../../lib/types';
import { APORTE_BADGE, EST_BADGE, TIPO_BADGE } from './constants';

interface DadorDetailModalProps {
  open: boolean;
  onClose: () => void;
  selDador: Colaborador | undefined;
  selAportes: Aporte[];
  selTotal: number;
  tiposPlanes: TipoPlan[];
  mo: string;
}

export function DadorDetailModal(props: DadorDetailModalProps) {
  const { open, onClose, selDador, selAportes, selTotal, tiposPlanes, mo } = props;
  return (
        <Modal
          open={open}
          onClose={onClose}
          title={`🤝 ${selDador?.nombre} ${selDador?.apellido}`}
          wide
          footer={<button className="btn btn-secondary" onClick={onClose}>Cerrar</button>}
        >
          {selDador && (
            <>
              <div className="detail-row"><span className="detail-label">Tipo</span><span className="detail-value"><span className={`badge ${TIPO_BADGE[selDador.tipo]}`}>{selDador.tipo}</span></span></div>
              <div className="detail-row"><span className="detail-label">Estado</span><span className="detail-value"><span className={`badge ${EST_BADGE[selDador.estado]}`}>{selDador.estado}</span></span></div>
              <div className="detail-row"><span className="detail-label">Teléfono</span><span className="detail-value">{selDador.telefono || 'No registrado'}</span></div>
              <div className="detail-row"><span className="detail-label">Email</span><span className="detail-value">{selDador.email || 'No registrado'}</span></div>
              <div className="detail-row"><span className="detail-label">Registrado</span><span className="detail-value">{fmt(selDador.creado.slice(0, 10))}</span></div>
              {selDador.notas && <div className="detail-row"><span className="detail-label">Notas</span><span className="detail-value" style={{ fontSize: 12, color: 'var(--dim)' }}>{selDador.notas}</span></div>}

              <div className="form-section" style={{ marginTop: 14 }}>📋 Plan de Ofrenda</div>
              <div className="grid-3" style={{ marginBottom: 14 }}>
                <div style={{ padding: 12, background: 'var(--surface-2)', borderRadius: 8, textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: 'var(--dim)', marginBottom: 4 }}>TIPO</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--txt)' }}>{tiposPlanes.find(t => t.id === selDador.planOfrendaTipo)?.nombre || 'Sin plan'}</div>
                </div>
                <div style={{ padding: 12, background: 'var(--surface-2)', borderRadius: 8, textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: 'var(--dim)', marginBottom: 4 }}>COMPROMISO MENSUAL</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--oro-luz)' }}>{money(selDador.planOfrendaMonto || 0)}</div>
                </div>
                <div style={{ padding: 12, background: 'var(--surface-2)', borderRadius: 8, textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: 'var(--dim)', marginBottom: 4 }}>CUMPLIMIENTO MES</div>
                  {(() => {
                    const mesAportes = selAportes.filter(a => a.fecha?.startsWith(mo)).reduce((s, a) => s + a.monto, 0);
                    const plan = selDador.planOfrendaMonto || 0;
                    const pct = plan > 0 ? Math.round((mesAportes / plan) * 100) : 0;
                    return <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: pct >= 100 ? 'var(--green)' : 'var(--txt)' }}>{pct}%</div>;
                  })()}
                </div>
              </div>

              <div className="form-section">Resumen Financiero</div>
              <div className="grid-3" style={{ marginBottom: 14 }}>
                <div style={{ padding: 12, background: 'var(--surface-2)', borderRadius: 8, textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: 'var(--dim)', marginBottom: 4 }}>APORTES TOTALES</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--oro-apostolico)' }}>{money(selTotal)}</div>
                </div>
                <div style={{ padding: 12, background: 'var(--surface-2)', borderRadius: 8, textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: 'var(--dim)', marginBottom: 4 }}>CANTIDAD</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700 }}>{selAportes.length}</div>
                </div>
                <div style={{ padding: 12, background: 'var(--surface-2)', borderRadius: 8, textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: 'var(--dim)', marginBottom: 4 }}>PROMEDIO</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--green)' }}>{selAportes.length ? money(selTotal / selAportes.length) : '$0'}</div>
                </div>
              </div>

              <div className="form-section">Historial de Aportes</div>
              {selAportes.length === 0 ? (
                <div style={{ color: 'var(--dim)', fontSize: 13, padding: '10px 0' }}>Sin aportes registrados</div>
              ) : (
                selAportes.map((a) => (
                  <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: 'var(--surface-2)', borderRadius: 8, marginBottom: 6 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 700 }}>{fmt(a.fecha)} · <span className={`badge ${APORTE_BADGE[a.tipo] || 'badge-blue'}`} style={{ fontSize: 9 }}>{a.tipo}</span></div>
                      <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 2 }}>{a.metodo}{a.referencia && ` · ${a.referencia}`}</div>
                    </div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: 'var(--oro-apostolico)' }}>{money(a.monto)}</div>
                  </div>
                ))
              )}
            </>
          )}
        </Modal>
  );
}
