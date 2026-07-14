import { CONFIG, ERROR_CODES } from "../config/constants";
import { readExcelFromBuffer, createResultWorkbook } from "../services/excel.service";
import { saveResultToDesktop } from "../services/file-storage.service";
import { checkUstId } from "../services/ust-api.service";
import type { UstCheckResult, UstIdRow } from "../types";
import { UIManager } from "../ui/ui-manager";
import { buildUstIdKey, chunkArray } from "../utils";
import {
  validateExcelStructure,
  validateFileSize,
  validateFileType,
  validateUstId,
} from "../validation";

/**
 * Kern-Orchestrator: koordiniert Upload, Validierung, API-Prüfung und Speichern.
 * Eine Klasse pro Anwendungsfall – einfacher Einstieg für neue Entwickler.
 */
export class UstChecker {
  private uiManager: UIManager;
  /** Merkt sich, ob die Fehlertabelle bereits sichtbar ist */
  private errorTableVisible = false;

  constructor() {
    this.uiManager = new UIManager();
  }

  /**
   * Startet die Anwendung: UI binden und Event-Listener registrieren.
   * Wird einmal beim DOMContentLoaded aufgerufen.
   */
  async initialize(): Promise<void> {
    this.uiManager.initialize();
    this.setupEventListeners();
  }

  /**
   * Registriert den Change-Handler am versteckten Datei-Input.
   * Das Label in index.html triggert den Klick auf dieses Input.
   */
  private setupEventListeners(): void {
    const fileInput = document.querySelector<HTMLInputElement>("#file-input");
    fileInput?.addEventListener("change", this.handleFileUpload.bind(this));
  }

  /**
   * Wird ausgelöst, sobald der Anwender eine Datei gewählt hat.
   * Validiert zuerst, startet danach die asynchrone Verarbeitung.
   *
   * @param event - Native Change-Event des File-Inputs
   */
  private handleFileUpload(event: Event): void {
    event.stopPropagation();
    event.preventDefault();

    // Jeder neue Upload beginnt mit leerer UI
    this.uiManager.resetEventLog();
    this.uiManager.resetProgress();
    this.uiManager.resetErrorTable();
    this.errorTableVisible = false;

    const target = event.target as HTMLInputElement;
    const files = target.files;

    if (!files || files.length === 0) {
      this.uiManager.addToEventLog("Keine Datei ausgewählt.");
      return;
    }

    const file = files[0];

    if (!validateFileType(file)) {
      this.uiManager.showErrorMessage(
        "Ungültiger Dateityp. Bitte wählen Sie eine Excel-Datei (.xlsx, .xls, .ods)."
      );
      return;
    }

    if (!validateFileSize(file)) {
      this.uiManager.showErrorMessage(
        `Datei ist zu groß. Maximale Größe: ${CONFIG.MAX_FILE_SIZE_MB}MB.`
      );
      return;
    }

    void this.processFile(file);
  }

  /**
   * Liest die Datei asynchron über FileReader ein.
   * FileReader ist nötig, weil xlsx ein ArrayBuffer braucht.
   *
   * @param file - Validierte Excel-Datei
   */
  private async processFile(file: File): Promise<void> {
    this.uiManager.setLoadingState(true);
    this.uiManager.addToEventLog("Datei wird verarbeitet...");

    const reader = new FileReader();
    reader.readAsArrayBuffer(file);

    reader.onload = async (fileReaderEvent) => {
      try {
        await this.handleFileContent(fileReaderEvent);
      } catch (error) {
        this.handleError(error);
      } finally {
        this.uiManager.setLoadingState(false);
      }
    };
  }

  /**
   * Verarbeitet den gelesenen Dateiinhalt: Excel parsen, prüfen, speichern.
   *
   * @param fileReaderEvent - Event mit ArrayBuffer-Ergebnis
   */
  private async handleFileContent(
    fileReaderEvent: ProgressEvent<FileReader>
  ): Promise<void> {
    if (!fileReaderEvent.target?.result) {
      throw new Error("Datei konnte nicht gelesen werden.");
    }

    const buffer = fileReaderEvent.target.result as ArrayBuffer;
    const sheetAsJSON = readExcelFromBuffer(buffer);
    this.uiManager.addToEventLog("Excel-Datei wurde eingelesen.");

    const validation = validateExcelStructure(sheetAsJSON);
    if (!validation.isValid) {
      throw new Error(
        `Ungültige Excel-Struktur: ${validation.errors.join(", ")}`
      );
    }

    const allUstIds = this.extractUstIds(sheetAsJSON);
    this.uiManager.addToEventLog(`${allUstIds.length} USt-Ids extrahiert.`);

    const ustChunks = chunkArray(allUstIds, CONFIG.CHUNK_SIZE);
    this.uiManager.addToEventLog(
      `${allUstIds.length} USt-Ids in ${ustChunks.length} Chunks aufgeteilt.`
    );

    await this.processUstChunks(ustChunks, sheetAsJSON);
    await this.saveResults(sheetAsJSON);
  }

