import * as THREE from 'three';
import { BRAND, clamp, lerp, easeOutCubic, hashString } from './rng.js';

const M = (color, opts = {}) =>
  new THREE.MeshStandardMaterial({
    color,
    roughness: 0.75,
    flatShading: true,
    ...opts
  });

const box = (w, h, d, mat, x = 0, y = 0, z = 0, parent = null) => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y, z);
  if (parent) parent.add(mesh);
  return mesh;
};

function createArm(coatMat, skinMat, side, width = 0.42, length = 1.5, handSize = [0.36, 0.3, 0.4]) {
  const pivot = new THREE.Group();
  const upperLen = length * 0.52;
  const lowerLen = length * 0.48;

  // Upper arm
  box(width, upperLen, 0.5, coatMat, 0, -upperLen * 0.5, 0, pivot);

  // Forearm pivot at elbow
  const forearm = new THREE.Group();
  forearm.position.set(0, -upperLen, 0);
  pivot.add(forearm);

  box(width * 0.96, lowerLen, 0.48, coatMat, 0, -lowerLen * 0.5, 0, forearm);
  const hand = box(handSize[0], handSize[1], handSize[2], skinMat, 0, -lowerLen - handSize[1] * 0.4, 0, forearm);

  // Thumb geometry (hidden unless thumbs_up pose)
  const thumb = box(0.14, 0.28, 0.14, skinMat, side * -0.1, 0.22, 0.08, hand);
  thumb.visible = false;

  return { pivot, forearm, hand, thumb };
}

function createLegs(pantMat, shoeMat, hipY = -1.9, spread = 0.38) {
  const legL = new THREE.Group();
  legL.position.set(-spread, hipY, 0);
  box(0.45, 0.22, 0.52, pantMat, 0, -0.05, 0, legL);
  box(0.46, 0.16, 0.62, shoeMat, 0, -0.22, 0.06, legL);

  const legR = new THREE.Group();
  legR.position.set(spread, hipY, 0);
  box(0.45, 0.22, 0.52, pantMat, 0, -0.05, 0, legR);
  box(0.46, 0.16, 0.62, shoeMat, 0, -0.22, 0.06, legR);

  return { legL, legR };
}

function createFace(head, eyeMat, pupilMat, browMat, mouthMat, opts = {}) {
  const eyeY = opts.eyeY ?? 0.1;
  const eyeZ = opts.eyeZ ?? 0.64;
  const browY = opts.browY ?? 0.36;
  const mouthY = opts.mouthY ?? -0.32;
  const sleepy = opts.sleepy ?? false;

  const eyes = [-0.3, 0.3].map((x) => {
    const e = box(0.3, 0.32, 0.05, eyeMat, x, eyeY, eyeZ, head);
    box(0.13, 0.16, 0.03, pupilMat, 0, sleepy ? -0.05 : -0.02, 0.03, e);
    if (sleepy && opts.lidMat) {
      box(0.32, 0.15, 0.07, opts.lidMat, 0, 0.1, 0.02, e);
    }
    return e;
  });

  const brows = [-0.3, 0.3].map((x) =>
    box(0.34, 0.08, 0.05, browMat, x, browY, eyeZ + 0.01, head)
  );
  const mouth = box(0.36, 0.08, 0.05, mouthMat, 0, mouthY, eyeZ + 0.005, head);

  return { eyes, brows, mouth, baseBrowY: browY };
}

// ---- Character Builders ----

