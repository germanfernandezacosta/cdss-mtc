/**
 * Foucault Persistence Module
 * Guarda PDFs en disco y registra rutas en EHR
 * CDSS MTC Premium v2.1
 */

import * as fs from "fs";
import * as path from "path";
import { generatePdfPath } from "@/lib/ehr/store";

export interface PdfSaveResult {
  forensicPath: string;
  empathicPath: string;
  forensicHash: string;
  empathicHash: string;
}

/**
 * Asegura que el directorio para un archivo existe
 */
function ensureDirectoryExists(filePath: string): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Guarda los PDFs base64 en disco y devuelve las rutas
 */
export function saveFoucaultPDFs(
  patientHash: string,
  timestamp: string,
  forensicBase64: string,
  empathicBase64: string,
  forensicHash: string,
  empathicHash: string
): PdfSaveResult {
  const forensicPath = generatePdfPath(patientHash, "forensic");
  const empathicPath = generatePdfPath(patientHash, "empathic");

  ensureDirectoryExists(forensicPath);
  ensureDirectoryExists(empathicPath);

  // Guardar archivos
  fs.writeFileSync(forensicPath, Buffer.from(forensicBase64, "base64"));
  fs.writeFileSync(empathicPath, Buffer.from(empathicBase64, "base64"));

  return {
    forensicPath,
    empathicPath,
    forensicHash,
    empathicHash,
  };
}

/**
 * Lee un PDF del disco y devuelve base64
 */
export function readFoucaultPDF(pdfPath: string): string {
  if (!fs.existsSync(pdfPath)) {
    throw new Error(`PDF no encontrado: ${pdfPath}`);
  }
  return fs.readFileSync(pdfPath).toString("base64");
}