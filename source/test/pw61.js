const { chromium } = require('playwright');
(async () => {
  const br = await chromium.launch(); const pg = await br.newPage({ viewport: { width: 960, height: 540 } });
  const errs = []; pg.on('pageerror', e => errs.push('PE ' + e.message));
  await pg.goto('file:///home/claude/game/dist/game.html'); await pg.waitForTimeout(900);
  await pg.evaluate(() => { save = newSave(); save.tut.done = true; save.level = 100; window._done = 0; window._items = [genUnique(save, UNIQUE_BY_ID['halo'] || UNIQUES[0], 12), genUnique(save, UNIQUES.find(u => u.tier === 2), 12)]; openTown(1); save.auto.on = true; showUniqueFx(window._items, () => { window._done = Date.now(); }); window._t0 = Date.now(); });
  await pg.waitForTimeout(1000); await pg.screenshot({ path: '/tmp/ufx.png' });
  await pg.waitForTimeout(9000);
  console.log('자동 모드: 2개 연출 후 종료까지', await pg.evaluate(() => window._done ? ((window._done - window._t0) / 1000).toFixed(1) + 's' : '미종료'), '| hidden', await pg.evaluate(() => $("#unique").classList.contains("hidden")));
  await pg.evaluate(() => { save.auto.on = false; window._done = 0; window._t0 = Date.now(); showUniqueFx([window._items[1]], () => { window._done = Date.now(); }); });
  await pg.waitForTimeout(6500);
  console.log('수동 모드(1개):', await pg.evaluate(() => window._done ? ((window._done - window._t0) / 1000).toFixed(1) + 's' : '미종료'));
  console.log(errs.join('\n') || 'no errors'); await br.close();
})();
