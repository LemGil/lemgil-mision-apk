import type { Dispatch, SetStateAction } from 'react';
import { Modal } from '../../components/Modal';
import { db } from '../../lib/database';
import { showToast } from '../../lib/notification';
import { accentStyle, fmt } from '../../lib/utils';
import type { Grupo, Hito, Miembro, MiembroMinisterio, Ministerio } from '../../lib/types';
import { CIVIL_BADGE, EST_BADGE, HITO_BADGE, HITO_TIPOS, ROLES, aniosEnIglesia, calcAge, diasEnIglesia, diasHastaCumple } from './constants';

interface MiembroDetailModalProps {
  open: boolean;
  onClose: () => void;
  selMiembro: Miembro | undefined;
  asignacionesPorMiembro: Record<string, MiembroMinisterio[]>;
  hitosPorMiembro: Record<string, Hito[]>;
  grupos: Grupo[];
  ministerios: Ministerio[];
  qhTipo: string; setQhTipo: Dispatch<SetStateAction<string>>;
  qhFecha: string; setQhFecha: Dispatch<SetStateAction<string>>;
  qhDesc: string; setQhDesc: Dispatch<SetStateAction<string>>;
  quickAddHito: () => void;
  updateAsigRol: (asigId: string, nuevoRol: string) => void;
  quickRemoveAsig: (asigId: string, mn: string) => void;
  openEditH: (id: string) => void;
  onAsignar: () => void;
  onEditarPerfil: () => void;
  onEliminar: () => void;
  onEliminarHito: (id: string) => void;
}

