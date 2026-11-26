/**
 * DEV ONLY standalone web entry (never imported by the app). Bundled on its
 * own by Metro and loaded on a blank same-origin page by
 * scripts/screenshots.mjs to write demo data into the web (OPFS) database
 * before the app is opened.
 */
import { getDatabase } from '@/db';
import { seedCompletedDemo, seedDemoData } from './seed';

type SeedWindow = { __SEED_RESULT__?: string };
const w = window as unknown as SeedWindow;

function run(): void {
  const db = getDatabase();
  const scenario = new URLSearchParams(window.location.search).get('scenario');
  if (scenario === 'completed') seedCompletedDemo(db);
  else seedDemoData(db);
  const count = db.get('SELECT COUNT(*) AS c FROM test_session');
  w.__SEED_RESULT__ = `ok sessions=${count?.c}`;
}

// The sync API throws until expo-sqlite's web worker has loaded; retry until
// it is ready, and only publish a result on success or final failure.
function attempt(tries: number): void {
  try {
    run();
  } catch (error) {
    const message = String(error instanceof Error ? error.stack : error);
    if (tries > 0 && message.includes('not finished loading')) {
      setTimeout(() => attempt(tries - 1), 200);
    } else {
      w.__SEED_RESULT__ = `error ${message}`;
    }
  }
}
setTimeout(() => attempt(100), 50);
