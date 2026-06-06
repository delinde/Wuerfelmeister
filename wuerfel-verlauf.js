import { SCHRITT, sollFarbe, ZUEGE_NACH_NAME, ALLE_ZUEGE } from './wuerfel-const.js';
import { cubies, mitteListe, setzeKachelTransform } from './wuerfel-szene.js';
import { _displayKachel, displayAlles, setzeFarbe, UEBUNG_FILTER, UEBUNG_MISCHPOOL, UEBUNG_STUECK_CHECK } from './wuerfel-display.js';
import { zugAusfuehren, zugMitAnimation } from './wuerfel-anim.js';
import { S } from './wuerfel-state.js';

// ── Schnappschuss ─────────────────────────────────────────
export function momentaufnahme() {
  return cubies.map(c => ({
    logPos: [...c.logPos],
    kacheln: c.kacheln.map(k => ({ flAchse: k.flAchse, flVz: k.flVz, farbId_echt: k.farbId_echt })),
  }));
}

export function momentAusfuehren(schnappschuss) {
  for (let i = 0; i < cubies.length; i++) {
    const c    = cubies[i];
    const snap = schnappschuss[i];
    c.logPos = [...snap.logPos];
    c.group.position.set(c.logPos[0]*SCHRITT, c.logPos[1]*SCHRITT, c.logPos[2]*SCHRITT);
    c.group.rotation.set(0, 0, 0);
    for (let j = 0; j < c.kacheln.length; j++) {
      const k  = c.kacheln[j];
      const ks = snap.kacheln[j];
      k.flAchse    = ks.flAchse;
      k.flVz       = ks.flVz;
      k.farbId_echt = ks.farbId_echt;
      setzeKachelTransform(k);
      _displayKachel(k);
    }
  }
  // mittenStufe mit Snapshot-Zustand synchronisieren
  const centersOn = mitteListe.some(k => k.farbId_echt !== null);
  if (!centersOn) S.mittenStufe = 2;
  else if (S.mittenStufe === 2) S.mittenStufe = 0;
  verlaufAnzeige();
}

// ── Verlauf-Anzeige ───────────────────────────────────────
const zurueckKnopf = document.getElementById('undo-btn');
const wiederKnopf  = document.getElementById('redo-btn');

export function verlaufAnzeige() {
  zurueckKnopf.disabled = S.verlaufPos <= 0;
  wiederKnopf.disabled  = S.verlaufPos >= S.verlauf.length - 1;
  const zuege = [];
  for (let i = 1; i <= S.verlaufPos; i++) {
    if (S.verlauf[i]?.zugName) zuege.push(S.verlauf[i].zugName);
  }
  const MAX = 40;
  const anzeige = zuege.length > MAX ? ['…', ...zuege.slice(-MAX)] : zuege;
  document.getElementById('zugfolge').textContent = anzeige.join(' ');
}

export function zustandSpeichern(zugName = null) {
  S.verlauf.splice(S.verlaufPos + 1);
  S.verlauf.push({ schnappschuss: momentaufnahme(), zugName });
  if (S.verlauf.length > 120) S.verlauf.shift();
  S.verlaufPos = S.verlauf.length - 1;
  verlaufAnzeige();
}

// ── Undo / Redo ───────────────────────────────────────────
function zugInvers(name) {
  if (name.endsWith("'")) return name.slice(0, -1);
  if (name.endsWith('2')) return name;
  return name + "'";
}

export function rueckgaengig() {
  if (S.animationLaeuft || S.verlaufPos <= 0) return;
  const aktEintrag = S.verlauf[S.verlaufPos];
  S.verlaufPos--;
  const zielSnap = S.verlauf[S.verlaufPos].schnappschuss;
  verlaufAnzeige();
  const invName = aktEintrag.zugName ? zugInvers(aktEintrag.zugName) : null;
  const invZug  = invName ? ZUEGE_NACH_NAME[invName] : null;
  if (invZug) zugMitAnimation(invZug, () => momentAusfuehren(zielSnap));
  else momentAusfuehren(zielSnap);
}

