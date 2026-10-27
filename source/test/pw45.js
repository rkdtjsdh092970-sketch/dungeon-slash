const { chromium } = require('playwright');
(async () => {
  const br = await chromium.launch(); const pg = await br.newPage({ viewport: { width: 960, height: 540 } });
  const errs = []; pg.on('pageerror', e => errs.push('PE ' + e.message));
  await pg.goto('file:///home/claude/game/dist/game.html'); await pg.waitForTimeout(800);
  await pg.evaluate(() => { save = newSave(); save.tut.done = true; save.endgame = true; save.level = 100; save.slots = 4; save.lanesBase = 3; save.cleared = Array(10).fill(10); save.rift.best = 60; save.trialBest = 60;
    for (const s of SLOTS) save.equipped[s] = genItem(save, 14, 3, s);
    save.loadout[0] && 0; startBattle({ kind: 'trial', act: 11, tier: 50, mods: riftMods(50), name: '시련 50', level: 100 }, { back: () => {} }); G.battle.hpM *= 0.002; });
  let aim = 0, fire = 0;
  for (let i = 0; i < 600 && (!aim || !fire); i++) {
    await pg.waitForTimeout(60);
    const st = await pg.evaluate(() => { const b = G.battle; if (!b) return null; b.hp = b.maxHp; b.inv = 5; return { aim: b.enemies.some(e => e.def.sniper && e.winding > 0), fire: b.fx.some(f => f.kind === 'snipe'), snipers: b.enemies.filter(e => e.def.sniper).length, t: Math.round(b.time) }; });
    if (st && st.aim && !aim) { aim = 1; await pg.screenshot({ path: '/tmp/sn_aim.png' }); }
    if (st && st.fire && !fire) { fire = 1; await pg.screenshot({ path: '/tmp/sn_fire.png' }); }
  }
  console.log({ aim, fire });
  console.log(await pg.evaluate(() => { const b = G.battle; return 'planSnipers ' + (b ? b.plan.filter(t => t === 'sniper').length : '?') + ' alive ' + (b ? b.enemies.filter(e => e.def.sniper).length : '?'); }));
  console.log(errs.join('\n') || 'no errors'); await br.close();
})();
