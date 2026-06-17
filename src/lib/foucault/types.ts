/**
 * Foucault v2.2 — Tipos del agente archivista
 * Adaptado a KANT v2.2 con campos legacy para compatibilidad.
 */

import { KantResult } from "@/lib/kant/types-compat";

export interface FoucaultPatientContext {
  id: string;
  age: number;
  sex: "M" | "F"; // MTC: Masculino (Yang) / Femenino (Yin)
  patientHash?: string;
  pregnancy?: {
    active: boolean;
    trimester?: number;
    weeks?: number;
  };
}

export interface FoucaultClinicalInput {
  symptoms: string;
  pulse: string;
  tongue: string;
  ryodoraku?: string;
}

export interface FoucaultInput {
  patient: FoucaultPatientContext;
  clinicalInput: FoucaultClinicalInput;
  fukuokaResult: {
    request_id: string;
    data: {
      syndrome_analysis: Array<{
        syndrome_name: string;
        confidence: number;
        supporting_evidence: string[];
      }>;
      treatment_proposal: {
        acupuncture_points: string[];
        herbal_formula: string | null;
        rationale: string;
      };
    };
  };
  kantResult: KantResult;
  generatedAt: string;
}

export interface AHPRAFlag {
  ruleId: string;
  term: string;
  location: "empathic_content" | "original_input" | "forensic_content";
  severity: "CRITICAL" | "WARNING" | "ADVISORY";
  replacement: string;
  reason: string;
}

export interface FoucaultOutput {
  forensicPdfBase64: string;
  empathicPdfBase64: string;
  auditLog: {
    ahpraFlags: AHPRAFlag[];
    generationTimestamp: string;
    documentHashes: {
      forensic: string;
      empathic: string;
    };
    chainOfCustody: string[];
  };
}
