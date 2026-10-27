const A = require('./simlib.js');
const sv = A.newSave(); sv.tut.done = true; sv.level = 100; sv.slots = 4; sv.endgame = true; sv.lanesBase = 3; sv.cleared = Array(10).fill(10); sv.rift.best = 30;
for (const s of A.SLOTS) sv.equipped[s] = A.genItem(sv, 14, 3, s);
{ for (const id of ['snipe','bomb','chain']) { const k = A.genSkill(sv, id, 0); sv.skills.push(k); sv.loadout[sv.loadout.indexOf(null)] = { uid: k.uid, rule: 'front' }; } }
const run = (node) => { let G = 0, T = 0, N = 6; for (let i = 0; i < N; i++) { const b = A.createBattle(sv, node); b.noFx = true; b.hpM *= 0.02; b.inv = 1e9; b.hp = b.maxHp = 1e15; let t = 0; while (!b.over && t < 900) { A.stepBattle(b, 0.05); t += 0.05; } const r = A.finishBattle(sv, b); G += r.gold; T += b.time; } return { goldPerMin: Math.round(G / T * 60), sec: Math.round(T / N) }; };
console.log('rift 20', run({ kind: 'rift', act: 11, tier: 20, mods: [], name: 'r' }));
console.log('rift 27', run({ kind: 'rift', act: 11, tier: 27, mods: [], name: 'r' }));
console.log('vault (best 30)', run({ kind: 'vault', act: 10, tier: 27, name: 'v' }));
console.log('endless', run({ kind: 'endless', act: 10, tier: 28, name: 'e' }));
console.log('treasure a10', run({ kind: 'treasure', act: 10, stage: 11, name: 't' }));
