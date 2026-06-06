import * as THREE from 'three';
import { FARBEN, GEGENUEBER, ALLE_ZUEGE, ZUEGE_NACH_NAME } from './wuerfel-const.js';
import { kamera, zeichner, alleKacheln, mitteListe, drehenDelta, kameraAktualisieren } from './wuerfel-szene.js';
import { S } from './wuerfel-state.js';
import { displayAlles, setzeFarbe } from './wuerfel-display.js';
import { zugMitAnimation, steuerungZuruecksetzen } from './wuerfel-anim.js';
import { zustandSpeichern, geloestSetzen, mischen, uebungSetzen, uebungMischen, uebungBeenden, rueckgaengig, wiederholen } from './wuerfel-verlauf.js';

// ── Mittenkachel-Stufen-Toast ──────────────────────────────
const MITTEN_STUFENNAMEN = ['sichtbar', 'Rand', 'verborgen', 'Kern'];
const mittenToast = document.getElementById('mitten-toast');
let toastTimer = null;
function mittenToastZeigen() {
  if (!mittenToast) return;          // Element fehlt (alter Cache) → still
  mittenToast.textContent = 'Mittenkachel · ' + MITTEN_STUFENNAMEN[S.mittenStufe];
  mittenToast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => mittenToast.classList.remove('show'), 2000);
}

// ── Farbwähler ────────────────────────────────────────────
const farbwaehler = document.getElementById('picker');
const farbKnoepfe = {};

for (const f of FARBEN) {
  const b = document.createElement('button');
  b.className = 'cbtn'; b.style.background = f.css; b.title = f.bezeichnung;
  farbwaehler.appendChild(b);
  farbKnoepfe[f.id] = b;
  b.addEventListener('click', () => farbAnwenden(f.id));
}
const leerKnopf = document.createElement('button');
leerKnopf.className = 'cbtn clear'; leerKnopf.textContent = '✕'; leerKnopf.title = 'Transparent';
leerKnopf.addEventListener('click', () => farbAnwenden(null));
farbwaehler.appendChild(leerKnopf);

function farbAnwenden(farbId) {
  if (!S.aktiveKachel) return;
  zustandSpeichern();
  setzeFarbe(S.aktiveKachel, farbId);
  waehlerVerbergen();
}

function waehlerZeigen(k, px, py) {
  S.aktiveKachel = k;
  const andere = new Set(k.cubie.kacheln.filter(ok=>ok!==k).map(ok=>ok.farbId_echt).filter(Boolean));
  for (const f of FARBEN) {
    const gegen = GEGENUEBER[f.id];
    farbKnoepfe[f.id].disabled = andere.has(f.id) || (gegen && andere.has(gegen));
  }
  farbwaehler.style.left = Math.min(px+14, innerWidth -172) + 'px';
  farbwaehler.style.top  = Math.min(py+14, innerHeight-155) + 'px';
  farbwaehler.classList.add('show');
}

function waehlerVerbergen() { farbwaehler.classList.remove('show'); S.aktiveKachel = null; }

// ── Scheiben-Wischen ──────────────────────────────────────
function wischeScheibe(k, dx, dy) {
  const rechts  = new THREE.Vector3().setFromMatrixColumn(kamera.matrixWorld, 0);
  const obenVek = new THREE.Vector3().setFromMatrixColumn(kamera.matrixWorld, 1);
  const welt    = new THREE.Vector3()
    .addScaledVector(rechts,    dx)
    .addScaledVector(obenVek, -dy);

  const n = new THREE.Vector3();
  n.setComponent(k.flAchse, k.flVz);
  welt.addScaledVector(n, -welt.dot(n));
  if (welt.lengthSq() < 1e-4) return false;

  const drehachse = new THREE.Vector3().crossVectors(n, welt);
  const komp      = [Math.abs(drehachse.x), Math.abs(drehachse.y), Math.abs(drehachse.z)];
  const achse     = komp.indexOf(Math.max(...komp));
  const rotVz     = Math.sign(drehachse.getComponent(achse));

  const schichtVz  = k.cubie.logPos[achse];
  const kandidaten = ALLE_ZUEGE.filter(z => z.achse === achse && z.vz === schichtVz);
  if (!kandidaten.length) return false;

  const refVz    = kandidaten[0].drehVz ?? schichtVz;
  const animVz   = achse < 2 ? refVz : -refVz;
  const basisZug = (rotVz === animVz);

  const zug = basisZug ? kandidaten[0] : kandidaten[1];
  if (!zug) return false;

  zustandSpeichern(zug.name);
  zugMitAnimation(zug);
  return true;
}

