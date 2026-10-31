import type { Dispatch, SetStateAction } from 'react';
import { Modal } from '../../components/Modal';
import { accentStyle, fmt } from '../../lib/utils';
import type { Certificado, Conversion, Curso, Estudiante, Grupo, Hito, Miembro } from '../../lib/types';
import { CAL_BADGE, EST_BADGE } from './constants';
import type { HitoTipo } from './constants';

interface EstudianteDetailModalProps {
  open: boolean;
  onClose: () => void;
  selEst: Estudiante | null | undefined;
  selEstData: { myCerts: Certificado[]; myCurso: Curso | undefined; totalCursos: number; iniciales: string; studentHitos: Hito[]; origenConv: Conversion | null | undefined; origenMiem: Miembro | null | undefined; grupo: Grupo | undefined; hermanoMayor: Miembro | undefined } | null;
  cursos: Curso[];
  qhTipo: HitoTipo; setQHTipo: Dispatch<SetStateAction<HitoTipo>>;
  qhDesc: string; setQHDesc: Dispatch<SetStateAction<string>>;
  qhFecha: string; setQHFecha: Dispatch<SetStateAction<string>>;
  saveHito: (estId: string) => void;
  resetHito: () => void;
  onEditarPerfil: () => void;
  onEliminar: () => void;
}

