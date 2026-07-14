/**
 * Zentrale Konfiguration der Anwendung.
 * Alle festen Werte (API, Dateinamen, Limits) an einer Stelle,
 * damit Änderungen ohne Code-Suche möglich sind.
 */
export const CONFIG = {
  /** Anzahl paralleler API-Anfragen pro Batch – BFF-Online toleriert ca. 16 */
  CHUNK_SIZE: 16,
  /** Offizieller Endpunkt der BFF-Online USt-IdNr.-Prüfung */
  API_BASE_URL: "https://evatr.bff-online.de/evatrRPC",
  /** Feste Anfrage-Parameter: eigene DE-USt-IdNr. als Anfragender */
  API_PARAMS: {
    UST_ID_1: "DE328147354",
    FIRMENNAME: "",
    ORT: "",
    PLZ: "",
    STRASSE: "",
  },
  /** Dateiname der Ergebnis-Excel auf dem Desktop */
  OUTPUT_FILENAME: "zm-geprueft.xlsx",
  /** Tabellenblatt-Name in der Ausgabedatei */
  SHEET_NAME: "ZM geprueft",
  /** Anzeigedauer der Toast-Benachrichtigungen in Millisekunden */
  TOAST_DURATION: 3000,
  /** Maximale Upload-Größe in Megabyte */
  MAX_FILE_SIZE_MB: 10,
} as const;

/**
 * Bekannte Antwort-Codes der BFF-Online API.
 * Vollständige Liste: https://www.bzst.de/DE/Unternehmen/Umsatzsteuer/Umsatzsteuer-Identifikationsnummer/Validierung_USt-IdNr/validierung_USt-IdNr_node.html
 */
export const ERROR_CODES = {
  SUCCESS: "200",
  INVALID: "201",
  NOT_REGISTERED: "202",
  EXPIRED: "204",
  SERVICE_UNAVAILABLE: "205",
  PROCESSING_ERROR: "217",
} as const;

/** Spaltennamen, die in der Eingabe-Excel vorhanden sein müssen */
export const REQUIRED_EXCEL_COLUMNS = [
  "Zeilenbeschriftungen",
  "USt-IdNr.",
] as const;

/** Dateiendungen für Fallback-Validierung (Drag-and-Drop liefert oft keinen MIME-Typ) */
export const ALLOWED_FILE_EXTENSIONS = [".xlsx", ".xls", ".ods"] as const;

/** MIME-Typen, die als Excel-Datei akzeptiert werden */
export const ALLOWED_FILE_TYPES = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  "application/vnd.ms-excel", // .xls
  "application/vnd.oasis.opendocument.spreadsheet", // .ods
] as const;
