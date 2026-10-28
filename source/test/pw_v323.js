const { chromium } = require('playwright');
(async () => {
  const br = await chromium.launch(); const pg = await br.newPage({ viewport: { width: 960, height: 540 } });
  const errs = []; pg.on('pageerror', e => errs.push('PE ' + e.message)); pg.on('console', m => { if (m.type() === 'error') errs.push('CE ' + m.text()); });
  await pg.goto('file:///home/claude/game/dist/game.html'); await pg.waitForTimeout(600);
  await pg.evaluate(() => { save = newSave(); save.tut.done = true; save.level = 80; save.slots = 4; save.cleared = Array(10).fill(10); save.endgame = true; save.lanesBase = 3; for (const s of SLOTS) save.equipped[s] = genItem(save, 12, 3, s);
    const ids = ['shuriken', 'skysword', 'starfall', 'quake', 'dragonbreath', 'angelfall', 'verdict', 'bigshuriken'];
    for (const id of ids) save.skills.push({ uid: save.nextUid++, id, rarity: 3 });
    for (const p of PASSIVE_SKILLS) save.skills.push(genSkill(save, p.id, 0));
    save.passive = save.skills.find(x => x.id === 'p_end').uid; save.hone = 9999; saveGame && saveGame(); });
  const out = [];
  for (let r = 0; r < 4; r++) {
    const res = await pg.evaluate((r) => { const ids = ['shuriken', 'skysword', 'starfall', 'quake', 'dragonbreath', 'angelfall', 'verdict', 'bigshuriken'];
      const pick4 = ids.slice(r * 2, r * 2 + 2); save.loadout = [{ uid: save.skills.find(x => x.id === 'strike' || x.id === 'spark')?.uid ?? save.loadout[0]?.uid, rule: 'front' }, null, null, null];
      save.loadout[1] = { uid: save.skills.find(x => x.id === pick4[0]).uid, rule: 'front' }; save.loadout[2] = { uid: save.skills.find(x => x.id === pick4[1]).uid, rule: 'front' };
      const b = createBattle(save, { kind: 'rift', act: 11, tier: 40, name: 't', level: 100, mods: [] }); let t = 0; const casts = {}; while (t < 90 && !b.over) { stepBattle(b, 0.05); t += 0.05; } return { win: b.win, kills: b.kills, t: Math.round(t), grand: !!b.grand }; }, r);
    out.push(JSON.stringify(res));
  }
  console.log(out.join('\n'));
  await pg.evaluate(() => { openSkills(); }); await pg.waitForTimeout(300); await pg.screenshot({ path: '/tmp/v323_skills.png' });
  await pg.evaluate(() => { SK.slot = 4; SK.sel = save.passive; openSkills(); }); await pg.waitForTimeout(300); await pg.screenshot({ path: '/tmp/v323_passive.png' });
  console.log(errs.join('\n') || 'no errors');
  await br.close();
})();
