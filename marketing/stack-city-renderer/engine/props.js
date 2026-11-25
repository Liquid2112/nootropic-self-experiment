import * as THREE from 'three';
import { BRAND, mulberry32, clamp, lerp, easeOutCubic, easeOutBack, hashString } from './rng.js';

const M = (color, opts = {}) =>
  new THREE.MeshStandardMaterial({
    color,
    roughness: 0.72,
    flatShading: true,
    ...opts
  });

function makeCanvasPlane(widthPx, heightPx, width3D, height3D) {
  const cv = document.createElement('canvas');
  cv.width = widthPx;
  cv.height = heightPx;
  const ctx = cv.getContext('2d');
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, fog: false });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width3D, height3D), mat);
  return { cv, ctx, tex, mesh };
}

// ---- 1. Desk ----
function createDeskProp() {
  const g = new THREE.Group();
  const top = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.25, 1.7), M(0x2a2350));
  g.add(top);
  const trim = new THREE.Mesh(new THREE.BoxGeometry(4.44, 0.05, 1.74), M(0x43387a));
  trim.position.y = 0.11;
  g.add(trim);
  return {
    root: g,
    update(t, localT, beatDur, cfg = {}) {
      const pos = cfg.pos || [0, -2.05, 1.1];
      g.position.set(pos[0], pos[1], pos[2]);
      g.scale.setScalar(cfg.scale ?? 1);
    }
  };
}

// ---- 2. Supplement Jars (slam-in + glow/poof-to-coins) ----
function createJarsProp(cfg = {}) {
  const g = new THREE.Group();
  const count = cfg.count ?? 5;
  const defaultCols = [BRAND.MINT, BRAND.GOLD, BRAND.BLUE, BRAND.PINK, 0xffffff];
  const colors = cfg.colors || defaultCols;
  const spacing = cfg.spacing ?? 0.68;
  const startX = -((count - 1) * spacing) / 2;

  const jars = [];
  for (let i = 0; i < count; i++) {
    const jg = new THREE.Group();
    const col = colors[i % colors.length];
    const bodyMat = M(col);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.8, 8), bodyMat);
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.18, 8), M(BRAND.INK));
    lid.position.y = 0.48;
    const lab = new THREE.Mesh(new THREE.CylinderGeometry(0.326, 0.326, 0.36, 8), M(BRAND.PAPER));
    const glowRing = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.42, 0.06, 12),
      new THREE.MeshBasicMaterial({ color: BRAND.MINT, transparent: true, opacity: 0, fog: false })
    );
    glowRing.position.y = -0.38;
    jg.add(body, lid, lab, glowRing);
    g.add(jg);
    jars.push({ g: jg, bodyMat, glowRing, x: startX + i * spacing, delay: i * (cfg.slamStep ?? 0.09) });
  }

  // Optional poof coin particles for split_win
  const coinMat = M(BRAND.GOLD, { emissive: 0x553800 });
  const coinGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.05, 8);
  const poofCoins = [];
  const rnd = mulberry32(hashString(cfg.id || 'jars') + 99);
  for (let i = 0; i < count * 8; i++) {
    const c = new THREE.Mesh(coinGeo, coinMat);
    c.visible = false;
    g.add(c);
    poofCoins.push({
      mesh: c,
      jarIdx: i % count,
      vx: (rnd() - 0.5) * 2.6,
      vy: 2.2 + rnd() * 3.0,
      vz: (rnd() - 0.5) * 2.0,
      rx: (rnd() - 0.5) * 10,
      ry: (rnd() - 0.5) * 10
    });
  }

  return {
    root: g,
    update(t, localT, beatDur, beatCfg = {}) {
      const anim = beatCfg.anim || 'slam';
      const basePos = beatCfg.pos || [0, 0, 1.35];
      const keepSet = new Set(beatCfg.keepIndices || []);
      const cutSet = new Set(beatCfg.cutIndices || []);
      const poofAt = beatCfg.poofAt ?? 0.75;

      g.position.set(basePos[0], basePos[1], basePos[2]);
      g.scale.setScalar(beatCfg.scale ?? 1);

      jars.forEach((j, idx) => {
        j.g.visible = true;
        j.glowRing.material.opacity = 0;
        j.bodyMat.emissive.setHex(0x000000);

        if (anim === 'slam') {
          const p = easeOutBack((localT - (beatCfg.slamDelay ?? 0.1) - j.delay) / 0.35);
          j.g.position.set(j.x, lerp(6, -1.5, p), 0);
          j.g.rotation.set(0, 0, (1 - p) * 0.6);
          j.g.scale.setScalar(1);
        } else if (anim === 'split_win') {
          j.g.position.set(j.x, -1.5, 0);
          j.g.rotation.set(0, 0, 0);

          if (keepSet.has(idx)) {
            const p = easeOutCubic(clamp(localT / 0.6, 0, 1));
            const pulse = 0.5 + 0.5 * Math.sin(t * 7);
            j.g.position.y = lerp(-1.5, -1.32, p) + Math.sin(t * 4 + idx) * 0.04;
            j.g.position.z = lerp(0, 0.3, p);
            j.g.scale.setScalar(lerp(1, 1.15, p));
            j.bodyMat.emissive.setHex(0x1b5e36);
            j.glowRing.material.opacity = 0.45 + pulse * 0.4;
          } else if (cutSet.has(idx)) {
            const poofT = localT - poofAt;
            if (poofT < 0) {
              const shake = localT > poofAt - 0.35 ? Math.sin(t * 45) * 0.05 : 0;
              j.g.position.x = j.x + shake;
              j.g.scale.setScalar(1);
            } else if (poofT < 0.2) {
              const s = 1 - easeOutCubic(poofT / 0.2);
              j.g.scale.setScalar(Math.max(0.01, s));
              j.g.position.y = -1.5 + poofT * 1.5;
            } else {
              j.g.visible = false;
            }
          }
        } else {
          j.g.position.set(j.x, -1.5, 0);
          j.g.rotation.set(0, 0, 0);
          j.g.scale.setScalar(1);
        }
      });

      // Animate poof coins if split_win
      poofCoins.forEach((c) => {
        if (anim === 'split_win' && cutSet.has(c.jarIdx) && localT >= poofAt) {
          const dt = localT - poofAt;
          if (dt < 2.5) {
            c.mesh.visible = true;
            const jx = jars[c.jarIdx].x;
            c.mesh.position.set(
              jx + c.vx * dt,
              -1.35 + c.vy * dt - 4.9 * dt * dt,
              c.vz * dt
            );
            c.mesh.rotation.set(Math.PI / 2 + c.rx * dt, c.ry * dt, 0);
            const fade = dt > 1.8 ? clamp(1 - (dt - 1.8) / 0.7, 0.01, 1) : 1;
            c.mesh.scale.setScalar(fade);
          } else {
            c.mesh.visible = false;
          }
        } else {
          c.mesh.visible = false;
        }
      });
    }
  };
}