// ── Pointer-Interaktion (Kachel-Treffer / Wischen / Klick) ─
const strahl = new THREE.Raycaster();

zeichner.domElement.addEventListener('pointerdown', e => {
  waehlerVerbergen();
  S.gedruecktBei = [e.clientX, e.clientY];
  S.warKlick     = false;
  S.wischEintrag = null;
  S.wischStart   = null;
  if (S.animationLaeuft) return;
  strahl.setFromCamera(
    new THREE.Vector2((e.clientX/innerWidth)*2-1, -(e.clientY/innerHeight)*2+1), kamera);
  const treffer = strahl.intersectObjects(alleKacheln);
  if (treffer.length > 0) {
    S.wischEintrag     = treffer[0].object.userData;
    S.wischStart       = [e.clientX, e.clientY];
    S.controls_enabled = false;
    S.rotPointer       = null;
    S.velH = 0; S.velV = 0;
  }
});

zeichner.domElement.addEventListener('pointermove', e => {
  if (!S.wischEintrag || !S.wischStart || S.animationLaeuft) return;
  const wdx = e.clientX - S.wischStart[0];
  const wdy = e.clientY - S.wischStart[1];
  if (Math.sqrt(wdx*wdx + wdy*wdy) <= 12) return;
  const getroffeneKachel = S.wischEintrag;
  S.wischEintrag = null; S.wischStart = null;
  const animiert = wischeScheibe(getroffeneKachel, wdx, wdy);
  S.wischWurdeAusgefuehrt = true;
  if (!animiert) steuerungZuruecksetzen();
});

zeichner.domElement.addEventListener('pointerup', e => {
  if (!S.gedruecktBei) return;
  const dx = e.clientX - S.gedruecktBei[0];
  const dy = e.clientY - S.gedruecktBei[1];
  S.gedruecktBei = null;
  if (S.wischWurdeAusgefuehrt) { S.wischWurdeAusgefuehrt = false; return; }
  S.wischEintrag = null; S.wischStart = null;
  steuerungZuruecksetzen();
  S.warKlick = (dx*dx + dy*dy <= 25);
});

zeichner.domElement.addEventListener('pointercancel', () => {
  S.controls_enabled = true; S.rotPointer = null; S.velH = 0; S.velV = 0;
  S.wischEintrag = null; S.wischStart = null; S.wischWurdeAusgefuehrt = false;
  S.gedruecktBei = null; S.warKlick = false;
});

zeichner.domElement.addEventListener('click', e => {
  if (!S.warKlick) return;
  S.warKlick = false;
  if (S.animationLaeuft) return;
  strahl.setFromCamera(
    new THREE.Vector2((e.clientX/innerWidth)*2-1, -(e.clientY/innerHeight)*2+1), kamera);
  const treffer = strahl.intersectObjects(alleKacheln);
  if (!treffer.length) return;
  const k = treffer[0].object.userData;
  if (k.istMitte) {
    S.mitteTapAnzahl++;
    clearTimeout(S.mitteTapTimer);
    const anzahl = S.mitteTapAnzahl;
    S.mitteTapTimer = setTimeout(() => {
      S.mitteTapAnzahl = 0;
      if (anzahl >= 3)       { zustandSpeichern(); geloestSetzen(); }
      else if (anzahl === 2) { zustandSpeichern(); mischen(); }
      else {
        zustandSpeichern();
        mittenStufeSchalten();
        mittenToastZeigen();
      }
    }, 350);
  } else if (e.detail === 1) {
    waehlerZeigen(k, e.clientX, e.clientY);
  }
});

window.addEventListener('pointerdown', e => {
  if (!farbwaehler.contains(e.target)) waehlerVerbergen();
}, { capture: true });

