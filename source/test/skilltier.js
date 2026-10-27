const A = require('./simlib.js');
const sv = A.newSave(); sv.tut.done = true; sv.level = 100; sv.endgame = true; sv.cleared = Array(10).fill(10);
const cnt = [0,0,0,0,0,0]; let n = 0;
for (let i = 0; i < 30000; i++) { const d = A.rollDrops(sv, { kind: 'trial', act: 11, tier: 100 }, false, A.dropBonus(sv)); for (const s of d.skills) { cnt[s.rarity]++; n++; } }
console.log('trial T100 skills', n, cnt.map((c) => (c / n * 100).toFixed(2) + '%').join(' | '));
const sk = A.skillOf({ uid: 1, id: 'smash', rarity: 5 }); console.log('angelic smash mult', sk.mult, 'cd', sk.cd.toFixed(2), 'bonus', JSON.stringify(sk.bonus));
