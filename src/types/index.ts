/**
 * Eine Zeile aus der Eingabe-Excel.
 * Spaltennamen entsprechen exakt den Headern in der ZM-Datei.
 */
export interface UstIdRow {
  Zeilenbeschriftungen: string;
  "USt-IdNr.": string;
  /** Wird nach der Prüfung mit der API-Antwort befüllt */
  Gultigkeit?: string;
}

/**
 * Ergebnis einer einzelnen USt-IdNr.-Prüfung.
 */
export interface UstCheckResult {
  /** Vollständige USt-Id (Zeilenbeschriftung + Nummer) */
  ustId: string;
  /** Roh-Code aus der API-Antwort, z. B. "200" */
  code: string;
  /** Deutsche Fehlermeldung für Anwender und Excel-Ausgabe */
  errorMessage: string;
}

/**
 * Ergebnis einer Validierungsfunktion.
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}
