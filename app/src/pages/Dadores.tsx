import { useState, useMemo } from 'react';
import { v4 as uuid } from 'uuid';
import { useLiveQuery } from 'dexie-react-hooks';
import { exportCSV } from '../lib/csvExport';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Layout } from '../components/Layout';
import { KpiCard } from '../components/KpiCard';
import { Modal } from '../components/Modal';
import { EmptyState } from '../components/EmptyState';
import { db } from '../lib/database';
import type { Colaborador, Aporte } from '../lib/types';
import { CsvImportButton } from '../components/CsvImportButton';

import { today, fmt, money, MS_SHORT, accentStyle } from '../lib/utils';

const EST_BADGE: Record<string, string> = { Activo: 'badge-green', Pausado: 'badge-yellow', Inactivo: 'badge-red' };
const TIPO_BADGE: Record<string, string> = { Persona: 'badge-blue', Empresa: 'badge-purple', Iglesia: 'badge-yellow' };
const APORTE_BADGE: Record<string, string> = { Diezmo: 'badge-purple', Ofrenda: 'badge-blue', 'Misión': 'badge-green', Construcción: 'badge-yellow', 'Manos Abiertas': 'badge-red', Otro: 'badge-blue' };
const METODO_BADGE: Record<string, string> = { Efectivo: 'badge-green', Transferencia: 'badge-blue', Cheque: 'badge-yellow', Tarjeta: 'badge-purple', Otro: 'badge-blue' };

const exportDadoresPDF = (dadores: Colaborador[], aportes: Aporte[]) => {
  const doc = new jsPDF();
  doc.setFontSize(18);
  doc.text('Red de Colaboradores', 14, 20);
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(`Generado: ${new Date().toLocaleDateString('es-ES')} · Total: ${dadores.length} colaboradores`, 14, 28);

  const rows = dadores.map((d) => {
    const total = aportes.filter((a) => a.colaboradorId === d.id).reduce((s, a) => s + (a.monto || 0), 0);
    const mes = aportes.filter((a) => a.colaboradorId === d.id && a.fecha?.startsWith(new Date().toISOString().slice(0, 7))).reduce((s, a) => s + (a.monto || 0), 0);
    const plan = d.planOfrendaMonto > 0 ? `$${d.planOfrendaMonto}/mes` : '—';
    return [`${d.nombre} ${d.apellido}`, d.tipo, d.telefono || '—', d.estado, plan, `$${total.toLocaleString()}`, `$${mes.toLocaleString()}`];
  });

  autoTable(doc, {
    startY: 34,
    head: [['Nombre', 'Tipo', 'Teléfono', 'Estado', 'Plan', 'Total Aportado', 'Este Mes']],
    body: rows,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [212, 168, 67] },
  });

  const apRows = aportes
    .filter((a) => a.fecha?.startsWith(new Date().toISOString().slice(0, 7)))
    .sort((a, b) => b.fecha.localeCompare(a.fecha))
    .slice(0, 50)
    .map((a) => {
      const d = dadores.find((x) => x.id === a.colaboradorId);
      return [a.fecha, d ? `${d.nombre} ${d.apellido}` : '—', a.tipo, a.metodo, `$${a.monto.toLocaleString()}`, a.referencia || ''];
    });

  const lastY = doc.lastAutoTable?.finalY || 34;
  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.text('Aportes del Mes', 14, lastY + 14);

  autoTable(doc, {
    startY: lastY + 18,
    head: [['Fecha', 'Colaborador', 'Tipo', 'Método', 'Monto', 'Referencia']],
    body: apRows,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [212, 168, 67] },
  });

  doc.save('lemgil-colaboradores.pdf');
};

type Tab = 'diezmadores' | 'aportes' | 'resumen';
type SubTab = 'general' | 'mensual' | 'top' | 'metas' | 'cumplimiento';
type ModalType = 'dador' | 'aporte' | 'detail' | 'delDador' | 'delAporte';

