-- LemGilDB - Esquema y Migraciones de Seguridad

-- 1. Crear una función genérica para actualizar el timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

-- 2. Migración: Añadir version y updated_at a tablas críticas

-- Estudiantes
ALTER TABLE estudiantes 
ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

DROP TRIGGER IF EXISTS update_estudiantes_updated_at ON estudiantes;
CREATE TRIGGER update_estudiantes_updated_at
BEFORE UPDATE ON estudiantes
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Miembros
ALTER TABLE miembros 
ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

DROP TRIGGER IF EXISTS update_miembros_updated_at ON miembros;
CREATE TRIGGER update_miembros_updated_at
BEFORE UPDATE ON miembros
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3. Habilitar RLS y políticas de acceso público (anon)

ALTER TABLE estudiantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE miembros ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acceso público CRUD en estudiantes" ON estudiantes;
CREATE POLICY "Acceso público CRUD en estudiantes" ON estudiantes
FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acceso público CRUD en miembros" ON miembros;
CREATE POLICY "Acceso público CRUD en miembros" ON miembros
FOR ALL TO anon USING (true) WITH CHECK (true);
