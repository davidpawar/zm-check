import { defineConfig } from "vite";

/**
 * Vite-Konfiguration für die Tauri-Desktop-App.
 * Port 1420 ist fest, weil Tauri die Dev-URL in tauri.conf.json erwartet.
 */
const host = process.env.TAURI_DEV_HOST;

export default defineConfig({
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    // Rust-Build-Artefakte nicht beobachten – spart CPU und verhindert Neustart-Schleifen
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
  envPrefix: ["VITE_", "TAURI_ENV_", "TAURI_"],
  build: {
    target:
      process.env.TAURI_ENV_PLATFORM === "windows" ? "chrome105" : "safari13",
    // Vite 8 minifiziert standardmäßig mit Oxc – esbuild ist nicht mehr eingebaut
    minify: !process.env.TAURI_ENV_DEBUG,
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
  },
});
