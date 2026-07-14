import { CONFIG } from "../config/constants";
import Toastify from "toastify-js";

/**
 * Zeigt eine kurze Toast-Benachrichtigung unten im Fenster.
 *
 * @param message - Anzuzeigender Text
 * @param isError - true = roter Hintergrund für Fehler
 */
export function showToast(message: string, isError = false): void {
  Toastify({
    text: message,
    duration: CONFIG.TOAST_DURATION,
    close: true,
    stopOnFocus: true,
    // Farbe signalisiert Erfolg/Fehler ohne separates Modal
    style: {
      background: isError ? "#ff4444" : "#4CAF50",
    },
  }).showToast();
}
