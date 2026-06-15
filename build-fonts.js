const fs = require('fs');
const path = require('path');

// Script en RAÍZ del proyecto → public/fonts está al mismo nivel
const fontsDir = path.join(__dirname, 'public', 'fonts');
const outputFile = path.join(__dirname, 'public', 'vfs_fonts.js');

// Verificar que el directorio existe
if (!fs.existsSync(fontsDir)) {
  console.error('❌ ERROR: No existe el directorio public/fonts/');
  console.error('   Ruta buscada: ' + fontsDir);
  console.error('   Crea la carpeta y coloca las fuentes .ttf antes de ejecutar.');
  process.exit(1);
}

const fonts = {};
const files = fs.readdirSync(fontsDir).filter(f => f.endsWith('.ttf') || f.endsWith('.otf'));

if (files.length === 0) {
  console.error('❌ ERROR: No se encontraron fuentes .ttf en public/fonts/');
  process.exit(1);
}

console.log('🔤 Fuentes encontradas:');
files.forEach(file => {
  const filePath = path.join(fontsDir, file);
  const stats = fs.statSync(filePath);
  const content = fs.readFileSync(filePath);
  fonts[file] = content.toString('base64');
  console.log(`   ✓ ${file} (${(stats.size / 1024).toFixed(1)} KB)`);
});

const output = `this.pdfMake = this.pdfMake || {}; this.pdfMake.vfs = ${JSON.stringify(fonts)};`;
fs.writeFileSync(outputFile, output);

const outputStats = fs.statSync(outputFile);
console.log('');
console.log(`✅ VFS generado: public/vfs_fonts.js`);
console.log(`   Ruta absoluta: ${outputFile}`);
console.log(`   Tamaño: ${(outputStats.size / 1024).toFixed(1)} KB`);
console.log(`   Fuentes incrustadas: ${files.length}`);
console.log('');
console.log('📋 Fuentes registradas para pdfmake:');
console.log('   • NotoSans (normal, bold, italics, bolditalics)');
console.log('   • NotoSansSC (normal, bold) — chino/kanji');
console.log('   • NotoSerif (normal, bold) — forense');