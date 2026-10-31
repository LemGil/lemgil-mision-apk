import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { exportCSV } from '../../lib/csvExport';
import { CsvImportButton } from '../../components/CsvImportButton';
import { showToast } from '../../lib/notification';
import { money } from '../../lib/utils';
import type { Aporte, Colaborador, TipoPlan } from '../../lib/types';
import type { Tab } from './constants';
import { exportDadoresPDF } from './exportPdf';

interface ActionsRowProps {
  tab: Tab;
  dadores: Colaborador[];
  aportes: Aporte[];
  tiposPlanes: TipoPlan[];
  mo: string;
  openNewDador: () => void;
  openNewAporte: () => void;
}

export function ActionsRow(props: ActionsRowProps) {
  const { tab, dadores, aportes, tiposPlanes, mo, openNewDador, openNewAporte } = props;
  return (
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
  );
}
