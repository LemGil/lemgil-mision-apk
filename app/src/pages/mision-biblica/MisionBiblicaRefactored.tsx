/**
 * Página principal de Misión Bíblica - Versión refactorizada
 * 
 * Gestiona tres dominios:
 * - Conversiones (CRUD + pipeline de estados + historial)
 * - Grupos de discipulado (gestión de capacidad, mentores, métricas)
 * - Evangelismo (registro de actividades, contactos, conversiones generadas)
 */

import { useState } from 'react';
import { Layout } from '../../components/Layout';
import { KpiCard } from '../../components/KpiCard';
import { Modal } from '../../components/Modal';
import { EmptyState } from '../../components/EmptyState';
import { ZonaSelect } from '../../components/ZonaSelect';
import { Toast } from '../../components/Toast';
import { useToast } from '../../hooks/useToast';
import {
  exportConversionesPDF,
  exportGruposMisionPDF,
  exportEvangelismoPDF,
} from '../../lib/pdfExport';

// Hooks personalizados
import { useConversiones } from './hooks/useConversiones';
import { useGrupos } from './hooks/useGrupos';
import { useEvangelismo } from './hooks/useEvangelismo';

// Utils
import { fmt } from './utils/conversionSync';
import {
  ESTADOS,
  EST_BADGE,
  ESTADOS_COLOR,
  ESTADOS_EMOJI,
  TIPO_BADGE,
  updateSteps,
  esEstadoFinal,
  getNextEstado,
} from './utils/statePipeline';

// Tipos
import type { DataTab, ModalType } from '../types/mision';

