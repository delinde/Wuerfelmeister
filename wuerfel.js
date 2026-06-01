import * as THREE from 'three';
// (keine externe Controls-Bibliothek – eigene Quaternion-Steuerung)

// ══════════════════════════════════════════════════════════════
//  Farben
// ══════════════════════════════════════════════════════════════
const FARBEN = [
  { id:'white',  hex:0xf0f0f0, css:'#f0f0f0', bezeichnung:'Weiß'   },
  { id:'yellow', hex:0xffd000, css:'#ffd000', bezeichnung:'Gelb'   },
  { id:'red',    hex:0xcc1111, css:'#cc1111', bezeichnung:'Rot'    },
  { id:'orange', hex:0xff8800, css:'#ff8800', bezeichnung:'Orange' },
  { id:'blue',   hex:0x0044cc, css:'#0044cc', bezeichnung:'Blau'   },
  { id:'green',  hex:0x00aa44, css:'#00aa44', bezeichnung:'Grün'   },
];
const FARBKARTE  = Object.fromEntries(FARBEN.map(f => [f.id, f]));
const GEGENUEBER = { white:'yellow', yellow:'white', red:'orange', orange:'red', blue:'green', green:'blue' };

// ══════════════════════════════════════════════════════════════
//  Szene
// ══════════════════════════════════════════════════════════════
const szene    = new THREE.Scene();
const kamera   = new THREE.PerspectiveCamera(45, innerWidth/innerHeight, 0.1, 100);
kamera.position.set(5.5, 4.5, 7.5);

const zeichner = new THREE.WebGLRenderer({ antialias: true });
zeichner.setPixelRatio(Math.min(devicePixelRatio, 2));
zeichner.setSize(innerWidth, innerHeight);
zeichner.setClearColor(0x0d0d1a);
document.body.appendChild(zeichner.domElement);

// ── Quaternion-Kamerasteuerung (azimut/elevation, kein Pol-Limit) ──
kamera.lookAt(0, 0, 0);                         // Startorientierung setzen
let   camDist = kamera.position.length();        // Abstand zum Ursprung
const camQuat = kamera.quaternion.clone();        // Kamera-Orientierung als Quaternion

let controls_enabled = true;
let rotPointer = null, rotLetzX = 0, rotLetzY = 0;
let velH = 0, velV = 0;

function kameraAktualisieren() {
  kamera.position.copy(new THREE.Vector3(0, 0, camDist).applyQuaternion(camQuat));
  kamera.quaternion.copy(camQuat);
}

// dH = horizontale Winkelschritte (um Kamera-Oben), dV = vertikal (um Kamera-Rechts)
function drehenDelta(dH, dV) {
  const auf    = new THREE.Vector3(0, 1, 0).applyQuaternion(camQuat);
  const rechts = new THREE.Vector3(1, 0, 0).applyQuaternion(camQuat);
  camQuat
    .premultiply(new THREE.Quaternion().setFromAxisAngle(auf,    dH))
    .premultiply(new THREE.Quaternion().setFromAxisAngle(rechts, dV))
    .normalize();
  kameraAktualisieren();
}

// ══════════════════════════════════════════════════════════════
//  Würfelgeometrie
// ══════════════════════════════════════════════════════════════
const SCHRITT  = 1.06;
const KHALB    = 0.965 / 2;   // halbe Kastenbreite
const AUFHEBUNG = 0.504;
const KACHELGR  = 0.83;

// Flächendefinitionen: achse 0/1/2 = x/y/z · vz = Vorzeichen
const FLAECHENDEFS = [
  { achse:0, vz: 1, farbId:'blue',   normale:new THREE.Vector3( 1, 0, 0) },  // +x = rechts
  { achse:0, vz:-1, farbId:'green',  normale:new THREE.Vector3(-1, 0, 0) },  // −x = links
  { achse:1, vz: 1, farbId:'yellow', normale:new THREE.Vector3( 0, 1, 0) },  // +y = oben
  { achse:1, vz:-1, farbId:'white',  normale:new THREE.Vector3( 0,-1, 0) },  // −y = unten
  { achse:2, vz: 1, farbId:'orange', normale:new THREE.Vector3( 0, 0, 1) },  // +z = vorne
  { achse:2, vz:-1, farbId:'red',    normale:new THREE.Vector3( 0, 0,-1) },  // −z = hinten
];

function istMitte(cx, cy, cz) { return (cx!==0)+(cy!==0)+(cz!==0) === 1; }

// ── Außenkanten, gruppiert nach Würfelseite ──────────────────
const seitenPunkte = FLAECHENDEFS.map(() => []);
function kante(fi, x1,y1,z1, x2,y2,z2) { seitenPunkte[fi].push(x1,y1,z1, x2,y2,z2); }

