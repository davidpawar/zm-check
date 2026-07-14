/**
 * Schweregrade für Protokolleinträge – steuern Farbe und Badge in der UI.
 */
export type EventLogLevel = "info" | "step" | "success" | "warning" | "error";

/**
 * Optionen für einen einzelnen Protokolleintrag.
 */
export interface EventLogEntryOptions {
  /** Visuelle Kategorie des Eintrags */
  level?: EventLogLevel;
  /** Zusatzinfo in kleinerer Schrift unter der Hauptmeldung */
  details?: string;
}

/**
 * Statistik am Ende eines Prüflaufs – für die Abschluss-Zusammenfassung.
 */
export interface RunSummaryStats {
  total: number;
  valid: number;
  invalid: number;
  formatErrors: number;
  networkErrors: number;
  durationMs: number;
  outputPath?: string;
}
