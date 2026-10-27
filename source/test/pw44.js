const { chromium } = require('playwright');
(async () => {
  const br = await chromium.launch(); const pg = await br.newPage({ viewport: { width: 960, height: 540 } });
  const errs = []; pg.on('pageerror', e => errs.push('PE ' + e.message));
  await pg.goto('file:///home/claude/game/dist/game.html'); await pg.waitForTimeout(800);
  await pg.evaluate(() => { save = newSave(); save.tut.done = true; save.level = 60; openTown(1); openItems('inv'); });
  await pg.waitForTimeout(300);
  console.log(await pg.evaluate(() => [...document.querySelectorAll('.doll .eqs')].map(e => e.textContent.trim() || e.className).join(' | ')));
  await pg.screenshot({ path: '/tmp/doll.png' });
  console.log(errs.join('\n') || 'no errors'); await br.close();
})();
