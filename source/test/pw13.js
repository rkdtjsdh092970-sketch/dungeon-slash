const { chromium } = require('playwright');
(async () => {
  const br = await chromium.launch(); const pg = await br.newPage({ viewport: { width: 960, height: 540 } });
  const errs = []; pg.on('pageerror', e => errs.push('PE ' + e.message));
  await pg.goto('file:///home/claude/game/dist/game.html'); await pg.waitForTimeout(800);
  await pg.evaluate(() => { save = newSave(); save.tut.done = true; save.level = 60; save.slots = 4; save.cleared = [10,10,10,10,10,10,10,10,10,10]; for (const s of SLOTS) save.equipped[s] = genItem(save, 6, 2, s); openTown(1); });
  for (const act of [1, 5, 10]) {
    await pg.evaluate((a) => { Modal.close(true); startBattle({ kind: 'boss', act: a, stage: 10, name: 'b' }, {}); const b = G.battle; b.hp = b.maxHp = 1e9; b.hpM *= 1e4; b.plan = ['boss']; G.speed = 1; G.paused = false; }, act);
    await pg.waitForTimeout(3500); await pg.screenshot({ path: `/tmp/b${act}.png` });
  }
  console.log(errs.join('\n') || 'no errors'); await br.close();
})();
