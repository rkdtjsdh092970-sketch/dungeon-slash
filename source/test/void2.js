const A = require('./simlib.js');
const sv = A.newSave(); sv.tut.done = true; sv.level = 90; sv.slots = 4; sv.endgame = true; sv.lanesBase = 3; sv.cleared = Array(10).fill(10); sv.rift.best = 30;
for (const s of A.SLOTS) sv.equipped[s] = A.genItem(sv, 10, 3, s);
const b = A.createBattle(sv, { kind: 'void', act: 10, tier: 30, name: 'v' }); b.noFx = true; b.hpM *= 1e-12; b.inv = 1e9; b.hp = b.maxHp = 1e15;
let t = 0; while (!b.over && t < 300) { A.stepBattle(b, 0.05); t += 0.05; }
console.log('time', Math.round(t), 'plan', b.plan.length, b.plan.slice(0, 5).join(','), 'enemies', b.enemies.map(e => [e.type, e.col, e.lane, e.tier, e.hp]).slice(0, 6), 'kills', b.kills, 'bossRef', b.bossRef && [b.bossRef.dead, b.bossRef.hp], 'cleared', b.voidCleared, 'spawnCd', b.spawnCd);
console.log('skills', b.skills.map(s => s && [s.id, s.range, s.cdLeft]), 'maxReach', b.maxReach);