  /**
   * Erzeugt aus jeder Zeile den API-Schlüssel (Zeilenbeschriftung + USt-IdNr.).
   *
   * @param sheetData - Alle Zeilen der Eingabe-Excel
   */
  private extractUstIds(sheetData: UstIdRow[]): string[] {
    return sheetData.map((row) => buildUstIdKey(row));
  }

  /**
   * Prüft USt-Ids in Batches parallel, aktualisiert Fortschritt und Ergebnistabelle.
   *
   * @param ustChunks - Aufgeteilte USt-Id-Listen
   * @param sheetData - Mutable Excel-Daten für die Ausgabespalte "Gultigkeit"
   */
  private async processUstChunks(
    ustChunks: string[][],
    sheetData: UstIdRow[]
  ): Promise<void> {
    let processedCount = 0;
    const totalCount = ustChunks.flat().length;

    for (const chunk of ustChunks) {
      // Promise.all = parallele Anfragen innerhalb eines Chunks
      const promises = chunk.map((ustId) => this.checkUstIdSafe(ustId));
      const results = await Promise.all(promises);

      for (const result of results) {
        processedCount++;
        this.uiManager.updateProgress(processedCount, totalCount);
        this.applyResult(result, sheetData);
      }
    }
  }

  /**
   * Wrapper um checkUstId mit Format-Validierung und Fehler-Fallback.
   * Einzelne fehlerhafte IDs sollen den gesamten Lauf nicht abbrechen.
   *
   * @param ustId - Zu prüfende USt-IdNr.
   */
  private async checkUstIdSafe(ustId: string): Promise<UstCheckResult> {
    if (!validateUstId(ustId)) {
      return {
        ustId,
        code: "local",
        errorMessage: `Ungültiges Format: ${ustId} (erwartet: DE + 9 Ziffern)`,
      };
    }

    this.uiManager.addToEventLog(`API-Aufruf für: ${ustId}`);

    try {
      return await checkUstId(ustId);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unbekannter API-Fehler";

      return {
        ustId,
        code: "network",
        errorMessage: message,
      };
    }
  }

  /**
   * Schreibt das Prüfergebnis in die Excel-Zeile und ggf. in die Fehlertabelle.
   *
   * @param result - Ergebnis einer Einzelprüfung
   * @param sheetData - Alle Zeilen der Eingabe-Excel
   */
  private applyResult(result: UstCheckResult, sheetData: UstIdRow[]): void {
    const rowIndex = sheetData.findIndex(
      (row) => buildUstIdKey(row) === result.ustId
    );

    if (rowIndex === -1) return;

    sheetData[rowIndex].Gultigkeit = result.errorMessage;

    const isError = result.code !== ERROR_CODES.SUCCESS;

    if (isError) {
      // Tabelle erst bei erstem Fehler einblenden, nicht bei jeder Zeile
      if (!this.errorTableVisible) {
        this.uiManager.showErrorTable();
        this.errorTableVisible = true;
      }

      this.uiManager.addErrorRow(result.ustId, result.errorMessage);
    }
  }

  /**
   * Erstellt die Ausgabe-Excel und speichert sie auf dem Desktop.
   *
   * @param sheetData - Geprüfte Zeilen mit Spalte "Gultigkeit"
   */
  private async saveResults(sheetData: UstIdRow[]): Promise<void> {
    this.uiManager.addToEventLog("Ergebnisse werden gespeichert...");

    const binaryData = createResultWorkbook(sheetData);

    try {
      const outputPath = await saveResultToDesktop(binaryData);
      this.uiManager.showSuccessMessage(
        "ZM Ergebnis wurde auf dem Desktop abgelegt."
      );
      this.uiManager.addToEventLog(`Datei erfolgreich gespeichert: ${outputPath}`);
    } catch (error) {
      this.uiManager.showErrorMessage(
        "ZM Ergebnis konnte nicht gespeichert werden."
      );
      this.uiManager.addToEventLog(`Fehler beim Speichern: ${error}`);
    }
  }

  /**
   * Zentraler Fehlerhandler für unerwartete Ausnahmen.
   * Zeigt sowohl im Event-Log als auch als Toast an.
   *
   * @param error - Geworfene Exception oder unbekannter Wert
   */
  private handleError(error: unknown): void {
    const errorMessage =
      error instanceof Error ? error.message : "Unbekannter Fehler";
    this.uiManager.addToEventLog(`Fehler: ${errorMessage}`);
    this.uiManager.showErrorMessage(`Fehler: ${errorMessage}`);
  }
}
