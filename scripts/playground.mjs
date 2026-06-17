#!/usr/bin/env node
/* ============================================================================
   Launch the FX playground only. Builds the vendored dice engine, starts the
   relay server, then opens the playground page in the browser.  `npm run playground`

   The server already serves everything the playground needs (assets, dice
   bundle, sprite manifest) — this just chains build → serve → open and points a
   browser straight at /assets/fx/playground.html so you don't touch rooms.
   Honours PORT (default 8765); set NO_OPEN=1 to skip opening the browser.
   ========================================================================== */
import { spawn, execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const PORT = process.env.PORT || 8765;
const PAGE = `http://localhost:${PORT}/assets/fx/playground.html`;

// 1) build the dice engine bundle (the playground renders real 3D dice)
try {
  execFileSync('node', ['scripts/build-dice.mjs'], { stdio: 'inherit' });
} catch {
  console.error('[playground] dice build failed');
  process.exit(1);
}

// 2) start the relay server (long-running, foreground — owns stdout/stdin)
const srv = spawn('node', ['src/server.js'], { stdio: 'inherit', env: process.env });
srv.on('exit', (code) => process.exit(code ?? 0));
process.on('SIGINT', () => srv.kill('SIGINT'));
process.on('SIGTERM', () => srv.kill('SIGTERM'));

// 3) once it answers, open the playground in the default browser
const isWSL = () => { try { return /microsoft/i.test(readFileSync('/proc/version', 'utf8')); } catch { return false; } };
function openURL(url) {
  try {
    if (process.platform === 'darwin') spawn('open', [url], { stdio: 'ignore', detached: true }).unref();
    else if (process.platform === 'win32' || isWSL()) spawn('cmd.exe', ['/c', 'start', '', url], { stdio: 'ignore', detached: true }).unref();
    else spawn('xdg-open', [url], { stdio: 'ignore', detached: true }).unref();
  } catch { /* opening is best-effort; the URL is printed regardless */ }
}

(async () => {
  for (let i = 0; i < 80; i++) {                      // wait up to ~20s for the server
    try { if ((await fetch(`http://localhost:${PORT}/healthz`)).ok) break; } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  console.log(`\n▶ FX playground ready: ${PAGE}\n`);
  if (process.env.NO_OPEN !== '1') openURL(PAGE);
})();
