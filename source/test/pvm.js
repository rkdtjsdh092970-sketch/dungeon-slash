// 물리 vs 마법: 같은 장비 품질(전설 풀세트 ilvl 16, +10, 12개 중 최적 선택) · 같은 패시브 규모에서 비교
const A = require('./simlib.js');
const armNodes = (arm) => A.PASSIVES.filter((p) => p.arm === arm).sort((a, b) => Math.hypot(a.x, a.y) - Math.hypot(b.x, b.y));
function pickPass(arms, shares, budget) { const out = {}; arms.forEach((arm, i) => { let left = Math.round(budget * shares[i]); for (const p of armNodes(arm)) { if (p.cost > left) continue; left -= p.cost; out[p.id] = 1; } }); return out; }
const BUILDS = {
  '물리': { skills: [['strike', 0], ['boomer', 2], ['pierce2', 2], ['lance', 2]], arms: ['phys', 'def'], sh: [0.55, 0.45] },
  '마법(번개)': { skills: [['spark', 0], ['chain', 2], ['thunder', 2], ['storm', 2]], arms: ['mag', 'def'], sh: [0.55, 0.45] },
  '마법(화염)': { skills: [['strike', 0], ['bomb', 2], ['inferno', 2], ['meteor', 2]], arms: ['mag', 'def'], sh: [0.55, 0.45] },
  '마나 주문': { skills: [['spark', 0], ['chain', 2], ['thunder', 2], ['manaburst', 2]], arms: ['mag', 'mana'], sh: [0.5, 0.5] },
  '마나+방어': { skills: [['spark', 0], ['chain', 2], ['thunder', 2], ['manaburst', 2]], arms: ['mag', 'mana', 'def'], sh: [0.4, 0.3, 0.3] },
};
function make(name, ilvl) {
  const B = BUILDS[name], sv = A.newSave(); Object.assign(sv, { level: 100, slots: 4, lanesBase: 3, endgame: true, rift: { best: 60 }, cleared: Array(10).fill(10) }); sv.tut.done = true;
  sv.pass = pickPass(B.arms, B.sh, 96);
  sv.skills = []; sv.loadout = [null, null, null, null]; B.skills.forEach(([id, r], i) => { const k = A.genSkill(sv, id, r); k.lvl = 20; sv.skills.push(k); sv.loadout[i] = { uid: k.uid, rule: i === 0 ? 'front' : 'auto' }; });
  const old = Math.random; let seed = 12345; Math.random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };   // 같은 난수 → 같은 후보 장비 풀
  for (const slot of A.SLOTS) { let best = null, bp = -1; for (let k = 0; k < 40; k++) { const it = A.genItem(sv, ilvl, 3, slot); it.enh = 10; for (const a of it.affixes) { const d = A.AFFIXES.find((x) => x.k === a.k); const [lo, hi] = A.affixRange(d, it.ilvl, 3); a.v = d.count ? Math.round((lo + hi) / 2) : (lo + hi) / 2; } sv.equipped[slot] = it; const p = A.playerPower(A.computeStats(sv)); if (p > bp) { bp = p; best = it; } } sv.equipped[slot] = best; }
  Math.random = old; sv.equipped.ring2 = JSON.parse(JSON.stringify(sv.equipped.ring)); sv.equipped.ring2.uid = sv.nextUid++; return sv; }
function probe(sv, tier) { const b = A.createBattle(sv, { kind: 'rift', act: 11, tier, mods: [], name: 'r' }); b.noFx = true; let t = 0, hm = b.maxHp; while (!b.over && t < 300) { A.stepBattle(b, 0.05); t += 0.05; hm = Math.min(hm, b.hp); } return `${b.win ? 'WIN ' : 'lose'} ${Math.round(b.time)}s minHP${Math.round(Math.max(0, hm) / b.maxHp * 100)}% dps${Math.round(b.dealt / Math.max(1, b.time) / 1000)}k`; }
if (process.env.MB) A.CFG.MAG_BASE = +process.env.MB; if (process.env.DPM) A.CFG.DPM_K = +process.env.DPM;
module.exports = { make, BUILDS };
if (require.main === module) {
const ilvl = +process.env.IL || 16, tiers = (process.env.TR || '41,52,60').split(',').map(Number);
for (const name of Object.keys(BUILDS)) { const sv = make(name, ilvl), st = A.computeStats(sv); console.log(`${name.padEnd(8)} power ${A.playerPower(st).toExponential(2)} | atk ${Math.round(st.atk)} mag ${Math.round(st.mag)} hp ${Math.round(st.maxHp)} def ${Math.round(st.def)} mana ${Math.round(st.maxMana)} cdr ${st.cdr.toFixed(2)} | ` + tiers.map((t) => 'T' + t + ':' + probe(sv, t)).join(' | ')); }
}
