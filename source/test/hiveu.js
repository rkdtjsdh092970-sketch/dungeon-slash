const A = require('./simlib.js');
const sv = A.newSave(); sv.tut.done = true; sv.level = 100; sv.endgame = true; sv.cleared = Array(10).fill(10);
for (let st = 1; st <= 4; st++) { let runs = 20000, got = 0, multi = 0, t4 = 0, tiers = [0,0,0,0,0];
  for (let i = 0; i < runs; i++) { const d = A.rollDrops(sv, { kind: 'hive', act: 10, tier: 22, vsel: st }, true, A.dropBonus(sv)); const u = d.items.filter(x => x.uniq); if (u.length) got++; if (u.length > 1) multi++; for (const x of u) { tiers[x.utier]++; if (x.utier === 4) t4++; } }
  console.log('stage', st, 'unique/run', (got / runs * 100).toFixed(1) + '%', 'runs with 2+ uniques:', multi, 'tier counts', JSON.stringify(tiers.slice(1)), 'angelic', t4); }
