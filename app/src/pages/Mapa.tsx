import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Layout } from '../components/Layout';
import { MapaLeaflet } from '../components/MapaLeaflet';
import { db } from '../lib/database';
import { centroDePuntos, idRealDePunto, puntosDelMapa, type PuntoMapa } from '../lib/mapa';
import { showToast } from '../lib/notification';

/**
 * Página Mapa (2026-11-16): todas las ubicaciones fijadas de personas
 * y grupos en un solo vistazo. Tocar una chincheta abre su globo con
 * el enlace a la ficha. Las ubicaciones se fijan desde cada ficha
 * («📍 Fijar ubicación»), a mano o con el GPS al visitar.
 * «✏️ Editar ubicaciones» (2026-11-17): con el modo activo, TODAS las
 * chinchetas se arrastran en el mapa grande y cada una se guarda al
 * soltarla — así se organizan en conjunto las que quedaron apiladas
 * (misma casa o cerca). Apagado, el mapa es solo de lectura: arrastrar
 * una chincheta sin querer no debe mover la casa de nadie.
 */
export default function Mapa() {
  const personas = useLiveQuery(() => db.personas.toArray(), []) ?? [];
  const grupos = useLiveQuery(() => db.grupos.toArray(), []) ?? [];
  const puntos = puntosDelMapa(personas, grupos);
  const totalFichas = personas.length + grupos.length;
  const sinFijar = totalFichas - puntos.length;
  const [editando, setEditando] = useState(false);
  const [ultimoAjuste, setUltimoAjuste] = useState('');

  const moverPunto = async (p: PuntoMapa, lat: number, lng: number) => {
    const id = idRealDePunto(p);
    try {
      if (p.tipo === 'persona') await db.personas.update(id, { lat, lng });
      else await db.grupos.update(id, { lat, lng });
      setUltimoAjuste(`${p.nombre} → guardada ✓`);
    } catch {
      showToast('No se pudo guardar la ubicación');
    }
  };

  return (
    <Layout title="Mapa">
      <div style={{ padding: '4px 2px 12px' }}>
        <p style={{ fontSize: 13, color: 'var(--dim)', margin: '4px 0 10px' }}>
          👤 Personas · 🏠 Grupos — <strong>{puntos.length}</strong> ubicación(es) fijada(s)
          {sinFijar > 0 &&
            ` · ${sinFijar} ficha(s) aún sin fijar — se fijan desde cada ficha con «📍 Fijar ubicación»`}
        </p>
        {puntos.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', margin: '0 0 10px' }}>
            <button
              type="button"
              className={editando ? 'btn btn-primary' : 'btn btn-secondary'}
              onClick={() => setEditando((v) => !v)}
            >
              {editando ? '✓ Terminar edición' : '✏️ Editar ubicaciones'}
            </button>
            {editando && (
              <span style={{ fontSize: 12.5, color: 'var(--dim)' }}>
                Arrastra cada chincheta a su lugar; se guarda al soltarla.
                {ultimoAjuste && <> · Última: <strong>{ultimoAjuste}</strong></>}
              </span>
            )}
          </div>
        )}
        <MapaLeaflet
          puntos={puntos}
          arrastrables={editando}
          onArrastrarPunto={moverPunto}
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
