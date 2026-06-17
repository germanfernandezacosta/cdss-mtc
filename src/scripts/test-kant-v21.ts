/**
 * test-kant-v21.ts — Prueba forense de KANT v2.1
 * Simula 10 casos clínicos reales y verifica respuestas.
 * Uso: npx tsx src/scripts/test-kant-v21.ts
 */

import { evaluateSafety } from "@/lib/kant/engine-compat";
import { PatientSafetyProfile, ProposedTreatment } from "@/lib/kant/types-compat";

function test(
  name: string,
  patient: PatientSafetyProfile,
  treatment: ProposedTreatment,
  expectedStatus: "green" | "yellow" | "red"
): boolean {
  console.log(`\n🧪 ${name}`);
  const result = evaluateSafety(patient, treatment);

  const status = result.status;
  const pass = status === expectedStatus;

  console.log(`   Status: ${status.toUpperCase()} (score: ${result.score})`);
  console.log(`   Contraindicaciones: ${result.contraindications.length} | Alertas: ${result.alerts.length}`);
  
  if (result.contraindications.length > 0) {
    result.contraindications.forEach(c => {
      console.log(`   🚫 [${c.severity.toUpperCase()}] ${c.item}: ${c.reason.substring(0, 80)}...`);
    });
  }
  
  if (result.alerts.length > 0) {
    result.alerts.slice(0, 2).forEach(a => {
      console.log(`   🔔 [${a.severity}] ${a.code}: ${a.message.substring(0, 80)}...`);
    });
  }

  console.log(`   ${pass ? "✅ PASS" : "❌ FAIL"} (esperado: ${expectedStatus.toUpperCase()})`);
  return pass;
}

function main() {
  console.log("🔐 PRUEBA FORENSE KANT v2.1 — 10 Casos Clínicos\n");

  let passed = 0;
  let failed = 0;

  // CASO 1: Paciente sano, tratamiento estándar
  if (test(
    "1. Paciente sano + tratamiento estándar",
    { age: 45 },
    { points: ["ST36", "LI4", "LR3"], herbs: ["Dang Gui"], techniques: ["acupuntura manual"] },
    "green"
  )) passed++; else failed++;

  // CASO 2: Embarazo + punto prohibido SP6
  if (test(
    "2. Embarazo (T2) + SP6 (punto abortivo)",
    { age: 30, pregnancy: true, pregnancyTrimester: 2 },
    { points: ["SP6", "ST36"], herbs: ["Dang Gui"] },
    "red"
  )) passed++; else failed++;

  // CASO 3: Embarazo + hierba prohibida Fu Zi
  if (test(
    "3. Embarazo + Fu Zi (aconito tóxico)",
    { age: 28, pregnancy: true },
    { points: ["ST36"], herbs: ["Fu Zi"] },
    "red"
  )) passed++; else failed++;

  // CASO 4: Warfarina + Dang Gui (interacción HDI grave)
  if (test(
    "4. Warfarina + Dang Gui (potenciación anticoagulante)",
    { age: 65, currentPharmaceuticals: ["warfarina 5mg"], anticoagulants: ["warfarina"] },
    { points: ["ST36"], herbs: ["Dang Gui", "Bai Shao"] },
    "red"
  )) passed++; else failed++;

  // CASO 5: Marcapsos + Electroacupuntura (contraindicación absoluta)
  if (test(
    "5. Marcapasos + Electroacupuntura",
    { age: 70, pacemaker: true },
    { points: ["ST36"], techniques: ["electroacupuntura 2Hz"] },
    "red"
  )) passed++; else failed++;

  // CASO 6: Marcapsos + Acupuntura manual (técnica permitida)
  if (test(
    "6. Marcapasos + Acupuntura manual (técnica segura)",
    { age: 70, pacemaker: true },
    { points: ["ST36", "LI4"], techniques: ["acupuntura manual"] },
    "yellow"
  )) passed++; else failed++;

  // CASO 7: Epilepsia + EA >100Hz craneal
  if (test(
    "7. Epilepsia + Electroacupuntura 120Hz en cabeza",
    { age: 35, epilepsy: true, epilepsyControlled: true },
    { points: ["DU20"], techniques: ["electroacupuntura 120Hz"] },
    "red"
  )) passed++; else failed++;

  // CASO 8: Paciente pediátrico 5 años
  if (test(
    "8. Paciente pediátrico 5 años",
    { age: 5 },
    { points: ["ST36"], techniques: ["acupuntura manual"] },
    "yellow"
  )) passed++; else failed++;

  // CASO 9: Linfedema post-mastectomía + ventosas
  if (test(
    "9. Linfedema post-mastectomía + ventosas",
    { age: 55, lymphedema: true },
    { points: ["LI11", "LI4"], techniques: ["ventosas"] },
    "red"
  )) passed++; else failed++;

  // CASO 10: Apixaban + tratamiento seguro
  if (test(
    "10. Apixaban (DOAC) + tratamiento estándar",
    { age: 60, anticoagulants: ["apixaban 5mg"] },
    { points: ["ST36", "SP6"], techniques: ["acupuntura manual"] },
    "yellow"
  )) passed++; else failed++;

  console.log(`\n═══════════════════════════════════════════════════`);
  console.log(`🏁 RESULTADOS: ${passed} PASS / ${failed} FAIL`);
  console.log(`═══════════════════════════════════════════════════`);

  if (failed > 0) {
    console.log("\n❌ Algunos tests fallaron. Revisa las reglas en data/kant/safety-rules.json");
    process.exit(1);
  } else {
    console.log("\n✅ Todos los tests pasaron. KANT v2.1 está listo para producción.");
  }
}

main();
