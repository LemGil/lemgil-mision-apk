-- LemGilDB - Seguridad: RLS y Políticas de Acceso
-- Requiere: usuario creado en Authentication > Users con email y PIN
-- Configurar en .env: VITE_SUPABASE_EMAIL, VITE_SUPABASE_PASSWORD

-- 1. Función para actualizar timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

-- 2. Agregar columnas version y updated_at donde falten
DO $$
DECLARE
  tables TEXT[] := ARRAY[
    'conversiones', 'grupos', 'evangelismos', 'cursos', 'lecciones',
    'estudiantes', 'certificados', 'dadores', 'aportes', 'beneficiarios',
    'campanas', 'entregas', 'metas', 'negocios', 'publicaciones',
    'reportes', 'miembroscomun', 'colaboradores', 'aportescomun',
    'miembros', 'ministerios', 'miembrosministerios', 'hitos', 'zonas'
  ];
  t TEXT;
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1', t);
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()', t);
  END LOOP;
END;
$$;

-- 3. Habilitar RLS en TODAS las tablas
DO $$
DECLARE
  tables TEXT[] := ARRAY[
    'conversiones', 'grupos', 'evangelismos', 'cursos', 'lecciones',
    'estudiantes', 'certificados', 'dadores', 'aportes', 'beneficiarios',
    'campanas', 'entregas', 'metas', 'negocios', 'publicaciones',
    'reportes', 'miembroscomun', 'colaboradores', 'aportescomun',
    'miembros', 'ministerios', 'miembrosministerios', 'hitos', 'zonas'
  ];
  t TEXT;
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END;
$$;

-- 4. Políticas: solo usuarios autenticados pueden hacer CRUD
DO $$
DECLARE
  tables TEXT[] := ARRAY[
    'conversiones', 'grupos', 'evangelismos', 'cursos', 'lecciones',
    'estudiantes', 'certificados', 'dadores', 'aportes', 'beneficiarios',
    'campanas', 'entregas', 'metas', 'negocios', 'publicaciones',
    'reportes', 'miembroscomun', 'colaboradores', 'aportescomun',
    'miembros', 'ministerios', 'miembrosministerios', 'hitos', 'zonas'
  ];
  t TEXT;
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS accion_autenticado ON %I', t);
    EXECUTE format(
      'CREATE POLICY accion_autenticado ON %I FOR ALL TO authenticated USING (true) WITH CHECK (true)',
      t
    );
  END LOOP;
END;
$$;
