const A = require('./simlib.js');
const sv = A.newSave(); sv.tut.done = true; sv.level = 90; sv.slots = 4; sv.endgame = true; sv.lanesBase = 3; sv.cleared = Array(10).fill(10); sv.rift.best = 30;
for (const s of A.SLOTS) sv.equipped[s] = A.genItem(sv, 10, 3, s);
{ const k = A.genSkill(sv, 'snipe', 0); sv.skills.push(k); sv.loadout[1] = { uid: k.uid, rule: 'front' }; }
const tally = {};
for (let run = 0; run < 80; run++) {
  const vsel = 1 + run % 4;
  const b = A.createBattle(sv, { kind: 'void', act: 10, tier: 30, vsel, name: 'v' }); b.noFx = true; b.hpM *= 1e-12; b.inv = 1e9; b.hp = b.maxHp = 1e15;
  let t = 0; while (!b.over && t < 600) { A.stepBattle(b, 0.05); t += 0.05; }
  const res = A.finishBattle(sv, b);
  const T = tally[vsel] = tally[vsel] || { n: 0, win: 0, uniq: 0, items: 0, label: b.bossRef && b.bossRef.label };
  T.n++; T.win += res.win ? 1 : 0; T.uniq += res.uniques; T.items += res.items.length;
}
console.log(JSON.stringify(tally));
