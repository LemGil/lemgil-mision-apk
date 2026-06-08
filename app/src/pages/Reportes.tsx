import { useState, useMemo } from 'react';
import { v4 as uuid } from 'uuid';
import { useLiveQuery } from 'dexie-react-hooks';
import { Layout } from '../components/Layout';
import { Modal } from '../components/Modal';
import { EmptyState } from '../components/EmptyState';
import { db } from '../lib/database';

const MS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MS_FULL = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const fmt = (d: string) => {
  if (!d) return '—';
  const [y, m, dy] = d.split('-');
  return `${+dy} ${MS[+m - 1]} ${y}`;
};
const monthKey = (d: string) => (d && d.length >= 7 ? d.slice(0, 7) : '');
const inRange = (d: string, desde: string, hasta: string) => d && d >= desde && d <= hasta;
const money = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
const num = (n: number) => n.toLocaleString('en-US');

type PeriodoPreset = 'mes' | 'mesAnterior' | 'anio' | 'todo' | 'custom';
type Tab = 'actual' | 'historial';

export default function Reportes() {
  const convs = useLiveQuery(() => db.conversiones.toArray(), []) ?? [];
  const grupos = useLiveQuery(() => db.grupos.toArray(), []) ?? [];
  const evangels = useLiveQuery(() => db.evangelismos.toArray(), []) ?? [];
  const cursos = useLiveQuery(() => db.cursos.toArray(), []) ?? [];
  const estudiantes = useLiveQuery(() => db.estudiantes.toArray(), []) ?? [];
  const certs = useLiveQuery(() => db.certificados.toArray(), []) ?? [];
  const dadores = useLiveQuery(() => db.dadores.toArray(), []) ?? [];
  const aportes = useLiveQuery(() => db.aportes.toArray(), []) ?? [];
  const colaboradores = useLiveQuery(() => db.colaboradores.toArray(), []) ?? [];
  const aportesComun = useLiveQuery(() => db.aportesComun.toArray(), []) ?? [];
  const beneficiarios = useLiveQuery(() => db.beneficiarios.toArray(), []) ?? [];
  const campanas = useLiveQuery(() => db.campanas.toArray(), []) ?? [];
  const entregas = useLiveQuery(() => db.entregas.toArray(), []) ?? [];
  const negocios = useLiveQuery(() => db.negocios.toArray(), []) ?? [];
  const publicaciones = useLiveQuery(() => db.publicaciones.toArray(), []) ?? [];
  const metasDoc = useLiveQuery(() => db.metas.get('default'), []);
  const reportes = useLiveQuery(() => db.reportes.toArray(), []) ?? [];

  const today = new Date();
  const ymNow = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const ymPrev = (() => {
    const d = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  })();

  const [preset, setPreset] = useState<PeriodoPreset>('mes');
  const [desde, setDesde] = useState(`${ymNow}-01`);
  const [hasta, setHasta] = useState(`${ymNow}-${String(new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()).padStart(2, '0')}`);
  const [tab, setTab] = useState<Tab>('actual');
  const [modal, setModal] = useState<null | 'gen' | 'ver' | 'del'>(null);
  const [genTitulo, setGenTitulo] = useState('');
  const [viewId, setViewId] = useState<string | null>(null);
  const [delId, setDelId] = useState<string | null>(null);
  const [toast, setToast] = useState('');

  const applyPreset = (p: PeriodoPreset) => {
    setPreset(p);
    if (p === 'mes') {
      const last = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
      setDesde(`${ymNow}-01`);
      setHasta(`${ymNow}-${String(last).padStart(2, '0')}`);
    } else if (p === 'mesAnterior') {
      const last = new Date(today.getFullYear(), today.getMonth(), 0).getDate();
      setDesde(`${ymPrev}-01`);
      setHasta(`${ymPrev}-${String(last).padStart(2, '0')}`);
    } else if (p === 'anio') {
      setDesde(`${today.getFullYear()}-01-01`);
      setHasta(`${today.getFullYear()}-12-31`);
    } else if (p === 'todo') {
      setDesde('2020-01-01');
      setHasta('2099-12-31');
    }
  };

  const periodoLabel = useMemo(() => {
    if (preset === 'mes') return `${MS_FULL[today.getMonth()]} ${today.getFullYear()}`;
    if (preset === 'mesAnterior') return `${MS_FULL[today.getMonth() === 0 ? 11 : today.getMonth() - 1]} ${today.getMonth() === 0 ? today.getFullYear() - 1 : today.getFullYear()}`;
    if (preset === 'anio') return `Año ${today.getFullYear()}`;
    if (preset === 'todo') return 'Histórico completo';
    return `${fmt(desde)} → ${fmt(hasta)}`;
  }, [preset, desde, hasta, today]);

  const datos = useMemo(() => {
    const enRango = <T extends { fecha?: string; fechaInicio?: string; creado?: string; emitido?: string }>(arr: T[], key: 'fecha' | 'fechaInicio' | 'creado' | 'emitido' = 'fecha') =>
      arr.filter((x) => inRange(x[key] || '', desde, hasta));

    const conv = enRango(convs);
    const convMes = conv.filter((c) => monthKey(c.fecha) === ymNow).length;
    const convIntegrados = conv.filter((c) => c.estado === 'Integrado').length;
    const evang = enRango(evangels);
    const evangContactos = evang.reduce((s, e) => s + (e.contactos || 0), 0);
    const evangConvs = evang.reduce((s, e) => s + (e.conversiones || 0), 0);

    const estActivos = estudiantes.filter((e) => e.estado === 'Activo' && inRange(e.creado, desde, hasta)).length;
    const certRango = enRango(certs, 'emitido');
    const cursosActivos = cursos.filter((c) => c.estado === 'Activo').length;

    const apRango = enRango(aportes);
    const apTotal = apRango.reduce((s, a) => s + (a.monto || 0), 0);
    const apDiezmos = apRango.filter((a) => a.tipo === 'Diezmo').reduce((s, a) => s + (a.monto || 0), 0);
    const apOfrendas = apRango.filter((a) => a.tipo === 'Ofrenda').reduce((s, a) => s + (a.monto || 0), 0);

    const apComunRango = enRango(aportesComun);
    const apComunTotal = apComunRango.reduce((s, a) => s + (a.monto || 0), 0);
    const apComunDiezmos = apComunRango.filter((a) => a.tipo === 'Diezmo').reduce((s, a) => s + (a.monto || 0), 0);
    const apComunOfrendas = apComunRango.filter((a) => a.tipo === 'Ofrenda').reduce((s, a) => s + (a.monto || 0), 0);

    const finDiezmos = apDiezmos + apComunDiezmos;
    const finOfrendas = apOfrendas + apComunOfrendas;
    const bienComunTotal = apTotal;
    const bienComunPlan = metasDoc?.sostenimiento || 8000;

    const colaboradoresAyuda = apComunRango.filter((a) => a.tipo === 'Ofrenda').reduce((s, a) => s + (a.monto || 0), 0);
    const colaboradoresMisiones = 0;
    const colaboradoresManosAbiertas = 0;
    const colaboradoresTotal = apComunTotal;
    const colaboradoresPlan = 0;

    const totalFinal = bienComunTotal + colaboradoresTotal;

    const entrRango = enRango(entregas);
    const benefUnicos = new Set(entrRango.map((e) => e.beneficiarioId)).size;
    const personas = beneficiarios
      .filter((b) => entrRango.some((e) => e.beneficiarioId === b.id))
      .reduce((s, b) => s + (b.familia || 1), 0);

    const negActivos = negocios.filter((n) => n.estado === 'Activo').length;
    const negIngresos = negocios.filter((n) => n.estado === 'Activo').reduce((s, n) => s + (n.ingresosMensuales || 0), 0);

    const pubRango = publicaciones.filter((p) => p.estado === 'Publicada' && inRange(p.fecha, desde, hasta));
    const pubAlcance = pubRango.reduce((s, p) => s + (p.alcance || 0), 0);
    const pubEng = pubRango.reduce((s, p) => s + (p.engagement || 0), 0);

    return {
      conv: { total: conv.length, mesActual: convMes, integrados: convIntegrados, grupos: grupos.length },
      evang: { total: evang.length, contactos: evangContactos, conversiones: evangConvs },
      academia: { cursos: cursos.length, cursosActivos, estudiantes: estActivos, certificados: certRango.length },
      finanzas: { diezmos: finDiezmos, ofrendas: finOfrendas, bienComunDiezmos: apDiezmos, bienComunOfrendas: apOfrendas, bienComunTotal, bienComunPlan, colaboradoresAyuda, colaboradoresMisiones, colaboradoresManosAbiertas, colaboradoresTotal, colaboradoresPlan, totalFinal },
      manos: { beneficiarios: beneficiarios.length, campanas: campanas.filter((c) => inRange(c.fechaInicio, desde, hasta)).length, entregas: entrRango.length, familias: benefUnicos, personas },
      negocios: { activos: negActivos, emprendedores: new Set(negocios.map((n) => n.emprendedor?.toLowerCase()).filter(Boolean)).size, ingresos: negIngresos },
      comunicacion: { publicaciones: pubRango.length, alcance: pubAlcance, engagement: pubEng },
    };
  }, [convs, grupos, evangels, cursos, estudiantes, certs, dadores, aportes, colaboradores, aportesComun, beneficiarios, campanas, entregas, negocios, publicaciones, desde, hasta, ymNow]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3200);
  };

  const openGen = () => {
    setGenTitulo(`Reporte ${periodoLabel}`);
    setModal('gen');
  };
  const saveReporte = async () => {
    if (!genTitulo.trim()) return showToast('El título es obligatorio');
    await db.reportes.add({
      id: uuid(),
      titulo: genTitulo.trim(),
      periodo: periodoLabel,
      desde,
      hasta,
      resumen: JSON.stringify(datos),
      generado: new Date().toISOString(),
      generadoPor: 'LemGil',
    });
    showToast('Reporte guardado');
    setModal(null);
    setTab('historial');
  };
  const delReporte = async () => {
    if (!delId) return;
    await db.reportes.delete(delId);
    showToast('Reporte eliminado');
    setModal(null);
  };

  const selReporte = viewId ? reportes.find((r) => r.id === viewId) : null;
  const selResumen = selReporte ? JSON.parse(selReporte.resumen) : null;

  return (
    <Layout title="Sistema de Reportes">
      <div className="page-reportes">
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--green)', letterSpacing: 1 }}>
            Sistema de Reportes
          </div>
          <div style={{ fontFamily: 'var(--font-reading)', color: 'var(--dim)', fontSize: 14, marginTop: 4, fontStyle: 'italic' }}>
            Semanales · Mensuales · KPI · Evaluaciones
          </div>
        </div>

        <div className="tabs">
          <button className={`tab ${tab === 'actual' ? 'active' : ''}`} onClick={() => setTab('actual')}>📊 Reporte Actual</button>
          <button className={`tab ${tab === 'historial' ? 'active' : ''}`} onClick={() => setTab('historial')}>📁 Historial ({reportes.length})</button>
        </div>

        {tab === 'actual' && (
          <>
            <div className="card" style={{ marginBottom: 18 }}>
              <div className="card-header" style={{ flexWrap: 'wrap', gap: 8 }}>
                <div className="card-title">📅 Período del Reporte</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button className={`btn btn-sm ${preset === 'mes' ? 'btn-gold' : 'btn-secondary'}`} onClick={() => applyPreset('mes')}>Este Mes</button>
                  <button className={`btn btn-sm ${preset === 'mesAnterior' ? 'btn-gold' : 'btn-secondary'}`} onClick={() => applyPreset('mesAnterior')}>Mes Anterior</button>
                  <button className={`btn btn-sm ${preset === 'anio' ? 'btn-gold' : 'btn-secondary'}`} onClick={() => applyPreset('anio')}>Este Año</button>
                  <button className={`btn btn-sm ${preset === 'todo' ? 'btn-gold' : 'btn-secondary'}`} onClick={() => applyPreset('todo')}>Todo</button>
                  <button className={`btn btn-sm ${preset === 'custom' ? 'btn-gold' : 'btn-secondary'}`} onClick={() => setPreset('custom')}>Personalizado</button>
                </div>
              </div>
              {preset === 'custom' && (
                <div className="form-row" style={{ marginTop: 12 }}>
                  <div className="form-group"><label className="form-label">Desde</label><input className="form-input" type="date" value={desde} onChange={(e) => setDesde(e.target.value)} /></div>
                  <div className="form-group"><label className="form-label">Hasta</label><input className="form-input" type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} /></div>
                </div>
              )}
              <div style={{ marginTop: 12, fontSize: 13, color: 'var(--dim)' }}>
                Período seleccionado: <strong style={{ color: 'var(--txt)' }}>{periodoLabel}</strong> ({fmt(desde)} → {fmt(hasta)})
              </div>
            </div>

            <div className="actions-row">
              <button className="btn btn-gold" onClick={openGen}>💾 Guardar Reporte</button>
              <button className="btn btn-secondary" onClick={() => window.print()}>🖨 Imprimir / PDF</button>
              <button className="btn btn-secondary" onClick={() => {
                const lines: string[] = [];
                lines.push(`REPORTE LEMGIL — ${periodoLabel}`);
                lines.push(`Período: ${fmt(desde)} → ${fmt(hasta)}`);
                lines.push(`Generado: ${new Date().toLocaleString('es-ES')}`);
                lines.push('');
                lines.push('MISION BIBLICA');
                lines.push(`Conversiones: ${datos.conv.total} (mes actual: ${datos.conv.mesActual})`);
                lines.push(`Integrados: ${datos.conv.integrados}`);
                lines.push(`Grupos: ${datos.conv.grupos}`);
                lines.push(`Evangelismos: ${datos.evang.total} (contactos: ${datos.evang.contactos}, conversiones: ${datos.evang.conversiones})`);
                lines.push('');
                lines.push('ACADEMIA');
                lines.push(`Cursos: ${datos.academia.cursos} (${datos.academia.cursosActivos} activos)`);
                lines.push(`Estudiantes activos: ${datos.academia.estudiantes}`);
                lines.push(`Certificados emitidos: ${datos.academia.certificados}`);
                lines.push('');
                lines.push('FINANZAS');
                lines.push('');
                lines.push('BIEN COMÚN (Dadores/Miembros):');
                lines.push(`  Diezmos: ${money(datos.finanzas.bienComunDiezmos)}`);
                lines.push(`  Ofrendas: ${money(datos.finanzas.bienComunOfrendas)}`);
                lines.push(`  Total Bien Común: ${money(datos.finanzas.bienComunTotal)}`);
                lines.push(`  Plan mensual: ${money(datos.finanzas.bienComunPlan)}`);
                lines.push('');
                lines.push('COLABORADORES (Externos):');
                lines.push(`  Ayuda: ${money(datos.finanzas.colaboradoresAyuda)}`);
                lines.push(`  Misiones: ${money(datos.finanzas.colaboradoresMisiones)}`);
                lines.push(`  Manos Abiertas: ${money(datos.finanzas.colaboradoresManosAbiertas)}`);
                lines.push(`  Total Colaboradores: ${money(datos.finanzas.colaboradoresTotal)}`);
                lines.push(`  Plan mensual: ${money(datos.finanzas.colaboradoresPlan)}`);
                lines.push('');
                lines.push(`TOTAL FINAL: ${money(datos.finanzas.totalFinal)}`);
                lines.push(`Plan mensual: ${money(datos.finanzas.bienComunPlan + datos.finanzas.colaboradoresPlan)}`);
                lines.push('');
                lines.push('MANOS ABIERTAS');
                lines.push(`Beneficiarios: ${datos.manos.beneficiarios}`);
                lines.push(`Campañas: ${datos.manos.campanas}`);
                lines.push(`Entregas: ${datos.manos.entregas}`);
                lines.push(`Familias impactadas: ${datos.manos.familias} (${datos.manos.personas} personas)`);
                lines.push('');
                lines.push('NEGOCIOS ADONAY');
                lines.push(`Proyectos activos: ${datos.negocios.activos}`);
                lines.push(`Emprendedores: ${datos.negocios.emprendedores}`);
                lines.push(`Ingresos mensuales: ${money(datos.negocios.ingresos)}`);
                lines.push('');
                lines.push('COMUNICACION');
                lines.push(`Publicaciones: ${datos.comunicacion.publicaciones}`);
                lines.push(`Alcance: ${num(datos.comunicacion.alcance)}`);
                lines.push(`Engagement: ${num(datos.comunicacion.engagement)}`);
                const csv = lines.join('\n');
                const b = new Blob([csv], { type: 'text/plain;charset=utf-8;' });
                const u = URL.createObjectURL(b);
                const a = document.createElement('a');
                a.href = u;
                a.download = `reporte-lemgil-${ymNow}.txt`;
                a.click();
                showToast('TXT exportado');
              }}>📥 Exportar TXT</button>
            </div>

            <div style={{ marginTop: 18, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
              <ModuleCard color="var(--mision-purple)" emoji="✝️" title="Misión Bíblica" rows={[
                ['Conversiones (período)', datos.conv.total],
                ['Mes actual', datos.conv.mesActual],
                ['Integrados', datos.conv.integrados],
                ['Grupos activos', datos.conv.grupos],
                ['Evangelismos', datos.evang.total],
                ['Contactos alcanzados', num(datos.evang.contactos)],
                ['Conversiones evangelísticas', datos.evang.conversiones],
              ]} />

              <ModuleCard color="var(--academia-teal)" emoji="🎓" title="Academia" rows={[
                ['Cursos totales', datos.academia.cursos],
                ['Cursos activos', datos.academia.cursosActivos],
                ['Estudiantes matriculados', datos.academia.estudiantes],
                ['Certificados emitidos', datos.academia.certificados],
              ]} />

              <ModuleCard color="var(--oro-apostolico)" emoji="💰" title="Finanzas" rows={[
                ['— BIEN COMÚN (Dadores/Miembros) —', ''],
                ['  Diezmos', money(datos.finanzas.bienComunDiezmos)],
                ['  Ofrendas', money(datos.finanzas.bienComunOfrendas)],
                ['  Total Bien Común', money(datos.finanzas.bienComunTotal)],
                ['  Plan mensual', money(datos.finanzas.bienComunPlan)],
                ['— COLABORADORES (Externos) —', ''],
                ['  Ayuda', money(datos.finanzas.colaboradoresAyuda)],
                ['  Misiones', money(datos.finanzas.colaboradoresMisiones)],
                ['  Manos Abiertas', money(datos.finanzas.colaboradoresManosAbiertas)],
                ['  Total Colaboradores', money(datos.finanzas.colaboradoresTotal)],
                ['  Plan mensual', money(datos.finanzas.colaboradoresPlan)],
                ['— TOTAL FINAL —', ''],
                ['  Total Final', money(datos.finanzas.totalFinal)],
                ['  Plan mensual', money(datos.finanzas.bienComunPlan + datos.finanzas.colaboradoresPlan)],
                ['  % de meta', `${datos.finanzas.bienComunPlan + datos.finanzas.colaboradoresPlan ? Math.round((datos.finanzas.totalFinal / (datos.finanzas.bienComunPlan + datos.finanzas.colaboradoresPlan)) * 100) : 0}%`],
              ]} />

              <ModuleCard color="var(--manos-terracota)" emoji="🤲" title="Manos Abiertas" rows={[
                ['Beneficiarios registrados', datos.manos.beneficiarios],
                ['Campañas (período)', datos.manos.campanas],
                ['Entregas (período)', datos.manos.entregas],
                ['Familias impactadas', datos.manos.familias],
                ['Personas alcanzadas', datos.manos.personas],
                ['Meta familias', metasDoc?.familias || 200],
                ['% de meta', `${Math.round((datos.manos.familias / (metasDoc?.familias || 200)) * 100)}%`],
              ]} />

              <ModuleCard color="var(--oro-luz)" emoji="💼" title="Negocios Adonay" rows={[
                ['Proyectos activos', datos.negocios.activos],
                ['Emprendedores únicos', datos.negocios.emprendedores],
                ['Ingresos mensuales', money(datos.negocios.ingresos)],
              ]} />

              <ModuleCard color="var(--mision-blue)" emoji="📡" title="Comunicación" rows={[
                ['Publicaciones', datos.comunicacion.publicaciones],
                ['Alcance total', num(datos.comunicacion.alcance)],
                ['Engagement total', num(datos.comunicacion.engagement)],
                ['Engagement rate', `${datos.comunicacion.alcance ? ((datos.comunicacion.engagement / datos.comunicacion.alcance) * 100).toFixed(1) : '0.0'}%`],
              ]} />
            </div>
          </>
        )}

        {tab === 'historial' && (
          <div className="card">
            <div className="card-header">
              <div className="card-title">📁 Reportes Guardados</div>
              <div style={{ fontSize: 12, color: 'var(--dim)' }}>{reportes.length} reportes</div>
            </div>
            {reportes.length === 0 ? (
              <EmptyState icon="📁" title="Sin reportes guardados" sub='Usa "💾 Guardar Reporte" en la pestaña Reporte Actual para crear el primero' />
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Título</th>
                    <th>Período</th>
                    <th>Rango</th>
                    <th>Generado</th>
                    <th>Por</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {reportes
                    .sort((a, b) => b.generado.localeCompare(a.generado))
                    .map((r) => (
                      <tr key={r.id}>
                        <td><strong>{r.titulo}</strong></td>
                        <td>{r.periodo}</td>
                        <td style={{ fontSize: 11, color: 'var(--dim)' }}>{fmt(r.desde)} → {fmt(r.hasta)}</td>
                        <td style={{ fontSize: 12 }}>{fmt(r.generado.slice(0, 10))}</td>
                        <td style={{ fontSize: 12 }}>{r.generadoPor}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 5 }}>
                            <button className="btn btn-secondary btn-sm" onClick={() => { setViewId(r.id); setModal('ver'); }}>👁 Ver</button>
                            <button className="btn btn-danger btn-sm" onClick={() => { setDelId(r.id); setModal('del'); }}>🗑️</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        <Modal
          open={modal === 'gen'}
          onClose={() => setModal(null)}
          title="💾 Guardar Reporte"
          footer={<><button className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button><button className="btn btn-gold" onClick={saveReporte}>💾 Guardar</button></>}
        >
          <div className="form-section">Datos del Reporte</div>
          <div className="form-group">
            <label className="form-label">Título *</label>
            <input className="form-input" value={genTitulo} onChange={(e) => setGenTitulo(e.target.value)} placeholder="Ej: Reporte Mensual Mayo 2026" />
          </div>
          <div className="form-group" style={{ marginTop: 12 }}>
            <label className="form-label">Período</label>
            <input className="form-input" value={periodoLabel} readOnly style={{ background: 'var(--surface-2)' }} />
          </div>
          <div className="form-group" style={{ marginTop: 12 }}>
            <label className="form-label">Rango de fechas</label>
            <input className="form-input" value={`${fmt(desde)} → ${fmt(hasta)}`} readOnly style={{ background: 'var(--surface-2)' }} />
          </div>
          <div style={{ marginTop: 14, padding: 12, background: 'var(--surface-2)', borderRadius: 8, fontSize: 12, color: 'var(--dim)' }}>
            💡 Se guardará una instantánea de los datos del período. Podrás consultarla en el Historial.
          </div>
        </Modal>

        <Modal
          open={modal === 'ver'}
          onClose={() => setModal(null)}
          title={`📄 ${selReporte?.titulo || ''}`}
          wide
          footer={<button className="btn btn-secondary" onClick={() => setModal(null)}>Cerrar</button>}
        >
          {selReporte && selResumen && (
            <>
              <div className="detail-row"><span className="detail-label">Período</span><span className="detail-value">{selReporte.periodo}</span></div>
              <div className="detail-row"><span className="detail-label">Rango</span><span className="detail-value">{fmt(selReporte.desde)} → {fmt(selReporte.hasta)}</span></div>
              <div className="detail-row"><span className="detail-label">Generado</span><span className="detail-value">{selReporte.generado.slice(0, 19).replace('T', ' ')}</span></div>
              <div className="detail-row"><span className="detail-label">Por</span><span className="detail-value">{selReporte.generadoPor}</span></div>

              <div className="form-section" style={{ marginTop: 14 }}>✝️ Misión Bíblica</div>
              <div className="detail-row"><span className="detail-label">Conversiones</span><span className="detail-value">{selResumen.conv.total} (mes actual: {selResumen.conv.mesActual})</span></div>
              <div className="detail-row"><span className="detail-label">Integrados</span><span className="detail-value">{selResumen.conv.integrados}</span></div>
              <div className="detail-row"><span className="detail-label">Grupos</span><span className="detail-value">{selResumen.conv.grupos}</span></div>
              <div className="detail-row"><span className="detail-label">Evangelismos</span><span className="detail-value">{selResumen.evang.total} ({num(selResumen.evang.contactos)} contactos)</span></div>

              <div className="form-section" style={{ marginTop: 14 }}>🎓 Academia</div>
              <div className="detail-row"><span className="detail-label">Cursos</span><span className="detail-value">{selResumen.academia.cursos} ({selResumen.academia.cursosActivos} activos)</span></div>
              <div className="detail-row"><span className="detail-label">Estudiantes</span><span className="detail-value">{selResumen.academia.estudiantes}</span></div>
              <div className="detail-row"><span className="detail-label">Certificados</span><span className="detail-value">{selResumen.academia.certificados}</span></div>

              <div className="form-section" style={{ marginTop: 14 }}>💰 Finanzas</div>
              <div className="detail-row"><span className="detail-label">Bien Común</span><span className="detail-value">{money(selResumen.finanzas.bienComunTotal)}</span></div>
              <div className="detail-row"><span className="detail-label">Colaboradores</span><span className="detail-value">{money(selResumen.finanzas.colaboradoresTotal)}</span></div>
              <div className="detail-row"><span className="detail-label">Total Final</span><span className="detail-value">{money(selResumen.finanzas.totalFinal)}</span></div>
              {selResumen.finanzas.bienComunPlan && (
                <div className="detail-row"><span className="detail-label">Plan mensual</span><span className="detail-value">{money(selResumen.finanzas.bienComunPlan + (selResumen.finanzas.colaboradoresPlan || 0))}</span></div>
              )}

              <div className="form-section" style={{ marginTop: 14 }}>🤲 Manos Abiertas</div>
              <div className="detail-row"><span className="detail-label">Beneficiarios</span><span className="detail-value">{selResumen.manos.beneficiarios}</span></div>
              <div className="detail-row"><span className="detail-label">Campañas</span><span className="detail-value">{selResumen.manos.campanas}</span></div>
              <div className="detail-row"><span className="detail-label">Entregas</span><span className="detail-value">{selResumen.manos.entregas}</span></div>
              <div className="detail-row"><span className="detail-label">Impacto</span><span className="detail-value">{selResumen.manos.familias} familias · {selResumen.manos.personas} personas</span></div>

              <div className="form-section" style={{ marginTop: 14 }}>💼 Negocios Adonay</div>
              <div className="detail-row"><span className="detail-label">Proyectos</span><span className="detail-value">{selResumen.negocios.activos} activos</span></div>
              <div className="detail-row"><span className="detail-label">Emprendedores</span><span className="detail-value">{selResumen.negocios.emprendedores}</span></div>
              <div className="detail-row"><span className="detail-label">Ingresos</span><span className="detail-value">{money(selResumen.negocios.ingresos)}</span></div>

              <div className="form-section" style={{ marginTop: 14 }}>📡 Comunicación</div>
              <div className="detail-row"><span className="detail-label">Publicaciones</span><span className="detail-value">{selResumen.comunicacion.publicaciones}</span></div>
              <div className="detail-row"><span className="detail-label">Alcance</span><span className="detail-value">{num(selResumen.comunicacion.alcance)}</span></div>
              <div className="detail-row"><span className="detail-label">Engagement</span><span className="detail-value">{num(selResumen.comunicacion.engagement)}</span></div>
            </>
          )}
        </Modal>

        <Modal
          open={modal === 'del'}
          onClose={() => setModal(null)}
          title="⚠️ Eliminar Reporte"
          footer={<><button className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button><button className="btn btn-danger" onClick={delReporte}>Sí, Eliminar</button></>}
        >
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 44, marginBottom: 10 }}>🗑️</div>
            <p style={{ color: 'var(--dim)', fontSize: 14, lineHeight: 1.6 }}>¿Eliminar este reporte guardado?<br />Esta acción no se puede deshacer.</p>
          </div>
        </Modal>

        {toast && <div className="toast-container"><div className="toast success">{toast}</div></div>}
      </div>
    </Layout>
  );
}

function ModuleCard({ color, emoji, title, rows }: { color: string; emoji: string; title: string; rows: [string, string | number][] }) {
  return (
    <div className="card" style={{ borderLeft: `3px solid ${color}` }}>
      <div className="card-header">
        <div className="card-title" style={{ color, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 18 }}>{emoji}</span>
          {title}
        </div>
      </div>
      <div>
        {rows.map(([k, v], i) => {
          if (v === '' && k.startsWith('—')) {
            return (
              <div key={i} style={{ padding: '10px 0 4px', fontSize: 11, fontWeight: 700, color: 'var(--dim)', letterSpacing: 0.5, borderBottom: '1px solid var(--border)' }}>
                {k}
              </div>
            );
          }
          return (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: i < rows.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <span style={{ fontSize: 12, color: 'var(--dim)' }}>{k}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--txt)' }}>{v}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
