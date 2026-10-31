import { EmptyState } from '../../components/EmptyState';
import { fmt } from '../../lib/utils';
import type { Certificado, Curso, Estudiante } from '../../lib/types';
import { CAL_BADGE } from './constants';

interface CertificadosTabProps {
  certs: Certificado[];
  estudiantes: Estudiante[];
  cursos: Curso[];
  openNewCert: () => void;
  openEditCert: (id: string) => void;
}

export function CertificadosTab(props: CertificadosTabProps) {
  const { certs, estudiantes, cursos, openNewCert, openEditCert } = props;
  return (
    <>
        <div className="actions-row"><button className="btn btn-gold" onClick={openNewCert}>🏆 Emitir Certificado</button></div>
        <div className="card">
          <div className="card-header">
            <div className="card-title">🏆 Certificados Emitidos</div>
            <div style={{ fontSize: 12, color: 'var(--dim)' }}>{certs.length} certificados</div>
          </div>
          {certs.length === 0 ? (
            <EmptyState icon="🏆" title="Sin certificados aún" sub="Emite el primer certificado" />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
              {certs.map((c) => {
                const est = estudiantes.find((e) => e.id === c.estId);
                const curso = cursos.find((x) => x.id === c.cursoId);
                return (
                  <div key={c.id} style={{ background: 'linear-gradient(135deg, var(--surface), var(--surface-2))', border: '1px solid var(--gold)', borderRadius: 12, padding: 16, position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, background: 'var(--gold-glow)', borderRadius: '50%' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontFamily: "'Cinzel', serif", fontSize: 15, fontWeight: 700, color: 'var(--gold)' }}>{est ? `${est.nombre} ${est.apellido}` : '—'}</div>
                        <div style={{ fontSize: 12, color: 'var(--dim)', marginTop: 3 }}>{curso ? `${curso.emoji} ${curso.nombre}` : '—'}</div>
                        <div style={{ fontSize: 11, color: 'var(--gold-deep)', marginTop: 6 }}>📅 {fmt(c.fecha)}</div>
                      </div>
                      <span className={`badge ${CAL_BADGE[c.calificacion] || 'badge-green'}`} style={{ marginTop: 4 }}>{c.calificacion}</span>
                    </div>
                    {c.observaciones && <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 8 }}>{c.observaciones}</div>}
                    <div style={{ marginTop: 10 }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => openEditCert(c.id)}>✏️ Editar</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
    </>
  );
}
