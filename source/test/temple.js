const { chromium } = require('playwright');
(async () => { const br = await chromium.launch(); const pg = await br.newPage({ viewport: { width: 1000, height: 640 } }); const errs = [];
  pg.on('pageerror', (e) => errs.push('PE ' + e.message)); pg.on('console', (m) => { if (m.type() === 'error') errs.push('CE ' + m.text()); });
  await pg.goto('file:///home/claude/game/dist/game.html'); await pg.waitForTimeout(800);
  await pg.evaluate(() => { save = newSave(); save.tut.done = true; save.cleared = Array(10).fill(5); save.endgame = true; save.graduated = 1; save.level = 100; save.rift.best = 100; save.raid = { cleared: 0, best: 0 }; openMap(10); });
  await pg.waitForTimeout(400);
  console.log('locked:', await pg.evaluate(() => { const n = MAP.nodes.find((x) => x.kind === 'temple'); return { found: !!n, unlocked: nodeUnlocked(save, n) }; }));
  await pg.evaluate(() => openTemple()); await pg.waitForTimeout(500); await pg.screenshot({ path: '/tmp/temple_locked.png' });
  console.log('go disabled:', await pg.evaluate(() => document.querySelector('.bh-go').disabled));
  await pg.evaluate(() => { Modal.close(true); save.raid.cleared = 1; openTemple(); }); await pg.waitForTimeout(500); await pg.screenshot({ path: '/tmp/temple_open.png' });
  await pg.click('.bh-go'); await pg.waitForTimeout(2500); await pg.screenshot({ path: '/tmp/temple_battle.png' });
  console.log('battle:', JSON.stringify(await pg.evaluate(() => ({ screen: G.screen, kind: G.battle && G.battle.kind, lanes: G.battle && G.battle.lanes, enemies: G.battle && G.battle.enemies.map((e) => (e.def && e.def.name) + ':' + e.type).slice(0, 6) }))));
  // fast-forward to completion
  const r = await pg.evaluate(() => { const b = G.battle; let t = 0; while (!b.over && t < 900) { stepBattle(b, 0.1); t += 0.1; } return { over: b.over, win: b.win, time: Math.round(b.time), kills: b.kills }; });
  console.log('result', JSON.stringify(r)); await pg.waitForTimeout(2500); await pg.screenshot({ path: '/tmp/temple_result.png' });
  console.log('stones', JSON.stringify(await pg.evaluate(() => ({ n: save.stones.length, hi: save.stones.filter((s) => s.hi).length, gold: save.gold }))));
  console.log(errs.join('\n') || 'no errors'); await br.close(); })();
