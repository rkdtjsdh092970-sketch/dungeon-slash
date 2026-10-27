const { chromium } = require('playwright');
(async () => {
  const br = await chromium.launch(); const pg = await br.newPage({ viewport: { width: 960, height: 540 } });
  const errs = []; pg.on('pageerror', e => errs.push('PE ' + e.message));
  await pg.goto('file:///home/claude/game/dist/game.html'); await pg.waitForTimeout(900);
  await pg.evaluate(() => { save = newSave(); save.tut.done = true; save.level = 40; save.slots = 3; save.cleared = [9, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    for (const s of SLOTS) save.equipped[s] = genItem(save, 4, 2, s); openTown(1); });
  await pg.waitForTimeout(300);
  console.log('quest bang (act1 town):', await pg.evaluate(() => questBang(1)));
  await pg.screenshot({ path: '/tmp/town_bang.png' });
  await pg.evaluate(() => { const n = MAP.byId['S1-10']; startBattle(nodeToBattle(n), { back: () => { openMap(1); } }); G.battle.hpM *= 0.0005; G.battle.atkM *= 0.0001; });
  for (let i = 0; i < 300; i++) { await pg.waitForTimeout(100); if (await pg.evaluate(() => !!document.querySelector('.rs-btns'))) break; }
  console.log('buttons:', await pg.evaluate(() => [...document.querySelectorAll('.rs-btns .btn')].map(b => b.textContent.replace(/\s+/g, ' ').trim()).join(' | ')));
  await pg.click('[data-a="next"]'); await pg.waitForTimeout(500);
  console.log('after next -> screen:', await pg.evaluate(() => G.screen + ' townAct ' + G.townAct));
  console.log('quests left for act1:', await pg.evaluate(() => availableQuests(save).filter(q => q.act === 1).length));
  console.log(errs.join('\n') || 'no errors'); await br.close();
})();
