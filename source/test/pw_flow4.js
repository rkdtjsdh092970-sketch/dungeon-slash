const { chromium } = require('playwright');
(async () => {
  const br = await chromium.launch(); const pg = await br.newPage({ viewport: { width: 960, height: 540 } });
  const errs = []; pg.on('pageerror', e => errs.push('PE ' + e.message + ' ' + (e.stack || '').split('\n')[1])); pg.on('console', m => { if (m.type() === 'error') errs.push('CE ' + m.text()); });
  await pg.goto('file:///home/claude/game/dist/game.html'); await pg.waitForTimeout(600);
  await pg.evaluate(() => { localStorage.clear(); });
  await pg.reload(); await pg.waitForTimeout(600);
  await pg.click('[data-t=new]'); await pg.waitForTimeout(500);
  const out = await pg.evaluate(() => {
    const log = []; const prep = () => { recommendEquip(save); const st = shopStock(save); st.forEach((o, i) => { if (!save.shop.bought.includes(i) && save.gold >= o.price && save.skills.length < 5 && !save.skills.some((k) => k.id === o.id)) { buySkill(save, i); } }); const ids = save.loadout.map((l) => l && l.uid); for (const k of save.skills) { const d = SKILLS.find((x) => x.id === k.id); if (d.slot === 'passive' || ids.includes(k.uid)) continue; const free = save.loadout.findIndex((l, i) => !l && i < save.slots && i > 0); if (free >= 0 && d.slot === 'active') { save.loadout[free] = { uid: k.uid, rule: 'auto' }; ids[free] = k.uid; } } }; const fight = (node) => { prep(); const b = createBattle(save, node); b.noFx = true; b.stats.maxHp; let t = 0; b.inv = 0; while (!b.over && t < 400) { stepBattle(b, 0.05); t += 0.05; } return finishBattle(save, b); };
    // 튜토리얼 3단계
    for (let s = 0; s < 3; s++) { const r = fight({ kind: 'tutorial', act: 1, step: s, name: 't', level: 1 }); log.push('tut' + s + ' ' + r.win); }
    log.push('tutdone ' + save.tut.done + ' slots ' + save.slots);
    for (let s = 1; s <= 5; s++) { let n = 0, r; do { r = fight({ kind: s === 5 ? 'boss' : 'stage', act: 1, stage: s, name: 'S', id: 'S1-' + s }); n++; } while (!r.win && n < 6); log.push('stage' + s + ' ' + r.win + ' tries ' + n + ' items ' + r.items.length + ' gold ' + save.gold + ' skills ' + save.skills.length); }
    log.push('endgame ' + save.endgame + ' slots ' + save.slots + ' cleared ' + save.cleared + ' rift unlocked ' + nodeUnlocked(save, MAP.byId['R']));
    for (let f = 1; f <= 3; f++) { const r = fight({ kind: 'rift', act: riftRegion(f), tier: f, mods: [], name: 'r' }); log.push('floor' + f + ' ' + r.win + ' lv ' + save.level + ' best ' + save.rift.best + ' stones ' + save.stones.length + ' items ' + r.items.length + ' hone ' + save.hone + ' notes ' + r.notes.join('|')); }
    return log;
  });
  console.log(out.join('\n'));
  await pg.evaluate(() => { openTown(1); }); await pg.waitForTimeout(300); await pg.screenshot({ path: '/tmp/v4_flow_town.png' });
  console.log(errs.join('\n') || 'no errors'); await br.close();
})();
