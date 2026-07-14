import { writeFile } from "@tauri-apps/plugin-fs";
import { desktopDir, join } from "@tauri-apps/api/path";
import { CONFIG } from "../config/constants";

/**
 * Speichert die Ergebnis-Excel auf dem Desktop des Anwenders.
 * Nutzt Tauri-Plugins, weil Browser-Apps keinen direkten Dateizugriff haben.
 *
 * @param binaryData - Fertige .xlsx-Datei als Bytes
 * @returns Absoluter Pfad der gespeicherten Datei
 */
export async function saveResultToDesktop(
  binaryData: Uint8Array
): Promise<string> {
  const desktopPath = await desktopDir();
  // join() statt String-Konkatenation – plattformunabhängige Pfade
  const outputPath = await join(desktopPath, CONFIG.OUTPUT_FILENAME);

  await writeFile(outputPath, binaryData);

  return outputPath;
}
