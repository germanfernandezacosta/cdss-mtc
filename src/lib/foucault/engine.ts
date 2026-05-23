import { createHash } from 'crypto';
import { FoucaultInput, FoucaultOutput, AHPRAFlag } from './types';
import { buildForensicHtml } from './forensic-builder';
import { buildEmpathicHtml } from './empathic-builder';
import { scanTextForAHPRA } from './ahpra-filter';

function computeSHA256(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

export async function generateDoublePdf(input: FoucaultInput): Promise<FoucaultOutput> {
  const chainOfCustody: string[] = [];
  const now = new Date().toISOString();
  chainOfCustody.push(`[${now}] FOUCAULT engine initialized`);

  const originalScan = scanTextForAHPRA(
    `${input.clinicalInput.symptoms} ${input.clinicalInput.pulse} ${input.clinicalInput.tongue}`,
    'original_input'
  );

  const forensicHtml = buildForensicHtml(input);
  const forensicBase64 = Buffer.from(forensicHtml).toString('base64');
  chainOfCustody.push(`[${now}] Forensic HTML rendered (${forensicHtml.length} chars)`);

  const { html: empathicHtml, flags: empathicFlags } = buildEmpathicHtml(input);
  const empathicBase64 = Buffer.from(empathicHtml).toString('base64');
  chainOfCustody.push(`[${now}] Empathic HTML rendered (${empathicHtml.length} chars)`);

  const forensicHash = computeSHA256(forensicHtml);
  const empathicHash = computeSHA256(empathicHtml);
  chainOfCustody.push(`[${now}] SHA-256 hashes computed`);

  const allFlags: AHPRAFlag[] = [...originalScan.flags, ...empathicFlags];
  if (allFlags.length > 0) {
    chainOfCustody.push(`[${now}] AHPRA filter triggered: ${allFlags.length} flag(s)`);
  } else {
    chainOfCustody.push(`[${now}] AHPRA filter: clean`);
  }

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