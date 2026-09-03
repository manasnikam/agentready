// AgentReady hackathon screen recorder.
// Usage: node record.mjs [hook|benchmark|copilot|store|all]
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = 'https://agentready.prescalesystems.workers.dev';
const RAW = path.join(__dirname, 'raw');
fs.mkdirSync(RAW, { recursive: true });

const CURSOR_SCRIPT = `
(() => {
  const make = () => {
    if (document.getElementById('__fakecursor')) return;
    const style = document.createElement('style');
    style.textContent = \`
      #__fakecursor {
        position: fixed; top: 0; left: 0; width: 22px; height: 22px;
        border-radius: 50%; background: rgba(255,255,255,0.85);
        border: 2px solid rgba(0,0,0,0.55);
        box-shadow: 0 2px 8px rgba(0,0,0,0.35);
        pointer-events: none; z-index: 2147483647;
        transform: translate(-50%,-50%);
        transition: width .12s, height .12s;
        will-change: left, top;
      }
      .__cursorpulse {
        position: fixed; border-radius: 50%; pointer-events: none;
        z-index: 2147483646; border: 3px solid rgba(59,130,246,0.9);
        transform: translate(-50%,-50%);
        animation: __pulse .55s ease-out forwards;
      }
      @keyframes __pulse {
        from { width: 22px; height: 22px; opacity: 1; }
        to   { width: 70px; height: 70px; opacity: 0; }
      }\`;
    document.head.appendChild(style);
    const c = document.createElement('div');
    c.id = '__fakecursor';
    c.style.left = '-100px'; c.style.top = '-100px';
    document.body.appendChild(c);
    window.addEventListener('mousemove', (e) => {
      c.style.left = e.clientX + 'px';
      c.style.top = e.clientY + 'px';
    }, { capture: true, passive: true });
    window.addEventListener('mousedown', (e) => {
      c.style.width = '16px'; c.style.height = '16px';
      const p = document.createElement('div');
      p.className = '__cursorpulse';
      p.style.left = e.clientX + 'px';
      p.style.top = e.clientY + 'px';
      document.body.appendChild(p);
      setTimeout(() => p.remove(), 700);
    }, { capture: true, passive: true });
    window.addEventListener('mouseup', () => {
      c.style.width = '22px'; c.style.height = '22px';
    }, { capture: true, passive: true });
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', make);
  } else { make(); }
})();`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const rnd = (a, b) => a + Math.random() * (b - a);

async function smoothScroll(page, totalDy, { step = 60, delay = 40 } = {}) {
  const n = Math.max(1, Math.round(Math.abs(totalDy) / step));
  const dy = totalDy / n;
  for (let i = 0; i < n; i++) {
    await page.mouse.wheel(0, dy);
    await sleep(delay + rnd(-8, 12));
  }
}

async function moveToEl(page, locator, { steps = 30, dx = 0, dy = 0 } = {}) {
  const box = await locator.boundingBox();
  if (!box) throw new Error('no bounding box for locator');
  const x = box.x + box.width / 2 + dx;
  const y = box.y + box.height / 2 + dy;
  await page.mouse.move(x, y, { steps });
  return { x, y };
}

async function humanClick(page, locator, opts = {}) {
  const { x, y } = await moveToEl(page, locator, opts);
  await sleep(rnd(350, 550));
  await page.mouse.down();
  await sleep(rnd(70, 110));
  await page.mouse.up();
  return { x, y };
}

async function callTool(page, name, args = {}) {
  return page.evaluate(async ({ name, args }) => {
    const t = window.__webmcpRegistry && window.__webmcpRegistry.get(name);
    if (!t) throw new Error('tool not found: ' + name);
    return await t.execute(args);
  }, { name, args });
}

