const { chromium } = require('playwright');
(async () => {
  const br = await chromium.launch(); const pg = await br.newPage({ viewport: { width: 960, height: 540 } });
  const errs = []; pg.on('pageerror', e => errs.push('PE ' + e.message));
  await pg.goto('file:///home/claude/game/dist/game.html'); await pg.waitForTimeout(800);
  await pg.evaluate(() => { save = newSave(); save.tut.done = true; save.level = 60; save.cleared = [10,10,10,10,10,10,10,10,10,10]; openTown(3); });
  await pg.waitForTimeout(600); await pg.screenshot({ path: '/tmp/town.png' });
  console.log(errs.join('\n') || 'no errors'); await br.close();
})();
