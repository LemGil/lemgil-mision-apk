import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { KpiCard } from '../components/KpiCard';
import { CumpleanosCard } from './miembros/CumpleanosCard';
import { diasHastaCumple } from './miembros/constants';
import { db } from '../lib/database';

import { MS } from '../lib/utils';
import { contarPersonasUnicas } from '../lib/personaVista';
import { mapaPersonas } from '../lib/personaDatos';
import { calcularCenso } from '../lib/censo';
import {
  actividadReciente, alertasDelPanel, barrasCrecimiento, certificadosDelPeriodo,
  kpiConversiones, resumenGrupos,
} from '../lib/panel';
import type { TipoAlerta } from '../lib/panel';

/**
 * El Panel: los ojos de Secretaría (criterio de LemGil, 2026-11-16;
 * revisión construida el 2026-11-17). La portada muestra la VIDA del
 * Ministerio HOY, de un vistazo: las KPI, la congregación del censo,
 * las alertas con sus casos, el acceso rápido, el crecimiento de los
 * últimos 6 meses, la actividad reciente y los cumpleaños.
 * Lo de analizar por períodos vive en Informes: por eso salieron el
 * filtro por año y el Resumen por Años, y las Metas (con su editor)
 * se mudaron a la página Informe, vista General.
 */

const fmtDate = (d: string) => {
  if (!d) return '—';
  const [y, m, dy] = d.split('-');
  return `${+dy} ${MS[+m - 1]} ${y}`;
};

