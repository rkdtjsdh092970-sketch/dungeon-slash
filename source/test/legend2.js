const A = require('./simlib.js'); const fs = require('fs');
const S = JSON.parse(fs.readFileSync(__dirname + '/sam.json', 'utf8'));
function maxUnique(sv, id, ilvl) { const D = A.UNIQUE_BY_ID[id], it = A.genUnique(sv, D, ilvl); it.enh = 10; it.umods = D.mods.map(([k, v]) => ({ k, v: A.umodScale(D, k, Array.isArray(v) ? Math.max(...v) : v) })); it.uid = sv.nextUid++; return it; }
function ideal(ilvl, angelic) {
  const sv = A.newSave(); Object.assign(sv, { level: 100, slots: 4, lanesBase: 3, endgame: true, rift: { best: 60 }, cleared: Array(10).fill(10) }); sv.tut.done = true;
  sv.skills = JSON.parse(JSON.stringify(S.skills)); sv.loadout = JSON.parse(JSON.stringify(S.loadout)); sv.pass = {}; for (const id of S.pass) if (/^(phys|def)_|^b\d_/.test(id)) sv.pass[id] = 1;
  for (const slot of A.SLOTS) { const mk = () => { const it = A.genItem(sv, ilvl, 3, slot); it.enh = 10; for (const a of it.affixes) { const d = A.AFFIXES.find(x => x.k === a.k); const [, hi] = A.affixRange(d, it.ilvl, 3); a.v = d.count ? Math.round(hi) : hi; } return it; };
    let best = null, bp = -1; for (let k = 0; k < 12; k++) { const it = mk(); sv.equipped[slot] = it; const p = A.playerPower(A.computeStats(sv)); if (p > bp) { bp = p; best = it; } } sv.equipped[slot] = best; }
  sv.equipped.ring2 = JSON.parse(JSON.stringify(sv.equipped.ring)); sv.equipped.ring2.uid = sv.nextUid++;
  if (angelic >= 1) sv.equipped.helm = maxUnique(sv, 'abyssalcrown', ilvl); if (angelic >= 2) sv.equipped.armor = maxUnique(sv, 'voidheart', ilvl);
  return sv; }
function run(sv, v) { const b = A.createBattle(sv, { kind: 'void', act: 10, tier: 30, vsel: v, name: 'v' }); b.noFx = true; let t = 0, hm = b.maxHp; while (!b.over && t < 1800) { A.stepBattle(b, 0.05); t += 0.05; hm = Math.min(hm, b.hp); } const bo = b.bossRef; return `${b.win ? 'WIN ' : 'lose'} ${Math.round(b.time)}s boss${bo ? Math.round(Math.max(0, bo.hp) / bo.maxHp * 100) : 0}% minHP${Math.round(Math.max(0, hm) / b.maxHp * 100)}%`; }
console.log('VT=' + (process.env.VT || 'default'));
for (const ilvl of [18, 20]) for (const ang of [0, 2]) { const sv = ideal(ilvl, ang); console.log(` ilvl ${ilvl} 엔젤릭 ${ang}개 | power ${Math.round(A.playerPower(A.computeStats(sv))).toExponential(2)} | stage4:`, run(sv, 4)); }
