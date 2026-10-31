import type { Dispatch, SetStateAction } from 'react';
import { money } from '../../lib/utils';

interface ResumenAniosCardProps {
  anosDatos: Array<{ ano: string; total: number; diezmos: number; ofrendas: number; count: number }>;
  filterAnio: string;
  setFilterAnio: Dispatch<SetStateAction<string>>;
}

export function ResumenAniosCard(props: ResumenAniosCardProps) {
  const { anosDatos, filterAnio, setFilterAnio } = props;
  return (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, marginBottom: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, color: 'var(--oro-apostolico)' }}>📊 Resumen por Años</div>
                <table className="data-table" style={{ fontSize: 12 }}>
                    <thead><tr><th>Año</th><th style={{ textAlign: 'right' }}>Diezmos</th><th style={{ textAlign: 'right' }}>Ofrendas</th><th style={{ textAlign: 'right' }}>Total</th><th style={{ textAlign: 'center' }}>Registros</th></tr></thead>
                    <tbody>
                        {anosDatos.map(d => (
                            <tr key={d.ano} style={{ cursor: 'pointer', background: filterAnio === d.ano ? 'var(--gold-glow)' : undefined }} onClick={() => setFilterAnio(filterAnio === d.ano ? '' : d.ano)}>
                                <td style={{ fontWeight: 700 }}>{d.ano}</td>
                                <td style={{ textAlign: 'right', color: 'var(--green)' }}>{money(d.diezmos)}</td>
                                <td style={{ textAlign: 'right', color: 'var(--purple)' }}>{money(d.ofrendas)}</td>
                                <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--gold)' }}>{money(d.total)}</td>
                                <td style={{ textAlign: 'center', color: 'var(--dim)' }}>{d.count}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
  );
}
