#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { chromium } = require('playwright');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

function parseArgs(argv) {
  const args = argv.slice(2);
  const positional = [];
  const opts = {
    fps: null,
    stills: null,
    audio: null,
    keepFrames: false,
    framesDir: null
  };

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--stills' && args[i + 1]) {
      opts.stills = args[++i].split(',').map((s) => Number(s.trim())).filter((n) => !Number.isNaN(n));
    } else if (a.startsWith('--stills=')) {
      opts.stills = a.slice('--stills='.length).split(',').map((s) => Number(s.trim())).filter((n) => !Number.isNaN(n));
    } else if (a === '--fps' && args[i + 1]) {
      opts.fps = Number(args[++i]);
    } else if (a.startsWith('--fps=')) {
      opts.fps = Number(a.slice('--fps='.length));
    } else if (a === '--audio' && args[i + 1]) {
      opts.audio = args[++i];
    } else if (a.startsWith('--audio=')) {
      opts.audio = a.slice('--audio='.length);
    } else if (a === '--keep-frames') {
      opts.keepFrames = true;
    } else if (a === '--frames-dir' && args[i + 1]) {
      opts.framesDir = args[++i];
    } else if (a === '-h' || a === '--help') {
      printHelp();
      process.exit(0);
    } else {
      positional.push(a);
    }
  }

  if (positional.length < 2) {
    printHelp();
    process.exit(1);
  }

  return { episodeArg: positional[0], outArg: positional[1], opts };
}

function printHelp() {
  console.log(`Usage:
  node render.js <episode.json> <out.mp4> [options]

Options:
  --stills t1,t2,...   Render only specific timestamps and emit a contact sheet PNG
  --fps <n>            Override FPS (default: episode.fps or 30)
  --audio <path>       Override voiceover audio path (muxed with loudnorm I=-14)
  --keep-frames        Keep intermediate PNG frames
  --frames-dir <dir>   Custom directory for PNG frames`);
}

function findFfmpeg() {
  if (process.env.FFMPEG_PATH && fs.existsSync(process.env.FFMPEG_PATH)) {
    return process.env.FFMPEG_PATH;
  }
  const probe = spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' });
  if (probe.status === 0) return 'ffmpeg';

  // Fallback check for Windows WinGet Links/Packages if shell PATH hasn't refreshed
  if (process.platform === 'win32' && process.env.LOCALAPPDATA) {
    const wingetBase = path.join(process.env.LOCALAPPDATA, 'Microsoft', 'WinGet');
    const wingetLink = path.join(wingetBase, 'Links', 'ffmpeg.exe');
    if (fs.existsSync(wingetLink)) return wingetLink;
    const pkgsDir = path.join(wingetBase, 'Packages');
    if (fs.existsSync(pkgsDir)) {
      for (const pkg of fs.readdirSync(pkgsDir)) {
        if (!pkg.startsWith('Gyan.FFmpeg')) continue;
        const pkgPath = path.join(pkgsDir, pkg);
        for (const sub of fs.readdirSync(pkgPath)) {
          const candidate = path.join(pkgPath, sub, 'bin', 'ffmpeg.exe');
          if (fs.existsSync(candidate)) return candidate;
        }
      }
    }
  }

  throw new Error('ffmpeg not found on PATH (and FFMPEG_PATH not set). Please install ffmpeg with libx264.');
}

function runFfmpeg(ffmpegBin, args) {
  const res = spawnSync(ffmpegBin, args, { stdio: 'inherit' });
  if (res.status !== 0) {
    throw new Error(`ffmpeg exited with code ${res.status}`);
  }
}

function resolveLocalAsset(rootDir, urlStr) {
  const u = new URL(urlStr);
  const reqPath = decodeURIComponent(u.pathname);
  const safeRel = path.normalize(reqPath).replace(/^(\.\.[/\\])+/, '');
  let filePath = path.join(rootDir, safeRel === '/' || safeRel === '\\' ? 'engine/scene.html' : safeRel);
  if (!filePath.startsWith(rootDir)) return { status: 403, body: 'Forbidden', contentType: 'text/plain' };
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }
  if (!fs.existsSync(filePath)) return { status: 404, body: 'Not found', contentType: 'text/plain' };
  const ext = path.extname(filePath).toLowerCase();
  return {
    status: 200,
    contentType: MIME_TYPES[ext] || 'application/octet-stream',
    body: fs.readFileSync(filePath)
  };
}