async function showOverlay(page, title, text, highlight) {
  await page.evaluate(({ title, text, highlight }) => {
    const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    let html = esc(text);
    if (highlight) {
      const h = esc(highlight);
      html = html.split(h).join('<span style="background:rgba(250,204,21,0.35);color:#fde68a;border-radius:3px;padding:0 2px;">' + h + '</span>');
    }
    const el = document.createElement('div');
    el.id = '__toolresult';
    el.style.cssText = [
      'position:fixed', 'right:36px', 'bottom:36px', 'width:640px', 'max-height:560px',
      'overflow:hidden', 'z-index:2147483640', 'background:rgba(13,17,23,0.96)',
      'color:#c9d1d9', 'border:1px solid rgba(88,166,255,0.5)', 'border-radius:10px',
      'box-shadow:0 12px 40px rgba(0,0,0,0.5)',
      'font:13px/1.55 ui-monospace,SFMono-Regular,Menlo,monospace', 'padding:0',
      'opacity:0', 'transition:opacity .35s',
    ].join(';');
    el.innerHTML =
      '<div style="padding:10px 16px;border-bottom:1px solid rgba(88,166,255,0.3);color:#58a6ff;font-weight:600;">'
      + esc(title) + '</div>'
      + '<pre style="margin:0;padding:14px 16px;white-space:pre-wrap;word-break:break-word;max-height:500px;overflow:hidden;">'
      + html + '</pre>';
    document.body.appendChild(el);
    requestAnimationFrame(() => { el.style.opacity = '1'; });
  }, { title, text, highlight: highlight || null });
}

async function hideOverlay(page) {
  await page.evaluate(() => {
    const el = document.getElementById('__toolresult');
    if (el) { el.style.opacity = '0'; setTimeout(() => el.remove(), 400); }
  });
  await sleep(500);
}

function toolResultText(res) {
  try {
    if (res && res.content && Array.isArray(res.content)) {
      return res.content.map((c) => c.text || JSON.stringify(c)).join('\n');
    }
    if (typeof res === 'string') return res;
    return JSON.stringify(res, null, 2);
  } catch { return String(res); }
}

async function waitForRegistry(page) {
  await page.waitForFunction(
    () => window.__webmcpRegistry && window.__webmcpRegistry.size > 0,
    null, { timeout: 30000 },
  );
}

async function withScene(name, fn) {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    recordVideo: { dir: RAW, size: { width: 1920, height: 1080 } },
  });
  await context.addInitScript(CURSOR_SCRIPT);
  const page = await context.newPage();
  const t0 = Date.now();
  let err = null;
  try {
    await fn(page);
  } catch (e) {
    err = e;
  }
  const video = page.video();
  await context.close();
  await browser.close();
  const src = await video.path();
  const dst = path.join(RAW, name + '.webm');
  fs.renameSync(src, dst);
  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  if (err) {
    console.error(`[${name}] FAILED after ${secs}s:`, err.message);
    throw err;
  }
  console.log(`[${name}] recorded ${secs}s -> ${dst}`);
}

// ---------------------------------------------------------------- scenes

async function hook(page) {
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  await page.waitForSelector('table.scoreboard tbody tr');
  await page.mouse.move(960, 320, { steps: 25 });
  await sleep(3500); // hero headline
  await page.mouse.move(980, 500, { steps: 20 });
  await sleep(1200);
  // drift down through the readiness spectrum (page max scroll ~1000px)
  await smoothScroll(page, 280, { step: 40, delay: 75 });
  await sleep(2400); // rest on the spectrum
  await smoothScroll(page, 220, { step: 40, delay: 75 });
  await sleep(1800);
  // top row of scoreboard: AgentReady Outfitters 100/100 (row1 now ~y260)
  const topRow = page.locator('table.scoreboard tbody tr').first();
  await moveToEl(page, topRow, { steps: 35, dx: -260 });
  await sleep(1400);
  await moveToEl(page, topRow, { steps: 25, dx: 120 }); // across to the 100 pill
  await sleep(3200); // linger on the winner
  // glance further down the board
  await smoothScroll(page, 320, { step: 40, delay: 70 });
  await sleep(2400);
  // scroll partway back up
  await smoothScroll(page, -420, { step: 45, delay: 65 });
  await page.mouse.move(960, 430, { steps: 25 });
  await sleep(3200);
}

