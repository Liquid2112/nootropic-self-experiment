/**
 * Parses caption definitions into timed word tokens.
 * Supports:
 * - String: "You spend <hl>$90 a month on <hl>THIS."
 * - Array of strings: ["You", "spend", "<hl>$90", ...]
 * - Array of objects: [{ text, hl, t0, t1 }] or [{ word, start, end, hl }]
 * - Object: { words: [...], timestamps: [...] }
 */
export function buildBeatWords(beat, globalTimestamps = null) {
  const t0 = beat.t0 ?? 0;
  const t1 = beat.t1 ?? (t0 + 2);
  const raw = beat.caption;

  if (!raw) return [];

  let items = [];
  let explicitTimes = null;

  if (typeof raw === 'string') {
    items = raw.trim().split(/\s+/).filter(Boolean);
  } else if (Array.isArray(raw)) {
    items = raw;
  } else if (typeof raw === 'object') {
    items = Array.isArray(raw.words)
      ? raw.words
      : (typeof raw.text === 'string' ? raw.text.trim().split(/\s+/).filter(Boolean) : []);
    explicitTimes = Array.isArray(raw.timestamps) ? raw.timestamps : null;
  }

  // Filter global wordTimestamps that fall within [t0 - 0.05, t1 + 0.05] if no inline timestamps exist
  const beatGlobalTs = Array.isArray(globalTimestamps)
    ? globalTimestamps.filter((w) => {
        const ws = w.t0 ?? w.start ?? 0;
        return ws >= t0 - 0.05 && ws < t1 - 0.02;
      })
    : null;

  const normalized = items.map((item, idx) => {
    let text = '';
    let hl = false;
    let wT0 = null;
    let wT1 = null;

    if (typeof item === 'string') {
      text = item;
    } else if (item && typeof item === 'object') {
      text = String(item.text ?? item.word ?? '');
      hl = Boolean(item.hl || item.highlight);
      if (item.t0 !== undefined || item.start !== undefined) {
        wT0 = Number(item.t0 ?? item.start);
      }
      if (item.t1 !== undefined || item.end !== undefined) {
        wT1 = Number(item.t1 ?? item.end);
      }
    }

    if (text.startsWith('<hl>')) {
      hl = true;
      text = text.slice(4);
    }
    if (text.endsWith('</hl>')) {
      hl = true;
      text = text.slice(0, -5);
    }

    if (explicitTimes && explicitTimes[idx]) {
      const ts = explicitTimes[idx];
      if (typeof ts === 'number') {
        wT0 = ts;
      } else if (ts && typeof ts === 'object') {
        wT0 = Number(ts.t0 ?? ts.start ?? wT0);
        if (ts.t1 !== undefined || ts.end !== undefined) {
          wT1 = Number(ts.t1 ?? ts.end);
        }
      }
    } else if (wT0 === null && beatGlobalTs && beatGlobalTs[idx]) {
      const ts = beatGlobalTs[idx];
      wT0 = Number(ts.t0 ?? ts.start);
      if (ts.t1 !== undefined || ts.end !== undefined) {
        wT1 = Number(ts.t1 ?? ts.end);
      }
    }

    return { text, hl, t0: wT0, t1: wT1 };
  });

  // Auto-space words without explicit timings across 80% of beat duration (matching prototype)
  const count = normalized.length;
  if (count === 0) return [];
  const activeDur = Math.max(0.2, (t1 - t0) * 0.8);
  const per = activeDur / count;

  return normalized.map((w, i) => {
    const start = w.t0 !== null && !Number.isNaN(w.t0) ? w.t0 : t0 + i * per;
    const end = w.t1 !== null && !Number.isNaN(w.t1) ? w.t1 : start + per;
    return { ...w, t0: start, t1: end };
  });
}

function escapeHtml(str) {
  return str
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function formatPillHtml(pillText) {
  if (!pillText) return '';
  // Allow safe <b>...</b> markup for tangerine highlights, escape everything else
  const parts = String(pillText).split(/(<b>.*?<\/b>)/gi);
  return parts
    .map((part) => {
      const match = part.match(/^<b>(.*?)<\/b>$/i);
      if (match) return `<b>${escapeHtml(match[1])}</b>`;
      return escapeHtml(part);
    })
    .join('');
}

export function renderCaptions(pillEl, capEl, beat, t) {
  if (!beat) {
    pillEl.style.display = 'none';
    capEl.innerHTML = '';
    return { speaking: false };
  }

  if (beat.pill) {
    pillEl.style.display = 'block';
    pillEl.innerHTML = formatPillHtml(beat.pill);
  } else {
    pillEl.style.display = 'none';
    pillEl.innerHTML = '';
  }

  const words = beat._words || [];
  if (words.length === 0) {
    capEl.innerHTML = '';
    return { speaking: false };
  }

  let activeIdx = -1;
  for (let i = 0; i < words.length; i++) {
    if (t >= words[i].t0) {
      activeIdx = i;
    }
  }

  const html = words
    .map((w, i) => {
      if (i > activeIdx) return '';
      const cls = [w.hl ? 'hl' : '', i === activeIdx ? 'now' : ''].filter(Boolean).join(' ');
      return `<span class="${cls}">${escapeHtml(w.text)}</span>`;
    })
    .filter(Boolean)
    .join(' ');

  capEl.innerHTML = html;

  const beatDur = (beat.t1 ?? 0) - (beat.t0 ?? 0);
  const lastEnd = words[words.length - 1].t1;
  const speakingEnd = Math.min(beat.t1 ?? lastEnd, Math.max(lastEnd + 0.12, (beat.t0 ?? 0) + beatDur * 0.85));
  const speaking = t >= (beat.t0 ?? 0) && t < speakingEnd;

  return { speaking };
}
