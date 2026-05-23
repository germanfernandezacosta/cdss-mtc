export interface TreatmentRequest {
  symptoms: string;
  pulse: string;
  tongue: string;
  ryodoraku?: string;
  patient?: {
    id?: string;
    age?: number;
    sex?: string;
    pregnancy?: {
      active: boolean;
      trimester?: number;
      weeks?: number;
    };
  };
}

export interface TreatmentResponse {
  success: boolean;
  fukuoka: {
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
  kant: {
    verdict: 'VERDE' | 'AMARILLO' | 'ROJO';
    violations: Array<{
      ruleId: string;
      severity: string;
      category: string;
      message: string;
    }>;
    evaluatedAt: string;
    totalRulesChecked: number;
  };
  foucault: {
    forensicHash: string;
    empathicHash: string;
    ahpraFlags: Array<{
      ruleId: string;
      term: string;
      severity: string;
    }>;
    chainOfCustody: string[];
    pdfs: {
      forensic: string;
      empathic: string;
    };
  };
  _warning: string;
}

export async function submitTreatment(data: TreatmentRequest): Promise<TreatmentResponse> {
  const res = await fetch('/api/treatment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }

  return res.json();
}

export function decodeBase64Html(base64: string): string {
  if (typeof window === 'undefined') return '';
  try {
    return atob(base64);
  } catch {
    return '';
  }
}