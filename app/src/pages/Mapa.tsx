import { useLiveQuery } from 'dexie-react-hooks';
import { Layout } from '../components/Layout';
import { MapaLeaflet } from '../components/MapaLeaflet';
import { db } from '../lib/database';
import { centroDePuntos, puntosDelMapa } from '../lib/mapa';

/**
 * Página Mapa (2026-11-16): todas las ubicaciones fijadas de personas
 * y grupos en un solo vistazo. Tocar una chincheta abre su globo con
 * el enlace a la ficha. Las ubicaciones se fijan desde cada ficha
 * («📍 Fijar ubicación»), a mano o con el GPS al visitar.
 */
export default function Mapa() {
  const personas = useLiveQuery(() => db.personas.toArray(), []) ?? [];
  const grupos = useLiveQuery(() => db.grupos.toArray(), []) ?? [];
  const puntos = puntosDelMapa(personas, grupos);
  const totalFichas = personas.length + grupos.length;
  const sinFijar = totalFichas - puntos.length;

  return (
    <Layout title="Mapa">
      <div style={{ padding: '4px 2px 12px' }}>
        <p style={{ fontSize: 13, color: 'var(--dim)', margin: '4px 0 10px' }}>
          👤 Personas · 🏠 Grupos — <strong>{puntos.length}</strong> ubicación(es) fijada(s)
          {sinFijar > 0 &&
            ` · ${sinFijar} ficha(s) aún sin fijar — se fijan desde cada ficha con «📍 Fijar ubicación»`}
        </p>
        <MapaLeaflet
          puntos={puntos}
          centro={centroDePuntos(puntos)}
          zoom={puntos.length ? 12 : 8}
          altura={540}
        />
        {puntos.length === 0 && (
          <p style={{ fontSize: 13, marginTop: 10 }}>
            Todavía no hay ubicaciones fijadas. Abre la ficha de una persona o de un grupo y toca
            «📍 Fijar ubicación».
          </p>
        )}
      </div>
    </Layout>
  );
}
