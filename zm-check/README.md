# ZM-Check – USt-Prüfer

Tauri-Desktop-Anwendung zur Batch-Prüfung von USt-IdNrn. über die BFF-Online API.

## Features

- Excel-Upload (.xlsx, .xls, .ods)
- Parallele API-Prüfung in konfigurierbaren Chunks
- Live-Fortschritt und Fehlertabelle
- Ergebnis-Excel auf dem Desktop (`zm-geprueft.xlsx`)

## Tech-Stack

| Bereich | Technologie |
|---------|-------------|
| Desktop-Shell | Tauri 2 |
| Frontend | TypeScript + Vite 6 |
| Excel | SheetJS (`xlsx`) |
| API | BFF-Online (`evatr.bff-online.de`) |

## Projektstruktur

```
src/
├── main.ts                 # Einstiegspunkt
├── config/constants.ts     # API-URL, Limits, Dateinamen
├── types/index.ts          # TypeScript-Interfaces
├── core/ust-checker.ts     # Haupt-Orchestrator (Upload → Prüfung → Speichern)
├── services/
│   ├── ust-api.service.ts      # BFF-Online HTTP + XML-Parsing
│   ├── excel.service.ts        # Excel lesen/schreiben
│   └── file-storage.service.ts # Speichern auf Desktop
├── ui/
│   ├── ui-manager.ts       # DOM-Updates (Fortschritt, Tabelle, Log)
│   └── toast.ts            # Toast-Benachrichtigungen
├── validation/index.ts     # Datei- und Excel-Validierung
├── errors/error-messages.ts # API-Code → deutsche Meldung
└── utils/index.ts          # Hilfsfunktionen (chunkArray, buildUstIdKey)
```

**Einstieg für neue Entwickler:** Starte mit `src/main.ts` → `core/ust-checker.ts`. Jede Datei enthält JSDoc-Kommentare.

## Installation

```bash
cd zm-check
npm install
```

## Entwicklung

```bash
npm run start
```

## Build

```bash
npm run build
npm run tauri build
```

## Verwendung

1. Excel mit Spalten `Zeilenbeschriftungen` und `USt-IdNr.` hochladen
2. Automatische Prüfung aller USt-Ids
3. Ergebnis mit Spalte `Gultigkeit` wird auf dem Desktop gespeichert

## Konfiguration

Wichtige Werte in `src/config/constants.ts`:

- `API_PARAMS.UST_ID_1` – eigene DE-USt-IdNr. als Anfragender
- `CHUNK_SIZE` – parallele Anfragen pro Batch (Standard: 16)
- `MAX_FILE_SIZE_MB` – maximale Upload-Größe

## Lizenz

Siehe [LICENSE](../LICENSE).
