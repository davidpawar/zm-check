import { showToast } from "./toast";
import { safeQuerySelector } from "../utils";

/** CSS-Selektoren aller UI-Elemente – zentral, damit HTML-Änderungen leicht auffindbar sind */
const SELECTORS = {
  fileInput: "#file-input",
  fileLabel: ".ts-zm-input-label",
  progressContainer: ".ts-ust-progress-ctn",
  tableWrapper: ".ts-list-with-errors",
  errorTableBody: ".ts-list-with-errors-table tbody",
  eventLog: ".ts-event-log-ctn",
} as const;

/**
 * Kapselt alle DOM-Operationen der Oberfläche.
 * Geschäftslogik (UstChecker) spricht nur mit dieser Klasse – nicht direkt mit dem DOM.
 */
export class UIManager {
  private fileInput: HTMLInputElement | null = null;
  private fileLabel: HTMLLabelElement | null = null;
  private progressContainer: HTMLDivElement | null = null;
  private tableWrapper: HTMLDivElement | null = null;
  private renderTarget: HTMLTableSectionElement | null = null;
  private eventLogContainer: HTMLDivElement | null = null;

  /**
   * Bindet DOM-Referenzen beim App-Start.
   * Muss aufgerufen werden, bevor andere Methoden genutzt werden.
   */
  initialize(): void {
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
    this.eventLogContainer = safeQuerySelector<HTMLDivElement>(
      SELECTORS.eventLog
    );
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

    // innerHTML statt einzelner DOM-Updates – bei jedem Chunk akzeptabel
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
   * Schreibt einen Eintrag ins aufklappbare Event-Log (Debugging für Anwender).
   *
   * @param message - Beschreibung des aktuellen Schritts
   */
  addToEventLog(message: string): void {
    if (!this.eventLogContainer) return;

    const logElement = document.createElement("div");
    logElement.className = "log-entry";
    logElement.textContent = `[${new Date().toLocaleTimeString("de-DE")}] ${message}`;
    this.eventLogContainer.appendChild(logElement);

    // Neueste Einträge sollen sichtbar bleiben
    this.eventLogContainer.scrollTop = this.eventLogContainer.scrollHeight;
  }

  /** Leert das Event-Log vor einem neuen Upload. */
  resetEventLog(): void {
    if (!this.eventLogContainer) return;
    this.eventLogContainer.innerHTML = "";
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