async function benchmark(page) {
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  await page.waitForSelector('table.scoreboard tbody tr');
  await sleep(2600);
  // ease down so the scoreboard sits mid-screen (rows start ~y713 on load)
  await smoothScroll(page, 320, { step: 40, delay: 65 });
  await sleep(1400);
  const topRow = page.locator('table.scoreboard tbody tr').first();
  await moveToEl(page, topRow, { steps: 35, dx: -280 });
  await sleep(2400); // hover the AgentReady Outfitters row
  // travel across the row over score / UI / WebMCP cells
  await moveToEl(page, topRow, { steps: 30, dx: 60 });
  await sleep(1400);
  await moveToEl(page, topRow, { steps: 22, dx: 260 });
  await sleep(1600);
  // click through to the detail page
  const detail = topRow.locator('a', { hasText: 'detail' }).first();
  await humanClick(page, detail);
  await page.waitForURL('**/site/agentready-outfitters', { timeout: 20000 });
  await page.waitForSelector('section.panel');
  await sleep(3000); // hero + readiness score (whole page fits in viewport)
  // readiness score panel
  const scorePanel = page.locator('section.panel', { hasText: 'Readiness score' }).first();
  await moveToEl(page, scorePanel, { steps: 30 });
  await sleep(2600);
  // the WebMCP delta: UI vs WebMCP success numbers
  const delta = page.locator('section.panel', { hasText: 'The WebMCP delta' }).first();
  await moveToEl(page, delta, { steps: 30, dy: -15 });
  await sleep(3200); // linger: 0% UI vs 100% WebMCP
  await moveToEl(page, delta, { steps: 22, dy: 25 });
  await sleep(2600);
  // failure breakdown
  const fail = page.locator('section.panel', { hasText: 'Why runs fail here' }).first();
  await moveToEl(page, fail, { steps: 28 });
  await sleep(3200);
  // run log to close out
  const runlog = page.locator('section.panel', { hasText: 'Run log' }).first();
  await moveToEl(page, runlog, { steps: 25 });
  await sleep(3400);
  // one last look at the delta numbers
  await moveToEl(page, delta, { steps: 28, dy: -10 });
  await sleep(3600);
}

const REPORT_MD = `# AgentReady Readiness Report — September 2026

## Headline
Agent-native commerce is no longer theoretical. Sites exposing WebMCP tools hit
**100% agent task success**; the same agents scraping raw UI stall at 40–60%.

## Scoreboard highlights
- **AgentReady Outfitters (live demo)** — 100/100. 0% success via raw UI, 100% via WebMCP.
- **Harbor & Page Books** — 100/100. UI success 60%, WebMCP 100%.
- **Loopset Fitness** — 55/100. No tool surface; agents time out in navigation loops.

## Where agents die on tool-less sites
1. timeout during multi-step checkout
2. ambiguous UI targets (duplicate buttons, icon-only controls)
3. popup interference and navigation loops

## Recommendation
Ship a WebMCP tool surface for the money path first: search -> cart -> checkout.
`;

