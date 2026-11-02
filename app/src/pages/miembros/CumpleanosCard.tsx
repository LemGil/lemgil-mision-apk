import type { Persona } from '../../lib/types';
import { calcAge } from './constants';

// P6: la tarjeta recibe PERSONAS (el núcleo), no miembros: el cumpleaños
// es de la persona y se celebra la tenga o no proceso de miembro.
interface CumpleanosCardProps {
  proximosCumples: { p: Persona; dias: number | null }[];
}

export function CumpleanosCard({ proximosCumples }: CumpleanosCardProps) {
  return (
        <div className="card" style={{ marginBottom: 16, padding: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <span style={{ fontSize: 18 }}>🎂</span>
            <span style={{ fontWeight: 700, fontSize: 14 }}>Próximos Cumpleaños</span>
            <span style={{ fontSize: 11, color: 'var(--dim)' }}>— {proximosCumples.length} {proximosCumples.length === 1 ? 'persona' : 'personas'} en los próximos 30 días</span>
          </div>
          {proximosCumples.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--dim)', fontSize: 13, padding: 10 }}>No hay cumpleaños en los próximos 30 días</div>
          ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {proximosCumples.map(({ p, dias }) => {
              const d = dias!;
              return (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px', borderRadius: 6, background: d === 0 ? 'var(--gold-glow)' : 'var(--surface-2)', fontSize: 13 }}>
                <span style={{ fontSize: 16 }}>{d === 0 ? '🎉' : d <= 7 ? '🎈' : '📅'}</span>
                <strong style={{ flex: 1 }}>{p.nombre} {p.apellido}</strong>
                <span style={{ color: 'var(--dim)', fontSize: 12 }}>
                  {d === 0 ? '¡Hoy!' : d === 1 ? 'Mañana' : `En ${d} días`}
                </span>
                <span style={{ fontSize: 11, color: 'var(--dim)' }}>{calcAge(p.fechaNacimiento) !== null ? `(${calcAge(p.fechaNacimiento)} años)` : ''}</span>
                {p.telefono && d <= 1 && <a href={`https://wa.me/${p.telefono.replace(/\D/g, '')}?text=${encodeURIComponent(`¡Feliz cumpleaños ${p.nombre}! 🎂🎉 Que Dios te bendiga grandemente`)}`} target="_blank" rel="noopener noreferrer" className="btn btn-gold btn-sm" style={{ padding: '2px 10px', fontSize: 11, textDecoration: 'none' }}>💬 Felicitar</a>}
              </div>
            );
            })}
          </div>
          )}
        </div>
  );
}