// ---- 3. Mugs (Cup Shuffle) ----
function createMugsProp(cfg = {}) {
  const g = new THREE.Group();
  const cols = cfg.colors || [BRAND.TANG, BRAND.LIL];
  const mugs = cols.map((c) => {
    const mg = new THREE.Group();
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.36, 0.92, 10), M(c));
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.47, 0.47, 0.08, 10), M(BRAND.PAPER));
    rim.position.y = 0.44;
    const coffee = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.04, 10), M(0x2a1810));
    coffee.position.y = 0.45;
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.45, 0.12), M(c));
    handle.position.set(0.48, 0.04, 0);
    mg.add(cup, rim, coffee, handle);
    g.add(mg);
    return mg;
  });

  // Hidden pill token under mug 0
  const pillToken = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.12, 8), M(BRAND.MINT, { emissive: 0x164a2a }));
  g.add(pillToken);

  return {
    root: g,
    update(t, localT, beatDur, beatCfg = {}) {
      const pos = beatCfg.pos || [0, -1.45, 1.3];
      g.position.set(pos[0], pos[1], pos[2]);
      g.scale.setScalar(beatCfg.scale ?? 1);

      const swaps = beatCfg.swaps ?? 4;
      const shuffleDur = beatCfg.shuffleDur ?? Math.max(0.8, beatDur * 0.7);
      const u = clamp(localT / shuffleDur, 0, 1);
      const theta = u * swaps * Math.PI;
      const rx = beatCfg.spread ?? 0.95;
      const rz = 0.55;

      mugs[0].position.set(-Math.cos(theta) * rx, 0, Math.sin(theta) * rz);
      mugs[1].position.set(Math.cos(theta) * rx, 0, -Math.sin(theta) * rz);

      // Reveal lift at end
      const revealAt = beatCfg.revealAt ?? shuffleDur + 0.15;
      const lift = localT > revealAt ? easeOutBack(clamp((localT - revealAt) / 0.4, 0, 1)) * 0.85 : 0;
      mugs[0].position.y = lift;
      pillToken.position.set(mugs[0].position.x, -0.38, mugs[0].position.z);
      pillToken.visible = lift > 0.05;
    }
  };
}

// ---- 4. Phone Card ----
function createPhoneCardProp(cfg = {}) {
  const g = new THREE.Group();
  const bezel = new THREE.Mesh(new THREE.BoxGeometry(2.02, 3.38, 0.14), M(BRAND.INK));
  g.add(bezel);

  const { ctx, tex, mesh } = makeCanvasPlane(480, 820, 1.86, 3.18);
  mesh.position.z = 0.08;
  g.add(mesh);

  function draw(beatCfg) {
    ctx.clearRect(0, 0, 480, 820);
    ctx.fillStyle = '#14121c';
    ctx.beginPath();
    ctx.roundRect(0, 0, 480, 820, 42);
    ctx.fill();

    // Notch
    ctx.fillStyle = '#07060b';
    ctx.beginPath();
    ctx.roundRect(160, 18, 160, 28, 14);
    ctx.fill();

    ctx.fillStyle = '#B7A6FF';
    ctx.font = '800 24px Inter, sans-serif';
    ctx.fillText(beatCfg.kicker || 'PLACEBO APP', 36, 94);

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 38px Inter, sans-serif';
    ctx.fillText(beatCfg.title || 'Morning Check-In', 36, 146);

    const rows = beatCfg.rows || [
      { label: 'Focus Score', value: '84 / 100', color: '#FF5A36' },
      { label: 'Reaction', value: '264 ms', color: '#B7A6FF' },
      { label: 'Day', value: '14 of 21', color: '#2fbf71' }
    ];

    rows.forEach((row, idx) => {
      const y = 200 + idx * 145;
      ctx.fillStyle = '#201c2e';
      ctx.beginPath();
      ctx.roundRect(36, y, 408, 118, 22);
      ctx.fill();

      ctx.fillStyle = '#9791b2';
      ctx.font = '700 22px Inter, sans-serif';
      ctx.fillText(row.label, 60, y + 44);

      ctx.fillStyle = row.color || '#ffffff';
      ctx.font = '900 38px Inter, sans-serif';
      ctx.fillText(row.value, 60, y + 92);
    });

    tex.needsUpdate = true;
  }

  let drawnKey = '';
  return {
    root: g,
    update(t, localT, beatDur, beatCfg = {}) {
      const key = JSON.stringify([beatCfg.kicker, beatCfg.title, beatCfg.rows]);
      if (key !== drawnKey) {
        draw(beatCfg);
        drawnKey = key;
      }
      const p = easeOutBack(clamp(localT / 0.5, 0, 1));
      const targetPos = beatCfg.pos || [0.7, 0.45, 1.8];
      g.position.set(lerp(5.5, targetPos[0], p), targetPos[1] + Math.sin(t * 2) * 0.04, targetPos[2]);
      g.rotation.y = lerp(-1.1, beatCfg.rotY ?? -0.15, p);
      g.scale.setScalar(lerp(0.4, beatCfg.scale ?? 0.85, p));
    }
  };
}

