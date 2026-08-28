/**
 * Hook personalizado para gestionar datos y lógica de evangelismo
 */

import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { v4 as uuid } from 'uuid';
import { db } from '../../../lib/database';
import type { Evangelismo } from '../../types/mision';
import { today } from '../utils/conversionSync';

export function useEvangelismo() {
  // Datos reactivos desde Dexie
  const evangels = useLiveQuery(() => db.evangelismos.toArray(), []) ?? [];
  const miembros = useLiveQuery(() => db.miembros.toArray(), []) ?? [];
  const zonas = useLiveQuery(() => db.zonas.toArray(), []) ?? [];

  // Estado local para filtros
  const [searchE, setSearchE] = useState('');
  const [filterETipo, setFilterETipo] = useState('');
  const [filterEZona, setFilterEZona] = useState('');
  const [filterEMinistro, setFilterEMinistro] = useState('');
  const [filterEMes, setFilterEMes] = useState('');

  // Estado para el formulario
  const [editEvangId, setEditEvangId] = useState<string | null>(null);
  const [eTipo, setETipo] = useState('Visita domiciliaria');
  const [eFecha, setEFecha] = useState(today());
  const [eZona, setEZona] = useState('Norte');
  const [eLider, setELider] = useState('');
  const [eLiderCustom, setELiderCustom] = useState(false);
  const [eParticipantes, setEParticipantes] = useState<string[]>([]);
  const [ePartCustom, setEPartCustom] = useState('');
  const [eContactos, setEContactos] = useState('0');
  const [eConvs, setEConvs] = useState('0');
  const [eNotas, setENotas] = useState('');

  // Actividades filtradas
  const evangelsFiltrados = useMemo(() => {
    return evangels.filter(e => {
      const s = `${e.tipo} ${e.zona} ${e.lider} ${e.notas}`.toLowerCase();
      if (searchE && !s.includes(searchE.toLowerCase())) return false;
      if (filterETipo && e.tipo !== filterETipo) return false;
      if (filterEZona && e.zona !== filterEZona) return false;
      if (filterEMinistro && e.lider !== filterEMinistro) return false;
      if (filterEMes && !e.fecha.startsWith(filterEMes)) return false;
      return true;
    });
  }, [evangels, searchE, filterETipo, filterEZona, filterEMinistro, filterEMes]);

  // Acciones
  const resetEvang = () => {
    setEditEvangId(null);
    setETipo('Visita domiciliaria');
    setEFecha(today());
    setEZona('Norte');
    setELider('');
    setELiderCustom(false);
    setEParticipantes([]);
    setEPartCustom('');
    setEContactos('0');
    setEConvs('0');
    setENotas('');
  };

  const openEditEvang = (id: string) => {
    const e = evangels.find(x => x.id === id);
    if (!e) return;
    
    setEditEvangId(id);
    setETipo(e.tipo);
    setEFecha(e.fecha);
    setEZona(e.zona);
    setELider(e.lider);
    
    const enLista = miembros.some(m => `${m.nombre} ${m.apellido}` === e.lider);
    setELiderCustom(!enLista && !!e.lider);
    setEParticipantes(Array.isArray(e.participantes) ? e.participantes : []);
    setEPartCustom('');
    setEContactos(String(e.contactos));
    setEConvs(String(e.conversiones));
    setENotas(e.notas);
  };

  const addParticipante = (nombre: string) => {
    if (nombre && !eParticipantes.includes(nombre)) {
      setEParticipantes([...eParticipantes, nombre]);
    }
  };

  const removeParticipante = (index: number) => {
    setEParticipantes(eParticipantes.filter((_, i) => i !== index));
  };

  const saveEvang = async (): Promise<{ success: boolean; message: string }> => {
    if (!eFecha) {
      return { success: false, message: 'La fecha es obligatoria' };
    }

    const data = {
      fecha: eFecha,
      tipo: eTipo,
      zona: eZona,
      lider: eLider.trim(),
      participantes: eParticipantes,
      contactos: parseInt(eContactos) || 0,
      conversiones: parseInt(eConvs) || 0,
      notas: eNotas.trim(),
    };

    try {
      if (editEvangId) {
        await db.evangelismos.update(editEvangId, data);
        return { success: true, message: 'Actividad actualizada' };
      } else {
        await db.evangelismos.add({
          id: uuid(),
          ...data,
          creado: new Date().toISOString(),
        });
        return { success: true, message: `Evangelismo guardado — ${eConvs} conversión(es)` };
      }
    } catch (error) {
      console.error('Error al guardar evangelismo:', error);
      return { success: false, message: 'Error al guardar. Intenta nuevamente.' };
    }
  };

  const delEvang = async (id: string): Promise<void> => {
    await db.evangelismos.delete(id);
  };

  return {
    // Datos
    evangels,
    miembros,
    zonas,
    evangelsFiltrados,
    
    // Filtros
    searchE,
    setSearchE,
    filterETipo,
    setFilterETipo,
    filterEZona,
    setFilterEZona,
    filterEMinistro,
    setFilterEMinistro,
    filterEMes,
    setFilterEMes,
    
    // Formulario
    editEvangId,
    eTipo,
    setETipo,
    eFecha,
    setEFecha,
    eZona,
    setEZona,
    eLider,
    setELider,
    eLiderCustom,
    setELiderCustom,
    eParticipantes,
    setEParticipantes,
    ePartCustom,
    setEPartCustom,
    eContactos,
    setEContactos,
    eConvs,
    setEConvs,
    eNotas,
    setENotas,
    
    // Acciones
    resetEvang,
    openEditEvang,
    addParticipante,
    removeParticipante,
    saveEvang,
    delEvang,
  };
}