export function wiederholen() {
  if (S.animationLaeuft || S.verlaufPos >= S.verlauf.length - 1) return;
  S.verlaufPos++;
  const eintrag  = S.verlauf[S.verlaufPos];
  const zielSnap = eintrag.schnappschuss;
  const zug      = eintrag.zugName ? ZUEGE_NACH_NAME[eintrag.zugName] : null;
  verlaufAnzeige();
  if (zug) zugMitAnimation(zug, () => momentAusfuehren(zielSnap));
  else momentAusfuehren(zielSnap);
}

// ── Knopf-Handler (Undo/Redo) ─────────────────────────────
zurueckKnopf.addEventListener('click', rueckgaengig);
wiederKnopf.addEventListener('click',  wiederholen);
window.addEventListener('keydown', e => {
  if (e.ctrlKey && e.key==='z') { e.preventDefault(); rueckgaengig(); }
  if (e.ctrlKey && (e.key==='y' || (e.shiftKey && e.key==='Z'))) { e.preventDefault(); wiederholen(); }
});

// ── Würfel gelöst setzen ──────────────────────────────────
export function geloestSetzen() {
  // mittenStufe bleibt erhalten; Mittenkacheln respektieren den aktuellen Zustand
  for (const c of cubies) {
    c.logPos = [...c.initLogPos];
    c.group.position.set(c.logPos[0]*SCHRITT, c.logPos[1]*SCHRITT, c.logPos[2]*SCHRITT);
    c.group.rotation.set(0, 0, 0);
    for (const k of c.kacheln) {
      k.flAchse    = k.initFlAchse;
      k.flVz       = k.initFlVz;
      k.farbId_echt = (k.istMitte && S.mittenStufe === 2)
        ? null : sollFarbe(k.initFlAchse, k.initFlVz);
      setzeKachelTransform(k);
      _displayKachel(k);
    }
  }
}

// ── Mischen ───────────────────────────────────────────────
export function mischen() {
  geloestSetzen();
  let letzteAchse = -1;
  for (let i = 0; i < 22; i++) {
    let zug;
    do { zug = ALLE_ZUEGE[Math.random()*ALLE_ZUEGE.length|0]; } while (zug.achse === letzteAchse);
    zugAusfuehren(zug);
    letzteAchse = zug.achse;
  }
}

// ── Übungen ───────────────────────────────────────────────
export function uebungSetzen(name) {
  const filter = UEBUNG_FILTER[name];
  if (!filter) return;
  S.aktuelleUebung     = filter;
  S.aktuelleUebungName = name;
  zustandSpeichern();
  geloestSetzen();
  // Qualifizierende Würfelchen einmalig nach Objekt-Identität bestimmen
  // (nach geloestSetzen, damit logPos und farbId_echt im Gelöst-Zustand sind)
  const check = UEBUNG_STUECK_CHECK[name];
  S.aktuelleUebungCubies = new Set(cubies.filter(c => {
    const [cx, cy, cz] = c.logPos;
    return filter(cx, cy, cz) && (!check || check(c));
  }));
}

export function uebungMischen() {
  if (!S.aktuelleUebung) { zustandSpeichern(); mischen(); return; }
  zustandSpeichern();
  const pool = (UEBUNG_MISCHPOOL[S.aktuelleUebungName] || [])
    .map(n => ZUEGE_NACH_NAME[n]).filter(Boolean);
  if (pool.length > 0) {
    geloestSetzen();
    let letzteAchse = -1;
    for (let i = 0; i < 20; i++) {
      let zug;
      do { zug = pool[Math.floor(Math.random() * pool.length)]; } while (zug.achse === letzteAchse);
      zugAusfuehren(zug);
      letzteAchse = zug.achse;
    }
    displayAlles();
  } else {
    mischen();
  }
}

export function uebungBeenden() {
  S.aktuelleUebung = S.aktuelleUebungName = null;
  S.aktuelleUebungCubies = null;
}
