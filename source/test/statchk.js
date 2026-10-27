const A = require('./simlib.js'); const { make } = require('./pvm.js');
const IL = 16;
function maxU(sv, id) { const D = A.UNIQUE_BY_ID[id], it = A.genUnique(sv, D, IL); it.enh = 10; it.umods = D.mods.map(([k, v]) => ({ k, v: A.umodScale(D, k, Array.isArray(v) ? (v[0] + v[1]) / 2 : v) })); for (const a of it.affixes) { const d = A.AFFIXES.find((x) => x.k === a.k); const [lo, hi] = A.affixRange(d, it.ilvl, 3); a.v = d.count ? Math.round((lo + hi) / 2) : (lo + hi) / 2; } it.uid = sv.nextUid++; return it; }
function race(sv) { const b = A.createBattle(sv, { kind: 'void', act: 10, tier: 30, vsel: 3, name: 'v' }); b.noFx = true; b.hp = b.maxHp = 1e18; b.inv = 1e9; let t = 0; while (!b.over && t < 900) { A.stepBattle(b, 0.05); t += 0.05; if (b.bossKills > 0) break; } return b.time; }
const avg = (f, n = 3) => { let s = 0; for (let i = 0; i < n; i++) s += f(); return s / n; };
function setSkills(sv, ids) { sv.skills = []; sv.loadout = [null, null, null, null]; ids.forEach(([id, r], i) => { const k = A.genSkill(sv, id, r); k.lvl = 20; sv.skills.push(k); sv.loadout[i] = { uid: k.uid, rule: i === 0 ? 'front' : 'auto' }; }); }
const cases = [
  ['출혈', '물리', [['strike', 0], ['butcher', 2], ['rend', 2], ['gut', 2]], ['hookblade', 'bloodbrand']],
  ['중독', '물리', [['strike', 0], ['venomburst', 2], ['venom', 2], ['toxin', 2]], ['toxheart', 'fangseal']],
  ['점화', '마법(화염)', [['strike', 0], ['scorchbrand', 2], ['inferno', 2], ['bomb', 2]], ['cinderstaff', 'scorchrobe']],
  ['둔화', '마법(번개)', [['spark', 0], ['shatter', 2], ['iceshard', 2], ['blizzard', 2]], ['rimescepter', 'shatterglove']],
  ['감전', '마법(번개)', [['spark', 0], ['discharge', 2], ['shockspray', 2], ['storm', 2]], ['arcspear', 'shockcrown']],
];
for (const [nm, bn, skills, us] of cases) {
  const mk = () => { const sv = make(bn, IL); setSkills(sv, skills); return sv; };
  const base = avg(() => race(mk()));
  const one = avg(() => { const sv = mk(); sv.equipped[A.UNIQUE_BY_ID[us[0]].slot] = maxU(sv, us[0]); return race(sv); });
  const two = avg(() => { const sv = mk(); for (const u of us) { const sl = A.UNIQUE_BY_ID[u].slot; sv.equipped[sl] = maxU(sv, u); } return race(sv); });
  console.log(`${nm} (${bn}) 보스 처치 시간: 전설 ${base.toFixed(1)}s | 핵심 1부위 ${one.toFixed(1)}s (${(one / base).toFixed(2)}) | 2부위 ${two.toFixed(1)}s (${(two / base).toFixed(2)})`);
}
