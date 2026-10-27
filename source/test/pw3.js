const { chromium } = require('playwright');
(async () => {
  const br = await chromium.launch(); const pg = await br.newPage({ viewport: { width: 960, height: 540 } });
  const errs = []; pg.on('pageerror', e => errs.push('PE ' + e.message)); pg.on('console', m => { if (m.type() === 'error') errs.push('CE ' + m.text()); });
  await pg.goto('file:///home/claude/game/dist/game.html'); await pg.waitForTimeout(600);
  await pg.evaluate(() => { save = newSave(); save.tut.done = true; save.slots = 4; save.level = 60; save.cleared = Array(10).fill(10); save.endgame = true; save.lanesBase = 3;
    for (const id of ['chain', 'smash', 'meteor', 'firewall', 'frost']) { const s = genSkill(save, id, 1); save.skills.push(s); }
    const ids = ['chain', 'meteor', 'firewall']; save.loadout[0] = { uid: save.skills[0].uid, rule: 'front' };
    ['chain', 'meteor', 'firewall'].forEach((id, i) => { save.loadout[i + 1] = { uid: save.skills.find(s => s.id === id).uid, rule: 'auto' }; });
    for (const s of SLOTS) save.equipped[s] = genItem(save, 6, 3, s); });
  for (const [i, id] of ['S1-10', 'S4-10', 'S8-10', 'S10-10'].entries()) {
    await pg.evaluate((id) => { Modal.close(true); G.speed = 1; startBattle(MAP.byId[id], {}); }, id); await pg.waitForTimeout(500);
    await pg.evaluate(() => { const b = G.battle; b.hp = b.maxHp = 1e9; b.hpM *= 0.02; let n = 0; while (n++ < 260 && !b.bossRef) stepBattle(b, 0.05); for (let i = 0; i < 40; i++) stepBattle(b, 0.05); });
    await pg.waitForTimeout(400); await pg.screenshot({ path: `/tmp/b_${i}.png` });
  }
  console.log(errs.join('\n') || 'no errors'); await br.close();
})();
