// node sim4.js '{"H0":3}' maxAct trials
const A = require('./simlib.js'); const ov = JSON.parse(process.argv[2] || '{}'); Object.assign(A.CFG, ov);
const MAXACT = +process.argv[3] || 6, N = +process.argv[4] || 4;
const node = (act, stage) => ({ kind: stage === 10 ? 'boss' : 'stage', act, stage, level: (act - 1) * 10 + stage });
const agg = Array.from({ length: MAXACT }, () => ({ fails: 0, farm: 0, min: 0, st: 0, lv: 0, n: 0, stuck: 0, ratio: 0, bossT: 0 }));
for (let tr = 0; tr < N; tr++) {
  const sv = A.newSave();
  for (let s = 0; s < 3; s++) { const b = A.createBattle(sv, { kind: 'tutorial', act: 1, stage: 1, step: s }); b.noFx = true; while (!b.over) A.stepBattle(b, 0.05); A.finishBattle(sv, b); }
  const run = (nd) => { const b = A.createBattle(sv, nd); b.noFx = true; while (!b.over) A.stepBattle(b, 0.05); A.finishBattle(sv, b); return b; };
  const upgrade = () => { for(let k=0;k<30;k++){const c=A.PASSIVES.filter((p)=>A.canAddPassive(sv,p.id)); if(!c.length)break; const pri={def:3,phys:4,util:2,mag:3,elem:1,mana:1,bridge:1}; c.sort((x,y)=>(pri[y.arm]||0)-(pri[x.arm]||0)||x.cost-y.cost); A.addPassive(sv,c[0].id);} A.botEquip(sv); for (let k = 0; k < 40; k++) { let best = null; for (const s of A.SLOTS) { const it = sv.equipped[s]; if (!it || (it.enh || 0) >= 10) continue; const c = A.enhCost(it); if (sv.gold >= c.gold && sv.ore >= c.ore && (!best || c.gold < best.c.gold)) best = { it, c }; } if (!best) break; A.enhance(sv, best.it); } };
  let dead = false;
  for (let act = 1; act <= MAXACT && !dead; act++) {
    const g = agg[act - 1]; let actT = 0, stT = 0;
    for (let st = 1; st <= 10; st++) {
      let tries = 0, ok = false;
      while (!ok && tries < 30) {
        upgrade(); const b = run(node(act, st)); tries++; actT += b.time;
        if (b.win) { ok = true; stT += b.time; if (st === 10) g.bossT += b.time; } else { g.fails++; const fs = Math.max(1, st - 2); for (let i = 0; i < 2; i++) { upgrade(); const f = run(node(act, fs)); actT += f.time; g.farm++; } }
      }
      if (!ok) { g.stuck++; dead = true; break; }
    }
    if (!dead) { g.n++; g.min += actT / 60; g.st += stT / 10; g.lv += sv.level; g.ratio += A.playerPower(A.computeStats(sv)) / A.recPower(act, 10); }
  }
}
agg.forEach((g, i) => { const n = Math.max(1, g.n); console.log(`act ${i + 1}: ok=${g.n}/${N} stuck=${g.stuck} fails=${(g.fails / N).toFixed(1)} farm=${(g.farm / N).toFixed(1)} min=${(g.min / n).toFixed(0)} avgStage=${(g.st / n).toFixed(0)}s bossT=${(g.bossT / n).toFixed(0)}s lv=${(g.lv / n).toFixed(0)}`); });
