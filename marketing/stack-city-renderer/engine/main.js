import { createStage } from './stage.js';
import { createCharacter, updateCharacter } from './characters.js';
import { createProp } from './props.js';
import { buildBeatWords, renderCaptions } from './captions.js';
import { clamp, lerp, easeOutCubic } from './rng.js';

const canvas = document.getElementById('c');
const pillEl = document.getElementById('pill');
const capEl = document.getElementById('cap');

const stage = createStage(canvas);

let currentEpisode = null;
const castRegistry = new Map();
const propRegistry = new Map();
let deskProp = null;

function clearSceneEntities() {
  for (const rig of castRegistry.values()) {
    stage.scene.remove(rig.root);
  }
  castRegistry.clear();

  for (const prop of propRegistry.values()) {
    stage.scene.remove(prop.root);
  }
  propRegistry.clear();

  if (deskProp) {
    stage.scene.remove(deskProp.root);
    deskProp = null;
  }
}

function normalizeCastEntry(entry, idx) {
  if (typeof entry === 'string') {
    return { id: entry, type: entry };
  }
  const id = entry.id || entry.character || entry.type || `char_${idx}`;
  const type = entry.type || entry.character || id;
  return { ...entry, id, type };
}

function normalizePropEntry(entry, idx) {
  const id = entry.id || `${entry.type}_${idx}`;
  return { ...entry, id };
}

function interpolateVec3(a, b, alpha) {
  return [
    lerp(a[0] ?? 0, b[0] ?? 0, alpha),
    lerp(a[1] ?? 0, b[1] ?? 0, alpha),
    lerp(a[2] ?? 0, b[2] ?? 0, alpha)
  ];
}

function getCastMapForBeat(beat) {
  const map = new Map();
  const list = Array.isArray(beat?.cast) ? beat.cast : [];
  list.forEach((raw, idx) => {
    const entry = normalizeCastEntry(raw, idx);
    map.set(entry.id, entry);
  });
  return map;
}

function ensureCharacter(id, type) {
  if (!castRegistry.has(id)) {
    const rig = createCharacter(type, id);
    stage.scene.add(rig.root);
    castRegistry.set(id, rig);
  }
  return castRegistry.get(id);
}

function ensureProp(spec) {
  if (!propRegistry.has(spec.id)) {
    const prop = createProp(spec.type, spec);
    stage.scene.add(prop.root);
    propRegistry.set(spec.id, prop);
  }
  return propRegistry.get(spec.id);
}

async function resolveWordTimestamps(ep) {
  if (Array.isArray(ep.wordTimestamps)) return ep.wordTimestamps;
  if (typeof ep.wordTimestamps === 'string') {
    const res = await fetch(ep.wordTimestamps);
    if (!res.ok) throw new Error(`Failed to fetch wordTimestamps: ${ep.wordTimestamps}`);
    return await res.json();
  }
  return null;
}

window.loadEpisode = async function loadEpisode(episodeData) {
  clearSceneEntities();

  const ep = structuredClone(episodeData);
  const globalTs = await resolveWordTimestamps(ep);

  ep.beats = (ep.beats || []).map((b) => ({
    ...b,
    _words: buildBeatWords(b, globalTs),
    _castMap: getCastMapForBeat(b),
    _props: (b.props || []).map(normalizePropEntry)
  }));

  // Pre-build cast and props across all beats + top-level definitions
  (ep.cast || []).forEach((raw, idx) => {
    const c = normalizeCastEntry(raw, idx);
    ensureCharacter(c.id, c.type);
  });
  ep.beats.forEach((b) => {
    for (const c of b._castMap.values()) {
      ensureCharacter(c.id, c.type);
    }
    b._props.forEach((p) => ensureProp(p));
  });
  (ep.props || []).forEach((raw, idx) => {
    ensureProp(normalizePropEntry(raw, idx));
  });

  if (ep.desk !== false) {
    deskProp = createProp('desk', typeof ep.desk === 'object' ? ep.desk : {});
    stage.scene.add(deskProp.root);
  }

  currentEpisode = ep;
  window.renderAt(0);
  window.READY = true;
};

function findBeatAt(t) {
  const beats = currentEpisode?.beats || [];
  if (beats.length === 0) return { beat: null, prevBeat: null, idx: -1 };
  for (let i = 0; i < beats.length; i++) {
    const b = beats[i];
    if (t >= b.t0 && t < b.t1) {
      return { beat: b, prevBeat: i > 0 ? beats[i - 1] : null, idx: i };
    }
  }
  const lastIdx = beats.length - 1;
  if (t >= beats[lastIdx].t1) {
    return { beat: beats[lastIdx], prevBeat: lastIdx > 0 ? beats[lastIdx - 1] : null, idx: lastIdx };
  }
  return { beat: beats[0], prevBeat: null, idx: 0 };
}

