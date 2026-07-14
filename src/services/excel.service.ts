import * as XLSX from "xlsx";
import { CONFIG } from "../config/constants";
import type { UstIdRow } from "../types";

/**
 * Liest eine Excel-Datei ein und gibt das erste Tabellenblatt als JSON zurück.
 *
 * @param fileBuffer - Rohe Dateibytes aus FileReader
 * @returns Array mit allen Zeilen des ersten Sheets
 */
export function readExcelFromBuffer(fileBuffer: ArrayBuffer): UstIdRow[] {
  const data = new Uint8Array(fileBuffer);
  const workbook = XLSX.read(data, { type: "array" });

  // ZM-Dateien haben typischerweise nur ein relevantes Blatt
  const firstSheetName = workbook.SheetNames[0];
  return XLSX.utils.sheet_to_json<UstIdRow>(workbook.Sheets[firstSheetName]);
}

/**
 * Erzeugt eine Excel-Datei aus den geprüften Zeilen.
 *
 * @param sheetData - Zeilen inkl. befüllter Spalte "Gultigkeit"
 * @returns Binärdaten als Uint8Array für den Dateischreibvorgang
 */
export function createResultWorkbook(sheetData: UstIdRow[]): Uint8Array {
  const newSheet = XLSX.utils.json_to_sheet(sheetData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, newSheet, CONFIG.SHEET_NAME);

  const buffer = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "array",
  });

  return new Uint8Array(buffer);
}
