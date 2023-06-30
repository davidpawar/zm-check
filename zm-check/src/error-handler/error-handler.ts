export function getErrorMessageByErrorCode(
  code: string,
  validFrom?: string,
  validTo?: string
): string {
  let errorMessage = "";

  console.log(code);

  switch (code) {
    case "200":
      errorMessage = "Die angefragte USt-IdNr. ist gültig.";
      break;
    case "201":
      errorMessage = "Die angefragte USt-IdNr. ist ungültig.";
      break;
    case "202":
      errorMessage =
        "Die angefragte USt-IdNr. ist ungültig. Sie ist nicht in der Unternehmerdatei des betreffenden EU-Mitgliedstaates registriert.";
      break;
    case "204":
      errorMessage = `Die angefragte USt-IdNr. ist ungültig. Sie war im Zeitraum von ${validFrom} bis ${validTo} gültig.`;
      break;
    case "205":
      errorMessage = `Ihre Anfrage kann derzeit durch den angefragten EU-Mitgliedstaat oder aus anderen Gründen nicht beantwortet werden. Bitte versuchen Sie es später noch einmal. Bei wiederholten Problemen wenden Sie sich bitte an das Bundeszentralamt für Steuern - Dienstsitz Saarlouis.`;
      break;
    case "217":
      errorMessage =
        "Bei der Verarbeitung der Daten aus dem angefragten EU-Mitgliedstaat ist ein Fehler aufgetreten. Ihre Anfrage kann deshalb nicht bearbeitet werden.";
      break;
    default:
      errorMessage = "Unbekannter Fehler";
      break;
  }

  return errorMessage;
}
