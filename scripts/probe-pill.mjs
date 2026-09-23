/* Probe pill geometry over time under E2E-like conditions */
import puppeteer from 'puppeteer-core';
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync, rmSync } from 'node:fs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(root, 'qa-output');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 4174;
const BASE = `http://localhost:${PORT}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const server = spawn(join(root, 'node_modules/.bin/vite'), ['preview', '--port', String(PORT), '--strictPort'], {
  cwd: root, stdio: 'ignore',
});
await sleep(2500);

const profile = join(OUT, 'probe-profile');
try { rmSync(profile, { recursive: true, force: true }); } catch {}
mkdirSync(profile, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--no-first-run', '--disable-features=TranslateUI'],
  userDataDir: profile,
});
const page = await browser.newPage();
await page.setViewport({ width: 393, height: 852, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await page.goto(BASE + '/', { waitUntil: 'networkidle0' });
await sleep(800);

const clickText = async (t) => {
  await page.evaluate((txt) => {
    const els = [...document.querySelectorAll('button, a')];
    const el = els.find((e) => (e.innerText || '').includes(txt) && e.offsetParent !== null);
    if (el) el.click();
  }, t);
  await sleep(700);
};
const clickAria = async (p) => {
  await page.evaluate((part) => {
    const el = [...document.querySelectorAll('[aria-label]')].find((e) =>
      e.getAttribute('aria-label').includes(part)
    );
    if (el) el.click();
  }, p);
  await sleep(450);
};

// Replicate E2E: start workout, open Chest Press, complete nothing,
// then (like step 12-13) reload, then start timer (phase C)
await clickText('INIZIA WORKOUT');
await clickText('Chest Press');
await page.reload({ waitUntil: 'networkidle0' });
await sleep(1200);

const rm = await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
console.log('prefers-reduced-motion:', rm);

await clickAria('2:00 recupero');

for (let i = 0; i < 40; i++) {
  const info = await page.evaluate(() => {
    const el = document.querySelector('[aria-label*="Apri timer"]');
    if (!el) return { t: 'missing' };
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return {
      h: r.height, w: r.width,
      offsetH: el.offsetHeight,
      transform: cs.transform,
      minH: cs.minHeight,
    };
  });
  console.log(i * 200 + 'ms', JSON.stringify(info));
  if (info.transform === 'none' || info.h >= 44) { /* keep a couple more samples */ }
  await sleep(200);
}

await browser.close();
server.kill();
process.exit(0);
