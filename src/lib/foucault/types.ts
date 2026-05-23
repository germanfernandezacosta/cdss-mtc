import { FukuokaProposal, KANTResult } from '@/lib/kant/validator';

export interface FoucaultPatientContext {
  id?: string;
  age?: number;
  sex?: string;
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
    data: FukuokaProposal;
  };
  kantResult: KANTResult;
  generatedAt: string;
}

export interface AHPRAFlag {
  ruleId: string;
  term: string;
  location: 'empathic_content' | 'original_input';
  severity: 'CRITICAL' | 'WARNING';
  replacement: string;
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