for (let cx=-1; cx<=1; cx++) for (let cy=-1; cy<=1; cy++) for (let cz=-1; cz<=1; cz++) {
  if (!cx && !cy && !cz) continue;
  const px=cx*SCHRITT, py=cy*SCHRITT, pz=cz*SCHRITT;

  for (const dx of [-1,1]) for (const dy of [-1,1]) {
    if (cx*dx!==1 && cy*dy!==1) continue;
    const fx=px+dx*KHALB, fy=py+dy*KHALB;
    if (cx=== 1&&dx=== 1) kante(0,fx,fy,pz-KHALB,fx,fy,pz+KHALB);
    if (cx===-1&&dx===-1) kante(1,fx,fy,pz-KHALB,fx,fy,pz+KHALB);
    if (cy=== 1&&dy=== 1) kante(2,fx,fy,pz-KHALB,fx,fy,pz+KHALB);
    if (cy===-1&&dy===-1) kante(3,fx,fy,pz-KHALB,fx,fy,pz+KHALB);
  }
  for (const dx of [-1,1]) for (const dz of [-1,1]) {
    if (cx*dx!==1 && cz*dz!==1) continue;
    const fx=px+dx*KHALB, fz=pz+dz*KHALB;
    if (cx=== 1&&dx=== 1) kante(0,fx,py-KHALB,fz,fx,py+KHALB,fz);
    if (cx===-1&&dx===-1) kante(1,fx,py-KHALB,fz,fx,py+KHALB,fz);
    if (cz=== 1&&dz=== 1) kante(4,fx,py-KHALB,fz,fx,py+KHALB,fz);
    if (cz===-1&&dz===-1) kante(5,fx,py-KHALB,fz,fx,py+KHALB,fz);
  }
  for (const dy of [-1,1]) for (const dz of [-1,1]) {
    if (cy*dy!==1 && cz*dz!==1) continue;
    const fy=py+dy*KHALB, fz=pz+dz*KHALB;
    if (cy=== 1&&dy=== 1) kante(2,px-KHALB,fy,fz,px+KHALB,fy,fz);
    if (cy===-1&&dy===-1) kante(3,px-KHALB,fy,fz,px+KHALB,fy,fz);
    if (cz=== 1&&dz=== 1) kante(4,px-KHALB,fy,fz,px+KHALB,fy,fz);
    if (cz===-1&&dz===-1) kante(5,px-KHALB,fy,fz,px+KHALB,fy,fz);
  }
}

const VORNE_OP=0.80, HINTEN_OP=0.35;
const seitenLinien = FLAECHENDEFS.map((fl, i) => {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(seitenPunkte[i], 3));
  const mat = new THREE.LineBasicMaterial({ color:0x8899bb, transparent:true, opacity:VORNE_OP });
  const ls  = new THREE.LineSegments(geo, mat);
  szene.add(ls);
  return { ls, normale: fl.normale };
});

// ── Kacheln ──────────────────────────────────────────────────
function seitenEuler(achse, vz) {
  if (achse===0) return new THREE.Euler(0, vz>0?  Math.PI/2:-Math.PI/2, 0);
  if (achse===1) return new THREE.Euler(vz>0?-Math.PI/2: Math.PI/2, 0, 0);
  return new THREE.Euler(0, vz<0?Math.PI:0, 0);
}

const alleKacheln   = [];
const kachelListe   = [];
const wuerfelFarben = {};   // "cx,cy,cz" → Set<farbId>
const kachelIndex   = {};   // "cx,cy,cz" → { "achse,vz" → eintrag }

for (let cx=-1; cx<=1; cx++) for (let cy=-1; cy<=1; cy++) for (let cz=-1; cz<=1; cz++) {
  if (!cx&&!cy&&!cz) continue;
  const wk    = `${cx},${cy},${cz}`;
  const mitte = istMitte(cx, cy, cz);
  wuerfelFarben[wk] = new Set();
  kachelIndex[wk]   = {};

  for (const fl of FLAECHENDEFS) {
    if ([cx,cy,cz][fl.achse] !== fl.vz) continue;
    const geo  = new THREE.PlaneGeometry(KACHELGR, KACHELGR);
    const mat  = new THREE.MeshBasicMaterial({ color:0xffffff, transparent:true,
                   opacity:0, side:THREE.DoubleSide, depthWrite:false });
    const netz = new THREE.Mesh(geo, mat);
    netz.rotation.copy(seitenEuler(fl.achse, fl.vz));
    const p = [cx*SCHRITT, cy*SCHRITT, cz*SCHRITT];
    p[fl.achse] += fl.vz * AUFHEBUNG;
    netz.position.set(p[0], p[1], p[2]);
    szene.add(netz);

    const eintrag = { netz, wk, fl, farbId:null, farbId_echt:null, istMitte:mitte,
                      flaechenFarbe: mitte ? fl.farbId : null };
    netz.userData = eintrag;
    alleKacheln.push(netz);
    kachelListe.push(eintrag);
    kachelIndex[wk][`${fl.achse},${fl.vz}`] = eintrag;
  }
}

const mitteListe = kachelListe.filter(e => e.istMitte);
let   mittenAn   = false;

// ══════════════════════════════════════════════════════════════
//  Ansicht-Filter & Display-Logik
// ══════════════════════════════════════════════════════════════
let ansichtMitten    = true;
let ansichtGeloest   = true;
let ansichtUngeloest = true;

