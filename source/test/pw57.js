const { chromium } = require('playwright');
(async () => {
  const br = await chromium.launch(); const pg = await br.newPage({ viewport: { width: 960, height: 540 } });
  const errs = []; pg.on('pageerror', e => errs.push('PE ' + e.message));
  await pg.goto('file:///home/claude/game/dist/game.html'); await pg.waitForTimeout(900);
  await pg.evaluate(() => { save = newSave(); save.tut.done = true; save.level = 100; save.opt.autoNext = 3; openTown(1); const n = MAP.byId['S1-1']; startBattle(nodeToBattle(n), { back: () => openMap(1) }); });
  await pg.waitForTimeout(500);
  await pg.evaluate(() => { const b = G.battle; b.plan.length = 0; b.enemies.forEach(e => { e.hp = 0; }); });
  await pg.waitForSelector('#modal [data-a="next"]', { timeout: 15000 });
  console.log('label', await pg.evaluate(() => document.querySelector('#modal [data-a="next"]').innerText.replace(/\n/g, ' ')));
  await pg.mouse.click(480, 300);   // 화면 누르기 → 취소
  await pg.waitForTimeout(4500);
  console.log('after cancel still on result', await pg.evaluate(() => !!document.querySelector('#modal [data-a="next"]') + '|' + G.node.id + '|' + document.querySelector('#modal [data-a="next"]').innerText.replace(/\n/g, ' ')));
  console.log(errs.join('\n') || 'no errors'); await br.close();
})();
