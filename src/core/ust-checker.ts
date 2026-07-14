import { CONFIG, ERROR_CODES } from "../config/constants";
import { readExcelFromBuffer, createResultWorkbook } from "../services/excel.service";
import { saveResultToDesktop } from "../services/file-storage.service";
import { checkUstId } from "../services/ust-api.service";
import type { UstCheckResult, UstIdRow } from "../types";
import type { RunSummaryStats } from "../types/event-log";
import { UIManager } from "../ui/ui-manager";
import { buildUstIdKey, chunkArray, formatFileSize } from "../utils";
import {
  validateExcelStructure,
  validateFileSize,
  validateFileType,
  validateUstId,
} from "../validation";

/** Laufende Zähler für die Abschluss-Statistik im Protokoll */
interface RunStats {
  total: number;
  valid: number;
  invalid: number;
  formatErrors: number;
  networkErrors: number;
}

/**
 * Kern-Orchestrator: koordiniert Upload, Validierung, API-Prüfung und Speichern.
 * Eine Klasse pro Anwendungsfall – einfacher Einstieg für neue Entwickler.
 */
export class UstChecker {
  private uiManager: UIManager;
  /** Merkt sich, ob die Fehlertabelle bereits sichtbar ist */
  private errorTableVisible = false;
  /** Zählt dragenter/dragleave – verhindert Flackern bei verschachtelten Elementen */
  private dragCounter = 0;
  /** Startzeit des aktuellen Prüflaufs für Dauer im Protokoll */
  private runStartTime = 0;
  /** Aggregierte Ergebnisse des aktuellen Laufs */
  private runStats: RunStats = this.createEmptyRunStats();

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
   * Registriert Datei-Input und Drag-and-Drop auf der Drop-Zone.
   */
  private setupEventListeners(): void {
    const fileInput = document.querySelector<HTMLInputElement>("#file-input");
    fileInput?.addEventListener("change", this.handleFileInputChange.bind(this));

    const dropZone = this.uiManager.getDropZone();
    if (!dropZone) return;

    dropZone.addEventListener("dragenter", this.handleDragEnter.bind(this));
    dropZone.addEventListener("dragleave", this.handleDragLeave.bind(this));
    dropZone.addEventListener("dragover", this.handleDragOver.bind(this));
    dropZone.addEventListener("drop", this.handleDrop.bind(this));
  }

  /**
   * Reagiert auf Dateiauswahl über den versteckten File-Input.
   *
   * @param event - Change-Event des Inputs
   */
  private handleFileInputChange(event: Event): void {
    event.stopPropagation();
    event.preventDefault();

    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];

    // Gleiche Datei erneut wählen ermöglichen
    target.value = "";