// ---- 5. Calendar Card (days flip to tang/lilac then grey "BLINDED") ----
function createCalendarCardProp(cfg = {}) {
  const g = new THREE.Group();
  const { ctx, tex, mesh } = makeCanvasPlane(640, 500, 3.2, 2.5);
  g.add(mesh);

  const days = cfg.days ?? 21;
  const rnd = mulberry32(hashString(cfg.id || 'calendar') + 17);
  const dayAssignments = Array.from({ length: days }, () => (rnd() > 0.5 ? 'ON' : 'OFF'));

  let lastStateKey = '';

  function draw(flippedCount, blindProgress, beatCfg) {
    ctx.clearRect(0, 0, 640, 500);
    ctx.fillStyle = '#14121c';
    ctx.beginPath();
    ctx.roundRect(0, 0, 640, 500, 36);
    ctx.fill();
    ctx.strokeStyle = '#2c2840';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.fillStyle = '#8e88a8';
    ctx.font = '800 22px Inter, sans-serif';
    ctx.fillText(beatCfg.kicker || '21-DAY BLINDED SCHEDULE', 38, 56);

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 34px Inter, sans-serif';
    ctx.fillText(
      blindProgress > 0.2 ? (beatCfg.blindTitle || 'Days randomized & hidden') : (beatCfg.title || 'Shuffling ON / OFF days...'),
      38,
      102
    );

    const cols = 7;
    const cellW = 72;
    const cellH = 72;
    const gap = 10;
    const startX = 38;
    const startY = 132;

    for (let i = 0; i < days; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * (cellW + gap);
      const y = startY + row * (cellH + gap);
      const isFlipped = i < flippedCount;
      const isBlinded = blindProgress > 0.15 && i < Math.floor(blindProgress * (days + 4));

      let bg = '#231f33';
      let fg = '#8e88a8';
      let sub = '';

      if (isBlinded) {
        bg = '#2d2b3b';
        fg = '#9894aa';
        sub = '?';
      } else if (isFlipped) {
        const isOn = dayAssignments[i] === 'ON';
        bg = isOn ? '#FF5A36' : '#B7A6FF';
        fg = '#15131C';
        sub = isOn ? 'ON' : 'OFF';
      }

      ctx.fillStyle = bg;
      ctx.beginPath();
      ctx.roundRect(x, y, cellW, cellH, 14);
      ctx.fill();

      ctx.fillStyle = fg;
      ctx.font = '900 20px Inter, sans-serif';
      ctx.fillText(String(i + 1), x + 12, y + 28);

      if (sub) {
        ctx.font = '900 18px Inter, sans-serif';
        ctx.fillText(sub, x + 12, y + 56);
      }
    }

    // Bottom pill / BLINDED badge
    if (blindProgress > 0.25) {
      const alpha = clamp((blindProgress - 0.25) / 0.35, 0, 1);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#2d2b3b';
      ctx.beginPath();
      ctx.roundRect(38, 392, 564, 72, 18);
      ctx.fill();
      ctx.strokeStyle = '#B7A6FF';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 26px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(beatCfg.blindBadge || "BLINDED · YOU DON'T KNOW WHICH", 320, 437);
      ctx.textAlign = 'left';
      ctx.restore();
    } else {
      ctx.fillStyle = '#FF5A36';
      ctx.beginPath();
      ctx.roundRect(38, 404, 18, 18, 5);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = '800 22px Inter, sans-serif';
      ctx.fillText('ON (Active)', 66, 421);

      ctx.fillStyle = '#B7A6FF';
      ctx.beginPath();
      ctx.roundRect(230, 404, 18, 18, 5);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillText('OFF (Placebo)', 258, 421);
    }

    tex.needsUpdate = true;
  }

  return {
    root: g,
    update(t, localT, beatDur, beatCfg = {}) {
      const flipStart = beatCfg.flipStart ?? 0.35;
      const flipEnd = beatCfg.flipEnd ?? 2.3;
      const blindStart = beatCfg.blindStart ?? 2.6;
      const blindEnd = beatCfg.blindEnd ?? 3.8;

      const flipFrac = clamp((localT - flipStart) / Math.max(0.1, flipEnd - flipStart), 0, 1);
      const flippedCount = Math.floor(flipFrac * days);
      const blindProgress = clamp((localT - blindStart) / Math.max(0.1, blindEnd - blindStart), 0, 1);

      const stateKey = `${flippedCount}|${Math.round(blindProgress * 30)}|${beatCfg.title || ''}`;
      if (stateKey !== lastStateKey) {
        draw(flippedCount, blindProgress, beatCfg);
        lastStateKey = stateKey;
      }

      const p = easeOutBack(clamp(localT / 0.55, 0, 1));
      const targetPos = beatCfg.pos || [0.35, 1.1, 2.1];
      g.position.set(lerp(6, targetPos[0], p), targetPos[1] + Math.sin(t * 2.2) * 0.03, targetPos[2]);
      g.rotation.y = lerp(-1.1, beatCfg.rotY ?? -0.1, p);
      g.scale.setScalar(lerp(0.4, beatCfg.scale ?? 0.82, p));
    }
  };
}

