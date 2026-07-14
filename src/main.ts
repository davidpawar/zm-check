/**
 * Einstiegspunkt der Frontend-Anwendung.
 * Startet den UstChecker, sobald das HTML-DOM bereit ist.
 */
import { UstChecker } from "./core/ust-checker";

window.addEventListener("DOMContentLoaded", async () => {
  const ustChecker = new UstChecker();
  await ustChecker.initialize();
});
