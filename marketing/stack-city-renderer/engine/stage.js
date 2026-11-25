import * as THREE from 'three';
import { BRAND, mulberry32, lerp, getEase, clamp } from './rng.js';

export const CAMERA_PRESETS = {
  punch_in: {
    pos: [0, 0.72, 4.9],
    target: [0, 0.55, 0],
    fov: 32,
    sway: [0.06, 0.02]
  },
  medium: {
    pos: [0, 0.55, 8.2],
    target: [0, 0.0, 0],
    fov: 32,
    sway: [0.15, 0.04]
  },
  wide: {
    pos: [0, 0.95, 13.0],
    target: [0, 0.2, 0],
    fov: 32,
    sway: [0.22, 0.05]
  },
  orbit: {
    pos: [0, 1.1, 9.5],
    target: [0, 0.1, 0],
    fov: 32,
    radius: 9.5,
    angleStart: -0.45,
    angleEnd: 0.45,
    height: 1.1,
    sway: [0, 0]
  },
  pov: {
    pos: [0.15, 0.45, 6.2],
    target: [0, -0.35, 1.1],
    fov: 35,
    sway: [0.08, 0.03]
  }
};

export function createStage(canvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    preserveDrawingBuffer: true
  });
  renderer.setPixelRatio(window.devicePixelRatio || 1);
  renderer.setSize(540, 960);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  const scene = new THREE.Scene();

  // Night gradient backdrop matching prototype
  {
    const cv = document.createElement('canvas');
    cv.width = 4;
    cv.height = 256;
    const g = cv.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, '#1b1460');
    gr.addColorStop(0.55, '#0e1a4a');
    gr.addColorStop(1, '#060818');
    g.fillStyle = gr;
    g.fillRect(0, 0, 4, 256);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    scene.background = tex;
  }

  scene.fog = new THREE.Fog(0x0e1a4a, 14, 40);

  const cam = new THREE.PerspectiveCamera(32, 540 / 960, 0.1, 100);

  // Lighting rig matching prototype
  scene.add(new THREE.HemisphereLight(0xbfc8ff, 0x20143a, 1.1));

  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(3, 6, 6);
  scene.add(key);

  const rim = new THREE.DirectionalLight(BRAND.LIL, 2.5);
  rim.position.set(-5, 3, -4);
  scene.add(rim);

  const rim2 = new THREE.DirectionalLight(BRAND.TANG, 1.6);
  rim2.position.set(5, 2, -4);
  scene.add(rim2);

  // Deterministic bokeh sprites
  const bokehSprites = [];
  {
    const cv = document.createElement('canvas');
    cv.width = 64;
    cv.height = 64;
    const g = cv.getContext('2d');
    const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    r.addColorStop(0, 'rgba(255,255,255,1)');
    r.addColorStop(0.5, 'rgba(255,255,255,.5)');
    r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r;
    g.fillRect(0, 0, 64, 64);
    const tex = new THREE.CanvasTexture(cv);

    const cols = [BRAND.TANG, BRAND.LIL, 0x5c7cff, 0xffc46b];
    const rnd = mulberry32(7);
    for (let i = 0; i < 70; i++) {
      const sp = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: tex,
          color: cols[i % 4],
          transparent: true,
          opacity: 0.25 + rnd() * 0.45,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          fog: false
        })
      );
      const bx = (rnd() - 0.5) * 30;
      const by = rnd() * 12 - 1;
      const bz = -8 - rnd() * 18;
      const k = 0.4 + rnd() * 1.4;
      sp.position.set(bx, by, bz);
      sp.scale.set(k, k, 1);
      scene.add(sp);
      bokehSprites.push({ sp, bx, by, bz, phase: rnd() * Math.PI * 2, speed: 0.3 + rnd() * 0.5 });
    }
  }

  // Faint glowing grid floor
  const grid = new THREE.GridHelper(60, 60, 0x3a3aa0, 0x24246a);
  grid.position.y = -2.2;
  grid.material.transparent = true;
  grid.material.opacity = 0.5;
  scene.add(grid);

  function resolveCameraState(camCfg, localT, beatDur, globalT) {
    const cfg = typeof camCfg === 'string' ? { preset: camCfg } : (camCfg || {});
    const presetName = cfg.preset || 'medium';
    const base = CAMERA_PRESETS[presetName] || CAMERA_PRESETS.medium;
    const progress = clamp(beatDur > 0 ? localT / beatDur : 0, 0, 1);

    let pos = [...(cfg.pos || base.pos)];
    let target = [...(cfg.target || base.target)];
    const fov = cfg.fov ?? base.fov;

    if (presetName === 'orbit' && !cfg.pos) {
      const radius = cfg.radius ?? base.radius;
      const a0 = cfg.angleStart ?? base.angleStart;
      const a1 = cfg.angleEnd ?? base.angleEnd;
      const angle = lerp(a0, a1, getEase(cfg.ease || 'ease_in_out')(progress));
      const height = cfg.height ?? base.height;
      pos = [
        target[0] + Math.sin(angle) * radius,
        height,
        target[2] + Math.cos(angle) * radius
      ];
    }

    if (Array.isArray(cfg.offset)) {
      pos[0] += cfg.offset[0] || 0;
      pos[1] += cfg.offset[1] || 0;
      pos[2] += cfg.offset[2] || 0;
    }

    // Subtle deterministic breathing sway
    const sway = cfg.sway || base.sway || [0, 0];
    pos[0] += Math.sin(globalT * 0.9) * sway[0];
    pos[1] += Math.cos(globalT * 0.7) * sway[1];

    return { pos, target, fov };
  }

  function updateCamera(beat, prevBeat, t) {
    const t0 = beat?.t0 ?? 0;
    const t1 = beat?.t1 ?? (t0 + 2);
    const localT = t - t0;
    const beatDur = Math.max(0.01, t1 - t0);

    const curr = resolveCameraState(beat?.camera, localT, beatDur, t);
    const camCfg = typeof beat?.camera === 'object' ? beat.camera : {};
    const transition = camCfg.transition ?? (prevBeat ? 0.55 : 0);

    if (prevBeat && transition > 0 && localT < transition) {
      const prevDur = Math.max(0.01, (prevBeat.t1 ?? t0) - (prevBeat.t0 ?? 0));
      const prev = resolveCameraState(prevBeat.camera, prevDur, prevDur, t0);
      const alpha = getEase(camCfg.ease || 'ease_out')(clamp(localT / transition, 0, 1));
      cam.position.set(
        lerp(prev.pos[0], curr.pos[0], alpha),
        lerp(prev.pos[1], curr.pos[1], alpha),
        lerp(prev.pos[2], curr.pos[2], alpha)
      );
      const tx = lerp(prev.target[0], curr.target[0], alpha);
      const ty = lerp(prev.target[1], curr.target[1], alpha);
      const tz = lerp(prev.target[2], curr.target[2], alpha);
      cam.fov = lerp(prev.fov, curr.fov, alpha);
      cam.updateProjectionMatrix();
      cam.lookAt(tx, ty, tz);
    } else {
      cam.position.set(curr.pos[0], curr.pos[1], curr.pos[2]);
      if (cam.fov !== curr.fov) {
        cam.fov = curr.fov;
        cam.updateProjectionMatrix();
      }
      cam.lookAt(curr.target[0], curr.target[1], curr.target[2]);
    }
  }

  function updateAmbient(t) {
    for (let i = 0; i < bokehSprites.length; i++) {
      const b = bokehSprites[i];
      b.sp.position.y = b.by + Math.sin(t * b.speed + b.phase) * 0.25;
      b.sp.position.x = b.bx + Math.cos(t * b.speed * 0.7 + b.phase) * 0.18;
    }
  }

  function render() {
    renderer.render(scene, cam);
  }

  return {
    renderer,
    scene,
    cam,
    grid,
    updateCamera,
    updateAmbient,
    render
  };
}