(async () => {
  const { episodeArg, outArg, opts } = parseArgs(process.argv);
  const rootDir = __dirname;
  const episodePath = path.resolve(process.cwd(), episodeArg);
  if (!fs.existsSync(episodePath)) {
    throw new Error(`Episode JSON not found: ${episodePath}`);
  }

  const episode = JSON.parse(fs.readFileSync(episodePath, 'utf8'));
  const fps = opts.fps || episode.fps || 30;
  const duration = Number(episode.duration || 10);
  const outPath = path.resolve(process.cwd(), outArg);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });

  const ffmpegBin = findFfmpeg();

  // Resolve optional voiceover path relative to episode file (or cwd)
  let audioPath = opts.audio || episode.voiceover || episode.audio || null;
  if (audioPath) {
    const relToEp = path.resolve(path.dirname(episodePath), audioPath);
    const relToRoot = path.resolve(rootDir, audioPath);
    audioPath = fs.existsSync(relToEp) ? relToEp : relToRoot;
    if (!fs.existsSync(audioPath)) {
      throw new Error(`Voiceover audio file not found: ${audioPath}`);
    }
  }

  // Resolve wordTimestamps if specified as a relative path next to episode JSON
  if (typeof episode.wordTimestamps === 'string') {
    const tsPath = path.resolve(path.dirname(episodePath), episode.wordTimestamps);
    if (fs.existsSync(tsPath)) {
      episode.wordTimestamps = JSON.parse(fs.readFileSync(tsPath, 'utf8'));
    }
  }

  const isStills = Array.isArray(opts.stills) && opts.stills.length > 0;
  const framesDir = opts.framesDir
    ? path.resolve(process.cwd(), opts.framesDir)
    : path.join(path.dirname(outPath), `_frames_${path.basename(outPath, path.extname(outPath))}`);

  fs.rmSync(framesDir, { recursive: true, force: true });
  fs.mkdirSync(framesDir, { recursive: true });

  const browser = await chromium.launch({
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
  });

  try {
    const page = await browser.newPage({
      viewport: { width: 540, height: 960 },
      deviceScaleFactor: 2
    });

    page.on('pageerror', (err) => console.error('PAGE_ERROR:', err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') console.error('PAGE_CONSOLE:', msg.text());
    });

    await page.route('http://stack-city.local/**', (route) => {
      const asset = resolveLocalAsset(rootDir, route.request().url());
      route.fulfill(asset);
    });

    const sceneUrl = 'http://stack-city.local/engine/scene.html';
    await page.goto(sceneUrl, { waitUntil: 'domcontentloaded' });
    await page.evaluate(async (ep) => {
      await window.loadEpisode(ep);
    }, episode);
    await page.waitForFunction('window.READY === true', { timeout: 20000 });
    await page.evaluate(() => document.fonts.ready);

    const timestamps = isStills
      ? opts.stills
      : Array.from({ length: Math.round(duration * fps) }, (_, i) => i / fps);

    console.log(`Rendering ${timestamps.length} ${isStills ? 'stills' : `frames (${duration}s @ ${fps}fps)`}...`);

    for (let i = 0; i < timestamps.length; i++) {
      const t = timestamps[i];
      await page.evaluate((timeSec) => window.renderAt(timeSec), t);
      const frameFile = path.join(framesDir, `f${String(i).padStart(5, '0')}.png`);
      await page.screenshot({ path: frameFile });

      if (!isStills && (i + 1) % 60 === 0) {
        console.log(`  captured ${i + 1}/${timestamps.length} frames`);
      }
    }

    if (isStills) {
      const sheetPath = outPath.toLowerCase().endsWith('.png')
        ? outPath
        : outPath.replace(/\.[^.]+$/, '') + '_stills.png';

      if (timestamps.length === 1) {
        fs.copyFileSync(path.join(framesDir, 'f00000.png'), sheetPath);
      } else {
        const cols = Math.min(4, timestamps.length);
        const rows = Math.ceil(timestamps.length / cols);
        runFfmpeg(ffmpegBin, [
          '-y',
          '-i', path.join(framesDir, 'f%05d.png'),
          '-vf', `scale=540:960,tile=${cols}x${rows}:padding=8:color=#0d0c12`,
          '-frames:v', '1',
          '-update', '1',
          sheetPath
        ]);
      }
      console.log(`Stills contact sheet written to: ${sheetPath}`);
    } else {
      const ffArgs = [
        '-y',
        '-framerate', String(fps),
        '-i', path.join(framesDir, 'f%05d.png')
      ];

      if (audioPath) {
        ffArgs.push('-i', audioPath);
      }

      ffArgs.push(
        '-c:v', 'libx264',
        '-crf', '19',
        '-pix_fmt', 'yuv420p',
        '-r', String(fps)
      );

      if (audioPath) {
        ffArgs.push(
          '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11',
          '-c:a', 'aac',
          '-b:a', '192k',
          '-shortest'
        );
      }

      ffArgs.push('-movflags', '+faststart', outPath);
      runFfmpeg(ffmpegBin, ffArgs);
      console.log(`Video written to: ${outPath}`);
    }
  } finally {
    await browser.close();
    if (!opts.keepFrames && !opts.framesDir) {
      fs.rmSync(framesDir, { recursive: true, force: true });
    }
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
