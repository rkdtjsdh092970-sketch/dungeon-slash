// 웹판 성장 시뮬 (로블록스 sim/progress.lua 이식): node progress.js <seed> <battles>
const fs = require('fs'); const D = 'C:/Users/kaseo/dungeon-slash/source/src/';
const src = ['util','data','data2','data3','data4','data5','data6','data7','data8','satan','class','state','battle','battle2'].map(f => fs.readFileSync(D + f + '.js', 'utf8')).join('\n');
global.localStorage = { getItem: () => null, setItem() {} }; global.document = { createElement: () => ({ getContext: () => ({}) }) }; global.window = {};
const seed = +process.argv[2] || 1, BUDGET = +process.argv[3] || 720;
let s0 = seed * 9301 + 49297; Math.random = () => { s0 = (s0 * 16807) % 2147483647; return (s0 - 1) / 2147483646; };
const A = new Function(src + `;return { newSave, createBattle, stepBattle, finishBattle, botEquip, enhance, gachaPull, autoPassives, computeStats, playerPower, SKILLS, MAP, RIFT_MODS, seeded, TUTORIAL, EQ_SLOTS, CFG, riftRegion, skillTier };`)();
const riftMods = (tier) => { const r = A.seeded(tier * 131 + 7), n = tier < 10 ? 0 : tier < 30 ? 1 : tier < 60 ? 2 : 3, pool = A.RIFT_MODS.slice(), out = []; for (let i = 0; i < n; i++) out.push(pool.splice(Math.floor(r() * pool.length), 1)[0]); return out; };
const sv = A.newSave();
const run = (node) => { const b = A.createBattle(sv, node); b.noFx = true; let n = 0; while (!b.over && n < 30000) { A.stepBattle(b, 0.05); n++; } const r = A.finishBattle(sv, b); return b.win; };
const power = () => A.playerPower(A.computeStats(sv));
function bestLoadout() {
  const fam = (sv.equipped.weapon && sv.equipped.weapon.base && sv.equipped.weapon.base.mag != null && sv.equipped.weapon.base.atk == null) ? 'mag' : 'phys';
  const by = (pred) => sv.skills.filter((k) => { const d = A.SKILLS.find((x) => x.id === k.id); return d && pred(d) && (d.dtype == null || d.dtype === fam || d.dtype === 'buff' || d.dtype === 'heal'); });
  const val = (k) => (k.rarity || 0) * 10 + (k.lvl || 1);
  const basics = by((d) => d.slot === 'basic').sort((a, b) => val(b) - val(a)), acts = by((d) => d.slot === 'active' && d.kind !== 'heal').sort((a, b) => val(b) - val(a));
  const lo = [null, null, null, null]; if (basics[0]) lo[0] = { uid: basics[0].uid, rule: 'front' };
  for (let i = 1; i < (sv.slots || 1); i++) if (acts[i - 1]) lo[i] = { uid: acts[i - 1].uid, rule: 'front' };
  sv.loadout = lo;
}
function upkeep() {
  while ((sv.hone || 0) >= 10) A.gachaPull(sv, sv.hone >= 90 ? 10 : 1);
  const staffs = sv.inv.filter((it) => it.slot === 'weapon' && it.base && it.base.mag != null && it.base.atk == null); sv.inv = sv.inv.filter((it) => !staffs.includes(it));   // 전사 봇: 지팡이는 끼지 않음
  A.botEquip(sv); sv.pass = {}; A.autoPassives(sv); bestLoadout();
  for (let i = 0; i < 40; i++) { let low = null; for (const k of A.EQ_SLOTS) { const it = sv.equipped[k]; if (it && (it.enh || 0) < 10 && (!low || (it.enh || 0) < (low.enh || 0))) low = it; } if (!low) break; const r = A.enhance(sv, low); if (!r || r.ok === false) break; }
  if (sv.inv.length > 150) sv.inv.splice(60);
}
// 튜토리얼 → 스테이지 1~5 → 균열
for (let s = 0; s < A.TUTORIAL.length; s++) run({ kind: 'tutorial', act: 1, stage: 1, step: s });
upkeep();
let battles = 0, fails = 0; const marks = [];
while (battles < BUDGET) {
  battles++;
  if ((sv.cleared[0] || 0) < A.CFG.STAGES) { const st = sv.cleared[0] + 1; run({ kind: st === A.CFG.STAGES ? 'boss' : 'stage', act: 1, stage: st, id: 'S1-' + st }); }
  else {
    let t = sv.rift.best + 1; if (fails >= 2) t = Math.max(1, sv.rift.best - 3 * (fails - 2)); t = Math.min(A.CFG.RIFT_END, t);
    const win = run({ kind: 'rift', act: A.riftRegion(t), tier: t, mods: riftMods(t), name: 'r', level: 100 });
    if (win) { if (t > sv.rift.best - 1 || fails >= 2) fails = 0; } else fails = Math.min(fails + 1, 8);
  }
  upkeep();
  if (battles % 120 === 0) marks.push(sv.rift.best);
}
const sk = sv.loadout.filter(Boolean).map((l) => { const k = sv.skills.find((x) => x.uid === l.uid); return k.id + 'r' + k.rarity + 'L' + (k.lvl || 1); });
const enh = A.EQ_SLOTS.map((k) => sv.equipped[k] ? 'T' + sv.equipped[k].ilvl + '+' + (sv.equipped[k].enh || 0) : '-').join(' ');
console.log(JSON.stringify({ seed, marks, lv: sv.level, sk: sk.join('/'), enh }));