// ── Kamera-Drehung (nach Tile-Handlern registriert) ────────
zeichner.domElement.addEventListener('pointerdown', e => {
  if (!S.controls_enabled || S.rotPointer !== null || !e.isPrimary) return;
  S.rotPointer = e.pointerId;
  S.rotLetzX = e.clientX; S.rotLetzY = e.clientY;
  S.velH = 0; S.velV = 0;
});

zeichner.domElement.addEventListener('pointermove', e => {
  if (!S.controls_enabled || e.pointerId !== S.rotPointer) return;
  const dx = e.clientX - S.rotLetzX;
  const dy = e.clientY - S.rotLetzY;
  S.rotLetzX = e.clientX; S.rotLetzY = e.clientY;
  S.velH = -dx * 0.007;
  S.velV = -dy * 0.007;
  drehenDelta(S.velH, S.velV);
});

zeichner.domElement.addEventListener('pointerup', e => {
  if (e.pointerId === S.rotPointer) S.rotPointer = null;
});

zeichner.domElement.addEventListener('wheel', e => {
  if (!S.controls_enabled) return;
  e.preventDefault();
  S.camDist = Math.max(4, Math.min(18, S.camDist * (1 + e.deltaY * 0.001)));
  kameraAktualisieren();
}, { passive: false });

// ── Zettel-System ─────────────────────────────────────────
let obenZ = 30;
function nachVorne(el) { obenZ++; el.style.zIndex = obenZ; }

function zettelInit(zettel) {
  const griffleiste   = zettel.querySelector('.zettel-grip');
  const groessengriff = zettel.querySelector('.zettel-resize');

  griffleiste.addEventListener('mousedown', e => {
    if (e.target.closest('.zettel-close')) return;
    e.preventDefault();
    nachVorne(zettel);
    const rahmen = zettel.getBoundingClientRect();
    const offX   = e.clientX - rahmen.left;
    const offY   = e.clientY - rahmen.top;
    function bewegen(ev) {
      zettel.style.left  = Math.max(0, Math.min(innerWidth  - zettel.offsetWidth,  ev.clientX - offX)) + 'px';
      zettel.style.right = 'auto';
      zettel.style.top   = Math.max(0, Math.min(innerHeight - zettel.offsetHeight, ev.clientY - offY)) + 'px';
    }
    function loslassen() {
      document.removeEventListener('mousemove', bewegen);
      document.removeEventListener('mouseup',   loslassen);
    }
    document.addEventListener('mousemove', bewegen);
    document.addEventListener('mouseup',   loslassen);
  });

  groessengriff.addEventListener('mousedown', e => {
    e.preventDefault(); e.stopPropagation();
    const startBreite = zettel.offsetWidth;
    const startHoehe  = zettel.offsetHeight;
    const startX = e.clientX, startY = e.clientY;
    function skalieren(ev) {
      zettel.style.width  = Math.max(200, startBreite + ev.clientX - startX) + 'px';
      zettel.style.height = Math.max(140, startHoehe  + ev.clientY - startY) + 'px';
    }
    function loslassen() {
      document.removeEventListener('mousemove', skalieren);
      document.removeEventListener('mouseup',   loslassen);
    }
    document.addEventListener('mousemove', skalieren);
    document.addEventListener('mouseup',   loslassen);
  });

  zettel.querySelector('.zettel-close').addEventListener('click', () => zettel.classList.remove('show'));
  zettel.addEventListener('mousedown', () => nachVorne(zettel));
}

function umschalterInit(symbol, zettel) {
  symbol.addEventListener('click', () => {
    if (zettel.classList.contains('show')) zettel.classList.remove('show');
    else { zettel.classList.add('show'); nachVorne(zettel); }
  });
}

const zettelWerkzeuge = document.getElementById('zettel-tools');
const zettelHilfe     = document.getElementById('zettel-help');
const zettelUebung    = document.getElementById('zettel-uebung');
const zettelAnsicht   = document.getElementById('zettel-ansicht');
const symbolWerkzeuge = document.getElementById('icon-tools');
const symbolHilfe     = document.getElementById('icon-help');

zettelInit(zettelWerkzeuge); zettelInit(zettelHilfe);
zettelInit(zettelUebung);    zettelInit(zettelAnsicht);
umschalterInit(symbolWerkzeuge, zettelWerkzeuge);
umschalterInit(symbolHilfe,     zettelHilfe);