async function copilot(page) {
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  await waitForRegistry(page);
  await sleep(3200);
  await page.mouse.move(950, 400, { steps: 20 });
  await sleep(800);
  // scroll down so the report panel is on screen before the draft lands
  const panel = page.locator('section.panel', { hasText: 'Readiness report' }).first();
  await smoothScroll(page, 1000, { step: 50, delay: 55 });
  await panel.scrollIntoViewIfNeeded();
  await sleep(2000);
  // agent drafts the report -> lands visibly in the editor
  await callTool(page, 'draft_readiness_report', { markdown: REPORT_MD });
  await sleep(3000); // let the draft render, viewer reads the panel
  const editor = page.locator('textarea.draft');
  await moveToEl(page, editor, { steps: 30, dy: -60 });
  await sleep(1500);
  // slowly read through the draft inside the editor
  for (let i = 0; i < 10; i++) {
    await page.evaluate((frac) => {
      const ta = document.querySelector('textarea.draft');
      ta.scrollTop = (ta.scrollHeight - ta.clientHeight) * frac;
    }, (i + 1) / 10);
    await sleep(420);
  }
  await sleep(1500);
  // human clicks in and edits
  await humanClick(page, editor, { dy: -40 });
  await page.evaluate(() => {
    const ta = document.querySelector('textarea.draft');
    ta.focus();
    ta.selectionStart = ta.selectionEnd = ta.value.length;
    ta.scrollTop = ta.scrollHeight;
  });
  await sleep(900);
  const HUMAN_EDIT = 'Priority: fix the checkout flow first — that\'s where agents die.';
  await page.keyboard.type('\n' + HUMAN_EDIT, { delay: 72 });
  await sleep(2500);
  // agent reads the human-edited draft back — show the payload on screen,
  // with the human's fresh sentence highlighted in the returned text
  const draftBack = await callTool(page, 'get_report_draft', {});
  let backText = toolResultText(draftBack);
  const idx = backText.indexOf('Priority: fix the checkout');
  if (idx > 400) backText = '…' + backText.slice(idx - 350);
  if (backText.length > 1500) backText = backText.slice(0, 1500) + '\n…';
  await showOverlay(page, 'agent → get_report_draft()  · reading the analyst\'s edits', backText, HUMAN_EDIT);
  await sleep(6500); // judge moment: agent reads back the sentence the human just typed
  await hideOverlay(page);
  await sleep(600);
  // agent keeps working: comparisons + failure analysis, logged in the activity feed
  const cmp = await callTool(page, 'compare_sites', { siteA: 'agentready-outfitters', siteB: 'loopset-fitness' });
  await sleep(1200);
  let cmpText = toolResultText(cmp);
  if (cmpText.length > 1100) cmpText = cmpText.slice(0, 1100) + '\n…';
  await showOverlay(page, 'agent → compare_sites({ siteA: "agentready-outfitters", siteB: "loopset-fitness" })', cmpText);
  await sleep(5000);
  await hideOverlay(page);
  await sleep(500);
  await callTool(page, 'get_failure_breakdown', { site: 'loopset-fitness' });
  await sleep(1800);
  await callTool(page, 'get_site_score', { site: 'agentready-outfitters' });
  await sleep(1200);
  // show the activity feed logging the calls
  const feed = page.locator('section.panel', { hasText: 'Agent activity on this page' }).first();
  await feed.scrollIntoViewIfNeeded();
  await sleep(600);
  await moveToEl(page, feed, { steps: 30 });
  await sleep(6000); // read the logged tool calls
  await smoothScroll(page, 200, { step: 40, delay: 55 });
  await sleep(2500);
  // end on the edited report
  await panel.scrollIntoViewIfNeeded();
  await sleep(500);
  await moveToEl(page, editor, { steps: 30, dy: 20 });
  await sleep(8000);
}

async function store(page) {
  await page.goto(BASE + '/store', { waitUntil: 'networkidle' });
  await waitForRegistry(page);
  await page.waitForSelector('article.product');
  await sleep(3000);
  // browse products
  await page.mouse.move(700, 450, { steps: 25 });
  await sleep(1000);
  const jacket = page.locator('article.product', { hasText: 'Ridge Shell Jacket' }).first();
  await moveToEl(page, jacket, { steps: 26 });
  await sleep(1500);
  await smoothScroll(page, 320, { step: 40, delay: 60 });
  await sleep(1200);
  const boots = page.locator('article.product', { hasText: 'Corvo Hiking Boots' }).first();
  await moveToEl(page, boots, { steps: 28 });
  await sleep(1800);
  await smoothScroll(page, -320, { step: 45, delay: 55 });
  await sleep(1000);
  // human adds Trail Pack by hand
  const pack = page.locator('article.product', { hasText: 'Trail Pack 28L' }).first();
  await moveToEl(page, pack, { steps: 26 });
  await sleep(1200);
  const addBtn = pack.locator('button', { hasText: 'Add to cart' });
  await humanClick(page, addBtn);
  await sleep(1600);
  // inspect the cart panel
  const cart = page.locator('section.cartbox');
  await cart.scrollIntoViewIfNeeded();
  await moveToEl(page, cart, { steps: 30 });
  await sleep(3000);
  // agent takes over: view cart, then add a different product via WebMCP
  const cartRes = await callTool(page, 'view_cart', {});
  let cartText = toolResultText(cartRes);
  if (cartText.length > 800) cartText = cartText.slice(0, 800) + '\n…';
  await showOverlay(page, 'agent → view_cart()  · respecting what the human already added', cartText);
  await sleep(4000);
  await hideOverlay(page);
  await sleep(400);
  const found = await callTool(page, 'search_products', { query: 'headlamp' });
  const foundStr = JSON.stringify(found);
  const idMatch = foundStr.match(/"id"\s*:\s*"([^"]+)"/) || foundStr.match(/\\"id\\":\\"([^\\"]+)\\"/);
  const headlampId = idMatch ? idMatch[1] : 'headlamp';
  await sleep(1500);
  await callTool(page, 'add_to_cart', { productId: headlampId, quantity: 1 });
  await sleep(3000); // cart visibly updates without a click
  await moveToEl(page, cart, { steps: 20, dy: 30 });
  await sleep(3000);
  // over to /live to see the logged tool calls
  await page.goto(BASE + '/live', { waitUntil: 'networkidle' });
  await page.waitForSelector('section.panel');
  await sleep(2800);
  await page.mouse.move(950, 500, { steps: 25 });
  const stream = page.locator('section.panel', { hasText: 'Event stream' }).first();
  await stream.scrollIntoViewIfNeeded();
  await moveToEl(page, stream, { steps: 28, dy: -40 });
  await sleep(3000);
  await smoothScroll(page, 300, { step: 35, delay: 65 });
  await sleep(2500);
  await moveToEl(page, stream, { steps: 22, dy: 40 });
  await sleep(2000);
  await smoothScroll(page, 250, { step: 35, delay: 65 });
  await sleep(3500);
}

