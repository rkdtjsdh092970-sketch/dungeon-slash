const A = require('./simlib.js');
const sv = A.newSave(); sv.tut.done = true; sv.level = 60;
const kinds = [['stage',3,5,false],['boss',3,10,true],['elite',3,5,false],['treasure',3,5,false],['rift',10,10,false,10],['hell',10,10,false,10],['endless',10,1,false,0,6]];
for (const [kind, act, stage, boss, tier, waves] of kinds) {
  let u = 0, n = 400;
  for (let i = 0; i < n; i++) { const d = A.rollDrops(sv, { kind, act, stage, tier: tier || 0, waves: waves || 0, firstClear: false }, boss, A.dropBonus(sv)); u += d.uniques; }
  console.log(kind, 'uniques per clear:', (u / n).toFixed(3), '→ 1 per', (n / Math.max(u, 0.01)).toFixed(0), 'clears');
}
