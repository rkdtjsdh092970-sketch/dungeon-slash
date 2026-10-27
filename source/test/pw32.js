const { chromium } = require('playwright');
(async () => {
  const br = await chromium.launch(); const pg = await br.newPage({ viewport: { width: 960, height: 540 } });
  const errs = []; pg.on('pageerror', e => errs.push('PE ' + e.message));
  await pg.goto('file:///home/claude/game/dist/game.html'); await pg.waitForTimeout(800);
  await pg.evaluate(() => { save = newSave(); save.tut.done = true; save.level = 60; save.cleared = [10,10,10,10,10,10,10,10,10,10]; openTown(1); openSettings(); });
  await pg.waitForTimeout(300); await pg.screenshot({ path: '/tmp/set.png' });
  await pg.selectOption('[data-i=arule][data-r="1"]', 'dis'); console.log('rule:', await pg.evaluate(() => JSON.stringify(save.auto.rules)));
  console.log(errs.join('\n') || 'no errors'); await br.close();
})();
