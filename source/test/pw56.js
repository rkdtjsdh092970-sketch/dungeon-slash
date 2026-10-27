const { chromium } = require('playwright');
(async () => {
  const br = await chromium.launch(); const pg = await br.newPage({ viewport: { width: 960, height: 540 } });
  const errs = []; pg.on('pageerror', e => errs.push('PE ' + e.message));
  await pg.goto('file:///home/claude/game/dist/game.html'); await pg.waitForTimeout(900);
  await pg.evaluate(() => { save = newSave(); save.tut.done = true; save.level = 100; save.opt.autoNext = 3; openTown(1); });
  // 설정에서 값 변경 확인
  await pg.evaluate(() => openSettings()); await pg.waitForTimeout(200); await pg.selectOption('[data-i="anext"]', '5'); console.log('set', await pg.evaluate(() => save.opt.autoNext)); await pg.selectOption('[data-i="anext"]', '3');
  await pg.evaluate(() => Modal.close(true));
  // S1-1 승리 결과 → 3초 뒤 자동으로 S1-2 시작
  await pg.evaluate(() => { const n = MAP.byId['S1-1']; startBattle(nodeToBattle(n), { back: () => openMap(1) }); });
  await pg.waitForTimeout(500);
  await pg.evaluate(() => { const b = G.battle; b.plan.length = 0; b.enemies.forEach(e => { e.hp = 0; }); b.win = true; b.over = true; b.overT = 99; });
  await pg.waitForTimeout(3500); await pg.screenshot({ path: '/tmp/autonext_a.png' });
  console.log('A result open?', await pg.evaluate(() => !!document.querySelector('#modal [data-a="next"]') + '|' + (G.node && G.node.id)));
  await pg.waitForTimeout(4200);
  console.log('B after 7.7s node', await pg.evaluate(() => (G.node && G.node.id) + ' screen ' + G.screen));
  console.log(errs.join('\n') || 'no errors'); await br.close();
})();
