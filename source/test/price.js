const A = require('./simlib.js');
const sv = A.newSave(); sv.tut.done = true; sv.level = 40; sv.slots = 4;
for (const act of [1, 3, 5, 8, 10]) {
  for (const kind of ['stage', 'boss']) {
    let gold = 0, sell = 0, n = 0, items = 0, dis = 0;
    for (let k = 0; k < 20; k++) {
      const node = { kind, act, stage: kind === 'boss' ? 10 : 5 };
      const d = A.rollDrops(sv, node, kind === 'boss', A.dropBonus(sv));
      for (const it of d.items) { sell += A.itemValue(it); items++; }
      const b = A.createBattle(sv, node); b.noFx = true; let t = 0; b.hp = b.maxHp = 1e12; b.hpM *= 1e-4; while (!b.over && t < 400) { A.stepBattle(b, 0.1); t += 0.1; }
      gold += b.gold; n++;
    }
    console.log(`act ${act} ${kind}: gold/clear≈${Math.round(gold / n)}, drops/clear=${(items / n).toFixed(1)}, sell value of drops≈${Math.round(sell / n)}G (${(sell / Math.max(1, gold) * 100).toFixed(0)}% of gold), enhCost+1 ≈ ${Math.round(40 * A.itemValue({ilvl: act, rarity: 0, enh: 0}) / 8)}G`);
  }
}
