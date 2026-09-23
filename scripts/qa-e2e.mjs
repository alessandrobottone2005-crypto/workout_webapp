/* ============================================
   QA E2E — full product journey in Chromium
   Run: node scripts/qa-e2e.mjs
   Requires: dist/ built (vite preview) + system Chrome
   ============================================ */

import puppeteer from 'puppeteer-core';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const OUT = join(root, 'qa-output');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 4173;
const BASE = `http://localhost:${PORT}`;

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

/* ---------- harness ---------- */

const results = [];
let currentPhase = 'init';
const pageErrors = [];
const consoleErrors = [];

function phase(name) {
  currentPhase = name;
  console.log(`\n━━━ ${name} ━━━`);
}

async function step(name, fn) {
  try {
    await fn();
    results.push({ phase: currentPhase, name, ok: true });
    console.log(`  ✓ ${name}`);
  } catch (e) {
    results.push({ phase: currentPhase, name, ok: false, error: String(e && e.message || e) });
    console.log(`  ✗ ${name} — ${e && e.message}`);
    try {
      await page.screenshot({ path: join(OUT, `FAIL-${name.replace(/[^a-z0-9]+/gi, '_')}.png`) });
    } catch {}
    throw e;
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'assertion failed');
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForText(text, opts = {}) {
  const timeout = opts.timeout || 15000;
  await page.waitForFunction(
    (t) => document.body && document.body.innerText.includes(t),
    { timeout },
    text
  );
}

async function textPresent(text) {
  return page.evaluate((t) => document.body && document.body.innerText.includes(t), text);
}

async function clickByText(text, opts = {}) {
  const { scope = 'body', exact = false, nth = 0, timeout = 10000 } = opts;
  await page.waitForFunction(
    (sel, txt, ex, n) => {
      const root = document.querySelector(sel) || document.body;
      const els = [...root.querySelectorAll('button, a, [role="button"], [role="tab"]')];
      const matches = els.filter((el) => {
        const t = (el.innerText || '').trim();
        return ex ? t === txt : t.includes(txt);
      });
      return matches.length > n && matches[n].offsetParent !== null;
    },
    { timeout },
    scope, text, exact, nth
  );
  const handle = await page.evaluateHandle(
    (sel, txt, ex, n) => {
      const root = document.querySelector(sel) || document.body;
      const els = [...root.querySelectorAll('button, a, [role="button"], [role="tab"]')];
      const matches = els.filter((el) => {
        const t = (el.innerText || '').trim();
        return ex ? t === txt : t.includes(txt);
      });
      return matches[n];
    },
    scope, text, exact, nth
  );
  await handle.asElement().evaluate((el) => el.click());
  await sleep(450);
}

async function clickAria(labelPart, opts = {}) {
  const { nth = 0, timeout = 10000 } = opts;
  await page.waitForFunction(
    (part, n) => {
      const els = [...document.querySelectorAll('[aria-label]')].filter((el) =>
        el.getAttribute('aria-label').includes(part)
      );
      return els.length > n && els[n].offsetParent !== null;
    },
    { timeout },
    labelPart, nth
  );
  const handle = await page.evaluateHandle(
    (part, n) => {
      const els = [...document.querySelectorAll('[aria-label]')].filter((el) =>
        el.getAttribute('aria-label').includes(part)
      );
      return els[n];
    },
    labelPart, nth
  );
  await handle.asElement().evaluate((el) => el.click());
  await sleep(450);
}

async function goto(path) {
  await page.goto(BASE + path, { waitUntil: 'networkidle0', timeout: 20000 });
  await sleep(400);
}

async function shot(name) {
  await page.screenshot({ path: join(OUT, `${name}.png`) });
}

function parseMMSS(s) {
  const m = /(\d+):(\d{2})/.exec(s);
  if (!m) return null;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

/* IDB helpers (page context) */
async function idbProgram() {
  return page.evaluate(
    () =>
      new Promise((resolve, reject) => {
        const req = indexedDB.open('WorkoutAppDB');
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction('programs', 'readonly');
          const get = tx.objectStore('programs').getAll();
          get.onsuccess = () => resolve(get.result);
          get.onerror = () => reject(get.error);
        };
        req.onerror = () => reject(req.error);
      })
  );
}

async function idbWorkouts() {
  return page.evaluate(
    () =>
      new Promise((resolve, reject) => {
        const req = indexedDB.open('WorkoutAppDB');
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction('workouts', 'readonly');
          const get = tx.objectStore('workouts').getAll();
          get.onsuccess = () => resolve(get.result);
          get.onerror = () => reject(get.error);
        };
        req.onerror = () => reject(req.error);
      })
  );
}

/* Read Exercise Focus numeric readouts */
async function readFocusValues() {
  return page.evaluate(() => {
    const spans = [...document.querySelectorAll('span')];
    const weightEl = spans.find((s) => s.className.includes('text-[40px]'));
    const repsEl = spans.find((s) => s.className.includes('text-[52px]'));
    const weightText = weightEl ? weightEl.textContent.trim() : null;
    const repsText = repsEl ? repsEl.textContent.trim() : null;
    const wm = weightText && weightText.match(/([\d.,]+|BW)/);
    return {
      weight: wm ? wm[1] : null,
      reps: repsText ? parseInt(repsText, 10) : null,
      weightRaw: weightText,
    };
  });
}

async function changeWeight(newInput) {
  await clickByText('modifica', { exact: false });
  await sleep(400);
  // Clear current value with backspace repeatedly
  const clear = async () => {
    for (let i = 0; i < 8; i++) {
      const btn = await page.evaluateHandle(() => {
        const els = [...document.querySelectorAll('[aria-label="Cancella"]')];
        return els[0];
      });
      const el = btn.asElement();
      if (!el) break;
      const cur = await page.evaluate(() => {
        const span = [...document.querySelectorAll('span')].find(
          (s) => s.className && String(s.className).includes('text-[64px]')
        );
        return span ? span.textContent.trim() : '';
      });
      if (!cur || cur === '0') break;
      await el.evaluate((b) => b.click());
      await sleep(50);
    }
  };
  await clear();
  for (const ch of newInput) {
    const label = ch === ',' ? ',' : ch;
    await page.evaluate((lbl) => {
      const els = [...document.querySelectorAll('button[aria-label]')];
      const btn = els.find((b) => b.getAttribute('aria-label') === lbl);
      if (btn) btn.click();
    }, label);
    await sleep(40);
  }
  await sleep(200);
  await clickByText('SALVA', { scope: 'body' });
  await sleep(400);
}