// Stück-Identität: gehört das Stück auf Position wk zur jeweiligen Übung?
const _r3check = wk => {
  const f = Object.values(kachelIndex[wk]).map(e => e.farbId_echt).filter(Boolean);
  return f.includes('yellow') ||
    (f.includes('white') && !f.includes('blue') && !f.includes('green'));
};
const UEBUNG_STUECK_CHECK = {
  'R1g': wk => {
    const f = Object.values(kachelIndex[wk]).map(e => e.farbId_echt).filter(Boolean);
    return f.includes('green') && !f.includes('yellow');
  },
  'R2o': wk => Object.values(kachelIndex[wk]).some(e => e.farbId_echt === 'yellow'),
  'R2p': wk => Object.values(kachelIndex[wk]).some(e => e.farbId_echt === 'yellow'),
  'R3a': _r3check, 'R3b': _r3check,
  'R3c6': _r3check, 'R3c5': _r3check, 'R3c4': _r3check, 'R3c3': _r3check,
};

function berechneDisplay(eintrag) {
  const farbId = eintrag.farbId_echt;
  if (!farbId) return null;
  const [cx, cy, cz] = eintrag.wk.split(',').map(Number);
  const mitte = istMitte(cx, cy, cz);
  // Mitten unabhängig von Gelöst/Ungelöst-Filter
  if (mitte) return ansichtMitten ? farbId : null;
  // Übungs-Filter: Position, dann Stück-Identität
  if (aktuelleUebung) {
    if (!aktuelleUebung(cx, cy, cz)) return null;
    const check = UEBUNG_STUECK_CHECK[aktuelleUebungName];
    if (check && !check(eintrag.wk)) return null;
  }
  // Gelöst / Ungelöst
  const geloest = farbId === eintrag.fl.farbId;
  if ( geloest && !ansichtGeloest)   return null;
  if (!geloest && !ansichtUngeloest) return null;
  return farbId;
}

function _displayEintrag(eintrag) {
  const d = berechneDisplay(eintrag);
  eintrag.farbId = d;
  if (d) {
    eintrag.netz.material.color.set(FARBKARTE[d].hex);
    eintrag.netz.material.opacity = 1;
  } else {
    eintrag.netz.material.opacity = 0;
  }
}

function displayAlles() {
  for (const e of kachelListe) _displayEintrag(e);
}

// ══════════════════════════════════════════════════════════════
//  Farbsetter  (speichert farbId_echt, aktualisiert Anzeige)
// ══════════════════════════════════════════════════════════════
function setzeFarbe(eintrag, farbId) {
  const menge = wuerfelFarben[eintrag.wk];
  if (eintrag.farbId_echt) menge.delete(eintrag.farbId_echt);
  eintrag.farbId_echt = farbId;
  if (farbId) menge.add(farbId);
  _displayEintrag(eintrag);
}

// ══════════════════════════════════════════════════════════════
//  Rückgängig / Wiederholen
// ══════════════════════════════════════════════════════════════
const zurueckKnopf = document.getElementById('undo-btn');
const wiederKnopf  = document.getElementById('redo-btn');
const verlauf      = [];
let   verlaufPos   = -1;

function momentaufnahme() { return kachelListe.map(e => e.farbId_echt); }

function zustandSpeichern(zugName = null) {
  verlauf.splice(verlaufPos + 1);
  verlauf.push({ schnappschuss: momentaufnahme(), zugName });
  if (verlauf.length > 120) verlauf.shift();
  verlaufPos = verlauf.length - 1;
  verlaufAnzeige();
}

function momentAusfuehren(schnappschuss) {
  for (let i=0; i<kachelListe.length; i++) setzeFarbe(kachelListe[i], schnappschuss[i]);
  mittenAn = mitteListe.some(e => e.farbId_echt !== null);
  verlaufAnzeige();
}

// Kehrt einen Zugnamen um: R→R', R'→R, R2→R2
function zugInvers(name) {
  if (name.endsWith("'")) return name.slice(0, -1);
  if (name.endsWith('2')) return name;
  return name + "'";
}

function rueckgaengig() {
  if (animationLaeuft) return;
  if (verlaufPos <= 0) return;
  const aktEintrag  = verlauf[verlaufPos];
  verlaufPos--;
  const zielSnap    = verlauf[verlaufPos].schnappschuss;   // sofort sichern
  verlaufAnzeige();
  const invName = aktEintrag.zugName ? zugInvers(aktEintrag.zugName) : null;
  const invZug  = invName ? ZUEGE_NACH_NAME[invName] : null;
  if (invZug) {
    zugMitAnimation(invZug, () => momentAusfuehren(zielSnap));
  } else {
    momentAusfuehren(zielSnap);
  }
}
function wiederholen() {
  if (animationLaeuft) return;
  if (verlaufPos >= verlauf.length - 1) return;
  verlaufPos++;
  const eintrag  = verlauf[verlaufPos];
  const zielSnap = eintrag.schnappschuss;                  // sofort sichern
  const zug      = eintrag.zugName ? ZUEGE_NACH_NAME[eintrag.zugName] : null;
  verlaufAnzeige();
  if (zug) {
    zugMitAnimation(zug, () => momentAusfuehren(zielSnap));
  } else {
    momentAusfuehren(zielSnap);
  }
}
function verlaufAnzeige() {
  zurueckKnopf.disabled = verlaufPos <= 0;
  wiederKnopf.disabled  = verlaufPos >= verlauf.length - 1;
  // Zugfolge aktualisieren
  const zuege = [];
  for (let i = 1; i <= verlaufPos; i++) {
    if (verlauf[i] && verlauf[i].zugName) zuege.push(verlauf[i].zugName);
  }
  const MAX = 40;
  const anzeige = zuege.length > MAX ? ['…', ...zuege.slice(-MAX)] : zuege;
  document.getElementById('zugfolge').textContent = anzeige.join(' ');
}

