const A = require('./simlib.js');
const sv = A.newSave(); sv.tut.done = true; sv.level = 90; sv.slots = 4; sv.endgame = true; sv.lanesBase = 3; sv.cleared = Array(10).fill(10); sv.rift.best = 30;
for (const s of A.SLOTS) sv.equipped[s] = A.genItem(sv, 10, 3, s);
{ const k = A.genSkill(sv, 'snipe', 0); sv.skills.push(k); sv.loadout[1] = { uid: k.uid, rule: 'front' }; const m = A.genSkill(sv, 'bomb', 0); sv.skills.push(m); sv.loadout[2] = { uid: m.uid, rule: 'front' }; }
let guardHit = 0, wins = 0, itemsFire = 0, items = 0, uniq = {};
for (let run = 0; run < 6; run++) {
  const b = A.createBattle(sv, { kind: 'hive', act: 10, tier: 22, vsel: 1 + run % 4, name: 'h' }); b.noFx = true; b.hpM *= 1e-9; b.atkM *= 1e-9; b.inv = 1e9; b.hp = b.maxHp = 1e15;
  let t = 0, bossHpMin = 1, maxAdds = 0;
  while (!b.over && t < 600) { A.stepBattle(b, 0.05); t += 0.05; const bo = b.bossRef; if (bo && !bo.dead) { bossHpMin = Math.min(bossHpMin, bo.hp / bo.maxHp); if (bo.guard && bo.hp < bo.maxHp) guardHit++; } maxAdds = Math.max(maxAdds, b.enemies.length); }
  const res = A.finishBattle(sv, b);
  if (res.win) wins++;
  for (const it of res.items) { items++; if (it.uniq) uniq[it.uniq] = (uniq[it.uniq] || 0) + 1; if (it.affixes.some(a => ['fireDmg','igniteChance','dotDmg'].includes(a.k))) itemsFire++; }
  if (run < 3) console.log('run', run, 'win', res.win, 'time', Math.round(b.time), 'maxEnemies', maxAdds, 'items', res.items.length, 'orbC', res.orbC);
}
console.log({ wins, guardHit, items, itemsFire, uniq });
