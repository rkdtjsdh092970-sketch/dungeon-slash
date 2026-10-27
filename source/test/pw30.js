const { chromium } = require('playwright');
(async () => {
  const br = await chromium.launch(); const pg = await br.newPage({ viewport: { width: 960, height: 540 } });
  const errs = []; pg.on('pageerror', e => errs.push('PE ' + e.message));
  await pg.goto('file:///home/claude/game/dist/game.html'); await pg.waitForTimeout(800);
  const r = await pg.evaluate(() => { save = newSave(); save.tut.done = true; save.level = 20; save.slots = 4; save.cleared = [10,10,10,10,10,10,10,10,10,10]; for (const id of ['bomb', 'chain']) save.skills.push(genSkill(save, id, 1)); save.loadout = [0,1,2,null].map((i) => i == null ? null : { uid: save.skills[i].uid, rule: 'auto' });
    for (const s of SLOTS) save.equipped[s] = genItem(save, 3, 2, s);
    const lowDef = genItem(save, 3, 2, 'armor'), highDef = genItem(save, 3, 2, 'armor'); lowDef.base.def = 1; lowDef.base.hp = 1; highDef.base.def = 300; highDef.base.hp = 300; lowDef.affixes = []; highDef.affixes = [];
    const hi9 = genItem(save, 9, 3, 'armor'); save.inv.push(lowDef, highDef, hi9);
    return { low: Math.round(powerWith(save, 'armor', lowDef)), high: Math.round(powerWith(save, 'armor', highDef)), cur: Math.round(playerPower(computeStats(save))), req9: reqLevel(9), can9: canEquip(save, hi9), up9: isUpgrade(save, hi9), upHigh: isUpgrade(save, highDef) }; });
  console.log(JSON.stringify(r));
  await pg.evaluate(() => { openTown(1); IB.mode = 'inv'; IB.sel = save.inv[2]; renderItems(); }); await pg.waitForTimeout(300); await pg.screenshot({ path: '/tmp/rq.png' });
  console.log(errs.join('\n') || 'no errors'); await br.close();
})();