zurueckKnopf.addEventListener('click', rueckgaengig);
wiederKnopf.addEventListener('click',  wiederholen);
window.addEventListener('keydown', e => {
  if (e.ctrlKey && e.key==='z') { e.preventDefault(); rueckgaengig(); }
  if (e.ctrlKey && (e.key==='y' || (e.shiftKey && e.key==='Z'))) { e.preventDefault(); wiederholen(); }
});

// ══════════════════════════════════════════════════════════════
//  Züge (18 Basiszüge der Rubik-Gruppe)
// ══════════════════════════════════════════════════════════════
const GRUNDZUEGE = [
  { name:'U', achse:1, vz: 1, drehen:([x,y,z])=>[ z, y,-x] },
  { name:'D', achse:1, vz:-1, drehen:([x,y,z])=>[-z, y, x] },
  { name:'R', achse:0, vz: 1, drehen:([x,y,z])=>[ x,-z, y] },
  { name:'L', achse:0, vz:-1, drehen:([x,y,z])=>[ x, z,-y] },
  { name:'F', achse:2, vz: 1, drehen:([x,y,z])=>[ y,-x, z] },
  { name:'B', achse:2, vz:-1, drehen:([x,y,z])=>[-y, x, z] },
];

const ALLE_ZUEGE = [];
for (const m of GRUNDZUEGE) {
  const d2 = v => m.drehen(m.drehen(v));
  const d3 = v => m.drehen(d2(v));
  ALLE_ZUEGE.push(
    { ...m },
    { ...m, name:m.name+"'", drehen:d3 },
    { ...m, name:m.name+'2', drehen:d2 },
  );
}

// Mittelschicht-Züge (E/M/S): vz=0, drehVz gibt Animationsrichtung an
const MITTEL_ZUEGE = [
  { name:'E', achse:1, vz:0, drehVz:-1, drehen:([x,y,z])=>[-z, y, x] },
  { name:'M', achse:0, vz:0, drehVz:-1, drehen:([x,y,z])=>[ x, z,-y] },
  { name:'S', achse:2, vz:0, drehVz: 1, drehen:([x,y,z])=>[ y,-x, z] },
];
for (const m of MITTEL_ZUEGE) {
  const d2 = v => m.drehen(m.drehen(v));
  const d3 = v => m.drehen(d2(v));
  ALLE_ZUEGE.push(
    { ...m },
    { ...m, name:m.name+"'", drehen:d3 },
    { ...m, name:m.name+'2', drehen:d2 },
  );
}

function zugAusfuehren(zug) {
  const { achse, vz, drehen } = zug;
  const schicht = kachelListe.filter(e => e.wk.split(',').map(Number)[achse] === vz);
  const gesichert = new Map(schicht.map(e => [e, e.farbId_echt]));
  for (const e of schicht) setzeFarbe(e, null);
  for (const e of schicht) {
    const farbe = gesichert.get(e);
    if (!farbe) continue;
    const [cx,cy,cz] = e.wk.split(',').map(Number);
    const [nx,ny,nz] = drehen([cx,cy,cz]);
    const fv         = [0,0,0]; fv[e.fl.achse] = e.fl.vz;
    const [fx,fy,fz] = drehen(fv);
    const na = fx!==0 ? 0 : fy!==0 ? 1 : 2;
    const nv = fx!==0 ? fx : fy!==0 ? fy : fz;
    const ziel = kachelIndex[`${nx},${ny},${nz}`]?.[`${na},${nv}`];
    if (ziel) setzeFarbe(ziel, farbe);
  }
}

// ══════════════════════════════════════════════════════════════
//  Animation eines Einzelzugs
// ══════════════════════════════════════════════════════════════
let animationLaeuft = false;

function zugMitAnimation(zug, nachher = null) {
  const { achse, vz } = zug;

  // Drehwinkel: Strich = −90°, 2 = 180°, sonst +90°
  let winkel = Math.PI / 2;
  if (zug.name.endsWith("'")) winkel = -Math.PI / 2;
  else if (zug.name.endsWith('2')) winkel = Math.PI;

  // Drehachse: Mittelschicht nutzt drehVz; Z-Achse Vorzeichen umkehren
  const axVz = zug.drehVz ?? vz;
  const drehachse = new THREE.Vector3();
  drehachse.setComponent(achse, achse === 2 ? -axVz : axVz);

  // Kacheln der betroffenen Schicht
  const schicht     = kachelListe.filter(e => e.wk.split(',').map(Number)[achse] === vz);
  const netze       = schicht.map(e => e.netz);
  const urTransform = netze.map(n => ({ pos: n.position.clone(), quat: n.quaternion.clone() }));

  // Temporäre Drehgruppe (zentriert im Ursprung = Würfelmitte)
  const drehgruppe = new THREE.Group();
  szene.add(drehgruppe);
  for (const netz of netze) drehgruppe.add(netz); // löst automatisch aus szene

  const dauer     = 240;  // ms
  const startZeit = performance.now();
  animationLaeuft = true;
  controls_enabled = false;

  // Ease-in-out (kubisch)
  function sanft(t) { return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3) / 2; }

  (function schritt(jetzt) {
    const t = Math.min((jetzt - startZeit) / dauer, 1);
    drehgruppe.setRotationFromAxisAngle(drehachse, winkel * sanft(t));

    if (t < 1) {
      requestAnimationFrame(schritt);
    } else {
      // Kacheln zurück in die Szene, Positionen zurücksetzen
      for (let i = 0; i < netze.length; i++) {
        szene.add(netze[i]);
        netze[i].position.copy(urTransform[i].pos);
        netze[i].quaternion.copy(urTransform[i].quat);
      }
      szene.remove(drehgruppe);

      // Farb-Umsetzung (sofort, ohne Sichtbarkeits-Artefakt)
      if (nachher) nachher(); else zugAusfuehren(zug);

      animationLaeuft = false;
      steuerungZuruecksetzen();
    }
  })(startZeit);
}

