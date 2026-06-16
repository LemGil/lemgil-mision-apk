import { useMemo, useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Layout } from '../components/Layout';
import { KpiCard } from '../components/KpiCard';
import { Modal } from '../components/Modal';
import { db } from '../lib/database';

import { MS, monthKey } from '../lib/utils';

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

type Activity = { icon: string; bg: string; title: string; meta: string; time: string; href?: string };
type Alert = { type: 'danger' | 'warn' | 'info'; text: string };

export default function Dashboard() {
  const convs = useLiveQuery(() => db.conversiones.toArray(), []) ?? [];
  const grupos = useLiveQuery(() => db.grupos.toArray(), []) ?? [];
  const evangels = useLiveQuery(() => db.evangelismos.toArray(), []) ?? [];
  const cursos = useLiveQuery(() => db.cursos.toArray(), []) ?? [];
  const estudiantes = useLiveQuery(() => db.estudiantes.toArray(), []) ?? [];
  const certs = useLiveQuery(() => db.certificados.toArray(), []) ?? [];
  const aportes = useLiveQuery(() => db.aportes.toArray(), []) ?? [];
  const entregas = useLiveQuery(() => db.entregas.toArray(), []) ?? [];
  const beneficiarios = useLiveQuery(() => db.beneficiarios.toArray(), []) ?? [];
  const metasDoc = useLiveQuery(() => db.metas.get('default'), []);

  const [impactView, setImpactView] = useState<'familias' | 'personas'>('personas');
  const [editMetas, setEditMetas] = useState(false);
  const [toast, setToast] = useState('');
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
  const mo = today.toISOString().slice(0, 7);

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
  const aportesF = useMemo(() => filterAno ? aportes.filter((a) => a.fecha?.startsWith(filterAno)) : aportes, [aportes, filterAno]);
  const entregasF = useMemo(() => filterAno ? entregas.filter((e) => e.fecha?.startsWith(filterAno)) : entregas, [entregas, filterAno]);

  const kpis = useMemo(() => {
    const totalConv = convsF.length;
    const mesCount = filterAno
      ? convsF.filter((c) => monthKey(c.fecha) === `${filterAno}-${String(today.getMonth() + 1).padStart(2, '0')}`).length
      : convs.filter((c) => monthKey(c.fecha) === mo).length;
    const activos = grupos.filter((g) => g.miembros > 0).length;
    const totalMembers = grupos.reduce((s, g) => s + (g.miembros || 0), 0);
    const estActivos = estudiantes.filter((e) => e.estado === 'Activo').length;
    const certCount = filterAno
      ? certs.filter((c) => c.emitido?.startsWith(filterAno)).length
      : certs.length;
    return { totalConv, mesCount, activos, totalMembers, estActivos, certCount };
  }, [convsF, grupos, estudiantes, certs, mo, filterAno, today]);

  const chart = useMemo(() => {
    const counts: Record<string, number> = {};
    convsF.forEach((c) => {
      const k = monthKey(c.fecha);
      if (k) counts[k] = (counts[k] || 0) + 1;
    });
    const last: { key: string; label: string; val: number }[] = [];
    const chartYear = filterAno ? parseInt(filterAno) : today.getFullYear();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(chartYear, today.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      last.push({ key, label: MS[d.getMonth()], val: counts[key] || 0 });
    }
    const max = Math.max(1, ...last.map((x) => x.val));
    const curKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    return last.map((x) => ({ ...x, pct: Math.round((x.val / max) * 100), highlight: x.key === curKey }));
  }, [convsF, today, filterAno]);

  const activities = useMemo<Activity[]>(() => {
    const all: Activity[] = [];
    convsF.slice(-5).forEach((c) => all.push({ icon: '🌱', bg: 'var(--mision-purple-soft)', title: `${c.nombre} ${c.apellido} — ${c.estado}`, meta: `${c.zona} · ${c.lider || 'Sin líder'}`, time: relTime(c.creado) }));
    evangelsF.slice(-5).forEach((e) => all.push({ icon: '📢', bg: 'var(--oro-luz-soft)', title: `${e.tipo} — ${e.contactos} contactos`, meta: `${e.zona} · ${e.lider || 'Sin líder'}`, time: relTime(e.creado) }));
    estudiantes.slice(-5).forEach((e) => {
      const curso = cursos.find((c) => c.id === e.cursoId);
      all.push({ icon: '🎓', bg: 'var(--academia-teal-soft)', title: `${e.nombre} ${e.apellido} matriculado/a`, meta: curso ? `${curso.emoji} ${curso.nombre}` : 'Sin curso', time: relTime(e.creado) });
    });
    certs.slice(-5).forEach((c) => {
      const est = estudiantes.find((e) => e.id === c.estId);
      all.push({ icon: '🏆', bg: 'var(--gold-soft)', title: `Certificado emitido — ${c.calificacion}`, meta: est ? `${est.nombre} ${est.apellido}` : 'Estudiante', time: relTime(c.emitido) });
    });
    return all.sort((a, b) => b.time.localeCompare(a.time)).slice(0, 5);
  }, [convsF, evangelsF, estudiantes, certs, cursos]);

  const alerts = useMemo<Alert[]>(() => {
    const out: Alert[] = [];
    const gruposVacios = grupos.filter((g) => !g.miembros || g.miembros === 0).length;
    if (gruposVacios > 0) out.push({ type: 'warn', text: `🟡 ${gruposVacios} grupo(s) sin miembros activos` });
    const estPausados = estudiantes.filter((e) => e.estado === 'Pausado').length;
    if (estPausados > 0) out.push({ type: 'warn', text: `🟡 ${estPausados} estudiante(s) en pausa` });
    const cursosBorrador = cursos.filter((c) => c.estado === 'Borrador').length;
    if (cursosBorrador > 0) out.push({ type: 'info', text: `🔵 ${cursosBorrador} curso(s) en borrador` });
    const cursosArch = cursos.filter((c) => c.estado === 'Archivado').length;
    if (cursosArch > 0) out.push({ type: 'warn', text: `🟡 ${cursosArch} curso(s) archivado(s)` });
    const evangSinLider = evangels.filter((e) => !e.lider || !e.lider.trim()).length;
    if (evangSinLider > 0) out.push({ type: 'info', text: `🔵 ${evangSinLider} actividad(es) sin líder asignado` });
    if (kpis.mesCount === 0 && convs.length > 0) out.push({ type: 'danger', text: '🔴 Sin conversiones registradas este mes' });
    if (out.length === 0) out.push({ type: 'info', text: '🟢 Todo en orden — sin alertas activas' });
    return out.slice(0, 5);
  }, [grupos, estudiantes, cursos, evangels, kpis.mesCount, convs.length]);

  const impact = useMemo(() => {
    const uniqIds = new Set(entregasF.map((e) => e.beneficiarioId));
    const familias = uniqIds.size;
    const personas = beneficiarios
      .filter((b) => uniqIds.has(b.id))
      .reduce((s, b) => s + (b.familia || 1), 0);
    return { familias, personas };
  }, [entregasF, beneficiarios]);

  const goals = useMemo(() => {
    const m = metasDoc || { membresia: 500, academia: 150, sostenimiento: 8000, familias: 200, personas: 800 };
    const miembros = convsF.filter((c) => c.estado === 'Integrado').length + kpis.totalMembers;
    const graduados = kpis.certCount;
    const sostenimiento = filterAno
      ? aportesF.reduce((s, a) => s + (a.monto || 0), 0)
      : aportesF.filter((a) => monthKey(a.fecha) === mo).reduce((s, a) => s + (a.monto || 0), 0);
    const impactCurrent = impactView === 'familias' ? impact.familias : impact.personas;
    const impactTotal = impactView === 'familias' ? m.familias : m.personas;
    return [
      { label: `👥 Membresía: ${m.membresia} miembros`, current: miembros, total: m.membresia, color: 'var(--green)' },
      { label: `🎓 Academia: ${m.academia} graduados`, current: graduados, total: m.academia, color: 'var(--academia-teal)' },
      { label: `💰 Sostenimiento: $${m.sostenimiento.toLocaleString()}/mes`, current: sostenimiento, total: m.sostenimiento, color: 'var(--oro-apostolico)', prefix: '$' },
      { label: `🤲 ${impactView === 'familias' ? 'Familias' : 'Personas'} impactadas: ${impactTotal.toLocaleString()}`, current: impactCurrent, total: impactTotal, color: 'var(--manos-terracota)' },
    ];
  }, [metasDoc, convsF, kpis.totalMembers, kpis.certCount, aportesF, mo, impactView, impact, filterAno]);

  const saveMetas = async () => {
    const membresia = parseInt(mMembresia) || 0;
    const academia = parseInt(mAcademia) || 0;
    const sostenimiento = parseInt(mSostenimiento) || 0;
    const familias = parseInt(mFamilias) || 0;
    const personas = parseInt(mPersonas) || 0;
    if (membresia <= 0 || academia <= 0 || sostenimiento <= 0 || familias <= 0 || personas <= 0) {
      return setToast('Todos los valores deben ser mayores a 0');
    }
    await db.metas.put({ id: 'default', membresia, academia, sostenimiento, familias, personas, actualizado: new Date().toISOString() });
    setEditMetas(false);
    setToast('Metas actualizadas');
    setTimeout(() => setToast(''), 3200);
  };

  return (
    <Layout title="Panel Principal">
      <div style={{ marginBottom: 28 }}>
        <div style={{
          fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 700,
          background: 'linear-gradient(135deg, var(--oro-luz), var(--oro-apostolico))',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          letterSpacing: 1,
        }}>
          Bienvenido, LemGil
        </div>
        <div style={{ color: 'var(--dim)', fontSize: 14, marginTop: 5, fontFamily: 'var(--font-reading)', fontStyle: 'italic' }}>
          {dateStr}
        </div>
      </div>

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
        <KpiCard label="Conversiones Totales" value={kpis.totalConv} icon="✝️" accent="var(--mision-purple)" change={`▲ +${kpis.mesCount} este mes`} changeDir="up" />
        <KpiCard label="Grupos Activos" value={kpis.activos} icon="👥" accent="var(--oro-apostolico)" change={`${kpis.totalMembers} miembros`} changeDir="up" />
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
              <button onClick={() => setImpactView('familias')} style={{ padding: '3px 8px', fontSize: 10, fontWeight: 700, border: 'none', borderRadius: 4, cursor: 'pointer', background: impactView === 'familias' ? 'var(--manos-terracota)' : 'transparent', color: impactView === 'familias' ? '#fff' : 'var(--dim)' }}>👪</button>
              <button onClick={() => setImpactView('personas')} style={{ padding: '3px 8px', fontSize: 10, fontWeight: 700, border: 'none', borderRadius: 4, cursor: 'pointer', background: impactView === 'personas' ? 'var(--manos-terracota)' : 'transparent', color: impactView === 'personas' ? '#fff' : 'var(--dim)' }}>🧑</button>
            </div>
          }
        />
      </div>

      <div className="grid-2" style={{ marginBottom: 18 }}>
        <div className="card">
          <div className="card-header">
            <div className="card-title">📈 Crecimiento Ministerial — Últimos 6 meses</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 130 }}>
            {chart.map((b) => (
              <div key={b.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
                <div
                  style={{
                    width: '100%', borderRadius: '5px 5px 0 0', height: `${b.pct}%`, minHeight: 4, cursor: 'pointer',
                    background: b.highlight
                      ? 'linear-gradient(180deg, var(--oro-apostolico), rgba(201,162,74,0.15))'
                      : 'linear-gradient(180deg, var(--oro-sombra), rgba(138,106,47,0.15))',
                  }}
                  title={`Conversiones: ${b.val}`}
                />
                <div style={{ fontSize: 10, color: 'var(--dim)', fontWeight: 600 }}>{b.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">🚦 Semáforo Ministerial</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {[
              { color: 'green', emoji: '🟢', count: kpis.activos, label: 'Grupos', bg: 'rgba(90,158,111,0.12)', border: 'rgba(90,158,111,0.3)' },
              { color: 'yellow', emoji: '🟡', count: alerts.filter((a) => a.type === 'warn').length, label: 'Alerta', bg: 'rgba(245,215,122,0.12)', border: 'rgba(245,215,122,0.3)' },
              { color: 'red', emoji: '🔴', count: alerts.filter((a) => a.type === 'danger').length, label: 'Críticos', bg: 'rgba(199,80,80,0.12)', border: 'rgba(199,80,80,0.3)' },
            ].map((s) => (
              <div key={s.color} style={{ borderRadius: 10, padding: 16, textAlign: 'center', background: s.bg, border: `1px solid ${s.border}` }}>
                <div style={{ fontSize: 22, marginBottom: 6 }}>{s.emoji}</div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 700, color: 'var(--txt)' }}>{s.count}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: s.color === 'green' ? 'var(--green)' : s.color === 'yellow' ? 'var(--oro-luz)' : 'var(--red)' }}>{s.label}</div>
                <div style={{ fontSize: 10, color: 'var(--dim)' }}>áreas</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: 18 }}>
        <div className="card">
          <div className="card-header"><div className="card-title">⚡ Actividad Reciente</div></div>
          {activities.length === 0 ? (
            <div style={{ color: 'var(--dim)', fontSize: 13, padding: 18, textAlign: 'center' }}>
              Sin actividad reciente — registra conversiones, evangelismos o estudiantes para verlas aquí
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {activities.map((a, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 11, background: 'var(--surface)', borderRadius: 8, cursor: 'pointer', border: '1px solid transparent', transition: 'border-color .2s' }}>
                  <div style={{ width: 38, height: 38, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, background: a.bg, flexShrink: 0 }}>{a.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt)' }}>{a.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 2 }}>{a.meta}</div>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--dim)', whiteSpace: 'nowrap' }}>{a.time}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header"><div className="card-title">⚠️ Alertas del Sistema</div></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {alerts.map((a, i) => (
              <div key={i} style={{
                padding: '11px 14px', borderRadius: 8, fontSize: 12.5,
                background: a.type === 'danger' ? 'rgba(199,80,80,0.1)' : a.type === 'warn' ? 'rgba(245,215,122,0.1)' : 'rgba(74,127,212,0.1)',
                borderLeft: `3px solid ${a.type === 'danger' ? 'var(--red)' : a.type === 'warn' ? 'var(--oro-luz)' : 'var(--blue)'}`,
              }}>
                {a.text}
              </div>
            ))}
          </div>
        </div>
      </div>

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
          <div className="card-title">📊 Metas Anuales — Progreso</div>
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
          💡 <strong>Tip:</strong> Las metas impactan directamente el cálculo de progreso y el semáforo del Dashboard.
        </div>
      </Modal>

      {toast && <div className="toast-container"><div className="toast success">{toast}</div></div>}
    </Layout>
  );
}