// ---- 6. Reaction Button + ms Counter ----
function createReactionButtonProp(cfg = {}) {
  const g = new THREE.Group();

  // Base pad
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.05, 0.24, 12), M(BRAND.INK));
  g.add(pad);

  const rim = new THREE.Mesh(
    new THREE.CylinderGeometry(0.86, 0.86, 0.1, 12),
    M(BRAND.LIL, { emissive: 0x3b2d7a })
  );
  rim.position.y = 0.14;
  g.add(rim);

  const btnMat = M(BRAND.TANG, { emissive: 0xaa280a });
  const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.76, 0.26, 12), btnMat);
  btn.position.y = 0.28;
  g.add(btn);

  // Floating ms readout card
  const { ctx, tex, mesh: readout } = makeCanvasPlane(460, 220, 2.0, 0.96);
  readout.position.set(-0.08, 1.88, 0.1);
  g.add(readout);

  let lastMsKey = '';
  function drawCounter(msVal, pressed, beatCfg) {
    ctx.clearRect(0, 0, 460, 220);
    ctx.fillStyle = '#14121c';
    ctx.beginPath();
    ctx.roundRect(0, 0, 460, 220, 30);
    ctx.fill();
    ctx.strokeStyle = pressed ? '#FF5A36' : '#B7A6FF';
    ctx.lineWidth = 5;
    ctx.stroke();

    ctx.fillStyle = '#9b95b8';
    ctx.font = '800 24px Inter, sans-serif';
    ctx.fillText(beatCfg.label || 'REACTION TEST · 60s', 34, 54);

    ctx.fillStyle = pressed ? '#FF5A36' : '#ffffff';
    ctx.font = '900 84px Inter, sans-serif';
    ctx.fillText(`${msVal} ms`, 34, 158);
    tex.needsUpdate = true;
  }

  return {
    root: g,
    update(t, localT, beatDur, beatCfg = {}) {
      const tapTimes = beatCfg.tapTimes || [1.1, 2.3, 3.5];
      const msValues = beatCfg.msValues || [284, 268, 259];

      let pressedAmt = 0;
      let displayMs = beatCfg.startMs ?? 312;

      for (let i = 0; i < tapTimes.length; i++) {
        const dt = localT - tapTimes[i];
        if (dt >= 0) {
          if (dt < 0.22) {
            pressedAmt = Math.max(pressedAmt, Math.sin((dt / 0.22) * Math.PI));
          }
          const settle = clamp(dt / 0.35, 0, 1);
          const prev = i === 0 ? (beatCfg.startMs ?? 312) : msValues[i - 1];
          displayMs = Math.round(lerp(prev, msValues[i % msValues.length], easeOutCubic(settle)));
        }
      }

      btn.position.y = 0.28 - pressedAmt * 0.12;
      const glowPulse = 0.4 + 0.4 * Math.sin(t * 8) + pressedAmt * 0.9;
      btnMat.emissive.setRGB(
        clamp(0.65 * glowPulse, 0, 1),
        clamp(0.18 * glowPulse, 0, 1),
        clamp(0.06 * glowPulse, 0, 1)
      );

      const key = `${displayMs}|${pressedAmt > 0.2 ? 1 : 0}|${beatCfg.label || ''}`;
      if (key !== lastMsKey) {
        drawCounter(displayMs, pressedAmt > 0.2, beatCfg);
        lastMsKey = key;
      }

      const p = easeOutBack(clamp(localT / 0.45, 0, 1));
      const pos = beatCfg.pos || [0.65, -1.65, 1.55];
      g.position.set(pos[0], lerp(-3.5, pos[1], p), pos[2]);
      g.rotation.y = beatCfg.rotY ?? -0.18;
      g.scale.setScalar(beatCfg.scale ?? 0.9);
    }
  };
}

