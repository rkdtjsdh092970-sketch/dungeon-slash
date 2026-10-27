const { chromium } = require('playwright');
(async () => {
  const br = await chromium.launch(); const pg = await br.newPage({ viewport: { width: 960, height: 540 } });
  const errs = []; pg.on('pageerror', e => errs.push('PE ' + e.message));
  await pg.goto('file:///home/claude/game/dist/game.html'); await pg.waitForTimeout(800);
  await pg.evaluate(() => { CFG.PROTO_MULT = 4000; save = newSave(); save.tut.done = true; save.level = 60; save.slots = 4; save.endgame = true; save.lanesBase = 3; save.cleared = [10,10,10,10,10,10,10,10,10,10]; for (const s of SLOTS) save.equipped[s] = genItem(save, 6, 2, s); openTown(1); startBattle({ kind: 'endless', act: 10, tier: 1, name: 'endless' }, {}); const b = G.battle; b.hpM *= 1e-4; b.hp = b.maxHp = 1e12; b.time = 1300; G.speed = 3; });
  for (let i = 0; i < 8; i++) { await pg.waitForTimeout(1500); console.log(await pg.evaluate(() => { const b = G.battle; return JSON.stringify({ over: b.over, endT: b.endT && +b.endT.toFixed(1), next: !!b.next, fin: b.fin, resultAt: b.resultAt, pend: !!G.pending, modal: !$('#modal').classList.contains('hidden'), uniq: $('#unique').className, items: G.pending && G.pending[0].items.length }); })); }
  console.log(errs.join('\n') || 'no errors'); await br.close();
})();
