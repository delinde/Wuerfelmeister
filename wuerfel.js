import * as THREE from 'three';
import { VORNE_OP, HINTEN_OP } from './wuerfel-const.js';
import { S } from './wuerfel-state.js';
import { kamera, zeichner, szene, matSchwarz, seitenLinien, cubies, drehenDelta, kameraAktualisieren } from './wuerfel-szene.js';
import { geloestSetzen, zustandSpeichern } from './wuerfel-verlauf.js';
import './wuerfel-ui.js';   // registriert alle Event-Handler (Side-Effects)

// ── Init ──────────────────────────────────────────────────
geloestSetzen();
zustandSpeichern();
setTimeout(() => { document.getElementById('tip').style.opacity = '0'; }, 8000);

// ── Fenstergröße ──────────────────────────────────────────
window.addEventListener('resize', () => {
  kamera.aspect = innerWidth / innerHeight;
  kamera.updateProjectionMatrix();
  zeichner.setSize(innerWidth, innerHeight);
  kameraAktualisieren();
});

// ── Render-Schleife ───────────────────────────────────────
const kamNorm  = new THREE.Vector3();
const weltNorm = new THREE.Vector3();

(function schleife() {
  requestAnimationFrame(schleife);
  // Kamera-Dämpfung (Nachschwung)
  if (S.rotPointer === null && S.controls_enabled) {
    S.velH *= 0.93; S.velV *= 0.93;
    if (Math.abs(S.velH) > 0.00005 || Math.abs(S.velV) > 0.00005) drehenDelta(S.velH, S.velV);
  }
  // Kamerarichtung (Einheitsvektor)
  kamNorm.copy(kamera.position).normalize();
  // Körper-Transparenz
  matSchwarz.opacity = 1 - S.durchsicht;
  // Gitter-Linien-Deckkraft
  for (const { ls, normale } of seitenLinien)
    ls.material.opacity = (kamNorm.dot(normale) > 0 ? VORNE_OP : HINTEN_OP) * S.gitterDeckkraft;
  // Kachel-Deckkraft: vorne = 1.0, hinten = durchsicht
  for (const c of cubies) {
    for (const k of c.kacheln) {
      if (!k.farbId && !k.netzRand) continue;
      weltNorm.set(0, 0, 0).setComponent(k.flAchse, k.flVz);
      weltNorm.applyQuaternion(c.group.quaternion);
      const baseOp = kamNorm.dot(weltNorm) > 0 ? 1.0 : S.durchsicht;
      if (k.netzRand) {
        // Mittenkachel: netz nur in Stufe 0 opak; netzRand/netzKern per visible gesteuert
        k.netz.material.opacity     = (k.farbId && S.mittenStufe === 0) ? baseOp : 0;
        k.netzRand.material.opacity = baseOp;
        k.netzKern.material.opacity = baseOp;
      } else {
        k.netz.material.opacity = baseOp;
      }
    }
  }
  zeichner.render(szene, kamera);
})();
