const { chromium } = require('playwright');
(async () => {
  const br = await chromium.launch(); const pg = await br.newPage({ viewport: { width: 960, height: 540 } });
  const errs = []; pg.on('pageerror', e => errs.push('PE ' + e.message));
  await pg.goto('file:///home/claude/game/dist/game.html'); await pg.waitForTimeout(900);
  await pg.evaluate(() => { save = newSave(); save.tut.done = true; save.level = 100; save.endgame = true; save.cleared = Array(10).fill(10); save.rift.best = 70; save.keys3 = 2; save.keys4 = 1; refreshTop(); openMap(10); });
  await pg.waitForTimeout(500);
  console.log('keys chips', await pg.evaluate(() => [$("#t-key3").textContent, $("#t-key4").textContent, $("#t-key3-w").style.display, $("#t-key4-w").style.display].join(',')));
  for (const id of ['RT', 'RS', 'RH']) {
    await pg.evaluate((id) => { MapView.sel = MAP.nodes.find(n => n.id === id); mapPanel(); }, id); await pg.waitForTimeout(250);
    console.log(id, (await pg.evaluate(() => document.querySelector('#mappanel').innerText)).replace(/\n/g, ' | ').slice(0, 260));
    await pg.screenshot({ path: `/tmp/map_${id}.png` });
  }
  await pg.evaluate(() => { MapView.sel = MAP.nodes.find(n => n.id === 'RT'); G.titanStage = 2; mapPanel(); mapGo(); }); await pg.waitForTimeout(1500);
  console.log('in battle', await pg.evaluate(() => [G.screen, save.keys3, G.b && G.b.kind, G.b && G.b.bossRef && G.b.bossRef.label].join(',')));
  await pg.screenshot({ path: '/tmp/titan_battle.png' });
  // 도감
  await pg.evaluate(() => { openCodex(); });
  await pg.waitForTimeout(300);
  console.log('codex', await pg.evaluate(() => { CX.tab = 'unique'; CX.pool = 'phys'; openCodex(); return document.body.innerText.includes('거신의 대검'); }));
  console.log(errs.join('\n') || 'no errors'); await br.close();
})();