window.renderAt = function renderAt(t) {
  if (!currentEpisode) return;

  const { beat, prevBeat } = findBeatAt(t);
  const beatT0 = beat?.t0 ?? 0;
  const beatT1 = beat?.t1 ?? (beatT0 + 2);
  const localT = Math.max(0, t - beatT0);
  const beatDur = Math.max(0.01, beatT1 - beatT0);

  // 1. Captions & Pill
  const { speaking } = renderCaptions(pillEl, capEl, beat, t);

  // 2. Ambient bokeh
  stage.updateAmbient(t);

  // 3. Desk
  if (deskProp) {
    const deskCfg = beat?.desk === false ? null : (typeof beat?.desk === 'object' ? beat.desk : currentEpisode.desk);
    deskProp.root.visible = beat?.desk !== false && currentEpisode.desk !== false;
    if (deskProp.root.visible) {
      deskProp.update(t, localT, beatDur, typeof deskCfg === 'object' ? deskCfg : {});
    }
  }

  // 4. Cast update with smooth beat-to-beat interpolation
  const activeCastMap = beat?._castMap || new Map();
  const prevCastMap = prevBeat?._castMap || new Map();

  for (const [id, rig] of castRegistry.entries()) {
    const curState = activeCastMap.get(id);
    if (!curState) {
      rig.root.visible = false;
      continue;
    }

    const prevState = prevCastMap.get(id);
    const trans = curState.transition ?? 0.55;
    let interpState = { ...curState };

    if (prevState && trans > 0 && localT < trans) {
      const alpha = easeOutCubic(clamp(localT / trans, 0, 1));
      const pPos = prevState.pos || [0, 0, 0];
      const cPos = curState.pos || [0, 0, 0];
      interpState.pos = interpolateVec3(pPos, cPos, alpha);
      interpState.rotY = lerp(prevState.rotY ?? 0, curState.rotY ?? 0, alpha);
      if (typeof prevState.scale === 'number' || typeof curState.scale === 'number') {
        interpState.scale = lerp(prevState.scale ?? 1, curState.scale ?? 1, alpha);
      }
    }

    // Auto-drive mouth when caption is active unless explicitly disabled
    if (curState.speaking === undefined) {
      const hasExplicitSilent = curState.action === 'silent' || (Array.isArray(curState.actions) && curState.actions.includes('silent'));
      const isSpeaker = curState.speaker === true || curState.action === 'talk' || (Array.isArray(curState.actions) && curState.actions.includes('talk')) || activeCastMap.size === 1;
      interpState.speaking = !hasExplicitSilent && isSpeaker && speaking;
    }

    updateCharacter(rig, t, localT, interpState);
  }

  // 5. Props update
  const activeProps = new Map();

  // Global timed props
  (currentEpisode.props || []).forEach((raw, idx) => {
    const p = normalizePropEntry(raw, idx);
    const pt0 = p.t0 ?? 0;
    const pt1 = p.t1 ?? currentEpisode.duration ?? 999;
    if (t >= pt0 && t < pt1) {
      activeProps.set(p.id, { spec: p, pt0, pt1 });
    }
  });

  // Beat-level props override / activate
  (beat?._props || []).forEach((p) => {
    const pt0 = p.t0 ?? beatT0;
    const pt1 = p.t1 ?? beatT1;
    if (t >= pt0 && t <= pt1 + 0.001) {
      activeProps.set(p.id, { spec: p, pt0, pt1 });
    }
  });

  for (const [id, prop] of propRegistry.entries()) {
    const active = activeProps.get(id);
    if (!active) {
      prop.root.visible = false;
      continue;
    }
    prop.root.visible = active.spec.visible !== false;
    if (prop.root.visible) {
      const propLocalT = Math.max(0, t - active.pt0);
      const propDur = Math.max(0.01, active.pt1 - active.pt0);
      prop.update(t, propLocalT, propDur, active.spec);
    }
  }

  // 6. Camera
  stage.updateCamera(beat, prevBeat, t);

  // 7. Render frame
  stage.render();
};

// Auto-load episode from ?episode=... query param when opened directly or by render.js
(async function boot() {
  const params = new URLSearchParams(window.location.search);
  const epPath = params.get('episode');
  if (epPath) {
    try {
      const res = await fetch(epPath);
      if (!res.ok) throw new Error(`HTTP ${res.status} loading ${epPath}`);
      const ep = await res.json();
      await window.loadEpisode(ep);
    } catch (err) {
      console.error('Failed to boot episode:', err);
      window.LOAD_ERROR = err.message;
    }
  }
})();
