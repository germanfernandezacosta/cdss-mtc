import { FoucaultInput, FoucaultOutput, AHPRAFlag } from './types';
import { buildForensicData } from './forensic-builder';
import { buildEmpathicData } from './empathic-builder';
import { scanTextForAHPRA, validateScopeOfPractice, validateTGAClaims } from './ahpra-filter';

/**
 * Calcula SHA-256 de forma compatible con servidor (Node.js) y cliente (navegador).
 * Usa dynamic import para crypto en servidor, y Web Crypto API en cliente.
 */
async function computeSHA256(text: string): Promise<string> {
  if (typeof window === 'undefined') {
    // Server-side: Node.js crypto (dynamic import para evitar problemas de bundle)
    const crypto = await import('crypto');
    return crypto.createHash('sha256').update(text).digest('hex');
  }
  // Client-side: Web Crypto API (disponible en todos los navegadores modernos)
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
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
  // Forense: objeto plano para pdfmake (nueva arquitectura v2.2)
  const forensicData = buildForensicData(input);
  const forensicDataJson = JSON.stringify(forensicData);
  chainOfCustody.push(`[${now}] Forensic data object built (${forensicDataJson.length} chars JSON)`);

  // Empático: objeto plano para pdfmake (nueva arquitectura v2.2)
  const empathicData = buildEmpathicData(input);
  const empathicDataJson = JSON.stringify(empathicData);
  chainOfCustody.push(`[${now}] Empathic data object built (${empathicDataJson.length} chars JSON)`);

  const forensicHash = await computeSHA256(forensicDataJson);
  const empathicHash = await computeSHA256(empathicDataJson);
  chainOfCustody.push(`[${now}] SHA-256 hashes computed`);

  // ─── Consolidar todas las flags ───
  const allFlags: AHPRAFlag[] = [
    ...originalScan.flags,
    ...tgaCheck.flags,
    ...(scopeCheck.violations.map((v: { type: string; condition?: string; procedure?: string; severity: string; reason: string }) => ({
      ruleId: v.type === 'MANDATORY_REFERRAL' ? `AHPRA-REF-${v.condition?.substring(0, 3).toUpperCase() || 'UNK'}` : `AHPRA-SCOPE-${v.procedure?.substring(0, 3).toUpperCase() || 'UNK'}`,
      term: v.condition || v.procedure || 'unknown',
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
  // NOTA: forensicPdfBase64 y empathicPdfBase64 ahora contienen JSON base64
  // de los objetos ForensicPdfData / EmpathicPdfData.
  // El frontend debe decodificarlos y pasarlos a generateForensicPDF() / generateEmpathicPDF() de pdfmake.
  return {
    forensicPdfBase64: Buffer.from(forensicDataJson).toString('base64'),
    empathicPdfBase64: Buffer.from(empathicDataJson).toString('base64'),
    auditLog: {
      ahpraFlags: allFlags,
      generationTimestamp: now,
      documentHashes: { forensic: forensicHash, empathic: empathicHash },
      chainOfCustody,
    },
  };
}