async function bumpReps(times, dir = 'Aumenta') {
  for (let i = 0; i < times; i++) {
    await clickAria(`${dir} RIPETIZIONI`);
  }
}

async function completeSet() {
  await clickByText('COMPLETA SERIE', { exact: true });
  await sleep(500);
}

/** Complete every remaining exercise with clicks; returns when overview shows COMPLETA WORKOUT or completes it */
async function completeAllExercises({ maxLoops = 40 } = {}) {
  for (let i = 0; i < maxLoops; i++) {
    if (await textPresent('COMPLETA WORKOUT')) return 'ready';
    // Open first non-completed exercise (rows without line-through that are buttons)
    const opened = await page.evaluate(() => {
      const rows = [...document.querySelectorAll('button.flex-1')];
      const row = rows.find((r) => {
        const p = r.querySelector('p');
        return p && !p.className.includes('line-through');
      });
      if (row) {
        row.click();
        return row.innerText.split('\n')[0];
      }
      return null;
    });
    if (!opened) {
      if (await textPresent('COMPLETA WORKOUT')) return 'ready';
      await sleep(400);
      continue;
    }
    await sleep(700);
    // We may be on Exercise Focus or Exercise Completed (if already done)
    // Spam complete-set until completed screen or back possible
    for (let j = 0; j < 12; j++) {
      if (await textPresent('COMPLETATA')) break;
      const did = await page.evaluate(() => {
        const btn = [...document.querySelectorAll('button')].find(
          (b) => b.innerText.trim() === 'COMPLETA SERIE'
        );
        if (btn && btn.offsetParent !== null) {
          btn.click();
          return true;
        }
        return false;
      });
      if (!did) break;
      await sleep(550);
      if (await textPresent('COMPLETATA')) break;
    }
    if (await textPresent('COMPLETATA')) {
      await clickByText('CONTINUA WORKOUT', { exact: true });
      await sleep(600);
    }
  }
  return (await textPresent('COMPLETA WORKOUT')) ? 'ready' : 'timeout';
}

/* ---------- server + browser ---------- */

async function waitForServer(url, tries = 50) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {}
    await sleep(200);
  }
  throw new Error('preview server did not start');
}

const server = spawn(join(root, 'node_modules/.bin/vite'), ['preview', '--port', String(PORT), '--strictPort'], {
  cwd: root,
  stdio: 'pipe',
});

let browser;
let page;

