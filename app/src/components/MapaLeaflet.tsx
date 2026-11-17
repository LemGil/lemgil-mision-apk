import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { PuntoMapa } from '../lib/mapa';
import { CENTRO_DEFECTO } from '../lib/mapa';

/**
 * El mapa (Leaflet + OpenStreetMap, sin llave ni costo). Dos modos:
 * - Lectura: chinchetas de personas y grupos con su globo (nombre,
 *   detalle y enlace a la ficha).
 * - Fijar: una sola chincheta movible (toque en el mapa o arrastre).
 * Las chinchetas son divIcon de HTML propio: las imágenes por defecto
 * de Leaflet se rompen con facilidad en una PWA empaquetada.
 * Los pedazos del mapa se cachean solos (runtimeCaching en vite.config):
 * la zona ya vista se abre después sin conexión.
 */

function escaparHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function iconoPunto(p: PuntoMapa): L.DivIcon {
  return L.divIcon({
    className: 'mapa-pin-wrap',
    html: `<div class="mapa-pin ${p.tipo === 'grupo' ? 'mapa-pin-grupo' : 'mapa-pin-persona'}">${p.tipo === 'grupo' ? '🏠' : '👤'}</div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });
}

/** Las ya fijadas, de referencia al fijar una nueva: pequeñas, con su nombre al tocarlas. */
function iconoReferencia(p: PuntoMapa): L.DivIcon {
  return L.divIcon({
    className: 'mapa-pin-wrap',
    html: `<div class="mapa-pin mapa-pin-ref ${p.tipo === 'grupo' ? 'mapa-pin-grupo' : 'mapa-pin-persona'}">${p.tipo === 'grupo' ? '🏠' : '👤'}</div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

/** La chincheta que se está fijando: mayor y con halo, del color de su tipo. */
function iconoEditable(tipo: 'persona' | 'grupo'): L.DivIcon {
  return L.divIcon({
    className: 'mapa-pin-wrap',
    html: `<div class="mapa-pin mapa-pin-editable ${tipo === 'grupo' ? 'mapa-pin-grupo' : 'mapa-pin-persona'}">${tipo === 'grupo' ? '🏠' : '👤'}</div>`,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
  });
}

interface MapaLeafletProps {
  puntos?: PuntoMapa[];
  /** Modo fijar: el punto movible actual (null = aún sin marcar). */
  puntoEditable?: { lat: number; lng: number } | null;
  onMoverPunto?: (lat: number, lng: number) => void;
  /** Las ubicaciones ya fijadas, visibles de referencia en modo fijar. */
  referencias?: PuntoMapa[];
  /** El tipo de la ficha que se está fijando (color de su chincheta). */
  tipoEditable?: 'persona' | 'grupo';
  centro?: [number, number];
  zoom?: number;
  altura?: number;
}

export function MapaLeaflet({ puntos, puntoEditable, onMoverPunto, referencias, tipoEditable, centro, zoom, altura = 420 }: MapaLeafletProps) {
  const divRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const capaRef = useRef<L.LayerGroup | null>(null);
  const capaRefRef = useRef<L.LayerGroup | null>(null);
  const marcadorRef = useRef<L.Marker | null>(null);
  const encuadradoRef = useRef(false);
  const encuadreRefHechoRef = useRef(false);
  const onMoverRef = useRef(onMoverPunto);
  onMoverRef.current = onMoverPunto;
  const puntoEditableRef = useRef(puntoEditable);
  puntoEditableRef.current = puntoEditable;
  const editable = Boolean(onMoverPunto);

  // Crear el mapa una sola vez.
  useEffect(() => {
    if (!divRef.current || mapRef.current) return;
    const map = L.map(divRef.current).setView(centro ?? CENTRO_DEFECTO, zoom ?? 12);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap',
    }).addTo(map);
    capaRef.current = L.layerGroup().addTo(map);
    capaRefRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    if (editable) {
      map.on('click', (e: L.LeafletMouseEvent) => {
        onMoverRef.current?.(e.latlng.lat, e.latlng.lng);
      });
    }
    const t = setTimeout(() => map.invalidateSize(), 120);
    return () => {
      clearTimeout(t);
      map.remove();
      mapRef.current = null;
      marcadorRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Chinchetas de lectura + primer encuadre cuando llegan los puntos.
  useEffect(() => {
    const map = mapRef.current;
    const capa = capaRef.current;
    if (!map || !capa || !puntos) return;
    capa.clearLayers();
    for (const p of puntos) {
      const detalle = p.detalle ? `<br/>${escaparHtml(p.detalle)}` : '';
      L.marker([p.lat, p.lng], { icon: iconoPunto(p) })
        .bindPopup(`<strong>${escaparHtml(p.nombre)}</strong>${detalle}<br/><a href="#${p.href}">Ver ficha →</a>`)
        .addTo(capa);
    }
    if (puntos.length > 0 && !encuadradoRef.current) {
      encuadradoRef.current = true;
      const bounds = L.latLngBounds(puntos.map((p) => [p.lat, p.lng] as [number, number]));
      map.fitBounds(bounds.pad(0.15));
    }
  }, [puntos]);

  // Referencias: las ya fijadas se ven al fijar una nueva, para no
  // caer encima de otra (misma casa o cerca). Al llegar las primeras
  // y aún sin punto propio, la vista se encuadra en ellas una vez.
  useEffect(() => {
    const map = mapRef.current;
    const capa = capaRefRef.current;
    if (!map || !capa || !referencias) return;
    capa.clearLayers();
    for (const p of referencias) {
      L.marker([p.lat, p.lng], { icon: iconoReferencia(p), keyboard: false })
        .bindTooltip(escaparHtml(p.nombre), { direction: 'top', offset: [0, -10] })
        .addTo(capa);
    }
    if (editable && referencias.length > 0 && !puntoEditableRef.current && !encuadreRefHechoRef.current) {
      encuadreRefHechoRef.current = true;
      const bounds = L.latLngBounds(referencias.map((p) => [p.lat, p.lng] as [number, number]));
      map.fitBounds(bounds.pad(0.25));
    }
  }, [referencias, editable]);

  // Chincheta movible del modo fijar.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !editable) return;
    if (!puntoEditable) {
      if (marcadorRef.current) {
        marcadorRef.current.remove();
        marcadorRef.current = null;
      }
      return;
    }
    if (!marcadorRef.current) {
      const m = L.marker([puntoEditable.lat, puntoEditable.lng], { draggable: true, icon: iconoEditable(tipoEditable ?? 'persona') });
      m.on('dragend', () => {
        const ll = m.getLatLng();
        onMoverRef.current?.(ll.lat, ll.lng);
      });
      m.addTo(map);
      marcadorRef.current = m;
    } else {
      marcadorRef.current.setLatLng([puntoEditable.lat, puntoEditable.lng]);
      marcadorRef.current.setIcon(iconoEditable(tipoEditable ?? 'persona'));
    }
    // Si el punto quedó fuera de la vista (p. ej. llegó por GPS), se sigue.
    if (!map.getBounds().contains([puntoEditable.lat, puntoEditable.lng])) {
      map.panTo([puntoEditable.lat, puntoEditable.lng]);
    }
  }, [puntoEditable, editable, tipoEditable]);

  return (
    <div
      ref={divRef}
      style={{ height: altura, width: '100%', borderRadius: 10, overflow: 'hidden', zIndex: 0 }}
    />
  );
}
