const A = require('./simlib.js');
const sv = A.newSave(); sv.tut.done = true; sv.level = 90; sv.slots = 4; sv.endgame = true; sv.lanesBase = 3; sv.cleared = Array(10).fill(10); sv.rift.best = 70;
for (const s of A.SLOTS) sv.equipped[s] = A.genItem(sv, 10, 3, s);
{ const k = A.genSkill(sv, 'snipe', 0); sv.skills.push(k); sv.loadout[1] = { uid: k.uid, rule: 'front' }; const m = A.genSkill(sv, 'bomb', 0); sv.skills.push(m); sv.loadout[2] = { uid: m.uid, rule: 'front' }; }
for (const kind of ['hive', 'titan', 'storm']) {
  const E = A.EB[kind]; let uniq = {}, sk = {}, items = 0, said = new Set(), plateSeen = 0, pylonMax = 0, curseMax = 0;
  for (let run = 0; run < 40; run++) {
    const b = A.createBattle(sv, { kind, act: 10, tier: E.tiers[run % 4], vsel: 1 + run % 4, name: 'h' }); b.noFx = true; b.hpM *= 1e-9; b.atkM *= 1e-9; b.inv = 1e9; b.hp = b.maxHp = 1e15;
    let t = 0;
    while (!b.over && t < 900) { A.stepBattle(b, 0.05); t += 0.05; const bo = b.bossRef; if (bo && bo.plate) plateSeen++; pylonMax = Math.max(pylonMax, b.enemies.filter(x => x.pylon && !x.dead).length); if (b.debuffs.curse) curseMax = Math.max(curseMax, b.debuffs.curse.mult); }
    const res = A.finishBattle(sv, b);
    for (const it of res.items) { items++; if (it.uniq) uniq[it.uniq] = (uniq[it.uniq] || 0) + 1; }
    for (const s of res.skills) sk[s.id] = (sk[s.id] || 0) + 1;
    if (run < 2) console.log(kind, 'run', run, 'win', res.win, 'time', Math.round(b.time), 'items', res.items.length);
  }
  console.log(kind, { items, uniq, sk, plateSeen, pylonMax, curseMax });
}