function buildBrian() {
  const root = new THREE.Group();
  const coat = M(BRAND.PAPER);
  const ink = M(BRAND.INK);
  const skin = M(0xffc9a8);

  box(1.5, 1.7, 0.85, coat, 0, -1.1, 0, root);
  box(0.42, 1.2, 0.04, ink, 0, -0.8, 0.44, root);           // shirt strip
  box(0.12, 0.9, 0.03, M(BRAND.TANG), 0, -0.75, 0.465, root); // tie
  box(0.35, 0.12, 0.05, M(BRAND.LIL), 0.45, -0.6, 0.45, root); // pocket pen

  const armL = createArm(coat, skin, -1);
  armL.pivot.position.set(-0.95, -0.35, 0);
  root.add(armL.pivot);

  const armR = createArm(coat, skin, 1);
  armR.pivot.position.set(0.95, -0.35, 0);
  root.add(armR.pivot);

  const { legL, legR } = createLegs(ink, M(0x2a2736));
  root.add(legL, legR);

  box(0.4, 0.2, 0.4, skin, 0, -0.15, 0, root); // neck

  const head = new THREE.Group();
  head.position.set(0, 0.65, 0);
  root.add(head);

  box(0.75, 1.25, 1.25, M(BRAND.TANG), -0.375, 0, 0, head);
  box(0.75, 1.25, 1.25, M(BRAND.LIL), 0.375, 0, 0, head);

  // Low-poly brain folds
  [
    [-0.5, 0.68, 0.2, BRAND.TANG],
    [-0.2, 0.7, -0.3, BRAND.TANG],
    [-0.45, 0.66, -0.45, BRAND.TANG],
    [0.25, 0.7, 0.25, BRAND.LIL],
    [0.5, 0.66, -0.2, BRAND.LIL],
    [0.2, 0.69, -0.45, BRAND.LIL],
    [-0.2, 0.7, 0.35, BRAND.TANG],
    [0.5, 0.68, 0.35, BRAND.LIL]
  ].forEach(([x, y, z, c]) => box(0.42, 0.22, 0.38, M(c), x, y, z, head));

  box(0.04, 1.3, 1.27, M(0xffffff, { emissive: 0x553366 }), 0, 0, 0, head);

  const face = createFace(head, M(0xffffff), M(0x111111), ink, ink);
  return { root, head, armL, armR, legL, legR, ...face, baseHeadY: 0.65 };
}

function buildBenny() {
  const root = new THREE.Group();
  const hoodie = M(0x5c3624);
  const hoodieDark = M(0x3a2014);
  const cream = M(BRAND.PAPER);
  const skin = M(0xc88a55);
  const ink = M(BRAND.INK);

  // Hoodie torso + kangaroo pocket + drawstrings
  box(1.52, 1.68, 0.88, hoodie, 0, -1.1, 0, root);
  box(0.95, 0.52, 0.1, hoodieDark, 0, -1.5, 0.46, root);
  box(0.06, 0.45, 0.05, cream, -0.18, -0.52, 0.47, root);
  box(0.06, 0.45, 0.05, cream, 0.18, -0.52, 0.47, root);
  // Coffee bean chest badge
  box(0.28, 0.34, 0.06, M(0x2b1710), 0, -0.82, 0.46, root);
  box(0.05, 0.28, 0.07, cream, 0, -0.82, 0.47, root);

  const armL = createArm(hoodie, skin, -1);
  armL.pivot.position.set(-0.96, -0.35, 0);
  root.add(armL.pivot);

  const armR = createArm(hoodie, skin, 1);
  armR.pivot.position.set(0.96, -0.35, 0);
  root.add(armR.pivot);

  const { legL, legR } = createLegs(ink, M(0x5c3624));
  root.add(legL, legR);

  box(0.42, 0.22, 0.42, hoodieDark, 0, -0.15, 0, root);

  const head = new THREE.Group();
  head.position.set(0, 0.65, 0);
  root.add(head);

  // Roasted coffee-bean cube head
  box(1.42, 1.22, 1.22, skin, 0, 0, 0, head);
  box(0.06, 0.35, 1.24, hoodieDark, 0, 0.46, 0, head);

  // Paper coffee cup on head
  const cup = new THREE.Group();
  cup.position.set(0.1, 0.96, 0);
  cup.rotation.z = -0.08;
  const cupBody = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.3, 0.72, 8), cream);
  const cupSleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.37, 0.33, 0.34, 8), M(BRAND.TANG));
  const cupLid = new THREE.Mesh(new THREE.CylinderGeometry(0.43, 0.43, 0.12, 8), ink);
  cupLid.position.y = 0.4;
  cup.add(cupBody, cupSleeve, cupLid);
  head.add(cup);

  const face = createFace(head, M(0xffffff), M(0x111111), hoodieDark, hoodieDark);
  return { root, head, armL, armR, legL, legR, ...face, baseHeadY: 0.65 };
}

