const { chromium } = require('playwright');
(async () => {
  const br = await chromium.launch(); const pg = await br.newPage({ viewport: { width: 960, height: 540 } });
  const errs = []; pg.on('pageerror', e => errs.push('PE ' + e.message));
  await pg.goto('file:///home/claude/game/dist/game.html'); await pg.waitForTimeout(800);
  await pg.evaluate(() => { SRV.on = true; SRV.name = 'Begin'; srvMark(); save = newSave(); save.tut.done = true; save.level = 20; save.cleared = [10,10,10,10,10,10,10,10,10,10]; for (const s of SLOTS) save.equipped[s] = genItem(save, 6, 2, s); for (let i = 0; i < 8; i++) save.inv.push(genItem(save, 4, i % 4, SLOTS[i % SLOTS.length])); openTown(1); IB.mode = 'inv'; IB.sel = save.inv[2]; renderItems(); });
  await pg.waitForTimeout(300); await pg.screenshot({ path: '/tmp/i1.png' });
  await pg.evaluate(() => { Modal.close(true); startBattle({ kind: 'stage', act: 3, stage: 9, name: '폐광 9' }, {}); const b = G.battle; b.hp = 1; G.speed = 1; });
  await pg.waitForFunction(() => G.battle && G.battle.over, null, { timeout: 60000 }); await pg.waitForTimeout(700); await pg.screenshot({ path: '/tmp/d1.png' });
  await pg.waitForFunction(() => !$('#modal').classList.contains('hidden'), null, { timeout: 10000 }); await pg.waitForTimeout(1500); await pg.screenshot({ path: '/tmp/d2.png' });
  await pg.keyboard.press('Enter'); await pg.waitForTimeout(400); console.log('after Enter screen:', await pg.evaluate(() => G.screen));
  console.log('acct visible in game:', await pg.evaluate(() => getComputedStyle(document.getElementById('acct')).display));
  console.log(errs.join('\n') || 'no errors'); await br.close();
})();
