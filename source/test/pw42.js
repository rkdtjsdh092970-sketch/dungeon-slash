const { chromium } = require('playwright');
(async () => {
  const br = await chromium.launch(); const pg = await br.newPage({ viewport: { width: 960, height: 540 } });
  const errs = []; pg.on('pageerror', e => errs.push('PE ' + e.message));
  await pg.goto('file:///home/claude/game/dist/game.html'); await pg.waitForTimeout(800);
  await pg.evaluate(() => { save = newSave(); save.tut.done = true; save.level = 90; save.endgame = true; save.slots = 4; save.skills.push(genSkill(save, 'gut', 1)); saveGame(); openTown(1); CX.tab = 'skill'; CX.skf = 'boss'; CX.sel = 'gut'; openCodex(); });
  await pg.waitForTimeout(400); await pg.screenshot({ path: '/tmp/sx.png' });
  console.log(await pg.evaluate(() => 'rows ' + document.querySelectorAll('.dexrow').length + ' dex ' + JSON.stringify(save.skdex)));
  console.log(errs.join('\n') || 'no errors'); await br.close();
})();