export function MiembroDetailModal(props: MiembroDetailModalProps) {
  const { open, onClose, selMiembro, asignacionesPorMiembro, hitosPorMiembro, grupos, ministerios, qhTipo, setQhTipo, qhFecha, setQhFecha, qhDesc, setQhDesc, quickAddHito, updateAsigRol, quickRemoveAsig, openEditH, onAsignar, onEditarPerfil, onEliminar, onEliminarHito } = props;
  return (
      <Modal open={open} onClose={onClose} title="Perfil del miembro" wide>
        {selMiembro && (() => {
          const asigs = asignacionesPorMiembro[selMiembro.id] || [];
          const histo = hitosPorMiembro[selMiembro.id] || [];
          const grupoAsignado = selMiembro.grupoId ? grupos.find((g) => g.id === selMiembro.grupoId) : null;
          const telLimpio = (selMiembro.telefono || '').replace(/\D/g, '');
          const iniciales = `${selMiembro.nombre[0] || ''}${selMiembro.apellido[0] || ''}`.toUpperCase();
          const edad = calcAge(selMiembro.fechaNacimiento);
          const diasIglesia = diasEnIglesia(selMiembro.fechaIngreso);
          const aniosIglesia = aniosEnIglesia(selMiembro.fechaIngreso);
          const dCumple = diasHastaCumple(selMiembro.fechaNacimiento);
          const ultimoHito = histo.length > 0 ? histo[0] : null;
          const diasUltimoHito = ultimoHito ? Math.max(0, Math.floor((Date.now() - new Date(ultimoHito.fecha).getTime()) / 86400000)) : null;
          const sinHitoReciente = diasUltimoHito !== null && diasUltimoHito > 180;
          return (<>
            {/* HERO */}
            <div style={{ display: 'flex', gap: 16, alignItems: 'center', padding: '4px 0 18px', borderBottom: '1px solid var(--border)', marginBottom: 18 }}>
              <div className="avatar-lg" style={{ background: 'linear-gradient(135deg, var(--oro-apostolico), var(--oro-sombra))', color: 'var(--carbon)' }}>{iniciales || '👤'}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-display)' }}>{selMiembro.nombre} {selMiembro.apellido}</h2>
                  <span className={`badge ${EST_BADGE[selMiembro.estado]}`}>{selMiembro.estado}</span>
                  <span className={`badge ${CIVIL_BADGE[selMiembro.estadoCivil]}`}>{selMiembro.estadoCivil}</span>
                  {selMiembro.bautizado && <span className="badge badge-purple">💧 Bautizado</span>}
                </div>
                <div style={{ fontSize: 12, color: 'var(--dim)', marginTop: 6 }}>
                  {edad !== null ? `🎂 ${edad} años` : '🎂 Sin edad'} · 📍 {selMiembro.zona || 'Sin zona'} · ⛪ {aniosIglesia === 0 ? 'menos de 1 año' : `${aniosIglesia} ${aniosIglesia === 1 ? 'año' : 'años'} en la iglesia`}
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                  {dCumple !== null && dCumple === 0 && <span className="badge badge-green" style={{ fontSize: 11 }}>🎂 ¡Cumple hoy!</span>}
                  {dCumple !== null && dCumple > 0 && dCumple <= 7 && <span className="badge badge-yellow" style={{ fontSize: 11 }}>🎂 Cumple en {dCumple} {dCumple === 1 ? 'día' : 'días'}</span>}
                  {dCumple !== null && dCumple > 7 && dCumple <= 30 && <span className="badge badge-blue" style={{ fontSize: 11 }}>🎂 Cumple este mes ({dCumple} días)</span>}
                  {aniosIglesia > 0 && [1, 5, 10, 15, 20, 25, 30, 40, 50].includes(aniosIglesia) && <span className="badge badge-yellow" style={{ fontSize: 11 }}>💒 ¡{aniosIglesia} años de aniversario!</span>}
                  {aniosIglesia > 0 && ![1, 5, 10, 15, 20, 25, 30, 40, 50].includes(aniosIglesia) && <span className="badge badge-blue" style={{ fontSize: 11 }}>💒 {aniosIglesia} años</span>}
                  {sinHitoReciente && <span className="badge badge-red" style={{ fontSize: 11 }}>⚠️ Sin hitos hace {diasUltimoHito} días</span>}
                </div>
              </div>
            </div>

            {/* QUICK CONTACT */}
            {(telLimpio || selMiembro.email || selMiembro.direccion) && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
                {telLimpio && <a href={`tel:+${telLimpio}`} className="btn btn-secondary btn-sm" style={{ textDecoration: 'none' }}>📞 Llamar</a>}
                {telLimpio && <a href={`https://wa.me/${telLimpio}`} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm" style={{ textDecoration: 'none', color: 'var(--green)', borderColor: 'var(--green)' }}>💬 WhatsApp</a>}
                {selMiembro.email && <a href={`mailto:${selMiembro.email}`} className="btn btn-secondary btn-sm" style={{ textDecoration: 'none', color: 'var(--purple)', borderColor: 'var(--purple)' }}>✉ Email</a>}
                {selMiembro.direccion && <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selMiembro.direccion + ' ' + (selMiembro.zona || ''))}`} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm" style={{ textDecoration: 'none', color: 'var(--blue)', borderColor: 'var(--blue)' }}>🗺️ Ver en mapa</a>}
                {selMiembro.contactoPreferido && <span style={{ padding: '4px 10px', fontSize: 11, color: 'var(--dim)', alignSelf: 'center' }}>Prefiere: <strong>{selMiembro.contactoPreferido}</strong></span>}
              </div>
            )}

            {/* STATS */}
            <div className="kpis" style={{ marginBottom: 20 }}>
              <div className="kpi" style={accentStyle('var(--gold)')}>
                <div className="kpi-label">⛪ Días en la iglesia</div>
                <div className="kpi-value" style={{ fontSize: 24 }}>{diasIglesia}</div>
                <div className="kpi-sub">{aniosIglesia === 0 ? 'menos de 1 año' : `${aniosIglesia} ${aniosIglesia === 1 ? 'año' : 'años'}`} · desde {fmt(selMiembro.fechaIngreso)}</div>
              </div>
              <div className="kpi" style={accentStyle('var(--blue)')}>
                <div className="kpi-label">⛪ Ministerios</div>
                <div className="kpi-value" style={{ fontSize: 24 }}>{asigs.length}</div>
                <div className="kpi-sub">{asigs.filter((a) => a.rol === 'Líder' || a.rol === 'Coordinador').length} liderazgo · {asigs.filter((a) => a.rol === 'Servidor' || a.rol === 'Miembro').length} servicio</div>
              </div>
              <div className="kpi" style={accentStyle('var(--green)')}>
                <div className="kpi-label">📍 Hitos</div>
                <div className="kpi-value" style={{ fontSize: 24 }}>{histo.length}</div>
                <div className="kpi-sub">{histo.filter((h) => h.tipo === 'Bautismo').length} bautismo · {histo.filter((h) => h.tipo === 'Discipulado').length} discipulado</div>
              </div>
              <div className="kpi" style={accentStyle(sinHitoReciente ? 'var(--red)' : 'var(--purple)')}>
                <div className="kpi-label">🕒 Último hito</div>
                <div className="kpi-value" style={{ fontSize: 24 }}>{diasUltimoHito === null ? '—' : diasUltimoHito === 0 ? 'Hoy' : diasUltimoHito}</div>
                <div className="kpi-sub">{ultimoHito ? `${ultimoHito.tipo} · ${fmt(ultimoHito.fecha)}` : 'sin hitos registrados'}</div>
              </div>
            </div>

            {/* LINKED CARDS */}
            {grupoAsignado && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderRadius: 8, background: 'var(--surface-2)', border: '1px solid var(--gold)', marginBottom: 10 }}>
                <div style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--gold-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>👥</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 10, color: 'var(--dim)', letterSpacing: 1.2, textTransform: 'uppercase', fontWeight: 600, marginBottom: 2 }}>Grupo de misión</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--oro-sombra)' }}>{grupoAsignado.nombre}</div>
                  <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 2 }}>📍 {grupoAsignado.zona} · 🗓️ {grupoAsignado.dia} {grupoAsignado.hora} · 📌 {grupoAsignado.lugar || 'Sin lugar'} · 👤 {grupoAsignado.lider || 'Sin mentor'}</div>
                </div>
              </div>
            )}
            {/* INFO GRID */}
            <div className="form-section">Datos Personales</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0 18px' }}>
              <div className="detail-row"><span className="detail-label">📅 Nacimiento</span><span className="detail-value">{selMiembro.fechaNacimiento ? fmt(selMiembro.fechaNacimiento) : '—'}</span></div>
              <div className="detail-row"><span className="detail-label">🎂 Edad</span><span className="detail-value">{edad !== null ? `${edad} años` : '—'}</span></div>
              <div className="detail-row"><span className="detail-label">💼 Profesión</span><span className="detail-value">{selMiembro.profesion || '—'}</span></div>
              <div className="detail-row"><span className="detail-label">💒 Estado civil</span><span className="detail-value">{selMiembro.estadoCivil || '—'}</span></div>
              <div className="detail-row"><span className="detail-label">💍 Cónyuge</span><span className="detail-value">{selMiembro.conyuge || '—'}</span></div>
              <div className="detail-row"><span className="detail-label">👶 Hijos</span><span className="detail-value">{selMiembro.hijos || '—'}</span></div>
              <div className="detail-row"><span className="detail-label">💧 Bautizado</span><span className="detail-value">{selMiembro.bautizado ? (selMiembro.fechaBautismo ? `Sí · ${fmt(selMiembro.fechaBautismo)}` : 'Sí') : 'No'}</span></div>
            </div>

            <div className="form-section" style={{ marginTop: 16 }}>Contacto</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0 18px' }}>
              <div className="detail-row"><span className="detail-label">📞 Teléfono</span><span className="detail-value">{selMiembro.telefono || <span style={{ color: 'var(--dim)' }}>No registrado</span>}</span></div>
              <div className="detail-row"><span className="detail-label">✉ Email</span><span className="detail-value" style={{ fontSize: 12, wordBreak: 'break-all' }}>{selMiembro.email || '—'}</span></div>
              <div className="detail-row" style={{ gridColumn: '1 / -1' }}><span className="detail-label">🏡 Dirección</span><span className="detail-value" style={{ fontSize: 12 }}>{selMiembro.direccion || '—'}</span></div>
              <div className="detail-row"><span className="detail-label">📍 Zona</span><span className="detail-value">{selMiembro.zona || '—'}</span></div>
            </div>

            {selMiembro.notas && (
              <>
                <div className="form-section" style={{ marginTop: 16 }}>Notas Pastorales</div>
                <div style={{ padding: 12, background: 'var(--surface-2)', borderRadius: 8, fontSize: 13, whiteSpace: 'pre-wrap', borderLeft: '3px solid var(--oro-apostolico)' }}>{selMiembro.notas}</div>
              </>
            )}

            {/* MINISTERIOS con edición inline */}
            <div className="form-section" style={{ marginTop: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>⛪ Ministerios ({asigs.length})</span>
              <button className="btn btn-gold btn-sm" onClick={onAsignar}>➕ Asignar</button>
            </div>
            {asigs.length === 0 ? (
              <div style={{ color: 'var(--dim)', fontSize: 13, padding: 12, textAlign: 'center', background: 'var(--surface-2)', borderRadius: 8 }}>Sin ministerios asignados</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {asigs.map((a) => {
                  const mn = ministerios.find((x) => x.id === a.ministerioId);
                  if (!mn) return null;
                  return (
                    <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, background: 'var(--surface-2)', borderRadius: 8, borderLeft: `3px solid ${mn.color}` }}>
                      <span style={{ fontSize: 22 }}>{mn.emoji}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{mn.nombre}</div>
                        <div style={{ fontSize: 11, color: 'var(--dim)' }}>Desde {fmt(a.desde)} {mn.lider ? `· Ministro: ${mn.lider}` : ''}</div>
                      </div>
                      <select className="form-select" style={{ width: 'auto', minWidth: 120, fontSize: 12, padding: '4px 8px' }} value={a.rol} onChange={(e) => updateAsigRol(a.id, e.target.value)}>
                        {ROLES.map((r) => <option key={r}>{r}</option>)}
                      </select>
                      <button type="button" className="btn btn-danger btn-sm" onClick={() => quickRemoveAsig(a.id, mn.nombre)}>🗑</button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* HITOS con timeline + quick add */}
            <div className="form-section" style={{ marginTop: 18 }}>📍 Hitos de Crecimiento ({histo.length})</div>

            {/* QUICK ADD HITO */}
            <div style={{ display: 'grid', gridTemplateColumns: '140px 140px 1fr auto', gap: 6, marginBottom: 12, padding: 10, background: 'var(--gold-glow)', borderRadius: 8, border: '1px solid var(--gold)' }}>
              <select className="form-select" value={qhTipo} onChange={(e) => setQhTipo(e.target.value)} style={{ fontSize: 12 }}>
                {HITO_TIPOS.map((t) => <option key={t}>{t}</option>)}
              </select>
              <input type="date" className="form-input" value={qhFecha} onChange={(e) => setQhFecha(e.target.value)} style={{ fontSize: 12 }} />
              <input className="form-input" placeholder="Descripción del hito…" value={qhDesc} onChange={(e) => setQhDesc(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && quickAddHito()} style={{ fontSize: 12 }} />
              <button className="btn btn-gold btn-sm" onClick={quickAddHito} disabled={!qhDesc.trim()}>➕ Agregar</button>
            </div>

            {histo.length === 0 ? (
              <div style={{ color: 'var(--dim)', fontSize: 13, padding: 12, textAlign: 'center', background: 'var(--surface-2)', borderRadius: 8 }}>Sin hitos registrados · usa el formulario arriba para agregar el primero</div>
            ) : (
              <div className="timeline" style={{ marginLeft: 0 }}>
                {histo.map((h) => (
                  <div key={h.id} className="timeline-item">
                    <div className="timeline-date">{fmt(h.fecha)}</div>
                    <div className="timeline-dot" />
                    <div className="timeline-content">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span className={`badge ${HITO_BADGE[h.tipo]}`}>{h.tipo}</span>
                        <button className="btn btn-secondary btn-sm" style={{ padding: '2px 6px', fontSize: 10 }} onClick={() => openEditH(h.id)}>✏</button>
                        <button className="btn btn-danger btn-sm" style={{ padding: '2px 6px', fontSize: 10 }} onClick={() => onEliminarHito(h.id)}>🗑</button>
                      </div>
                      <div style={{ marginTop: 4, fontSize: 13, whiteSpace: 'pre-wrap' }}>{h.descripcion}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="modal-footer" style={{ marginTop: 20 }}>
              {selMiembro.estado !== 'Fallecido' && (
                <button
                  className="btn btn-secondary"
                  style={{ marginRight: 'auto', display: 'flex', alignItems: 'center', gap: 6, borderColor: 'var(--red, #ef4444)', color: 'var(--red, #ef4444)' }}
                  onClick={async () => {
                    if (window.confirm(`¿Está seguro de registrar el fallecimiento de ${selMiembro.nombre} ${selMiembro.apellido}?`)) {
                      await db.miembros.update(selMiembro.id, { estado: 'Fallecido', actualizado: new Date().toISOString() });
                      showToast('Fallecimiento registrado');
                    }
                  }}
                >
                  ✝️ Registrar Fallecimiento
                </button>
              )}
              <button className="btn btn-secondary" onClick={onEditarPerfil}>✏ Editar perfil</button>
              <button className="btn btn-danger" onClick={onEliminar}>🗑 Eliminar</button>
            </div>
          </>);
        })()}
      </Modal>
  );
}
