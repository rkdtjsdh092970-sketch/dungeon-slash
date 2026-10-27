const { chromium } = require('playwright');
(async () => {
  const br = await chromium.launch(); const pg = await br.newPage({ viewport: { width: 960, height: 540 } });
  const errs = []; pg.on('pageerror', e => errs.push('PE ' + e.message));
  await pg.goto('file:///home/claude/game/dist/game.html'); await pg.waitForTimeout(800);
  await pg.evaluate(() => { save = newSave(); save.tut.done = true; save.endgame = true; save.level = 90; save.dice = 2;
    const u = genUnique(save, UNIQUE_BY_ID['moltenblade'], 10); u.rarity = 5; save.inv.push(u); save.inv.push(genItem(save, 12, 3, 'weapon'));
    window._before = JSON.stringify(u.umods); window._u = u; openTown(1); openItems('forge'); });
  await pg.waitForTimeout(300);
  await pg.evaluate(() => { IB.sel = window._u; renderItems(); }); await pg.waitForTimeout(200);
  await pg.screenshot({ path: '/tmp/dc1.png' });
  await pg.click('[data-a="dice"]'); await pg.waitForTimeout(300);
  console.log(await pg.evaluate(() => 'dice ' + save.dice + ' changed ' + (window._before !== JSON.stringify(window._u.umods))));
  await pg.evaluate(() => { IB.sel = save.inv[1]; renderItems(); }); await pg.waitForTimeout(200);
  await pg.screenshot({ path: '/tmp/dc2.png' });
  console.log(errs.join('\n') || 'no errors'); await br.close();
})();
