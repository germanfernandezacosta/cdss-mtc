/**
 * Test de integracion Foucault v2.2
 * Verifica: AHPRA filter, Scope of Practice, TGA, tipos, y flujo de datos
 */

import { scanTextForAHPRA, validateScopeOfPractice, validateTGAClaims, sanitizeForAHPRA } from '../lib/foucault/ahpra-filter';
import { generateDoublePdf } from '../lib/foucault/engine';

// ─── Test 1: AHPRA detecta claims prohibidos (ESPAÑOL) ───
console.log('\n=== TEST 1: AHPRA Prohibited Claims ===');
const test1 = scanTextForAHPRA('Este tratamiento cura la diabetes garantizado 100% effective', 'original_input');
console.log('Flags detectadas:', test1.flags.length);
console.log('Clean:', test1.clean);
if (test1.flags.length >= 3) {
  console.log('✅ PASS: Detecta "cura", "garantizado", "100% effective"');
} else {
  console.log('❌ FAIL: No detecto todos los claims prohibidos');
  console.log(test1.flags);
}

// ─── Test 2: Scope of Practice ───
console.log('\n=== TEST 2: Scope of Practice ===');
const test2 = validateScopeOfPractice('El paciente tiene dolor toracico agudo y voy a diagnosticar enfermedades occidentales');
console.log('Violaciones:', test2.violations.length);
console.log('Requiere derivacion:', test2.requiresReferral);
if (test2.violations.length >= 2 && test2.requiresReferral) {
  console.log('✅ PASS: Detecta procedimiento prohibido + red flag medica');
} else {
  console.log('❌ FAIL: No detecto scope violations');
  console.log(test2.violations);
}

// ─── Test 3: TGA Claims ───
console.log('\n=== TEST 3: TGA Claims ===');
const test3 = validateTGAClaims('Esta hierba cura la hipertension y reemplaza tu medicacion');
console.log('Flags TGA:', test3.flags.length);
if (test3.flags.length >= 2) {
  console.log('✅ PASS: Detecta claims TGA prohibidos');
} else {
  console.log('❌ FAIL: No detecto claims TGA');
  console.log(test3.flags);
}

// ─── Test 4: Sanitizacion ───
console.log('\n=== TEST 4: Sanitizacion AHPRA ===');
const test4 = sanitizeForAHPRA('Este producto cura el cancer y es 100% effective');
console.log('Cambios:', test4.changes.length);
console.log('Texto sanitizado:', test4.sanitized.substring(0, 100) + '...');
if (test4.changes.length >= 2 && !test4.sanitized.includes('cura')) {
  console.log('✅ PASS: Sanitiza correctamente');
} else {
  console.log('❌ FAIL: No sanitizo correctamente');
}

// ─── Test 5: Generacion de documentos ───
console.log('\n=== TEST 5: Generacion Double PDF ===');
(async () => {
  try {
    const mockInput = {
      patient: {
        id: 'TEST-001',
        age: 45,
        sex: 'M' as const,
        patientHash: 'abc123hash',
      },
      clinicalInput: {
        symptoms: 'dolor de cabeza, fatiga',
        pulse: 'wiry',
        tongue: 'red with yellow coat',
        ryodoraku: 'LU: 12, LI: 15',
      },
      fukuokaResult: {
        request_id: 'req-test-001',
        data: {
          syndrome_analysis: [{
            syndrome_name: 'Liver Qi Stagnation',
            confidence: 0.85,
            supporting_evidence: ['tongue red', 'pulse wiry'],
          }],
          treatment_proposal: {
            acupuncture_points: ['LV3', 'LI4', 'SP6'],
            herbal_formula: 'Xiao Yao San',
            rationale: 'Move Liver Qi, harmonize Shaoyang',
          },
        },
      },
      kantResult: {
        status: 'green' as const,
        score: 0,
        alerts: [],
        contraindications: [],
        clearedForTreatment: true,
        requiresSupervision: false,
        requiresPhysicianClearance: false,
        auditTrail: [],
        verdict: 'VERDE',
        totalRulesChecked: 47,
        violations: [],
        evaluatedAt: new Date().toISOString(),
        engineVersion: '2.2',
        originalProposalHash: 'hash123',
      },
      generatedAt: new Date().toISOString(),
    };

    const result = await generateDoublePdf(mockInput);
    
    console.log('Forensic length:', result.forensicPdfBase64.length);
    console.log('Empathic length:', result.empathicPdfBase64.length);
    console.log('Forensic hash:', result.auditLog.documentHashes.forensic.substring(0, 16) + '...');
    console.log('Empathic hash:', result.auditLog.documentHashes.empathic.substring(0, 16) + '...');
    console.log('AHPRA flags:', result.auditLog.ahpraFlags.length);
    console.log('Chain of custody:', result.auditLog.chainOfCustody.length, 'entries');
    
    const forensicDecoded = Buffer.from(result.forensicPdfBase64, 'base64').toString('utf-8');
    const hasCorrectSex = forensicDecoded.includes('M</td>') || forensicDecoded.includes('F</td>');
    const noOtherSex = !forensicDecoded.includes('O</td>');
    
    if (result.forensicPdfBase64.length > 1000 && 
        result.empathicPdfBase64.length > 500 &&
        result.auditLog.chainOfCustody.length >= 5 &&
        hasCorrectSex && noOtherSex) {
      console.log('✅ PASS: Documentos generados correctamente con trazabilidad y sexo M/F');
    } else {
      console.log('❌ FAIL: Documentos incompletos o sexo incorrecto');
    }
    
    console.log('\n=== RESUMEN ===');
    console.log('Si ves 5 ✅, Foucault v2.2 esta listo.');
    console.log('Si ves ❌, revisa los archivos indicados arriba.');
    
  } catch (error) {
    console.error('❌ FAIL: Error en generacion:', error);
  }
})();
