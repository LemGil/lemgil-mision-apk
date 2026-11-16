import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { EmptyState } from '../components/EmptyState';
import { db } from '../lib/database';
import { fmt } from '../lib/utils';
import { diezmadorConDatos, mapaPersonas } from '../lib/personaDatos';
import { filtrarDiezmadores, resumenDiezmadores } from '../lib/diezmadores';
import type { Grupo } from '../lib/types';

/**
 * Diezmadores (Iglesia, menú 2026-11-16): la LISTA de las personas que
 * diezman, para ver sus datos — nombre, contacto, zona, grupo y desde
 * cuándo. Solo lectura: el registro del dinero (aportes y planes) vive
 * en Bien Común (Finanzas), como pidió LemGil. Tocar una fila abre la
 * ficha única de la persona.
 */
export default function Diezmadores() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const crudos = useLiveQuery(() => db.dadores.toArray(), []) ?? [];
  const personas = useLiveQuery(() => db.personas.toArray(), []) ?? [];
  const grupos = useLiveQuery(() => db.grupos.toArray(), []) ?? [];

  const vistas = useMemo(() => {
    const mapa = mapaPersonas(personas);
    const mapaGrupos = new Map<string, Grupo>(grupos.map((g) => [g.id, g]));
    return crudos.map((d) => diezmadorConDatos(d, mapa, mapaGrupos));
  }, [crudos, personas, grupos]);

  const filtradas = useMemo(() => filtrarDiezmadores(vistas, search), [vistas, search]);
  const resumen = useMemo(() => resumenDiezmadores(vistas), [vistas]);

  return (
    <Layout title="Diezmadores">
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">💰 DIEZMADORES</div>
            <div className="card-sub">
              Las personas que diezman y sus datos · {resumen.total} en la lista, {resumen.activos} activo(s).
              El dinero se registra en Bien Común — esta lista es solo para consultar.
            </div>
          </div>
          <Link to="/bien-comun" className="btn btn-gold">💰 Registrar en Bien Común</Link>
        </div>
        <div className="search-bar">
          <input className="search-input" placeholder="🔍 Buscar por nombre, teléfono, Nº de Identidad, zona o grupo..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {filtradas.length === 0 ? (
          <EmptyState icon="💰" title="Sin diezmadores" sub={search ? 'Ningún diezmador coincide con la búsqueda.' : 'Aún no hay diezmadores: se dan de alta desde Bien Común.'} />
        ) : (
          <table className="data-table">
            <thead>
              <tr><th>Diezmador</th><th>Zona</th><th>Grupo</th><th>Diezmando desde</th><th>Estado</th><th></th></tr>
            </thead>
            <tbody>
              {filtradas.map((v) => (
                <tr key={v.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{v.nombre} {v.apellido}</div>
                    <div style={{ fontSize: 11, color: 'var(--dim)' }}>{v.telefono || 'Sin teléfono'}{v.numeroIdentidad ? ` · 🪪 ${v.numeroIdentidad}` : ''}</div>
                  </td>
                  <td>{v.zona || '—'}</td>
                  <td>{v.grupo || '—'}</td>
                  <td>{v.fechaIngreso ? fmt(v.fechaIngreso) : '—'}</td>
                  <td><span className={`badge ${v.estado === 'Activo' ? 'badge-green' : 'badge-gray'}`}>{v.estado}</span></td>
                  <td>
                    {v.personaId
                      ? <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/personas?ver=${v.personaId}`)}>👁 Ver ficha</button>
                      : <span style={{ fontSize: 11, color: 'var(--dim)' }}>Sin ficha</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Layout>
  );
}
