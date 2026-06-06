import * as THREE from 'three';

// Gemeinsamer Zustand aller Module.
// Alle Module importieren S und lesen/schreiben S.x — kein zirkulärer Import nötig.
export const S = {
  // ── Kamera ──────────────────────────────────────────────
  camDist: 10.33,            // Überschrieben von wuerfel-szene.js beim Start
  camQuat: new THREE.Quaternion(),

  controls_enabled: true,
  rotPointer: null,
  rotLetzX: 0, rotLetzY: 0,
  velH: 0, velV: 0,

  // ── Animation ───────────────────────────────────────────
  animationLaeuft: false,

  // ── Kamera (Kugelkoordinaten) ────────────────────────────
  azimuth:   0,           // wird in wuerfel-szene.js aus Startposition berechnet
  elevation: 0,           // wird in wuerfel-szene.js aus Startposition berechnet

  // ── Display / Ansicht ────────────────────────────────────
  durchsicht: 0.70,
  gitterDeckkraft: 1.0,
  // 0=an (voll), 1=rand, 2=aus, 3=kern
  mittenStufe: 0,      // 0=sichtbar 1=Rand 2=verborgen 3=Kern
  ansichtGeloest: true, ansichtUngeloest: true,
  aktuelleUebung: null, aktuelleUebungName: null,
  aktuelleUebungCubies: null,  // Set von Cubie-Objekten (nach Identität, nicht Ort)

  // ── Verlauf ─────────────────────────────────────────────
  verlauf: [], verlaufPos: -1,

  // ── Interaktion ──────────────────────────────────────────
  aktiveKachel: null,
  gedruecktBei: null,
  warKlick: false,
  mitteTapAnzahl: 0, mitteTapTimer: null,
  wischEintrag: null, wischStart: null, wischWurdeAusgefuehrt: false,
};
