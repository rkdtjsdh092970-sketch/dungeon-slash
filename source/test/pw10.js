const { chromium } = require('playwright');
(async () => {
  const br = await chromium.launch(); const pg = await br.newPage({ viewport: { width: 960, height: 540 } });
  const errs = []; pg.on('pageerror', e => errs.push('PE ' + e.message)); pg.on('console', m => { if (m.type() === 'error' && !/Failed to load|net::ERR/.test(m.text())) errs.push('CE ' + m.text()); });
  await pg.addInitScript(() => { window.confirm = () => false; });
  await pg.goto('file:///home/claude/game/dist/game.html'); await pg.waitForTimeout(800);
  // 기존 세이브 만들고 타이틀 -> 새로 시작
  await pg.evaluate(() => { save = newSave(); save.tut.done = true; saveGame(); openTitle(); });
  await pg.click('[data-t=new]'); await pg.waitForTimeout(200);
  console.log('dialog:', await pg.evaluate(() => $('#mbox').textContent.slice(0, 40)));
  await pg.click('[data-a=cyes]'); await pg.waitForTimeout(500);
  console.log('screen after new:', await pg.evaluate(() => G.screen + ' tut.done=' + save.tut.done));
  // 정지 시나리오
  await pg.evaluate(() => { save = newSave(); save.tut.done = true; save.level = 30; save.slots = 4; save.cleared = [10,10,10,10,10,10,10,10,10,10]; for (const s of SLOTS) save.equipped[s] = genItem(save, 6, 2, s); for (let i = 0; i < 12; i++) save.inv.push(genItem(save, 2, i % 3, SLOTS[i % SLOTS.length])); openTown(1); startBattle({ kind: 'stage', act: 1, stage: 1, name: 't' }, {}); const b = G.battle; b.plan.length = 3; G.speed = 3; });
  await pg.waitForFunction(() => !$('#modal').classList.contains('hidden'), null, { timeout: 60000 });
  console.log('result:', await pg.evaluate(() => $('#mbox h2').textContent));
  await pg.click('[data-a=inv]'); await pg.waitForTimeout(200);
  await pg.evaluate(() => { const it = save.inv[0]; IB.sel = it; renderItems(); });
  await pg.click('.itbar [data-a=quick]'); await pg.waitForTimeout(200);
  await pg.click('#mbox .x'); await pg.waitForTimeout(400);
  console.log('after X modal visible:', await pg.evaluate(() => !$('#modal').classList.contains('hidden') && $('#mbox h2').textContent));
  await pg.click('[data-a=ok]'); await pg.waitForTimeout(300);
  console.log('screen:', await pg.evaluate(() => G.screen));
  // 설정 초기화
  await pg.evaluate(() => openSettings()); await pg.click('[data-a=wipe]'); await pg.click('[data-a=cyes]'); await pg.waitForTimeout(300);
  console.log('after wipe:', await pg.evaluate(() => G.screen + ' ' + !!localStorage.getItem(SAVE_KEY)));
  console.log(errs.join('\n') || 'no errors'); await br.close();
})();
