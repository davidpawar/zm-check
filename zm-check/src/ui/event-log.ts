import type {
  EventLogEntryOptions,
  EventLogLevel,
  RunSummaryStats,
} from "../types/event-log";

/** Deutsche Bezeichnungen für die Level-Badges */
const LEVEL_LABELS: Record<EventLogLevel, string> = {
  info: "Info",
  step: "Schritt",
  success: "OK",
  warning: "Hinweis",
  error: "Fehler",
};

/**
 * Verwaltet das strukturierte Protokoll in der UI.
 * Trennt Darstellung (DOM) von der Geschäftslogik (UstChecker).
 */
export class EventLog {
  private listElement: HTMLElement | null = null;
  private summaryElement: HTMLElement | null = null;
  private entryCount = 0;

  /**
   * Bindet die DOM-Elemente des Protokolls.
   *
   * @param container - Wrapper mit Liste und Zusammenfassung
   */
  initialize(container: HTMLElement): void {
    this.listElement = container.querySelector(".ts-event-log-list");
    this.summaryElement = container.querySelector(".ts-event-log-summary");
  }

  /**
   * Setzt das Protokoll für einen neuen Upload zurück.
   */
  reset(): void {
    this.entryCount = 0;

    if (this.listElement) {
      this.listElement.innerHTML = "";
    }

    this.setSummary("Bereit – warte auf Excel-Datei …");
  }

  /**
   * Aktualisiert die Statuszeile über der Eintragsliste.
   *
   * @param text - Kurzstatus für den Anwender
   */
  setSummary(text: string): void {
    if (this.summaryElement) {
      this.summaryElement.textContent = text;
    }
  }

  /**
   * Fügt einen formatierten Eintrag ans Protokoll an.
   *
   * @param message - Hauptmeldung
   * @param options - Level und optionale Detailzeile
   */
  append(message: string, options: EventLogEntryOptions = {}): void {
    if (!this.listElement) return;

    const level = options.level ?? "info";
    this.entryCount++;

    const entry = document.createElement("article");
    entry.className = `log-entry log-entry--${level}`;

    const time = document.createElement("time");
    time.className = "log-entry__time";
    time.dateTime = new Date().toISOString();
    time.textContent = new Date().toLocaleTimeString("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    const badge = document.createElement("span");
    badge.className = "log-entry__badge";
    badge.textContent = LEVEL_LABELS[level];

    const body = document.createElement("div");
    body.className = "log-entry__body";

    const messageEl = document.createElement("p");
    messageEl.className = "log-entry__message";
    messageEl.textContent = message;
    body.appendChild(messageEl);

    if (options.details) {
      const detailsEl = document.createElement("p");
      detailsEl.className = "log-entry__details";
      detailsEl.textContent = options.details;
      body.appendChild(detailsEl);
    }

    entry.append(time, badge, body);
    this.listElement.appendChild(entry);

    // Neueste Einträge sollen ohne manuelles Scrollen sichtbar sein
    this.listElement.scrollTop = this.listElement.scrollHeight;
  }

  /**
   * Schreibt eine Abschluss-Zusammenfassung nach dem Prüflauf.
   *
   * @param stats - Aggregierte Ergebnisse des Laufs
   */
  appendRunSummary(stats: RunSummaryStats): void {
    const durationSec = (stats.durationMs / 1000).toFixed(1);
    const hasErrors = stats.invalid > 0;

    this.append("Prüfung abgeschlossen", {
      level: hasErrors ? "warning" : "success",
      details: [
        `${stats.total} USt-Ids in ${durationSec}s geprüft`,
        `${stats.valid} gültig · ${stats.invalid} fehlerhaft`,
        stats.formatErrors > 0
          ? `${stats.formatErrors} Formatfehler`
          : null,
        stats.networkErrors > 0
          ? `${stats.networkErrors} Netzwerkfehler`
          : null,
        stats.outputPath ? `Gespeichert: ${stats.outputPath}` : null,
      ]
        .filter(Boolean)
        .join(" · "),
    });

    this.setSummary(
      hasErrors
        ? `Fertig – ${stats.valid}/${stats.total} gültig, ${stats.invalid} Fehler`
        : `Fertig – alle ${stats.total} USt-Ids gültig`
    );
  }
}
