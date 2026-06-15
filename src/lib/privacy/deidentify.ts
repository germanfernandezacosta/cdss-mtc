// src/lib/privacy/deidentify.ts
// Anonimización de datos de paciente — v3.0
// Hash determinista: SHA-256(nombre|DOB|patientId|email)
// patientId es NULLABLE: si es null, no se incluye en el hash
// Esto permite que pacientes sin ID tengan consultas independientes
// y al asignarles ID, se vinculen automáticamente al historial

import { createHash } from 'crypto';

export interface PatientPII {
  name: string;
  dob: string;           // YYYY-MM-DD
  email?: string;
  phone?: string;
  address?: string;
  symptoms: string;
  medicalHistory?: string;
}

export interface AnonymizedPatient {
  patientHash: string;           // SHA-256 truncado (irreversible)
  ageRange: string;              // "30-39" en vez de fecha exacta
  gender?: string;
  symptoms: string;              // Limpio de PII
  medicalHistory: string;        // Limpio de PII
  metadata: {
    originalKeysRemoved: string[];
    anonymizationVersion: string;
    timestamp: string;
  };
}

// Regex para detectar PII en texto libre
const PII_PATTERNS = [
  { regex: /\b[A-Z][a-z]+ [A-Z][a-z]+(?: [A-Z][a-z]+)?\b/g, replacement: '[NOMBRE]' },
  { regex: /\b\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}\b/g, replacement: '[FECHA]' },
  { regex: /\b\d{2,4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2}\b/g, replacement: '[FECHA]' },
  { regex: /\b\d{9,15}\b/g, replacement: '[TELEFONO]' },
  { regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, replacement: '[EMAIL]' },
  { regex: /\b\d{1,5}\s+[^\n]{10,50}\b/g, replacement: '[DIRECCION]' },
];

function sanitizeFreeText(text: string): string {
  if (!text) return '';
  let cleaned = text;
  for (const pattern of PII_PATTERNS) {
    cleaned = cleaned.replace(pattern.regex, pattern.replacement);
  }
  return cleaned;
}

function extractGender(text: string): string | undefined {
  const lower = text.toLowerCase();
  if (lower.includes('femenino') || lower.includes('mujer') || lower.includes('female')) return 'F';
  if (lower.includes('masculino') || lower.includes('hombre') || lower.includes('male')) return 'M';
  return undefined;
}

function getAgeRange(dob: string): string {
  try {
    const birth = new Date(dob);
    const now = new Date();
    const age = now.getFullYear() - birth.getFullYear();
    const floor = Math.floor(age / 10) * 10;
    return `${floor}-${floor + 9}`;
  } catch {
    return 'unknown';
  }
}

/**
 * Genera hash determinista del paciente.
 * Si patientId existe, se incluye en el payload → hash vinculado a historial.
 * Si patientId es null/undefined, se omite → hash independiente (primera vez).
 */
function generatePatientHash(data: PatientPII, patientId?: string | null): string {
  const idPart = patientId ? `|${patientId.trim().toLowerCase()}` : '';
  const payload = `${data.name.trim().toLowerCase()}|${data.dob}${idPart}|${(data.email || '').toLowerCase()}`;
  return createHash('sha256')
    .update(payload)
    .digest('hex')
    .substring(0, 16);
}

/**
 * Recalcula el hash cuando se añade/modifica patientId.
 * Usado cuando el terapeuta asigna un ID post-consulta.
 */
export function recalculateHash(
  name: string,
  dob: string,
  email: string | undefined,
  patientId: string | null
): string {
  return generatePatientHash({ name, dob, email, symptoms: '' }, patientId);
}

export function auditAnonymization(data: AnonymizedPatient): { clean: boolean; findings: string[] } {
  const findings: string[] = [];
  const textToCheck = data.symptoms + ' ' + data.medicalHistory;
  if (/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}/.test(textToCheck)) findings.push('Email detectado');
  if (/\b\d{9,15}\b/.test(textToCheck)) findings.push('Teléfono detectado');
  if (/\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/.test(textToCheck)) findings.push('Fecha exacta detectada');
  return { clean: findings.length === 0, findings };
}

export function deidentifyPatient(data: PatientPII, patientId?: string | null): AnonymizedPatient {
  const removed: string[] = ['name', 'dob'];
  if (data.email) removed.push('email');
  if (data.phone) removed.push('phone');
  if (data.address) removed.push('address');

  return {
    patientHash: generatePatientHash(data, patientId),
    ageRange: getAgeRange(data.dob),
    gender: extractGender(data.symptoms + ' ' + (data.medicalHistory || '')),
    symptoms: sanitizeFreeText(data.symptoms),
    medicalHistory: sanitizeFreeText(data.medicalHistory || ''),
    metadata: {
      originalKeysRemoved: removed,
      anonymizationVersion: 'v3.0-patientId-nullable',
      timestamp: new Date().toISOString()
    }
  };
}