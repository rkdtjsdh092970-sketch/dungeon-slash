const { chromium } = require('playwright');
(async () => {
  const br = await chromium.launch(); const pg = await br.newPage({ viewport: { width: 960, height: 540 } });
  const errs = []; pg.on('pageerror', e => errs.push('PE ' + e.message));
  await pg.goto('file:///home/claude/game/dist/game.html'); await pg.waitForTimeout(800);
  await pg.evaluate(() => { save = newSave(); save.tut.done = true; save.level = 40; save.slots = 4; save.hone = 50; save.cleared = [10,10,10,10,10,10,10,10,10,10]; for (const id of ['smash', 'chain', 'rend', 'volley', 'meteor']) save.skills.push(genSkill(save, id, 1)); SRV.on = true; SRV.name = 'tester'; SK.slot = 1; SK.sel = null; openTown(1); openSkills(); });
  await pg.waitForTimeout(300); await pg.screenshot({ path: '/tmp/s0.png' });
  const els = await pg.$$('.skrow'); await els[1].click(); await pg.waitForTimeout(250); await pg.screenshot({ path: '/tmp/s1.png' });
  console.log('before equip:', await pg.evaluate(() => JSON.stringify(save.loadout.map(l => l && save.skills.find(x => x.uid === l.uid).id))));
  await pg.click('[data-a=equipsk]'); await pg.waitForTimeout(250);
  console.log('after equip:', await pg.evaluate(() => JSON.stringify(save.loadout.map(l => l && save.skills.find(x => x.uid === l.uid).id))));
  await pg.evaluate(() => { const inst = save.skills.find(x => x.id === 'meteor'); window._testRow = ahRowHtml({ item: Object.assign({}, inst, { slot: 'skill' }), price: 500, seller: 'a' }, ''); });
  console.log('ah row html len:', await pg.evaluate(() => window._testRow.length));
  await pg.evaluate(() => { const inst = save.skills.find(x => x.id === 'meteor'); ahPostSkill(inst, openSkills); }); await pg.waitForTimeout(250); await pg.screenshot({ path: '/tmp/s2.png' });
  console.log(errs.join('\n') || 'no errors'); await br.close();
})();
