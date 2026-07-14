# zm-check

Tauri-Desktop-Anwendung zur Batch-Prüfung von USt-IdNrn. über die BFF-Online API.

Dokumentation und Setup: [`zm-check/README.md`](zm-check/README.md)

## Beispiel-Excel

Vorlage mit der erwarteten ZM-Struktur: [`zm-check/examples/zm-beispiel.xlsx`](zm-check/examples/zm-beispiel.xlsx)

| Zeilenbeschriftungen | USt-IdNr. |
|----------------------|-----------|
| DE | 123456789 |
| DE | 234567890 |

Spalten `Zeilenbeschriftungen` + `USt-IdNr.` ergeben zusammen die vollständige USt-Id (z. B. `DE123456789`).
