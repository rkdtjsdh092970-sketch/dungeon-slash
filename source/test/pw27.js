const { chromium } = require('playwright');
(async () => {
  const br = await chromium.launch(); const pg = await br.newPage({ viewport: { width: 960, height: 540 } });
  const errs = []; pg.on('pageerror', e => errs.push('PE ' + e.message));
  await pg.goto('file:///home/claude/game/dist/game.html'); await pg.waitForTimeout(800);
  await pg.evaluate(() => { save = newSave(); save.tut.done = true; save.level = 40; save.cleared = [10,10,10,10,10,10,10,10,10,10]; openTown(1); });
  await pg.waitForTimeout(900); await pg.screenshot({ path: '/tmp/n1.png' });
  await pg.evaluate(() => townClick(TOWN_SPOTS.find(s => s.id === 'notice'))); await pg.waitForTimeout(300); await pg.screenshot({ path: '/tmp/n2.png' });
  console.log('seen:', await pg.evaluate(() => save.notesSeen));
  console.log(errs.join('\n') || 'no errors'); await br.close();
})();
