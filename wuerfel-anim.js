import * as THREE from 'three';
import { SCHRITT } from './wuerfel-const.js';
import { szene, cubies, setzeKachelTransform } from './wuerfel-szene.js';
import { _displayKachel } from './wuerfel-display.js';
import { S } from './wuerfel-state.js';

// ── Physischer Zug: Cubies im Raum bewegen ─────────────────
export function zugAusfuehren(zug) {
  const { achse, vz, drehen } = zug;
  for (const c of cubies.filter(c => c.logPos[achse] === vz)) {
    c.logPos = drehen(c.logPos);
    c.group.position.set(c.logPos[0]*SCHRITT, c.logPos[1]*SCHRITT, c.logPos[2]*SCHRITT);
    c.group.rotation.set(0, 0, 0);
    for (const k of c.kacheln) {
      // Flächennormale mitdrehen → neue flAchse / flVz ermitteln
      const fv = [0, 0, 0];
      fv[k.flAchse] = k.flVz;
      const [fx, fy, fz] = drehen(fv);
      k.flAchse = fx!==0 ? 0 : fy!==0 ? 1 : 2;
      k.flVz    = fx!==0 ? fx : fy!==0 ? fy : fz;
      setzeKachelTransform(k);
      _displayKachel(k);
    }
  }
}

// ── Animierter Zug ─────────────────────────────────────────
export function zugMitAnimation(zug, nachher = null) {
  const { achse, vz } = zug;

  let winkel = Math.PI / 2;
  if (zug.name.endsWith("'")) winkel = -Math.PI / 2;
  else if (zug.name.endsWith('2')) winkel = Math.PI;

  const axVz = zug.drehVz ?? vz;
  const drehachse = new THREE.Vector3();
  drehachse.setComponent(achse, achse === 2 ? -axVz : axVz);

  const betroffene = cubies.filter(c => c.logPos[achse] === vz);
  const drehgruppe = new THREE.Group();
  szene.add(drehgruppe);
  for (const c of betroffene) drehgruppe.add(c.group);

  const dauer      = 240;
  const startZeit  = performance.now();
  S.animationLaeuft  = true;
  S.controls_enabled = false;

  function sanft(t) { return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3) / 2; }

  (function schritt(jetzt) {
    const t = Math.min((jetzt - startZeit) / dauer, 1);
    drehgruppe.setRotationFromAxisAngle(drehachse, winkel * sanft(t));

    if (t < 1) {
      requestAnimationFrame(schritt);
    } else {
      // Cubies zurück in Szene (Welt-Transform bleibt erhalten)
      for (const c of betroffene) szene.attach(c.group);
      szene.remove(drehgruppe);

      // Logischen Zustand exakt setzen (kein Float-Drift)
      if (nachher) nachher(); else zugAusfuehren(zug);

      S.animationLaeuft = false;
      steuerungZuruecksetzen();
    }
  })(startZeit);
}

// ── Steuerung zurücksetzen ─────────────────────────────────
export function steuerungZuruecksetzen() {
  S.controls_enabled = true;
  S.rotPointer = null;
  S.velH = 0; S.velV = 0;
}