function buildTea() {
  const root = new THREE.Group();
  const hoodie = M(0x2e8b57);
  const hoodieDark = M(0x1e5c3a);
  const headMat = M(0xbce3b4);
  const leafMat = M(0x4ade80);
  const ink = M(BRAND.INK);

  box(1.48, 1.66, 0.85, hoodie, 0, -1.1, 0, root);
  box(0.88, 0.48, 0.08, hoodieDark, 0, -1.48, 0.44, root);
  box(0.06, 0.42, 0.05, M(BRAND.PAPER), -0.16, -0.5, 0.45, root);
  box(0.06, 0.42, 0.05, M(BRAND.PAPER), 0.16, -0.5, 0.45, root);

  const armL = createArm(hoodie, headMat, -1);
  armL.pivot.position.set(-0.94, -0.35, 0);
  root.add(armL.pivot);

  const armR = createArm(hoodie, headMat, 1);
  armR.pivot.position.set(0.94, -0.35, 0);
  root.add(armR.pivot);

  const { legL, legR } = createLegs(ink, M(0x2e8b57));
  root.add(legL, legR);

  box(0.38, 0.2, 0.38, hoodieDark, 0, -0.15, 0, root);

  const head = new THREE.Group();
  head.position.set(0, 0.65, 0);
  root.add(head);

  box(1.38, 1.2, 1.2, headMat, 0, 0, 0, head);

  // Leaf sprout on top
  const sprout = new THREE.Group();
  sprout.position.set(0, 0.62, 0);
  box(0.09, 0.42, 0.09, hoodieDark, 0, 0.2, 0, sprout);
  const leafL = box(0.48, 0.1, 0.24, leafMat, -0.24, 0.42, 0, sprout);
  leafL.rotation.z = 0.35;
  const leafR = box(0.48, 0.1, 0.24, leafMat, 0.24, 0.46, 0, sprout);
  leafR.rotation.z = -0.28;
  head.add(sprout);

  const face = createFace(head, M(0xffffff), M(0x111111), hoodieDark, hoodieDark);
  return { root, head, armL, armR, legL, legR, ...face, baseHeadY: 0.65 };
}

function buildShroom() {
  const root = new THREE.Group();
  const cream = M(0xebe4d4);
  const hoodShade = M(0xd2c7b3);
  const skin = M(0xf6ede0);
  const capMat = M(0xc88a5e);
  const ink = M(BRAND.INK);

  box(1.52, 1.68, 0.88, cream, 0, -1.1, 0, root);
  box(0.92, 0.5, 0.09, hoodShade, 0, -1.5, 0.46, root);
  box(0.06, 0.42, 0.05, hoodShade, -0.18, -0.52, 0.47, root);
  box(0.06, 0.42, 0.05, hoodShade, 0.18, -0.52, 0.47, root);

  const armL = createArm(cream, skin, -1);
  armL.pivot.position.set(-0.96, -0.35, 0);
  root.add(armL.pivot);

  const armR = createArm(cream, skin, 1);
  armR.pivot.position.set(0.96, -0.35, 0);
  root.add(armR.pivot);

  const { legL, legR } = createLegs(ink, cream);
  root.add(legL, legR);

  box(0.4, 0.2, 0.4, hoodShade, 0, -0.15, 0, root);

  const head = new THREE.Group();
  head.position.set(0, 0.65, 0);
  root.add(head);

  // Shaggy cream hood up framing the face
  box(1.58, 1.38, 1.38, cream, 0, 0.04, -0.06, head);
  box(1.66, 0.28, 1.44, capMat, 0, 0.64, -0.02, head); // mushroom-cap hood crown
  box(0.24, 0.1, 0.24, cream, -0.45, 0.78, 0.2, head);
  box(0.22, 0.1, 0.22, cream, 0.35, 0.78, -0.2, head);

  // Face recessed inside hood
  box(1.24, 1.06, 0.16, skin, 0, -0.02, 0.58, head);

  const face = createFace(head, M(0xffffff), M(0x111111), ink, ink, {
    eyeY: 0.06,
    eyeZ: 0.68,
    browY: 0.29,
    mouthY: -0.3,
    sleepy: true,
    lidMat: hoodShade
  });
  return { root, head, armL, armR, legL, legR, ...face, baseHeadY: 0.65 };
}

