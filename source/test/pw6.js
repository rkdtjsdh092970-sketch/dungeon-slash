const { chromium } = require('playwright');
(async () => {
  const br = await chromium.launch(); const pg = await br.newPage({ viewport: { width: 960, height: 540 } });
  const errs = []; pg.on('pageerror', e => errs.push('PE ' + e.message)); pg.on('console', m => { if (m.type() === 'error') errs.push('CE ' + m.text()); });
  await pg.goto('file:///home/claude/game/dist/game.html'); await pg.waitForTimeout(800);
  await pg.evaluate(() => { save = newSave(); save.tut.done = true; save.slots = 4; save.level = 50; save.cleared = [10, 10, 10, 10, 10, 10, 10, 10, 10, 10]; save.endgame = true; save.lanesBase = 3; save.seen.guide = true; save.shards = 300; save.orbC = 5; save.orbD = 2; save.keys = 2; save.gold = 99999;
    for (const id of ['chain', 'smash', 'meteor']) save.skills.push(genSkill(save, id, 1));
    ['chain', 'meteor', 'smash'].forEach((id, i) => { save.loadout[i + 1] = { uid: save.skills.find(s => s.id === id).uid, rule: 'auto' }; });
    for (const s of SLOTS) save.equipped[s] = genItem(save, 6, 2, s);
    for (let i = 0; i < 30; i++) save.inv.push(genItem(save, 7, i % 4, undefined));
    save.inv.push(genUnique(save, UNIQUE_BY_ID.ghostdance, 10)); save.inv.push(genUnique(save, UNIQUE_BY_ID.luckycharm, 10)); save.uniq.ghostdance = 1;
    openTown(10); });
  const shot = async (n) => { await pg.waitForTimeout(300); await pg.screenshot({ path: `/tmp/r_${n}.png` }); };
  for (const act of [1, 2, 3, 5, 6, 7, 8, 10]) {
    await pg.evaluate((act) => { Modal.close(true); G.speed = 1; save.auto.on = false; startBattle({ kind: 'stage', act, stage: 6, level: 1, name: 'test' }, {}); const b = G.battle; b.hp = b.maxHp = 1e9; b.hpM *= 0.5; for (let i = 0; i < 280; i++) stepBattle(b, 0.05); }, act);
    await shot('b' + act);
  }
  await pg.evaluate(() => { Modal.close(true); openTown(10); openSkillShop(); }); await shot('skillshop');
  await pg.evaluate(() => { openPassives(); }); await shot('pass');
  await pg.evaluate(() => { IB.mode = 'forge'; IB.sel = save.inv[3]; renderItems(); }); await shot('forge');
  await pg.evaluate(() => { IB.mode = 'inv'; IB.tab = 'all'; IB.sel = save.inv[save.inv.length - 2]; renderItems(); }); await shot('inv');
  await pg.evaluate(() => { openAtlas(); }); await shot('atlas');
  await pg.evaluate(() => { Modal.close(true); showUniqueFx([save.inv[save.inv.length - 2]], () => {}); }); await pg.waitForTimeout(1800); await pg.screenshot({ path: '/tmp/r_uniq.png' });
  await pg.evaluate(() => { document.querySelector('#unique').click(); });
  await pg.evaluate(() => { Modal.close(true); openMap(10); }); await pg.evaluate(() => { MapView.cam.x = 1000; MapView.cam.y = 80; MapView.sel = MAP.byId['RE']; mapPanel(); }); await shot('map_end');
  console.log(errs.join('\n') || 'no errors'); await br.close();
})();
