const { chromium } = require('playwright');
(async () => {
  const br = await chromium.launch(); const pg = await br.newPage({ viewport: { width: 960, height: 540 } });
  const errs = []; pg.on('pageerror', e => errs.push('PE ' + e.message));
  await pg.goto('file:///home/claude/game/dist/game.html'); await pg.waitForTimeout(900);
  await pg.evaluate(() => { save = newSave(); save.tut.done = true; save.level = 60; save.slots = 4; save.endgame = true; save.cleared = Array(10).fill(10);
    for (const [id, r] of [['smash', 0], ['smash', 0], ['smash', 1], ['bomb', 0], ['bomb', 0], ['chain', 2], ['chain', 0], ['rend', 1], ['rend', 1], ['gut', 0]]) save.skills.push(genSkill(save, id, r)); openTown(1); openSkills(); });
  await pg.waitForTimeout(400);
  console.log('promo btn?', await pg.evaluate(() => document.body.innerHTML.includes('data-a="promo"')));
  await pg.click('[data-a="autosk"]'); await pg.waitForTimeout(300);
  await pg.selectOption('[data-i="asrule"][data-r="0"]', 'dis'); await pg.waitForTimeout(150);
  await pg.selectOption('[data-i="asrule"][data-r="1"]', 'sell'); await pg.waitForTimeout(150);
  await pg.screenshot({ path: '/tmp/autosk.png' });
  const before = await pg.evaluate(() => [save.skills.length, save.hone, save.gold]);
  await pg.click('[data-a="asnow"]'); await pg.waitForTimeout(300);
  console.log('before', before, 'after', await pg.evaluate(() => [save.skills.length, save.hone, save.gold, save.skills.map(k => k.id + ':' + k.rarity).join(',')]));
  console.log(errs.join('\n') || 'no errors'); await br.close();
})();
