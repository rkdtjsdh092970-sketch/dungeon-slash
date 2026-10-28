const { chromium } = require('playwright');
(async () => {
  const br = await chromium.launch(); const pg = await br.newPage({ viewport: { width: 960, height: 540 } });
  const errs = []; pg.on('pageerror', e => errs.push('PE ' + e.message)); pg.on('console', m => { if (m.type() === 'error') errs.push('CE ' + m.text()); });
  await pg.goto('file:///home/claude/game/dist/game.html'); await pg.waitForTimeout(500);
  await pg.evaluate(() => { save = newSave(); save.tut.done = true; save.level = 60; save.slots = 4; save.gold = 5e6; save.endgame = true; for (let i = 0; i < 30; i++) save.inv.push(genItem(save, 8, i % 5, SLOTS[i % SLOTS.length])); for (let i = 0; i < 6; i++) save.skills.push(genSkill(save, 'spark', i % 3)); IB.mode = 'inv'; renderItems(); });
  await pg.click('[data-a=openstash]'); await pg.waitForTimeout(200);
  await pg.evaluate(() => { for (let i = 0; i < 5; i++) document.querySelector('.modal [data-a=dep], [data-a=dep]').click(); });
  await pg.waitForTimeout(200); await pg.screenshot({ path: '/tmp/stash1.png' });
  const r = await pg.evaluate(() => { document.querySelector('[data-a=stsort]').click(); document.querySelector('[data-a=stexp]').click(); document.querySelector('[data-a=sttab][data-t=skill]').click(); document.querySelector('[data-a=dep]').click(); document.querySelector('[data-a=wd]').click(); return { st: save.stash.items.length, sk: save.stash.skills.length, cap: save.stash.cap, inv: save.inv.length, skills: save.skills.length, gold: save.gold }; });
  console.log(JSON.stringify(r)); console.log(errs.join('\n') || 'no errors'); await br.close();
})();
