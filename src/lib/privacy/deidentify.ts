// src/lib/privacy/deidentify.ts
// Anonimización de datos de paciente — v1.0-local
// Ejecuta ANTES de enviar a cualquier API externa (OpenRouter, Azure, etc.)
// Cumple principios de Privacy by Design para TGA Australia / APPs

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
  { regex: /\b[A-Z][a-z]+ [A-Z][a-z]+(?: [A-Z][a-z]+)?\b/g, replacement: '[NOMBRE]' },      // Nombres propios
  { regex: /\b\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}\b/g, replacement: '[FECHA]' },     // Fechas
  { regex: /\b\d{2,4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2}\b/g, replacement: '[FECHA]' },     // Fechas ISO-like
  { regex: /\b\d{9,15}\b/g, replacement: '[TELEFONO]' },                                    // Teléfonos
  { regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, replacement: '[EMAIL]' }, // Emails
  { regex: /\b\d{1,5}\s+[^\n]{10,50}\b/g, replacement: '[DIRECCION]' },                    // Direcciones simples
];

/**
 * Elimina PII de texto libre usando regex.
 * NOTA: Para producción TGA, considerar integrar Microsoft Presidio
 * o Azure Cognitive Services (cuando esté en australiaeast).
 */
function sanitizeFreeText(text: string): string {
  if (!text) return '';

  let cleaned = text;
  for (const pattern of PII_PATTERNS) {
    cleaned = cleaned.replace(pattern.regex, pattern.replacement);
  }
  return cleaned;
}

/**
 * Extrae género del texto si está explícito.
 */
function extractGender(text: string): string | undefined {
  const lower = text.toLowerCase();
  if (lower.includes('femenino') || lower.includes('mujer') || lower.includes('female')) return 'F';
  if (lower.includes('masculino') || lower.includes('hombre') || lower.includes('male')) return 'M';
  return undefined;
}

/**
 * Calcula rango de edad a partir de fecha de nacimiento.
 * Generaliza para reducir identificabilidad.
 */
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
 * Genera hash irreversible del paciente para trazabilidad interna.
 * Truncado a 16 chars para no exponer hash completo.
 */
function generatePatientHash(data: PatientPII): string {
  const payload = `${data.name.trim().toLowerCase()}|${data.dob}|${(data.email || '').toLowerCase()}`;
  return createHash('sha256')
    .update(payload)
    .digest('hex')
    .substring(0, 16);
}

/**
 * ANONIMIZACIÓN PRINCIPAL.
 * Ejecutar ESTO antes de cualquier llamada a API externa.
 */
export function deidentifyPatient(data: PatientPII): AnonymizedPatient {
  const removed: string[] = ['name', 'dob'];
  if (data.email) removed.push('email');
  if (data.phone) removed.push('phone');
  if (data.address) removed.push('address');

  return {
    patientHash: generatePatientHash(data),
    ageRange: getAgeRange(data.dob),
    gender: extractGender(data.symptoms + ' ' + (data.medicalHistory || '')),
    symptoms: sanitizeFreeText(data.symptoms),
    medicalHistory: sanitizeFreeText(data.medicalHistory || ''),
    metadata: {
      originalKeysRemoved: removed,
      anonymizationVersion: 'v1.0-local',
      timestamp: new Date().toISOString()
    }
  };
}

/**
 * Verificación rápida: ¿quedó algún PII obvio?
 * Útil para tests y auditoría.
 */
export function auditAnonymization(data: AnonymizedPatient): { clean: boolean; findings: string[] } {
  const findings: string[] = [];
  const textToCheck = data.symptoms + ' ' + data.medicalHistory;

  // Revisar si quedaron emails
  if (/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}/.test(textToCheck)) {
    findings.push('Email detectado en texto libre');
  }
  // Revisar si quedaron teléfonos
  if (/\b\d{9,15}\b/.test(textToCheck)) {
    findings.push('Número telefónico detectado');
  }
  // Revisar fechas exactas
  if (/\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/.test(textToCheck)) {
    findings.push('Fecha exacta detectada');
  }

  return {
    clean: findings.length === 0,
    findings
  };
}

export default deidentifyPatient;