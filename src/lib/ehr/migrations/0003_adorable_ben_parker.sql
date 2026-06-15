-- Migration v3.0 CORREGIDA
-- NO renombrar consultation_history. Crear tablas nuevas desde cero.

-- 1. Crear tabla patients (nueva)
CREATE TABLE IF NOT EXISTS `patients` (
    `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    `ehr_id` text(20) NOT NULL,
    `name` text NOT NULL,
    `dob` text(10) NOT NULL,
    `email` text,
    `phone` text,
    `address` text,
    `patient_id` text(50),
    `created_at` text(30) DEFAULT (datetime('now')),
    `updated_at` text(30) DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS `idx_patients_ehr_id` ON `patients` (`ehr_id`);
CREATE UNIQUE INDEX IF NOT EXISTS `idx_patients_patient_id` ON `patients` (`patient_id`);
CREATE INDEX IF NOT EXISTS `idx_patients_name` ON `patients` (`name`);
CREATE INDEX IF NOT EXISTS `idx_patients_dob` ON `patients` (`dob`);

-- 2. Crear tabla documents (nueva)
CREATE TABLE IF NOT EXISTS `documents` (
    `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    `ehr_id` text(20) NOT NULL,
    `consultation_id` integer,
    `type` text(10) NOT NULL,
    `file_name` text NOT NULL,
    `file_data` blob NOT NULL,
    `created_at` text(30) DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS `idx_documents_ehr_id` ON `documents` (`ehr_id`);
CREATE INDEX IF NOT EXISTS `idx_documents_consultation` ON `documents` (`consultation_id`);
CREATE INDEX IF NOT EXISTS `idx_documents_type` ON `documents` (`type`);

-- 3. Crear tabla clinic_config (nueva)
CREATE TABLE IF NOT EXISTS `clinic_config` (
    `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    `clinic_name` text,
    `therapist_name` text,
    `therapist_license` text,
    `therapist_qualification` text,
    `logo_data` blob,
    `address` text,
    `phone` text,
    `email` text,
    `updated_at` text(30) DEFAULT (datetime('now'))
);

-- 4. Añadir columnas nuevas a consultations
--ALTER TABLE `consultations` ADD COLUMN `ehr_id` text(20);
--ALTER TABLE `consultations` ADD COLUMN `reasoning` text;
--ALTER TABLE `consultations` ADD COLUMN `sources` text;

-- 5. Crear índice nuevo en consultations
CREATE INDEX IF NOT EXISTS `idx_consultation_ehr_id` ON `consultations` (`ehr_id`);

-- 6. Migrar datos: crear pacientes desde consultations existentes
INSERT INTO `patients` (`ehr_id`, `name`, `dob`, `patient_id`, `created_at`)
SELECT 
    'EHR-2026-' || substr(upper(hex(randomblob(2))), 1, 5) || '-' || row_number() OVER (ORDER BY patient_hash),
    'Paciente ' || substr(patient_hash, 1, 8),
    '1900-01-01',
    NULL,
    datetime('now')
FROM (SELECT DISTINCT patient_hash FROM consultations);

-- 7. Vincular consultations con patients
UPDATE `consultations` 
SET `ehr_id` = (
    SELECT `ehr_id` 
    FROM `patients` 
    WHERE `name` = 'Paciente ' || substr(`consultations`.`patient_hash`, 1, 8)
    LIMIT 1
);

-- 8. Eliminar tabla consultation_history (redundante)
DROP TABLE IF EXISTS `consultation_history`;

-- 9. Recrear índices de consultations
CREATE INDEX IF NOT EXISTS `idx_consultation_patient_hash` ON `consultations` (`patient_hash`);
CREATE INDEX IF NOT EXISTS `idx_consultation_date` ON `consultations` (`consultation_date`);
CREATE INDEX IF NOT EXISTS `idx_consultation_kant_status` ON `consultations` (`kant_status`);
CREATE INDEX IF NOT EXISTS `idx_consultation_patient_date` ON `consultations` (`patient_hash`, `consultation_date`);
CREATE INDEX IF NOT EXISTS `idx_consultation_is_test` ON `consultations` (`is_test`);
CREATE INDEX IF NOT EXISTS `idx_consultation_language` ON `consultations` (`language`);
CREATE INDEX IF NOT EXISTS `idx_consultation_forensic_hash` ON `consultations` (`foucault_forensic_hash`);
CREATE INDEX IF NOT EXISTS `idx_consultation_empathic_hash` ON `consultations` (`foucault_empathic_hash`);
CREATE INDEX IF NOT EXISTS `idx_consultation_practitioner` ON `consultations` (`practitioner_registration`);
CREATE INDEX IF NOT EXISTS `idx_consultation_referral` ON `consultations` (`referral_needed`);
