import type { Dispatch, SetStateAction } from 'react';
import { Modal } from '../../components/Modal';
import { accentStyle, fmt } from '../../lib/utils';
import type { Conversion, Grupo } from '../../lib/types';
import { ESTADOS, ESTADOS_COLOR, ESTADOS_EMOJI, EST_BADGE } from './constants';

const updateSteps = (est: string) => {
  if (est === 'Apartado' || est === 'Fallecido') {
    return ESTADOS.map((e, i) => ({ estado: e, emoji: ['🌱', '📖', '💧', '🏘️'][i], cls: 'step' }));
  }
  const idx = ESTADOS.indexOf(est as typeof ESTADOS[number]);
  return ESTADOS.map((e, i) => ({ estado: e, emoji: ['🌱', '📖', '💧', '🏘️'][i], cls: i < idx ? 'step done' : i === idx ? 'step active' : 'step' }));
};

interface ConversionDetailModalProps {
  open: boolean;
  onClose: () => void;
  onEliminar: () => void;
  saveSeg: () => void;
  selConv: Conversion | undefined;
  grupos: Grupo[];
  tempEst: string | null; setTempEst: Dispatch<SetStateAction<string | null>>;
  sNota: string; setSNota: Dispatch<SetStateAction<string>>;
  sHito: boolean; setSHito: Dispatch<SetStateAction<boolean>>;
}

