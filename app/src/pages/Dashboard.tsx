import { useMemo, useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { KpiCard } from '../components/KpiCard';
import { Modal } from '../components/Modal';
import { CumpleanosCard } from './miembros/CumpleanosCard';
import { diasHastaCumple } from './miembros/constants';
import { db } from '../lib/database';

import { MS } from '../lib/utils';
import { showToast } from '../lib/notification';
import { contarPersonasUnicas } from '../lib/personaVista';
import { mapaPersonas } from '../lib/personaDatos';
import {
  actividadReciente, alertasDelPanel, barrasCrecimiento, certificadosDelPeriodo,
  kpiConversiones, resumenGrupos, sostenimientoContraMeta,
} from '../lib/panel';
import type { TipoAlerta } from '../lib/panel';

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

export default function Dashboard() {
  // Bloque 3: mientras las consultas principales no respondan, el Panel
  // muestra «Cargando…» en vez de un tablero en ceros que parece roto.
  const convsQ = useLiveQuery(() => db.conversiones.toArray(), []);
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
  const metasDoc = useLiveQuery(() => db.metas.get('default'), []);

  const cargando = [convsQ, miembrosQ, gruposQ, evangelsQ, personasQ, cursosQ, estudiantesQ, certsQ, aportesQ, entregasQ, beneficiariosQ]
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
  const aportes = aportesQ ?? [];
  const entregas = entregasQ ?? [];
  const beneficiarios = beneficiariosQ ?? [];

  const [impactView, setImpactView] = useState<'familias' | 'personas'>('personas');
  const [editMetas, setEditMetas] = useState(false);
  const [filterAno, setFilterAno] = useState('');

  const [mMembresia, setMMembresia] = useState('500');
  const [mAcademia, setMAcademia] = useState('150');
  const [mSostenimiento, setMSostenimiento] = useState('8000');
  const [mFamilias, setMFamilias] = useState('200');
  const [mPersonas, setMPersonas] = useState('800');

  useEffect(() => {
    if (metasDoc) {
      setMMembresia(String(metasDoc.membresia));
      setMAcademia(String(metasDoc.academia));
      setMSostenimiento(String(metasDoc.sostenimiento));
      setMFamilias(String(metasDoc.familias));
      setMPersonas(String(metasDoc.personas));
    }
  }, [metasDoc]);

  const today = new Date();
  const dateStr = today.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const anos = useMemo(() => {
    const years = new Set<string>();
    convs.forEach((c) => { if (c.fecha) years.add(c.fecha.slice(0, 4)); });
    aportes.forEach((a) => { if (a.fecha) years.add(a.fecha.slice(0, 4)); });
    entregas.forEach((e) => { if (e.fecha) years.add(e.fecha.slice(0, 4)); });
    evangels.forEach((e) => { if (e.fecha) years.add(e.fecha.slice(0, 4)); });
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [convs, aportes, entregas, evangels]);

  const convsF = useMemo(() => filterAno ? convs.filter((c) => c.fecha?.startsWith(filterAno)) : convs, [convs, filterAno]);
  const evangelsF = useMemo(() => filterAno ? evangels.filter((e) => e.fecha?.startsWith(filterAno)) : evangels, [evangels, filterAno]);
  const entregasF = useMemo(() => filterAno ? entregas.filter((e) => e.fecha?.startsWith(filterAno)) : entregas, [entregas, filterAno]);

  const kpis = useMemo(() => {
    // Bloque 1: KPI de conversiones honesto (lib/panel), grupos desde el
    // conteo derivado de grupoStats y certificados del período (año en
    // curso sin filtro), no todo el histórico.
    const kpiConv = kpiConversiones(convs, filterAno, today);
    const gruposResumen = resumenGrupos(grupos, miembros, convs);
    // P6: la membresía cuenta PERSONAS ÚNICAS con proceso de miembro
    // (una persona, un conteo), no sumas de fichas ni contadores por
    // grupo: la misma persona no puede contar dos veces.
    const miembrosUnicos = contarPersonasUnicas(miembros);
    const estActivos = estudiantes.filter((e) => e.estado === 'Activo').length;
    const certCount = certificadosDelPeriodo(certs, filterAno, today);
    return {
      totalConv: kpiConv.total, mesCount: kpiConv.mesCount,
      kpiEtiqueta: kpiConv.etiqueta, kpiChange: kpiConv.change, kpiChangeDir: kpiConv.changeDir,
      activos: gruposResumen.activos, miembrosUnicos, estActivos, certCount,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [convs, grupos, miembros, estudiantes, certs, filterAno]);

  const chart = useMemo(() => barrasCrecimiento(convs, filterAno, today),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [convs, filterAno]);

  // Bloque 1: actividad resuelta desde la persona y ordenada por
  // timestamp real (lib/panel). El texto relativo se calcula al pintar.
  const activities = useMemo(() => actividadReciente({
    conversiones: convsF, evangelismos: evangelsF, estudiantes,
    certificados: certs, cursos, personasMap,
  }), [convsF, evangelsF, estudiantes, certs, cursos, personasMap]);

  // Bloque 2: alertas accionables y con señal (lib/panel).
  const alerts = useMemo(() => alertasDelPanel({
    grupos, miembros, conversiones: convs, estudiantes, cursos,
    evangelismos: evangels, personasMap,
    mesCount: kpis.mesCount, hayConversiones: convs.length > 0,
    filterAno, hoy: today,
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [grupos, miembros, convs, estudiantes, cursos, evangels, personasMap, kpis.mesCount, filterAno]);

  const impact = useMemo(() => {
    const uniqIds = new Set(entregasF.map((e) => e.beneficiarioId));
    const familias = uniqIds.size;
    const personasImpactadas = beneficiarios
      .filter((b) => uniqIds.has(b.id))
      .reduce((s, b) => s + (b.familia || 1), 0);
    return { familias, personas: personasImpactadas };
  }, [entregasF, beneficiarios]);

  // Bloque 2: los cumpleaños llegan al Panel — la misma tarjeta de
  // Miembros, alimentada con las personas (P6), sin bifurcarla.
  const proximosCumples = useMemo(() => {
    return personas
      .map(p => ({ p, dias: diasHastaCumple(p.fechaNacimiento) }))
      .filter(x => x.dias !== null && x.dias <= 30)
      .sort((a, b) => (a.dias || 0) - (b.dias || 0));
  }, [personas]);

  const goals = useMemo(() => {
    const m = metasDoc || { membresia: 500, academia: 150, sostenimiento: 8000, familias: 200, personas: 800 };
    // P6: antes esto SUMABA conversiones integradas + miembros por grupo
    // (la misma persona contaba dos veces). Ahora es el conteo único.
    const membresiaActual = kpis.miembrosUnicos;
    const graduados = kpis.certCount;
    // Bloque 1: sostenimiento con período coherente (mes contra meta
    // mensual; año filtrado contra meta × 12, dicho en la etiqueta).
    const sost = sostenimientoContraMeta(aportes, filterAno, m.sostenimiento, today);
    const impactCurrent = impactView === 'familias' ? impact.familias : impact.personas;
    const impactTotal = impactView === 'familias' ? m.familias : m.personas;
    return [
      { label: `👥 Membresía: ${m.membresia} miembros`, current: membresiaActual, total: m.membresia, color: 'var(--green)' },
      { label: `🎓 Academia: ${m.academia} graduados`, current: graduados, total: m.academia, color: 'var(--academia-teal)' },
      { label: sost.etiqueta, current: sost.actual, total: sost.meta, color: 'var(--oro-apostolico)', prefix: '$' },
      { label: `🤲 ${impactView === 'familias' ? 'Familias' : 'Personas'} impactadas: ${impactTotal.toLocaleString()}`, current: impactCurrent, total: impactTotal, color: 'var(--manos-terracota)' },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metasDoc, kpis.miembrosUnicos, kpis.certCount, aportes, impactView, impact, filterAno]);

  const saveMetas = async () => {
    const membresia = parseInt(mMembresia) || 0;
    const academia = parseInt(mAcademia) || 0;
    const sostenimiento = parseInt(mSostenimiento) || 0;
    const familias = parseInt(mFamilias) || 0;
    const personasMeta = parseInt(mPersonas) || 0;
    if (membresia <= 0 || academia <= 0 || sostenimiento <= 0 || familias <= 0 || personasMeta <= 0) {
      return showToast('Todos los valores deben ser mayores a 0');
    }
    const existing = await db.metas.get('default');
    const nextVersion = (existing?.version || 0) + 1;
    await db.metas.put({ id: 'default', membresia, academia, sostenimiento, familias, personas: personasMeta, actualizado: new Date().toISOString(), version: nextVersion });
    setEditMetas(false);
    showToast('Metas actualizadas');
      };

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
      {anos.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <span style={{ fontSize: 12, color: 'var(--dim)', fontWeight: 600 }}>📅 Filtrar por año:</span>
          <select className="filter-select" value={filterAno} onChange={(e) => setFilterAno(e.target.value)} style={{ maxWidth: 160 }}>
            <option value="">Todos los años</option>
            {anos.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          {filterAno && <span style={{ fontSize: 11, color: 'var(--oro-apostolico)', fontWeight: 700 }}>Mostrando datos de {filterAno}</span>}
        </div>
      )}

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
        <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--txt)' }}>🚀 Acceso Rápido</div>
        <div style={{ fontSize: 13, color: 'var(--dim)', marginTop: 2, marginBottom: 12 }}>Lo que más se hace cada semana, a un toque: registrar, entregar y reportar.</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <Link to="/mision-biblica" className="btn btn-gold">🌱 Nueva conversión</Link>
          <Link to="/mision-biblica" className="btn btn-secondary">📢 Evangelismo</Link>
          <Link to="/manos-abiertas" className="btn btn-secondary">🤲 Nueva entrega</Link>
          <Link to="/reportes" className="btn btn-secondary">📊 Generar Reporte</Link>
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: 18 }}>
        <div className="card">
          <div className="card-header">
            <div className="card-title">📈 Crecimiento Ministerial — Últimos 6 meses{filterAno ? ` · ${filterAno}` : ''}</div>
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
              Sin actividad reciente — registra conversiones, evangelismos o estudiantes para verlas aquí
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

      <CumpleanosCard proximosCumples={proximosCumples} />

      {anos.length > 1 && (
        <div className="card" style={{ marginBottom: 18 }}>
          <div className="card-header">
            <div className="card-title">📊 Resumen por Años</div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ minWidth: 500 }}>
              <thead>
                <tr><th>Año</th><th>Conversiones</th><th>Evangelismos</th><th>Aportes</th><th>Entregas</th></tr>
              </thead>
              <tbody>
                {anos.map((a) => (
                  <tr key={a} style={{ cursor: 'pointer', background: filterAno === a ? 'rgba(201,162,74,0.08)' : undefined }} onClick={() => setFilterAno(filterAno === a ? '' : a)}>
                    <td style={{ fontWeight: 700 }}>{a}</td>
                    <td>{convs.filter((c) => c.fecha?.startsWith(a)).length}</td>
                    <td>{evangels.filter((e) => e.fecha?.startsWith(a)).length}</td>
                    <td>${aportes.filter((ap) => ap.fecha?.startsWith(a)).reduce((s, ap) => s + (ap.monto || 0), 0).toLocaleString()}</td>
                    <td>{entregas.filter((e) => e.fecha?.startsWith(a)).length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <div className="card-title">🎯 Metas del Ministerio — Progreso</div>
          <button className="btn btn-secondary btn-sm" onClick={() => setEditMetas(true)}>✏️ Editar Metas</button>
        </div>
        {goals.map((g, i) => (
          <div key={i} className="progress-row">
            <div className="progress-header">
              <span style={{ color: 'var(--txt)' }}>{g.label}</span>
              <span style={{ color: 'var(--oro-apostolico)', fontWeight: 700 }}>
                {g.prefix || ''}{g.current.toLocaleString()} / {g.prefix || ''}{g.total.toLocaleString()} · {Math.round((g.current / g.total) * 100)}%
              </span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${Math.min(100, (g.current / g.total) * 100)}%`, background: g.color }} />
            </div>
          </div>
        ))}
      </div>
      </>
      )}

      <Modal
        open={editMetas}
        onClose={() => setEditMetas(false)}
        title="📊 Editar Metas Anuales"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setEditMetas(false)}>Cancelar</button>
            <button className="btn btn-gold" onClick={saveMetas}>💾 Guardar Metas</button>
          </>
        }
      >
        <div className="form-section">Define las metas anuales del ministerio</div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">👥 Membresía (personas)</label>
            <input className="form-input" type="number" value={mMembresia} onChange={(e) => setMMembresia(e.target.value)} min="1" />
          </div>
          <div className="form-group">
            <label className="form-label">🎓 Academia (graduados)</label>
            <input className="form-input" type="number" value={mAcademia} onChange={(e) => setMAcademia(e.target.value)} min="1" />
          </div>
          <div className="form-group">
            <label className="form-label">💰 Sostenimiento ($/mes)</label>
            <input className="form-input" type="number" value={mSostenimiento} onChange={(e) => setMSostenimiento(e.target.value)} min="1" />
          </div>
          <div className="form-group">
            <label className="form-label">👪 Familias impactadas</label>
            <input className="form-input" type="number" value={mFamilias} onChange={(e) => setMFamilias(e.target.value)} min="1" />
          </div>
          <div className="form-group">
            <label className="form-label">🧑 Personas impactadas</label>
            <input className="form-input" type="number" value={mPersonas} onChange={(e) => setMPersonas(e.target.value)} min="1" />
          </div>
        </div>
        <div style={{ marginTop: 14, padding: 12, background: 'var(--surface-2)', borderRadius: 8, fontSize: 12, color: 'var(--dim)' }}>
          💡 <strong>Cómo se mide cada meta:</strong> Membresía cuenta las personas únicas con proceso de miembro; Academia, los certificados emitidos en el año en curso (o en el año que filtres arriba); Sostenimiento compara los aportes de este mes con la meta mensual — y con un año filtrado, el total de ese año contra la meta mensual × 12; Familias y Personas impactadas cuentan las entregas del período mostrado.
        </div>
      </Modal>

        </Layout>
  );
}
