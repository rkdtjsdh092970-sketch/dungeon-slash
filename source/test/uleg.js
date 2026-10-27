const A = require('./simlib.js'); const { make } = require('./pvm.js');
const IL = +process.env.IL || 16;
function maxU(sv, id, ilvl) { const D = A.UNIQUE_BY_ID[id], it = A.genUnique(sv, D, ilvl); it.enh = 10; it.umods = D.mods.map(([k, v]) => ({ k, v: A.umodScale(D, k, Array.isArray(v) ? Math.max(...v) : v) })); it.uid = sv.nextUid++; for (const a of it.affixes) { const d = A.AFFIXES.find((x) => x.k === a.k); const [lo, hi] = A.affixRange(d, it.ilvl, 3); a.v = d.count ? Math.round((lo + hi) / 2) : (lo + hi) / 2; } return it; }
const builds = ['물리', '마법(번개)', '마법(화염)', '마나 주문', '마나+방어']; const res = {};
for (const bn of builds) {
  const sv = make(bn, IL); const base = A.playerPower(A.computeStats(sv));
  for (const D of A.UNIQUES) {
    let slot = D.slot, tgt = slot === 'ring' ? 'ring' : slot; const old = sv.equipped[tgt]; sv.equipped[tgt] = maxU(sv, D.id, IL); const p = A.playerPower(A.computeStats(sv)); sv.equipped[tgt] = old;
    const r = res[D.id] || (res[D.id] = { tier: D.tier, pool: D.pool, slot: D.slot, best: 0, bn: '' }); const ratio = p / base; if (ratio > r.best) { r.best = ratio; r.bn = bn; }
  }
}
const by = {}; for (const [id, r] of Object.entries(res)) (by[r.tier] = by[r.tier] || []).push([id, r]);
for (const t of [1, 2, 3, 4]) { const L = by[t].sort((a, b) => b[1].best - a[1].best); const avg = L.reduce((a, x) => a + x[1].best, 0) / L.length; console.log(`T${t} n=${L.length} avg ${avg.toFixed(3)} min ${L[L.length - 1][1].best.toFixed(3)} max ${L[0][1].best.toFixed(3)}`); if (process.env.V) console.log('   ' + L.map(([id, r]) => `${id}(${r.slot},${r.pool}):${r.best.toFixed(2)}`).join(' ')); }

if (process.env.W) { const lim = { 1: -1, 2: 1.0, 3: 1.3, 4: 2.5 }; for (const [id, r] of Object.entries(res)) if (r.best < lim[r.tier]) { const D = A.UNIQUE_BY_ID[id]; console.log(`T${r.tier} ${id} ${D.name} (${D.slot},${D.pool}) ${r.best.toFixed(2)}[${r.bn}] :: ` + D.mods.map(([k, v]) => k + '=' + (Array.isArray(v) ? v.map(x => +x.toFixed(2)).join('~') : v)).join(' ')); } }
