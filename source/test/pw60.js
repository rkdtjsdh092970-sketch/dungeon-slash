const { chromium } = require('playwright');
(async () => {
  const br = await chromium.launch(); const pg = await br.newPage({ viewport: { width: 960, height: 540 } });
  const errs = []; pg.on('pageerror', e => errs.push('PE ' + e.message));
  await pg.goto('file:///home/claude/game/dist/game.html'); await pg.waitForTimeout(900);
  await pg.evaluate(() => { save = newSave(); save.tut.done = true; save.level = 100; save.endgame = true; save.keys = 2; save.keys3 = 1; for (let i = 0; i < 16; i++) save.inv.push(genItem(save, 12, i % 4, SLOTS[i % 7])); save.inv[0].lock = true; openTown(1); });
  await pg.waitForTimeout(500); await pg.screenshot({ path: '/tmp/top2.png', clip: { x: 0, y: 0, width: 960, height: 60 } });
  await pg.evaluate(() => openItems('inv')); await pg.waitForTimeout(400);
  await pg.click('[data-a="mtog"]'); await pg.waitForTimeout(250);
  for (let i = 0; i < 4; i++) { const tiles = await pg.$$('.grid [data-a="mpick"]'); await tiles[i].click(); await pg.waitForTimeout(120); }
  console.log('chk', await pg.evaluate(() => IB.chk.size), '(첫 장비는 잠금이라 선택 안 됨 → 3 기대)');
  await pg.screenshot({ path: '/tmp/multi.png' });
  const before = await pg.evaluate(() => save.inv.length);
  await pg.click('[data-a="mdis"]'); await pg.waitForTimeout(250); await pg.click('[data-a="cyes"]');
  await pg.waitForTimeout(400);
  console.log('inv', before, '->', await pg.evaluate(() => save.inv.length));
  await pg.click('[data-a="mall"]').catch(() => {}); await pg.waitForTimeout(250); console.log('all chk', await pg.evaluate(() => IB.chk.size));
  console.log(errs.join('\n') || 'no errors'); await br.close();
})();
