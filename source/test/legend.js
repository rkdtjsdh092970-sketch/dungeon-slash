const A = require('./simlib.js'); const fs = require('fs');
const S = JSON.parse(fs.readFileSync(__dirname + '/sam.json', 'utf8'));
// 이상적인 "전설 풀세트": ilvl 18(균열 최고권), 옵션 전부 최대 롤, +10 강화, 삼촌의 스킬·패시브
function ideal(ilvl, seedTag) {
  const sv = A.newSave(); Object.assign(sv, { level: 100, slots: 4, lanesBase: 3, endgame: true, rift: { best: 60 }, cleared: Array(10).fill(10) }); sv.tut.done = true;
  sv.skills = JSON.parse(JSON.stringify(S.skills)); sv.loadout = JSON.parse(JSON.stringify(S.loadout)); sv.pass = {}; for (const id of S.pass) if (/^(phys|def)_|^b\d_/.test(id)) sv.pass[id] = 1;
  for (const slot of A.SLOTS) {
    const mk = () => { const it = A.genItem(sv, ilvl, 3, slot); it.enh = 10; for (const a of it.affixes) { const d = A.AFFIXES.find(x => x.k === a.k); const [, hi] = A.affixRange(d, it.ilvl, 3); a.v = d.count ? Math.round(hi) : hi; } return it; };
    // 같은 부위 5개를 뽑아 전투력이 가장 높은 것 선택 (플레이어가 고르는 것과 같음)
    let best = null, bp = -1; for (let k = 0; k < 12; k++) { const it = mk(); sv.equipped[slot] = it; const p = A.playerPower(A.computeStats(sv)); if (p > bp) { bp = p; best = it; } } sv.equipped[slot] = best;
  }
  sv.equipped.ring2 = sv.equipped.ring ? JSON.parse(JSON.stringify(sv.equipped.ring)) : undefined; if (sv.equipped.ring2) sv.equipped.ring2.uid = sv.nextUid++;
  return sv;
}
function run(sv, vsel) { const b = A.createBattle(sv, { kind: 'void', act: 10, tier: 30, vsel, name: 'v' }); b.noFx = true; let t = 0, hm = b.maxHp; while (!b.over && t < 1800) { A.stepBattle(b, 0.05); t += 0.05; hm = Math.min(hm, b.hp); } const bo = b.bossRef; return `${b.win ? 'WIN ' : 'lose'} ${Math.round(b.time)}s boss${bo ? Math.round(Math.max(0, bo.hp) / bo.maxHp * 100) : 0}% minHP${Math.round(Math.max(0, hm) / b.maxHp * 100)}%`; }
for (const ilvl of [16, 18, 20]) { const sv = ideal(ilvl); const st = A.computeStats(sv); console.log(`\n이상적 전설 풀세트 ilvl ${ilvl} | power ${Math.round(A.playerPower(st)).toExponential(2)} atk ${Math.round(st.atk)} hp ${Math.round(st.maxHp)}`);
  for (const v of [3, 4]) console.log('  stage', v, run(sv, v), '|', run(sv, v)); }