// ---- 7. Verdict Card (ON vs OFF bars + KEEP IT stamp, values from JSON) ----
function createVerdictCardProp() {
  const g = new THREE.Group();
  const { ctx, tex, mesh } = makeCanvasPlane(640, 440, 3.2, 2.2);
  g.add(mesh);

  let lastKey = '';

  function draw(barProg, stampProg, beatCfg) {
    const onVal = beatCfg.onMs ?? 271;
    const offVal = beatCfg.offMs ?? 298;
    const maxMs = Math.max(onVal, offVal, 320);
    // Lower ms is faster/better, or explicit bar widths; match prototype visual proportions
    const onW = beatCfg.onBarWidth ?? Math.round(clamp(440 * (onVal / maxMs) * 0.95, 120, 420));
    const offW = beatCfg.offBarWidth ?? Math.round(clamp(440 * (offVal / maxMs) * 0.95, 120, 420));

    ctx.clearRect(0, 0, 640, 440);
    ctx.fillStyle = '#14121c';
    ctx.beginPath();
    ctx.roundRect(0, 0, 640, 440, 36);
    ctx.fill();
    ctx.strokeStyle = '#2c2840';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.fillStyle = '#8e88a8';
    ctx.font = '800 26px Inter, sans-serif';
    ctx.fillText(beatCfg.kicker || 'DAY 21 · BLIND TEST RESULT', 40, 64);

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 46px Inter, sans-serif';
    ctx.fillText(beatCfg.title || 'Your morning stack', 40, 124);

    const drawBar = (y, label, fullW, color, valText) => {
      const curW = Math.max(24, Math.round(fullW * barProg));
      ctx.fillStyle = '#8e88a8';
      ctx.font = '800 24px Inter, sans-serif';
      ctx.fillText(label, 40, y + 28);

      ctx.fillStyle = '#262236';
      ctx.beginPath();
      ctx.roundRect(150, y, 440, 40, 12);
      ctx.fill();

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(150, y, curW, 40, 12);
      ctx.fill();

      if (barProg > 0.35) {
        ctx.fillStyle = color === '#B7A6FF' ? '#15131C' : '#ffffff';
        ctx.font = '900 24px Inter, sans-serif';
        ctx.fillText(valText, 150 + Math.max(curW - 86, 12), y + 29);
      }
    };

    drawBar(170, beatCfg.onLabel || 'ON', onW, '#FF5A36', `${onVal}ms`);
    drawBar(230, beatCfg.offLabel || 'OFF', offW, '#B7A6FF', `${offVal}ms`);

    if (stampProg > 0.02) {
      ctx.save();
      const s = lerp(0.75, 1.0, stampProg);
      ctx.translate(320, 356);
      ctx.scale(s, s);
      ctx.translate(-320, -356);
      ctx.globalAlpha = clamp(stampProg, 0, 1);

      const stampColor = beatCfg.verdictColor || '#2fbf71';
      ctx.fillStyle = stampColor;
      ctx.beginPath();
      ctx.roundRect(40, 312, 560, 88, 20);
      ctx.fill();

      ctx.fillStyle = '#062a16';
      ctx.font = '900 34px Inter, sans-serif';
      ctx.textAlign = 'center';
      const stampText = beatCfg.verdictText || '✓  KEEP IT — it works for YOU';
      ctx.fillText(stampText, 320, 368);
      ctx.textAlign = 'left';
      ctx.restore();
    }

    tex.needsUpdate = true;
  }

  return {
    root: g,
    update(t, localT, beatDur, beatCfg = {}) {
      const barProg = easeOutCubic(clamp((localT - 0.15) / 0.65, 0, 1));
      const stampProg = easeOutBack(clamp((localT - 0.65) / 0.45, 0, 1));
      const key = `${Math.round(barProg * 40)}|${Math.round(stampProg * 40)}|${beatCfg.onMs}|${beatCfg.offMs}|${beatCfg.verdictText}`;
      if (key !== lastKey) {
        draw(barProg, stampProg, beatCfg);
        lastKey = key;
      }

      const cp = easeOutBack(clamp(localT / 0.6, 0, 1));
      const targetPos = beatCfg.pos || [0.25, 1.25, 2.2];
      g.position.set(lerp(6, targetPos[0], cp), targetPos[1], targetPos[2]);
      g.rotation.y = lerp(-1.2, beatCfg.rotY ?? -0.1, cp);
      g.scale.setScalar(lerp(0.4, beatCfg.scale ?? 0.82, cp));
    }
  };
}