// ══════════════════════════════════════════════════════════════
//  Lösen & Mischen
// ══════════════════════════════════════════════════════════════
function geloestSetzen() {
  mittenAn = true;
  for (const e of kachelListe) setzeFarbe(e, e.fl.farbId);
}

let aktuelleUebung     = null;
let aktuelleUebungName = null;

const UEBUNG_FILTER = {
  'R1g':  (cx,cy,cz) => cx===-1 && cy!==1,
  'R2o':  (cx,cy,cz) => cy===1 && cx!==0 && cz!==0,
  'R2p':  (cx,cy,cz) => cy===1 && cx!==0 && cz!==0,
  'R3a':  (cx,cy,cz) => (cx!==0)+(cy!==0)+(cz!==0)===2 && (cx===0||cy===1),
  'R3b':  (cx,cy,cz) => (cx!==0)+(cy!==0)+(cz!==0)<=2  && (cx===0||cy===1),
  'R3c6': (cx,cy,cz) => (cx!==0)+(cy!==0)+(cz!==0)<=2  && (cx===0||cy===1),
  'R3c5': (cx,cy,cz) => (cx!==0)+(cy!==0)+(cz!==0)<=2  && (cx===0||cy===1),
  'R3c4': (cx,cy,cz) => (cx!==0)+(cy!==0)+(cz!==0)<=2  && (cx===0||cy===1),
  'R3c3': (cx,cy,cz) => (cx!==0)+(cy!==0)+(cz!==0)<=2  && (cx===0||cy===1),
};

// R3-Mischen: nur U+M (echter Untergruppen-Mischung – andere Stücke bleiben gelöst)
const UEBUNG_MISCHPOOL = {
  'R3a':  ["U","U'","U2","M","M'","M2"],
  'R3b':  ["U","U'","U2","M","M'","M2"],
  'R3c6': ["U","U'","U2","M","M'","M2"],
  'R3c5': ["U","U'","U2","M","M'","M2"],
  'R3c4': ["U","U'","U2","M","M'","M2"],
  'R3c3': ["U","U'","U2","M","M'","M2"],
};

function uebungSetzen(name) {
  const filter = UEBUNG_FILTER[name];
  if (!filter) return;
  aktuelleUebung     = filter;
  aktuelleUebungName = name;
  zustandSpeichern();
  geloestSetzen();   // setzt alle farbId_echt; berechneDisplay filtert via aktuelleUebung
}

function uebungMischen() {
  if (!aktuelleUebung) { zustandSpeichern(); mischen(); return; }
  zustandSpeichern();
  const pool = (UEBUNG_MISCHPOOL[aktuelleUebungName] || [])
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
    displayAlles();  // Mengenlehre-Check nach Mischen
  } else {
    mischen();  // R1g, R2o, R2p: voller Mischung (berechneDisplay filtert automatisch)
  }
}

function mischen() {
  geloestSetzen();
  let letzteAchse = -1;
  for (let i=0; i<22; i++) {
    let zug;
    do { zug = ALLE_ZUEGE[Math.random()*ALLE_ZUEGE.length|0]; } while (zug.achse === letzteAchse);
    zugAusfuehren(zug);
    letzteAchse = zug.achse;
  }
}

// ══════════════════════════════════════════════════════════════
//  Farbwähler-UI
// ══════════════════════════════════════════════════════════════
const farbwaehler  = document.getElementById('picker');
let   aktiveKachel = null;

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
  if (!aktiveKachel) return;
  zustandSpeichern();
  setzeFarbe(aktiveKachel.userData, farbId);
  waehlerVerbergen();
}

function waehlerZeigen(netz, px, py) {
  aktiveKachel = netz;
  const ud     = netz.userData;
  const andere = new Set([...wuerfelFarben[ud.wk]].filter(f => f !== ud.farbId_echt));
  for (const f of FARBEN) {
    const gegen = GEGENUEBER[f.id];
    farbKnoepfe[f.id].disabled = andere.has(f.id) || (gegen && andere.has(gegen));
  }
  farbwaehler.style.left = Math.min(px+14, innerWidth -172) + 'px';
  farbwaehler.style.top  = Math.min(py+14, innerHeight-155) + 'px';
  farbwaehler.classList.add('show');
}

function waehlerVerbergen() { farbwaehler.classList.remove('show'); aktiveKachel = null; }