function buildBrick() {
  const root = new THREE.Group();
  const tank = M(0x1e2547);
  const tang = M(BRAND.TANG);
  const lil = M(BRAND.LIL);
  const skin = M(0xffb997);
  const ink = M(BRAND.INK);

  // Broader, taller gym-bro torso
  box(1.78, 1.88, 0.94, tank, 0, -0.98, 0, root);
  // Capsule-striped tank top pattern
  box(1.8, 0.24, 0.96, tang, 0, -0.62, 0, root);
  box(1.8, 0.16, 0.96, lil, 0, -0.92, 0, root);
  box(0.36, 0.66, 0.06, tang, -0.18, -1.42, 0.48, root);
  box(0.36, 0.66, 0.06, lil, 0.18, -1.42, 0.48, root);

  const armL = createArm(skin, skin, -1, 0.48, 1.62, [0.44, 0.34, 0.44]);
  armL.pivot.position.set(-1.14, -0.18, 0);
  root.add(armL.pivot);

  const armR = createArm(skin, skin, 1, 0.48, 1.62, [0.44, 0.34, 0.44]);
  armR.pivot.position.set(1.14, -0.18, 0);
  root.add(armR.pivot);

  const { legL, legR } = createLegs(ink, tang, -1.9, 0.44);
  root.add(legL, legR);

  box(0.48, 0.22, 0.48, skin, 0, 0.04, 0, root);

  const head = new THREE.Group();
  head.position.set(0, 0.82, 0);
  root.add(head);

  box(1.36, 1.24, 1.2, skin, 0, 0, 0, head);
  // Athletic headband + flat-top hair block
  box(1.42, 0.22, 1.24, tang, 0, 0.38, 0, head);
  box(1.38, 0.24, 1.22, ink, 0, 0.6, 0, head);

  const face = createFace(head, M(0xffffff), M(0x111111), ink, ink);
  return { root, head, armL, armR, legL, legR, ...face, baseHeadY: 0.82 };
}

const BUILDERS = {
  brian: buildBrian,
  benny: buildBenny,
  tea: buildTea,
  shroom: buildShroom,
  brick: buildBrick
};

export function createCharacter(type = 'brian', id = type) {
  const fn = BUILDERS[type.toLowerCase()] || buildBrian;
  const rig = fn();
  rig.type = type.toLowerCase();
  rig.id = id;
  rig.blinkOffset = (hashString(id) % 100) / 37;
  return rig;
}

/**
 * Deterministically poses and animates a character rig at time t.
 */
