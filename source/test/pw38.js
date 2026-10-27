const { chromium } = require('playwright');
(async () => {
  const br = await chromium.launch(); const pg = await br.newPage({ viewport: { width: 960, height: 540 } });
  const errs = []; pg.on('pageerror', e => errs.push('PE ' + e.message));
  await pg.goto('file:///home/claude/game/dist/game.html'); await pg.waitForTimeout(800);
  await pg.evaluate(() => { save = newSave(); save.tut.done = true; save.endgame = true; save.level = 90; save.slots = 4; save.cleared = Array(10).fill(10); save.rift.best = 30; save.keys2 = 2; save.skills.push(genSkill(save,'bomb',0)); save.loadout[1] = { uid: save.skills[save.skills.length-1].uid, rule: 'front' }; openMap(10); });
  await pg.waitForTimeout(500);
  await pg.evaluate(() => { MapView.sel = MAP.byId["RH"]; mapPanel(); }); await pg.waitForTimeout(200);
  await pg.screenshot({ path: '/tmp/hv1.png' });
  await pg.click('[data-p="go"]'); await pg.waitForTimeout(9000);
  await pg.screenshot({ path: '/tmp/hv2.png' });
  console.log(await pg.evaluate(() => 'keys2 ' + save.keys2 + ' screen ' + (G.screen || '') ));
  console.log(errs.join('\n') || 'no errors'); await br.close();
})();
