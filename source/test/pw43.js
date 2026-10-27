const { chromium } = require('playwright');
(async () => {
  const br = await chromium.launch(); const pg = await br.newPage({ viewport: { width: 960, height: 540 } });
  const errs = []; pg.on('pageerror', e => errs.push('PE ' + e.message));
  await pg.goto('file:///home/claude/game/dist/game.html'); await pg.waitForTimeout(800);
  await pg.evaluate(() => { save = newSave(); save.tut.done = true; save.level = 90; save.endgame = true; save.slots = 4; save.shards = 100;
    for (const [id, r] of [['smash', 0], ['chain', 1], ['bomb', 5], ['lance', 3]]) save.skills.push(genSkill(save, id, r)); openTown(1); openSkills(); SK.slot = 1; SK.sel = save.skills.find(x => x.id === 'smash').uid; openSkills(); });
  await pg.waitForTimeout(300);
  console.log('smash:', await pg.evaluate(() => [...document.querySelectorAll('.skdet .dbtns .btn')].map(b => b.textContent.replace(/\s+/g, ' ')).join(' | ')));
  await pg.evaluate(() => { SK.sel = save.skills.find(x => x.id === 'chain').uid; openSkills(); });
  console.log('chain(희귀):', await pg.evaluate(() => [...document.querySelectorAll('.skdet .dbtns .btn')].map(b => b.textContent.replace(/\s+/g, ' ')).join(' | ')));
  await pg.evaluate(() => { SK.sel = save.skills.find(x => x.id === 'bomb').uid; openSkills(); }); await pg.screenshot({ path: '/tmp/ang.png' });
  console.log(errs.join('\n') || 'no errors'); await br.close();
})();