export function updateCharacter(rig, t, beatLocalT, state = {}) {
  const actions = new Set();
  if (typeof state.action === 'string') actions.add(state.action);
  if (Array.isArray(state.actions)) {
    state.actions.forEach((a) => actions.add(a));
  }
  if (actions.size === 0) actions.add('idle');

  const speaking = state.speaking ?? actions.has('talk');

  // Mouth talk oscillation
  rig.mouth.scale.y = speaking
    ? 1 + 3.2 * Math.abs(Math.sin(t * 17) * Math.sin(t * 5.3))
    : 1;

  // Periodic blink (plus explicit blink action)
  const blinkPhase = (t + rig.blinkOffset) % 2.7;
  const blinkVal = actions.has('blink')
    ? (Math.sin(beatLocalT * 10) > 0.6 ? 0.1 : 1)
    : (blinkPhase > 2.55 ? 0.1 : 1);
  rig.eyes.forEach((e) => {
    e.scale.y = blinkVal;
  });

  // Head bob & subtle natural sway
  const bobMult = actions.has('head_bob') || actions.has('bob') ? 2.4 : 1.0;
  rig.head.rotation.z = Math.sin(t * 2.1) * 0.05 * bobMult;
  rig.head.rotation.y = Math.sin(t * 1.3) * 0.12;
  rig.head.rotation.x = actions.has('head_bob') || actions.has('bob')
    ? Math.sin(t * 6.5) * 0.12
    : 0;
  rig.head.position.y = rig.baseHeadY + Math.abs(Math.sin(t * 4)) * 0.04 * bobMult;

  // Brows
  const browUp = state.brow === 'up' || actions.has('eyebrow_up') || actions.has('brow_up');
  const browTilt = state.brow === 'tilt' || actions.has('point') || actions.has('eyebrow_up');
  rig.brows.forEach((b, i) => {
    b.position.y = rig.baseBrowY + (browUp ? 0.08 : 0);
    b.rotation.z = browTilt ? (i ? -0.2 : 0.2) : 0;
  });

  // Reset arm transforms before applying pose weights
  rig.armL.pivot.rotation.set(0, 0, -Math.sin(t * 3) * 0.05);
  rig.armR.pivot.rotation.set(0, 0, Math.sin(t * 3) * 0.05);
  rig.armL.forearm.rotation.set(0, 0, 0);
  rig.armR.forearm.rotation.set(0, 0, 0);
  rig.armL.thumb.visible = false;
  rig.armR.thumb.visible = false;

  const wIn = easeOutCubic(clamp(beatLocalT / 0.35, 0, 1));

  if (actions.has('point')) {
    rig.armR.pivot.rotation.z = 1.9 * wIn;
    rig.armR.pivot.rotation.x = -0.4 * wIn;
  }

  if (actions.has('point_left')) {
    rig.armL.pivot.rotation.z = -1.9 * wIn;
    rig.armL.pivot.rotation.x = -0.4 * wIn;
  }

  if (actions.has('thumbs_up')) {
    rig.armR.pivot.rotation.z = 0.18 * wIn;
    rig.armR.pivot.rotation.x = -1.25 * wIn;
    rig.armR.forearm.rotation.x = -0.45 * wIn;
    rig.armR.thumb.visible = true;
  }

  if (actions.has('flex')) {
    rig.armL.pivot.rotation.z = -1.75 * wIn;
    rig.armR.pivot.rotation.z = 1.75 * wIn;
    rig.armL.forearm.rotation.z = -1.55 * wIn;
    rig.armR.forearm.rotation.z = 1.55 * wIn;
  }

  if (actions.has('tap')) {
    const tapPulse = Math.max(0, Math.sin(beatLocalT * 6.0));
    rig.armR.pivot.rotation.x = (-0.95 - tapPulse * 0.28) * wIn;
    rig.armR.pivot.rotation.z = 0.22 * wIn;
    rig.armR.forearm.rotation.x = -0.25 * wIn;
  }

  if (actions.has('wave')) {
    rig.armR.pivot.rotation.z = (2.1 + Math.sin(t * 9.5) * 0.32) * wIn;
  }

  // Transform placement
  const pos = state.pos || [0, 0, 0];
  rig.root.position.set(pos[0] ?? 0, pos[1] ?? 0, pos[2] ?? 0);
  rig.root.rotation.y = state.rotY ?? 0;
  const sc = state.scale ?? 1;
  if (Array.isArray(sc)) {
    rig.root.scale.set(sc[0] ?? 1, sc[1] ?? 1, sc[2] ?? 1);
  } else {
    rig.root.scale.setScalar(sc);
  }
  rig.root.visible = state.visible !== false;
}