const relTime = (iso: string) => {
  if (!iso) return '';
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return 'ahora';
  if (min < 60) return `hace ${min}m`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h}h`;
  const d2 = Math.floor(h / 24);
  if (d2 < 7) return `hace ${d2}d`;
  return fmtDate(iso.slice(0, 10));
};

const ALERTA_ICONO: Record<TipoAlerta, string> = { danger: '🔴', warn: '🟡', info: '🔵', ok: '🟢' };
const ALERTA_FONDO: Record<TipoAlerta, string> = {
  danger: 'rgba(199,80,80,0.06)', warn: 'rgba(245,215,122,0.06)', info: 'rgba(74,127,212,0.06)', ok: 'rgba(46,160,90,0.07)',
};
const ALERTA_BORDE: Record<TipoAlerta, string> = {
  danger: 'var(--red)', warn: 'var(--oro-luz)', info: 'var(--blue)', ok: 'var(--green)',
};

const pastilla: React.CSSProperties = {
  fontSize: 12.5, fontWeight: 600, padding: '4px 11px', borderRadius: 999,
  background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--txt)',
  whiteSpace: 'nowrap',
};

export default function Dashboard() {
  // Mientras las consultas principales no respondan, el Panel muestra
  // «Cargando…» en vez de un tablero en ceros que parece roto.
  const convsQ = useLiveQuery(() => db.conversiones.toArray(), []);
  const pasosSeguimiento = useLiveQuery(() => db.pasosSeguimiento.toArray(), []) ?? [];
  const miembrosQ = useLiveQuery(() => db.miembros.toArray(), []);
  const gruposQ = useLiveQuery(() => db.grupos.toArray(), []);
  const evangelsQ = useLiveQuery(() => db.evangelismos.toArray(), []);
  const personasQ = useLiveQuery(() => db.personas.toArray(), []);
  const cursosQ = useLiveQuery(() => db.cursos.toArray(), []);
  const estudiantesQ = useLiveQuery(() => db.estudiantes.toArray(), []);
  const certsQ = useLiveQuery(() => db.certificados.toArray(), []);
  const aportesQ = useLiveQuery(() => db.aportes.toArray(), []);
  const entregasQ = useLiveQuery(() => db.entregas.toArray(), []);
  const beneficiariosQ = useLiveQuery(() => db.beneficiarios.toArray(), []);
  const diezmadoresQ = useLiveQuery(() => db.dadores.toArray(), []);

  const cargando = [convsQ, miembrosQ, gruposQ, evangelsQ, personasQ, cursosQ, estudiantesQ, certsQ, aportesQ, entregasQ, beneficiariosQ, diezmadoresQ]
    .some((v) => v === undefined);

  const convs = convsQ ?? [];
  const miembros = miembrosQ ?? [];
  const grupos = gruposQ ?? [];
  const evangels = evangelsQ ?? [];
  const personas = personasQ ?? [];
  const personasMap = useMemo(() => mapaPersonas(personas), [personas]);
  const cursos = cursosQ ?? [];
  const estudiantes = estudiantesQ ?? [];
  const certs = certsQ ?? [];
  const entregas = entregasQ ?? [];
  const beneficiarios = beneficiariosQ ?? [];
  const diezmadores = diezmadoresQ ?? [];

  const [impactView, setImpactView] = useState<'familias' | 'personas'>('personas');

  const today = new Date();
  const dateStr = today.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const kpis = useMemo(() => {
    // KPI de conversiones honesto (lib/panel), grupos desde el conteo
    // derivado de grupoStats y certificados del año en curso.
    const kpiConv = kpiConversiones(convs, '', today);
    const gruposResumen = resumenGrupos(grupos, miembros, convs, pasosSeguimiento);
    // La membresía cuenta PERSONAS ÚNICAS con proceso de miembro
    // (una persona, un conteo), no sumas de fichas.
    const miembrosUnicos = contarPersonasUnicas(miembros);
    const estActivos = estudiantes.filter((e) => e.estado === 'Activo').length;
    const certCount = certificadosDelPeriodo(certs, '', today);
    return {
      totalConv: kpiConv.total, mesCount: kpiConv.mesCount,
      kpiEtiqueta: kpiConv.etiqueta, kpiChange: kpiConv.change, kpiChangeDir: kpiConv.changeDir,
      activos: gruposResumen.activos, miembrosUnicos, estActivos, certCount,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [convs, grupos, miembros, estudiantes, certs, pasosSeguimiento]);

  // La congregación hoy: la franja del censo — la MISMA fuente que el
  // Informe (calcularCenso), para que el número sea uno solo. Del
  // censo se toma la foto (total, etapas, miembros, diezmadores);
  // las líneas del período no se usan aquí.
  const censo = useMemo(() => calcularCenso(
    personas,
    { conversiones: convs, miembros, estudiantes, dadores: diezmadores, beneficiarios },
    pasosSeguimiento,
    { desde: '2020-01-01', hasta: '2099-12-31' },
    today,
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [personas, convs, miembros, estudiantes, diezmadores, beneficiarios, pasosSeguimiento]);

  const chart = useMemo(() => barrasCrecimiento(convs, '', today),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [convs]);

  // Actividad resuelta desde la persona y ordenada por timestamp real
  // (lib/panel). El texto relativo se calcula al pintar.
  const activities = useMemo(() => actividadReciente({
    conversiones: convs, evangelismos: evangels, estudiantes,
    certificados: certs, cursos, personasMap, pasosMision: pasosSeguimiento,
  }), [convs, evangels, estudiantes, certs, cursos, personasMap, pasosSeguimiento]);

  // Alertas accionables y con señal (lib/panel): los casos que
  // Secretaría tiene que atender, cada uno con su ficha a un toque.
  const alerts = useMemo(() => alertasDelPanel({
    grupos, miembros, conversiones: convs, estudiantes, cursos,
    evangelismos: evangels, personasMap, pasosMision: pasosSeguimiento,
    mesCount: kpis.mesCount, hayConversiones: convs.length > 0,
    filterAno: '', hoy: today,
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [grupos, miembros, convs, estudiantes, cursos, evangels, personasMap, pasosSeguimiento, kpis.mesCount]);

  const impact = useMemo(() => {
    const uniqIds = new Set(entregas.map((e) => e.beneficiarioId));
    const familias = uniqIds.size;
    const personasImpactadas = beneficiarios
      .filter((b) => uniqIds.has(b.id))
      .reduce((s, b) => s + (b.familia || 1), 0);
    return { familias, personas: personasImpactadas };
  }, [entregas, beneficiarios]);

  // Los cumpleaños llegan al Panel — la misma tarjeta de Miembros,
  // alimentada con las personas, sin bifurcarla.
  const proximosCumples = useMemo(() => {
    return personas
      .map(p => ({ p, dias: diasHastaCumple(p.fechaNacimiento) }))
      .filter(x => x.dias !== null && x.dias <= 30)
      .sort((a, b) => (a.dias || 0) - (b.dias || 0));
  }, [personas]);

  return (
    <Layout title="Panel Principal">
      <div style={{ marginBottom: 28 }}>
        <div style={{
          fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 700,
          background: 'linear-gradient(135deg, var(--oro-sombra), var(--oro-apostolico))',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          letterSpacing: 1,
        }}>
          Bienvenido, LemGil
        </div>
        <div style={{ color: 'var(--dim)', fontSize: 14, marginTop: 5, fontFamily: 'var(--font-reading)', fontStyle: 'italic' }}>
          {dateStr}
        </div>
      </div>

      {cargando ? (
        <div className="card" style={{ padding: 28, textAlign: 'center', color: 'var(--dim)', fontSize: 14 }}>
          Cargando el panel…
        </div>
      ) : (
      <>
      <div className="kpis">
        <KpiCard label={kpis.kpiEtiqueta} value={kpis.totalConv} icon="✝️" accent="var(--mision-purple)" change={kpis.kpiChange} changeDir={kpis.kpiChangeDir} />
        <KpiCard label="Grupos Activos" value={kpis.activos} icon="👥" accent="var(--oro-apostolico)" change={`${kpis.miembrosUnicos} miembros`} changeDir="up" />
        <KpiCard label="Estudiantes Activos" value={kpis.estActivos} icon="🎓" accent="var(--academia-teal)" change={`${kpis.certCount} certificados`} changeDir="up" />
        <KpiCard
          label={impactView === 'familias' ? 'Familias Impactadas' : 'Personas Impactadas'}
          value={impactView === 'familias' ? impact.familias : impact.personas}
          icon="🤲"
          accent="var(--manos-terracota)"
          change={`${impact.familias} familias · ${impact.personas} personas`}
          changeDir="up"
          extra={
            <div style={{ display: 'flex', gap: 2, background: 'var(--surface-2)', borderRadius: 6, padding: 2 }}>
              <button onClick={() => setImpactView('familias')} style={{ padding: '3px 8px', fontSize: 10, fontWeight: 700, border: 'none', borderRadius: 4, cursor: 'pointer', background: impactView === 'familias' ? 'var(--manos-terracota)' : 'transparent', color: impactView === 'familias' ? '#fff' : 'var(--dim)' }}>👪 Familias</button>
              <button onClick={() => setImpactView('personas')} style={{ padding: '3px 8px', fontSize: 10, fontWeight: 700, border: 'none', borderRadius: 4, cursor: 'pointer', background: impactView === 'personas' ? 'var(--manos-terracota)' : 'transparent', color: impactView === 'personas' ? '#fff' : 'var(--dim)' }}>🧑 Personas</button>
            </div>
          }
        />
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <div className="card-header">
          <div className="card-title">👥 La congregación hoy</div>
          <Link to="/reportes" style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--oro-apostolico)', textDecoration: 'none' }}>Ver el censo completo →</Link>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 32, fontWeight: 800, lineHeight: 1, color: 'var(--txt)' }}>{censo.total}</div>
            <div style={{ fontSize: 10.5, color: 'var(--dim)', fontWeight: 700, letterSpacing: 0.5, marginTop: 4 }}>TOTAL DE CONGREGADOS</div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, flex: 1 }}>
            {censo.etapas.map((e) => (
              <span key={e.pasoId} style={pastilla}>{e.etiqueta} · <strong>{e.cantidad}</strong></span>
            ))}
            <span style={pastilla}>Miembros · <strong>{censo.miembros}</strong></span>
            <span style={pastilla}>Diezmadores · <strong>{censo.diezmadores}</strong></span>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <div className="card-header"><div className="card-title">⚠️ Alertas del Sistema</div></div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {alerts.map((a, i) => {
            const estilo: React.CSSProperties = {
              padding: '12px 16px', borderRadius: 10, fontSize: 13, display: 'block',
              background: ALERTA_FONDO[a.tipo],
              borderLeft: `4px solid ${ALERTA_BORDE[a.tipo]}`,
              color: 'var(--txt-2)', textDecoration: 'none',
            };
            // Con casos nombrados (items) la tarjeta no es un solo enlace:
            // cada nombre lleva directo a su ficha, y «Ver →» a la lista.
            if (a.items && a.items.length > 0) {
              return (
                <div key={i} style={estilo}>
                  <span style={{ marginRight: 6 }}>{ALERTA_ICONO[a.tipo]}</span>
                  {a.texto}
                  {a.href && <Link to={a.href} style={{ float: 'right', fontWeight: 700, color: 'var(--oro-apostolico)', textDecoration: 'none' }}>Ver →</Link>}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                    {a.items.map((it, j) => (
                      <Link key={j} to={it.href} style={{ fontSize: 12, fontWeight: 600, padding: '3px 9px', borderRadius: 999, background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--txt)', textDecoration: 'none' }}>
                        {it.texto}
                      </Link>
                    ))}
                  </div>
                </div>
              );
            }
            const contenido = (
              <>
                <span style={{ marginRight: 6 }}>{ALERTA_ICONO[a.tipo]}</span>
                {a.texto}
                {a.href && <span style={{ float: 'right', fontWeight: 700, color: 'var(--oro-apostolico)' }}>Ver →</span>}
              </>
            );
            return a.href
              ? <Link key={i} to={a.href} style={estilo}>{contenido}</Link>
              : <div key={i} style={estilo}>{contenido}</div>;
          })}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--txt)' }}>🚀 Acceso Rápido</div>
        <div style={{ fontSize: 13, color: 'var(--dim)', marginTop: 2, marginBottom: 12 }}>Lo que más se hace cada semana, a un toque: registrar, entregar y reportar.</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <Link to="/mision" className="btn btn-gold">🙏 Nuevo congregado</Link>
          <Link to="/mision?tab=evangelismo" className="btn btn-secondary">📢 Evangelismo</Link>
          <Link to="/manos-abiertas" className="btn btn-secondary">🤲 Nueva entrega</Link>
          <Link to="/reportes" className="btn btn-secondary">📊 Generar Reporte</Link>
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: 18 }}>
        <div className="card">
          <div className="card-header">
            <div className="card-title">📈 Crecimiento Ministerial — Últimos 6 meses</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 130 }}>
            {chart.map((b) => (
              <div key={b.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--txt)' }}>{b.val}</div>
                <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end' }}>
                  <div
                    style={{
                      width: '100%', borderRadius: '5px 5px 0 0', height: `${b.pct}%`, minHeight: 4, cursor: 'pointer',
                      background: b.highlight
                        ? 'linear-gradient(180deg, var(--oro-apostolico), rgba(201,162,74,0.15))'
                        : 'linear-gradient(180deg, var(--oro-sombra), rgba(138,106,47,0.15))',
                    }}
                    title={`Conversiones: ${b.val}`}
                  />
                </div>
                <div style={{ fontSize: 10, color: 'var(--dim)', fontWeight: 600 }}>{b.label}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="card-header"><div className="card-title">⚡ Actividad Reciente</div></div>
          {activities.length === 0 ? (
            <div style={{ color: 'var(--dim)', fontSize: 13, padding: 18, textAlign: 'center' }}>
              Sin actividad reciente — registra congregados, evangelismos o estudiantes para verlas aquí
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {activities.map((a, i) => (
                <Link key={i} to={a.href ?? '#'} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, background: 'var(--surface-2)', borderRadius: 10, border: '1px solid var(--border)', textDecoration: 'none' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, background: a.bg, flexShrink: 0 }}>{a.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt)' }}>{a.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 2 }}>{a.meta}</div>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--dim)', fontWeight: 600, whiteSpace: 'nowrap' }}>{relTime(a.ts)}</div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <CumpleanosCard proximosCumples={proximosCumples} />
      </>
      )}
    </Layout>
  );
}
