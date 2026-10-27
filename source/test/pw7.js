const { chromium } = require('playwright');
(async () => {
  const br = await chromium.launch(); const pg = await br.newPage({ viewport: { width: 960, height: 540 } });
  const errs = []; pg.on('pageerror', e => errs.push('PE ' + e.message)); pg.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text())) errs.push('CE ' + m.text()); });
  await pg.goto('file:///home/claude/game/dist/game.html'); await pg.waitForTimeout(800);
  await pg.evaluate(() => { save = newSave(); save.tut.done = true; save.slots = 4; save.level = 60; save.cleared = [10,10,10,10,10,10,10,10,10,10]; save.endgame = true; save.lanesBase = 3; save.rift.best = 23; save.shards = 300; save.orbC = 5; save.orbD = 2; save.keys = 2;
    for (const id of ['chain','smash','meteor','frost','bomb']) save.skills.push(genSkill(save, id, 1));
    ['chain','meteor','smash'].forEach((id, i) => { save.loadout[i + 1] = { uid: save.skills.find(s => s.id === id).uid, rule: 'auto' }; });
    for (const s of SLOTS) save.equipped[s] = genItem(save, 8, 2, s);
    for (let i = 0; i < 40; i++) save.inv.push(genItem(save, 9, i % 4, undefined));
    for (const id of ['mystic1','ironwall','stormeye','ghostdance','halo','abyssalcrown']) { if (UNIQUE_BY_ID[id]) { const u = genUnique(save, UNIQUE_BY_ID[id], 12); save.inv.push(u); save.uniq[id] = 1; } }
    ['phys_s1','phys_s2','def_s1','def_s2','mana_s1'].forEach(id => addPassive(save, id)); openTown(10); });
  const shot = async (n) => { await pg.waitForTimeout(350); await pg.screenshot({ path: `/tmp/v_${n}.png` }); };
  await shot('town');
  await pg.evaluate(() => { IB.mode = 'inv'; IB.sel = save.inv[save.inv.length - 3]; renderItems(); }); await shot('inv');
  await pg.evaluate(() => { IB.sel = save.inv[save.inv.length - 1]; renderItems(); }); await shot('inv2');
  await pg.evaluate(() => { openStats(); }); await shot('stats');
  await pg.evaluate(() => { openSkills(); }); await shot('skills');
  await pg.evaluate(() => { openPassives(); }); await shot('pass');
  await pg.evaluate(() => { openTower(); }); await shot('tower');
  await pg.evaluate(() => { CX.tab = 'uniq'; CX.sel = 'ghostdance'; openCodex(); }); await shot('codex');
  await pg.evaluate(() => { openBulk(); }); await shot('bulk');
  await pg.evaluate(() => { Modal.close(true); showUniqueFx([save.inv[save.inv.length - 1]], () => {}); }); await pg.waitForTimeout(2000); await pg.screenshot({ path: '/tmp/v_ufx.png' });
  await pg.evaluate(() => { document.querySelector('#unique').click(); });
  await pg.evaluate(() => { Modal.close(true); openMap(3); }); await shot('map');
  await pg.evaluate(() => { Modal.close(true); G.speed = 1; startBattle({ kind: 'stage', act: 3, stage: 6, level: 1, name: 't' }, {}); const b = G.battle; b.hp = b.maxHp = 1e9; }); await pg.waitForTimeout(6000); await shot('battle');
  console.log(errs.join('\n') || 'no errors'); await br.close();
})();
