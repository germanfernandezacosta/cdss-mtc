import { FoucaultInput } from './types';

export function buildForensicHtml(input: FoucaultInput): string {
  const { patient, clinicalInput, fukuokaResult, kantResult, generatedAt } = input;
  const kantColor = kantResult.verdict === 'ROJO' ? '#dc2626' : kantResult.verdict === 'AMARILLO' ? '#d97706' : '#16a34a';

  const violationsHtml = kantResult.violations.length
    ? kantResult.violations.map((v: any) => 
        `<div style="margin: 4px 0; padding: 8px; background: ${v.severity === 'ROJO' ? '#fee2e2' : '#fef3c7'}; border-radius: 4px;">
          <strong>[${v.severity}] ${v.ruleId}:</strong> ${v.message}
        </div>`
      ).join('')
    : '<p style="color: #16a34a;">Ninguna violación detectada.</p>';

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Informe Forense CDSS-MTC</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 40px; color: #1f2937; line-height: 1.5; }
    .header { border-bottom: 3px solid #111827; padding-bottom: 10px; margin-bottom: 20px; }
    .header h1 { margin: 0; font-size: 22px; }
    .meta { font-size: 10px; color: #6b7280; margin-top: 5px; }
    .section { margin: 20px 0; }
    .section h2 { font-size: 14px; color: #374151; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px; margin-bottom: 10px; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    td { padding: 6px 10px; border-bottom: 1px solid #f3f4f6; }
    td:first-child { width: 30%; font-weight: 600; color: #4b5563; background: #f9fafb; }
    .verdict { font-size: 24px; font-weight: bold; color: ${kantColor}; }
    .footer { margin-top: 40px; padding-top: 15px; border-top: 2px solid #e5e7eb; font-size: 9px; color: #6b7280; text-align: center; font-style: italic; }
    .chain { font-size: 9px; color: #9ca3af; background: #f9fafb; padding: 10px; border-radius: 4px; }
    .chain li { margin: 3px 0; }
  </style>
</head>
<body>
  <div class="header">
    <h1>INFORME TÉCNICO FORENSE — CDSS MTC</h1>
    <div class="meta">Generado: ${new Date(generatedAt).toLocaleString('es-ES')} | Request ID: ${fukuokaResult.request_id} | Hash: ${kantResult.originalProposalHash}</div>
  </div>

  <div class="section">
    <h2>1. DATOS DEL PACIENTE</h2>
    <table>
      <tr><td>ID:</td><td>${patient.id || 'NO REGISTRADO'}</td></tr>
      <tr><td>Edad:</td><td>${patient.age ? `${patient.age} años` : 'N/D'}</td></tr>
      <tr><td>Sexo:</td><td>${patient.sex || 'N/D'}</td></tr>
      <tr><td>Embarazo:</td><td>${patient.pregnancy?.active ? `SÍ — T${patient.pregnancy.trimester}, ${patient.pregnancy.weeks} semanas` : 'No declarado'}</td></tr>
    </table>
  </div>

  <div class="section">
    <h2>2. DATOS CLÍNICOS DE ENTRADA</h2>
    <table>
      <tr><td>Síntomas:</td><td>${clinicalInput.symptoms}</td></tr>
      <tr><td>Pulso:</td><td>${clinicalInput.pulse}</td></tr>
      <tr><td>Lengua:</td><td>${clinicalInput.tongue}</td></tr>
      <tr><td>Ryodoraku:</td><td>${clinicalInput.ryodoraku || 'No proporcionado'}</td></tr>
    </table>
  </div>

  <div class="section">
    <h2>3. ANÁLISIS FUKUOKA-H</h2>
    ${fukuokaResult.data.syndrome_analysis.map((s: any, i: number) => `
      <p><strong>Síndrome ${i + 1}:</strong> ${s.syndrome_name} (confianza: ${(s.confidence * 100).toFixed(0)}%)</p>
      <p style="font-style: italic; color: #6b7280;">Evidencia: ${s.supporting_evidence.join(', ')}</p>
    `).join('')}
  </div>

  <div class="section">
    <h2>4. PROPUESTA DE TRATAMIENTO</h2>
    <table>
      <tr><td>Puntos de acupuntura:</td><td>${fukuokaResult.data.treatment_proposal.acupuncture_points.join(', ')}</td></tr>
      <tr><td>Fórmula herbal:</td><td>${fukuokaResult.data.treatment_proposal.herbal_formula || 'Ninguna'}</td></tr>
      <tr><td>Razonamiento:</td><td>${fukuokaResult.data.treatment_proposal.rationale}</td></tr>
    </table>
  </div>

  <div class="section">
    <h2>5. EVALUACIÓN KANT (SEGURIDAD)</h2>
    <div class="verdict">${kantResult.verdict}</div>
    <p>Reglas revisadas: ${kantResult.totalRulesChecked}</p>
    <p>Violaciones:</p>
    ${violationsHtml}
    <p style="font-size: 10px; color: #6b7280;">Evaluado en: ${new Date(kantResult.evaluatedAt).toLocaleString('es-ES')} | Versión motor: ${kantResult.engineVersion}</p>
  </div>

  <div class="section">
    <h2>6. TRAZA DE CUSTODIA</h2>
    <ul class="chain">
      <li>Input clínico recibido: ${new Date(generatedAt).toISOString()}</li>
      <li>Inferencia FUKUOKA-H completada: Request ${fukuokaResult.request_id}</li>
      <li>Validación KANT ejecutada: ${kantResult.totalRulesChecked} reglas</li>
      <li>Documento forense generado: ${new Date().toISOString()}</li>
      <li>Hash de propuesta original: ${kantResult.originalProposalHash}</li>
    </ul>
  </div>

  <div class="footer">
    <p>CONFIDENCIAL — Documento interno clínico. No para distribución al paciente. Protegido por secreto profesional.</p>
    <p>Este informe fue generado por un sistema de soporte a decisiones clínicas (CDSS) y debe ser revisado por un profesional registrado antes de cualquier intervención.</p>
  </div>
</body>
</html>`;
}