// ---- 8. Self-Drawing Line Chart ----
function createLineChartProp() {
  const g = new THREE.Group();
  const { ctx, tex, mesh } = makeCanvasPlane(640, 440, 3.2, 2.2);
  g.add(mesh);
  let lastKey = '';

  function draw(progress, beatCfg) {
    ctx.clearRect(0, 0, 640, 440);
    ctx.fillStyle = '#14121c';
    ctx.beginPath();
    ctx.roundRect(0, 0, 640, 440, 34);
    ctx.fill();
    ctx.strokeStyle = '#2c2840';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.fillStyle = '#8e88a8';
    ctx.font = '800 22px Inter, sans-serif';
    ctx.fillText(beatCfg.kicker || '21-DAY TREND', 38, 54);
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 36px Inter, sans-serif';
    ctx.fillText(beatCfg.title || 'Reaction Speed (ms)', 38, 98);

    const plot = { x: 64, y: 132, w: 520, h: 245 };
    ctx.strokeStyle = '#28243a';
    ctx.lineWidth = 2;
    for (let i = 0; i <= 4; i++) {
      const yy = plot.y + (plot.h * i) / 4;
      ctx.beginPath();
      ctx.moveTo(plot.x, yy);
      ctx.lineTo(plot.x + plot.w, yy);
      ctx.stroke();
    }

    const seriesList = beatCfg.series || [
      { label: 'ON', color: '#FF5A36', points: [305, 295, 286, 279, 274, 268, 264] },
      { label: 'OFF', color: '#B7A6FF', points: [302, 299, 304, 296, 301, 298, 299] }
    ];

    const allPts = seriesList.flatMap((s) => s.points);
    const minV = beatCfg.minY ?? Math.min(...allPts) - 10;
    const maxV = beatCfg.maxY ?? Math.max(...allPts) + 10;

    seriesList.forEach((s, sIdx) => {
      const pts = s.points;
      const totalSegs = pts.length - 1;
      const drawFloat = progress * totalSegs;

      ctx.strokeStyle = s.color || '#FF5A36';
      ctx.lineWidth = 7;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();

      let headX = plot.x;
      let headY = plot.y + plot.h;

      for (let i = 0; i < pts.length; i++) {
        const px = plot.x + (i / totalSegs) * plot.w;
        const py = plot.y + plot.h - ((pts[i] - minV) / Math.max(1, maxV - minV)) * plot.h;
        if (i === 0) {
          ctx.moveTo(px, py);
          headX = px;
          headY = py;
        } else if (i <= drawFloat) {
          ctx.lineTo(px, py);
          headX = px;
          headY = py;
        } else if (i - 1 < drawFloat) {
          const frac = drawFloat - (i - 1);
          const prevX = plot.x + ((i - 1) / totalSegs) * plot.w;
          const prevY = plot.y + plot.h - ((pts[i - 1] - minV) / Math.max(1, maxV - minV)) * plot.h;
          headX = lerp(prevX, px, frac);
          headY = lerp(prevY, py, frac);
          ctx.lineTo(headX, headY);
        }
      }
      ctx.stroke();

      // Glowing head dot
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(headX, headY, 8, 0, Math.PI * 2);
      ctx.fill();

      // Legend
      ctx.fillStyle = s.color;
      ctx.font = '800 22px Inter, sans-serif';
      ctx.fillText(s.label, 38 + sIdx * 120, 412);
    });

    tex.needsUpdate = true;
  }

  return {
    root: g,
    update(t, localT, beatDur, beatCfg = {}) {
      const drawDur = beatCfg.drawDuration ?? Math.max(0.8, beatDur * 0.7);
      const prog = easeOutCubic(clamp((localT - 0.2) / drawDur, 0, 1));
      const key = `${Math.round(prog * 60)}|${beatCfg.title || ''}`;
      if (key !== lastKey) {
        draw(prog, beatCfg);
        lastKey = key;
      }
      const cp = easeOutBack(clamp(localT / 0.5, 0, 1));
      const targetPos = beatCfg.pos || [0.3, 1.15, 2.0];
      g.position.set(lerp(5.5, targetPos[0], cp), targetPos[1], targetPos[2]);
      g.rotation.y = lerp(-1.0, beatCfg.rotY ?? -0.1, cp);
      g.scale.setScalar(lerp(0.4, beatCfg.scale ?? 0.82, cp));
    }
  };
}

// ---- 9. Coins Burst ----
function createCoinsBurstProp(cfg = {}) {
  const g = new THREE.Group();
  const count = cfg.count ?? 24;
  const rnd = mulberry32(hashString(cfg.id || 'coins') + 31);
  const geo = new THREE.CylinderGeometry(0.2, 0.2, 0.06, 8);
  const mat = M(BRAND.GOLD, { emissive: 0x553600 });

  const coins = Array.from({ length: count }, () => {
    const mesh = new THREE.Mesh(geo, mat);
    g.add(mesh);
    return {
      mesh,
      vx: (rnd() - 0.5) * 4.8,
      vy: 2.5 + rnd() * 4.2,
      vz: (rnd() - 0.5) * 3.0,
      rx: (rnd() - 0.5) * 12,
      ry: (rnd() - 0.5) * 12,
      delay: rnd() * 0.18
    };
  });

  return {
    root: g,
    update(t, localT, beatDur, beatCfg = {}) {
      const origin = beatCfg.pos || [0, -1.1, 1.3];
      g.position.set(origin[0], origin[1], origin[2]);
      const startAt = beatCfg.startAt ?? 0;
      const elapsed = localT - startAt;

      coins.forEach((c) => {
        const dt = elapsed - c.delay;
        if (dt < 0 || dt > 2.6) {
          c.mesh.visible = false;
          return;
        }
        c.mesh.visible = true;
        c.mesh.position.set(c.vx * dt, c.vy * dt - 4.9 * dt * dt, c.vz * dt);
        c.mesh.rotation.set(Math.PI / 2 + c.rx * dt, c.ry * dt, 0);
        const s = dt > 2.0 ? clamp(1 - (dt - 2.0) / 0.6, 0.01, 1) : 1;
        c.mesh.scale.setScalar(s * (beatCfg.scale ?? 1));
      });
    }
  };
}

// ---- 10. Confetti Blocks ----
function createConfettiBlocksProp(cfg = {}) {
  const g = new THREE.Group();
  const count = cfg.count ?? 42;
  const cols = [BRAND.TANG, BRAND.LIL, BRAND.GOLD, BRAND.MINT, BRAND.BLUE];
  const rnd = mulberry32(hashString(cfg.id || 'confetti') + 55);
  const geo = new THREE.BoxGeometry(0.16, 0.08, 0.16);

  const pieces = Array.from({ length: count }, (_, i) => {
    const mesh = new THREE.Mesh(geo, M(cols[i % cols.length], { emissive: 0x111111 }));
    g.add(mesh);
    return {
      mesh,
      x0: (rnd() - 0.5) * 4.5,
      y0: 2.5 + rnd() * 2.0,
      z0: (rnd() - 0.5) * 2.5,
      vx: (rnd() - 0.5) * 1.4,
      vy: -(1.2 + rnd() * 1.6),
      rx: (rnd() - 0.5) * 8,
      ry: (rnd() - 0.5) * 8,
      rz: (rnd() - 0.5) * 8,
      phase: rnd() * Math.PI * 2
    };
  });

  return {
    root: g,
    update(t, localT, beatDur, beatCfg = {}) {
      const origin = beatCfg.pos || [0, 0.5, 1.5];
      g.position.set(origin[0], origin[1], origin[2]);
      pieces.forEach((p) => {
        p.mesh.position.set(
          p.x0 + p.vx * localT + Math.sin(t * 4 + p.phase) * 0.25,
          p.y0 + p.vy * localT,
          p.z0
        );
        p.mesh.rotation.set(p.rx * localT, p.ry * localT, p.rz * localT);
        p.mesh.visible = p.mesh.position.y > -3.5;
      });
    }
  };
}

