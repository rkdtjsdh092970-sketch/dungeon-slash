const { chromium } = require('playwright');
(async () => {
  const br = await chromium.launch(); const pg = await br.newPage({ viewport: { width: 960, height: 540 } });
  const errs = []; pg.on('pageerror', e => errs.push('PE ' + e.message));
  await pg.goto('file:///home/claude/game/dist/game.html'); await pg.waitForTimeout(800);
  const ms = await pg.evaluate(() => { save = newSave(); save.tut.done = true; save.level = 60; save.slots = 4; save.endgame = true; for (const s of SLOTS) save.equipped[s] = genItem(save, 8, 3, s); for (const id of ['bomb', 'chain', 'storm']) save.skills.push(genSkill(save, id, 1)); save.loadout = [0,1,2,3].map((i) => ({ uid: save.skills[i].uid, rule: 'auto' })); for (let i = 0; i < 150; i++) save.inv.push(genItem(save, 8, i % 5, SLOTS[i % SLOTS.length])); openTown(1); const t = performance.now(); IB.mode = 'inv'; renderItems(); const a = performance.now() - t; IB.sort = 'up'; const t2 = performance.now(); renderItems(); return [Math.round(a), Math.round(performance.now() - t2)]; });
  console.log('render ms (default, sort=up):', ms); console.log(errs.join('\n') || 'no errors'); await br.close();
})();
