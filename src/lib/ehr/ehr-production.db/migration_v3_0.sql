-- Migration v3.0: De v2.2 a v3.0
-- Ejecutar con: sqlite3 data/ehr/ehr-production.db < migration_v3_0.sql
-- O desde Node: db.exec(fs.readFileSync('migration_v3_0.sql', 'utf8'))

-- ═══════════════════════════════════════════════════════════════
-- 1. CREAR NUEVA TABLA patients
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS patients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ehr_id TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    dob TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    address TEXT,
    patient_id TEXT UNIQUE,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_patients_ehr_id ON patients(ehr_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_patients_patient_id ON patients(patient_id);
CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(name);
CREATE INDEX IF NOT EXISTS idx_patients_dob ON patients(dob);

-- ═══════════════════════════════════════════════════════════════
-- 2. CREAR NUEVA TABLA documents (PDFs como BLOB)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ehr_id TEXT NOT NULL,
    consultation_id INTEGER,
    type TEXT NOT NULL CHECK(type IN ('forensic', 'empathic')),
    file_name TEXT NOT NULL,
    file_data BLOB NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_documents_ehr_id ON documents(ehr_id);
CREATE INDEX IF NOT EXISTS idx_documents_consultation ON documents(consultation_id);
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(type);

-- ═══════════════════════════════════════════════════════════════
-- 3. CREAR NUEVA TABLA clinicConfig
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS clinic_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    clinic_name TEXT,
    therapist_name TEXT,
    therapist_license TEXT,
    therapist_qualification TEXT,
    logo_data BLOB,
    address TEXT,
    phone TEXT,
    email TEXT,
    updated_at TEXT DEFAULT (datetime('now'))
);

-- ═══════════════════════════════════════════════════════════════
-- 4. MIGRAR DATOS: Extraer pacientes únicos de consultations
-- ═══════════════════════════════════════════════════════════════

-- Insertar pacientes únicos basados en patient_hash
-- Nota: En v2.2 no había tabla patients, solo patient_hash en consultations
-- Generamos EHR IDs automáticamente para cada hash único

INSERT INTO patients (ehr_id, name, dob, email, patient_id, created_at)
SELECT 
    'EHR-2026-' || substr(upper(hex(randomblob(2))), 1, 5) || '-' || row_number() OVER (ORDER BY patient_hash) as ehr_id,
    'Paciente ' || substr(patient_hash, 1, 8) as name, -- Placeholder, actualizar manualmente
    '1900-01-01' as dob, -- Placeholder, actualizar manualmente
    NULL as email,
    NULL as patient_id, -- En v2.2 no existía patientId, todos empiezan sin ID
    datetime('now') as created_at
FROM (
    SELECT DISTINCT patient_hash FROM consultations
);

-- ═══════════════════════════════════════════════════════════════
-- 5. AÑADIR COLUMNA ehr_id A consultations (nullable temporalmente)
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE consultations ADD COLUMN ehr_id TEXT;

-- Vincular cada consulta con su paciente por hash
UPDATE consultations 
SET ehr_id = (
    SELECT p.ehr_id 
    FROM patients p 
    WHERE p.name = 'Paciente ' || substr(consultations.patient_hash, 1, 8)
    LIMIT 1
);

-- Hacer ehr_id NOT NULL después de la migración
-- Nota: SQLite no soporta ALTER COLUMN, hay que recrear la tabla si hay NULLs

-- ═══════════════════════════════════════════════════════════════
-- 6. AÑADIR COLUMNA reasoning A consultations
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE consultations ADD COLUMN reasoning TEXT;

-- ═══════════════════════════════════════════════════════════════
-- 7. AÑADIR COLUMNA sources A consultations
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE consultations ADD COLUMN sources TEXT;

-- ═══════════════════════════════════════════════════════════════
-- 8. CREAR ÍNDICE ehr_id EN consultations
-- ═══════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_consultation_ehr_id ON consultations(ehr_id);

-- ═══════════════════════════════════════════════════════════════
-- 9. ELIMINAR TABLA consultationHistory (datos migrados a consultations)
-- ═══════════════════════════════════════════════════════════════

-- Primero verificar que no haya datos importantes no migrados
-- En v2.2, consultationHistory tenía summarySectionA/B/C
-- En v3.0, esa info se extrae de consultations.empathicNarrative y rationale

-- DROP TABLE IF EXISTS consultation_history;
-- DESCOMENTAR la línea anterior después de verificar que todo está OK

-- ═══════════════════════════════════════════════════════════════
-- 10. VERIFICACIÓN
-- ═══════════════════════════════════════════════════════════════

SELECT 'Pacientes migrados: ' || COUNT(*) FROM patients;
SELECT 'Consultas con ehr_id: ' || COUNT(*) FROM consultations WHERE ehr_id IS NOT NULL;
SELECT 'Consultas sin ehr_id (revisar): ' || COUNT(*) FROM consultations WHERE ehr_id IS NULL;