// ══════════════════════════════════════════════════════════════
//  Scheiben-Wischen: Wischvektor → Zug
// ══════════════════════════════════════════════════════════════
function wischeScheibe(eintrag, dx, dy) {
  // Wischvektor in Weltkoordinaten (Kamera-Rechts- und Hoch-Vektor)
  const rechts  = new THREE.Vector3().setFromMatrixColumn(kamera.matrixWorld, 0);
  const obenVek = new THREE.Vector3().setFromMatrixColumn(kamera.matrixWorld, 1);
  const welt    = new THREE.Vector3()
    .addScaledVector(rechts,    dx)
    .addScaledVector(obenVek, -dy);   // Bildschirm-Y ist invertiert

  // Auf Flächen-Ebene projizieren
  const n = eintrag.fl.normale;
  welt.addScaledVector(n, -welt.dot(n));
  if (welt.lengthSq() < 1e-4) return false;

  // Drehachse = Flächennormale × Wischvektor
  const drehachse = new THREE.Vector3().crossVectors(n, welt);
  const komp      = [Math.abs(drehachse.x), Math.abs(drehachse.y), Math.abs(drehachse.z)];
  const achse     = komp.indexOf(Math.max(...komp));
  const rotVz     = Math.sign(drehachse.getComponent(achse));

  // Schicht aus Würfelchen-Position
  const schichtVz  = eintrag.wk.split(',').map(Number)[achse];
  const kandidaten = ALLE_ZUEGE.filter(z => z.achse === achse && z.vz === schichtVz);
  if (!kandidaten.length) return false;

  // Basisrichtung: Mittelschicht (vz=0) nutzt drehVz des Zugs
  const refVz    = kandidaten[0].drehVz ?? schichtVz;
  const animVz   = achse < 2 ? refVz : -refVz;
  const basisZug = (rotVz === animVz);

  const zug = basisZug ? kandidaten[0] : kandidaten[1];
  if (!zug) return false;

  zustandSpeichern(zug.name);
  zugMitAnimation(zug);
  return true;
}

// ══════════════════════════════════════════════════════════════
//  Interaktion (Klick / Doppelklick / Dreifachklick / Wischen)
// ══════════════════════════════════════════════════════════════

// Nach Scheibendrehung: restlichen Schwung sofort verwerfen.
function steuerungZuruecksetzen() {
  controls_enabled = true;
  rotPointer = null;
  velH = 0; velV = 0;
}

const strahl              = new THREE.Raycaster();
let   gedruecktBei        = null;
let   warKlick            = false;
let   mitteTapAnzahl      = 0;
let   mitteTapTimer       = null;
let   wischEintrag        = null;   // getroffene Kachel beim Wisch-Start
let   wischStart          = null;   // Bildschirmposition beim Wisch-Start
let   wischWurdeAusgefuehrt = false;

zeichner.domElement.addEventListener('pointerdown', e => {
  waehlerVerbergen();
  gedruecktBei = [e.clientX, e.clientY];
  warKlick     = false;
  wischEintrag = null;
  wischStart   = null;

  if (animationLaeuft) return;

  // Kachel-Treffer? → Wisch-Modus, Orbit-Rotation sperren
  strahl.setFromCamera(
    new THREE.Vector2((e.clientX/innerWidth)*2-1, -(e.clientY/innerHeight)*2+1),
    kamera
  );
  const treffer = strahl.intersectObjects(alleKacheln);
  if (treffer.length > 0) {
    wischEintrag     = treffer[0].object.userData;
    wischStart       = [e.clientX, e.clientY];
    controls_enabled = false;
    rotPointer       = null;  // Kamera-Drehung unterbrechen
    velH = 0; velV = 0;
  }
});

zeichner.domElement.addEventListener('pointermove', e => {
  if (!wischEintrag || !wischStart || animationLaeuft) return;
  const wdx = e.clientX - wischStart[0];
  const wdy = e.clientY - wischStart[1];
  if (Math.sqrt(wdx*wdx + wdy*wdy) <= 12) return;
  const getroffenerEintrag = wischEintrag;
  wischEintrag = null;
  wischStart   = null;
  const animiert = wischeScheibe(getroffenerEintrag, wdx, wdy);
  wischWurdeAusgefuehrt = true;
  if (!animiert) steuerungZuruecksetzen();
});

zeichner.domElement.addEventListener('pointerup', e => {
  if (!gedruecktBei) return;
  const dx = e.clientX - gedruecktBei[0];
  const dy = e.clientY - gedruecktBei[1];
  gedruecktBei = null;

  if (wischWurdeAusgefuehrt) {
    wischWurdeAusgefuehrt = false;
    return;  // Wisch bereits in pointermove ausgelöst
  }

  wischEintrag = null;
  wischStart   = null;
  steuerungZuruecksetzen();
  warKlick = (dx*dx + dy*dy <= 25);
});

zeichner.domElement.addEventListener('pointercancel', () => {
  controls_enabled      = true;
  rotPointer            = null;
  velH = 0; velV = 0;
  wischEintrag          = null;
  wischStart            = null;
  wischWurdeAusgefuehrt = false;
  gedruecktBei          = null;
  warKlick              = false;
});

