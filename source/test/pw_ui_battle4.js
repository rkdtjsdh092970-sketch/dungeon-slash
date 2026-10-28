const { chromium } = require('playwright');
(async () => {
  const br = await chromium.launch(); const pg = await br.newPage({ viewport: { width: 960, height: 540 } });
  const errs = []; pg.on('pageerror', e => errs.push('PE ' + e.message + ' ' + (e.stack || '').split('\n')[1])); pg.on('console', m => { if (m.type() === 'error') errs.push('CE ' + m.text()); });
  await pg.goto('file:///home/claude/game/dist/game.html'); await pg.waitForTimeout(600);
  await pg.evaluate(() => { save = newSave(); save.tut.done = true; save.slots = 4; save.cleared = [5]; save.endgame = true; save.lanesBase = 3; save.level = 1; for (const id of ['smash', 'lance', 'chain']) { const k = genSkill(save, id, 0); save.skills.push(k); save.loadout[save.loadout.findIndex((l, i) => !l && i > 0)] = { uid: k.uid, rule: 'auto' }; } G.townAct = 1; showScreen('town'); refreshTop(); G.riftTier = 1; MapView.sel = MAP.byId['R']; mapGo(); });
  await pg.waitForTimeout(3500); await pg.screenshot({ path: '/tmp/v4_battle.png' });
  await pg.evaluate(() => { G.speed = 8; }); 
  for (let i = 0; i < 60; i++) { await pg.waitForTimeout(1000); const done = await pg.evaluate(() => !!document.querySelector('.rs')); if (done) break; }
  await pg.waitForTimeout(800); await pg.screenshot({ path: '/tmp/v4_result.png' });
  console.log(errs.join('\n') || 'no errors'); await br.close();
})();
