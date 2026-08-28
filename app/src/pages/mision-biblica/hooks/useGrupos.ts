/**
 * Hook personalizado para gestionar datos y lógica de grupos de discipulado
 */

import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { v4 as uuid } from 'uuid';
import { db } from '../../../lib/database';
import type { Grupo } from '../../types/mision';
import type { Conversion, Miembro } from '../../../lib/types';

export function useGrupos() {
  // Datos reactivos desde Dexie
  const grupos = useLiveQuery(() => db.grupos.toArray(), []) ?? [];
  const convs = useLiveQuery(() => db.conversiones.toArray(), []) ?? [];
  const miembros = useLiveQuery(() => db.miembros.toArray(), []) ?? [];
  const zonas = useLiveQuery(() => db.zonas.toArray(), []) ?? [];

  // Estado local para filtros
  const [searchG, setSearchG] = useState('');
  const [filterGZona, setFilterGZona] = useState('');
  const [filterGEstado, setFilterGEstado] = useState('');
  const [filterGDia, setFilterGDia] = useState('');

  // Estado para el formulario
  const [editGrupoId, setEditGrupoId] = useState<string | null>(null);
  const [gNombre, setGNombre] = useState('');
  const [gZona, setGZona] = useState('');
  const [gLider, setGLider] = useState('');
  const [gDia, setGDia] = useState('Lunes');
  const [gHora, setGHora] = useState('19:00');
  const [gCap, setGCap] = useState('15');
  const [gLugar, setGLugar] = useState('');
  const [gMeta, setGMeta] = useState('');

  // Métricas derivadas por grupo
  const getGrupoMetrics = (grupo: Grupo) => {
    const convsEnProceso = convs.filter(
      c => c.grupoId === grupo.id && 
           c.estado !== 'Integrado' && 
           c.estado !== 'Apartado' && 
           c.estado !== 'Fallecido'
    );
    
    const cantNuevo = convsEnProceso.filter(c => c.estado === 'Nuevo').length;
    const cantDiscip = convsEnProceso.filter(c => c.estado === 'Discipulado').length;
    const cantBaut = convsEnProceso.filter(c => c.estado === 'Bautizado').length;
    const cantMiembros = miembros.filter(m => m.grupoId === grupo.id).length;
    const totalAsignados = cantMiembros + convsEnProceso.length;
    const capacidad = parseInt(grupo.capacidad) || 0;
    const pctCap = capacidad > 0 ? (totalAsignados / capacidad) * 100 : 0;
    
    return {
      convsEnProceso,
      cantNuevo,
      cantDiscip,
      cantBaut,
      cantMiembros,
      totalAsignados,
      capacidad,
      pctCap,
    };
  };

  // Grupos filtrados
  const gruposFiltrados = useMemo(() => {
    return grupos.filter(g => {
      const s = `${g.nombre} ${g.lider}`.toLowerCase();
      if (searchG && !s.includes(searchG.toLowerCase())) return false;
      if (filterGZona && g.zona !== filterGZona) return false;
      if (filterGDia && g.dia !== filterGDia) return false;
      
      if (filterGEstado) {
        const metrics = getGrupoMetrics(g);
        const { pctCap, capacidad } = metrics;
        
        if (filterGEstado === 'disponible' && (pctCap >= 70 || capacidad === 0)) return false;
        if (filterGEstado === 'casi-lleno' && (pctCap < 70 || pctCap >= 100)) return false;
        if (filterGEstado === 'saturado' && pctCap < 100) return false;
        if (filterGEstado === 'sin-meta' && capacidad > 0) return false;
      }
      
      return true;
    });
  }, [grupos, searchG, filterGZona, filterGDia, filterGEstado, convs, miembros]);

  // Acciones
  const resetGrupo = () => {
    setEditGrupoId(null);
    setGNombre('');
    setGZona('');
    setGLider('');
    setGDia('Lunes');
    setGHora('19:00');
    setGCap('15');
    setGLugar('');
    setGMeta('');
  };

  const openEditGrupo = (id: string) => {
    const g = grupos.find(x => x.id === id);
    if (!g) return;
    
    setEditGrupoId(id);
    setGNombre(g.nombre);
    setGZona(g.zona);
    setGLider(g.lider);
    setGDia(g.dia);
    setGHora(g.hora);
    setGCap(g.capacidad);
    setGLugar(g.lugar);
    setGMeta(String(g.planOfrendasMensual || ''));
  };

  const saveGrupo = async (): Promise<{ success: boolean; message: string }> => {
    if (!gNombre.trim()) {
      return { success: false, message: 'El nombre del grupo es obligatorio' };
    }
    if (!gZona) {
      return { success: false, message: 'Selecciona una zona' };
    }
    if (!gLider.trim()) {
      return { success: false, message: 'Indica el líder del grupo' };
    }

    const data = {
      nombre: gNombre.trim(),
      zona: gZona,
      lider: gLider.trim(),
      dia: gDia,
      hora: gHora,
      capacidad: gCap,
      lugar: gLugar.trim(),
      planOfrendasMensual: parseInt(gMeta) || 0,
    };

    try {
      if (editGrupoId) {
        await db.grupos.update(editGrupoId, data);
        return { success: true, message: `Grupo "${gNombre}" actualizado` };
      } else {
        await db.grupos.add({
          id: uuid(),
          ...data,
          miembros: 0,
        });
        return { success: true, message: `Grupo "${gNombre}" creado` };
      }
    } catch (error) {
      console.error('Error al guardar grupo:', error);
      return { success: false, message: 'Error al guardar. Intenta nuevamente.' };
    }
  };

  const delGrupo = async (id: string): Promise<void> => {
    await db.grupos.delete(id);
  };

  return {
    // Datos
    grupos,
    convs,
    miembros,
    zonas,
    gruposFiltrados,
    getGrupoMetrics,
    
    // Filtros
    searchG,
    setSearchG,
    filterGZona,
    setFilterGZona,
    filterGEstado,
    setFilterGEstado,
    filterGDia,
    setFilterGDia,
    
    // Formulario
    editGrupoId,
    gNombre,
    setGNombre,
    gZona,
    setGZona,
    gLider,
    setGLider,
    gDia,
    setGDia,
    gHora,
    setGHora,
    gCap,
    setGCap,
    gLugar,
    setGLugar,
    gMeta,
    setGMeta,
    
    // Acciones
    resetGrupo,
    openEditGrupo,
    saveGrupo,
    delGrupo,
  };
}
