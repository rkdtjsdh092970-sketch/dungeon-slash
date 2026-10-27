const A = require('./simlib.js'); const { make } = require('./pvm.js');
const sv0 = A.newSave();
console.log('강화 +10 기대 골드(아이템당) / 재굴림 1회 / 판매가');
for (const il of [10, 14, 16, 18, 20, 24]) { const it = A.genItem(sv0, il, 3, 'weapon'); let g = 0, ore = 0; for (let e = 0; e < 10; e++) { it.enh = e; const c = A.enhCost(it); const att = 1 / A.ENH_RATE[e]; g += c.gold * att; ore += (c.ore * (1 + (att - 1) * 0.5)) * 1; }
  it.enh = 0; console.log(`ilvl ${il}: 강화 ${Math.round(g).toLocaleString()}G / 강화석 ${Math.round(ore)} | 재굴림 ${Math.round(A.itemValue(it) * 2.5 * (il > 10 ? 1.6 : 1)).toLocaleString()}G | 판매 ${A.itemValue(it).toLocaleString()}G`); }
for (const [bn, kind, tier, extra] of [['물리', 'rift', 40, {}], ['물리', 'rift', 60, {}], ['물리', 'vault', 30, {}]]) {
  const sv = make(bn, 16); const node = kind === 'vault' ? { kind: 'vault', act: 10, tier: Math.floor(60 * A.CFG.VAULT_TIER_K), name: 'v' } : { kind, act: 11, tier, mods: [], name: 'r' };
  const b = A.createBattle(sv, node); b.noFx = true; let t = 0; while (!b.over && t < 600) { A.stepBattle(b, 0.05); t += 0.05; } const g0 = sv.gold; const res = A.finishBattle(sv, b);
  console.log(`${kind} T${tier}: ${b.win ? 'WIN' : 'lose'} ${Math.round(b.time)}s 골드 ${Math.round(res.gold).toLocaleString()} → 분당 ${Math.round(res.gold / (b.time / 60)).toLocaleString()}G`);
}
