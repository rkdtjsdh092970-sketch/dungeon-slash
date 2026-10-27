const { chromium } = require('playwright');
(async () => {
  const br = await chromium.launch(); const pg = await br.newPage({ viewport: { width: 960, height: 540 } });
  const errs = []; pg.on('pageerror', e => errs.push('PE ' + e.message));
  await pg.goto('file:///home/claude/game/dist/game.html'); await pg.waitForTimeout(800);
  await pg.evaluate(() => { save = newSave(); save.tut.done = true; save.endgame = true; save.level = 90; save.cleared = Array(10).fill(10); save.keys = 3; save.keys2 = 3; save.rift.best = 50; openMap(10); });
  await pg.waitForTimeout(400);
  for (const id of ["RV", "RH"]) {
    await pg.evaluate((i) => { MapView.sel = MAP.byId[i]; mapPanel(); }, id);
    await pg.click(id === "RV" ? '[data-p="vsp"]' : '[data-p="hsp"]'); await pg.click(id === "RV" ? '[data-p="vsp"]' : '[data-p="hsp"]');
    await pg.screenshot({ path: '/tmp/st_' + id + '.png' });
  }
  await pg.click('[data-p="go"]'); await pg.waitForTimeout(1500);
  console.log(await pg.evaluate(() => 'battle ' + (B && B.node && B.node.name) + ' keys2 ' + save.keys2));
  console.log(errs.join('\n') || 'no errors'); await br.close();
})();
