/**
 * test-kant.ts — Verificación forense del motor KANT v2.0
 * Uso: npx tsx src/scripts/test-kant.ts
 */

import { KantEngine, evaluateSafety } from "../lib/kant/engine-compat";
import { PatientSafetyProfile, ProposedTreatment } from "../lib/kant/types-compat";

function testCase(
  name: string,
  patient: PatientSafetyProfile,
  treatment: ProposedTreatment,
  expectedStatus: string
): boolean {
  console.log(`\n🧪 TEST: ${name}`);
  const result = evaluateSafety(patient, treatment);

  console.log(`   Status: ${result.status} (score: ${result.score})`);
  console.log(`   Alerts: ${result.alerts.length} | Contraindications: ${result.contraindications.length}`);
  console.log(`   Cleared: ${result.clearedForTreatment} | Supervision: ${result.requiresSupervision} | Physician: ${result.requiresPhysicianClearance}`);

  if (result.alerts.length > 0) {
    console.log(`   🔔 ${result.alerts[0].message}`);
  }
  if (result.contraindications.length > 0) {
    console.log(`   🚫 ${result.contraindications[0].item}: ${result.contraindications[0].reason}`);
  }

  const pass = result.status === expectedStatus;
  console.log(`   ${pass ? "✅ PASS" : "❌ FAIL"} (expected ${expectedStatus})`);
  return pass;
}

function main() {
  console.log("🔐 Verificación forense KANT v2.0 — Motor de Seguridad Clínica\n");

  let passed = 0;
  let failed = 0;

  // TEST 1: Paciente sano, tratamiento estándar → green
  if (testCase(
    "Paciente sano + tratamiento estándar",
    { age: 45 },
    { points: ["ST36", "LI4", "LR3"], herbs: ["Dang Gui"], techniques: ["acupuntura manual"] },
    "green"
  )) passed++; else failed++;

  // TEST 2: Embarazo + punto prohibido → red
  if (testCase(
    "Embarazo + SP6 (punto prohibido)",
    { age: 30, pregnancy: true, pregnancyTrimester: 2 },
    { points: ["SP6", "ST36"], herbs: ["Dang Gui"] },
    "red"
  )) passed++; else failed++;

  // TEST 3: Embarazo + hierba prohibida → red
  if (testCase(
    "Embarazo + Fu Zi (hierba prohibida)",
    { age: 28, pregnancy: true },
    { points: ["ST36"], herbs: ["Fu Zi"] },
    "red"
  )) passed++; else failed++;

  // TEST 4: Warfarina + Dang Gui → red (interacción alta)
  if (testCase(
    "Warfarina + Dang Gui (interacción HDI)",
    { age: 65, currentPharmaceuticals: ["warfarina 5mg"], anticoagulants: ["warfarina"] },
    { points: ["ST36"], herbs: ["Dang Gui", "Bai Shao"] },
    "red"
  )) passed++; else failed++;

  // TEST 5: Marcapsos + electroacupuntura → red
  if (testCase(
    "Marcapasos + Electroacupuntura",
    { age: 70, pacemaker: true },
    { points: ["ST36"], techniques: ["electroacupuntura 2Hz"] },
    "red"
  )) passed++; else failed++;

  // TEST 6: Marcapsos + acupuntura manual → yellow (alerta pero permitido)
  if (testCase(
    "Marcapasos + Acupuntura manual (técnica permitida)",
    { age: 70, pacemaker: true },
    { points: ["ST36", "LI4"], techniques: ["acupuntura manual"] },
    "yellow"
  )) passed++; else failed++;

  // TEST 7: Epilepsia + técnica prohibida → red
  if (testCase(
    "Epilepsia + Electroacupuntura >100Hz craneal",
    { age: 35, epilepsy: true, epilepsyControlled: true },
    { points: ["DU20"], techniques: ["electroacupuntura 120Hz"] },
    "red"
  )) passed++; else failed++;

  // TEST 8: Pediátrico <7 años → yellow
  if (testCase(
    "Paciente pediátrico 5 años",
    { age: 5 },
    { points: ["ST36"], techniques: ["acupuntura manual"] },
    "yellow"
  )) passed++; else failed++;

  // TEST 9: Linfedema post-mastectomía → red
  if (testCase(
    "Linfedema post-mastectomía",
    { age: 55, lymphedema: true },
    { points: ["LI11", "LI4"], techniques: ["ventosas"] },
    "red"
  )) passed++; else failed++;

  // TEST 10: DOAC + tratamiento seguro → yellow (alerta, no contraindicación)
  if (testCase(
    "Apixaban + tratamiento seguro",
    { age: 60, anticoagulants: ["apixaban 5mg"] },
    { points: ["ST36", "SP6"], techniques: ["acupuntura manual"] },
    "yellow"
  )) passed++; else failed++;

  console.log(`\n═══════════════════════════════════════════`);
  console.log(`🏁 RESULTADOS: ${passed} PASS / ${failed} FAIL`);
  console.log(`═══════════════════════════════════════════`);

  if (failed > 0) {
    process.exit(1);
  }
}

main();