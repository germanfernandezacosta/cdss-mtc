import { createHash } from 'crypto';
import { FoucaultInput, FoucaultOutput, AHPRAFlag } from './types';
import { buildForensicHtml } from './forensic-builder';
import { buildEmpathicHtml } from './empathic-builder';
import { scanTextForAHPRA, validateScopeOfPractice, validateTGAClaims } from './ahpra-filter';

function computeSHA256(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

export async function generateDoublePdf(input: FoucaultInput): Promise<FoucaultOutput> {
  const chainOfCustody: string[] = [];
  const now = new Date().toISOString();
  chainOfCustody.push(`[${now}] FOUCAULT engine v2.2 initialized`);
  chainOfCustody.push(`[${now}] Patient ID: ${input.patient.id} | Hash: ${input.patient.patientHash || 'N/A'}`);

  // ─── Scan de input original ───
  const inputText = `${input.clinicalInput.symptoms} ${input.clinicalInput.pulse} ${input.clinicalInput.tongue}`;
  const originalScan = scanTextForAHPRA(inputText, 'original_input');
  chainOfCustody.push(`[${now}] AHPRA scan on input: ${originalScan.flags.length} flags`);

  // ─── Validación Scope of Practice ───
  const scopeCheck = validateScopeOfPractice(inputText);
  if (scopeCheck.requiresReferral) {
    chainOfCustody.push(`[${now}] MANDATORY REFERRAL triggered: ${scopeCheck.violations.length} violation(s)`);
  }

  // ─── Validación TGA ───
  const tgaCheck = validateTGAClaims(inputText);
  chainOfCustody.push(`[${now}] TGA scan: ${tgaCheck.flags.length} flags`);

  // ─── Generar documentos ───
  const forensicHtml = buildForensicHtml(input);
  const forensicBase64 = Buffer.from(forensicHtml).toString('base64');
  chainOfCustody.push(`[${now}] Forensic HTML rendered (${forensicHtml.length} chars)`);

  const { html: empathicHtml, flags: empathicFlags } = buildEmpathicHtml(input);
  const empathicBase64 = Buffer.from(empathicHtml).toString('base64');
  chainOfCustody.push(`[${now}] Empathic HTML rendered (${empathicHtml.length} chars)`);

  const forensicHash = computeSHA256(forensicHtml);
  const empathicHash = computeSHA256(empathicHtml);
  chainOfCustody.push(`[${now}] SHA-256 hashes computed`);

  // ─── Consolidar todas las flags ───
  const allFlags: AHPRAFlag[] = [
    ...originalScan.flags,
    ...empathicFlags,
    ...tgaCheck.flags,
    ...(scopeCheck.violations.map((v: any) => ({
      ruleId: v.type === 'MANDATORY_REFERRAL' ? `AHPRA-REF-${v.condition.substring(0,3).toUpperCase()}` : `AHPRA-SCOPE-${v.procedure.substring(0,3).toUpperCase()}`,
      term: v.condition || v.procedure,
      location: "original_input" as const,
      severity: v.severity === "absolute" ? "CRITICAL" as const : "WARNING" as const,
      replacement: v.type === 'MANDATORY_REFERRAL' ? "Derivación médica obligatoria" : "Fuera del scope de práctica",
      reason: v.reason,
    })))
  ];

  if (allFlags.length > 0) {
    chainOfCustody.push(`[${now}] Total regulatory flags: ${allFlags.length} (${allFlags.filter(f => f.severity === 'CRITICAL').length} critical)`);
  } else {
    chainOfCustody.push(`[${now}] All regulatory scans: clean`);
  }

  // ─── Estructura de salida que espera el frontend ───
  return {
    forensicPdfBase64: forensicBase64,
    empathicPdfBase64: empathicBase64,
    auditLog: {
      ahpraFlags: allFlags,
      generationTimestamp: now,
      documentHashes: { forensic: forensicHash, empathic: empathicHash },
      chainOfCustody,
    },
  };
}