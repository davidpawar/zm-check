import { fetch } from "@tauri-apps/plugin-http";
import { CONFIG } from "../config/constants";
import { getErrorMessageByErrorCode } from "../errors/error-messages";
import type { UstCheckResult } from "../types";

/**
 * Baut die vollständige BFF-Online-Anfrage-URL für eine USt-IdNr.
 *
 * @param ustId - Zu prüfende USt-Id (Zeilenbeschriftung + Nummer)
 */
function buildApiUrl(ustId: string): string {
  const params = new URLSearchParams({
    UstId_1: CONFIG.API_PARAMS.UST_ID_1,
    UstId_2: ustId,
    Firmenname: CONFIG.API_PARAMS.FIRMENNAME,
    Ort: CONFIG.API_PARAMS.ORT,
    PLZ: CONFIG.API_PARAMS.PLZ,
    Strasse: CONFIG.API_PARAMS.STRASSE,
  });

  return `${CONFIG.API_BASE_URL}?${params.toString()}`;
}

/**
 * Parst die XML-Antwort der BFF-Online API.
 * Die API liefert kein JSON, sondern ein festes XML-Schema mit <string>-Elementen.
 *
 * @param xmlData - Rohe XML-Antwort als Text
 * @param ustId - Geprüfte USt-Id (für das Ergebnisobjekt)
 */
function parseApiResponse(xmlData: string, ustId: string): UstCheckResult {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlData, "text/xml");
  const groupedValues = xmlDoc.querySelectorAll("string");

  // Indizes sind im BFF-Online-Schema fest definiert – nicht umbenennen ohne API-Doku
  const code = groupedValues[3]?.textContent ?? "unknown";
  const validFrom = groupedValues[23]?.textContent ?? undefined;
  const validTo = groupedValues[25]?.textContent ?? undefined;

  const errorMessage = getErrorMessageByErrorCode(code, validFrom, validTo);

  return {
    ustId,
    code,
    errorMessage,
  };
}

/**
 * Prüft eine einzelne USt-IdNr. über die BFF-Online Schnittstelle.
 * HTTP läuft über das Tauri-Plugin, um CORS-Beschränkungen im Desktop zu umgehen.
 *
 * @param ustId - Vollständige USt-IdNr. inkl. Länderkennung
 */
export async function checkUstId(ustId: string): Promise<UstCheckResult> {
  const url = buildApiUrl(ustId);
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `API-Anfrage fehlgeschlagen (${response.status}) für ${ustId}`
    );
  }

  const xmlData = await response.text();
  return parseApiResponse(xmlData, ustId);
}
