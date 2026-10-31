import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { exportCSV } from '../../lib/csvExport';
import { CsvImportButton } from '../../components/CsvImportButton';
import { showToast } from '../../lib/notification';
import type { Beneficiario, Campana, Entrega } from '../../lib/types';
import type { Tab } from './constants';

interface ActionsRowProps {
  tab: Tab;
  benFiltrados: Beneficiario[];
  campFiltradas: Campana[];
  entFiltradas: Entrega[];
  entregas: Entrega[];
  beneficiarios: Beneficiario[];
  campanas: Campana[];
  openNewBen: (type: 'Persona' | 'Casa de Familia' | 'Grupo' | 'Vulnerable') => void;
  openNewCamp: () => void;
  openNewEnt: () => void;
}

export function ActionsRow(props: ActionsRowProps) {
  const { tab, benFiltrados, campFiltradas, entFiltradas, entregas, beneficiarios, campanas, openNewBen, openNewCamp, openNewEnt } = props;
  return (
        <div className="actions-row">
      {tab === 'ben' && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button className="btn" style={{ background: '#fff', border: '2px solid var(--blue)', color: 'var(--blue)', fontWeight: 600 }} onClick={() => openNewBen('Persona')}>➕ Persona</button>
          <button className="btn" style={{ background: '#fff', border: '2px solid var(--gold)', color: 'var(--gold)', fontWeight: 600 }} onClick={() => openNewBen('Casa de Familia')}>➕ Casa</button>
          <button className="btn" style={{ background: '#fff', border: '2px solid var(--green)', color: 'var(--green)', fontWeight: 600 }} onClick={() => openNewBen('Grupo')}>➕ Grupo</button>
          <button className="btn" style={{ background: '#fff', border: '2px solid var(--red)', color: 'var(--red)', fontWeight: 600 }} onClick={() => openNewBen('Vulnerable')}>➕ Vulnerable</button>
        </div>
      )}
          {tab === 'ben' && (
            <>
              <button className="btn btn-secondary" onClick={() => {
                if (!benFiltrados.length) return showToast('No hay beneficiarios para exportar');
                const doc = new jsPDF();
                doc.setFontSize(18);
                doc.text('Beneficiarios Manos Abiertas', 14, 20);
                doc.setFontSize(10);
                doc.setTextColor(120);
                doc.text(`Generado: ${new Date().toLocaleDateString('es-ES')} · Total: ${benFiltrados.length}`, 14, 28);
                const rows = benFiltrados.map(b => [`${b.nombre} ${b.apellido}`, b.telefono || '—', b.zona || '—', b.direccion || '—', b.familia, b.estado]);
                autoTable(doc, { startY: 34, head: [['Nombre', 'Teléfono', 'Zona', 'Dirección', 'Familia', 'Estado']], body: rows, styles: { fontSize: 9 }, headStyles: { fillColor: [212, 168, 67] } });
                doc.save('lemgil-beneficiarios.pdf');
                showToast('PDF exportado');
              }}>📄 Exportar PDF</button>
              <button className="btn btn-secondary" onClick={() => {
                if (!benFiltrados.length) return showToast('No hay beneficiarios para exportar');
                const h = ['Nombre', 'Apellido', 'Teléfono', 'Zona', 'Dirección', 'Familia', 'Estado', 'Notas'];
                const r = benFiltrados.map(b => [b.nombre, b.apellido, b.telefono || '', b.zona || '', b.direccion || '', b.familia, b.estado, (b.notas || '').replace(/,/g, ';')]);
                exportCSV(h, r, 'lemgil-beneficiarios.csv');
                showToast('CSV exportado');
              }}>📥 Exportar CSV</button>
              <CsvImportButton<Beneficiario>
                table="beneficiarios"
                fieldMapping={{
                  'Nombre': 'nombre',
                  'Apellido': 'apellido',
                  'Teléfono': 'telefono',
                  'Dirección': 'direccion',
                  'Zona': 'zona',
                  'Familia': 'familia',
                  'Estado': 'estado',
                  'Notas': 'notas',
                  'Tipo': 'tipo',
                }}
                requiredFields={['nombre', 'apellido']}
                defaults={{ estado: 'Activo', familia: 1, tipo: 'Persona', source: 'Manual' }}
                onImport={(n) => showToast(`${n} beneficiario(s) importado(s)`)}
              />
            </>
          )}
          {tab === 'camp' && <button className="btn btn-gold" onClick={openNewCamp}>📢 Nueva Campaña</button>}
          {tab === 'camp' && (
            <>
              <button className="btn btn-secondary" onClick={() => {
                if (!campFiltradas.length) return showToast('No hay campañas para exportar');
                const doc = new jsPDF();
                doc.setFontSize(18);
                doc.text('Campañas Solidarias', 14, 20);
                doc.setFontSize(10);
                doc.setTextColor(120);
                doc.text(`Generado: ${new Date().toLocaleDateString('es-ES')} · Total: ${campFiltradas.length}`, 14, 28);
                const rows = campFiltradas.map(c => {
                  const ents = entregas.filter(e => e.campanaId === c.id);
                  const metaLabel = c.metaTipo === 'Personas' ? 'personas' : 'familias';
                  return [c.nombre, c.tipo, c.responsable || '—', c.estado, `${ents.length} entregas`, `${c.metaFamilias || '—'} ${metaLabel}`];
                });
                autoTable(doc, { startY: 34, head: [['Nombre', 'Tipo', 'Responsable', 'Estado', 'Entregas', 'Meta']], body: rows, styles: { fontSize: 9 }, headStyles: { fillColor: [212, 168, 67] } });
                doc.save('lemgil-campanas.pdf');
                showToast('PDF exportado');
              }}>📄 Exportar PDF</button>
              <button className="btn btn-secondary" onClick={() => {
                if (!campFiltradas.length) return showToast('No hay campañas para exportar');
                const h = ['Nombre', 'Tipo', 'Responsable', 'Estado', 'Fecha Inicio', 'Meta', 'Tipo Meta', 'Descripción'];
                const r = campFiltradas.map(c => [c.nombre, c.tipo, c.responsable || '', c.estado, c.fechaInicio || '', c.metaFamilias || '', c.metaTipo || 'Familias', (c.descripcion || '').replace(/,/g, ';')]);
                exportCSV(h, r, 'lemgil-campanas.csv');
                showToast('CSV exportado');
              }}>📥 Exportar CSV</button>
              <CsvImportButton<Campana>
                table="campanas"
                fieldMapping={{
                  'Nombre': 'nombre',
                  'Tipo': 'tipo',
                  'Responsable': 'responsable',
                  'Estado': 'estado',
                  'Fecha Inicio': 'fechaInicio',
                  'Fecha Fin': 'fechaFin',
                  'Meta': 'metaFamilias',
                  'Tipo Meta': 'metaTipo',
                  'Zona': 'zona',
                  'Descripción': 'descripcion',
                }}
                requiredFields={['nombre']}
                defaults={{ estado: 'Planificada', metaFamilias: 0, metaTipo: 'Familias', tipo: 'Otra' }}
                onImport={(n) => showToast(`${n} campaña(s) importada(s)`)}
              />
            </>
          )}
          {tab === 'ent' && <button className="btn btn-gold" onClick={openNewEnt}>📦 Registrar Entrega</button>}
          {tab === 'ent' && (
            <>
              <button className="btn btn-secondary" onClick={() => {
                if (!entFiltradas.length) return showToast('No hay entregas para exportar');
                const doc = new jsPDF();
                doc.setFontSize(18);
                doc.text('Historial de Entregas', 14, 20);
                doc.setFontSize(10);
                doc.setTextColor(120);
                doc.text(`Generado: ${new Date().toLocaleDateString('es-ES')} · Total: ${entFiltradas.length}`, 14, 28);
                const rows = entFiltradas.map(e => {
                  const ben = beneficiarios.find(b => b.id === e.beneficiarioId);
                  const camp = campanas.find(c => c.id === e.campanaId);
                  return [e.fecha, ben ? `${ben.nombre} ${ben.apellido}` : '—', camp?.nombre || '—', e.tipo, e.cantidad, (e.notas || '').slice(0, 30)];
                });
                autoTable(doc, { startY: 34, head: [['Fecha', 'Beneficiario', 'Campaña', 'Tipo', 'Cantidad', 'Notas']], body: rows, styles: { fontSize: 9 }, headStyles: { fillColor: [212, 168, 67] } });
                doc.save('lemgil-entregas.pdf');
                showToast('PDF exportado');
              }}>📄 Exportar PDF</button>
              <button className="btn btn-secondary" onClick={() => {
                if (!entFiltradas.length) return showToast('No hay entregas para exportar');
                const h = ['Fecha', 'Beneficiario', 'Campaña', 'Tipo', 'Cantidad', 'Notas'];
                const r = entFiltradas.map(e => {
                  const ben = beneficiarios.find(b => b.id === e.beneficiarioId);
                  const camp = campanas.find(c => c.id === e.campanaId);
                  return [e.fecha, ben ? `${ben.nombre} ${ben.apellido}` : '—', camp?.nombre || '—', e.tipo, e.cantidad, (e.notas || '').replace(/,/g, ';')];
                });
                exportCSV(h, r, 'lemgil-entregas.csv');
                showToast('CSV exportado');
              }}>📥 Exportar CSV</button>
            </>
          )}
        </div>
  );
}
