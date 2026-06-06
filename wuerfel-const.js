import * as THREE from 'three';

// ── Farben ──────────────────────────────────────────────────
export const FARBEN = [
  { id:'white',  hex:0xf0f0f0, css:'#f0f0f0', bezeichnung:'Weiß'   },
  { id:'yellow', hex:0xffd000, css:'#ffd000', bezeichnung:'Gelb'   },
  { id:'red',    hex:0xcc1111, css:'#cc1111', bezeichnung:'Rot'    },
  { id:'orange', hex:0xff8800, css:'#ff8800', bezeichnung:'Orange' },
  { id:'blue',   hex:0x0044cc, css:'#0044cc', bezeichnung:'Blau'   },
  { id:'green',  hex:0x00aa44, css:'#00aa44', bezeichnung:'Grün'   },
];
export const FARBKARTE  = Object.fromEntries(FARBEN.map(f => [f.id, f]));
export const GEGENUEBER = { white:'yellow', yellow:'white', red:'orange', orange:'red', blue:'green', green:'blue' };

// ── Geometrie-Konstanten ─────────────────────────────────────
export const SCHRITT   = 1.06;
export const KHALB     = 0.965 / 2;
export const AUFHEBUNG = 0.504;
export const KACHELGR  = 0.83;

// ── Flächendefinitionen ──────────────────────────────────────
export const FLAECHENDEFS = [
  { achse:0, vz: 1, farbId:'blue',   normale:new THREE.Vector3( 1, 0, 0) },
  { achse:0, vz:-1, farbId:'green',  normale:new THREE.Vector3(-1, 0, 0) },
  { achse:1, vz: 1, farbId:'yellow', normale:new THREE.Vector3( 0, 1, 0) },
  { achse:1, vz:-1, farbId:'white',  normale:new THREE.Vector3( 0,-1, 0) },
  { achse:2, vz: 1, farbId:'orange', normale:new THREE.Vector3( 0, 0, 1) },
  { achse:2, vz:-1, farbId:'red',    normale:new THREE.Vector3( 0, 0,-1) },
];

export const VORNE_OP  = 0.80;
export const HINTEN_OP = 0.35;

// ── Mittenkachel-Geometrien (Rand / Kern) ────────────────────
// Rand: quadratischer Rahmen aus 8 Dreiecken (explizit, ohne ShapeGeometry-Lochlogik)
export const geoRand = (() => {
  const o = KACHELGR / 2;            // äußere Hälfte = 0.415
  const i = o - KACHELGR / 5;        // innere Hälfte = 0.249  (Randbreite = 0.166)
  // Äußere Ecken 0-3, innere Ecken 4-7 (alle in XY-Ebene, z=0)
  const pos = new Float32Array([
    -o,-o,0,  o,-o,0,  o, o,0, -o, o,0,   // 0 1 2 3  outer
    -i,-i,0,  i,-i,0,  i, i,0, -i, i,0,   // 4 5 6 7  inner
  ]);
  const idx = new Uint16Array([
    0,1,5, 0,5,4,   // unterer Streifen
    1,2,6, 1,6,5,   // rechter Streifen
    2,3,7, 2,7,6,   // oberer Streifen
    3,0,4, 3,4,7,   // linker Streifen
  ]);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setIndex(new THREE.BufferAttribute(idx, 1));
  geo.computeVertexNormals();
  return geo;
})();

export const geoKern = new THREE.PlaneGeometry(KACHELGR * 2/5, KACHELGR * 2/5);

// ── Reine Hilfsfunktionen ────────────────────────────────────
export function istMitte(cx, cy, cz) { return (cx!==0)+(cy!==0)+(cz!==0) === 1; }

export function seitenEuler(achse, vz) {
  if (achse===0) return new THREE.Euler(0, vz>0?  Math.PI/2:-Math.PI/2, 0);
  if (achse===1) return new THREE.Euler(vz>0?-Math.PI/2: Math.PI/2, 0, 0);
  return new THREE.Euler(0, vz<0?Math.PI:0, 0);
}

export function sollFarbe(flAchse, flVz) {
  return FLAECHENDEFS.find(fl => fl.achse === flAchse && fl.vz === flVz).farbId;
}

// ── Zugdefinitionen ──────────────────────────────────────────
const GRUNDZUEGE = [
  { name:'U', achse:1, vz: 1, drehen:([x,y,z])=>[ z, y,-x] },
  { name:'D', achse:1, vz:-1, drehen:([x,y,z])=>[-z, y, x] },
  { name:'R', achse:0, vz: 1, drehen:([x,y,z])=>[ x,-z, y] },
  { name:'L', achse:0, vz:-1, drehen:([x,y,z])=>[ x, z,-y] },
  { name:'F', achse:2, vz: 1, drehen:([x,y,z])=>[ y,-x, z] },
  { name:'B', achse:2, vz:-1, drehen:([x,y,z])=>[-y, x, z] },
];

const MITTEL_ZUEGE = [
  { name:'E', achse:1, vz:0, drehVz:-1, drehen:([x,y,z])=>[-z, y, x] },
  { name:'M', achse:0, vz:0, drehVz:-1, drehen:([x,y,z])=>[ x, z,-y] },
  { name:'S', achse:2, vz:0, drehVz: 1, drehen:([x,y,z])=>[ y,-x, z] },
];

export const ALLE_ZUEGE = [];
for (const m of [...GRUNDZUEGE, ...MITTEL_ZUEGE]) {
  const d2 = v => m.drehen(m.drehen(v));
  const d3 = v => m.drehen(d2(v));
  ALLE_ZUEGE.push({ ...m }, { ...m, name:m.name+"'", drehen:d3 }, { ...m, name:m.name+'2', drehen:d2 });
}

export const ZUEGE_NACH_NAME = Object.fromEntries(ALLE_ZUEGE.map(z => [z.name, z]));
