const { chromium } = require('playwright');
(async () => {
  const br = await chromium.launch(); const pg = await br.newPage({ viewport: { width: 960, height: 540 } });
  const errs = []; pg.on('pageerror', e => errs.push('PE ' + e.message));
  await pg.goto('file:///home/claude/game/dist/game.html'); await pg.waitForTimeout(800);
  await pg.evaluate(() => { save = newSave(); save.tut.done = true; save.level = 60; save.slots = 4; save.endgame = true; save.lanesBase = 3; save.cleared = [10,10,10,10,10,10,10,10,10,10]; for (const s of SLOTS) save.equipped[s] = genItem(save, 6, 2, s); openTown(1); startBattle({ kind: 'rift', act: 10, tier: 3, name: 'rift' }, {}); const b = G.battle; b.hpM *= 1e-4; b.hp = b.maxHp = 1e12; if (b.plan.length > 6) b.plan.length = 6; G.speed = 3; G.paused = false; });
  await pg.waitForTimeout(8000);
  console.log(await pg.evaluate(() => { const b = G.battle; return JSON.stringify({ over: b.over, plan: b.plan.length, en: b.enemies.length, ev: b.events.length, time: b.time, hp: b.hp, tip: G.tipOpen, paused: G.paused, modal: !$('#modal').classList.contains('hidden'), enemies: b.enemies.map(e => [e.type, e.col, e.lane, Math.round(e.hp)]).slice(0, 5) }); }));
  console.log(errs.join('\n') || 'no errors'); await br.close();
})();
