import { Modal } from '../../components/Modal';
import { fmt } from '../../lib/utils';
import type { Beneficiario, Campana, Entrega } from '../../lib/types';
import { CAMP_EST, TIPO_CAMP } from './constants';

interface CampanaDetailModalProps {
  open: boolean;
  onClose: () => void;
  selCamp: Campana | undefined;
  selEntregas: Entrega[];
  beneficiarios: Beneficiario[];
  selAlcanzados: number;
  selProgress: number;
}

export function CampanaDetailModal(props: CampanaDetailModalProps) {
  const { open, onClose, selCamp, selEntregas, beneficiarios, selAlcanzados, selProgress } = props;
  return (
        <Modal
          open={open}
          onClose={onClose}
          title={`📢 ${selCamp?.nombre}`}
          wide
          footer={<button className="btn btn-secondary" onClick={onClose}>Cerrar</button>}
        >
          {selCamp && (
            <>
              <div className="detail-row"><span className="detail-label">Tipo</span><span className="detail-value"><span className={`badge ${TIPO_CAMP[selCamp.tipo]}`}>{selCamp.tipo}</span></span></div>
              <div className="detail-row"><span className="detail-label">Estado</span><span className="detail-value"><span className={`badge ${CAMP_EST[selCamp.estado]}`}>{selCamp.estado}</span></span></div>
              <div className="detail-row"><span className="detail-label">Período</span><span className="detail-value">{fmt(selCamp.fechaInicio)}{selCamp.fechaFin && ` → ${fmt(selCamp.fechaFin)}`}</span></div>
              <div className="detail-row"><span className="detail-label">Zona</span><span className="detail-value">{selCamp.zona || '—'}</span></div>
              <div className="detail-row"><span className="detail-label">Responsable</span><span className="detail-value">{selCamp.responsable || '—'}</span></div>
              <div className="detail-row"><span className="detail-label">Meta</span><span className="detail-value">{selCamp.metaFamilias} {selCamp.metaTipo === 'Personas' ? 'personas' : 'familias'}</span></div>
              {selCamp.descripcion && <div className="detail-row"><span className="detail-label">Descripción</span><span className="detail-value" style={{ fontSize: 12, color: 'var(--dim)' }}>{selCamp.descripcion}</span></div>}

              <div className="form-section" style={{ marginTop: 14 }}>Progreso</div>
              <div className="progress-row">
                <div className="progress-header">
                  <span style={{ color: 'var(--txt)' }}>👥 {selCamp.metaTipo === 'Personas' ? 'Personas alcanzadas' : 'Familias alcanzadas'}</span>
                  <span style={{ color: 'var(--manos-terracota)', fontWeight: 700 }}>{selAlcanzados} / {selCamp.metaFamilias || '∞'} · {selProgress}%</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${selProgress}%`, background: 'var(--manos-terracota)' }} />
                </div>
              </div>

              <div className="form-section" style={{ marginTop: 14 }}>Entregas ({selEntregas.length})</div>
              {selEntregas.length === 0 ? (
                <div style={{ color: 'var(--dim)', fontSize: 13, padding: '10px 0' }}>Sin entregas registradas</div>
              ) : (
                selEntregas
                  .sort((a, b) => b.fecha.localeCompare(a.fecha))
                  .map((e) => {
                    const ben = beneficiarios.find((b) => b.id === e.beneficiarioId);
                    return (
                      <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: 'var(--surface-2)', borderRadius: 8, marginBottom: 6 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12, fontWeight: 700 }}>{ben ? `${ben.nombre} ${ben.apellido}` : '—'}</div>
                          <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 2 }}>{fmt(e.fecha)} · {e.tipo}</div>
                        </div>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, color: 'var(--manos-terracota)' }}>{e.cantidad} {e.unidad}</div>
                      </div>
                    );
                  })
              )}
            </>
          )}
        </Modal>
  );
}
