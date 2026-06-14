import { useState, useRef } from 'react';
import { Modal } from './Modal';
import { parseCSV, mapRowsToRecords, importRecords, type ImportConfig } from '../lib/csvImport';

type Props<T = any> = {
  table: string;
  fieldMapping: Record<string, string>;
  requiredFields: string[];
  defaults?: Record<string, any>;
  validate?: (record: T, row: number) => string | null;
  onImport?: (count: number) => void;
  onError?: (msg: string) => void;
};

function normalizeStr(s: string): string {
  return s.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function CsvImportButton<T extends Record<string, any>>({
  table,
  fieldMapping,
  requiredFields,
  defaults = {},
  validate,
  onImport,
  onError,
}: Props<T>) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [modal, setModal] = useState<'preview' | 'result' | null>(null);
  const [parsed, setParsed] = useState<{ headers: string[]; rows: string[][] }>({ headers: [], rows: [] });
  const [result, setResult] = useState<{ imported: number; errors: { row: number; message: string }[] } | null>(null);
  const [processing, setProcessing] = useState(false);

  const config: ImportConfig<T> = {
    table,
    fieldMapping,
    requiredFields,
    defaults,
    validate,
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = (ev.target?.result as string) || '';
      const p = parseCSV(text);
      setParsed(p);
      setModal('preview');
      setResult(null);
    };
    reader.readAsText(file, 'utf-8');
    e.target.value = '';
  };

  const handleImport = async () => {
    setProcessing(true);
    try {
      const { records, errors: mapErrors } = mapRowsToRecords<T>(
        parsed.headers,
        parsed.rows,
        config,
      );

      if (records.length === 0 && mapErrors.length > 0) {
        setResult({ imported: 0, errors: mapErrors });
        setModal('result');
        return;
      }

      let imported = 0;
      if (records.length > 0) {
        imported = await importRecords(records, table);
      }

      const allErrors = mapErrors;
      setResult({ imported, errors: allErrors });
      setModal('result');
      if (imported > 0) onImport?.(imported);
    } catch (err: any) {
      const msg = err?.message || 'Error desconocido al importar';
      onError?.(msg);
      setResult({ imported: 0, errors: [{ row: 0, message: msg }] });
      setModal('result');
    } finally {
      setProcessing(false);
    }
  };

  const normalizedMapping: Record<string, string> = {};
  for (const [key, val] of Object.entries(fieldMapping)) {
    normalizedMapping[normalizeStr(key)] = val;
  }
  const mappedHeaders = parsed.headers.filter(h => normalizedMapping[normalizeStr(h)]);
  const unmappedHeaders = parsed.headers.filter(h => !normalizedMapping[normalizeStr(h)]);

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept=".csv,.txt"
        style={{ display: 'none' }}
        onChange={handleFile}
      />
      <button className="btn btn-secondary btn-sm" onClick={() => fileRef.current?.click()}>
        📥 Importar CSV
      </button>

      {modal === 'preview' && (
        <Modal
          open
          wide
          onClose={() => setModal(null)}
          title="Vista previa del CSV"
          footer={
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setModal(null)}>Cancelar</button>
              <button className="btn btn-gold btn-sm" onClick={handleImport} disabled={processing}>
                {processing ? '⏳ Importando...' : `✅ Importar ${parsed.rows.length} registro(s)`}
              </button>
            </div>
          }
        >
          <div style={{ fontSize: 13, marginBottom: 12 }}>
            <div><strong>Filas encontradas:</strong> {parsed.rows.length}</div>
            {unmappedHeaders.length > 0 && (
              <div style={{ color: 'var(--dim)', marginTop: 4 }}>
                ⚠️ Columnas ignoradas: {unmappedHeaders.join(', ')}
              </div>
            )}
            <div style={{ marginTop: 4, color: 'var(--dim)' }}>
              Columnas mapeadas: {mappedHeaders.map(h => <span key={h} style={{ background: 'var(--surface)', padding: '2px 6px', borderRadius: 4, margin: '0 2px' }}>{h} → {normalizedMapping[normalizeStr(h)]}</span>)}
            </div>
          </div>
          {parsed.rows.length > 0 && (
            <div style={{ overflowX: 'auto', maxHeight: 300, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 8 }}>
              <table className="data-table" style={{ fontSize: 12 }}>
                <thead>
                  <tr>
                    <th>#</th>
                    {mappedHeaders.map(h => <th key={h}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {parsed.rows.slice(0, 10).map((row, i) => (
                    <tr key={i}>
                      <td style={{ color: 'var(--dim)' }}>{i + 1}</td>
                      {parsed.headers.map((h, j) => {
                        if (!normalizedMapping[normalizeStr(h)]) return null;
                        return <td key={h}>{row[j] || '—'}</td>;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              {parsed.rows.length > 10 && (
                <div style={{ padding: '8px 12px', color: 'var(--dim)', fontSize: 12, textAlign: 'center' }}>
                  ... y {parsed.rows.length - 10} fila(s) más
                </div>
              )}
            </div>
          )}
        </Modal>
      )}

      {modal === 'result' && result && (
        <Modal
          open
          onClose={() => setModal(null)}
          title={result.imported > 0 ? 'Importación completada' : 'Error en la importación'}
          footer={
            <button className="btn btn-gold btn-sm" onClick={() => setModal(null)}>Cerrar</button>
          }
        >
          <div style={{ fontSize: 13 }}>
            {result.imported > 0 && (
              <div style={{ color: 'var(--green)', marginBottom: 8 }}>
                ✅ {result.imported} registro(s) importado(s) correctamente
              </div>
            )}
            {result.errors.length > 0 && (
              <div>
                <div style={{ color: 'var(--red)', marginBottom: 8 }}>
                  ⚠️ {result.errors.length} error(es):
                </div>
                <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 8, padding: 8 }}>
                  {result.errors.map((err, i) => (
                    <div key={i} style={{ padding: '4px 0', borderBottom: i < result.errors.length - 1 ? '1px solid var(--border)' : undefined }}>
                      <span style={{ color: 'var(--dim)' }}>Fila {err.row}:</span> {err.message}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {result.imported === 0 && result.errors.length === 0 && (
              <div style={{ color: 'var(--dim)' }}>No se encontraron registros válidos para importar.</div>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
