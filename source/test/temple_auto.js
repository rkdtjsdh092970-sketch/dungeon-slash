const { chromium } = require('playwright');
(async () => { const br = await chromium.launch(); const pg = await br.newPage({ viewport: { width: 1000, height: 640 } }); const errs = [];
  pg.on('pageerror', (e) => errs.push('PE ' + e.message)); pg.on('console', (m) => { if (m.type() === 'error') errs.push('CE ' + m.text()); });
  await pg.goto('file:///home/claude/game/dist/game.html'); await pg.waitForTimeout(800);
  await pg.evaluate(() => { save = newSave(); save.tut.done = true; save.cleared = Array(10).fill(5); save.endgame = true; save.graduated = 1; save.level = 100; save.rift.best = 100; save.raid = { cleared: 1, best: 100 }; save.gold = 0; openMap(10); openTemple(); });
  await pg.waitForTimeout(400); await pg.click('.bh-go'); await pg.waitForTimeout(1200);
  await pg.evaluate(() => { const b = G.battle; b.inv = 1e9; b.hp = b.maxHp = 1e12; let t = 0; while (!b.over && t < 900) { stepBattle(b, 0.1); t += 0.1; } });
  for (let i = 0; i < 40; i++) { await pg.waitForTimeout(400); if (await pg.evaluate(() => !!document.querySelector('#mbox [data-a="ok"]'))) break; }
  console.log('result buttons:', await pg.evaluate(() => [...document.querySelectorAll('#mbox button')].map((b) => b.innerText.replace(/\n/g, ' ')).join(' | ')));
  await pg.screenshot({ path: '/tmp/temple_result.png' });
  console.log('stones', JSON.stringify(await pg.evaluate(() => ({ n: save.stones.length, hi: save.stones.filter((s) => s.hi).length, gold: Math.round(save.gold) }))));
  console.log('autoloop label:', await pg.evaluate(() => { const b = document.querySelector('#mbox [data-a="autoloop"]'); return b ? b.innerText : 'none'; }));
  await pg.evaluate(() => { const b = document.querySelector('#mbox [data-a="autoloop"]'); if (b) b.click(); }); await pg.waitForTimeout(2500);
  console.log('after auto:', JSON.stringify(await pg.evaluate(() => ({ screen: G.screen, kind: G.battle && G.battle.kind, auto: save.auto && save.auto.on, modal: !document.querySelector('#modal').classList.contains('hidden') }))));
  console.log(errs.join('\n') || 'no errors'); await br.close(); })();