// ---- 11. Boxing Ring ----
function createBoxingRingProp() {
  const g = new THREE.Group();
  const mat = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.25, 4.2), M(0x1f2244));
  g.add(mat);
  const apron = new THREE.Mesh(new THREE.BoxGeometry(4.35, 0.18, 4.35), M(BRAND.TANG));
  apron.position.y = -0.16;
  g.add(apron);

  const corners = [
    [-1.95, -1.95, BRAND.TANG],
    [1.95, -1.95, BRAND.LIL],
    [1.95, 1.95, BRAND.TANG],
    [-1.95, 1.95, BRAND.LIL]
  ];
  corners.forEach(([x, z, c]) => {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.45, 0.2), M(c));
    post.position.set(x, 0.72, z);
    g.add(post);
  });

  const ropeCols = [BRAND.TANG, BRAND.PAPER, BRAND.LIL];
  [0.48, 0.85, 1.22].forEach((ry, idx) => {
    const rMat = M(ropeCols[idx]);
    const h1 = new THREE.Mesh(new THREE.BoxGeometry(3.9, 0.05, 0.05), rMat);
    h1.position.set(0, ry, -1.95);
    const h2 = h1.clone();
    h2.position.z = 1.95;
    const v1 = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 3.9), rMat);
    v1.position.set(-1.95, ry, 0);
    const v2 = v1.clone();
    v2.position.x = 1.95;
    g.add(h1, h2, v1, v2);
  });

  return {
    root: g,
    update(t, localT, beatDur, beatCfg = {}) {
      const pos = beatCfg.pos || [0, -2.05, 0.2];
      g.position.set(pos[0], pos[1], pos[2]);
      g.rotation.y = beatCfg.rotY ?? 0;
      g.scale.setScalar(beatCfg.scale ?? 1);
    }
  };
}

