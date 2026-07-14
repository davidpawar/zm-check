import {
  ALLOWED_FILE_TYPES,
  CONFIG,
  REQUIRED_EXCEL_COLUMNS,
} from "../config/constants";
import type { UstIdRow, ValidationResult } from "../types";

/**
 * Prüft, ob die hochgeladene Datei ein unterstütztes Excel-Format hat.
 *
 * @param file - Vom Browser bereitgestellte Datei
 */
export function validateFileType(file: File): boolean {
  return ALLOWED_FILE_TYPES.includes(
    file.type as (typeof ALLOWED_FILE_TYPES)[number]
  );
}

/**
 * Prüft, ob die Datei unter dem konfigurierten Größenlimit liegt.
 * Große Dateien würden den Speicher im Webview belasten.
 *
 * @param file - Hochgeladene Datei
 * @param maxSizeMB - Optionales Override, Standard aus CONFIG
 */
export function validateFileSize(
  file: File,
  maxSizeMB: number = CONFIG.MAX_FILE_SIZE_MB
): boolean {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxSizeBytes;
}

/**
 * Prüft das deutsche USt-IdNr.-Format (DE + 9 Ziffern).
 * Wird vor dem API-Aufruf genutzt, um unnötige Anfragen zu vermeiden.
 *
 * @param ustId - Vollständige USt-Id inkl. Länderpräfix
 */
export function validateUstId(ustId: string): boolean {
  const ustIdPattern = /^DE\d{9}$/;
  return ustIdPattern.test(ustId);
}

/**
 * Stellt sicher, dass die Excel die erwarteten Spalten enthält.
 * Ohne diese Spalten kann die ZM-Datei nicht verarbeitet werden.
 *
 * @param sheetData - Erstes Tabellenblatt als JSON-Array
 */
export function validateExcelStructure(
  sheetData: UstIdRow[]
): ValidationResult {
  const errors: string[] = [];

  if (!Array.isArray(sheetData) || sheetData.length === 0) {
    errors.push("Die Excel-Datei ist leer oder hat keine Daten.");
    return { isValid: false, errors };
  }

  const firstRow = sheetData[0];

  for (const column of REQUIRED_EXCEL_COLUMNS) {
    if (!(column in firstRow)) {
      errors.push(`Erforderliche Spalte fehlt: ${column}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
