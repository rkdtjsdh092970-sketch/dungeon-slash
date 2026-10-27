const A = require('./simlib.js');
const sv = A.newSave();
for (let s = 0; s < 3; s++) { const b = A.createBattle(sv, { kind: 'tutorial', act: 1, stage: 1, step: s }); b.noFx = true; while (!b.over) A.stepBattle(b, 0.05); A.finishBattle(sv, b); }
const run = (node) => { const b = A.createBattle(sv, node); b.noFx = true; while (!b.over) A.stepBattle(b, 0.05); const r = A.finishBattle(sv, b); return { b, r }; };
const upgrade = () => { A.botEquip(sv); for (let k = 0; k < 40; k++) { let best = null; for (const s of A.SLOTS) { const it = sv.equipped[s]; if (!it || (it.enh || 0) >= 10) continue; const c = A.enhCost ? A.enhCost(it) : null; if (c && sv.gold >= c.gold && sv.ore >= c.ore && (!best || c.gold < best.c.gold)) best = { it, c }; } if (!best) break; A.enhance(sv, best.it); } };
const node = (act, stage) => ({ kind: stage === 10 ? 'boss' : 'stage', act, stage, level: (act - 1) * 10 + stage });
let battles = 0, tsec = 0; const log = [];
const MAXACT = +process.argv[2] || 10;
for (let act = 1; act <= MAXACT; act++) {
  let farmed = 0, fails = 0, first = [];
  for (let st = 1; st <= 10; st++) {
    let tries = 0, ok = false;
    while (!ok && tries < 40) {
      upgrade(); const { b, r } = run(node(act, st)); battles++; tsec += b.time; tries++;
      if (b.win) { ok = true; if (st === 10 || st === 1 || st === 5) log.push(`A${act}S${st} win t=${b.time.toFixed(0)} hp=${Math.round(b.hp / b.maxHp * 100)}% lv${sv.level} tries${tries}`); }
      else { fails++; // 이전 스테이지 파밍
        const fs = Math.max(1, st - 2); for (let i = 0; i < 2; i++) { upgrade(); const f = run(node(act, fs)); battles++; tsec += f.b.time; farmed++; } }
    }
    if (!ok) { log.push(`A${act}S${st} STUCK`); break; }
  }
  log.push(`== act ${act} done: lv${sv.level} fails=${fails} farmBattles=${farmed} power=${Math.round(A.playerPower(A.computeStats(sv)))} gearIlvl=${A.computeStats(sv).avgIlvl.toFixed(1)}`);
}
console.log(log.join('\n')); console.log('battles', battles, 'total game-minutes', (tsec / 60).toFixed(0));