export function ConversionDetailModal(props: ConversionDetailModalProps) {
  const { open, onClose, onEliminar, saveSeg, selConv, grupos, tempEst, setTempEst, sNota, setSNota, sHito, setSHito } = props;
  return (
      <Modal open={open} onClose={onClose} title={`📄 ${selConv?.nombre} ${selConv?.apellido}`} wide footer={<><button className="btn btn-danger btn-sm" onClick={onEliminar}>🗑️ Eliminar</button><button className="btn btn-secondary" onClick={onClose}>Cerrar</button><button className="btn btn-gold" onClick={saveSeg}>💾 Guardar Cambios</button></>}>
        {selConv && (() => {
          const iniciales = `${selConv.nombre[0] || ''}${selConv.apellido[0] || ''}`.toUpperCase();
          const fechaCreado = new Date(selConv.creado);
          const diasEnProceso = isNaN(fechaCreado.getTime()) ? 0 : Math.max(0, Math.floor((Date.now() - fechaCreado.getTime()) / 86400000));
          const lastHistDate = selConv.historial.length > 0 ? new Date(selConv.historial[selConv.historial.length - 1].fecha) : fechaCreado;
          const diasEnEstado = isNaN(lastHistDate.getTime()) ? 0 : Math.max(0, Math.floor((Date.now() - lastHistDate.getTime()) / 86400000));
          const idxActual = selConv.estado === 'Apartado' || selConv.estado === 'Fallecido' ? -1 : ESTADOS.indexOf(selConv.estado);
          const proxEstado = idxActual >= 0 && idxActual < ESTADOS.length - 1 ? ESTADOS[idxActual + 1] : null;
          const progreso = Math.round(((idxActual + 1) / ESTADOS.length) * 100);
          const grupoAsignado = selConv.grupoId ? grupos.find((g) => g.id === selConv.grupoId) : null;
          const telLimpio = (selConv.telefono || '').replace(/\D/g, '');
          const esFinal = idxActual === ESTADOS.length - 1;
          return (<>
            {/* HERO */}
            <div style={{ display: 'flex', gap: 16, alignItems: 'center', padding: '4px 0 18px', borderBottom: '1px solid var(--border)', marginBottom: 18 }}>
              <div className="avatar-lg" style={{ background: 'linear-gradient(135deg, var(--oro-apostolico), var(--oro-sombra))', color: 'var(--carbon)' }}>{iniciales || '👤'}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-display)' }}>{selConv.nombre} {selConv.apellido}</h2>
                  <span className={`badge ${EST_BADGE[selConv.estado]}`}>{ESTADOS_EMOJI[selConv.estado]} {selConv.estado}</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--dim)', marginTop: 6 }}>
                  📍 {selConv.zona || 'Sin zona'} · 👤 Mayor: {selConv.lider || '—'} · ⏱️ {diasEnProceso === 0 ? 'registrado hoy' : `${diasEnProceso} ${diasEnProceso === 1 ? 'día' : 'días'} en proceso`}
                </div>
              </div>
            </div>

            {/* QUICK CONTACT */}
            {(telLimpio || selConv.direccion) && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
                {telLimpio && <a href={`tel:+${telLimpio}`} className="btn btn-secondary btn-sm" style={{ textDecoration: 'none' }}>📞 Llamar</a>}
                {telLimpio && <a href={`https://wa.me/${telLimpio}`} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm" style={{ textDecoration: 'none', color: 'var(--green)', borderColor: 'var(--green)' }}>💬 WhatsApp</a>}
                {selConv.direccion && <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selConv.direccion + ' ' + (selConv.zona || ''))}`} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm" style={{ textDecoration: 'none', color: 'var(--blue)', borderColor: 'var(--blue)' }}>🗺️ Ver en mapa</a>}
              </div>
            )}

            {/* STATS */}
            <div className="kpis" style={{ marginBottom: 20 }}>
              <div className="kpi" style={accentStyle('var(--gold)')}>
                <div className="kpi-label">📅 Días en proceso</div>
                <div className="kpi-value" style={{ fontSize: 24 }}>{diasEnProceso}</div>
                <div className="kpi-sub">desde {fmt(selConv.fecha)}</div>
              </div>
              <div className="kpi" style={accentStyle(ESTADOS_COLOR[idxActual] || 'var(--gold)')}>
                <div className="kpi-label">⏱️ En estado actual</div>
                <div className="kpi-value" style={{ fontSize: 24 }}>{diasEnEstado}</div>
                <div className="kpi-sub">{diasEnEstado === 0 ? 'cambió hoy' : `hace ${diasEnEstado} ${diasEnEstado === 1 ? 'día' : 'días'}`}</div>
              </div>
              <div className="kpi" style={accentStyle('var(--green)')}>
                <div className="kpi-label">🎯 Próximo objetivo</div>
                <div className="kpi-value" style={{ fontSize: 16 }}>{proxEstado ? `${ESTADOS_EMOJI[proxEstado]} ${proxEstado}` : '✓ Completo'}</div>
                <div className="kpi-sub">{proxEstado ? `avanzar a ${proxEstado}` : 'proceso finalizado'}</div>
              </div>
              <div className="kpi" style={accentStyle('var(--purple)')}>
                <div className="kpi-label">📊 Progreso</div>
                <div className="kpi-value" style={{ fontSize: 24 }}>{progreso}%</div>
                <div className="kpi-sub">paso {idxActual + 1} de {ESTADOS.length}</div>
              </div>
            </div>

            {/* PROGRESS BAR */}
            <div style={{ height: 6, borderRadius: 3, background: 'var(--surface-2)', overflow: 'hidden', marginBottom: 8, display: 'flex' }}>
              {ESTADOS.map((e, i) => {
                const fill = i < idxActual ? '100%' : i === idxActual ? `${((diasEnEstado % 30) / 30) * 100}%` : '0%';
                return <div key={e} title={e} style={{ flex: 1, height: '100%', background: i <= idxActual ? ESTADOS_COLOR[i] : 'transparent', borderRight: i < ESTADOS.length - 1 ? '1px solid var(--surface)' : 'none', position: 'relative' }}><div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: fill, background: i === idxActual ? `${ESTADOS_COLOR[i]}cc` : ESTADOS_COLOR[i] }} /></div>;
              })}
            </div>

            {/* PIPELINE */}
            <div className="form-section">Pipeline — clic para avanzar</div>
            <div className="steps">
              {updateSteps(tempEst || selConv.estado).map((s) => (
                <div key={s.estado} className={s.cls} onClick={() => setTempEst(s.estado)}>
                  <div className="step-dot">{s.emoji}</div>
                  <div className="step-label">{s.estado}</div>
                </div>
              ))}
            </div>

            {/* QUICK ADVANCE */}
            {!esFinal && (() => {
              const nextEst = ESTADOS[idxActual + 1] as typeof ESTADOS[number];
              const yaSeleccionado = tempEst === nextEst;
              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8, marginBottom: 18, padding: '10px 12px', background: 'var(--gold-glow)', borderRadius: 8, border: '1px solid var(--gold)' }}>
                  <span style={{ fontSize: 20 }}>⚡</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--oro-sombra)' }}>Acción rápida</div>
                    <div style={{ fontSize: 11, color: 'var(--dim)' }}>{yaSeleccionado ? `Listo para promover a ${nextEst}` : `Promover al siguiente estado del pipeline`}</div>
                  </div>
                  <button type="button" className="btn btn-gold btn-sm" disabled={yaSeleccionado} onClick={() => setTempEst(nextEst)}>
                    {ESTADOS_EMOJI[nextEst]} {yaSeleccionado ? 'Seleccionado' : `Promover a ${nextEst}`} →
                  </button>
                </div>
              );
            })()}

            {/* LINKED CARDS */}
            {grupoAsignado && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderRadius: 8, background: 'var(--surface-2)', border: '1px solid var(--gold)', marginBottom: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--gold-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>👥</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 10, color: 'var(--dim)', letterSpacing: 1.2, textTransform: 'uppercase', fontWeight: 600, marginBottom: 2 }}>Grupo asignado</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--oro-sombra)' }}>{grupoAsignado.nombre}</div>
                  <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 2 }}>📍 {grupoAsignado.zona} · 🗓️ {grupoAsignado.dia} {grupoAsignado.hora} · 👤 {grupoAsignado.lider || 'Sin mentor'}</div>
                </div>
              </div>
            )}
            {selConv.estado === 'Integrado' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderRadius: 8, background: 'var(--gold-glow)', border: '1px solid var(--gold)', marginBottom: 18 }}>
                <div style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--gold)', color: 'var(--carbon)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700 }}>✓</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 10, color: 'var(--dim)', letterSpacing: 1.2, textTransform: 'uppercase', fontWeight: 600, marginBottom: 2 }}>Miembro de la iglesia</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--oro-sombra)' }}>Activo en el sistema</div>
                  <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 2 }}>Visible en la pestaña Miembros</div>
                </div>
              </div>
            )}

            {/* INFO GRID */}
            <div className="form-section">Datos Registrados</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0 18px' }}>
              <div className="detail-row"><span className="detail-label">📞 Teléfono</span><span className="detail-value">{selConv.telefono || <span style={{ color: 'var(--dim)' }}>No registrado</span>}</span></div>
              <div className="detail-row"><span className="detail-label">🎂 Edad</span><span className="detail-value">{selConv.edad || '—'}</span></div>
              <div className="detail-row"><span className="detail-label">📍 Zona</span><span className="detail-value">{selConv.zona || '—'}</span></div>
              <div className="detail-row"><span className="detail-label">👤 Mayor</span><span className="detail-value">{selConv.lider || '—'}</span></div>
              <div className="detail-row"><span className="detail-label">🏠 Familia en ministerio</span><span className="detail-value">{selConv.familia || 'No'}</span></div>
              <div className="detail-row"><span className="detail-label">📅 Fecha conversión</span><span className="detail-value">{fmt(selConv.fecha)}</span></div>
              {selConv.direccion && <div className="detail-row" style={{ gridColumn: '1 / -1' }}><span className="detail-label">🏡 Dirección</span><span className="detail-value" style={{ fontSize: 12 }}>{selConv.direccion}</span></div>}
              {selConv.notas && <div className="detail-row" style={{ gridColumn: '1 / -1', flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}><span className="detail-label">📝 Notas</span><span className="detail-value" style={{ fontSize: 12, color: 'var(--dim)', whiteSpace: 'pre-wrap' }}>{selConv.notas}</span></div>}
            </div>

            {/* TIMELINE */}
            {selConv.historial.length > 0 && <>
              <div className="form-section" style={{ marginTop: 20 }}>Historial de Seguimiento</div>
              <div className="timeline">
                {selConv.historial.slice().reverse().map((h, i) => {
                  const idxH = h.estado === 'Apartado' || h.estado === 'Fallecido' ? -1 : ESTADOS.indexOf(h.estado as typeof ESTADOS[number]);
                  return (
                    <div key={i} className="timeline-item">
                      <div className="timeline-dot" style={{ background: idxH >= 0 ? ESTADOS_COLOR[idxH] : h.estado === 'Fallecido' ? 'var(--dim)' : 'var(--red, #ef4444)' }} />
                      <div className="timeline-date">{fmt(h.fecha)}</div>
                      <div className="timeline-content">
                        <span className={`badge ${EST_BADGE[h.estado] || 'badge-blue'}`} style={{ fontSize: 10 }}>{h.estado}</span>
                        <div style={{ fontSize: 12, marginTop: 4, whiteSpace: 'pre-wrap' }}>{h.nota || <em style={{ color: 'var(--dim)' }}>Sin nota descriptiva</em>}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>}

            {/* AGREGAR NOTA */}
            <div className="form-section" style={{ marginTop: 20 }}>Agregar Nota de Seguimiento</div>
            <textarea className="form-textarea" value={sNota} onChange={(e) => setSNota(e.target.value)} placeholder="Visita, bautismo, integración, conversación…" />
            {selConv.estado === 'Integrado' && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, fontSize: 12, color: 'var(--oro-sombra)', cursor: 'pointer', userSelect: 'none' }}>
                <input type="checkbox" checked={sHito} onChange={(e) => setSHito(e.target.checked)} disabled={!sNota.trim()} style={{ width: 16, height: 16, cursor: sNota.trim() ? 'pointer' : 'not-allowed' }} />
                <span>📌 También registrar como <strong>Hito</strong> en el miembro vinculado</span>
              </label>
            )}
            {!sNota.trim() && tempEst && tempEst !== selConv.estado && (
              <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 6, fontStyle: 'italic' }}>💡 El cambio de estado se registrará sin nota descriptiva</div>
            )}
          </>);
        })()}
      </Modal>
  );
}