    if (file) {
      this.handleFile(file, "Dateiauswahl");
    }
  }

  /**
   * Markiert die Drop-Zone beim Betreten mit einer Datei.
   */
  private handleDragEnter(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragCounter++;
    this.uiManager.setDragOverState(true);
  }

  /**
   * Entfernt die Markierung, wenn die Datei die Zone wieder verlässt.
   */
  private handleDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragCounter--;

    if (this.dragCounter <= 0) {
      this.dragCounter = 0;
      this.uiManager.setDragOverState(false);
    }
  }

  /**
   * Muss preventDefault aufrufen, sonst feuert kein drop-Event.
   */
  private handleDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "copy";
    }
  }

  /**
   * Verarbeitet eine per Drag-and-Drop abgelegte Excel-Datei.
   *
   * @param event - Drop-Event mit dataTransfer.files
   */
  private handleDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();

    this.dragCounter = 0;
    this.uiManager.setDragOverState(false);

    const file = event.dataTransfer?.files[0];
    if (!file) {
      this.uiManager.addToEventLog("Keine Datei beim Ablegen erkannt.", {
        level: "error",
      });
      return;
    }

    this.handleFile(file, "Drag-and-Drop");
  }

  /**
   * Zentraler Einstieg für jede hochgeladene Datei (Klick oder Drag-and-Drop).
   * Validiert zuerst, startet danach die asynchrone Verarbeitung.
   *
   * @param file - Ausgewählte oder abgelegte Excel-Datei
   * @param source - Wie die Datei übergeben wurde (für das Protokoll)
   */
  private handleFile(file: File, source: string): void {
    this.resetUploadState();

    if (!validateFileType(file)) {
      this.uiManager.addToEventLog("Upload abgebrochen: ungültiger Dateityp", {
        level: "error",
        details: `${file.name} – erlaubt sind .xlsx, .xls, .ods`,
      });
      this.uiManager.showErrorMessage(
        "Ungültiger Dateityp. Bitte wählen Sie eine Excel-Datei (.xlsx, .xls, .ods)."
      );
      return;
    }

    if (!validateFileSize(file)) {
      this.uiManager.addToEventLog("Upload abgebrochen: Datei zu groß", {
        level: "error",
        details: `${file.name} (${formatFileSize(file.size)}) – Limit: ${CONFIG.MAX_FILE_SIZE_MB} MB`,
      });
      this.uiManager.showErrorMessage(
        `Datei ist zu groß. Maximale Größe: ${CONFIG.MAX_FILE_SIZE_MB}MB.`
      );
      return;
    }

    this.runStartTime = Date.now();
    this.runStats = this.createEmptyRunStats();

    this.uiManager.addToEventLog("Neuer Prüflauf gestartet", {
      level: "step",
      details: `${file.name} · ${formatFileSize(file.size)} · via ${source}`,
    });
    this.uiManager.setEventLogSummary(`Verarbeite ${file.name} …`);

    void this.processFile(file);
  }

  /**
   * Setzt UI-Zustand vor einem neuen Upload zurück.
   */
  private resetUploadState(): void {
    this.uiManager.resetEventLog();
    this.uiManager.resetProgress();
    this.uiManager.resetErrorTable();
    this.errorTableVisible = false;
    this.runStats = this.createEmptyRunStats();
    this.runStartTime = 0;
  }

  /**
   * Liest die Datei asynchron über FileReader ein.
   * FileReader ist nötig, weil xlsx ein ArrayBuffer braucht.
   *
   * @param file - Validierte Excel-Datei
   */
  private async processFile(file: File): Promise<void> {
    this.uiManager.setLoadingState(true);

    this.uiManager.addToEventLog("Datei wird eingelesen", {
      level: "step",
    });

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

    this.uiManager.addToEventLog("Excel-Struktur erkannt", {
      level: "success",
      details: `${sheetAsJSON.length} Zeilen im ersten Tabellenblatt`,
    });

    const validation = validateExcelStructure(sheetAsJSON);
    if (!validation.isValid) {
      throw new Error(
        `Ungültige Excel-Struktur: ${validation.errors.join(", ")}`
      );
    }

    this.uiManager.addToEventLog("Spalten validiert", {
      level: "success",
      details: "Zeilenbeschriftungen · USt-IdNr.",
    });

    const allUstIds = this.extractUstIds(sheetAsJSON);
    this.runStats.total = allUstIds.length;

    const ustChunks = chunkArray(allUstIds, CONFIG.CHUNK_SIZE);

    this.uiManager.addToEventLog("API-Prüfung gestartet", {
      level: "step",
      details: `${allUstIds.length} USt-Ids · ${ustChunks.length} Chunks à ${CONFIG.CHUNK_SIZE}`,
    });
    this.uiManager.setEventLogSummary(
      `Prüfe 0 / ${allUstIds.length} USt-Ids …`
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

    for (let chunkIndex = 0; chunkIndex < ustChunks.length; chunkIndex++) {
      const chunk = ustChunks[chunkIndex];

      this.uiManager.addToEventLog(
        `Chunk ${chunkIndex + 1} / ${ustChunks.length} wird geprüft`,
        {
          level: "info",
          details: `${chunk.length} parallele API-Anfragen`,
        }
      );

      const promises = chunk.map((ustId) => this.checkUstIdSafe(ustId));
      const results = await Promise.all(promises);

      let chunkValid = 0;
      let chunkInvalid = 0;

      for (const result of results) {
        processedCount++;
        this.uiManager.updateProgress(processedCount, totalCount);
        this.applyResult(result, sheetData);

        if (result.code === ERROR_CODES.SUCCESS) {
          chunkValid++;
        } else {
          chunkInvalid++;
        }
      }

      this.uiManager.setEventLogSummary(
        `Prüfe ${processedCount} / ${totalCount} USt-Ids …`
      );

      // Chunk-Zusammenfassung statt einzelner API-Zeilen – übersichtlicher bei vielen IDs
      this.uiManager.addToEventLog(
        `Chunk ${chunkIndex + 1} / ${ustChunks.length} abgeschlossen`,
        {
          level: chunkInvalid > 0 ? "warning" : "success",
          details: `${chunkValid} gültig · ${chunkInvalid} fehlerhaft`,
        }
      );
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
      this.runStats.formatErrors++;

      return {
        ustId,
        code: "local",
        errorMessage: `Ungültiges Format: ${ustId} (erwartet: DE + 9 Ziffern)`,
      };
    }

    try {
      return await checkUstId(ustId);
    } catch (error) {
      this.runStats.networkErrors++;

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

    const isSuccess = result.code === ERROR_CODES.SUCCESS;

    if (isSuccess) {
      this.runStats.valid++;
      return;
    }

    this.runStats.invalid++;

    if (!this.errorTableVisible) {
      this.uiManager.showErrorTable();
      this.errorTableVisible = true;
    }

    this.uiManager.addErrorRow(result.ustId, result.errorMessage);

    // Fehler einzeln protokollieren – aber nur Fehler, nicht jede erfolgreiche ID
    this.uiManager.addToEventLog(`${result.ustId}: ${result.errorMessage}`, {
      level: result.code === "network" ? "error" : "warning",
      details: `API-Code: ${result.code}`,
    });
  }

  /**
   * Erstellt die Ausgabe-Excel und speichert sie auf dem Desktop.
   *
   * @param sheetData - Geprüfte Zeilen mit Spalte "Gultigkeit"
   */
  private async saveResults(sheetData: UstIdRow[]): Promise<void> {
    this.uiManager.addToEventLog("Ergebnis-Excel wird erstellt", {
      level: "step",
    });

    const binaryData = createResultWorkbook(sheetData);

    try {
      const outputPath = await saveResultToDesktop(binaryData);

      this.uiManager.showSuccessMessage(
        "ZM Ergebnis wurde auf dem Desktop abgelegt."
      );

      this.uiManager.addToEventLog("Datei gespeichert", {
        level: "success",
        details: outputPath,
      });

      this.uiManager.logRunSummary(
        this.buildRunSummary(Date.now() - this.runStartTime, outputPath)
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      this.uiManager.showErrorMessage(
        "ZM Ergebnis konnte nicht gespeichert werden."
      );

      this.uiManager.addToEventLog("Speichern fehlgeschlagen", {
        level: "error",
        details: message,
      });

      this.uiManager.logRunSummary(
        this.buildRunSummary(Date.now() - this.runStartTime)
      );
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

    this.uiManager.addToEventLog("Prüflauf abgebrochen", {
      level: "error",
      details: errorMessage,
    });
    this.uiManager.setEventLogSummary("Fehler – Prüfung abgebrochen");
    this.uiManager.showErrorMessage(`Fehler: ${errorMessage}`);

    if (this.runStartTime > 0) {
      this.uiManager.logRunSummary(
        this.buildRunSummary(Date.now() - this.runStartTime)
      );
    }
  }

  /**
   * Erzeugt leere Lauf-Statistik für einen neuen Upload.
   */
  private createEmptyRunStats(): RunStats {
    return {
      total: 0,
      valid: 0,
      invalid: 0,
      formatErrors: 0,
      networkErrors: 0,
    };
  }

  /**
   * Baut das Statistik-Objekt für die Abschluss-Zusammenfassung.
   *
   * @param durationMs - Dauer des Laufs in Millisekunden
   * @param outputPath - Optionaler Pfad der Ausgabedatei
   */
  private buildRunSummary(
    durationMs: number,
    outputPath?: string
  ): RunSummaryStats {
    return {
      ...this.runStats,
      durationMs,
      outputPath,
    };
  }
}
