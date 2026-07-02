# Guía del Proyecto: Ministerio Apostólico LemGil

## 1. Propósito
Plataforma de gestión integral para el Ministerio Apostólico LemGil, diseñada para funcionar en entornos de conectividad inestable mediante un enfoque *offline-first*.

## 2. Stack Tecnológico
- **Frontend:** React + TypeScript + Vite.
- **Base de Datos (Local):** Dexie.js (IndexedDB).
- **Backend (Nube):** Supabase (PostgreSQL).
- **Sincronización:** Lógica personalizada en `src/lib/sync.ts` (Hooks de Dexie -> Cola LocalStorage -> Supabase).
- **Estilos:** CSS Vanilla (basado en variables temáticas).
- **PWA:** Funcionalidad offline mediante `vite-plugin-pwa`.

## 3. Funcionalidades Principales
- **Sincronización:** Sincronización automática entre IndexedDB y Supabase cuando hay conexión.
- **Gestión Ministerial:**
  - Misión Bíblica (conversiones, hitos).
  - Academia (cursos, lecciones, estudiantes).
  - Bien Común (miembros, colaboradores, aportes/diezmos).
  - Manos Abiertas (campañas de ayuda).
  - Negocios (emprendimientos).
- **Reportes:** Exportación de datos a PDF y CSV.
- **Dashboard:** KPIs en tiempo real.

## 4. Estructura de Módulos (Src)
- `components/`: Componentes UI reutilizables.
- `hooks/`: Hooks personalizados.
- `lib/`: Lógica central (BD, Sync, Migraciones, Exportación, Utilidades).
- `pages/`: Vistas principales.

## 5. Hoja de Ruta de Mejoras (Recomendaciones)

### Prioridad Alta (Robustez)
- [ ] **Tipado Estricto:** Eliminar uso de `any` en `src/lib/sync.ts` y definir interfaces para `SyncOp`.
- [ ] **Seguridad:** Configurar e implementar RLS (Row Level Security) en Supabase (actualmente deshabilitado).
- [ ] **Resolución de Conflictos:** Definir e implementar una estrategia de resolución de conflictos (ej. versionado o timestamps con validación de cambios) para evitar sobreescrituras silenciosas al sincronizar desde múltiples clientes.
    - *Estrategia UX:* Enfoque híbrido. Toast informativo si la sincronización automática logra recuperar la versión del servidor, y Modal de Comparación si el usuario necesita resolver manualmente una pérdida de datos.

### Prioridad Media (Mantenibilidad & DX)
- [ ] **Refactor de Sync:** Modularizar `src/lib/sync.ts` en `queueManager.ts`, `supabaseClient.ts`, y `dexieHooks.ts`.
- [ ] **Pruebas:** Implementar suite de pruebas (Vitest/Jest) para lógica de migración y sincronización.
- [ ] **TypeScript:** Activar `strict: true` en `tsconfig.json`.

### Prioridad Baja (UX & Escalabilidad)
- [ ] **UI Sync:** Mejorar el componente de indicador de sincronización para mostrar progreso de tareas pendientes.
- [ ] **Optimización:** Implementar carga diferida (*lazy loading*) o paginación en vistas de datos grandes (Dashboard/Reportes).
