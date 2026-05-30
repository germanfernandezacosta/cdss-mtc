import * as sqlite3 from "sqlite3";
import * as fs from "fs";

const dbPath = "data/vectors/fukuoka-master.db";

if (!fs.existsSync(dbPath)) {
  console.log("❌ Base de datos no existe");
  process.exit(1);
}

const db = new sqlite3.Database(dbPath);

db.get("SELECT COUNT(*) as total FROM chunks", (err, row: any) => {
  if (err) {
    console.log("❌ Error:", err.message);
    db.close();
    return;
  }
  console.log("✅ Total chunks:", row.total);
  console.log("✅ RAG Fase 1: INGESTA COMPLETADA");
  console.log("🎯 Próximo paso: Fase 2 — KANT v2.0 (safety-rules.json)");
  db.close();
});