window.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    waehlerVerbergen();
    [zettelWerkzeuge, zettelHilfe, zettelUebung, zettelAnsicht].forEach(z => z.classList.remove('show'));
  }
});

window.addEventListener('pointerdown', e => {
  if (zettelWerkzeuge.classList.contains('show') &&
      !zettelWerkzeuge.contains(e.target) && !symbolWerkzeuge.contains(e.target))
    zettelWerkzeuge.classList.remove('show');
  if (zettelHilfe.classList.contains('show') &&
      !zettelHilfe.contains(e.target) && !symbolHilfe.contains(e.target))
    zettelHilfe.classList.remove('show');
}, { capture: true });

// ── Zug-Knöpfe ────────────────────────────────────────────
document.querySelectorAll('[data-move]').forEach(knopf => {
  knopf.addEventListener('click', () => {
    if (S.animationLaeuft) return;
    const zug = ZUEGE_NACH_NAME[knopf.dataset.move];
    if (zug) { zustandSpeichern(zug.name); zugMitAnimation(zug); }
  });
});

// ── Aktions-Knöpfe ────────────────────────────────────────
document.getElementById('btn-scramble').addEventListener('click', () => { uebungBeenden(); zustandSpeichern(); mischen(); });
document.getElementById('btn-solve').addEventListener('click',    () => { uebungBeenden(); zustandSpeichern(); geloestSetzen(); });
document.getElementById('img-geloest-icon').addEventListener('click', () => { uebungBeenden(); zustandSpeichern(); geloestSetzen(); });
document.querySelectorAll('.uebung-btn').forEach(btn => {
  btn.addEventListener('click', () => uebungSetzen(btn.dataset.uebung));
});
document.getElementById('btn-mischen-uebung').addEventListener('click', uebungMischen);
umschalterInit(document.getElementById('icon-uebung'),  document.getElementById('zettel-uebung'));
umschalterInit(document.getElementById('icon-ansicht'), document.getElementById('zettel-ansicht'));

// ── Ansicht-Knöpfe ────────────────────────────────────────
const STUFEN_LABEL = ['sichtbar', '\u00a0\u00a0Rand', '\u00a0\u00a0\u00a0\u00a0verborgen', '\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0Kern'];

function ansichtBeschriften() {
  document.getElementById('btn-ans-mitten').textContent    = `Mitten: ${STUFEN_LABEL[S.mittenStufe]}`;
  document.getElementById('btn-ans-geloest').textContent   = `Gelöste: ${S.ansichtGeloest   ? 'sichtbar' : 'verborgen'}`;
  document.getElementById('btn-ans-ungeloest').textContent = `Ungelöste: ${S.ansichtUngeloest ? 'sichtbar' : 'verborgen'}`;
}

function mittenStufeSchalten() {
  S.mittenStufe = (S.mittenStufe + 1) % 4;
  const on = S.mittenStufe !== 2;
  for (const mk of mitteListe) setzeFarbe(mk, on ? mk.flaechenFarbe : null);
  ansichtBeschriften();
}

document.getElementById('btn-ans-mitten').addEventListener('click', mittenStufeSchalten);
document.getElementById('btn-ans-geloest').addEventListener('click', () => {
  S.ansichtGeloest = !S.ansichtGeloest; ansichtBeschriften(); displayAlles();
});
document.getElementById('btn-ans-ungeloest').addEventListener('click', () => {
  S.ansichtUngeloest = !S.ansichtUngeloest; ansichtBeschriften(); displayAlles();
});
document.getElementById('btn-ans-alle').addEventListener('click', () => {
  S.mittenStufe = 0; S.ansichtGeloest = S.ansichtUngeloest = true;
  for (const mk of mitteListe) setzeFarbe(mk, mk.flaechenFarbe);
  uebungBeenden(); ansichtBeschriften(); displayAlles();
});

// ── Schieberegler ─────────────────────────────────────────
document.getElementById('slider-durchsicht').addEventListener('input', e => { S.durchsicht     = e.target.value / 100; });
document.getElementById('slider-gitter').addEventListener('input',     e => { S.gitterDeckkraft = e.target.value / 100; });

