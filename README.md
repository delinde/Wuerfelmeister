# Würfelmeister – 3D Zauberwürfel

Ein interaktiver 3×3×3 Zauberwürfel-Simulator im Browser, geschrieben in reinem JavaScript mit [Three.js](https://threejs.org/).

**Live:** [wuem.fl.de](https://wuem.fl.de)

---

## Bedienung

| Geste / Taste | Aktion |
|---|---|
| Maus ziehen | Würfel frei drehen |
| Mausrad | Zoom |
| Klick auf Kachel | Farbwähler öffnen |
| Wischen auf Kachel | Schicht drehen |
| Mittenkachel 1× | Mittenpunkt-Stufe weiterschalten |
| Mittenkachel 2× | Würfel mischen |
| Mittenkachel 3× | Würfel lösen |
| Strg+Z | Rückgängig |
| Strg+Y / Strg+Umschalt+Z | Wiederholen |

### Züge (Rubik-Notation)

Ober- und Unterschicht sowie Seiten: **U D R L F B**
Mittelschichten: **E M S**
Gegenuhrzeigersinn: Apostroph (`R'`), Halbe Drehung: `2` (`U2`)

---

## Ausgangsstellung (gelöst)

| Fläche | Farbe |
|---|---|
| Oben (+Y) | Gelb |
| Unten (−Y) | Weiß |
| Vorne (+Z) | Orange |
| Hinten (−Z) | Rot |
| Links (−X) | Grün |
| Rechts (+X) | Blau |

---

## Funktionen

- **Züge mit Animation** (240 ms, ease-in-out) für alle 18 Standardzüge + E/M/S
- **Undo / Redo** bis zu 120 Schritte (Schnappschuss-Verlauf)
- **Farbwähler** per Klick auf jede Kachel (Farb-Regeln: keine Farbe doppelt pro Würfelchen, keine Gegenfarben auf demselben Stück)
- **Mittenkachel-Stufen:** sichtbar → Rand → verborgen → Kern (Toast-Meldung)
- **Ansicht-Filter:** Gelöste / Ungelöste Würfelchen ein-/ausblenden
- **Durchsicht Rückseite:** stufenloser Regler (0 = opak, 1 = voll transparent)
- **Gitterlinien-Deckkraft:** separat regelbar
- **Übungen:** fokussierte Teilmengen für Lösungsschritte (Stück-Identität, nicht Ort)
- **Zettel-System:** verschieb- und skalierbare Einblendungen (Werkzeuge, Übungen, Ansicht, Erläuterungen)

### Übungen

| Kennung | Beschreibung |
|---|---|
| R1g | Grüner Seitenblock (ohne gelbe Stücke) |
| R1gb | Grüner + Blauer Block |
| R2o | Gelbe Ecken orientieren |
| R2p | Gelbe Ecken permutieren |
| R3a | Kanten aus M- und U-Schicht |
| R3b | Kanten + Mittenfelder |
| R3c6–R3c3 | 6 bis 3 falsch orientierte Kanten |

---

## Technik

- **Three.js r160** via unpkg (ES-Module, Import-Map – kein Build-Schritt nötig)
- **Kamera:** eigene Quaternion-Steuerung (kein Pol-Limit, Trägheits-Dämpfung)
- **Kacheln:** `PlaneGeometry` + `MeshBasicMaterial`; Tiefenpuffer-Trick für Rückseiten-Transparenz
- **Raycasting** für Kachel-Treffer (Touch & Mouse)

### Dateistruktur

```
wuerfel.html          Einstiegspunkt, CSS, HTML-Struktur
wuerfel.js            Szenen-Init, Render-Loop
wuerfel-const.js      Farben, Züge, Geometrie-Konstanten
wuerfel-state.js      Gemeinsamer Zustandsspeicher (S)
wuerfel-szene.js      Cubie-Erstellung, Kamera, Renderer
wuerfel-display.js    Anzeigelogik, Übungsfilter
wuerfel-anim.js       Zug-Animation, Kamerasteuerung
wuerfel-verlauf.js    Undo/Redo, Mischen, Übungen
wuerfel-ui.js         Pointer-Handler, Zettel, Knöpfe
version-bump.sh       Versionsnummer im HTML automatisch erhöhen
```

---

## Lokale Nutzung

Da die App ES-Module mit relativem Import nutzt, braucht sie einen HTTP-Server (kein direktes Öffnen als `file://`).

```bash
# Python (überall verfügbar)
python3 -m http.server 8080

# Node.js
npx serve .
```

Dann im Browser: `http://localhost:8080/wuerfel.html`

---

## Lizenz

Privates Projekt – alle Rechte vorbehalten.
