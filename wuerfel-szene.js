import * as THREE from 'three';
import { SCHRITT, KHALB, AUFHEBUNG, KACHELGR, FLAECHENDEFS, VORNE_OP, geoRand, geoKern, istMitte, seitenEuler } from './wuerfel-const.js';
import { S } from './wuerfel-state.js';

// ── Three.js-Kern ──────────────────────────────────────────
export const szene    = new THREE.Scene();
export const kamera   = new THREE.PerspectiveCamera(45, innerWidth/innerHeight, 0.1, 100);
kamera.position.set(5.5, 4.5, 7.5);
kamera.lookAt(0, 0, 0);

export const zeichner = new THREE.WebGLRenderer({ antialias: true });
zeichner.setPixelRatio(Math.min(devicePixelRatio, 2));
zeichner.setSize(innerWidth, innerHeight);
zeichner.setClearColor(0x0d0d1a);
document.body.appendChild(zeichner.domElement);

// Kamera-Quaternion und Kugelkoordinaten aus Startposition ableiten
S.camDist   = kamera.position.length();
S.elevation = Math.asin(kamera.position.y / S.camDist);
S.azimuth   = Math.atan2(kamera.position.x, kamera.position.z);
S.camQuat.copy(kamera.quaternion);

// ── Kamera-Funktionen ──────────────────────────────────────
export function kameraAktualisieren() {
  const sinAz = Math.sin(S.azimuth),  cosAz = Math.cos(S.azimuth);
  const sinEl = Math.sin(S.elevation), cosEl = Math.cos(S.elevation);
  kamera.position.set(
    S.camDist * sinAz * cosEl,
    S.camDist * sinEl,
    S.camDist * cosAz * cosEl
  );
  // Meridian-Tangente: immer ⊥ zur Blickrichtung → kein Pol-Problem
  kamera.up.set(-sinAz * sinEl, cosEl, -cosAz * sinEl);
  kamera.lookAt(0, 0, 0);
  S.camQuat.copy(kamera.quaternion);
}

export function drehenDelta(dH, dV) {
  S.azimuth  += Math.cos(S.elevation) < 0 ? -dH : dH;
  S.elevation -= dV;
  kameraAktualisieren();
}

// ── Kachel-Hilfe ───────────────────────────────────────────
export function setzeKachelTransform(k) {
  const p = [0, 0, 0];
  p[k.flAchse] = k.flVz * AUFHEBUNG;
  const rot = seitenEuler(k.flAchse, k.flVz);
  k.netz.position.set(p[0], p[1], p[2]);
  k.netz.rotation.copy(rot);
  if (k.netzRand) { k.netzRand.position.set(p[0], p[1], p[2]); k.netzRand.rotation.copy(rot); }
  if (k.netzKern) { k.netzKern.position.set(p[0], p[1], p[2]); k.netzKern.rotation.copy(rot); }
}

// ── Materialien ────────────────────────────────────────────
export const matSchwarz = new THREE.MeshBasicMaterial({ color: 0x111111, transparent: true, depthWrite: false });
const geoKorper = new THREE.BoxGeometry(KHALB*2, KHALB*2, KHALB*2);

// ── Cubies (26 Außenstücke) ────────────────────────────────
export const cubies      = [];
export const alleKacheln = [];
export const mitteListe  = [];

for (let cx=-1; cx<=1; cx++) for (let cy=-1; cy<=1; cy++) for (let cz=-1; cz<=1; cz++) {
  if (!cx && !cy && !cz) continue;

  const group = new THREE.Group();
  group.position.set(cx*SCHRITT, cy*SCHRITT, cz*SCHRITT);
  szene.add(group);
  group.add(new THREE.Mesh(geoKorper, matSchwarz));

  const mitte   = istMitte(cx, cy, cz);
  const kacheln = [];

  for (const fl of FLAECHENDEFS) {
    if ([cx,cy,cz][fl.achse] !== fl.vz) continue;

    const geo  = new THREE.PlaneGeometry(KACHELGR, KACHELGR);
    const mat  = new THREE.MeshBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 1.0,
      side: THREE.DoubleSide, depthWrite: false,
    });
    const netz = new THREE.Mesh(geo, mat);
    netz.visible = false;
    group.add(netz);

    // Rand- und Kern-Meshes nur für Mittenkacheln
    let netzRand = null, netzKern = null;
    if (mitte) {
      const matR = new THREE.MeshBasicMaterial({ color:0xffffff, transparent:true, opacity:1.0, side:THREE.DoubleSide, depthWrite:false });
      netzRand = new THREE.Mesh(geoRand, matR);
      netzRand.visible = false;
      group.add(netzRand);
      const matK = new THREE.MeshBasicMaterial({ color:0xffffff, transparent:true, opacity:1.0, side:THREE.DoubleSide, depthWrite:false });
      netzKern = new THREE.Mesh(geoKern, matK);
      netzKern.visible = false;
      group.add(netzKern);
    }

    const k = {
      netz,
      netzRand,     // null für Nicht-Mittenkacheln
      netzKern,     // null für Nicht-Mittenkacheln
      cubie:        null,
      flAchse:      fl.achse,
      flVz:         fl.vz,
      initFlAchse:  fl.achse,
      initFlVz:     fl.vz,
      farbId_echt:  null,
      farbId:       null,
      istMitte:     mitte,
      flaechenFarbe: mitte ? fl.farbId : null,
    };
    netz.userData = k;
    setzeKachelTransform(k);
    alleKacheln.push(netz);
    kacheln.push(k);
    if (mitte) mitteListe.push(k);
  }

  const cubie = { group, logPos:[cx,cy,cz], initLogPos:[cx,cy,cz], kacheln };
  for (const k of kacheln) k.cubie = cubie;
  cubies.push(cubie);
}

