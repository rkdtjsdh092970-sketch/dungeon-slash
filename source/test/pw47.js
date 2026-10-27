const { chromium } = require('playwright');
(async () => {
  const br = await chromium.launch(); const pg = await br.newPage({ viewport: { width: 960, height: 540 } });
  const errs = []; pg.on('pageerror', e => errs.push('PE ' + e.message));
  await pg.goto('file:///home/claude/game/dist/game.html'); await pg.waitForTimeout(800);
  await pg.evaluate(() => { save = newSave(); save.tut.done = true; save.level = 60; openTown(1); CX.tab = 'fml'; openCodex(); });
  await pg.waitForTimeout(300); await pg.screenshot({ path: '/tmp/fm1.png' });
  await pg.evaluate(() => { document.querySelector('.fwrap').parentElement.scrollTop = 500; }); await pg.waitForTimeout(150); await pg.screenshot({ path: '/tmp/fm2.png' });
  console.log(await pg.evaluate(() => 'undefined/NaN in text: ' + /undefined|NaN/.test(document.querySelector('.fwrap').textContent)));
  console.log(errs.join('\n') || 'no errors'); await br.close();
})();