export default function Dadores() {
  const dadores = useLiveQuery(() => db.colaboradores.toArray(), []) ?? [];
  const aportes = useLiveQuery(() => db.aportes.toArray(), []) ?? [];
  const tiposPlanes = useLiveQuery(() => db.tiposPlanes.filter(t => t.activo).toArray(), []) ?? [];

  const [tab, setTab] = useState<Tab>('diezmadores');
  const [subTab, setSubTab] = useState<SubTab>('general');
  const [anioResumen, setAnioResumen] = useState(new Date().getFullYear().toString());
  const [search, setSearch] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [filterTipo, setFilterTipo] = useState('');
  const [filterPlan, setFilterPlan] = useState('');
  const [filterTipoAporte, setFilterTipoAporte] = useState('');
  const [filterMetodo, setFilterMetodo] = useState('');
  const [filterMes, setFilterMes] = useState('');
  const [filterAnio, setFilterAnio] = useState(new Date().getFullYear().toString());
  const [modal, setModal] = useState<null | ModalType>(null);
  const [editDadorId, setEditDadorId] = useState<string | null>(null);
  const [editAporteId, setEditAporteId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [toast, setToast] = useState('');

  const [dNombre, setDNombre] = useState('');
  const [dApellido, setDApellido] = useState('');
  const [dTel, setDTel] = useState('');
  const [dEmail, setDEmail] = useState('');
  const [dTipo, setDTipo] = useState('Persona');
  const [dEstado, setDEstado] = useState('Activo');
  const [dNotas, setDNotas] = useState('');

  const [planTipoId, setPlanTipoId] = useState('');
  const [planMonto, setPlanMonto] = useState('');

  const [aDador, setADador] = useState('');
  const [aFecha, setAFecha] = useState(today());
  const [aMonto, setAMonto] = useState('');
  const [aTipo, setATipo] = useState('Diezmo');
  const [aMetodo, setAMetodo] = useState('Efectivo');
  const [aNotas, setANotas] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3200);
  };

  const resetDador = () => {
    setEditDadorId(null);
    setDNombre('');
    setDApellido('');
    setDTel('');
    setDEmail('');
    setDTipo('Persona');
    setDEstado('Activo');
    setDNotas('');
    setPlanTipoId('');
    setPlanMonto('');
  };
  const resetAporte = () => {
    setEditAporteId(null);
    setADador('');
    setAFecha(today());
    setAMonto('');
    setATipo('Diezmo');
    setAMetodo('Efectivo');
    setANotas('');
  };

  const mo = new Date().toISOString().slice(0, 7);
  const kpis = useMemo(() => {
    const activos = dadores.filter((d) => d.estado === 'Activo').length;
    const planMeta = dadores.filter((d) => d.estado === 'Activo').reduce((s, d) => s + (d.planOfrendaMonto || 0), 0);
    const anioActual = new Date().getFullYear().toString();
    const aportesAnio = aportes.filter((a) => a.fecha?.startsWith(anioActual));
    const yearTotal = aportesAnio.reduce((s, a) => s + (a.monto || 0), 0);
    const tiposUnicos = [...new Set(aportesAnio.map((a) => a.tipo).filter(Boolean))];
    const porTipo = tiposUnicos.map((tipo) => ({
      tipo,
      total: aportesAnio.filter((a) => a.tipo === tipo).reduce((s, a) => s + (a.monto || 0), 0),
    }));
    const planAnual = planMeta * 12;
    return { activos, planMeta, planAnual, yearTotal, porTipo };
  }, [dadores, aportes]);

  const dadoresFiltrados = useMemo(() => {
    const s = search.toLowerCase();
    return dadores.filter((d) => {
      const full = `${d.nombre} ${d.apellido} ${d.telefono} ${d.email}`.toLowerCase();
      return (!s || full.includes(s))
        && (!filterEstado || d.estado === filterEstado)
        && (!filterTipo || d.tipo === filterTipo)
        && (!filterPlan || (filterPlan === 'con' ? (d.planOfrendaMonto || 0) > 0 : !(d.planOfrendaMonto || 0)));
    });
  }, [dadores, search, filterEstado, filterTipo, filterPlan]);

  const aportesFiltrados = useMemo(() => {
    const s = search.toLowerCase();
    return aportes
      .filter((a) => {
        const dador = dadores.find((d) => d.id === a.colaboradorId);
        const dadorName = dador ? `${dador.nombre} ${dador.apellido}`.toLowerCase() : '';
        return (!s || dadorName.includes(s) || a.referencia?.toLowerCase().includes(s) || a.notas?.toLowerCase().includes(s))
          && (!filterTipoAporte || a.tipo === filterTipoAporte)
          && (!filterMetodo || a.metodo === filterMetodo)
          && (!filterMes || a.fecha?.startsWith(`${filterAnio}-${filterMes}`))
          && (!filterAnio || a.fecha?.startsWith(filterAnio));
      })
      .sort((a, b) => b.fecha.localeCompare(a.fecha));
  }, [aportes, dadores, search, filterTipoAporte, filterMetodo, filterMes, filterAnio]);

  const selDador = dadores.find((d) => d.id === selectedId);
  const selAportes = selDador ? aportes.filter((a) => a.colaboradorId === selDador.id).sort((a, b) => b.fecha.localeCompare(a.fecha)) : [];
  const selTotal = selAportes.reduce((s, a) => s + (a.monto || 0), 0);

  const resumenAnual = useMemo(() => {
    const regsAnio = aportes.filter(a => a.fecha.startsWith(anioResumen));
    const total = regsAnio.reduce((s, a) => s + (a.monto || 0), 0);
    const porTipo = [...new Set(regsAnio.map(a => a.tipo).filter(Boolean))].map(tipo => ({
      tipo,
      total: regsAnio.filter(a => a.tipo === tipo).reduce((s, a) => s + (a.monto || 0), 0),
    }));
    return { total, porTipo };
  }, [aportes, anioResumen]);

  const resumenCompleto = useMemo(() => {
    const regsAnio = aportes.filter(a => a.fecha.startsWith(anioResumen));
    const mesesData = MS_SHORT.map((m, i) => {
      const mesIdx = (i + 1).toString().padStart(2, '0');
      const regsMes = regsAnio.filter(a => a.fecha.startsWith(`${anioResumen}-${mesIdx}`));
      const totMes = regsMes.reduce((s, a) => s + (a.monto || 0), 0);
      const porTipoMes = [...new Set(regsMes.map(a => a.tipo).filter(Boolean))].map(tipo => ({
        tipo,
        total: regsMes.filter(a => a.tipo === tipo).reduce((s, a) => s + (a.monto || 0), 0),
      }));
      return { mes: m, total: totMes, porTipo: porTipoMes };
    });
    const mesesConActividad = mesesData.filter(m => m.total > 0);
    const mejorMes = mesesConActividad.length ? mesesConActividad.reduce((a, b) => b.total > a.total ? b : a) : null;
    const promedioMensual = mesesConActividad.length > 0 ? mesesConActividad.reduce((s, m) => s + m.total, 0) / mesesConActividad.length : 0;
    const totalAportes = regsAnio.length;
    const activosAnio = [...new Set(regsAnio.map(a => a.colaboradorId).filter(Boolean))].length;
    const topDadores = dadores.map(d => {
      const regs = regsAnio.filter(a => a.colaboradorId === d.id);
      const total = regs.reduce((s, a) => s + (a.monto || 0), 0);
      return { id: d.id, nombre: d.nombre, apellido: d.apellido, total, regs: regs.length };
    }).filter(d => d.total > 0).sort((a, b) => b.total - a.total).slice(0, 5);
    const variacionTotal = (() => {
      const prev = aportes.filter(a => a.fecha.startsWith((parseInt(anioResumen) - 1).toString())).reduce((s, a) => s + (a.monto || 0), 0);
      if (prev === 0) return null;
      return ((resumenAnual.total - prev) / prev) * 100;
    })();
    return { mesesData, mejorMes, promedioMensual, totalAportes, activosAnio, topDadores, variacionTotal };
  }, [aportes, anioResumen, dadores, resumenAnual]);

  const cumplimiento = useMemo(() => {
    const regsAnio = aportes.filter(a => a.fecha.startsWith(anioResumen));
    const planMeta = dadores.filter(d => d.estado === 'Activo').reduce((s, d) => s + (d.planOfrendaMonto || 0), 0);
    const metaGlobalAnual = planMeta * 12;
    const metaGlobalMes = planMeta;
    const totalRecAnio = regsAnio.reduce((s, a) => s + (a.monto || 0), 0);
    const pctGlobal = metaGlobalAnual > 0 ? (totalRecAnio / metaGlobalAnual) * 100 : 0;
    const mesActualNum = new Date().getMonth() + 1;
    const metaAcumuladaEsperada = metaGlobalAnual > 0 ? (metaGlobalMes * mesActualNum) : 0;
    const cumplimientoDadores = dadores.map(d => {
      const regs = regsAnio.filter(a => a.colaboradorId === d.id);
      const total = regs.reduce((s, a) => s + (a.monto || 0), 0);
      const plan = d.planOfrendaMonto || 0;
      const metaAnual = plan * 12;
      const pct = metaAnual > 0 ? (total / metaAnual) * 100 : null;
      return { id: d.id, nombre: d.nombre, apellido: d.apellido, tipo: d.tipo || '—', plan, metaAnual, total, regs: regs.length, pct };
    }).sort((a, b) => (b.pct ?? -1) - (a.pct ?? -1));
    const periodos = MS_SHORT.map((m, i) => {
      const mesIdx = (i + 1).toString().padStart(2, '0');
      const regsMes = regsAnio.filter(a => a.fecha.startsWith(`${anioResumen}-${mesIdx}`));
      const total = regsMes.reduce((s, a) => s + (a.monto || 0), 0);
      const metaEsperada = metaGlobalMes;
      const pct = metaEsperada > 0 ? (total / metaEsperada) * 100 : null;
      return { etiqueta: m, tipo: 'mes' as const, total, metaEsperada, pct, idx: i };
    });
    return { metaGlobalAnual, metaGlobalMes, totalRecAnio, pctGlobal, metaAcumuladaEsperada, cumplimientoDadores, periodos };
  }, [aportes, anioResumen, dadores]);

  const openNewDador = () => {
    resetDador();
    setModal('dador');
  };
  const openEditDador = (id: string) => {
    const d = dadores.find((x) => x.id === id);
    if (!d) return;
    setEditDadorId(id);
    setDNombre(d.nombre);
    setDApellido(d.apellido);
    setDTel(d.telefono);
    setDEmail(d.email);
    setDTipo(d.tipo);
    setDEstado(d.estado);
    setPlanTipoId(d.planOfrendaTipo || '');
    setPlanMonto(d.planOfrendaMonto?.toString() || '');
    setDNotas(d.notas);
    setModal('dador');
  };
  const saveDador = async () => {
    if (!dNombre.trim() || !dApellido.trim()) return showToast('Nombre y apellido son obligatorios');
    const data = { nombre: dNombre.trim(), apellido: dApellido.trim(), telefono: dTel.trim(), email: dEmail.trim(), tipo: dTipo as Colaborador['tipo'], estado: dEstado as Colaborador['estado'], planOfrendaTipo: planTipoId, planOfrendaMonto: parseFloat(planMonto) || 0, notas: dNotas.trim() };
    if (editDadorId) {
      await db.colaboradores.update(editDadorId, data);
      showToast(`Colaborador "${dNombre} ${dApellido}" actualizado`);
    } else {
      const newId = uuid();
      await db.colaboradores.add({ id: newId, creado: new Date().toISOString(), ...data });
      showToast(`Colaborador "${dNombre} ${dApellido}" registrado`);
    }
    resetDador();
    setModal(null);
  };
  const delDador = async () => {
    if (!selectedId) return;
    const d = dadores.find((x) => x.id === selectedId);
    await db.colaboradores.delete(selectedId);
    showToast(`Colaborador "${d?.nombre} ${d?.apellido}" eliminado`);
    setModal(null);
  };

  const openNewAporte = () => {
    resetAporte();
    setModal('aporte');
  };
  const openEditAporte = (id: string) => {
    const a = aportes.find((x) => x.id === id);
    if (!a) return;
    setEditAporteId(id);
    setADador(a.colaboradorId);
    setAFecha(a.fecha);
    setAMonto(String(a.monto));
    setATipo(a.tipo);
    setAMetodo(a.metodo);
    setANotas(a.notas);
    setModal('aporte');
  };
  const saveAporte = async () => {
    if (!aDador) return showToast('Selecciona un colaborador');
    if (!aFecha) return showToast('La fecha es obligatoria');
    const monto = parseFloat(aMonto) || 0;
    if (monto <= 0) return showToast('El monto debe ser mayor a 0');
    const data = { colaboradorId: aDador, fecha: aFecha, monto, tipo: aTipo as Aporte['tipo'], metodo: aMetodo as Aporte['metodo'], referencia: '', notas: aNotas.trim() };
    if (editAporteId) {
      await db.aportes.update(editAporteId, data);
      showToast('Aporte actualizado');
    } else {
      await db.aportes.add({ id: uuid(), creado: new Date().toISOString(), ...data });
      showToast(`Aporte de ${money(monto)} registrado`);
    }
    resetAporte();
    setModal(null);
  };
  const delAporte = async () => {
    if (!selectedId) return;
    const a = aportes.find((x) => x.id === selectedId);
    await db.aportes.delete(selectedId);
    showToast(`Aporte de ${money(a?.monto || 0)} eliminado`);
    setModal(null);
  };
  const openDetail = (id: string) => {
    setSelectedId(id);
    setModal('detail');
  };

  return (
    <Layout title="Diezmadores (Bien Común)">
      <div className="page-dadores">
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--oro-luz)', letterSpacing: 1 }}>
            Red de Colaboradores
          </div>
          <div style={{ fontFamily: 'var(--font-reading)', color: 'var(--dim)', fontSize: 14, marginTop: 4, fontStyle: 'italic' }}>
            Aportes · Historial · Impacto · Sostenimiento
          </div>
        </div>

        <div className="kpis">
          <KpiCard label="Total Recaudado" value={money(kpis.yearTotal)} icon="💰" accent="var(--gold)" sub={`Plan anual: ${money(kpis.planAnual)}`} />
          {kpis.porTipo.map((t) => (
            <KpiCard key={t.tipo} label={t.tipo} value={money(t.total)} icon="📊" accent="var(--blue)" />
          ))}
          <KpiCard label="Colaboradores Activos" value={kpis.activos} icon="🤝" accent="var(--green)" sub={`${dadores.length} totales`} />
        </div>

        <div className="tabs">
          <button className={`tab ${tab === 'diezmadores' ? 'active' : ''}`} onClick={() => { setTab('diezmadores'); setSearch(''); setFilterEstado(''); setFilterTipo(''); setFilterPlan(''); }}>
            🙏 Diezmadores ({dadores.length})
          </button>
          <button className={`tab ${tab === 'aportes' ? 'active' : ''}`} onClick={() => { setTab('aportes'); setSearch(''); setFilterTipoAporte(''); setFilterMetodo(''); setFilterMes(''); setFilterAnio(new Date().getFullYear().toString()); }}>
            💰 Aportes ({aportes.length})
          </button>
          <button className={`tab ${tab === 'resumen' ? 'active' : ''}`} onClick={() => setTab('resumen')}>
            📊 RESUMEN
          </button>
        </div>

        <div className="actions-row">
          {tab === 'diezmadores' && <button className="btn btn-gold" onClick={openNewDador}>➕ Nuevo Colaborador</button>}
          {tab === 'diezmadores' && (
            <button className="btn btn-secondary" onClick={() => {
              if (!dadores.length) return showToast('No hay colaboradores para exportar');
              exportDadoresPDF(dadores, aportes);
              showToast('PDF exportado');
            }}>📄 Exportar PDF</button>
          )}
          {tab === 'diezmadores' && (
            <>
            <button className="btn btn-secondary" onClick={() => {
              if (!dadores.length) return showToast('No hay colaboradores para exportar');
              const h = ['#', 'Nombre', 'Apellido', 'Tipo', 'Teléfono', 'Email', 'Estado', 'Plan', 'Compromiso', 'Total Aportado', 'Aportes Mes'];
              const r = dadores.map((d, i) => {
                const total = aportes.filter((a) => a.colaboradorId === d.id).reduce((s, a) => s + (a.monto || 0), 0);
                const mes = aportes.filter((a) => a.colaboradorId === d.id && a.fecha?.startsWith(mo)).reduce((s, a) => s + (a.monto || 0), 0);
                const planNombre = tiposPlanes.find(t => t.id === d.planOfrendaTipo)?.nombre || '';
                return [i + 1, d.nombre, d.apellido, d.tipo, d.telefono || '', d.email || '', d.estado, planNombre, d.planOfrendaMonto || 0, total, mes];
              });
              exportCSV(h, r, 'lemgil-colaboradores.csv');
              showToast('CSV exportado');
            }}>📥 Exportar CSV</button>
            <CsvImportButton<Colaborador>
              table="colaboradores"
              fieldMapping={{
                'Nombre': 'nombre',
                'Apellido': 'apellido',
                'Teléfono': 'telefono',
                'Email': 'email',
                'Estado': 'estado',
                'Tipo': 'tipo',
                'Plan Tipo': 'planOfrendaTipo',
                'Plan Monto': 'planOfrendaMonto',
                'Notas': 'notas',
              }}
              requiredFields={['nombre', 'apellido']}
              defaults={{ estado: 'Activo', tipo: 'Persona', planOfrendaMonto: 0 }}
              onImport={(n) => showToast(`${n} colaborador(es) importado(s)`)}
            />
            </>
          )}
          {tab === 'aportes' && <button className="btn btn-gold" onClick={openNewAporte}>💰 Registrar Aporte</button>}
          {tab === 'aportes' && (
            <>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  if (!aportes.length) return showToast('No hay aportes para exportar');
                  const doc = new jsPDF();
                  doc.setFontSize(18);
                  doc.text('Historial de Aportes', 14, 20);
                  doc.setFontSize(10);
                  doc.setTextColor(120);
                  doc.text(`Generado: ${new Date().toLocaleDateString('es-ES')} · Total: ${aportes.length} aportes · ${money(aportes.reduce((s, a) => s + a.monto, 0))}`, 14, 28);
                  const rows = aportes.map((a) => {
                    const d = dadores.find((x) => x.id === a.colaboradorId);
                    return [a.fecha, d ? `${d.nombre} ${d.apellido}` : '—', a.tipo, a.metodo, `$${a.monto.toLocaleString()}`, a.referencia || ''];
                  });
                  autoTable(doc, { startY: 34, head: [['Fecha', 'Colaborador', 'Tipo', 'Método', 'Monto', 'Referencia']], body: rows, styles: { fontSize: 9 }, headStyles: { fillColor: [212, 168, 67] } });
                  doc.save('lemgil-aportes.pdf');
                  showToast('PDF exportado');
                }}
              >
                📄 Exportar PDF
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  if (!aportes.length) return showToast('No hay aportes para exportar');
                  const h = ['Fecha', 'Colaborador', 'Tipo', 'Método', 'Monto', 'Referencia', 'Notas'];
                  const r = aportes.map((a) => {
                    const d = dadores.find((x) => x.id === a.colaboradorId);
                    return [a.fecha, d ? `${d.nombre} ${d.apellido}` : '—', a.tipo, a.metodo, a.monto, a.referencia || '', (a.notas || '').replace(/,/g, ';')];
                  });
                  exportCSV(h, r, 'lemgil-aportes.csv');
                  showToast('CSV exportado');
                }}
              >
                📥 Exportar CSV
              </button>
              <CsvImportButton<Aporte>
                table="aportes"
                fieldMapping={{
                  'Fecha': 'fecha',
                  'Colaborador': 'colaboradorId',
                  'Tipo': 'tipo',
                  'Método': 'metodo',
                  'Monto': 'monto',
                  'Referencia': 'referencia',
                  'Notas': 'notas',
                }}
                requiredFields={['fecha', 'monto']}
                defaults={{ fecha: () => new Date().toISOString().split('T')[0], tipo: 'Ofrenda', metodo: 'Efectivo' }}
                onImport={(n) => showToast(`${n} aporte(s) importado(s)`)}
              />
            </>
          )}
        </div>

        {tab === 'diezmadores' && (
          <>
            <div className="search-bar">
              <input className="search-input" placeholder="🔍 Buscar nombre, teléfono, email…" value={search} onChange={(e) => setSearch(e.target.value)} />
              <select className="filter-select" value={filterEstado} onChange={(e) => setFilterEstado(e.target.value)}>
                <option value="">Todos los estados</option>
                <option>Activo</option>
                <option>Pausado</option>
                <option>Inactivo</option>
              </select>
              <select className="filter-select" value={filterTipo} onChange={(e) => setFilterTipo(e.target.value)}>
                <option value="">Todos los tipos</option>
                <option>Persona</option>
                <option>Empresa</option>
                <option>Iglesia</option>
              </select>
              <select className="filter-select" value={filterPlan} onChange={(e) => setFilterPlan(e.target.value)}>
                <option value="">Todos los planes</option>
                <option value="con">Con plan</option>
                <option value="sin">Sin plan</option>
              </select>
            </div>

            <div className="card">
              <div className="card-header">
                <div className="card-title">🤝 Registro de Colaboradores</div>
                <div style={{ fontSize: 12, color: 'var(--dim)' }}>{dadoresFiltrados.length} registros</div>
              </div>
              {dadoresFiltrados.length === 0 ? (
                <EmptyState icon="🤝" title={dadores.length ? 'Sin resultados' : 'Sin colaboradores aún'} sub={dadores.length ? 'Prueba otros filtros' : 'Registra el primer colaborador'} />
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Nombre</th>
                      <th>Tipo</th>
                      <th>Contacto</th>
                      <th>Aportes</th>
                      <th>Total</th>
                      <th>Compromiso</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dadoresFiltrados.map((d, i) => {
                      const dAportes = aportes.filter((a) => a.colaboradorId === d.id);
                      const total = dAportes.reduce((s, a) => s + (a.monto || 0), 0);
                      return (
                        <tr key={d.id}>
                          <td style={{ color: 'var(--dim)' }}>{i + 1}</td>
                          <td>
                            <strong>{d.nombre} {d.apellido}</strong>
                            {d.email && (<><br /><span style={{ fontSize: 10, color: 'var(--dim)' }}>{d.email}</span></>)}
                          </td>
                          <td><span className={`badge ${TIPO_BADGE[d.tipo] || 'badge-blue'}`}>{d.tipo}</span></td>
                          <td style={{ fontSize: 12 }}>{d.telefono || '—'}</td>
                          <td style={{ textAlign: 'center', fontWeight: 700 }}>{dAportes.length}</td>
                          <td style={{ fontWeight: 700, color: 'var(--oro-apostolico)' }}>{money(total)}</td>
                          <td style={{ fontWeight: 700, color: 'var(--oro-luz)' }}>{d.planOfrendaMonto ? money(d.planOfrendaMonto) : '—'}</td>
                          <td><span className={`badge ${EST_BADGE[d.estado] || 'badge-blue'}`}>{d.estado}</span></td>
                          <td>
                            <div style={{ display: 'flex', gap: 5 }}>
                              <button className="btn btn-secondary btn-sm" onClick={() => openDetail(d.id)}>👁 Ver</button>
                              <button className="btn btn-secondary btn-sm" onClick={() => openEditDador(d.id)}>✏️</button>
                              <button className="btn btn-danger btn-sm" onClick={() => { setSelectedId(d.id); setModal('delDador'); }}>🗑️</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {tab === 'aportes' && (
          <>
            <div className="search-bar">
              <input className="search-input" placeholder="🔍 Buscar colaborador, referencia, notas…" value={search} onChange={(e) => setSearch(e.target.value)} />
              <select className="filter-select" value={filterAnio} onChange={(e) => setFilterAnio(e.target.value)}>
                <option value="">Todos los años</option>
                {[...new Set(aportes.map(a => a.fecha?.slice(0, 4)).filter(Boolean))].sort().reverse().map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <select className="filter-select" value={filterMes} onChange={(e) => setFilterMes(e.target.value)}>
                <option value="">Todos los meses</option>
                {['01','02','03','04','05','06','07','08','09','10','11','12'].map((m, i) => <option key={m} value={m}>{['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][i]}</option>)}
              </select>
              <select className="filter-select" value={filterTipoAporte} onChange={(e) => setFilterTipoAporte(e.target.value)}>
                <option value="">Todos los tipos</option>
                <option>Diezmo</option>
                {tiposPlanes.map((t) => <option key={t.id} value={t.nombre}>{t.nombre}</option>)}
                <option>Otro</option>
              </select>
              <select className="filter-select" value={filterMetodo} onChange={(e) => setFilterMetodo(e.target.value)}>
                <option value="">Todos los métodos</option>
                <option>Efectivo</option>
                <option>Transferencia</option>
                <option>Cheque</option>
                <option>Tarjeta</option>
                <option>Otro</option>
              </select>
            </div>

            <div className="card">
              <div className="card-header">
                <div className="card-title">💰 Historial de Aportes</div>
                <div style={{ fontSize: 12, color: 'var(--dim)' }}>{money(aportesFiltrados.reduce((s, a) => s + a.monto, 0))} · {aportesFiltrados.length} aportes</div>
              </div>
              {aportesFiltrados.length === 0 ? (
                <EmptyState icon="💰" title={aportes.length ? 'Sin resultados' : 'Sin aportes aún'} sub={aportes.length ? 'Prueba otros filtros' : 'Registra el primer aporte'} />
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Colaborador</th>
                      <th>Tipo</th>
                      <th>Método</th>
                      <th style={{ textAlign: 'right' }}>Monto</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {aportesFiltrados.map((a) => {
                      const d = dadores.find((x) => x.id === a.colaboradorId);
                      return (
                        <tr key={a.id}>
                          <td>{fmt(a.fecha)}</td>
                          <td><strong>{d ? `${d.nombre} ${d.apellido}` : '—'}</strong></td>
                          <td><span className={`badge ${APORTE_BADGE[a.tipo] || 'badge-blue'}`}>{a.tipo}</span></td>
                          <td><span className={`badge ${METODO_BADGE[a.metodo] || 'badge-blue'}`}>{a.metodo}</span></td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--oro-apostolico)' }}>{money(a.monto)}</td>
                          <td>
                            <div style={{ display: 'flex', gap: 5 }}>
                              <button className="btn btn-secondary btn-sm" onClick={() => openEditAporte(a.id)}>✏️</button>
                              <button className="btn btn-danger btn-sm" onClick={() => { setSelectedId(a.id); setModal('delAporte'); }}>🗑️</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {tab === 'resumen' && (
          <div className="page-content">
            <div className="actions-row" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px'}}>
              <div style={{display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap'}}>
                <span style={{fontSize: '18px', fontWeight: 700}}>📅 Año:</span>
                <select className="filter-select" value={anioResumen} onChange={e => setAnioResumen(e.target.value)} style={{fontWeight: 600}}>
                  {[...new Set(aportes.map(a => a.fecha.slice(0, 4)))].sort().reverse().map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div style={{padding: '8px 16px', background: 'var(--gold-glow)', borderRadius: '12px', border: '1px solid var(--gold)', fontSize: '14px', fontWeight: 700, color: 'var(--gold)', display: 'flex', alignItems: 'center', gap: '8px'}}>
                <span style={{fontSize: '18px'}}>💰</span> Total Anual: {money(resumenAnual.total)}
              </div>
            </div>

            <div className="tabs" style={{marginBottom: '20px', flexWrap: 'wrap'}}>
              {[{k: 'general', l: '📈 GENERAL'}, {k: 'mensual', l: '📊 MENSUAL'}, {k: 'top', l: '🏅 TOP'}, {k: 'metas', l: '🎯 METAS'}, {k: 'cumplimiento', l: '✅ CUMPLIMIENTO'}].map(s => (
                <button key={s.k} className={`tab ${subTab === s.k ? 'active' : ''}`} onClick={() => setSubTab(s.k as SubTab)}>{s.l}</button>
              ))}
            </div>

            {subTab === 'general' && (
              <>
                <div className="kpis" style={{marginBottom: '24px'}}>
                  <div className="kpi" style={accentStyle('var(--gold)')}>
                    <div className="kpi-label">Total Recaudado</div>
                    <div className="kpi-value">{money(resumenAnual.total)}</div>
                    {resumenCompleto.variacionTotal !== null && (
                      <div style={{fontSize: '12px', fontWeight: 700, marginTop: '4px', color: resumenCompleto.variacionTotal >= 0 ? 'var(--green)' : 'var(--red)'}}>
                        {resumenCompleto.variacionTotal >= 0 ? '↗' : '↘'} {Math.abs(resumenCompleto.variacionTotal).toFixed(1)}% vs {parseInt(anioResumen) - 1}
                      </div>
                    )}
                    <div className="kpi-icon">💰</div>
                  </div>
                  {resumenAnual.porTipo.map(t => (
                    <div key={t.tipo} className="kpi" style={accentStyle('var(--blue)')}>
                      <div className="kpi-label">{t.tipo}</div>
                      <div className="kpi-value">{money(t.total)}</div>
                      <div className="kpi-icon">📊</div>
                    </div>
                  ))}
                  <div className="kpi" style={accentStyle('var(--green)')}>
                    <div className="kpi-label">Colaboradores Activos</div>
                    <div className="kpi-value">{resumenCompleto.activosAnio}</div>
                    <div style={{fontSize: '12px', fontWeight: 600, marginTop: '4px', color: 'var(--dim)'}}>de {dadores.length} registrados</div>
                    <div className="kpi-icon">👥</div>
                  </div>
                </div>

                <div className="card">
                  <div className="card-header">
                    <h3 className="card-title">📈 Estadísticas Destacadas</h3>
                  </div>
                  <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px'}}>
                    <div style={{padding: '16px', background: 'var(--bg-input)', borderRadius: '12px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '12px'}}>
                      <div style={{width: '44px', height: '44px', borderRadius: '12px', background: 'var(--gold-glow)', border: '1px solid var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px'}}>🏆</div>
                      <div>
                        <div style={{fontSize: '11px', color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600}}>Mejor Mes</div>
                        <div style={{fontSize: '16px', fontWeight: 800, color: 'var(--gold)'}}>{resumenCompleto.mejorMes ? resumenCompleto.mejorMes.mes : '—'}</div>
                        {resumenCompleto.mejorMes && <div style={{fontSize: '12px', color: 'var(--dim)'}}>{money(resumenCompleto.mejorMes.total)}</div>}
                      </div>
                    </div>
                    <div style={{padding: '16px', background: 'var(--bg-input)', borderRadius: '12px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '12px'}}>
                      <div style={{width: '44px', height: '44px', borderRadius: '12px', background: 'var(--bg-input)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px'}}>📊</div>
                      <div>
                        <div style={{fontSize: '11px', color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600}}>Promedio Mensual</div>
                        <div style={{fontSize: '16px', fontWeight: 800, color: 'var(--green)'}}>{money(resumenCompleto.promedioMensual)}</div>
                        <div style={{fontSize: '12px', color: 'var(--dim)'}}>con actividad</div>
                      </div>
                    </div>
                    <div style={{padding: '16px', background: 'var(--bg-input)', borderRadius: '12px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '12px'}}>
                      <div style={{width: '44px', height: '44px', borderRadius: '12px', background: 'var(--bg-input)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px'}}>📋</div>
                      <div>
                        <div style={{fontSize: '11px', color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600}}>Total Aportes</div>
                        <div style={{fontSize: '16px', fontWeight: 800, color: 'var(--blue)'}}>{resumenCompleto.totalAportes}</div>
                        <div style={{fontSize: '12px', color: 'var(--dim)'}}>registros del año</div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {subTab === 'mensual' && (
              <>
                <div className="card" style={{marginBottom: '24px'}}>
                  <div className="card-header">
                    <h3 className="card-title">📊 Recaudación Mensual Visual</h3>
                  </div>
                  <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                    {resumenCompleto.mesesData.map((m, i) => {
                      const isCurrent = i === new Date().getMonth() && parseInt(anioResumen) === new Date().getFullYear();
                      return (
                        <div key={m.mes} style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                          <div style={{width: '40px', fontSize: '12px', fontWeight: 700, color: isCurrent ? 'var(--gold)' : 'var(--dim)', textTransform: 'uppercase'}}>{m.mes}</div>
                          <div style={{flex: 1, height: '32px', background: 'var(--bg-input)', borderRadius: '8px', overflow: 'hidden', position: 'relative', border: isCurrent ? '1px solid var(--gold)' : '1px solid var(--border)'}}>
                            {m.total > 0 && (
                              <div style={{position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', background: 'var(--green)', display: 'flex', alignItems: 'center', paddingLeft: '8px', fontSize: '10px', fontWeight: 700, color: 'white', transition: 'width 0.5s'}}></div>
                            )}
                          </div>
                          <div style={{width: '90px', textAlign: 'right', fontSize: '13px', fontWeight: 700, color: m.total > 0 ? 'var(--gold)' : 'var(--dim)'}}>{money(m.total)}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="card">
                  <div className="card-header">
                    <h3 className="card-title">📅 Detalle Mensual de Recaudación</h3>
                  </div>
                  <table className="data-table">
                    <thead>
                      <tr style={{background: 'var(--bg-input)'}}>
                        <th style={{textAlign: 'left'}}>MES</th>
                        {resumenAnual.porTipo.map(t => (
                          <th key={t.tipo} style={{textAlign: 'right'}}>{t.tipo.toUpperCase()}</th>
                        ))}
                        <th style={{textAlign: 'right', color: 'var(--gold)'}}>TOTAL</th>
                        <th style={{textAlign: 'center'}}>%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resumenCompleto.mesesData.map((m, i) => {
                        const isCurrent = i === new Date().getMonth() && parseInt(anioResumen) === new Date().getFullYear();
                        const pctAnual = resumenAnual.total > 0 ? (m.total / resumenAnual.total) * 100 : 0;
                        return (
                          <tr key={m.mes} style={{background: isCurrent ? 'var(--gold-glow)' : (m.total > 0 ? 'var(--bg-input)' : 'transparent'), transition: 'background 0.2s', borderLeft: isCurrent ? '3px solid var(--gold)' : 'none'}}>
                            <td style={{fontWeight: 600}}>{m.mes} {isCurrent && '⭐'}</td>
                            {resumenAnual.porTipo.map(t => {
                              const val = m.porTipo.find(p => p.tipo === t.tipo)?.total || 0;
                              return <td key={t.tipo} style={{textAlign: 'right', color: val > 0 ? 'var(--green)' : 'var(--dim)'}}>{money(val)}</td>;
                            })}
                            <td style={{textAlign: 'right', fontWeight: 700, color: m.total > 0 ? 'var(--gold)' : 'var(--dim)'}}>{money(m.total)}</td>
                            <td style={{textAlign: 'center', color: 'var(--dim)', fontSize: '12px'}}>{pctAnual > 0 ? `${pctAnual.toFixed(1)}%` : '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr style={{background: 'var(--bg-input)', fontWeight: 800, fontSize: '15px'}}>
                        <td>TOTAL ANUAL</td>
                        {resumenAnual.porTipo.map(t => (
                          <td key={t.tipo} style={{textAlign: 'right', color: 'var(--green)'}}>{money(t.total)}</td>
                        ))}
                        <td style={{textAlign: 'right', color: 'var(--gold)'}}>{money(resumenAnual.total)}</td>
                        <td style={{textAlign: 'center', color: 'var(--gold)'}}>100%</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </>
            )}

            {subTab === 'top' && (
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">🏅 Top 5 Colaboradores del Año</h3>
                </div>
                {resumenCompleto.topDadores.length > 0 ? (
                  <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                    {resumenCompleto.topDadores.map((d, i) => {
                      const medals = ['🥇', '🥈', '🥉'];
                      const color = ['var(--gold)', 'var(--blue)', 'var(--purple)'];
                      const pct = resumenCompleto.topDadores[0].total > 0 ? (d.total / resumenCompleto.topDadores[0].total) * 100 : 0;
                      return (
                        <div key={d.id} style={{display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', background: 'var(--bg-input)', borderRadius: '10px', border: '1px solid var(--border)'}}>
                          <div style={{width: '36px', height: '36px', borderRadius: '50%', background: i < 3 ? 'var(--gold-glow)' : 'var(--bg)', border: `2px solid ${i < 3 ? color[i] : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 800, color: i < 3 ? color[i] : 'var(--dim)'}}>
                            {i < 3 ? medals[i] : (i + 1)}
                          </div>
                          <div style={{flex: 1, minWidth: 0}}>
                            <div style={{fontWeight: 700, fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{d.nombre} {d.apellido}</div>
                            <div style={{fontSize: '11px', color: 'var(--dim)'}}>{d.regs} aportes</div>
                            <div style={{height: '4px', background: 'var(--border)', borderRadius: '2px', overflow: 'hidden', marginTop: '4px'}}>
                              <div style={{height: '100%', width: `${pct}%`, background: i === 0 ? 'var(--gold)' : i === 1 ? 'var(--blue)' : 'var(--purple)', transition: 'width 0.5s'}}></div>
                            </div>
                          </div>
                          <div style={{fontWeight: 800, color: 'var(--gold)', fontSize: '14px', whiteSpace: 'nowrap'}}>{money(d.total)}</div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{textAlign: 'center', padding: '30px', color: 'var(--dim)'}}>No hay aportes este año</div>
                )}
              </div>
            )}

            {subTab === 'metas' && (
              <>
                <div className="card" style={{marginBottom: '24px'}}>
                  <div className="card-header">
                    <h3 className="card-title">🎯 Resumen del Plan Propuesto</h3>
                  </div>
                  <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px'}}>
                    <div style={{padding: '16px', background: 'var(--bg-input)', borderRadius: '12px', border: '1px solid var(--border)', textAlign: 'center'}}>
                      <div style={{fontSize: '12px', color: 'var(--dim)', marginBottom: '6px', textTransform: 'uppercase', fontWeight: 600}}>Meta Mensual Global</div>
                      <div style={{fontSize: '20px', fontWeight: 800, color: 'var(--blue)'}}>{money(cumplimiento.metaGlobalMes)}</div>
                      <div style={{fontSize: '11px', color: 'var(--dim)', marginTop: '4px'}}>{dadores.filter(d => (d.planOfrendaMonto || 0) > 0).length} colaboradores</div>
                    </div>
                    <div style={{padding: '16px', background: 'var(--gold-glow)', borderRadius: '12px', border: '1px solid var(--gold)', textAlign: 'center'}}>
                      <div style={{fontSize: '12px', color: 'var(--gold)', marginBottom: '6px', textTransform: 'uppercase', fontWeight: 700}}>Meta Anual Global</div>
                      <div style={{fontSize: '20px', fontWeight: 800, color: 'var(--gold)'}}>{money(cumplimiento.metaGlobalAnual)}</div>
                      <div style={{fontSize: '11px', color: 'var(--gold)', marginTop: '4px'}}>Plan total del año</div>
                    </div>
                    <div style={{padding: '16px', background: 'var(--bg-input)', borderRadius: '12px', border: '1px solid var(--border)', textAlign: 'center'}}>
                      <div style={{fontSize: '12px', color: 'var(--dim)', marginBottom: '6px', textTransform: 'uppercase', fontWeight: 600}}>Recaudado a la Fecha</div>
                      <div style={{fontSize: '20px', fontWeight: 800, color: 'var(--green)'}}>{money(cumplimiento.totalRecAnio)}</div>
                      <div style={{fontSize: '11px', color: 'var(--dim)', marginTop: '4px'}}>de {cumplimiento.metaGlobalAnual > 0 ? money(cumplimiento.metaGlobalAnual) : 'sin meta'}</div>
                    </div>
                    <div style={{padding: '16px', background: cumplimiento.pctGlobal >= 100 ? 'var(--gold-glow)' : 'var(--bg-input)', borderRadius: '12px', border: `1px solid ${cumplimiento.pctGlobal >= 100 ? 'var(--gold)' : 'var(--border)'}`, textAlign: 'center'}}>
                      <div style={{fontSize: '12px', color: 'var(--dim)', marginBottom: '6px', textTransform: 'uppercase', fontWeight: 600}}>% Cumplimiento</div>
                      <div style={{fontSize: '20px', fontWeight: 800, color: cumplimiento.pctGlobal >= 100 ? 'var(--gold)' : cumplimiento.pctGlobal >= 70 ? 'var(--green)' : 'var(--red)'}}>{cumplimiento.metaGlobalAnual > 0 ? `${cumplimiento.pctGlobal.toFixed(1)}%` : '—'}</div>
                      <div style={{fontSize: '11px', color: 'var(--dim)', marginTop: '4px'}}>vs meta anual</div>
                    </div>
                  </div>
                </div>

                <div className="card">
                  <div className="card-header">
                    <h3 className="card-title">👥 Plan de Ofrendas por Colaborador</h3>
                  </div>
                  <table className="data-table">
                    <thead>
                      <tr style={{background: 'var(--bg-input)'}}>
                        <th style={{textAlign: 'left'}}>COLABORADOR</th>
                        <th style={{textAlign: 'left'}}>TIPO</th>
                        <th style={{textAlign: 'right'}}>PLAN MENSUAL</th>
                        <th style={{textAlign: 'right'}}>PLAN ANUAL</th>
                        <th style={{textAlign: 'right'}}>RECAUDADO</th>
                        <th style={{textAlign: 'center'}}>% CUMPLIMIENTO</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cumplimiento.cumplimientoDadores.filter(c => c.plan > 0).map(c => (
                        <tr key={c.id}>
                          <td style={{fontWeight: 600}}>{c.nombre} {c.apellido}</td>
                          <td><span className={`badge ${TIPO_BADGE[c.tipo] || 'badge-blue'}`}>{c.tipo}</span></td>
                          <td style={{textAlign: 'right'}}>{money(c.plan)}</td>
                          <td style={{textAlign: 'right'}}>{money(c.metaAnual)}</td>
                          <td style={{textAlign: 'right', fontWeight: 700, color: c.total >= c.metaAnual ? 'var(--green)' : 'var(--dim)'}}>{money(c.total)}</td>
                          <td style={{textAlign: 'center'}}>
                            {c.pct !== null ? (
                              <span style={{fontWeight: 700, color: c.pct >= 100 ? 'var(--green)' : c.pct >= 70 ? 'var(--gold)' : 'var(--red)'}}>{Math.round(c.pct)}%</span>
                            ) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {subTab === 'cumplimiento' && (
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">✅ Cumplimiento Mensual vs Plan</h3>
                </div>
                <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                  {cumplimiento.periodos.map((p) => {
                    const isCurrent = p.idx === new Date().getMonth() && parseInt(anioResumen) === new Date().getFullYear();
                    const pctBar = p.pct !== null ? Math.min(p.pct, 100) : 0;
                    return (
                      <div key={p.etiqueta} style={{display: 'flex', alignItems: 'center', gap: '12px', padding: '8px', background: isCurrent ? 'var(--gold-glow)' : 'transparent', borderRadius: '8px', border: isCurrent ? '1px solid var(--gold)' : '1px solid transparent'}}>
                        <div style={{width: '40px', fontSize: '12px', fontWeight: 700, color: isCurrent ? 'var(--gold)' : 'var(--dim)', textTransform: 'uppercase'}}>{p.etiqueta}</div>
                        <div style={{flex: 1, height: '24px', background: 'var(--bg-input)', borderRadius: '6px', overflow: 'hidden', position: 'relative'}}>
                          <div style={{position: 'absolute', left: 0, top: 0, width: `${pctBar}%`, height: '100%', background: p.pct !== null && p.pct >= 100 ? 'var(--green)' : p.pct !== null && p.pct >= 70 ? 'var(--gold)' : 'var(--red)', transition: 'width 0.5s'}}></div>
                          <div style={{position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', fontSize: '11px', fontWeight: 700, color: 'var(--dim)'}}>{money(p.total)} / {money(p.metaEsperada)}</div>
                        </div>
                        <div style={{width: '50px', textAlign: 'right', fontSize: '12px', fontWeight: 700, color: p.pct !== null && p.pct >= 100 ? 'var(--green)' : p.pct !== null && p.pct >= 70 ? 'var(--gold)' : 'var(--red)'}}>
                          {p.pct !== null ? `${Math.round(p.pct)}%` : '—'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

         <Modal
           open={modal === 'dador'}
           onClose={() => setModal(null)}
           title={editDadorId ? '✏️ Editar Colaborador' : '🤝 Nuevo Colaborador'}
           footer={
             <>
               {editDadorId && <button className="btn btn-danger btn-sm" style={{ marginRight: 'auto' }} onClick={() => setModal('delDador')}>🗑️ Eliminar</button>}
               <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
               <button className="btn btn-gold" onClick={saveDador}>💾 {editDadorId ? 'Guardar Cambios' : 'Registrar Colaborador'}</button>
             </>
           }
         >
           <>
             <div className="form-section">Datos del Colaborador</div>
             <div className="form-row">
               <div className="form-group"><label className="form-label">Nombre *</label><input className="form-input" value={dNombre} onChange={(e) => setDNombre(e.target.value)} placeholder="Nombre" /></div>
               <div className="form-group"><label className="form-label">Apellido *</label><input className="form-input" value={dApellido} onChange={(e) => setDApellido(e.target.value)} placeholder="Apellido" /></div>
               <div className="form-group"><label className="form-label">Teléfono</label><input className="form-input" value={dTel} onChange={(e) => setDTel(e.target.value)} placeholder="+1 555 000 0000" /></div>
               <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" value={dEmail} onChange={(e) => setDEmail(e.target.value)} placeholder="correo@ejemplo.com" /></div>
               <div className="form-group"><label className="form-label">Tipo</label><select className="form-select" value={dTipo} onChange={(e) => setDTipo(e.target.value)}><option>Persona</option><option>Empresa</option><option>Iglesia</option></select></div>
               <div className="form-group"><label className="form-label">Estado</label><select className="form-select" value={dEstado} onChange={(e) => setDEstado(e.target.value)}><option>Activo</option><option>Pausado</option><option>Inactivo</option></select></div>
             </div>
             <div className="form-group" style={{ marginTop: 12 }}><label className="form-label">Notas</label><textarea className="form-textarea" value={dNotas} onChange={(e) => setDNotas(e.target.value)} placeholder="Información adicional, observaciones…" style={{ minHeight: 55 }} /></div>
             {tiposPlanes.length > 0 && (
                 <div style={{ marginTop: 14, padding: '12px', background: 'var(--bg-input)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                     <div className="form-section" style={{ marginTop: 0, marginBottom: 10 }}>📋 Plan de Ofrenda</div>
                     <div className="form-row">
                         <div className="form-group"><label className="form-label">Tipo de Ofrenda</label><select className="form-select" value={planTipoId} onChange={e => setPlanTipoId(e.target.value)}><option value="">Sin plan</option>{tiposPlanes.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}</select></div>
                         <div className="form-group"><label className="form-label">Monto Mensual ($)</label><input className="form-input" type="number" value={planMonto} onChange={e => setPlanMonto(e.target.value)} min="0" disabled={!planTipoId} placeholder={planTipoId ? 'Ej: 100' : 'Selecciona tipo primero'} /></div>
                     </div>
                 </div>
             )}

           </>
         </Modal>

        <Modal
          open={modal === 'aporte'}
          onClose={() => setModal(null)}
          title={editAporteId ? '✏️ Editar Aporte' : '💰 Registrar Aporte'}
          footer={
            <>
              {editAporteId && <button className="btn btn-danger btn-sm" style={{ marginRight: 'auto' }} onClick={() => setModal('delAporte')}>🗑️ Eliminar</button>}
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
              <button className="btn btn-gold" onClick={saveAporte}>💾 {editAporteId ? 'Guardar Cambios' : 'Registrar Aporte'}</button>
            </>
          }
        >
          <div className="form-section">Datos del Aporte</div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Colaborador *</label><select className="form-select" value={aDador} onChange={(e) => setADador(e.target.value)}><option value="">Seleccionar colaborador…</option>{dadores.map((d) => <option key={d.id} value={d.id}>{d.nombre} {d.apellido}</option>)}</select></div>
            <div className="form-group"><label className="form-label">Fecha *</label><input className="form-input" type="date" value={aFecha} onChange={(e) => setAFecha(e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Monto *</label><input className="form-input" type="number" value={aMonto} onChange={(e) => setAMonto(e.target.value)} placeholder="0.00" min="0" step="0.01" /></div>
            <div className="form-group"><label className="form-label">Tipo de Aporte</label><select className="form-select" value={aTipo} onChange={(e) => setATipo(e.target.value)}><option>Diezmo</option>{tiposPlanes.map((t) => <option key={t.id} value={t.nombre}>{t.nombre}</option>)}<option>Otro</option></select></div>
            <div className="form-group"><label className="form-label">Método de Pago</label><select className="form-select" value={aMetodo} onChange={(e) => setAMetodo(e.target.value)}><option>Efectivo</option><option>Transferencia</option><option>Cheque</option><option>Tarjeta</option><option>Otro</option></select></div>
          </div>
          <div className="form-group" style={{ marginTop: 12 }}><label className="form-label">Notas</label><textarea className="form-textarea" value={aNotas} onChange={(e) => setANotas(e.target.value)} placeholder="Detalles adicionales…" style={{ minHeight: 55 }} /></div>
        </Modal>

        <Modal
          open={modal === 'detail'}
          onClose={() => setModal(null)}
          title={`🤝 ${selDador?.nombre} ${selDador?.apellido}`}
          wide
          footer={<button className="btn btn-secondary" onClick={() => setModal(null)}>Cerrar</button>}
        >
          {selDador && (
            <>
              <div className="detail-row"><span className="detail-label">Tipo</span><span className="detail-value"><span className={`badge ${TIPO_BADGE[selDador.tipo]}`}>{selDador.tipo}</span></span></div>
              <div className="detail-row"><span className="detail-label">Estado</span><span className="detail-value"><span className={`badge ${EST_BADGE[selDador.estado]}`}>{selDador.estado}</span></span></div>
              <div className="detail-row"><span className="detail-label">Teléfono</span><span className="detail-value">{selDador.telefono || 'No registrado'}</span></div>
              <div className="detail-row"><span className="detail-label">Email</span><span className="detail-value">{selDador.email || 'No registrado'}</span></div>
              <div className="detail-row"><span className="detail-label">Registrado</span><span className="detail-value">{fmt(selDador.creado.slice(0, 10))}</span></div>
              {selDador.notas && <div className="detail-row"><span className="detail-label">Notas</span><span className="detail-value" style={{ fontSize: 12, color: 'var(--dim)' }}>{selDador.notas}</span></div>}

              <div className="form-section" style={{ marginTop: 14 }}>📋 Plan de Ofrenda</div>
              <div className="grid-3" style={{ marginBottom: 14 }}>
                <div style={{ padding: 12, background: 'var(--surface-2)', borderRadius: 8, textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: 'var(--dim)', marginBottom: 4 }}>TIPO</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--txt)' }}>{tiposPlanes.find(t => t.id === selDador.planOfrendaTipo)?.nombre || 'Sin plan'}</div>
                </div>
                <div style={{ padding: 12, background: 'var(--surface-2)', borderRadius: 8, textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: 'var(--dim)', marginBottom: 4 }}>COMPROMISO MENSUAL</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--oro-luz)' }}>{money(selDador.planOfrendaMonto || 0)}</div>
                </div>
                <div style={{ padding: 12, background: 'var(--surface-2)', borderRadius: 8, textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: 'var(--dim)', marginBottom: 4 }}>CUMPLIMIENTO MES</div>
                  {(() => {
                    const mesAportes = selAportes.filter(a => a.fecha?.startsWith(mo)).reduce((s, a) => s + a.monto, 0);
                    const plan = selDador.planOfrendaMonto || 0;
                    const pct = plan > 0 ? Math.round((mesAportes / plan) * 100) : 0;
                    return <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: pct >= 100 ? 'var(--green)' : 'var(--txt)' }}>{pct}%</div>;
                  })()}
                </div>
              </div>

              <div className="form-section">Resumen Financiero</div>
              <div className="grid-3" style={{ marginBottom: 14 }}>
                <div style={{ padding: 12, background: 'var(--surface-2)', borderRadius: 8, textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: 'var(--dim)', marginBottom: 4 }}>APORTES TOTALES</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--oro-apostolico)' }}>{money(selTotal)}</div>
                </div>
                <div style={{ padding: 12, background: 'var(--surface-2)', borderRadius: 8, textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: 'var(--dim)', marginBottom: 4 }}>CANTIDAD</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700 }}>{selAportes.length}</div>
                </div>
                <div style={{ padding: 12, background: 'var(--surface-2)', borderRadius: 8, textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: 'var(--dim)', marginBottom: 4 }}>PROMEDIO</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--green)' }}>{selAportes.length ? money(selTotal / selAportes.length) : '$0'}</div>
                </div>
              </div>

              <div className="form-section">Historial de Aportes</div>
              {selAportes.length === 0 ? (
                <div style={{ color: 'var(--dim)', fontSize: 13, padding: '10px 0' }}>Sin aportes registrados</div>
              ) : (
                selAportes.map((a) => (
                  <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: 'var(--surface-2)', borderRadius: 8, marginBottom: 6 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 700 }}>{fmt(a.fecha)} · <span className={`badge ${APORTE_BADGE[a.tipo] || 'badge-blue'}`} style={{ fontSize: 9 }}>{a.tipo}</span></div>
                      <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 2 }}>{a.metodo}{a.referencia && ` · ${a.referencia}`}</div>
                    </div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: 'var(--oro-apostolico)' }}>{money(a.monto)}</div>
                  </div>
                ))
              )}
            </>
          )}
        </Modal>

        <Modal
          open={modal === 'delDador'}
          onClose={() => setModal(null)}
          title="⚠️ Eliminar Colaborador"
          footer={<><button className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button><button className="btn btn-danger" onClick={delDador}>Sí, Eliminar</button></>}
        >
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 44, marginBottom: 10 }}>🗑️</div>
            <p style={{ color: 'var(--dim)', fontSize: 14, lineHeight: 1.6 }}>
              ¿Eliminar a <strong style={{ color: 'var(--txt)' }}>{selDador?.nombre} {selDador?.apellido}</strong>?
              {selAportes.length > 0 && (<><br />Tiene <strong style={{ color: 'var(--txt)' }}>{selAportes.length} aporte(s)</strong> registrado(s) que también se verán afectados.</>)}
              <br />Esta acción no se puede deshacer.
            </p>
          </div>
        </Modal>

        <Modal
          open={modal === 'delAporte'}
          onClose={() => setModal(null)}
          title="⚠️ Eliminar Aporte"
          footer={<><button className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button><button className="btn btn-danger" onClick={delAporte}>Sí, Eliminar</button></>}
        >
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 44, marginBottom: 10 }}>🗑️</div>
            <p style={{ color: 'var(--dim)', fontSize: 14, lineHeight: 1.6 }}>¿Eliminar este aporte?<br />Esta acción no se puede deshacer.</p>
          </div>
        </Modal>

        {toast && <div className="toast-container"><div className="toast success">{toast}</div></div>}
      </div>
    </Layout>
  );
}
