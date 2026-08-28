/**
 * Hook personalizado para gestionar datos y lógica de conversiones
 */

import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { v4 as uuid } from 'uuid';
import { db } from '../../../lib/database';
import type { Conversion } from '../../types/mision';
import { syncMemberFromConversion, today } from '../utils/conversionSync';
import { ESTADOS } from '../utils/statePipeline';

export function useConversiones() {
  // Datos reactivos desde Dexie
  const convs = useLiveQuery(() => db.conversiones.toArray(), []) ?? [];
  const grupos = useLiveQuery(() => db.grupos.toArray(), []) ?? [];
  const miembros = useLiveQuery(() => db.miembros.toArray(), []) ?? [];
  const zonas = useLiveQuery(() => db.zonas.toArray(), []) ?? [];

  // Estado local para filtros
  const [search, setSearch] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [filterZona, setFilterZona] = useState('');
  const [showIntegrados, setShowIntegrados] = useState(false);

  // Estado para el formulario
  const [editConvId, setEditConvId] = useState<string | null>(null);
  const [fNombre, setFNombre] = useState('');
  const [fApellido, setFApellido] = useState('');
  const [fTelefono, setFTelefono] = useState('');
  const [fEdad, setFEdad] = useState('');
  const [fDireccion, setFDireccion] = useState('');
  const [fFamilia, setFFamilia] = useState('No');
  const [fFecha, setFFecha] = useState(today());
  const [fZona, setFZona] = useState('');
  const [fLider, setFLider] = useState('');
  const [fLiderCustom, setFLiderCustom] = useState(false);
  const [fEstado, setFEstado] = useState('Nuevo');
  const [fGrupoId, setFGrupoId] = useState('');
  const [fNotas, setFNotas] = useState('');
  const [fEmail, setFEmail] = useState('');
  const [fProfesion, setFProfesion] = useState('');
  const [fBautizado, setFBautizado] = useState(false);
  const [fFechaBautismo, setFFechaBautismo] = useState('');
  const [fConyuge, setFConyuge] = useState('');
  const [fHijos, setFHijos] = useState('');

  // Métricas derivadas
  const metrics = useMemo(() => {
    const mo = new Date().toISOString().slice(0, 7);
    return {
      total: convs.length,
      esteMes: convs.filter(c => c.fecha?.startsWith(mo)).length,
      discipulado: convs.filter(c => c.estado === 'Discipulado').length,
      bautizados: convs.filter(c => c.estado === 'Bautizado').length,
      integrados: convs.filter(c => c.estado === 'Integrado').length,
      apartados: convs.filter(c => c.estado === 'Apartado').length,
      fallecidos: convs.filter(c => c.estado === 'Fallecido').length,
    };
  }, [convs]);

  // Conversiones filtradas
  const filtered = useMemo(() => {
    return convs.filter(c => {
      if (!showIntegrados && c.estado === 'Integrado') return false;
      const s = `${c.nombre} ${c.apellido} ${c.zona} ${c.lider}`.toLowerCase();
      return (
        (!search || s.includes(search.toLowerCase())) &&
        (!filterEstado || c.estado === filterEstado) &&
        (!filterZona || c.zona === filterZona)
      );
    });
  }, [convs, search, filterEstado, filterZona, showIntegrados]);

  // Acciones
  const resetForm = () => {
    setEditConvId(null);
    setFNombre('');
    setFApellido('');
    setFTelefono('');
    setFEdad('');
    setFDireccion('');
    setFFamilia('No');
    setFFecha(today());
    setFZona('');
    setFLider('');
    setFLiderCustom(false);
    setFEstado('Nuevo');
    setFGrupoId('');
    setFNotas('');
    setFEmail('');
    setFProfesion('');
    setFBautizado(false);
    setFFechaBautismo('');
    setFConyuge('');
    setFHijos('');
  };

  const openEditConv = (id: string) => {
    const c = convs.find(x => x.id === id);
    if (!c) return;
    
    setEditConvId(id);
    setFNombre(c.nombre);
    setFApellido(c.apellido);
    setFTelefono(c.telefono);
    setFEdad(c.edad);
    setFDireccion(c.direccion);
    setFFamilia(c.familia);
    setFFecha(c.fecha);
    setFZona(c.zona);
    setFLider(c.lider);
    
    const enLista = miembros.some(m => `${m.nombre} ${m.apellido}` === c.lider);
    setFLiderCustom(!enLista && !!c.lider);
    setFEstado(c.estado);
    setFGrupoId(c.grupoId || '');
    setFNotas(c.notas);
    setFEmail(c.email || '');
    setFProfesion(c.profesion || '');
    setFBautizado(!!c.bautizado);
    setFFechaBautismo(c.fechaBautismo || '');
    setFConyuge(c.conyuge || '');
    setFHijos(c.hijos || '');
  };

  const saveConv = async (): Promise<{ success: boolean; message: string }> => {
    if (!fNombre.trim() || !fApellido.trim()) {
      return { success: false, message: 'Nombre y apellido son obligatorios' };
    }
    if (!fZona) {
      return { success: false, message: 'Selecciona una zona' };
    }
    if (!fLider.trim()) {
      return { success: false, message: 'Selecciona o escribe el hermano mayor' };
    }

    const data = {
      nombre: fNombre.trim(),
      apellido: fApellido.trim(),
      telefono: fTelefono.trim(),
      edad: fEdad,
      direccion: fDireccion.trim(),
      familia: fFamilia,
      fecha: fFecha,
      zona: fZona,
      lider: fLider.trim(),
      grupoId: fGrupoId,
      estado: fEstado as Conversion['estado'],
      notas: fNotas.trim(),
      hermanoMayorId: null,
      email: fEmail.trim(),
      profesion: fProfesion.trim(),
      bautizado: fBautizado,
      fechaBautismo: fFechaBautismo,
      conyuge: fConyuge.trim(),
      hijos: fHijos.trim(),
    };

    try {
      if (editConvId) {
        await db.conversiones.update(editConvId, data);
        const c = convs.find(x => x.id === editConvId);
        if (c) {
          const synced = await syncMemberFromConversion({ ...c, ...data });
          if (synced) {
            return { success: true, message: `🧑 ${fNombre} integrado → Miembros` };
          }
        }
        return { success: true, message: `${fNombre} ${fApellido} actualizado/a` };
      } else {
        const id = uuid();
        const nuevo: Conversion = {
          id,
          ...data,
          historial: [],
          creado: new Date().toISOString(),
        };
        await db.conversiones.add(nuevo);
        const synced = await syncMemberFromConversion(nuevo);
        return {
          success: true,
          message: synced
            ? `🧑 ${fNombre} registrado e integrado → Miembros`
            : `${fNombre} ${fApellido} guardado/a correctamente`,
        };
      }
    } catch (error) {
      console.error('Error al guardar conversión:', error);
      return { success: false, message: 'Error al guardar. Intenta nuevamente.' };
    }
  };

  const delConv = async (id: string): Promise<void> => {
    await db.conversiones.delete(id);
  };

  const quickAdv = async (id: string): Promise<{ success: boolean; message: string }> => {
    const c = convs.find(x => x.id === id);
    if (!c) return { success: false, message: 'Conversión no encontrada' };
    
    if (c.estado === 'Apartado' || c.estado === 'Fallecido') {
      return { success: false, message: 'No se puede avanzar desde este estado' };
    }
    
    const i = ESTADOS.indexOf(c.estado);
    if (i >= 0 && i < ESTADOS.length - 1) {
      const next = ESTADOS[i + 1];
      await db.conversiones.update(id, {
        estado: next,
        historial: [...c.historial, { fecha: today(), estado: next, nota: 'Avance rápido' }],
      });
      const synced = await syncMemberFromConversion({ ...c, estado: next });
      return {
        success: true,
        message: synced
          ? `🧑 ${c.nombre} integrado → Miembros`
          : `${c.nombre} avanzó a ${next}`,
      };
    }
    
    return { success: false, message: 'Ya está en el último estado' };
  };

  const updateEstado = async (
    id: string,
    nuevoEstado: Conversion['estado'],
    nota: string,
    crearHito: boolean
  ): Promise<{ success: boolean; message: string }> => {
    const c = convs.find(x => x.id === id);
    if (!c) return { success: false, message: 'Conversión no encontrada' };

    const hist = [...c.historial];
    if (nota.trim() || nuevoEstado !== c.estado) {
      hist.push({
        fecha: today(),
        estado: nuevoEstado,
        nota: nota.trim() || `Estado: ${c.estado} → ${nuevoEstado}`,
      });
    }

    await db.conversiones.update(id, {
      estado: nuevoEstado,
      historial: hist,
    });

    const synced = await syncMemberFromConversion({ ...c, estado: nuevoEstado });
    
    let hitoCreado = false;
    if (crearHito && nota.trim()) {
      const vinculado = await db.miembros.where('conversionId').equals(id).first();
      if (vinculado) {
        await db.hitos.add({
          id: uuid(),
          miembroId: vinculado.id,
          fecha: today(),
          tipo: 'Otro',
          descripcion: nota.trim(),
          creado: new Date().toISOString(),
        });
        hitoCreado = true;
      }
    }

    let msg = synced ? '🧑 Integrado → Miembros' : 'Seguimiento guardado';
    if (hitoCreado) msg += ' + Hito';
    
    return { success: true, message: msg };
  };

  return {
    // Datos
    convs,
    grupos,
    miembros,
    zonas,
    filtered,
    metrics,
    
    // Filtros
    search,
    setSearch,
    filterEstado,
    setFilterEstado,
    filterZona,
    setFilterZona,
    showIntegrados,
    setShowIntegrados,
    
    // Formulario
    editConvId,
    fNombre,
    setFNombre,
    fApellido,
    setFApellido,
    fTelefono,
    setFTelefono,
    fEdad,
    setFEdad,
    fDireccion,
    setFDireccion,
    fFamilia,
    setFFamilia,
    fFecha,
    setFFecha,
    fZona,
    setFZona,
    fLider,
    setFLider,
    fLiderCustom,
    setFLiderCustom,
    fEstado,
    setFEstado,
    fGrupoId,
    setFGrupoId,
    fNotas,
    setFNotas,
    fEmail,
    setFEmail,
    fProfesion,
    setFProfesion,
    fBautizado,
    setFBautizado,
    fFechaBautismo,
    setFFechaBautismo,
    fConyuge,
    setFConyuge,
    fHijos,
    setFHijos,
    
    // Acciones
    resetForm,
    openEditConv,
    saveConv,
    delConv,
    quickAdv,
    updateEstado,
  };
}
