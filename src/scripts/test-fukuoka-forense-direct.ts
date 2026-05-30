import * as sqlite3 from "sqlite3";

const db = new sqlite3.Database("data/vectors/fukuoka-master.db");

// Prueba 1: Buscar chunks sobre puntos maestros
db.all(
  `SELECT chunk_id, document_id, domain, content, page_start, page_end, token_count
   FROM chunks 
   WHERE content LIKE '%maestro%' OR content LIKE '%Bai Mai%' OR content LIKE '%交会穴%'
   LIMIT 5`,
  (err, rows: any[]) => {
    if (err) {
      console.log("❌ Error maestros:", err.message);
      db.close();
      return;
    }
    
    console.log(`🔍 Chunks sobre puntos maestros: ${rows.length}\n`);
    
    for (const row of rows) {
      console.log(`📄 chunk_id: ${row.chunk_id}`);
      console.log(`📄 document_id: ${row.document_id}`);
      console.log(`📝 Content: ${row.content?.substring(0, 250)}...`);
      console.log(`─`.repeat(60));
    }
    
    // Prueba 2: Buscar sobre embarazo
    db.all(
      `SELECT chunk_id, document_id, domain, content
       FROM chunks 
       WHERE content LIKE '%embarazo%' OR content LIKE '%pregnancy%' OR content LIKE '%gestación%'
         OR content LIKE '%prohibido%' OR content LIKE '%contraindicado%'
       LIMIT 5`,
      (err2, rows2: any[]) => {
        if (err2) {
          console.log("\n❌ Error embarazo:", err2.message);
          db.close();
          return;
        }
        
        console.log(`\n🔍 Chunks sobre embarazo/contraindicaciones: ${rows2.length}\n`);
        
        for (const row of rows2) {
          console.log(`📄 chunk_id: ${row.chunk_id}`);
          console.log(`📄 document_id: ${row.document_id}`);
          console.log(`📝 Content: ${row.content?.substring(0, 250)}...`);
          console.log(`─`.repeat(60));
        }
        
        // Prueba 3: Contar chunks por documento
        db.all(
          `SELECT document_id, COUNT(*) as count 
           FROM chunks 
           GROUP BY document_id 
           ORDER BY count DESC 
           LIMIT 10`,
          (err3, rows3: any[]) => {
            if (err3) {
              console.log("\n❌ Error stats:", err3.message);
              db.close();
              return;
            }
            
            console.log(`\n📊 Top 10 documentos por chunks:\n`);
            for (const row of rows3) {
              console.log(`   ${row.document_id}: ${row.count} chunks`);
            }
            
            db.close();
          }
        );
      }
    );
  }
);