// ── Gitterlinien ──────────────────────────────────────────
const seitenPunkte = FLAECHENDEFS.map(() => []);
function _kante(fi, x1,y1,z1, x2,y2,z2) { seitenPunkte[fi].push(x1,y1,z1, x2,y2,z2); }

for (let cx=-1; cx<=1; cx++) for (let cy=-1; cy<=1; cy++) for (let cz=-1; cz<=1; cz++) {
  if (!cx && !cy && !cz) continue;
  const px=cx*SCHRITT, py=cy*SCHRITT, pz=cz*SCHRITT;
  for (const dx of [-1,1]) for (const dy of [-1,1]) {
    if (cx*dx!==1 && cy*dy!==1) continue;
    const fx=px+dx*KHALB, fy=py+dy*KHALB;
    if (cx=== 1&&dx=== 1) _kante(0,fx,fy,pz-KHALB,fx,fy,pz+KHALB);
    if (cx===-1&&dx===-1) _kante(1,fx,fy,pz-KHALB,fx,fy,pz+KHALB);
    if (cy=== 1&&dy=== 1) _kante(2,fx,fy,pz-KHALB,fx,fy,pz+KHALB);
    if (cy===-1&&dy===-1) _kante(3,fx,fy,pz-KHALB,fx,fy,pz+KHALB);
  }
  for (const dx of [-1,1]) for (const dz of [-1,1]) {
    if (cx*dx!==1 && cz*dz!==1) continue;
    const fx=px+dx*KHALB, fz=pz+dz*KHALB;
    if (cx=== 1&&dx=== 1) _kante(0,fx,py-KHALB,fz,fx,py+KHALB,fz);
    if (cx===-1&&dx===-1) _kante(1,fx,py-KHALB,fz,fx,py+KHALB,fz);
    if (cz=== 1&&dz=== 1) _kante(4,fx,py-KHALB,fz,fx,py+KHALB,fz);
    if (cz===-1&&dz===-1) _kante(5,fx,py-KHALB,fz,fx,py+KHALB,fz);
  }
  for (const dy of [-1,1]) for (const dz of [-1,1]) {
    if (cy*dy!==1 && cz*dz!==1) continue;
    const fy=py+dy*KHALB, fz=pz+dz*KHALB;
    if (cy=== 1&&dy=== 1) _kante(2,px-KHALB,fy,fz,px+KHALB,fy,fz);
    if (cy===-1&&dy===-1) _kante(3,px-KHALB,fy,fz,px+KHALB,fy,fz);
    if (cz=== 1&&dz=== 1) _kante(4,px-KHALB,fy,fz,px+KHALB,fy,fz);
    if (cz===-1&&dz===-1) _kante(5,px-KHALB,fy,fz,px+KHALB,fy,fz);
  }
}

export const seitenLinien = FLAECHENDEFS.map((fl, i) => {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(seitenPunkte[i], 3));
  const mat = new THREE.LineBasicMaterial({ color:0x8899bb, transparent:true, opacity:VORNE_OP });
  const ls  = new THREE.LineSegments(geo, mat);
  szene.add(ls);
  return { ls, normale: fl.normale };
});

// ── Lookup ─────────────────────────────────────────────────
export function cubieAnPos(cx, cy, cz) {
  return cubies.find(c => c.logPos[0]===cx && c.logPos[1]===cy && c.logPos[2]===cz);
}
