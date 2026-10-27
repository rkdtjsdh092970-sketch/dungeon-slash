const { chromium } = require('playwright');
(async () => {
  const br = await chromium.launch(); const pg = await br.newPage({ viewport: { width: 960, height: 540 } });
  const errs = []; pg.on('pageerror', e => errs.push('PE ' + e.message));
  await pg.goto('file:///home/claude/game/dist/game.html'); await pg.waitForTimeout(800);
  await pg.evaluate(() => { save = newSave(); save.tut.done = true; save.level = 40; save.slots = 4; save.cleared = [10,10,10,10,10,10,10,10,10,10]; for (const s of SLOTS) save.equipped[s] = genItem(save, 6, 2, s); for (const id of ['smash', 'chain', 'rend']) { const k = genSkill(save, id, 1); save.skills.push(k); } save.loadout = [0,1,2,3].map((i) => save.skills[i] ? { uid: save.skills[i].uid, rule: 'auto' } : null); openTown(1); IB.mode = 'inv'; IB.sel = null; renderItems(); });
  await pg.click('[data-a=ppick][data-n="0"]'); await pg.waitForTimeout(200); await pg.screenshot({ path: '/tmp/pr0.png' });
  await pg.click('[data-a=pvsave]'); await pg.waitForTimeout(200);
  await pg.evaluate(() => { save.inv.push(save.equipped.weapon); save.equipped.weapon = genItem(save, 9, 3, 'weapon'); }); await pg.click('[data-a=pvback]'); await pg.waitForTimeout(200);
  await pg.click('[data-a=ppick][data-n="0"]'); await pg.waitForTimeout(200); await pg.screenshot({ path: '/tmp/pr1.png' });
  await pg.click('[data-a=pvuse]'); await pg.waitForTimeout(200);
  console.log('applied weapon rarity:', await pg.evaluate(() => save.equipped.weapon.rarity), 'modal:', await pg.evaluate(() => $('#mbox h2').textContent));
  console.log(errs.join('\n') || 'no errors'); await br.close();
})();