export default function MisionBiblica() {
  // Hooks de datos
  const convHook = useConversiones();
  const gruposHook = useGrupos();
  const evangHook = useEvangelismo();

  // Estado UI global
  const [dataTab, setDataTab] = useState<DataTab>('conv');
  const [modal, setModal] = useState<null | ModalType>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Estado para modal de detalle
  const [tempEst, setTempEst] = useState<string | null>(null);
  const [sNota, setSNota] = useState('');
  const [sHito, setSHito] = useState(false);

  // Toast
  const { toast, showToast, clearToast } = useToast();

  // ── CONVERSIONES ──
  const handleOpenNewConv = () => {
    convHook.resetForm();
    setModal('conv');
  };

  const handleEditConv = (id: string) => {
    convHook.openEditConv(id);
    setModal('conv');
  };

  const handleSaveConv = async () => {
    const result = await convHook.saveConv();
    if (result.success) {
      showToast(result.message);
      convHook.resetForm();
      setModal(null);
    } else {
      showToast(result.message);
    }
  };

  const handleDeleteConv = async () => {
    if (!selectedId) return;
    await convHook.delConv(selectedId);
    showToast('Registro eliminado');
    setModal(null);
  };

  const handleQuickAdv = async (id: string) => {
    const result = await convHook.quickAdv(id);
    if (result.success) {
      showToast(result.message);
    } else {
      showToast(result.message);
    }
  };

  const handleOpenDetail = (id: string) => {
    setSelectedId(id);
    setTempEst(null);
    setSNota('');
    setSHito(false);
    setModal('detail');
  };

  const handleSaveSeguimiento = async () => {
    const selConv = convHook.convs.find(c => c.id === selectedId);
    if (!selConv) return;

    const nuevoEstado = (tempEst || selConv.estado) as typeof selConv.estado;
    const result = await convHook.updateEstado(
      selConv.id,
      nuevoEstado,
      sNota,
      sHito && selConv.estado === 'Integrado'
    );

    if (result.success) {
      showToast(result.message);
      setModal(null);
    } else {
      showToast(result.message);
    }
  };

  // ── GRUPOS ──
  const handleOpenNewGrupo = () => {
    gruposHook.resetGrupo();
    setModal('grupo');
  };

  const handleEditGrupo = (id: string) => {
    gruposHook.openEditGrupo(id);
    setModal('grupo');
  };

  const handleSaveGrupo = async () => {
    const result = await gruposHook.saveGrupo();
    if (result.success) {
      showToast(result.message);
      gruposHook.resetGrupo();
      setModal(null);
    } else {
      showToast(result.message);
    }
  };

  const handleDeleteGrupo = async () => {
    if (!selectedId) return;
    await gruposHook.delGrupo(selectedId);
    showToast('Grupo eliminado');
    setModal(null);
  };

  // ── EVANGELISMO ──
  const handleOpenNewEvang = () => {
    evangHook.resetEvang();
    setModal('evang');
  };

  const handleEditEvang = (id: string) => {
    evangHook.openEditEvang(id);
    setModal('evang');
  };

  const handleSaveEvang = async () => {
    const result = await evangHook.saveEvang();
    if (result.success) {
      showToast(result.message);
      evangHook.resetEvang();
      setModal(null);
    } else {
      showToast(result.message);
    }
  };

  const handleDeleteEvang = async () => {
    if (!selectedId) return;
    await evangHook.delEvang(selectedId);
    showToast('Actividad eliminada');
    setModal(null);
  };

  const handleAddParticipante = () => {
    const nombre = evangHook.ePartCustom.trim();
    if (nombre) {
      evangHook.addParticipante(nombre);
      evangHook.setEPartCustom('');
    }
  };

  // ── EXPORTAR ──
  const handleExportConvCSV = () => {
    if (!convHook.convs.length) {
      showToast('No hay datos para exportar');
      return;
    }
    const h = ['Nombre', 'Apellido', 'Telefono', 'Edad', 'Zona', 'Mayor', 'Fecha', 'Estado', 'Notas'];
    const r = convHook.convs.map(c => [
      c.nombre,
      c.apellido,
      c.telefono || '',
      c.edad || '',
      c.zona,
      c.lider,
      c.fecha,
      c.estado,
      (c.notas || '').replace(/,/g, ';'),
    ]);
    const csv = [h, ...r].map(x => x.join(',')).join('\n');
    const b = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const u = URL.createObjectURL(b);
    const a = document.createElement('a');
    a.href = u;
    a.download = 'lemgil-conversiones.csv';
    a.click();
    showToast('CSV exportado');
  };

  const handleExportGruposCSV = () => {
    if (!gruposHook.grupos.length) {
      showToast('No hay grupos para exportar');
      return;
    }
    const h = ['Nombre', 'Zona', 'Líder', 'Día', 'Hora', 'Capacidad', 'Lugar'];
    const r = gruposHook.grupos.map(g => [
      g.nombre,
      g.zona || '',
      g.lider || '',
      g.dia || '',
      g.hora || '',
      g.capacidad || '',
      g.lugar || '',
    ]);
    const csv = [h, ...r].map(x => x.join(',')).join('\n');
    const b = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const u = URL.createObjectURL(b);
    const a = document.createElement('a');
    a.href = u;
    a.download = 'lemgil-grupos-mision.csv';
    a.click();
    showToast('CSV exportado');
  };

  const handleExportEvangCSV = () => {
    if (!evangHook.evangels.length) {
      showToast('No hay actividades para exportar');
      return;
    }
    const h = ['Fecha', 'Tipo', 'Zona', 'Líder', 'Contactos', 'Conversiones', 'Notas'];
    const r = evangHook.evangels.map(e => [
      e.fecha,
      e.tipo,
      e.zona || '',
      e.lider || '',
      e.contactos || 0,
      e.conversiones || 0,
      (e.notas || '').replace(/,/g, ';'),
    ]);
    const csv = [h, ...r].map(x => x.join(',')).join('\n');
    const b = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const u = URL.createObjectURL(b);
    const a = document.createElement('a');
    a.href = u;
    a.download = 'lemgil-evangelismo.csv';
    a.click();
    showToast('CSV exportado');
  };

  const selConv = convHook.convs.find(c => c.id === selectedId);

  const tabLabel = (tab: DataTab) => {
    if (tab === 'conv') return `✝️ Conversiones (${convHook.convs.length})`;
    if (tab === 'grupo') return `👥 Grupos (${gruposHook.grupos.length})`;
    return `📋 Evangelismo (${evangHook.evangels.length})`;
  };

  return (
    <Layout title="Misión Bíblica">
      <div className="page-mision">
        {/* KPIS */}
        <div className="kpis">
          <KpiCard
            label="Conversiones 2026"
            value={convHook.metrics.total}
            icon="✝️"
            accent="var(--mision-purple)"
            sub={`este mes: ${convHook.metrics.esteMes}`}
          />
          <KpiCard
            label="En Discipulado"
            value={convHook.metrics.discipulado}
            icon="📖"
            accent="var(--oro-apostolico)"
            sub="seguimiento activo"
          />
          <KpiCard
            label="Bautizados"
            value={convHook.metrics.bautizados}
            icon="💧"
            accent="var(--mision-blue)"
            sub="confirmados"
          />
          <KpiCard
            label="Integrados"
            value={convHook.metrics.integrados}
            icon="🏘️"
            accent="var(--oro-luz)"
            sub="al ministerio"
          />
          {convHook.metrics.apartados > 0 && (
            <KpiCard
              label="Apartados"
              value={convHook.metrics.apartados}
              icon="🚪"
              accent="var(--red, #ef4444)"
              sub="se apartaron"
            />
          )}
          {convHook.metrics.fallecidos > 0 && (
            <KpiCard
              label="Fallecidos"
              value={convHook.metrics.fallecidos}
              icon="✝️"
              accent="var(--dim)"
              sub="en memoria"
            />
          )}
        </div>

        {/* TABS */}
        <div className="tabs">
          <button
            className={`tab ${dataTab === 'conv' ? 'active' : ''}`}
            onClick={() => setDataTab('conv')}
          >
            {tabLabel('conv')}
          </button>
          <button
            className={`tab ${dataTab === 'grupo' ? 'active' : ''}`}
            onClick={() => setDataTab('grupo')}
          >
            {tabLabel('grupo')}
          </button>
          <button
            className={`tab ${dataTab === 'evang' ? 'active' : ''}`}
            onClick={() => setDataTab('evang')}
          >
            {tabLabel('evang')}
          </button>
        </div>

        {/* ACTION BUTTONS */}
        <div className="actions-row">
          {dataTab === 'conv' && (
            <>
              <button className="btn btn-gold" onClick={handleOpenNewConv}>
                ➕ Nueva Conversión
              </button>
              <button className="btn btn-secondary" onClick={handleExportConvCSV}>
                📥 Exportar CSV
              </button>
            </>
          )}
          {dataTab === 'grupo' && (
            <>
              <button className="btn btn-gold" onClick={handleOpenNewGrupo}>
                👥 Nuevo Grupo
              </button>
              <button className="btn btn-secondary" onClick={handleExportGruposCSV}>
                📥 Exportar CSV
              </button>
            </>
          )}
          {dataTab === 'evang' && (
            <>
              <button className="btn btn-gold" onClick={handleOpenNewEvang}>
                📋 Registrar Evangelismo
              </button>
              <button className="btn btn-secondary" onClick={handleExportEvangCSV}>
                📥 Exportar CSV
              </button>
            </>
          )}
        </div>

        {/* TAB: Conversiones */}
        {dataTab === 'conv' && (
          <div className="card">
            <div className="card-header">
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div className="card-title">📋 Registro de Conversiones</div>
                <div style={{ fontSize: 12, color: 'var(--dim)' }}>
                  {convHook.showIntegrados
                    ? convHook.convs.length
                    : convHook.convs.filter(c => c.estado !== 'Integrado').length}{' '}
                  de {convHook.convs.length} registros
                  {convHook.metrics.integrados > 0 && !convHook.showIntegrados &&
                    ` · ${convHook.metrics.integrados} ya integrados ocultos`}
                </div>
              </div>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() =>
                  exportConversionesPDF({
                    conversiones: convHook.convs,
                    filtros: { estado: convHook.filterEstado, zona: convHook.filterZona },
                  })
                }
              >
                📄 Exportar PDF
              </button>
            </div>

            <div className="search-bar">
              <input
                className="search-input"
                placeholder="🔍 Buscar nombre, zona, líder…"
                value={convHook.search}
                onChange={e => convHook.setSearch(e.target.value)}
              />
              <select
                className="filter-select"
                value={convHook.filterEstado}
                onChange={e => convHook.setFilterEstado(e.target.value)}
              >
                <option value="">Todos los estados</option>
                {ESTADOS.map(e => (
                  <option key={e}>{e}</option>
                ))}
              </select>
              <select
                className="filter-select"
                value={convHook.filterZona}
                onChange={e => convHook.setFilterZona(e.target.value)}
              >
                <option value="">Todas las zonas</option>
                {convHook.zonas
                  .slice()
                  .sort((a, b) => a.nombre.localeCompare(b.nombre))
                  .map(z => (
                    <option key={z.id} value={z.nombre}>
                      {z.nombre}
                    </option>
                  ))}
              </select>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 12,
                  color: convHook.showIntegrados ? 'var(--green)' : 'var(--dim)',
                  cursor: 'pointer',
                  padding: '6px 10px',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  background: convHook.showIntegrados
                    ? 'rgba(61,122,79,.1)'
                    : 'var(--bg-input)',
                  userSelect: 'none',
                }}
              >
                <input
                  type="checkbox"
                  checked={convHook.showIntegrados}
                  onChange={e => convHook.setShowIntegrados(e.target.checked)}
                  style={{ cursor: 'pointer' }}
                />
                Mostrar también Integrados
              </label>
            </div>

            {convHook.filtered.length === 0 ? (
              convHook.convs.length === 0 ? (
                <EmptyState
                  icon="🌱"
                  title="Sin registros aún"
                  sub='Presiona "➕ Nueva Conversión" para comenzar'
                />
              ) : (
                <EmptyState
                  icon="✅"
                  title="Sin conversiones en proceso"
                  sub={
                    convHook.metrics.integrados > 0
                      ? `Tienes ${convHook.metrics.integrados} conversión(es) ya integrada(s) — marca "Mostrar también Integrados" para verlas`
                      : 'Ajusta los filtros para ver resultados'
                  }
                />
              )
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Nombre</th>
                    <th>Zona</th>
                    <th>Fecha</th>
                    <th>Mayor</th>
                    <th>Grupo</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {convHook.filtered.map((c, i) => {
                    const grupoAsignado = c.grupoId
                      ? gruposHook.grupos.find(g => g.id === c.grupoId)
                      : null;
                    return (
                      <tr key={c.id}>
                        <td style={{ color: 'var(--dim)' }}>{i + 1}</td>
                        <td>
                          <strong>
                            {c.nombre} {c.apellido}
                          </strong>
                          {c.telefono && (
                            <>
                              <br />
                              <span style={{ fontSize: 10, color: 'var(--dim)' }}>
                                {c.telefono}
                              </span>
                            </>
                          )}
                        </td>
                        <td>{c.zona || '—'}</td>
                        <td>{fmt(c.fecha)}</td>
                        <td>{c.lider || '—'}</td>
                        <td>
                          {grupoAsignado ? (
                            <span
                              style={{
                                padding: '3px 8px',
                                borderRadius: '6px',
                                background: 'var(--gold-glow)',
                                color: 'var(--gold)',
                                fontSize: '11px',
                                fontWeight: 700,
                                border: '1px solid var(--gold)',
                              }}
                            >
                              👥 {grupoAsignado.nombre}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--dim)', fontSize: '11px' }}>—</span>
                          )}
                        </td>
                        <td>
                          <span className={`badge ${EST_BADGE[c.estado] || 'badge-blue'}`}>
                            {c.estado}
                          </span>
                          {c.estado === 'Integrado' && (
                            <span
                              style={{
                                marginLeft: 4,
                                padding: '2px 6px',
                                borderRadius: 6,
                                background: 'var(--gold-glow)',
                                color: 'var(--gold)',
                                fontSize: 10,
                                fontWeight: 700,
                                border: '1px solid var(--gold)',
                              }}
                            >
                              ✓ Miembro
                            </span>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 5 }}>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleOpenDetail(c.id)}
                            >
                              👁 Ver
                            </button>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleEditConv(c.id)}
                            >
                              ✏️ Editar
                            </button>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleQuickAdv(c.id)}
                            >
                              ⬆ Estado
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Resto del componente continuará en la siguiente parte */}
        {toast && <Toast message={toast} onClose={clearToast} type="success" />}
      </div>
    </Layout>
  );
}
