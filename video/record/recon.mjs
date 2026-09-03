// Recon: dump DOM landmarks + WebMCP tool schemas for each route.
import { chromium } from 'playwright';

const BASE = 'https://agentready.prescalesystems.workers.dev';

const dumpPage = async (page, label) => {
  const info = await page.evaluate(() => {
    const pick = (el) => {
      if (!el) return null;
      return {
        tag: el.tagName.toLowerCase(),
        id: el.id || null,
        cls: (el.className && typeof el.className === 'string') ? el.className.slice(0, 120) : null,
        text: (el.textContent || '').trim().slice(0, 80),
      };
    };
    const sels = {};
    const tryAll = (name, sel, limit = 6) => {
      const els = [...document.querySelectorAll(sel)].slice(0, limit);
      if (els.length) sels[name] = { sel, count: document.querySelectorAll(sel).length, samples: els.map(pick) };
    };
    // generic landmarks
    tryAll('headings', 'h1, h2, h3', 10);
    tryAll('tables', 'table');
    tryAll('tableRows', 'table tbody tr', 8);
    tryAll('buttons', 'button', 20);
    tryAll('links', 'a[href]', 15);
    tryAll('textareas', 'textarea');
    tryAll('contenteditable', '[contenteditable]');
    tryAll('inputs', 'input');
    tryAll('articles', 'article', 8);
    tryAll('sections', 'section', 10);
    tryAll('dataTestIds', '[data-testid]', 20);
    tryAll('cards', '[class*="card" i]', 10);
    tryAll('rows', '[class*="row" i]', 10);
    tryAll('editor', '[class*="editor" i]', 5);
    tryAll('feed', '[class*="feed" i], [class*="activity" i], [class*="log" i]', 8);
    tryAll('cart', '[class*="cart" i]', 8);
    tryAll('product', '[class*="product" i]', 8);
    tryAll('spectrum', '[class*="spectrum" i]', 5);
    tryAll('scoreboard', '[class*="score" i], [class*="board" i], [class*="leader" i]', 8);
    // registry
    let tools = null;
    if (window.__webmcpRegistry) {
      tools = [...window.__webmcpRegistry.entries()].map(([name, t]) => ({
        name,
        description: (t.description || '').slice(0, 140),
        inputSchema: t.inputSchema,
      }));
    }
    return {
      title: document.title,
      bodyHeight: document.body.scrollHeight,
      sels,
      tools,
    };
  });
  console.log('\n================ ' + label + ' ================');
  console.log(JSON.stringify(info, null, 2));
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

for (const [label, path] of [
  ['HOME /', '/'],
  ['STORE /store', '/store'],
  ['LIVE /live', '/live'],
  ['SITE DETAIL /site/agentready-outfitters', '/site/agentready-outfitters'],
]) {
  await page.goto(BASE + path, { waitUntil: 'networkidle', timeout: 60000 }).catch(e => console.log(label, 'goto err', e.message));
  await page.waitForTimeout(3000);
  await dumpPage(page, label);
}

await browser.close();
