# Beispiel-Excel

Diese Dateien dienen zum Testen der App ohne echte ZM-Daten.

## Datei

[`zm-beispiel.xlsx`](zm-beispiel.xlsx) – 5 fiktive USt-IdNrn. im erwarteten ZM-Format.

## Erwartete Spalten

| Spalte | Beispiel | Beschreibung |
|--------|----------|--------------|
| `Zeilenbeschriftungen` | `DE` | Länderpräfix |
| `USt-IdNr.` | `123456789` | 9-stelliger Nummernteil |

Die App bildet daraus die vollständige Id: **`DE123456789`**

## Inhalt der Beispieldatei

| Zeilenbeschriftungen | USt-IdNr. |
|----------------------|-----------|
| DE | 123456789 |
| DE | 234567890 |
| DE | 345678901 |
| DE | 456789012 |
| DE | 567890123 |

> Alle Nummern sind **fiktiv** und dienen nur der Struktur-Demonstration.

## Testen

1. App starten: `npm run start` (im Repository-Root)
2. `zm-beispiel.xlsx` per Klick oder Drag-and-Drop hochladen
3. Protokoll und Fortschritt beobachten
4. Ergebnis prüfen: `zm-geprueft.xlsx` auf dem Desktop (neue Spalte `Gultigkeit`)

## Weitere Infos

Vollständige Dokumentation: [README.md](../README.md)
