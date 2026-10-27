const { chromium } = require('playwright');
(async () => {
  const br = await chromium.launch(); const pg = await br.newPage({ viewport: { width: 960, height: 540 } });
  const errs = []; pg.on('pageerror', e => errs.push('PE ' + e.message)); pg.on('console', m => { if (m.type() === 'error' && !/Failed to load|net::ERR/.test(m.text())) errs.push('CE ' + m.text()); });
  await pg.goto('file:///home/claude/game/dist/game.html'); await pg.waitForTimeout(800);
  await pg.evaluate(() => { CFG.PROTO_MULT = 4000; save = newSave(); save.tut.done = true; save.level = 60; save.slots = 4; save.endgame = true; save.lanesBase = 3; save.cleared = [3,0,0,0,0,0,0,0,0,0]; save.keys = 5; for (const s of SLOTS) save.equipped[s] = genItem(save, 6, 2, s); openTown(1); });
  const nodes = [{kind:'stage',act:1,stage:2},{kind:'boss',act:1,stage:10},{kind:'stage',act:2,stage:1},{kind:'elite',act:1,stage:5,need:0},{kind:'treasure',act:1,stage:5,need:0},{kind:'rift',act:10,tier:3},{kind:'hell',act:10,tier:3},{kind:'endless',act:10,tier:1},{kind:'void',act:10,tier:1},{kind:'trial',act:10,tier:2},{kind:'boss',act:1,stage:10}];
  for (const [i, n] of nodes.entries()) {
    await pg.evaluate((n) => { Modal.close(true); n.name = n.kind; startBattle(n, {}); const b = G.battle; b.hpM *= 1e-4; b.hp = b.maxHp = 1e12; if (b.plan.length > 6) b.plan.length = 6; if (n.kind === 'endless') b.time = 1300; G.speed = 3; G.paused = false; }, n);
    let ok = false;
    for (let k = 0; k < 120 && !ok; k++) {
      await pg.waitForTimeout(250);
      ok = await pg.evaluate(() => !!document.querySelector('#mbox [data-a=ok]') && !$('#modal').classList.contains('hidden'));
      const u = await pg.evaluate(() => !$('#unique').classList.contains('hidden'));
      if (u) { await pg.mouse.click(480, 270); await pg.waitForTimeout(300); }
    }
    console.log(i, n.kind, ok ? 'result ok' : 'STUCK', await pg.evaluate(() => JSON.stringify({ over: G.battle && G.battle.over, endT: G.battle && G.battle.endT, next: G.battle && !!G.battle.next, pend: !!G.pending })));
    if (!ok) break;
    await pg.click('#mbox [data-a=ok]'); await pg.waitForTimeout(300);
  }
  console.log(errs.slice(0, 6).join('\n') || 'no errors'); await br.close();
})();
