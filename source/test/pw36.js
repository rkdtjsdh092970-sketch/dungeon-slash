const { chromium } = require('playwright');
(async () => {
  const br = await chromium.launch(); const pg = await br.newPage({ viewport: { width: 960, height: 540 } });
  const errs = []; pg.on('pageerror', e => errs.push('PE ' + e.message));
  await pg.goto('file:///home/claude/game/dist/game.html'); await pg.waitForTimeout(800);
  await pg.evaluate(() => { save = newSave(); save.tut.done = true; save.level = 60; save.cleared = [10,10,10,10,10,10,10,10,10,10]; openTown(1); openPassives(); });
  await pg.waitForTimeout(400); await pg.screenshot({ path: '/tmp/pt1.png' });
  await pg.evaluate(() => { PT.sc = 0.5; PT.ox = 0; PT.oy = -150; });
  await pg.waitForTimeout(300); await pg.screenshot({ path: '/tmp/pt2.png' });
  console.log(errs.join('\n') || 'no errors'); await br.close();
})();
