const { chromium } = require('playwright');
(async () => {
  const br = await chromium.launch(); const pg = await br.newPage({ viewport: { width: 960, height: 540 } });
  const errs = []; pg.on('pageerror', e => errs.push('PE ' + e.message)); pg.on('console', m => { if (m.type() === 'error') errs.push('CE ' + m.text()); });
  await pg.goto('file:///home/claude/game/dist/game.html'); await pg.waitForTimeout(700);
  const shot = async (n) => { await pg.waitForTimeout(250); await pg.screenshot({ path: `/tmp/p_${n}.png` }); };
  const ff = async () => { await pg.evaluate(() => { const b = G.battle; let i = 0; while (b && !b.over && i++ < 40000) stepBattle(b, 0.05); }); await pg.waitForTimeout(1200); };
  await pg.click('[data-t=new]'); await pg.waitForTimeout(300);
  for (let s = 0; s < 3; s++) { if (await pg.$('[data-t=tipok]:visible')) await pg.click('[data-t=tipok]'); await pg.waitForTimeout(1500); if (s === 1) await shot('tut2'); await ff(); if (s === 0) await shot('result'); await pg.click('#mbox [data-a=ok]'); await pg.waitForTimeout(400); }
  await shot('town');
  for (const id of ['skill', 'forge', 'board', 'shop', 'guild']) { await pg.evaluate((id) => townClick(TOWN_SPOTS.find(s => s.id === id)), id); await shot('town_' + id); await pg.evaluate(() => Modal.close(true)); }
  await pg.evaluate(() => { save.gold = 5000; save.ore = 80; for (let i = 0; i < 40; i++) save.inv.push(genItem(save, 1 + (i % 4), i % 5 === 0 ? 4 : i % 4, undefined, i % 5 === 0 ? 'guardian' : undefined)); IB.mode = 'inv'; IB.sel = save.inv[0]; renderItems(); });
  await shot('inv'); await pg.evaluate(() => { IB.mode = 'forge'; renderItems(); }); await shot('forge'); await pg.click('#mbox [data-a=enh]'); await pg.evaluate(() => Modal.close(true));
  await pg.evaluate(() => { acceptQuest(save, 'f1'); acceptQuest(save, 'k1'); openQuests(false); }); await shot('quests'); await pg.evaluate(() => Modal.close(true));
  await pg.evaluate(() => { SK.slot = 1; openSkills(); }); await shot('skills'); await pg.evaluate(() => Modal.close(true));
  await pg.click('#b-map'); await pg.waitForTimeout(300); await pg.evaluate(() => { MapView.sel = MAP.byId['S1-1']; mapPanel(); }); await shot('map');
  await pg.click('[data-p=go]'); await pg.waitForTimeout(1500); await shot('battle1');
  await pg.evaluate(() => { const b = G.battle; for (let i = 0; i < 400; i++) stepBattle(b, 0.05); }); await shot('battle2');
  await ff(); await shot('result2'); 
  await pg.evaluate(() => { Modal.close(true); save.cleared = [10, 10, 10, 10, 10, 10, 10, 10, 10, 9]; save.slots = 4; save.endgame = true; save.shards = 50; openMap(10); }); await shot('map10');
  console.log(errs.join('\n') || 'no errors'); await br.close();
})();
