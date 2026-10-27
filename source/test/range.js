const A = require('./simlib.js');
const sv = A.newSave(); sv.gold = 1e12; sv.ore = 1e6; sv.orbC = 1e6; sv.orbD = 1e6; sv.dice = 1e6;
let bad = 0, total = 0; const why = {};
const chk = (it, tag) => {
  for (const a of it.affixes) { const d = A.AFFIXES.find(x => x.k === a.k); const [lo, hi] = A.affixRange(d, it.ilvl, Math.min(it.rarity, 4)); total++;
    if (a.v < lo - 1e-9 || a.v > hi + 1e-9) { bad++; why[tag + ':' + a.k] = (why[tag + ':' + a.k] || 0) + 1; } }
};
for (let i = 0; i < 4000; i++) {
  const ilvl = 1 + (i % 25), rar = 1 + (i % 4); const slot = A.SLOTS[i % A.SLOTS.length];
  const it = A.genItem(sv, ilvl, rar, slot, rar === 4 ? 'guardian' : undefined); chk(it, 'gen');
  if (it.affixes.length) { A.rerollAffix(sv, it, 0); chk(it, 'reroll'); A.divineItem(sv, it); chk(it, 'divine'); A.diceItem(sv, it); chk(it, 'dice'); }
  if (it.affixes.length < 6) { A.addAffix(sv, it); chk(it, 'chaos'); }
}
// 고유: 범위 확인
let ub = 0, ut = 0;
for (const D of A.UNIQUES) for (let n = 0; n < 40; n++) {
  const u = A.genUnique(sv, D, 10); for (const m of u.umods) { const def = D.mods.find(x => x[0] === m.k), v = def[1]; ut++;
    if (Array.isArray(v)) { const lo = A.umodScale(D, m.k, Math.min(...v)), hi = A.umodScale(D, m.k, Math.max(...v)); if (m.v < Math.min(lo, hi) - 1e-9 || m.v > Math.max(lo, hi) + 1e-9) ub++; } }
}
console.log({ total, bad, why, ut, ub, rolledUniques: A.UNIQUES.filter(D => D.mods.some(m => Array.isArray(m[1]))).length + '/' + A.UNIQUES.length });
