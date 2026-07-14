import { showToast } from "./toast";
import { EventLog } from "./event-log";
import { safeQuerySelector } from "../utils";
import type { EventLogEntryOptions, RunSummaryStats } from "../types/event-log";

/** CSS-Selektoren aller UI-Elemente – zentral, damit HTML-Änderungen leicht auffindbar sind */
const SELECTORS = {
  dropZone: "#drop-zone",
  fileInput: "#file-input",
  fileLabel: ".ts-zm-input-label",
  progressContainer: ".ts-ust-progress-ctn",
  tableWrapper: ".ts-list-with-errors",
  errorTableBody: ".ts-list-with-errors-table tbody",
  eventLog: "#event-log",
} as const;

/**
 * Kapselt alle DOM-Operationen der Oberfläche.
 * Geschäftslogik (UstChecker) spricht nur mit dieser Klasse – nicht direkt mit dem DOM.
 */
export class UIManager {
  private eventLog = new EventLog();
  private dropZone: HTMLDivElement | null = null;
  private fileInput: HTMLInputElement | null = null;
  private fileLabel: HTMLLabelElement | null = null;
  private progressContainer: HTMLDivElement | null = null;
  private tableWrapper: HTMLDivElement | null = null;
  private renderTarget: HTMLTableSectionElement | null = null;

  /**
   * Bindet DOM-Referenzen beim App-Start.
   * Muss aufgerufen werden, bevor andere Methoden genutzt werden.
   */
  initialize(): void {
    this.dropZone = safeQuerySelector<HTMLDivElement>(SELECTORS.dropZone);
    this.fileInput = safeQuerySelector<HTMLInputElement>(SELECTORS.fileInput);
    this.fileLabel = safeQuerySelector<HTMLLabelElement>(SELECTORS.fileLabel);
    this.progressContainer = safeQuerySelector<HTMLDivElement>(
      SELECTORS.progressContainer
    );
    this.tableWrapper = safeQuerySelector<HTMLDivElement>(
      SELECTORS.tableWrapper
    );
    this.renderTarget = safeQuerySelector<HTMLTableSectionElement>(
      SELECTORS.errorTableBody
    );

    const eventLogContainer = safeQuerySelector<HTMLElement>(SELECTORS.eventLog);
    if (eventLogContainer) {
      this.eventLog.initialize(eventLogContainer);
    }
  }

  /**
   * Gibt die Drop-Zone zurück – wird für Drag-and-Drop-Events benötigt.
   */
  getDropZone(): HTMLDivElement | null {
    return this.dropZone;
  }

  /**
   * Visuelles Feedback, wenn eine Datei über die Drop-Zone gezogen wird.
   *
   * @param isActive - true solange die Datei über der Zone schwebt
   */
  setDragOverState(isActive: boolean): void {
    this.dropZone?.classList.toggle("is-drag-over", isActive);
  }

  /**
   * Sperrt den Datei-Upload während einer laufenden Verarbeitung.
   * Verhindert parallele Uploads, die die API und UI überlasten würden.
   *
   * @param isLoading - true während Excel/API-Verarbeitung
   */
  setLoadingState(isLoading: boolean): void {
    if (!this.fileInput) return;

    this.fileInput.disabled = isLoading;
    this.fileLabel?.classList.toggle("is-loading", isLoading);
    this.dropZone?.classList.toggle("is-loading", isLoading);

    if (isLoading) {
      showToast("Verarbeitung läuft...");
    }
  }

  /**
   * Aktualisiert Fortschrittsanzeige (Text + Balken).
   *
   * @param current - Bereits geprüfte USt-Ids
   * @param total - Gesamtanzahl zu prüfender USt-Ids
   */
  updateProgress(current: number, total: number): void {
    if (!this.progressContainer) return;

    const percentage = ((current / total) * 100).toFixed(2);

    this.progressContainer.innerHTML = `
      <div class="progress-text">${current} von ${total} geladen. (${percentage}%)</div>
      <div class="progress-bar">
        <div class="progress-fill" style="width: ${percentage}%"></div>
      </div>
    `;
  }

  /**
   * Blendet die Fehlertabelle ein (nur wenn mindestens ein Fehler vorliegt).
   */
  showErrorTable(): void {
    this.tableWrapper?.classList.remove("ts-hidden");
  }

  /**
   * Fügt eine fehlerhafte USt-Id zur Live-Tabelle hinzu.
   *
   * @param ustId - Geprüfte USt-IdNr.
   * @param errorMessage - Übersetzte API-Meldung
   */
  addErrorRow(ustId: string, errorMessage: string): void {
    if (!this.renderTarget) return;

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${ustId}</td>
      <td>${errorMessage}</td>
    `;
    this.renderTarget.appendChild(row);
  }

  /**
   * Schreibt einen strukturierten Eintrag ins Protokoll.
   *
   * @param message - Hauptmeldung
   * @param options - Level und optionale Detailzeile
   */
  addToEventLog(message: string, options: EventLogEntryOptions = {}): void {
    this.eventLog.append(message, options);
  }

  /**
   * Aktualisiert die Statuszeile über dem Protokoll.
   *
   * @param text - Kurzstatus
   */
  setEventLogSummary(text: string): void {
    this.eventLog.setSummary(text);
  }

  /**
   * Schreibt die Abschluss-Zusammenfassung eines Prüflaufs.
   *
   * @param stats - Aggregierte Lauf-Statistik
   */
  logRunSummary(stats: RunSummaryStats): void {
    this.eventLog.appendRunSummary(stats);
  }

  /** Leert das Protokoll vor einem neuen Upload. */
  resetEventLog(): void {
    this.eventLog.reset();
  }

  /** Setzt die Fortschrittsanzeige zurück. */
  resetProgress(): void {
    if (!this.progressContainer) return;
    this.progressContainer.innerHTML = "";
  }

  /**
   * Entfernt alle Fehlerzeilen und versteckt die Tabelle.
   * Header-Zeile bleibt erhalten.
   */
  resetErrorTable(): void {
    if (!this.renderTarget) return;

    this.renderTarget.innerHTML = "";
    this.tableWrapper?.classList.add("ts-hidden");
  }

  /**
   * Zeigt eine grüne Erfolgs-Toast-Meldung.
   *
   * @param message - Erfolgstext für den Anwender
   */
  showSuccessMessage(message: string): void {
    showToast(message);
  }

  /**
   * Zeigt eine rote Fehler-Toast-Meldung.
   *
   * @param message - Fehlertext für den Anwender
   */
  showErrorMessage(message: string): void {
    showToast(message, true);
  }
}