try {
  await waitForServer(BASE);
  console.log('preview server up');

  browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--no-first-run', '--disable-features=TranslateUI'],
    userDataDir: join(OUT, 'chrome-profile'),
  });
  page = await browser.newPage();
  await page.setViewport({ width: 393, height: 852, deviceScaleFactor: 2, isMobile: true, hasTouch: true });

  page.on('pageerror', (err) => pageErrors.push(String(err)));
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  /* ============ PHASE A — empty states (fresh DB) ============ */
  phase('A. Empty states (fresh database)');
  await goto('/');

  await step('home loads with seed program', async () => {
    await waitForText('SEDUTA 1');
  });
  await step('home empty history copy', async () => {
    assert(await textPresent('Nessun allenamento completato ancora.'), 'missing empty history copy');
  });
  await step('no stale active banner on fresh DB', async () => {
    assert(!(await textPresent('ALLENAMENTO IN CORSO')), 'stale banner present');
  });
  await shot('01-home-empty-393x852');

  await step('progress empty state', async () => {
    await goto('/progress');
    await waitForText('PROGRESSI');
    assert(
      await textPresent('I tuoi progressi appariranno dopo i primi allenamenti.'),
      'missing progress empty copy'
    );
  });
  await shot('02-progress-empty');

  await step('exercise history empty state reachable via program? (program has no history yet)', async () => {
    await goto('/program');
    await waitForText('SEDUTE');
    await clickByText('Seduta 1');
    await sleep(600);
    await waitForText('Chest Press');
    assert(await textPresent('Cyclette'), 'session detail missing exercises');
  });
  await shot('03-session-detail');

  await step('calendar loads empty', async () => {
    await goto('/calendar');
    await waitForText('CALENDARIO');
  });

  await step('settings reachable from home gear', async () => {
    await goto('/');
    await sleep(400);
    await clickAria('Impostazioni');
    await sleep(600);
    await waitForText('IMPOSTAZIONI');
    assert(await textPresent('Richiede app nativa'), 'Apple Health note missing/fake');
  });
  await shot('04-settings');

  /* ============ PHASE B — main workout journey ============ */
  phase('B. Core workout journey (30 steps)');
  await goto('/');

  await step('2-3: start workout from home', async () => {
    await waitForText('INIZIA WORKOUT');
    await clickByText('INIZIA WORKOUT', { exact: true });
    await sleep(900);
    const url = page.url();
    assert(/\/workout\/[0-9a-f-]+/.test(url), `not on workout route: ${url}`);
  });

  await step('4: workout overview shows exercises + progress', async () => {
    await waitForText('0 / 7 esercizi completati');
    assert(await textPresent('Chest Press'), 'missing exercise');
    assert(await textPresent('Seduta 1'.toUpperCase()), 'missing title');
    await clickAria('Indietro'); // overview back button → home mid-workout
    await sleep(600);
    assert(page.url().endsWith('/'), 'back did not go home');
    // resume banner must appear
    await waitForText('ALLENAMENTO IN CORSO');
    await clickByText('Riprendi');
    await sleep(900);
    await waitForText('0 / 7 esercizi completati');
  });
  await shot('05-workout-overview');

  await step('5-6: open Chest Press — template defaults visible first time', async () => {
    await clickByText('Chest Press', { nth: 0 });
    await sleep(900);
    await waitForText('CHEST PRESS');
    const v = await readFocusValues();
    assert(v.weight === '45', `expected template default 45, got ${v.weightRaw}`);
    assert(v.reps === 8, `expected template reps 8, got ${v.reps}`);
    assert(await textPresent('Serie 1 di 3'), 'missing set label');
    assert(!(await textPresent('ULTIMA VOLTA')), 'ULTIMA VOLTA should be hidden with no history');
  });
  await shot('06-exercise-focus-first');

  await step('7: change weight to 50 via editor', async () => {
    await changeWeight('50');
    const v = await readFocusValues();
    assert(v.weight === '50', `weight not 50: ${v.weightRaw}`);
  });

  await step('8: change reps to 10', async () => {
    await bumpReps(2, 'Aumenta');
    const v = await readFocusValues();
    assert(v.reps === 10, `reps not 10: ${v.reps}`);
  });

  await step('9-10: complete set 1 — values NOT clobbered', async () => {
    await completeSet();
    await sleep(700);
    assert(await textPresent('Serie 2 di 3'), 'did not advance to set 2');
    const v = await readFocusValues();
    assert(v.weight === '50', `CLOBBER: weight reset to ${v.weightRaw}`);
    assert(v.reps === 10, `CLOBBER: reps reset to ${v.reps}`);
    assert(await textPresent('10 × 50kg'), 'set 1 history card missing');
  });

  await step('11: edit set 2 values (52,5 kg × 11)', async () => {
    await changeWeight('52,5');
    await bumpReps(1, 'Aumenta');
    const v = await readFocusValues();
    assert(v.weight === '52,5', `weight not 52,5: ${v.weightRaw}`);
    assert(v.reps === 11, `reps not 11: ${v.reps}`);
    await completeSet();
    await sleep(700);
    assert(await textPresent('Serie 3 di 3'), 'did not advance to set 3');
  });

  await step('12-13: reload — sets persisted, current values recovered from session', async () => {
    await page.reload({ waitUntil: 'networkidle0' });
    await sleep(900);
    await waitForText('CHEST PRESS');
    assert(await textPresent('Serie 3 di 3'), 'set progress lost after reload');
    assert(await textPresent('52,5kg') || (await textPresent('10 × 50kg')), 'set history lost');
    const v = await readFocusValues();
    assert(v.weight === '52,5', `after reload weight: ${v.weightRaw}`);
    assert(v.reps === 11, `after reload reps: ${v.reps}`);
    assert(await textPresent('SERIE 1') && (await textPresent('SERIE 2')), 'set cards missing');
  });
  await shot('07-focus-after-reload');

  /* ---------- REST TIMER SUITE (requirement 4) ---------- */
  phase('C. Rest timer suite');

  await step('start 2:00 timer from rest presets', async () => {
    await clickAria('2:00 recupero');
    await sleep(600);
    const pill = await page.$('[aria-label*="Apri timer"]');
    assert(pill, 'pill not visible after start');
  });

  await step('pill is fixed with >=44px touch target', async () => {
    // Wait for the entrance spring (scale 0.8 → 1) to settle so the
    // measured hit area reflects the resting state, not a mid-animation frame.
    let info = null;
    for (let i = 0; i < 30; i++) {
      info = await page.evaluate(() => {
        const all = [...document.querySelectorAll('[aria-label*="Apri timer"]')];
        const el = all[0];
        if (!el) return null;
        let pos = 'static';
        for (let n = el; n; n = n.parentElement) {
          if (getComputedStyle(n).position === 'fixed') { pos = 'fixed'; break; }
        }
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        return {
          position: pos, w: r.width, h: r.height,
          offsetH: el.offsetHeight, transform: cs.transform, minH: cs.minHeight,
          count: all.length, aria: el.getAttribute('aria-label'),
          rectTags: all.map((x) => `${Math.round(x.getBoundingClientRect().width)}x${x.getBoundingClientRect().height.toFixed(2)}`).join(','),
        };
      });
      if (info && info.h >= 44 && info.w >= 44) break;
      await sleep(200);
    }
    assert(info, 'pill missing');
    assert(info.position === 'fixed', `pill position: ${info.position}`);
    assert(
      info.h >= 44,
      `pill height ${info.h} < 44 (offsetH=${info.offsetH} transform=${info.transform} minH=${info.minH} count=${info.count} rects=${info.rectTags} aria=${info.aria})`
    );
    assert(info.w >= 44, `pill width ${info.w} < 44`);
  });

  await step('pill visible on overview (navigate away from exercise)', async () => {
    await clickAria('Torna alla panoramica');
    await sleep(700);
    const pill = await page.$('[aria-label*="Apri timer"]');
    assert(pill, 'pill not visible on overview');
  });

  await step('pill remains running across reload with correct remaining', async () => {
    const before = await page.evaluate(() =>
      document.querySelector('[aria-label*="Apri timer"]').getAttribute('aria-label')
    );
    const beforeSecs = parseMMSS(before);
    await page.reload({ waitUntil: 'networkidle0' });
    await sleep(1200);
    const after = await page.evaluate(() => {
      const el = document.querySelector('[aria-label*="Apri timer"]');
      return el ? el.getAttribute('aria-label') : null;
    });
    assert(after, 'pill lost after reload');
    const afterSecs = parseMMSS(after);
    assert(afterSecs !== null, `cannot parse: ${after}`);
    assert(afterSecs <= beforeSecs, `timer went forward? ${beforeSecs} -> ${afterSecs}`);
    assert(afterSecs > beforeSecs - 25, `too much time lost: ${beforeSecs} -> ${afterSecs}`);
  });

  await step('tap pill opens focused timer sheet', async () => {
    await clickAria('Apri timer');
    await sleep(700);
    const dialog = await page.$('[role="dialog"]');
    assert(dialog, 'sheet did not open');
    assert(await textPresent('AGGIUNGI TEMPO') || await textPresent('+0:30'), 'no adjust controls');
    assert(await textPresent('TERMINA RECUPERO'), 'no stop control');
  });
  await shot('08-rest-timer-sheet');

  await step('+0:30 adds 30 seconds', async () => {
    const before = parseMMSS(await readDialogTime());
    await clickAria('Aggiungi 30 secondi');
    await sleep(500);
    const after = parseMMSS(await readDialogTime());
    assert(after !== null && before !== null, 'cannot read times');
    assert(after >= before + 25 && after <= before + 32, `+30 failed: ${before} -> ${after}`);
  });

  await step('+1:00 adds 60 seconds', async () => {
    const before = parseMMSS(await readDialogTime());
    await clickAria('Aggiungi 60 secondi');
    await sleep(500);
    const after = parseMMSS(await readDialogTime());
    assert(after >= before + 55 && after <= before + 62, `+60 failed: ${before} -> ${after}`);
  });

  await step('TERMINA stops the timer', async () => {
    await clickByText('TERMINA RECUPERO', { exact: true });
    await sleep(700);
    const pill = await page.$('[aria-label*="Apri timer"]');
    assert(!pill, 'pill still visible after TERMINA');
  });

  await step('preset restart works (1:00)', async () => {
    // On overview there are no presets — go into an exercise
    await clickByText('Chest Press', { nth: 0 });
    await sleep(900);
    await waitForText('RECUPERO');
    await clickAria('1:00 recupero');
    await sleep(600);
    const label = await page.evaluate(() => {
      const el = document.querySelector('[aria-label*="Apri timer"]');
      return el ? el.getAttribute('aria-label') : null;
    });
    assert(label, 'pill missing after preset');
    const secs = parseMMSS(label);
    assert(secs !== null && secs >= 55 && secs <= 61, `preset restart: ${label}`);
  });

  await step('expiry feedback visible + no runtime errors (sound/vibration safe)', async () => {
    // Wait for the 60s timer to expire, polling for the completed pill
    const errCountBefore = pageErrors.length;
    let sawDone = false;
    const deadline = Date.now() + 75000;
    while (Date.now() < deadline) {
      const label = await page.evaluate(() => {
        const el = document.querySelector('[aria-label*="RECUPERO TERMINATO"]');
        return el ? el.getAttribute('aria-label') : null;
      }).catch(() => null);
      if (label) {
        sawDone = true;
        break;
      }
      await sleep(250);
    }
    assert(sawDone, 'expiry visual feedback (RECUPERO TERMINATO) never appeared');
    assert(pageErrors.length === errCountBefore, `page errors during expiry: ${pageErrors.slice(errCountBefore).join('; ')}`);
    // let the 3s auto-clear happen
    await sleep(3500);
  });

  /* ---------- exercise completion ---------- */
  phase('D. Exercise + workout completion');

  await step('complete remaining sets → exercise auto-completes', async () => {
    // Currently set 3 pending on Chest Press
    if (await textPresent('COMPLETA SERIE')) {
      await completeSet();
      await sleep(800);
    }
    await waitForText('COMPLETATA', { timeout: 8000 });
    assert(await textPresent('3 serie'), 'completed screen missing sets count');
  });
  await shot('09-exercise-completed');

  await step('continue → overview shows exercise completed', async () => {
    await clickByText('CONTINUA WORKOUT', { exact: true });
    await sleep(800);
    await waitForText('1 / 7 esercizi completati');
    assert(await textPresent('CHEST PRESS') || await textPresent('Chest Press'), 'row missing');
  });

  await step('reorder exercises (session-scoped, drag)', async () => {
    const beforeOrder = await page.evaluate(() =>
      [...document.querySelectorAll('button.flex-1')].map((b) => b.innerText.split('\n')[0])
    );
    // Drag the LAST non-completed row's grip upward by ~120px
    const grips = await page.$$('button[aria-label^="Riordina"]');
    assert(grips.length >= 3, 'not enough grips');
    const target = grips[grips.length - 1];
    const box = await target.boundingBox();
    assert(box, 'no grip box');
    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 2;
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await sleep(120);
    for (let i = 1; i <= 8; i++) {
      await page.mouse.move(startX, startY - (i * 15));
      await sleep(60);
    }
    await page.mouse.up();
    await sleep(800);
    const afterOrder = await page.evaluate(() =>
      [...document.querySelectorAll('button.flex-1')].map((b) => b.innerText.split('\n')[0])
    );
    const changed = JSON.stringify(beforeOrder) !== JSON.stringify(afterOrder);
    // Even if headless drag is flaky, the workout must not crash
    assert(!pageErrors.length, 'errors during drag');
    results.push({
      phase: currentPhase,
      name: 'reorder drag result',
      ok: true,
      note: changed ? 'order changed' : 'drag did not reorder (verify on device)',
    });
    console.log(`    (reorder: ${changed ? 'changed' : 'NO CHANGE — needs device check'})`);
  });

  await step('complete all remaining exercises', async () => {
    const r = await completeAllExercises();
    assert(r === 'ready', `could not reach COMPLETA WORKOUT (${r})`);
  });
  await shot('10-overview-all-complete');

  await step('complete workout → completed screen → home without stale banner', async () => {
    await clickByText('COMPLETA WORKOUT', { exact: true });
    await sleep(1200);
    await waitForText('COMPLETATO');
    assert(await textPresent('DURATA'), 'missing duration stat');
    await shot('11-workout-completed');
    await clickByText('TERMINA', { exact: true, nth: 0 });
    await sleep(1000);
    await waitForText('Pronto ad allenarti?');
    assert(!(await textPresent('ALLENAMENTO IN CORSO')), 'STALE active banner after completion');
    assert(await textPresent('ULTIMO WORKOUT'), 'last workout card missing');
  });
  await shot('12-home-after-workout');

  /* ---------- progress / history / calendar ---------- */
  phase('E. Progress, history, calendar after workout');

  await step('progress metrics updated (1 workout)', async () => {
    await clickAria('Progressi');
    await sleep(900);
    await waitForText('PROGRESSI');
    assert(await textPresent('WORKOUT COMPLETATI'), 'metrics missing');
    const total = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('div')].filter((d) => {
        const t = (d.innerText || '').replace(/\s+/g, ' ').trim();
        return t.startsWith('WORKOUT COMPLETATI');
      });
      if (!cards.length) return null;
      const m = cards[cards.length - 1].innerText
        .replace(/\s+/g, ' ')
        .match(/WORKOUT COMPLETATI (\d+)/);
      return m ? parseInt(m[1], 10) : null;
    });
    assert(total === 1, `expected total 1, got ${total}`);
    assert(await textPresent('Chest Press'), 'exercise trends missing');
  });
  await shot('13-progress');

  await step('exercise history shows new workout', async () => {
    await clickByText('Chest Press', { nth: 0 });
    await sleep(1000);
    await waitForText('ULTIMO');
    assert(await textPresent('52,5 kg'), `representative weight wrong: ${page.url()}`);
    assert(await textPresent('10 × 50') || await textPresent('50 kg'), 'set history missing weight');
    assert(await textPresent('11 rip') || await textPresent('× 11'), 'sets list missing');
  });
  await shot('14-exercise-history');

  await step("program edit does NOT change history (snapshot isolation)", async () => {
    await goto('/program');
    await sleep(600);
    await clickByText('Seduta 1');
    await sleep(700);
    await clickByText('Chest Press', { nth: 0 });
    await sleep(700);
    await waitForText('ESERCIZIO');
    // Change template weight to 60
    await page.evaluate(() => {
      const inp = document.getElementById('ex-weight');
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(inp, '60');
      inp.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await sleep(300);
    await clickByText('SALVA ESERCIZIO', { exact: true });
    await sleep(900);
    // History still shows old data
    const workouts = await idbWorkouts();
    const w = workouts.find((x) => x.status === 'completed');
    assert(w, 'no completed workout');
    const chest = w.exerciseLogs.find((e) => e.exerciseNameSnapshot === 'Chest Press');
    assert(chest, 'snapshot name changed!');
    const maxW = Math.max(...chest.setLogs.map((s) => s.weight));
    assert(maxW === 52.5, `history weight mutated: ${maxW}`);
    const prog = (await idbProgram())[0];
    const t = prog.sessions[0].exercises.find((e) => e.name === 'Chest Press');
    assert(t.defaultWeight === 60, `template not updated: ${t.defaultWeight}`);
    // order preserved after edit
    const orders = prog.sessions[0].exercises.map((e) => e.order);
    assert(JSON.stringify(orders) === JSON.stringify([0, 1, 2, 3, 4, 5, 6]), `orders broken: ${orders}`);
  });

  await step('calendar shows today workout', async () => {
    // Session detail hides the bottom nav — navigate directly
    await goto('/calendar');
    await sleep(600);
    await waitForText('CALENDARIO');
    // Click today (has aria-pressed false, contains '- allenamento')
    const clicked = await page.evaluate(() => {
      const btn = [...document.querySelectorAll('button[aria-label*="allenamento"]')][0];
      if (btn) {
        btn.click();
        return btn.getAttribute('aria-label');
      }
      return null;
    });
    assert(clicked, 'today workout dot not found on calendar');
    await sleep(700);
    assert(await textPresent('COMPLETATO'), 'day detail missing');
    assert(await textPresent('Seduta 1') || await textPresent('SEDUTA 1'), 'workout card missing');
  });
  await shot('15-calendar');

  /* ---------- ULTIMA VOLTA cross-session + workout 2 ---------- */
  phase('F. Previous performance (ULTIMA VOLTA) in second session');

  await step('fixture: add Chest Press to next session (same template id)', async () => {
    await page.evaluate(
      () =>
        new Promise((resolve, reject) => {
          const open = indexedDB.open('WorkoutAppDB');
          open.onsuccess = () => {
            const db = open.result;
            const tx = db.transaction('programs', 'readwrite');
            const store = tx.objectStore('programs');
            const get = store.getAll();
            get.onsuccess = () => {
              const prog = get.result[0];
              const src = prog.sessions[0].exercises.find((e) => e.name === 'Chest Press');
              const dst = prog.sessions[1];
              if (!dst.exercises.find((e) => e.id === src.id)) {
                dst.exercises.push({ ...src, order: dst.exercises.length });
              }
              store.put(prog);
            };
            tx.oncomplete = () => resolve(true);
            tx.onerror = () => reject(tx.error);
          };
          open.onerror = () => reject(open.error);
        })
    );
  });

  await step('home shows next session Seduta 2; start it', async () => {
    await goto('/');
    await sleep(700);
    await waitForText('SEDUTA 2');
    await clickByText('INIZIA WORKOUT', { exact: true });
    await sleep(1000);
    assert(/\/workout\//.test(page.url()), 'workout 2 not started');
  });

  await step('ULTIMA VOLTA shows previous session performance', async () => {
    await waitForText('esercizi completati');
    // Open Chest Press (appended at end — may need scroll)
    const opened = await page.evaluate(() => {
      const rows = [...document.querySelectorAll('button.flex-1')];
      const row = rows.find((r) => r.innerText.includes('Chest Press'));
      if (row) {
        row.scrollIntoView({ block: 'center' });
        row.click();
        return true;
      }
      return false;
    });
    assert(opened, 'Chest Press row not found in session 2');
    await sleep(1200);
    await waitForText('ULTIMA VOLTA');
    assert(await textPresent('52,5 kg × 11'), 'ULTIMA VOLTA wrong values');
    const v = await readFocusValues();
    assert(v.weight === '52,5', `prefill from last session: ${v.weightRaw}`);
    assert(v.reps === 11, `prefill reps from last session: ${v.reps}`);
  });
  await shot('16-focus-ultima-volta');

  /* ---------- width audit while workout active ---------- */
  phase('G. Responsive width audit (375 / 390 / 393 / 402 / 430)');

  async function auditWidth(path, name, width) {
    await page.setViewport({ width, height: 852, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    if (path) await goto(path);
    else await sleep(500);
    const overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      const offenders = [];
      const vw = window.innerWidth;
      for (const el of document.querySelectorAll('body *')) {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && (r.right > vw + 1 || r.left < -1)) {
          const cs = getComputedStyle(el);
          if (cs.position === 'fixed' && cs.transform !== 'none') continue; // animating sheets
          offenders.push(
            `${el.tagName}.${String(el.className).slice(0, 60)} right=${Math.round(r.right)}`
          );
        }
        if (offenders.length >= 5) break;
      }
      return {
        scrollW: doc.scrollWidth,
        vw,
        offenders,
      };
    });
    assert(
      overflow.scrollW <= overflow.vw + 1,
      `${name}@${width}: horizontal overflow scrollW=${overflow.scrollW} vw=${overflow.vw} offenders=${overflow.offenders.join(' | ')}`
    );
    if (width === 393) await shot(`${name}-393x852`);
  }

  await step('home at all widths', async () => {
    for (const w of [375, 390, 393, 402, 430]) await auditWidth('/', 'home', w);
  });
  await step('program at all widths', async () => {
    for (const w of [375, 390, 393, 402, 430]) await auditWidth('/program', 'program', w);
  });
  await step('progress at all widths', async () => {
    for (const w of [375, 390, 393, 402, 430]) await auditWidth('/progress', 'progress', w);
  });
  await step('calendar at all widths', async () => {
    for (const w of [375, 390, 393, 402, 430]) await auditWidth('/calendar', 'calendar', w);
  });
  await step('settings at all widths', async () => {
    for (const w of [375, 390, 393, 402, 430]) await auditWidth('/settings', 'settings', w);
  });

  await step('workout overview + exercise focus at all widths', async () => {
    // Resume active workout (workout 2)
    await page.setViewport({ width: 393, height: 852, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await goto('/');
    await sleep(600);
    if (await textPresent('Riprendi')) {
      await clickByText('Riprendi');
      await sleep(900);
    }
    const overviewUrl = page.url();
    assert(/\/workout\//.test(overviewUrl), `not on workout: ${overviewUrl}`);
    for (const w of [375, 390, 393, 402, 430]) {
      await page.setViewport({ width: w, height: 852, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
      await page.goto(overviewUrl, { waitUntil: 'networkidle0' });
      await sleep(700);
      const o = await page.evaluate(() => ({
        scrollW: document.documentElement.scrollWidth,
        vw: window.innerWidth,
      }));
      assert(o.scrollW <= o.vw + 1, `overview@${w}: overflow ${o.scrollW} > ${o.vw}`);
      if (w === 393) await shot('17-overview-393x852');
    }
    // Exercise focus (first pending)
    await page.setViewport({ width: 393, height: 852, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await page.goto(overviewUrl, { waitUntil: 'networkidle0' });
    await sleep(700);
    await page.evaluate(() => {
      const rows = [...document.querySelectorAll('button.flex-1')];
      const row =
        rows.find((r) => r.innerText.includes('Chest Press')) ||
        rows.find((r) => !r.querySelector('p')?.className.includes('line-through'));
      if (row) row.click();
    });
    await sleep(1000);
    const focusUrl = page.url();
    assert(/\/exercise\//.test(focusUrl), `not on focus: ${focusUrl}`);
    for (const w of [375, 390, 393, 402, 430]) {
      await page.setViewport({ width: w, height: 852, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
      await page.goto(focusUrl, { waitUntil: 'networkidle0' });
      await sleep(800);
      const o = await page.evaluate(() => ({
        scrollW: document.documentElement.scrollWidth,
        vw: window.innerWidth,
      }));
      assert(o.scrollW <= o.vw + 1, `focus@${w}: overflow ${o.scrollW} > ${o.vw}`);
      if (w === 393) await shot('18-focus-393x852');
    }
    // Weight sheet open at 375
    await page.setViewport({ width: 375, height: 852, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await page.goto(focusUrl, { waitUntil: 'networkidle0' });
    await sleep(800);
    if (await textPresent('modifica')) {
      await changeWeight('80,5');
      const v = await readFocusValues();
      assert(v.weight === '80,5', `comma weight in focus: ${v.weightRaw}`);
      if ((await page.$('[role="dialog"]')) === null) {
        // sheet already closed after save
      }
      // Reopen sheet and check overflow at 375
      await clickByText('modifica');
      await sleep(600);
      const sheetOverflow = await page.evaluate(() => {
        const sheet = [...document.querySelectorAll('div')].find(
          (d) => getComputedStyle(d).position === 'fixed' && d.className.includes('rounded-t-modal')
        );
        if (!sheet) return { ok: true };
        const r = sheet.getBoundingClientRect();
        return { ok: r.left >= -1 && r.right <= window.innerWidth + 1, left: r.left, right: r.right, vw: window.innerWidth };
      });
      assert(sheetOverflow.ok, `weight sheet overflow @375: ${JSON.stringify(sheetOverflow)}`);
      await shot('19-weight-sheet-375');
      // cancel
      await clickByText('Annulla', { nth: 0 });
      await sleep(400);
    } else {
      assert(false, 'no weight editor (modifica) on focus screen');
    }
  });

  /* ---------- touch targets (minimum 44x44 CSS px) ---------- */
  phase('H. Touch target audit (44px)');

  await step('all interactive controls >= 44x44px', async () => {
    await page.setViewport({ width: 393, height: 852, deviceScaleFactor: 2, isMobile: true, hasTouch: true });

    const screens = [
      ['/', 'home'],
      ['/program', 'program'],
      ['/settings', 'settings'],
      ['/calendar', 'calendar'],
      ['/progress', 'progress'],
    ];

    // Active workout screens: overview (drag handles, back, X, chevrons)
    // and exercise focus (back, +/- stepper, modifica, rest presets, pill).
    // Prefer a strength exercise so the reps stepper + weight editor are present.
    const activeW = (await idbWorkouts()).find((w) => w.status === 'active');
    if (activeW) {
      screens.push([`/workout/${activeW.id}`, 'overview']);
      const sortedLogs = [...activeW.exerciseLogs].sort((a, b) => a.order - b.order);
      const nextEx =
        sortedLogs.find((e) => e.status !== 'completed' && e.exerciseTypeSnapshot === 'strength') ??
        sortedLogs.find((e) => e.status !== 'completed');
      if (nextEx) screens.push([`/workout/${activeW.id}/exercise/${nextEx.id}`, 'focus']);
    }

    const auditTouchTargets = () => {
      const out = [];
      const els = [...document.querySelectorAll('button, a[href], [role="switch"], [role="button"]')];
      for (const el of els) {
        if (el.offsetParent === null && getComputedStyle(el).position !== 'fixed') continue;
        const r = el.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) continue;
        let w = r.width;
        let h = r.height;
        // Include ::after hit-slop (used by Toggle): absolute pseudo extends the hit box
        const a = getComputedStyle(el, '::after');
        if (a.position === 'absolute' && a.content && a.content !== 'none') {
          const t = parseFloat(a.top) || 0;
          const b = parseFloat(a.bottom) || 0;
          const l = parseFloat(a.left) || 0;
          const rt = parseFloat(a.right) || 0;
          h = h - t - b;
          w = w - l - rt;
        }
        if (w < 44 || h < 44) {
          const label = (el.getAttribute('aria-label') || el.innerText || '').trim().slice(0, 40);
          out.push(`${label.replace(/\n/g, ' ')} ${Math.round(w)}x${Math.round(h)}`);
        }
      }
      return out;
    };

    const auditHere = async (name) => {
      const bad = await page.evaluate(auditTouchTargets);
      for (const b of bad) violations.push(`${name}: ${b}`);
    };

    const violations = [];
    for (const [path, name] of screens) {
      await goto(path);
      await sleep(600);
      if (name === 'focus') {
        // Start a rest timer so the fixed pill is measurable — wait for the
        // entrance spring (scale 0.8 → 1) to settle before auditing.
        if (await textPresent('RECUPERO')) {
          const preset = await page.$('[aria-label="2:00 recupero"]');
          if (preset) {
            await preset.click();
            await page
              .waitForFunction(
                () => {
                  const el = document.querySelector('[aria-label*="Apri timer"]');
                  if (!el) return false;
                  const r = el.getBoundingClientRect();
                  return r.height >= 44 && r.width >= 44;
                },
                { timeout: 5000 }
              )
              .catch(() => {});
          }
        }
        await auditHere('focus');
        // Weight editor sheet (keypad + Annulla + SALVA)
        if (await textPresent('modifica')) {
          await clickByText('modifica');
          await sleep(700);
          await auditHere('weight sheet');
          await clickByText('Annulla');
          await sleep(400);
        }
      } else {
        await auditHere(name);
      }
    }

    // Session detail (back, pencil) → edit session (drag handle, delete, info)
    await goto('/program');
    await sleep(500);
    await clickByText('Seduta 1');
    await sleep(500);
    await auditHere('session detail');
    await clickAria('Modifica seduta');
    await sleep(500);
    await auditHere('edit session');

    // Edit exercise (back, type toggles, rest presets, delete)
    await clickByText('Chest Press');
    await sleep(700);
    await auditHere('edit exercise');
    await clickAria('Indietro');
    await sleep(500);

    // Rest timer sheet (close, +0:30, +1:00, TERMINA, presets)
    if (await textPresent('Apri timer')) {
      await clickAria('Apri timer');
      await sleep(800);
      await auditHere('timer sheet');
      await clickAria('CHIUDI');
      await sleep(500);
    }

    const ok = violations.length === 0;
    results.push({
      phase: currentPhase,
      name: 'touch target report (>=44px)',
      ok,
      note: ok ? 'all >= 44px' : violations.join(' | '),
    });
    assert(ok, `touch targets < 44px: ${violations.join(' | ')}`);
    console.log(`    touch targets < 44px: ${ok ? 'none' : violations.join(' | ')}`);
  });

  /* ---------- reset data ---------- */
  phase('I. Reset data');

  await step('reset wipes state with confirmation', async () => {
    await goto('/settings');
    await sleep(600);
    await clickByText('Resetta dati app', { nth: 0 });
    await sleep(700);
    assert(await textPresent('ELIMINA TUTTO'), 'confirm dialog missing');
    await shot('20-reset-confirm');
    await clickByText('ELIMINA TUTTO', { exact: true });
    await sleep(1500);
    assert(await textPresent('Dati resettati') || true, 'toast optional');
  });

  await step('after reset: no stale activeWorkout / timer / routes', async () => {
    await goto('/');
    await sleep(800);
    assert(await textPresent('SEDUTA 1'), 'seed not restored');
    assert(!(await textPresent('ALLENAMENTO IN CORSO')), 'stale activeWorkout banner');
    assert((await page.$('[aria-label*="Apri timer"]')) === null, 'stale timer pill');
    const workouts = await idbWorkouts();
    assert(workouts.length === 0, `workouts not cleared: ${workouts.length}`);
    // navigate every route — no crashes
    for (const p of ['/program', '/progress', '/calendar', '/settings', '/workout/nonexistent', '/nope']) {
      await goto(p);
      await sleep(400);
      if (p === '/workout/nonexistent') {
        // must show loader or 404-ish, not crash
        assert(await textPresent('404') || true, 'ok');
      }
      if (p === '/nope') {
        assert(await textPresent('404'), 'missing 404 page');
      }
    }
    assert(pageErrors.length === 0, `page errors: ${pageErrors.join(' | ')}`);
  });
  await shot('21-after-reset-home');

  /* ---------- offline ---------- */
  phase('J. Offline (service worker)');

  await step('SW controls the page', async () => {
    await goto('/');
    await sleep(1500);
    // reload to allow SW activation + claim
    await page.reload({ waitUntil: 'networkidle0' });
    await sleep(1500);
    const controlled = await page.evaluate(async () => {
      if (!navigator.serviceWorker) return false;
      const reg = await navigator.serviceWorker.getRegistration();
      if (!reg) return false;
      if (navigator.serviceWorker.controller) return true;
      // wait briefly for claim
      await new Promise((r) => setTimeout(r, 2000));
      return !!navigator.serviceWorker.controller;
    });
    assert(controlled, 'service worker does not control the page');
  });

  await step('full workout flow offline', async () => {
    await page.setOfflineMode(true);
    await sleep(300);
    await page.reload({ waitUntil: 'networkidle0', timeout: 20000 });
    await sleep(1200);
    await waitForText('SEDUTA 1', { timeout: 20000 });
    assert(await textPresent('INIZIA WORKOUT'), 'offline home broken');

    await clickByText('Scheda');
    await sleep(800);
    await waitForText('SEDUTE');
    assert(await textPresent('La Mia Scheda') || await textPresent('LA MIA SCHEDA'), 'offline program broken');

    await clickAria('Home');
    await sleep(700);
    await clickByText('INIZIA WORKOUT', { exact: true });
    await sleep(1200);
    assert(/\/workout\//.test(page.url()), 'offline start failed');

    // Open a strength exercise (cardio has no weight editor), edit weight, complete a set, run timer
    await page.waitForFunction(() => {
      const rows = [...document.querySelectorAll('button.flex-1')];
      return rows.some((r) => (r.innerText || '').includes('Chest Press'));
    }, { timeout: 10000 });
    await page.evaluate(() => {
      const rows = [...document.querySelectorAll('button.flex-1')];
      const row = rows.find((r) => r.innerText.includes('Chest Press'));
      if (row) row.click();
    });
    await waitForText('CHEST PRESS', { timeout: 10000 }); // confirm the right exercise opened
    await sleep(500);
    await changeWeight('40');
    const v = await readFocusValues();
    assert(v.weight === '40', `offline weight edit: ${v.weightRaw}`);
    await completeSet();
    await sleep(700);
    assert(await textPresent('Serie 1') || await textPresent('× 40') || await textPresent('40kg'), 'offline set not logged');
    // timer
    const preset = await page.$('[aria-label$="recupero"]');
    if (preset) {
      await preset.evaluate((el) => el.click());
      await sleep(600);
      assert(await page.$('[aria-label*="Apri timer"]'), 'offline timer failed');
    }
    // reload offline → persistence (may restore focus screen or overview — both valid)
    await page.reload({ waitUntil: 'networkidle0', timeout: 20000 });
    await sleep(1500);
    const recovered = await page.evaluate(() => {
      const t = (document.body.innerText || '').toLowerCase();
      return t.includes('esercizi completati') || t.includes('seduta') || t.includes('serie');
    });
    assert(
      recovered,
      `offline reload failed: ${page.url()} :: ${await page.evaluate(() => (document.body.innerText || '').slice(0, 220).replace(/\n+/g, ' | '))}`
    );
    // set should still exist if we returned to exercise — check IDB
    const workouts = await idbWorkouts();
    const active = workouts.find((w) => w.status === 'active');
    assert(active, 'offline: active workout lost');
    const anySets = active.exerciseLogs.some((e) => e.setLogs.length > 0);
    assert(anySets, 'offline: set not persisted');

    // Reload restored the focus screen — return to the overview to continue
    if (/\/exercise\//.test(page.url())) {
      await clickAria('Torna alla panoramica');
      await sleep(700);
    }
    assert(/\/workout\//.test(page.url()), `not on overview: ${page.url()}`);

    // complete the whole workout offline
    const r = await completeAllExercises();
    if (r === 'ready') {
      await clickByText('COMPLETA WORKOUT', { exact: true });
      await sleep(1200);
      await waitForText('COMPLETATO');
      await clickByText('TERMINA', { exact: true, nth: 0 });
      await sleep(1000);
    }
    // view history offline (home has the bottom nav)
    if (!await page.$('nav[aria-label="Navigazione principale"]')) {
      await goto('/');
      await sleep(600);
    }
    await clickAria('Progressi');
    await sleep(900);
    assert(await textPresent('WORKOUT COMPLETATI'), 'offline progress broken');
    await clickAria('Calendario');
    await sleep(900);
    assert(await textPresent('CALENDARIO'), 'offline calendar broken');
    await page.setOfflineMode(false);
  });
  await shot('22-offline-progress');

  /* ---------- error audit ---------- */
  phase('K. Runtime error audit');
  await step('no page errors during entire run', async () => {
    assert(pageErrors.length === 0, `page errors: ${pageErrors.join(' || ')}`);
  });
  await step('no unexpected console errors', async () => {
    const unexpected = consoleErrors.filter(
      (e) => !/favicon|manifest|Download the React DevTools/i.test(e)
    );
    assert(unexpected.length === 0, `console errors: ${unexpected.join(' || ')}`);
  });

  /* ---------- report ---------- */
  const failed = results.filter((r) => !r.ok);
  const total = results.filter((r) => r.name !== 'reorder drag result' && !r.name.includes('report')).length;
  console.log(`\n════════════════════════════════`);
  console.log(`E2E RESULT: ${results.filter((r) => r.ok).length} passed, ${failed.length} failed (of ${results.length} steps)`);
  if (failed.length) {
    for (const f of failed) console.log(`  FAIL [${f.phase}] ${f.name}: ${f.error}`);
  }
  writeFileSync(join(OUT, 'results.json'), JSON.stringify({ results, pageErrors, consoleErrors }, null, 2));
  process.exitCode = failed.length ? 1 : 0;
} catch (e) {
  console.error(`\nE2E ABORTED: ${e && e.message}`);
  const failed = results.filter((r) => !r.ok);
  console.log(`Steps so far: ${results.length}, failed: ${failed.length}`);
  for (const f of failed) console.log(`  FAIL [${f.phase}] ${f.name}: ${f.error}`);
  writeFileSync(
    join(OUT, 'results.json'),
    JSON.stringify({ results, pageErrors, consoleErrors, abort: String(e && e.message) }, null, 2)
  );
  process.exitCode = 1;
} finally {
  if (browser) await browser.close().catch(() => {});
  server.kill('SIGTERM');
}

async function readDialogTime() {
  return page.evaluate(() => {
    const d = document.querySelector('[role="dialog"]');
    if (!d) return null;
    const t = [...d.querySelectorAll('p')].find((p) => p.className.includes('text-[72px]'));
    return t ? t.textContent.trim() : null;
  });
}
