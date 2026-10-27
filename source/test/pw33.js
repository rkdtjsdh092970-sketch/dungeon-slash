const { chromium } = require('playwright');
(async () => {
  const br = await chromium.launch(); const pg = await br.newPage({ viewport: { width: 960, height: 540 } });
  const errs = []; pg.on('pageerror', e => errs.push('PE ' + e.message));
  await pg.goto('file:///home/claude/game/dist/game.html'); await pg.waitForTimeout(800);
  await pg.evaluate(() => { save = newSave(); save.tut.done = true; save.level = 40; save.slots = 4; save.cleared = [10,10,10,10,10,10,10,10,10,10]; for (const id of ['smash', 'chain', 'rend']) save.skills.push(genSkill(save, id, 1)); save.skills[2].rune = 'swift'; save.skills[2].lvl = 4; SK.slot = 1; SK.sel = save.skills[2].uid; openTown(1); openSkills(); });
  await pg.waitForTimeout(200); await pg.screenshot({ path: '/tmp/ss.png' });
  const g0 = await pg.evaluate(() => save.gold); await pg.click('[data-a=sellsk]'); await pg.waitForTimeout(200); await pg.click('[data-a=cyes]'); await pg.waitForTimeout(300);
  console.log('gold', g0, '->', await pg.evaluate(() => save.gold), 'skills', await pg.evaluate(() => save.skills.length), 'runes', await pg.evaluate(() => save.runes.length));
  console.log(errs.join('\n') || 'no errors'); await br.close();
})();
