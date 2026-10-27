const { chromium } = require('playwright');
(async () => {
  const br = await chromium.launch(); const pg = await br.newPage({ viewport: { width: 960, height: 540 } });
  const errs = []; pg.on('pageerror', e => errs.push('PE ' + e.message));
  await pg.goto('file:///home/claude/game/dist/game.html'); await pg.waitForTimeout(800);
  await pg.evaluate(() => { save = newSave(); save.tut.done = true; save.level = 60; save.cleared = [10,10,10,10,10,10,10,10,10,10]; for (let i = 0; i < 40; i++) save.inv.push(genItem(save, 1 + i % 8, i % 4, SLOTS[i % SLOTS.length])); openTown(1); CX.sel = null; openCodex(); });
  const info = await pg.evaluate(() => { const els = [...document.querySelectorAll('#mbox *')].filter(e => e.scrollHeight > e.clientHeight + 20 && getComputedStyle(e).overflowY !== 'visible'); els.forEach(e => e.scrollTop = 150); return els.map(e => e.className + ':' + e.scrollTop); });
  console.log('scrollable', info);
  const it = await pg.$('#mbox [data-a=cxpick]:nth-of-type(12)'); if (it) { await it.click(); await pg.waitForTimeout(200); }
  console.log('after click', await pg.evaluate(() => [...document.querySelectorAll('#mbox *')].filter(e => e.scrollTop > 0).map(e => e.className + ':' + e.scrollTop)));
  await pg.evaluate(() => { IB.mode = 'inv'; renderItems(); openBulk(); });
  await pg.screenshot({ path: '/tmp/bulk.png' });
  console.log(errs.join('\n') || 'no errors'); await br.close();
})();
