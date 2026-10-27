const A = require('./simlib.js');
const sv = A.newSave(); sv.tut.done = true; sv.level = 90; sv.slots = 4; sv.endgame = true; sv.lanesBase = 3; sv.cleared = Array(10).fill(10); sv.rift.best = 30;
for (const s of A.SLOTS) sv.equipped[s] = A.genItem(sv, 10, 3, s);
{ const k = A.genSkill(sv, 'snipe', 0); sv.skills.push(k); sv.loadout[1] = { uid: k.uid, rule: 'front' }; }
const tally = { u: {}, cleared: {} };
for (let run = 0; run < 400; run++) {
  const stop = run % 4;   // 0: 4단계 전부, 1..3: 해당 단계에서 사망
  const b = A.createBattle(sv, { kind: 'void', act: 10, tier: 30, name: 'v' }); b.noFx = true; b.hpM *= 1e-12; b.inv = 1e9; b.hp = b.maxHp = 1e15;
  let t = 0; while (!b.over && t < 2000) { A.stepBattle(b, 0.05); t += 0.05; if (stop && (b.voidCleared || 0) >= stop) { b.maxHp = 1; b.hp = -1; b.inv = 0; } }
  const res = A.finishBattle(sv, b);
  tally.cleared[res.voidCleared] = (tally.cleared[res.voidCleared] || 0) + 1;
  for (const it of res.items) if (it.uniq) tally.u[it.uniq + '/' + res.voidCleared] = (tally.u[it.uniq + '/' + res.voidCleared] || 0) + 1;
  if (run < 2) console.log('run', run, 'win', res.win, 'cleared', res.voidCleared, 'items', res.items.length, 'uniq', res.uniques, 'time', Math.round(b.time), 'enemy hp mult', b.hpM.toExponential(1));
}
console.log(JSON.stringify(tally));
