const { chromium } = require('playwright');
(async () => {
  const br = await chromium.launch(); const pg = await br.newPage({ viewport: { width: 960, height: 540 } });
  await pg.goto('file:///home/claude/game/dist/game.html'); await pg.waitForTimeout(800);
  await pg.evaluate(() => { save = newSave(); save.tut.done = true; save.level = 60; save.slots = 4; save.cleared = [10,10,10,10,10,10,10,10,10,10]; save.endgame = true; save.lanesBase = 3; for (const s of SLOTS) save.equipped[s] = genItem(save, 6, 2, s); for (let i = 0; i < 30; i++) save.inv.push(genItem(save, 5, i % 5, SLOTS[i % SLOTS.length])); openMap(10); });
  await pg.evaluate(() => { MapView.sel = MAP.byId['rift'] || MAP.nodes.find(n => n.kind === 'rift'); mapPanel(); });
  await pg.waitForTimeout(300); await pg.screenshot({ path: '/tmp/m1.png' });
  await pg.evaluate(() => { IB.mode = 'forge'; IB.sel = save.inv[3]; renderItems(); }); await pg.waitForTimeout(200); await pg.screenshot({ path: '/tmp/m2.png' });
  await pg.evaluate(() => { IB.mode = 'inv'; IB.sel = save.inv[3]; save.inv[3].lock = true; renderItems(); }); await pg.waitForTimeout(200); await pg.screenshot({ path: '/tmp/m3.png' });
  await br.close();
})();
