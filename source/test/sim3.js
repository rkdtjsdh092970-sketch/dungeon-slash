// 파라미터 오버라이드 가능: node sim3.js '{"H0":3}' maxAct
const A = require('./simlib.js'); const ov = JSON.parse(process.argv[2] || '{}'); Object.assign(A.CFG, ov);
const sv = A.newSave();
for (let s = 0; s < 3; s++) { const b = A.createBattle(sv, { kind: 'tutorial', act: 1, stage: 1, step: s }); b.noFx = true; while (!b.over) A.stepBattle(b, 0.05); A.finishBattle(sv, b); }
const run = (node) => { const b = A.createBattle(sv, node); b.noFx = true; while (!b.over) A.stepBattle(b, 0.05); const r = A.finishBattle(sv, b); return { b, r }; };
const upgrade = () => { A.botEquip(sv); for (let k = 0; k < 40; k++) { let best = null; for (const s of A.SLOTS) { const it = sv.equipped[s]; if (!it || (it.enh || 0) >= 10) continue; const c = A.enhCost(it); if (sv.gold >= c.gold && sv.ore >= c.ore && (!best || c.gold < best.c.gold)) best = { it, c }; } if (!best) break; A.enhance(sv, best.it); } };
const node = (act, stage) => ({ kind: stage === 10 ? 'boss' : 'stage', act, stage, level: (act - 1) * 10 + stage });
const MAXACT = +process.argv[3] || 10, verbose = process.argv[4] === 'v';
let tsec = 0, battles = 0;
for (let act = 1; act <= MAXACT; act++) {
  let fails = 0, farm = 0, actT = 0, ts = [];
  for (let st = 1; st <= 10; st++) {
    let tries = 0, ok = false;
    while (!ok && tries < 60) {
      upgrade(); const ratio = A.playerPower(A.computeStats(sv)) / A.recPower(act, st); const { b } = run(node(act, st)); tries++; battles++; tsec += b.time; actT += b.time;
      if (b.win) { ok = true; ts.push(Math.round(b.time)); if (verbose) console.log(`A${act}S${st} win t=${b.time.toFixed(0)} hp=${Math.round(b.hp / b.maxHp * 100)}% lv${sv.level} ratio=${ratio.toFixed(2)} tries${tries}`); }
      else { fails++; if (verbose) console.log(`A${act}S${st} LOSE t=${b.time.toFixed(0)} ratio=${ratio.toFixed(2)}`); const fs = Math.max(1, st - 2); for (let i = 0; i < 2; i++) { upgrade(); const f = run(node(act, fs)); battles++; tsec += f.b.time; actT += f.b.time; farm++; } }
    }
    if (!ok) { console.log(`A${act}S${st} STUCK`); process.exit(); }
  }
  console.log(`act ${act}: lv${sv.level} fails=${fails} farm=${farm} actMin=${(actT / 60).toFixed(0)} stageT=[${ts.join(',')}] ilvl=${A.computeStats(sv).avgIlvl.toFixed(1)} bossHp?`);
}
console.log('battles', battles, 'minutes', (tsec / 60).toFixed(0));
