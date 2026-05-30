/**
 * Script de purga de datos de prueba
 * Uso: npx tsx src/scripts/purge-test-data.ts
 * CDSS MTC Premium v2.1
 * 
 * Elimina permanentemente:
 * - Consultas marcadas como is_test = true
 * - PDFs asociados a consultas de prueba
 * 
 * ⚠️ IRREVERSIBLE. Usar solo al finalizar fase de validación.
 */

import { db, rawDb, PDF_DIR } from "@/lib/ehr/db";
import { consultations } from "@/lib/ehr/schema";
import { eq, sql } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";

function log(msg: string) {
  console.log(`[PURGE] ${msg}`);
}

async function main() {
  console.log("══════════════════════════════════════════════════");
  console.log("  PURGA DE DATOS DE PRUEBA");
  console.log("══════════════════════════════════════════════════\n");

  const testConsultations = db
    .select()
    .from(consultations)
    .where(eq(consultations.isTest, true))
    .all();

  log(`Consultas de prueba encontradas: ${testConsultations.length}`);

  if (testConsultations.length === 0) {
    log("No hay datos de prueba para eliminar.");
    return;
  }

  console.log("\nPreview de datos a eliminar:");
  for (const c of testConsultations) {
    console.log(`  - ID ${c.id} | ${c.patientHash} | ${c.consultationDate}`);
  }

  const force = process.argv.includes("--force");
  if (!force) {
    console.log("\n⚠️  ESTA ACCIÓN ES IRREVERSIBLE.");
    console.log("   Usa --force para confirmar: npx tsx src/scripts/purge-test-data.ts --force");
    process.exit(0);
  }

  let pdfsDeleted = 0;
  for (const c of testConsultations) {
    if (c.foucaultPdfPath) {
      const empathicPath = c.foucaultPdfPath.replace("_forensic.pdf", "_empathic.pdf");
      if (fs.existsSync(c.foucaultPdfPath)) {
        fs.unlinkSync(c.foucaultPdfPath);
        pdfsDeleted++;
      }
      if (fs.existsSync(empathicPath)) {
        fs.unlinkSync(empathicPath);
        pdfsDeleted++;
      }
    }
  }

  // FIX: Usar db.run() en vez de db.transaction()
  const result = rawDb.prepare("DELETE FROM consultations WHERE is_test = 1").run();
  const deleted = result.changes;

  log(`Registros eliminados: ${deleted}`);
  log(`PDFs eliminados: ${pdfsDeleted}`);

  rawDb.exec("VACUUM;");
  log("Base de datos compactada.");

  console.log("\n══════════════════════════════════════════════════");
  console.log("  PURGA COMPLETADA");
  console.log("══════════════════════════════════════════════════");
}

main().catch(console.error);