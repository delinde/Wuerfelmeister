import { FARBKARTE, sollFarbe } from './wuerfel-const.js';
import { cubies } from './wuerfel-szene.js';
import { S } from './wuerfel-state.js';

// ── Übungs-Filter (Ortsfilter) ────────────────────────────
export const UEBUNG_FILTER = {
  'R1g':  (cx,cy,cz) => cx===-1 && cy!==1,
  'R1gb': (cx,cy,cz) => (cx===-1 || cx===1) && cy!==1,
  'R2o':  (cx,cy,cz) => cy===1 && cx!==0 && cz!==0,
  'R2p':  (cx,cy,cz) => cy===1 && cx!==0 && cz!==0,
  'R3a':  (cx,cy,cz) => (cx!==0)+(cy!==0)+(cz!==0)===2 && (cx===0||cy===1),
  'R3b':  (cx,cy,cz) => (cx!==0)+(cy!==0)+(cz!==0)<=2  && (cx===0||cy===1),
  'R3c6': (cx,cy,cz) => (cx!==0)+(cy!==0)+(cz!==0)<=2  && (cx===0||cy===1),
  'R3c5': (cx,cy,cz) => (cx!==0)+(cy!==0)+(cz!==0)<=2  && (cx===0||cy===1),
  'R3c4': (cx,cy,cz) => (cx!==0)+(cy!==0)+(cz!==0)<=2  && (cx===0||cy===1),
  'R3c3': (cx,cy,cz) => (cx!==0)+(cy!==0)+(cz!==0)<=2  && (cx===0||cy===1),
};

// ── Übungs-Stückprüfung (welche Cubies gehören dazu) ──────
const _r3check = cubie => {
  const f = cubie.kacheln.map(k => k.farbId_echt).filter(Boolean);
  return f.includes('yellow') ||
    (f.includes('white') && !f.includes('blue') && !f.includes('green'));
};
export const UEBUNG_STUECK_CHECK = {
  'R1g':  cubie => { const f = cubie.kacheln.map(k=>k.farbId_echt).filter(Boolean); return f.includes('green') && !f.includes('yellow'); },
  'R1gb': cubie => { const f = cubie.kacheln.map(k=>k.farbId_echt).filter(Boolean); return (f.includes('green')||f.includes('blue')) && !f.includes('yellow'); },
  'R2o':  cubie => cubie.kacheln.some(k => k.farbId_echt === 'yellow'),
  'R2p':  cubie => cubie.kacheln.some(k => k.farbId_echt === 'yellow'),
  'R3a': _r3check, 'R3b': _r3check,
  'R3c6': _r3check, 'R3c5': _r3check, 'R3c4': _r3check, 'R3c3': _r3check,
};

// ── Übungs-Mischpool ──────────────────────────────────────
export const UEBUNG_MISCHPOOL = {
  'R3a':  ["U","U'","U2","M","M'","M2"],
  'R3b':  ["U","U'","U2","M","M'","M2"],
  'R3c6': ["U","U'","U2","M","M'","M2"],
  'R3c5': ["U","U'","U2","M","M'","M2"],
  'R3c4': ["U","U'","U2","M","M'","M2"],
  'R3c3': ["U","U'","U2","M","M'","M2"],
};

// ── Display-Logik ─────────────────────────────────────────
export function berechneDisplay(k) {
  const farbId = k.farbId_echt;
  if (!farbId) return null;
  if (k.istMitte) return farbId;   // null wenn stufe=2 (farbId_echt=null)
  if (S.aktuelleUebungCubies !== null) {
    if (!S.aktuelleUebungCubies.has(k.cubie)) return null;
  }
  // Gelöst-Status auf Cubie-Ebene: nur wenn ALLE Kacheln des Würfelchens stimmen
  const cubieGeloest = k.cubie.kacheln.every(
    kk => !kk.farbId_echt || kk.farbId_echt === sollFarbe(kk.flAchse, kk.flVz)
  );
  if ( cubieGeloest && !S.ansichtGeloest)   return null;
  if (!cubieGeloest && !S.ansichtUngeloest) return null;
  return farbId;
}

export function _displayKachel(k) {
  const d = berechneDisplay(k);
  k.farbId = d;
  if (k.netzRand) {
    // Mittenkachel: netz immer visible=true für Raycasting; Opacity steuert Render-Loop
    k.netz.visible     = true;
    k.netzRand.visible = (d !== null && S.mittenStufe === 1);
    k.netzKern.visible = (d !== null && S.mittenStufe === 3);
    if (d) {
      const hex = FARBKARTE[d].hex;
      k.netz.material.color.set(hex);
      k.netzRand.material.color.set(hex);
      k.netzKern.material.color.set(hex);
    }
    return;
  }
  if (d) {
    k.netz.material.color.set(FARBKARTE[d].hex);
    k.netz.visible = true;
  } else {
    k.netz.visible = false;
  }
}

export function displayAlles() {
  for (const c of cubies) for (const k of c.kacheln) _displayKachel(k);
}

export function setzeFarbe(k, farbId) {
  k.farbId_echt = farbId;
  _displayKachel(k);
}
