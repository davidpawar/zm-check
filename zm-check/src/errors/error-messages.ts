import { ERROR_CODES } from "../config/constants";

/**
 * Übersetzt einen BFF-Online-Fehlercode in eine verständliche deutsche Meldung.
 *
 * @param code - Numerischer Antwortcode aus dem XML (z. B. "200", "204")
 * @param validFrom - Gültigkeitsbeginn, nur bei Code 204 relevant
 * @param validTo - Gültigkeitsende, nur bei Code 204 relevant
 * @returns Lokalisierte Meldung für UI, Event-Log und Excel-Spalte "Gultigkeit"
 */
export function getErrorMessageByErrorCode(
  code: string,
  validFrom?: string,
  validTo?: string
): string {
  switch (code) {
    case ERROR_CODES.SUCCESS:
      return "Die angefragte USt-IdNr. ist gültig.";

    case ERROR_CODES.INVALID:
      return "Die angefragte USt-IdNr. ist ungültig.";

    case ERROR_CODES.NOT_REGISTERED:
      return "Die angefragte USt-IdNr. ist ungültig. Sie ist nicht in der Unternehmerdatei des betreffenden EU-Mitgliedstaates registriert.";

    case ERROR_CODES.EXPIRED:
      // Zeitraum kommt aus dem XML – ohne ihn ist die Meldung weniger hilfreich
      if (validFrom && validTo) {
        return `Die angefragte USt-IdNr. ist ungültig. Sie war im Zeitraum von ${validFrom} bis ${validTo} gültig.`;
      }
      return "Die angefragte USt-IdNr. ist ungültig. Zeitraum konnte nicht ermittelt werden.";

    case ERROR_CODES.SERVICE_UNAVAILABLE:
      return "Ihre Anfrage kann derzeit durch den angefragten EU-Mitgliedstaat oder aus anderen Gründen nicht beantwortet werden. Bitte versuchen Sie es später noch einmal. Bei wiederholten Problemen wenden Sie sich bitte an das Bundeszentralamt für Steuern - Dienstsitz Saarlouis.";

    case ERROR_CODES.PROCESSING_ERROR:
      return "Bei der Verarbeitung der Daten aus dem angefragten EU-Mitgliedstaat ist ein Fehler aufgetreten. Ihre Anfrage kann deshalb nicht bearbeitet werden.";

    default:
      return `Unbekannter Fehler (Code: ${code})`;
  }
}