// ---- 12. Scoreboard ----
function createScoreboardProp() {
  const g = new THREE.Group();
  const { ctx, tex, mesh } = makeCanvasPlane(640, 320, 3.2, 1.6);
  g.add(mesh);
  let lastKey = '';

  function draw(prog, beatCfg) {
    ctx.clearRect(0, 0, 640, 320);
    ctx.fillStyle = '#14121c';
    ctx.beginPath();
    ctx.roundRect(0, 0, 640, 320, 32);
    ctx.fill();
    ctx.strokeStyle = '#312c48';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.fillStyle = '#8e88a8';
    ctx.font = '800 22px Inter, sans-serif';
    ctx.fillText(beatCfg.title || 'HEAD-TO-HEAD SCOREBOARD', 36, 52);

    const lScore = Math.round((beatCfg.leftScore ?? 88) * prog);
    const rScore = Math.round((beatCfg.rightScore ?? 64) * prog);

    // Left panel
    ctx.fillStyle = '#201c2e';
    ctx.beginPath();
    ctx.roundRect(36, 78, 255, 204, 22);
    ctx.fill();
    ctx.fillStyle = beatCfg.leftColor || '#FF5A36';
    ctx.font = '800 26px Inter, sans-serif';
    ctx.fillText(beatCfg.leftName || 'ON STACK', 58, 126);
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 82px Inter, sans-serif';
    ctx.fillText(String(lScore), 58, 232);

    // Right panel
    ctx.fillStyle = '#201c2e';
    ctx.beginPath();
    ctx.roundRect(349, 78, 255, 204, 22);
    ctx.fill();
    ctx.fillStyle = beatCfg.rightColor || '#B7A6FF';
    ctx.font = '800 26px Inter, sans-serif';
    ctx.fillText(beatCfg.rightName || 'PLACEBO', 371, 126);
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 82px Inter, sans-serif';
    ctx.fillText(String(rScore), 371, 232);

    // VS badge
    ctx.fillStyle = '#0d0c12';
    ctx.beginPath();
    ctx.arc(320, 180, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 22px Inter, sans-serif';
    ctx.fillText('VS', 303, 188);

    tex.needsUpdate = true;
  }

  return {
    root: g,
    update(t, localT, beatDur, beatCfg = {}) {
      const prog = easeOutCubic(clamp(localT / 0.75, 0, 1));
      const key = `${Math.round(prog * 40)}|${beatCfg.leftScore}|${beatCfg.rightScore}`;
      if (key !== lastKey) {
        draw(prog, beatCfg);
        lastKey = key;
      }
      const p = easeOutBack(clamp(localT / 0.5, 0, 1));
      const targetPos = beatCfg.pos || [0, 1.45, 1.8];
      g.position.set(targetPos[0], lerp(4.5, targetPos[1], p), targetPos[2]);
      g.scale.setScalar(lerp(0.5, beatCfg.scale ?? 0.85, p));
    }
  };
}

// ---- 13. Poll Card ----
function createPollCardProp() {
  const g = new THREE.Group();
  const { ctx, tex, mesh } = makeCanvasPlane(640, 420, 3.2, 2.1);
  g.add(mesh);
  let lastKey = '';

  function draw(prog, beatCfg) {
    ctx.clearRect(0, 0, 640, 420);
    ctx.fillStyle = '#14121c';
    ctx.beginPath();
    ctx.roundRect(0, 0, 640, 420, 34);
    ctx.fill();
    ctx.strokeStyle = '#2c2840';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.fillStyle = '#B7A6FF';
    ctx.font = '800 22px Inter, sans-serif';
    ctx.fillText(beatCfg.kicker || 'COMMUNITY POLL', 38, 56);

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 34px Inter, sans-serif';
    ctx.fillText(beatCfg.question || 'Does your stack actually work?', 38, 102);

    const options = beatCfg.options || [
      { label: 'Feels like it works', pct: 68, color: '#FF5A36' },
      { label: 'Probably placebo', pct: 32, color: '#B7A6FF' }
    ];

    options.slice(0, 3).forEach((opt, i) => {
      const y = 136 + i * 86;
      const pct = Math.round((opt.pct ?? 50) * prog);

      ctx.fillStyle = '#231f33';
      ctx.beginPath();
      ctx.roundRect(38, y, 564, 66, 16);
      ctx.fill();

      const fillW = Math.max(20, Math.round(564 * (pct / 100)));
      ctx.fillStyle = opt.color || '#FF5A36';
      ctx.beginPath();
      ctx.roundRect(38, y, fillW, 66, 16);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 24px Inter, sans-serif';
      ctx.fillText(opt.label, 58, y + 42);
      ctx.fillText(`${pct}%`, 520, y + 42);
    });

    tex.needsUpdate = true;
  }

  return {
    root: g,
    update(t, localT, beatDur, beatCfg = {}) {
      const prog = easeOutCubic(clamp((localT - 0.15) / 0.7, 0, 1));
      const key = `${Math.round(prog * 40)}|${beatCfg.question || ''}`;
      if (key !== lastKey) {
        draw(prog, beatCfg);
        lastKey = key;
      }
      const p = easeOutBack(clamp(localT / 0.5, 0, 1));
      const targetPos = beatCfg.pos || [0.3, 1.2, 2.0];
      g.position.set(lerp(5.5, targetPos[0], p), targetPos[1], targetPos[2]);
      g.rotation.y = lerp(-1.0, beatCfg.rotY ?? -0.08, p);
      g.scale.setScalar(lerp(0.4, beatCfg.scale ?? 0.82, p));
    }
  };
}

// ---- 14. Placebo Logo Pill ----
function createLogoPillProp() {
  const g = new THREE.Group();
  const { ctx, tex, mesh } = makeCanvasPlane(560, 170, 2.8, 0.85);
  g.add(mesh);
  let lastKey = '';

  function draw(beatCfg) {
    ctx.clearRect(0, 0, 560, 170);
    ctx.fillStyle = '#0d0c12';
    ctx.beginPath();
    ctx.roundRect(6, 6, 548, 158, 79);
    ctx.fill();
    ctx.strokeStyle = '#FF5A36';
    ctx.lineWidth = 6;
    ctx.stroke();

    // Split capsule icon mark
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(36, 41, 88, 88, 28);
    ctx.clip();
    ctx.fillStyle = '#FF5A36';
    ctx.fillRect(36, 41, 44, 88);
    ctx.fillStyle = '#B7A6FF';
    ctx.fillRect(80, 41, 44, 88);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(78, 41, 4, 88);
    ctx.restore();

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 54px Inter, sans-serif';
    ctx.fillText(beatCfg.text || 'Placebo', 148, 96);

    ctx.fillStyle = '#B7A6FF';
    ctx.font = '800 22px Inter, sans-serif';
    ctx.fillText(beatCfg.subtitle || 'BLIND TEST YOUR STACK', 150, 132);

    tex.needsUpdate = true;
  }

  return {
    root: g,
    update(t, localT, beatDur, beatCfg = {}) {
      const key = `${beatCfg.text || ''}|${beatCfg.subtitle || ''}`;
      if (key !== lastKey) {
        draw(beatCfg);
        lastKey = key;
      }
      const p = easeOutBack(clamp(localT / 0.45, 0, 1));
      const pos = beatCfg.pos || [0.55, 1.35, 2.3];
      g.position.set(pos[0], pos[1] + Math.sin(t * 3) * 0.03, pos[2]);
      g.scale.setScalar(lerp(0.1, beatCfg.scale ?? 0.9, p));
    }
  };
}

const PROP_FACTORIES = {
  desk: createDeskProp,
  jars: createJarsProp,
  supplement_jars: createJarsProp,
  mugs: createMugsProp,
  cup_shuffle: createMugsProp,
  phone_card: createPhoneCardProp,
  calendar_card: createCalendarCardProp,
  reaction_button: createReactionButtonProp,
  verdict_card: createVerdictCardProp,
  line_chart: createLineChartProp,
  coins_burst: createCoinsBurstProp,
  confetti_blocks: createConfettiBlocksProp,
  boxing_ring: createBoxingRingProp,
  scoreboard: createScoreboardProp,
  poll_card: createPollCardProp,
  logo_pill: createLogoPillProp,
  brand_pill: createLogoPillProp
};

export function createProp(type, cfg = {}) {
  const fn = PROP_FACTORIES[type];
  if (!fn) {
    throw new Error(`Unknown prop type: ${type}`);
  }
  const prop = fn(cfg);
  prop.type = type;
  return prop;
}