export function EstudianteDetailModal(props: EstudianteDetailModalProps) {
  const { open, onClose, selEst, selEstData, cursos, qhTipo, setQHTipo, qhDesc, setQHDesc, qhFecha, setQHFecha, saveHito, resetHito, onEditarPerfil, onEliminar } = props;
  return (
      <Modal open={open} onClose={onClose} title="Perfil del Estudiante" wide>
        {selEstData ? (
          <>
            {/* ─── HEADER ─── */}
            <div style={{ display: 'flex', gap: 16, alignItems: 'center', padding: '4px 0 18px', borderBottom: '1px solid var(--border)', marginBottom: 18 }}>
              <div className="avatar-lg" style={{ background: 'linear-gradient(135deg, var(--academia-teal), var(--academia-pergamino))', color: 'var(--carbon)' }}>{selEstData.iniciales || '👤'}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-display)' }}>{selEst!.nombre} {selEst!.apellido}</h2>
                  <span className={`badge ${EST_BADGE[selEst!.estado] || 'badge-blue'}`}>{selEst!.estado}</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--dim)', marginTop: 6 }}>
                  🎓 {selEstData.myCurso ? selEstData.myCurso.nombre : 'sin curso'} · 📅 Ingreso: {fmt(selEst!.fecha)}
                </div>
              </div>
            </div>

            {/* ─── KPIS ─── */}
            <div className="kpis" style={{ marginBottom: 20 }}>
              <div className="kpi" style={accentStyle('var(--blue)')}>
                <div className="kpi-label">Cursos Totales</div>
                <div className="kpi-value" style={{ fontSize: 20 }}>{selEstData.totalCursos}</div>
                <div className="kpi-sub">incluye actual</div>
              </div>
              <div className="kpi" style={accentStyle('var(--gold)')}>
                <div className="kpi-label">Certificados</div>
                <div className="kpi-value" style={{ fontSize: 20 }}>{selEstData.myCerts.length}</div>
                <div className="kpi-sub">obtidos</div>
              </div>
              <div className="kpi" style={accentStyle('var(--green)')}>
                <div className="kpi-label">Estado</div>
                <div className="kpi-value" style={{ fontSize: 16 }}>{selEst!.estado}</div>
                <div className="kpi-sub">estatus académico</div>
              </div>
              <div className="kpi" style={accentStyle('var(--purple)')}>
                <div className="kpi-label">Progreso</div>
                <div className="kpi-value" style={{ fontSize: 16 }}>{selEstData.totalCursos > 0 ? `${Math.round((selEstData.myCerts.length / selEstData.totalCursos) * 100)}%` : '—'}</div>
                <div className="kpi-sub">completado</div>
              </div>
            </div>

            {/* ─── ORIGEN ─── */}
            <div className="form-section">📋 Origen</div>
            <div style={{ marginBottom: 18 }}>
              {selEst!.origen === 'convertido' && selEstData.origenConv ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 10, background: 'var(--surface-2)', borderRadius: 8, fontSize: 13 }}>
                  <span>🕊</span>
                  <span>Convertido · <strong>{selEstData.origenConv.nombre} {selEstData.origenConv.apellido}</strong></span>
                  <span style={{ color: 'var(--dim)' }}>· {selEstData.origenConv.lider}</span>
                </div>
              ) : selEst!.origen === 'miembro' && selEstData.origenMiem ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 10, background: 'var(--surface-2)', borderRadius: 8, fontSize: 13 }}>
                  <span>👥</span>
                  <span>Miembro · <strong>{selEstData.origenMiem.nombre} {selEstData.origenMiem.apellido}</strong></span>
                </div>
              ) : (
                <div style={{ color: 'var(--dim)', fontSize: 13, padding: '4px 0' }}>📝 Ingreso manual</div>
              )}
            </div>

            {/* ─── CERTIFICADOS ─── */}
            {selEstData.myCerts.length > 0 && (
              <>
                <div className="form-section">🏆 Certificados</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 18 }}>
                  {selEstData.myCerts.map(c => {
                    const curso = cursos.find(x => x.id === c.cursoId);
                    return (
                      <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--surface-2)', borderRadius: 8, fontSize: 13 }}>
                        <span>{curso?.emoji || '🏆'}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600 }}>{curso?.nombre || 'Curso'}</div>
                          <div style={{ fontSize: 11, color: 'var(--dim)' }}>{fmt(c.fecha)}</div>
                        </div>
                        <span className={`badge ${CAL_BADGE[c.calificacion] || 'badge-green'}`}>{c.calificacion}</span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* ─── INFORMACIÓN PERSONAL ─── */}
            <div className="form-section">👤 Información Personal</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '6px 16px', marginBottom: 18 }}>
              <div className="detail-row"><span className="detail-label">📞 Teléfono</span><span className="detail-value">{selEst!.telefono ? <a href={`tel:${selEst!.telefono}`} style={{ color: 'var(--academia-teal)', textDecoration: 'none', fontWeight: 600 }}>{selEst!.telefono}</a> : '—'}{selEst!.telefono && <a href={`https://wa.me/${selEst!.telefono.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" style={{ marginLeft: 8, fontSize: 11, color: 'var(--green)', textDecoration: 'none' }}>💬 WhatsApp</a>}</span></div>
              <div className="detail-row"><span className="detail-label">✉ Email</span><span className="detail-value">{selEst!.email ? <a href={`mailto:${selEst!.email}`} style={{ color: 'var(--academia-teal)', textDecoration: 'none' }}>{selEst!.email}</a> : '—'}</span></div>
              <div className="detail-row"><span className="detail-label">🎂 Edad</span><span className="detail-value">{selEst!.edad || '—'}</span></div>
              <div className="detail-row"><span className="detail-label">💼 Profesión</span><span className="detail-value">{selEst!.profesion || '—'}</span></div>
              <div className="detail-row" style={{ gridColumn: '1 / -1' }}><span className="detail-label">📍 Dirección</span><span className="detail-value">{selEst!.direccion ? <a href={`https://www.google.com/maps/search/${encodeURIComponent(selEst!.direccion)}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--academia-teal)', textDecoration: 'none' }}>{selEst!.direccion} 🗺</a> : '—'}</span></div>
            </div>

            {/* ─── IGLESIA ─── */}
            <div className="form-section">⛪ Iglesia</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '6px 16px', marginBottom: 18 }}>
              <div className="detail-row"><span className="detail-label">📍 Zona</span><span className="detail-value">{selEst!.zona || '—'}</span></div>
              <div className="detail-row"><span className="detail-label">👥 Grupo</span><span className="detail-value">{selEstData.grupo?.nombre || '—'}</span></div>
              <div className="detail-row"><span className="detail-label">🧑 Hermano Mayor</span><span className="detail-value">{selEstData.hermanoMayor ? `${selEstData.hermanoMayor.nombre} ${selEstData.hermanoMayor.apellido}` : '—'}</span></div>
              <div className="detail-row"><span className="detail-label">💧 Bautismo</span><span className="detail-value">{selEst!.bautizado ? (selEst!.fechaBautismo ? fmt(selEst!.fechaBautismo) : 'Sí') : 'No'}</span></div>
              <div className="detail-row"><span className="detail-label">👪 Cónyuge</span><span className="detail-value">{selEst!.conyuge || '—'}</span></div>
              <div className="detail-row"><span className="detail-label">👶 Hijos</span><span className="detail-value">{selEst!.hijos || '—'}</span></div>
            </div>

            {/* ─── NOTAS ─── */}
            {selEst!.notas && (
              <div style={{ marginBottom: 18 }}>
                <div className="form-section">📝 Notas</div>
                <div style={{ fontSize: 13, color: 'var(--dim)', whiteSpace: 'pre-wrap', padding: '6px 0' }}>{selEst!.notas}</div>
              </div>
            )}

            {/* ─── HITOS ─── */}
            <div className="form-section">📍 Hitos Recientes</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
              {selEstData.studentHitos.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--dim)', fontSize: 13, padding: 10 }}>Sin hitos registrados</div>
              ) : (
                selEstData.studentHitos.slice(0, 5).map(h => (
                  <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 10, background: 'var(--surface-2)', borderRadius: 8, fontSize: 13 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--gold)' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>{h.tipo}</div>
                      <div style={{ fontSize: 11, color: 'var(--dim)' }}>{fmt(h.fecha)}</div>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--dim)', fontStyle: 'italic' }}>{h.descripcion}</div>
                  </div>
                ))
              )}
            </div>

            {/* ─── REGISTRAR HITO RÁPIDO ─── */}
            <div className="form-section">➕ Registrar Hito Rápido</div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Tipo</label>
                <select className="form-select" value={qhTipo} onChange={(e) => setQHTipo(e.target.value as 'Conversión' | 'Bautismo' | 'Discipulado' | 'Curso Completado' | 'Integración' | 'Liderazgo' | 'Matrimonio' | 'Otro')}>
                  <option>Conversión</option><option>Bautismo</option><option>Discipulado</option>
                  <option>Curso Completado</option><option>Integración</option><option>Liderazgo</option>
                  <option>Matrimonio</option><option>Otro</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Fecha</label>
                <input className="form-input" type="date" value={qhFecha} onChange={(e) => setQHFecha(e.target.value)} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Descripción</label>
              <input className="form-input" value={qhDesc} onChange={(e) => setQHDesc(e.target.value)} placeholder="Ej: Completó curso de ..." />
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button className="btn btn-gold btn-sm" style={{ flex: 1 }} onClick={() => saveHito(selEst!.id)}>💾 Registrar</button>
              <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={resetHito}>🧹 Limpiar</button>
            </div>

            {/* ─── FOOTER ─── */}
            <div className="modal-footer" style={{ marginTop: 20 }}>
              <button className="btn btn-secondary" onClick={onEditarPerfil}>✏ Editar perfil</button>
              <button className="btn btn-danger" onClick={onEliminar}>🗑 Eliminar</button>
            </div>
          </>
        ) : null}
      </Modal>
  );
}