zeichner.domElement.addEventListener('click', e => {
  if (!warKlick) return;
  warKlick = false;
  if (animationLaeuft) return;

  strahl.setFromCamera(
    new THREE.Vector2((e.clientX/innerWidth)*2-1, -(e.clientY/innerHeight)*2+1),
    kamera
  );
  const treffer = strahl.intersectObjects(alleKacheln);
  if (!treffer.length) return;
  const netz = treffer[0].object;

  if (netz.userData.istMitte) {
    mitteTapAnzahl++;
    clearTimeout(mitteTapTimer);
    const anzahl = mitteTapAnzahl;
    mitteTapTimer = setTimeout(() => {
      mitteTapAnzahl = 0;
      if (anzahl >= 3)       { zustandSpeichern(); geloestSetzen(); }
      else if (anzahl === 2) { zustandSpeichern(); mischen(); }
      else {
        zustandSpeichern(); mittenAn = !mittenAn;
        for (const ei of mitteListe) setzeFarbe(ei, mittenAn ? ei.flaechenFarbe : null);
        mittenAn = mitteListe.some(e => e.farbId_echt !== null);
      }
    }, 350);
  } else if (e.detail === 1) {
    waehlerZeigen(netz, e.clientX, e.clientY);
  }
});

window.addEventListener('pointerdown', e => {
  if (!farbwaehler.contains(e.target)) waehlerVerbergen();
}, { capture: true });

// ══════════════════════════════════════════════════════════════
//  Kamera-Drehung (Quaternion-basiert; nach Tile-Handlern registriert,
//  damit Tile-Treffer die Rotation sperren können)
// ══════════════════════════════════════════════════════════════
zeichner.domElement.addEventListener('pointerdown', e => {
  if (!controls_enabled || rotPointer !== null || !e.isPrimary) return;
  rotPointer = e.pointerId;
  rotLetzX = e.clientX; rotLetzY = e.clientY;
  velH = 0; velV = 0;
});

zeichner.domElement.addEventListener('pointermove', e => {
  if (!controls_enabled || e.pointerId !== rotPointer) return;
  const dx = e.clientX - rotLetzX;
  const dy = e.clientY - rotLetzY;
  rotLetzX = e.clientX; rotLetzY = e.clientY;
  velH = -dx * 0.007;
  velV = -dy * 0.007;
  drehenDelta(velH, velV);
});

zeichner.domElement.addEventListener('pointerup', e => {
  if (e.pointerId === rotPointer) rotPointer = null;
});

// Zoom per Mausrad
zeichner.domElement.addEventListener('wheel', e => {
  if (!controls_enabled) return;
  e.preventDefault();
  camDist = Math.max(4, Math.min(18, camDist * (1 + e.deltaY * 0.001)));
  kameraAktualisieren();
}, { passive: false });

// ══════════════════════════════════════════════════════════════
//  Fenstergröße
// ══════════════════════════════════════════════════════════════
window.addEventListener('resize', () => {
  kamera.aspect = innerWidth/innerHeight;
  kamera.updateProjectionMatrix();
  zeichner.setSize(innerWidth, innerHeight);
  kameraAktualisieren();
});

setTimeout(() => { document.getElementById('tip').style.opacity='0'; }, 8000);

zustandSpeichern();

// ══════════════════════════════════════════════════════════════
//  Render-Schleife mit Tiefen-Transparenz
// ══════════════════════════════════════════════════════════════
const kamNorm = new THREE.Vector3();
(function schleife() {
  requestAnimationFrame(schleife);
  // Kamera-Dämpfung (Nachschwung nach Loslassen)
  if (rotPointer === null && controls_enabled) {
    velH *= 0.93; velV *= 0.93;
    if (Math.abs(velH) > 0.00005 || Math.abs(velV) > 0.00005) drehenDelta(velH, velV);
  }
  kamNorm.copy(kamera.position).normalize();
  for (const { ls, normale } of seitenLinien)
    ls.material.opacity = kamNorm.dot(normale) > 0 ? VORNE_OP : HINTEN_OP;
  for (const e of kachelListe) {
    if (!e.farbId) continue;
    e.netz.material.opacity = kamNorm.dot(e.fl.normale) > 0 ? 1.0 : 0.5;
  }
  zeichner.render(szene, kamera);
})();

// ══════════════════════════════════════════════════════════════
//  Zettel-System (Drag, Größe, Schließen)
// ══════════════════════════════════════════════════════════════
let obenZ = 30;

function nachVorne(el) { obenZ++; el.style.zIndex = obenZ; }

