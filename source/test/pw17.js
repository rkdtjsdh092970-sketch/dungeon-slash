const { chromium } = require('playwright');
(async () => {
  const br = await chromium.launch(); const pg = await br.newPage({ viewport: { width: 960, height: 540 } });
  const errs = []; pg.on('pageerror', e => errs.push('PE ' + e.message)); pg.on('console', m => { if (m.type() === 'error' && !/Failed to load|net::ERR/.test(m.text())) errs.push('CE ' + m.text()); });
  await pg.goto('file:///home/claude/game/dist/game.html'); await pg.waitForTimeout(800);
  await pg.evaluate(() => { save = newSave(); save.tut.done = true; save.level = 20; save.exp = 50; save.slots = 3; save.cleared = [10,10,10,10,10,10,10,10,10,10]; for (const s of SLOTS) save.equipped[s] = genItem(save, 6, 2, s); for (let i = 0; i < 6; i++) save.inv.push(genItem(save, 4, i % 4, SLOTS[i % SLOTS.length])); openTown(1); startBattle({ kind: 'stage', act: 1, stage: 3, name: '초원 3' }, {}); const b = G.battle; b.plan.length = 4; G.speed = 3; });
  await pg.waitForTimeout(1200); await pg.screenshot({ path: '/tmp/e0.png' });
  await pg.waitForFunction(() => G.battle && G.battle.over, null, { timeout: 60000 }); await pg.waitForTimeout(500); await pg.screenshot({ path: '/tmp/e1.png' });
  await pg.waitForTimeout(1500); await pg.screenshot({ path: '/tmp/e2.png' });
  await pg.waitForFunction(() => !$('#modal').classList.contains('hidden'), null, { timeout: 10000 }); await pg.waitForTimeout(2200); await pg.screenshot({ path: '/tmp/e3.png' });
  console.log(errs.join('\n') || 'no errors'); await br.close();
})();
