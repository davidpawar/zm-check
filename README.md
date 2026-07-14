# ZM-Check – USt-Prüfer

Desktop-Anwendung zur Batch-Prüfung von USt-IdNrn. über die [BFF-Online API](https://evatr.bff-online.de/).

Die App liest eine ZM-Excel ein, prüft alle enthaltenen USt-Ids parallel und speichert das Ergebnis mit einer Spalte **Gültigkeit** auf dem Desktop.

## Features

- Excel-Upload (`.xlsx`, `.xls`, `.ods`) per **Klick** oder **Drag-and-Drop**
- Parallele API-Prüfung in konfigurierbaren Chunks (Standard: 16)
- Live-Fortschrittsbalken und Fehlertabelle
- Strukturiertes **Protokoll** mit Statuszeile, Kategorien und Abschluss-Zusammenfassung
- Toast-Benachrichtigungen für Erfolg und Fehler
- Ergebnis-Excel auf dem Desktop: `zm-geprueft.xlsx`

## Voraussetzungen

| Tool | Version |
|------|---------|
| [Node.js](https://nodejs.org/) | 20.19+, 22.12+ oder 24+ (für Vite 8) |
| [Rust](https://www.rust-lang.org/) | 1.77+ (für Tauri 2) |
| npm | mit Node.js |

Tauri-Systemabhängigkeiten: [Tauri Prerequisites](https://v2.tauri.app/start/prerequisites/)

## Tech-Stack

| Bereich | Technologie |
|---------|-------------|
| Desktop-Shell | [Tauri 2](https://v2.tauri.app/) |
| Frontend | TypeScript 7, Vite 8 (Rolldown/Oxc) |
| Excel | [SheetJS](https://sheetjs.com/) (`xlsx`) |
| UI-Feedback | [Toastify](https://apvarun.github.io/toastify-js/) |
| API | BFF-Online (`evatr.bff-online.de`) |

## Schnellstart

```bash
# Repository klonen und ins Projektverzeichnis wechseln
npm install

# Desktop-App im Dev-Modus starten
npm run start
```

## NPM-Scripts

| Befehl | Beschreibung |
|--------|--------------|
| `npm run start` | Tauri Dev-Server (Frontend + Desktop-Fenster) |
| `npm run dev` | Nur Vite Dev-Server (Port 1420) |
| `npm run build` | TypeScript prüfen + Frontend-Production-Build |
| `npm run tauri build` | Vollständiger Desktop-Build (.app / .dmg / .exe) |
| `npm run preview` | Production-Build lokal im Browser testen |

## Verwendung

1. App starten (`npm run start`)
2. Excel-Datei hochladen – per Klick auf **Liste analysieren**, per Drag-and-Drop auf die Upload-Zone, oder mit der [Beispieldatei](examples/zm-beispiel.xlsx)
3. Prüfung läuft automatisch; Fortschritt und Protokoll werden live angezeigt
4. Ergebnis-Excel `zm-geprueft.xlsx` wird auf dem **Desktop** gespeichert

## Beispiel-Excel

Vorlage: [`examples/zm-beispiel.xlsx`](examples/zm-beispiel.xlsx) · Details: [`examples/README.md`](examples/README.md)

### Eingabe – erforderliche Spalten

| Spalte | Pflicht | Beschreibung |
|--------|---------|--------------|
| `Zeilenbeschriftungen` | Ja | Länderpräfix, z. B. `DE` |
| `USt-IdNr.` | Ja | Numerischer Teil, z. B. `123456789` |

Beide Spalten werden zusammengefügt: `DE` + `123456789` → `DE123456789`

| Zeilenbeschriftungen | USt-IdNr. |
|----------------------|-----------|
| DE | 123456789 |
| DE | 234567890 |
| DE | 345678901 |

> USt-IdNrn. in der Beispieldatei sind **fiktiv**.

### Ausgabe

Die App ergänzt die Spalte **`Gultigkeit`** mit der deutschen API-Antwort und speichert alles als `zm-geprueft.xlsx`.

## Projektstruktur

```
zm-check/                         # Repository-Root
├── src/                          # Frontend (TypeScript)
│   ├── main.ts                   # Einstiegspunkt
│   ├── config/constants.ts       # API-URL, Limits, Dateinamen
│   ├── core/ust-checker.ts       # Orchestrator: Upload → Prüfung → Speichern
│   ├── services/
│   │   ├── ust-api.service.ts    # BFF-Online HTTP + XML-Parsing
│   │   ├── excel.service.ts      # Excel lesen/schreiben
│   │   └── file-storage.service.ts
│   ├── ui/
│   │   ├── ui-manager.ts         # DOM: Fortschritt, Tabelle, Drop-Zone
│   │   ├── event-log.ts          # Strukturiertes Protokoll
│   │   └── toast.ts              # Toast-Benachrichtigungen
│   ├── validation/index.ts       # Datei-, Format- und Excel-Validierung
│   ├── errors/error-messages.ts  # API-Codes → deutsche Meldungen
│   ├── types/                    # TypeScript-Interfaces
│   └── utils/index.ts            # Hilfsfunktionen
├── src-tauri/                    # Tauri/Rust Backend
│   ├── src/main.rs               # Plugin-Registrierung (HTTP, FS, Shell)
│   ├── tauri.conf.json           # Fenster, Build, Bundle
│   └── capabilities/             # Tauri-2-Berechtigungen
├── examples/                     # Beispiel-Excel + Kurzdoku
├── index.html                    # App-HTML
├── vite.config.ts                # Vite/Tauri Dev-Server (Port 1420)
├── tsconfig.json
└── package.json
```

### Einstieg für neue Entwickler

1. `src/main.ts` – App-Start
2. `src/core/ust-checker.ts` – gesamter Ablauf
3. `src/config/constants.ts` – Konfiguration anpassen
4. Jede Datei enthält **JSDoc-Kommentare** (Block für Funktionen, Inline für „Warum“)

### Ablauf im Code

```
Datei-Upload (Klick / Drag-and-Drop)
  → Validierung (Typ, Größe, Excel-Spalten)
  → Excel einlesen (xlsx)
  → USt-Ids in Chunks aufteilen
  → BFF-Online API (parallel pro Chunk)
  → Ergebnisse in Excel + Fehlertabelle + Protokoll
  → Speichern auf Desktop (Tauri FS-Plugin)
```

## Konfiguration

Zentrale Werte in [`src/config/constants.ts`](src/config/constants.ts):

| Konstante | Standard | Beschreibung |
|-----------|----------|--------------|
| `API_PARAMS.UST_ID_1` | `DE328147354` | Eigene DE-USt-IdNr. als Anfragender |
| `CHUNK_SIZE` | `16` | Parallele API-Anfragen pro Batch |
| `MAX_FILE_SIZE_MB` | `10` | Maximale Upload-Größe |
| `OUTPUT_FILENAME` | `zm-geprueft.xlsx` | Name der Ergebnisdatei |
| `TOAST_DURATION` | `3000` | Toast-Anzeigedauer (ms) |

Tauri-Konfiguration: [`src-tauri/tauri.conf.json`](src-tauri/tauri.conf.json)

- Dev-URL: `http://localhost:1420`
- `dragDropEnabled: false` – nötig für HTML5 Drag-and-Drop im Webview

## Build

```bash
# Frontend bauen
npm run build

# Desktop-App bündeln (macOS: .app + .dmg)
npm run tauri build
```

Artefakte unter `src-tauri/target/release/bundle/`.

Nach Umzügen oder Pfadänderungen ggf. Rust-Cache leeren:

```bash
cd src-tauri && cargo clean && cd ..
```

## API-Integration

- **Endpoint:** `https://evatr.bff-online.de/evatrRPC`
- **Antwortformat:** XML (wird in `ust-api.service.ts` geparst)
- **HTTP:** über `@tauri-apps/plugin-http` (umgeht Browser-CORS)
- **Dateizugriff:** über `@tauri-apps/plugin-fs`

Bekannte Antwort-Codes siehe `ERROR_CODES` in `src/config/constants.ts` und [BZSt-Dokumentation](https://www.bzst.de/DE/Unternehmen/Umsatzsteuer/Umsatzsteuer-Identifikationsnummer/Validierung_USt-IdNr/validierung_USt-IdNr_node.html).

## Lizenz

Siehe [LICENSE](LICENSE).
