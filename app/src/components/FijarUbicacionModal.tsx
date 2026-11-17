import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Modal } from './Modal';
import { MapaLeaflet } from './MapaLeaflet';
import { CENTRO_DEFECTO, puntosDeReferencia } from '../lib/mapa';
import { db } from '../lib/database';

/**
 * Fijar la ubicación de una ficha (persona o grupo): el maestro toca
 * el mapa en el lugar exacto, arrastra la chincheta, o usa el GPS del
 * teléfono estando de visita. La dirección escrita no se geocodifica:
 * en Cuba no es fiable; la marca a mano sí.
 */

const CENTRO_KEY = 'lemgil_mapa_ultimo_centro';

function ultimoCentro(): [number, number] {
  try {
    const raw = localStorage.getItem(CENTRO_KEY);
    if (raw) {
      const p = JSON.parse(raw) as unknown;
      if (
        Array.isArray(p) &&
        typeof p[0] === 'number' &&
        typeof p[1] === 'number'
      ) {
        return [p[0], p[1]];
      }
    }
  } catch { /* se usa el centro por defecto */ }
  return CENTRO_DEFECTO;
}

interface FijarUbicacionModalProps {
  /** Nombre de la ficha, para el título. */
  titulo: string;
  /** El tipo y la identidad de la ficha: su chincheta lleva su color y
   *  las referencias excluyen su propio punto (ese es el movible). */
  tipo: 'persona' | 'grupo';
  fichaId: string;
  lat: number | null;
  lng: number | null;
  onGuardar: (lat: number, lng: number) => void;
  onQuitar: () => void;
  onClose: () => void;
}

export function FijarUbicacionModal({ titulo, tipo, fichaId, lat, lng, onGuardar, onQuitar, onClose }: FijarUbicacionModalProps) {
  const personas = useLiveQuery(() => db.personas.toArray(), []) ?? [];
  const grupos = useLiveQuery(() => db.grupos.toArray(), []) ?? [];
  const referencias = puntosDeReferencia(personas, grupos, { tipo, id: fichaId });
  const tenia = lat != null && lng != null;
  const [punto, setPunto] = useState<{ lat: number; lng: number } | null>(
    tenia ? { lat: lat as number, lng: lng as number } : null,
  );
  const [aviso, setAviso] = useState('');
  const centro: [number, number] = punto ? [punto.lat, punto.lng] : ultimoCentro();

  const usarMiUbicacion = () => {
    if (!navigator.geolocation) {
      setAviso('Este equipo no ofrece ubicación por GPS. Toca el mapa donde está el lugar.');
      return;
    }
    setAviso('Buscando tu ubicación…');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPunto({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setAviso('');
      },
      () => setAviso('No se pudo obtener tu ubicación. Toca el mapa donde está el lugar.'),
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };

  const guardar = () => {
    if (!punto) return;
    try {
      localStorage.setItem(CENTRO_KEY, JSON.stringify([punto.lat, punto.lng]));
    } catch { /* sin consecuencias */ }
    onGuardar(punto.lat, punto.lng);
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`📍 Ubicación — ${titulo}`}
      wide
      footer={
        <>
          {tenia && (
            <button type="button" className="btn btn-danger" onClick={onQuitar}>
              Quitar ubicación
            </button>
          )}
          <button type="button" className="btn btn-secondary" onClick={usarMiUbicacion}>
            📍 Usar mi ubicación
          </button>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="btn btn-primary" disabled={!punto} onClick={guardar}>
            Guardar ubicación
          </button>
        </>
      }
    >
      <p style={{ fontSize: 13, color: 'var(--dim)', marginTop: 0 }}>
        Toca el mapa en el lugar exacto, o arrastra la chincheta. Si estás de visita en la casa,
        «Usar mi ubicación» la fija con el GPS del teléfono. Las chinchetas pequeñas son las
        ubicaciones ya fijadas: si viven en la misma casa o cerca, coloca la tuya junto a la
        suya, no encima.
      </p>
      <MapaLeaflet
        puntoEditable={punto}
        referencias={referencias}
        tipoEditable={tipo}
        onMoverPunto={(la, ln) => setPunto({ lat: la, lng: ln })}
        centro={centro}
        zoom={punto ? 16 : 12}
        altura={360}
      />
      {aviso && <p style={{ fontSize: 12, marginTop: 8 }}>{aviso}</p>}
      {punto && (
        <p style={{ fontSize: 12, color: 'var(--dim)', marginTop: 8 }}>
          Punto: {punto.lat.toFixed(5)}, {punto.lng.toFixed(5)}
        </p>
      )}
    </Modal>
  );
}