async function liveaudit(page) {
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  await waitForRegistry(page);
  await sleep(2000);
  await page.mouse.move(960, 420, { steps: 25 });
  await sleep(800);
  // ONE authorized webmcp-mode audit of our own /store (runs: 1).
  // Schema: { url, slug, mode?, runs? } — no "name" property exists.
  const queued = await page.evaluate(async () => {
    const t = window.__webmcpRegistry.get('queue_live_audit');
    const run = t.execute({ url: '/store', slug: 'agentready-outfitters', mode: 'webmcp', runs: 1 });
    const timeout = new Promise((r) => setTimeout(() => r({ note: 'queue call still running after 25s (audit queued in background)' }), 25000));
    try { return await Promise.race([run, timeout]); }
    catch (e) { return { error: String(e && e.message || e) }; }
  });
  let qText = toolResultText(queued);
  if (qText.length > 900) qText = qText.slice(0, 900) + '\n…';
  await showOverlay(page, 'agent → queue_live_audit({ url: "/store", slug: "agentready-outfitters", mode: "webmcp", runs: 1 })', qText);
  await sleep(4000);
  await hideOverlay(page);
  // straight to /live to watch the audit's tool calls stream in
  await page.goto(BASE + '/live', { waitUntil: 'networkidle' });
  await page.waitForSelector('section.panel');
  await sleep(2000);
  const stream = page.locator('section.panel', { hasText: 'Event stream' }).first();
  await stream.scrollIntoViewIfNeeded();
  await moveToEl(page, stream, { steps: 28, dy: -60 });
  await sleep(3000);
  await smoothScroll(page, 250, { step: 35, delay: 60 });
  await sleep(4000);
  await smoothScroll(page, -150, { step: 35, delay: 60 });
  await sleep(5000);
  await smoothScroll(page, 200, { step: 30, delay: 65 });
  await sleep(5000);
  // back on / to read the audit results via the registry
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  await waitForRegistry(page);
  await sleep(1200);
  const results = await callTool(page, 'get_live_audit_results', { slug: 'agentready-outfitters' });
  let rText = toolResultText(results);
  if (rText.length > 1200) rText = rText.slice(0, 1200) + '\n…';
  await showOverlay(page, 'agent → get_live_audit_results({ slug: "agentready-outfitters" })', rText);
  await sleep(6000);
  await hideOverlay(page);
  await sleep(1500);
}

// ---------------------------------------------------------------- main

const scenes = { hook, benchmark, copilot, store, liveaudit };
const which = process.argv[2] || 'all';
const list = which === 'all' ? Object.keys(scenes) : [which];
for (const name of list) {
  if (!scenes[name]) { console.error('unknown scene', name); process.exit(1); }
  await withScene(name, scenes[name]);
}
console.log('done');
