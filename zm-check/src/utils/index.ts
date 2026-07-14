/**
 * Hilfsfunktionen für Arrays und DOM – klein und wiederverwendbar.
 */

/**
 * Teilt ein Array in gleich große Teilstücke (Chunks).
 * Wird genutzt, um API-Anfragen in kontrollierbaren Batches zu senden.
 *
 * @param array - Quell-Array (z. B. alle USt-Ids)
 * @param chunkSize - Maximale Anzahl Elemente pro Chunk
 */
export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];

  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }

  return chunks;
}

/**
 * Sicherer Wrapper um querySelector mit generischem Element-Typ.
 * Gibt null zurück statt zu werfen, wenn das Element fehlt.
 *
 * @param selector - CSS-Selektor
 */
export function safeQuerySelector<T extends Element>(
  selector: string
): T | null {
  return document.querySelector<T>(selector);
}

/**
 * Baut den zusammengesetzten Schlüssel einer Excel-Zeile.
 * BFF-Online erwartet Zeilenbeschriftung + USt-IdNr. als eine Zeichenkette.
 *
 * @param row - Eine Zeile aus der Eingabe-Excel
 */
export function buildUstIdKey(row: {
  Zeilenbeschriftungen: string;
  "USt-IdNr.": string;
}): string {
  return row["Zeilenbeschriftungen"] + row["USt-IdNr."];
}
