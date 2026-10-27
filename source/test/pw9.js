const { chromium } = require('playwright');
(async () => {
  const br = await chromium.launch(); const pg = await br.newPage({ viewport: { width: 960, height: 540 } });
  const errs = []; pg.on('pageerror', e => errs.push('PE ' + e.message)); pg.on('console', m => { if (m.type() === 'error' && !/Failed to load|net::ERR/.test(m.text())) errs.push('CE ' + m.text()); });
  await pg.goto('file:///home/claude/game/dist/game.html'); await pg.waitForTimeout(800);
  await pg.evaluate(() => { save = newSave(); save.tut.done = true; save.level = 60; save.slots = 4; save.cleared = [10,10,10,10,10,10,10,10,10,10]; save.endgame = true; save.lanesBase = 3; for (const s of SLOTS) save.equipped[s] = genItem(save, 6, 2, s); openTown(3); });
  const ids = ['rend','volley','venom','iceshard','orbs','whirl','trap','blizzard','inferno','plague','storm','spirit','voidhole'];
  for (const id of ids) {
    await pg.evaluate((id) => { Modal.close(true); const sk = genSkill(save, id, 1); save.skills.push(sk); save.loadout[1] = { uid: sk.uid, rule: 'front' }; G.speed = 1; startBattle({ kind: 'stage', act: 3, stage: 7, level: 1, name: id }, {}); const b = G.battle; b.hp = b.maxHp = 1e9; b.mana = b.maxMana = 1e9; b.hpM *= 30; G.paused = false; }, id);
    await pg.waitForTimeout(2300);
    await pg.screenshot({ path: `/tmp/s_${id}.png` });
  }
  console.log(errs.join('\n') || 'no errors'); await br.close();
})();
