const { chromium } = require('playwright');
(async () => {
  const br = await chromium.launch(); const pg = await br.newPage({ viewport: { width: 960, height: 540 } });
  const errs = []; pg.on('pageerror', e => errs.push('PE ' + e.message));
  await pg.goto('file:///home/claude/game/dist/game.html'); await pg.waitForTimeout(800);
  await pg.evaluate(() => { save = newSave(); save.tut.done = true; save.level = 70; save.cleared = [3,0,0,0,0,0,0,0,0,0]; save.slots = 3; for (const s of SLOTS) save.equipped[s] = genItem(save, 3, 2, s); openMap(1); MapView.sel = MAP.byId['S1-4']; mapPanel(); });
  await pg.evaluate(() => { G.node = MAP.byId['S1-3']; });
  // 스테이지 1-3 클리어 직후 결과창에 다음 스테이지 버튼이 뜨는지
  await pg.evaluate(() => { Modal.close(true); openTown(1); startBattle(MAP.byId['S1-3'], { back: () => openMap(1) }); const b = G.battle; b.plan.length = 3; G.speed = 3; });
  await pg.waitForFunction(() => !!document.querySelector('#mbox [data-a=ok]') && !$('#modal').classList.contains('hidden'), null, { timeout: 90000 }); await pg.waitForTimeout(1800);
  console.log('next btn:', await pg.evaluate(() => { const b = document.querySelector('#mbox [data-a=next]'); return b ? b.textContent : null; }));
  await pg.screenshot({ path: '/tmp/nx.png' });
  await pg.click('#mbox [data-a=next]'); await pg.waitForTimeout(500); console.log('now battling:', await pg.evaluate(() => G.screen + ' ' + G.node.name));
  // 시련 패널
  await pg.evaluate(() => { save.cleared = [10,10,10,10,10,10,10,10,10,10]; save.endgame = true; save.trialBest = 37; Modal.close(true); G.battle = null; openMap(10); MapView.sel = MAP.nodes.find(n => n.kind === 'trial'); mapPanel(); }); await pg.waitForTimeout(300); await pg.screenshot({ path: '/tmp/tr.png' });
  console.log(errs.join('\n') || 'no errors'); await br.close();
})();
