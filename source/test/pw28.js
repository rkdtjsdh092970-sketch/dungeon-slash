const { chromium } = require('playwright');
(async () => {
  const br = await chromium.launch(); const pg = await br.newPage({ viewport: { width: 960, height: 540 } });
  const errs = []; pg.on('pageerror', e => errs.push('PE ' + e.message));
  await pg.goto('file:///home/claude/game/dist/game.html'); await pg.waitForTimeout(800);
  await pg.evaluate(() => { save = newSave(); save.tut.done = true; save.level = 60; save.slots = 4; save.endgame = true; save.cleared = [10,10,10,10,10,10,10,10,10,10]; for (const s of SLOTS) save.equipped[s] = genItem(save, 8, 3, s); for (const id of ['bomb', 'chain', 'storm']) save.skills.push(genSkill(save, id, 1)); save.loadout = [0,1,2,3].map((i) => ({ uid: save.skills[i].uid, rule: 'auto' })); openTown(1); openStats(); });
  await pg.waitForTimeout(300); await pg.screenshot({ path: '/tmp/st.png' });
  console.log(errs.join('\n') || 'no errors'); await br.close();
})();
