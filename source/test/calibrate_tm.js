// 스킬별 "1회 시전당 기본 피해 배율(대상 수 포함)"을 엔진에서 직접 측정한다 → src/data6.js 의 SKILL_TM
const A = require('./simlib.js'); const fs = require('fs');
const out = {};
function makeSave(skillId) {
  const sv = A.newSave(); sv.tut.done = true; sv.level = 80; sv.slots = 1; sv.endgame = true; sv.lanesBase = 3; sv.cleared = Array(10).fill(10);
  const old = Math.random; let seed = 7; Math.random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (const s of A.SLOTS) sv.equipped[s] = A.genItem(sv, 10, 3, s); Math.random = old;
  sv.skills = []; const k = A.genSkill(sv, skillId, 0); sv.skills.push(k); sv.loadout = [{ uid: k.uid, rule: 'front' }, null, null, null]; return sv;
}
for (const def of A.SKILLS) {
  if (process.env.ONLY && !process.env.ONLY.split(',').includes(def.id)) continue;
  if (def.dtype === 'buff' || def.dtype === 'heal') continue;
  let tot = 0, n = 0;
  for (let rep = 0; rep < 3; rep++) {
    const sv = makeSave(def.id), b = A.createBattle(sv, { kind: 'rift', act: 11, tier: 8, mods: [], name: 'r', level: 100 });
    b.noFx = true; b.inv = 1e9; const st = b.stats; st.aoeDmg = 0; st.chainJumps = 0; st.chainDmg = 0; st.bleedChance = st.poisonChance = st.igniteChance = 0; st.dotDmg = 0; st.manaCostMul = 0; st.lifesteal = 0; st.cdr = 0; st.shredDef = 0; st.shredRes = 0;
    for (const sk of b.skills) if (sk) { sk.bleed = sk.poison = sk.ignite = 0; }
    b.cap = A.CFG.STACK_BASE; const sk = b.skills[0]; b.hp = b.maxHp = 1e15;
    const T = 45; while (!b.over && b.time < T) { A.stepBattle(b, 0.05); b.mana = b.maxMana; }
    const dmg = (b.dmgBy[def.id] || 0), cd = sk.cd * (1 - st.cdr), casts = Math.max(1, (b.time - 0.4 * sk.cd) / cd + 1);
    const bc = A.baseCastOf(sk, st); tot += dmg / casts / bc; n++;
  }
  out[def.id] = +(tot / n).toFixed(2);
}
fs.writeFileSync('/tmp/tm.json', JSON.stringify(out)); console.log(JSON.stringify(out));
