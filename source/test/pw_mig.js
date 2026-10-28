const { chromium } = require('playwright');
(async () => {
  const br = await chromium.launch(); const pg = await br.newPage({ viewport: { width: 960, height: 540 } });
  const errs = []; pg.on('pageerror', e => errs.push('PE ' + e.message)); pg.on('console', m => { if (m.type() === 'error') errs.push('CE ' + m.text()); });
  await pg.goto('file:///home/claude/game/dist/game.html'); await pg.waitForTimeout(500);
  const r = await pg.evaluate(() => { const s = newSave(); s.tut.done = true; s.level = 100; s.slots = 4; s.endgame = true; s.cleared = Array(10).fill(10); s.lanesBase = 3;
    for (const sl of SLOTS) { const it = genItem(s, 13, 5, sl); delete it.gv; for (const a of it.affixes) delete a.t; delete it.wt; s.equipped[sl] = it; }
    s.equipped.weapon = { uid: 9001, slot: 'weapon', ilvl: 13, rarity: 5, uniq: 'voidblade', utier: 2, base: { atk: 2060, mag: 2047 }, affixes: [{ k: 'physDmg', v: 0.15 }], umods: [{ k: 'atkPct', v: 0.44 }, { k: 'magPct', v: 0.42 }, { k: 'critDmg', v: 0.63 }, { k: 'ignoreDef', v: 0.12 }], enh: 0 };
    s.inv.push(s.equipped.weapon); localStorage[SAVE_KEY] = JSON.stringify(s); save = loadGame(); const ok = !!save; const p = playerPower(computeStats(save)); return { ok, p, wt: save.equipped.weapon.wt, gv: save.equipped.weapon.gv, passive: save.passive, mig: !!save.rev323 }; });
  console.log(JSON.stringify(r)); console.log(errs.join('\n') || 'no errors'); await br.close();
})();