function zettelInit(zettel) {
  const griffleiste = zettel.querySelector('.zettel-grip');
  const groessengriff = zettel.querySelector('.zettel-resize');

  // Verschieben per Griffleiste
  griffleiste.addEventListener('mousedown', e => {
    e.preventDefault();
    nachVorne(zettel);
    const rahmen = zettel.getBoundingClientRect();
    const offX   = e.clientX - rahmen.left;
    const offY   = e.clientY - rahmen.top;

    function bewegen(ev) {
      const x = Math.max(0, Math.min(window.innerWidth  - zettel.offsetWidth,  ev.clientX - offX));
      const y = Math.max(0, Math.min(window.innerHeight - zettel.offsetHeight, ev.clientY - offY));
      zettel.style.left  = x + 'px';
      zettel.style.right = 'auto';
      zettel.style.top   = y + 'px';
    }
    function loslassen() {
      document.removeEventListener('mousemove', bewegen);
      document.removeEventListener('mouseup',   loslassen);
    }
    document.addEventListener('mousemove', bewegen);
    document.addEventListener('mouseup',   loslassen);
  });

  // Größe ändern per Anfasser rechts unten
  groessengriff.addEventListener('mousedown', e => {
    e.preventDefault();
    e.stopPropagation();
    const startBreite = zettel.offsetWidth;
    const startHoehe  = zettel.offsetHeight;
    const startX      = e.clientX;
    const startY      = e.clientY;

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

  // Schließen-Knopf
  zettel.querySelector('.zettel-close').addEventListener('click', () => {
    zettel.classList.remove('show');
  });

  // Nach vorne bringen bei Klick
  zettel.addEventListener('mousedown', () => nachVorne(zettel));
}

function umschalterInit(symbol, zettel) {
  symbol.addEventListener('click', () => {
    if (zettel.classList.contains('show')) {
      zettel.classList.remove('show');
    } else {
      zettel.classList.add('show');
      nachVorne(zettel);
    }
  });
}

const zettelWerkzeuge = document.getElementById('zettel-tools');
const zettelHilfe     = document.getElementById('zettel-help');
const symbolWerkzeuge = document.getElementById('icon-tools');
const symbolHilfe     = document.getElementById('icon-help');

zettelInit(zettelWerkzeuge);
zettelInit(zettelHilfe);
umschalterInit(symbolWerkzeuge, zettelWerkzeuge);
umschalterInit(symbolHilfe,     zettelHilfe);

// Escape schließt alle offenen Zettel
window.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    waehlerVerbergen();
    zettelWerkzeuge.classList.remove('show');
    zettelHilfe.classList.remove('show');
  }
});

// Klick außerhalb schließt den jeweiligen Zettel
window.addEventListener('pointerdown', e => {
  if (zettelWerkzeuge.classList.contains('show') &&
      !zettelWerkzeuge.contains(e.target) && !symbolWerkzeuge.contains(e.target)) {
    zettelWerkzeuge.classList.remove('show');
  }
  if (zettelHilfe.classList.contains('show') &&
      !zettelHilfe.contains(e.target) && !symbolHilfe.contains(e.target)) {
    zettelHilfe.classList.remove('show');
  }
}, { capture: true });

// ══════════════════════════════════════════════════════════════
//  Zug-Knöpfe & Aktions-Knöpfe
// ══════════════════════════════════════════════════════════════
const ZUEGE_NACH_NAME = Object.fromEntries(ALLE_ZUEGE.map(z => [z.name, z]));

document.querySelectorAll('[data-move]').forEach(knopf => {
  knopf.addEventListener('click', () => {
    if (animationLaeuft) return;
    const zug = ZUEGE_NACH_NAME[knopf.dataset.move];
    if (zug) { zustandSpeichern(zug.name); zugMitAnimation(zug); }
  });
});

function uebungBeenden() { aktuelleUebung = aktuelleUebungName = null; }

document.getElementById('btn-scramble').addEventListener('click', () => { uebungBeenden(); zustandSpeichern(); mischen(); });
document.getElementById('btn-solve').addEventListener('click',    () => { uebungBeenden(); zustandSpeichern(); geloestSetzen(); });
document.getElementById('img-geloest-icon').addEventListener('click', () => { uebungBeenden(); zustandSpeichern(); geloestSetzen(); });
document.querySelectorAll('.uebung-btn').forEach(btn => {
  btn.addEventListener('click', () => uebungSetzen(btn.dataset.uebung));
});
document.getElementById('btn-mischen-uebung').addEventListener('click', uebungMischen);
umschalterInit(document.getElementById('icon-uebung'), document.getElementById('zettel-uebung'));

// ── Ansicht-Zettel ──────────────────────────────────────────
function ansichtBeschriften() {
  document.getElementById('btn-ans-mitten').textContent    = `Mitten: ${ansichtMitten    ? 'sichtbar' : 'verborgen'}`;
  document.getElementById('btn-ans-geloest').textContent   = `Gelöste: ${ansichtGeloest   ? 'sichtbar' : 'verborgen'}`;
  document.getElementById('btn-ans-ungeloest').textContent = `Ungelöste: ${ansichtUngeloest ? 'sichtbar' : 'verborgen'}`;
}
document.getElementById('btn-ans-mitten').addEventListener('click', () => {
  ansichtMitten = !ansichtMitten; ansichtBeschriften(); displayAlles();
});
document.getElementById('btn-ans-geloest').addEventListener('click', () => {
  ansichtGeloest = !ansichtGeloest; ansichtBeschriften(); displayAlles();
});
document.getElementById('btn-ans-ungeloest').addEventListener('click', () => {
  ansichtUngeloest = !ansichtUngeloest; ansichtBeschriften(); displayAlles();
});
document.getElementById('btn-ans-alle').addEventListener('click', () => {
  ansichtMitten = ansichtGeloest = ansichtUngeloest = true;
  uebungBeenden(); ansichtBeschriften(); displayAlles();
});
umschalterInit(document.getElementById('icon-ansicht'), document.getElementById('zettel-ansicht'));
