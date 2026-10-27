const A = require('./simlib.js');
const T = +process.argv[2] || 8, LV = 80, N = +process.argv[3] || 3;
function mid(k, ilvl) { const sv = A.newSave(); const d = A.AFFIXES.find((x) => x.k === k); const old = Math.random; Math.random = () => 0.5; let v; try { v = null; const g = Math.pow(A.CFG.G, ilvl - 1); const f = A.rollAffix; } catch (e) {} Math.random = old; return d; }
const mockRoll = (k, ilvl, rar) => { const old = Math.random; Math.random = () => 0.5; const it = A.genItem({ nextUid: 1 }, ilvl, rar, 'ring'); Math.random = old; return null; };
function makeItem(sv, slot, keys, ilvl) {
  const it = A.genItem(sv, ilvl, 3, slot); const old = Math.random; Math.random = () => 0.5;
  it.affixes = keys.map((k) => { const d = A.AFFIXES.find((x) => x.k === k); if (!d) throw new Error('no affix ' + k); const g = Math.pow(A.CFG.G, ilvl - 1); let v = (d.range[0] + d.range[1]) / 2; const R = { mult: 1.55 }; if (d.flat) v *= Math.pow(g, d.gp || 1) * R.mult; else if (d.pct) v *= (0.72 + 0.05 * Math.min(ilvl, 12)) * 1.2; else v = Math.round(v); return { k, v }; });
  Math.random = old; return it;
}
const BUILDS = {
  phys: { skills: ['strike', 'smash', 'lance', 'snipe'], gear: { weapon: ['atkPct', 'critChance', 'critDmg', 'physDmg', 'boss'], gloves: ['atkPct', 'critChance', 'critDmg', 'cdr', 'ignoreDef'], neck: ['atkPct', 'critDmg', 'physDmg', 'allDmg', 'ignoreDef'], ring: ['critChance', 'cdr', 'lifesteal', 'manaFlat', 'allDmg'], helm: ['hpPct', 'defPct', 'manaFlat', 'dodge'], armor: ['hpPct', 'defPct', 'manaPct', 'hpFlat'] }, pass: ['phys', 'def'] },
  mag: { skills: ['spark', 'bomb', 'chain', 'thunder'], gear: { weapon: ['magPct', 'magDmg', 'fireDmg', 'lightDmg', 'spellCrit'], gloves: ['magPct', 'spellCrit', 'cdr', 'ignoreRes', 'magDmg'], neck: ['magPct', 'elemDmg', 'allDmg', 'ignoreRes', 'penElem'], ring: ['spellCrit', 'cdr', 'lifesteal', 'manaFlat', 'allDmg'], helm: ['hpPct', 'defPct', 'manaPct', 'manaRegen'], armor: ['hpPct', 'defPct', 'manaPct', 'manaFlat'] }, pass: ['mag', 'def'] },
  bleed: { skills: ['strike', 'rend', 'whirl', 'volley'], gear: { weapon: ['atkPct', 'bleedChance', 'dotDmg', 'physDmg', 'boss'], gloves: ['atkPct', 'bleedChance', 'dotDmg', 'cdr', 'ignoreDef'], neck: ['atkPct', 'dotDmg', 'physDmg', 'allDmg', 'ignoreDef'], ring: ['bleedChance', 'cdr', 'lifesteal', 'manaFlat', 'allDmg'], helm: ['hpPct', 'defPct', 'manaFlat', 'dodge'], armor: ['hpPct', 'defPct', 'manaPct', 'hpFlat'] }, pass: ['phys', 'def'] },
  poison: { skills: ['strike', 'venom', 'plague', 'volley'], gear: { weapon: ['atkPct', 'poisonChance', 'dotDmg', 'physDmg', 'magPct'], gloves: ['atkPct', 'poisonChance', 'dotDmg', 'cdr', 'voidDmg'], neck: ['atkPct', 'dotDmg', 'voidDmg', 'allDmg', 'magPct'], ring: ['poisonChance', 'cdr', 'lifesteal', 'manaFlat', 'allDmg'], helm: ['hpPct', 'defPct', 'manaFlat', 'dodge'], armor: ['hpPct', 'defPct', 'manaPct', 'hpFlat'] }, pass: ['elem', 'def'] },
  ignite: { skills: ['spark', 'bomb', 'inferno', 'meteor'], gear: { weapon: ['magPct', 'igniteChance', 'dotDmg', 'fireDmg', 'magDmg'], gloves: ['magPct', 'igniteChance', 'dotDmg', 'cdr', 'fireDmg'], neck: ['magPct', 'dotDmg', 'fireDmg', 'allDmg', 'penElem'], ring: ['igniteChance', 'cdr', 'lifesteal', 'manaFlat', 'allDmg'], helm: ['hpPct', 'defPct', 'manaPct', 'manaRegen'], armor: ['hpPct', 'defPct', 'manaPct', 'manaFlat'] }, pass: ['mag', 'def'] },
  mana: { skills: ['spark', 'orbs', 'storm', 'blizzard'], gear: { weapon: ['magPct', 'magDmg', 'lightDmg', 'coldDmg', 'manaCostRed'], gloves: ['magPct', 'spellCrit', 'cdr', 'ignoreRes', 'magDmg'], neck: ['dmgPerMana', 'manaPct', 'allDmg', 'elemDmg', 'penElem'], ring: ['dmgPerMana', 'manaRegenFlat', 'manaFlat', 'cdr', 'allDmg'], helm: ['manaPct', 'hpPct', 'manaFlat', 'manaRegen'], armor: ['manaPct', 'hpPct', 'manaFlat', 'defPct'] }, pass: ['mana', 'def'] },
};
function alloc(sv, arms, pts) {
  const pri = {}; arms.forEach((a, i) => (pri[a] = 10 - i)); let guard = 0;
  while (guard++ < 200) { const c = A.PASSIVES.filter((p) => A.canAddPassive(sv, p.id)); if (!c.length) break; c.sort((x, y) => (pri[y.arm] || 0) - (pri[x.arm] || 0) || y.cost - x.cost); if (!A.addPassive(sv, c[0].id)) break; }
}
function setup(name) {
  const B = BUILDS[name], sv = A.newSave(); sv.tut.done = true; sv.level = LV; sv.slots = 4; sv.endgame = true; sv.lanesBase = 3; sv.cleared = Array(10).fill(10);
  for (const s of A.SLOTS) sv.equipped[s] = makeItem(sv, s, B.gear[s], 10);
  sv.skills = []; sv.loadout = [null, null, null, null]; B.skills.forEach((id, i) => { const k = A.genSkill(sv, id, 1); sv.skills.push(k); sv.loadout[i] = { uid: k.uid, rule: 'auto' }; });
  alloc(sv, B.pass, A.passivePoints(sv)); return sv;
}
for (const name of Object.keys(BUILDS)) {
  let t = 0, w = 0, kills = 0, st, lastB;
  for (let i = 0; i < N; i++) { const sv = setup(name); st = A.computeStats(sv); const b = A.createBattle(sv, { kind: 'rift', act: 11, tier: T, mods: [], name: 'r', level: 100 }); b.noFx = true; lastB = b; b.inv = 1e9; while (!b.over && b.time < 60) A.stepBattle(b, 0.05); t += b.time; w += b.win ? 1 : 0; kills += b.kills; }
  console.log(name.padEnd(7), JSON.stringify(Object.fromEntries(Object.entries(lastB.dmgBy).map(([k,v])=>[k,Math.round(v/1e6)+'M']))));
  console.log(name.padEnd(7), 'dps', (Object.values(lastB.dmgBy).reduce((a,b)=>a+b,0)/lastB.time/1e3).toFixed(0)+'k', 'kills60', (kills / N).toFixed(0), 'atk', Math.round(st.atk), 'mag', Math.round(st.mag), 'hp', Math.round(st.maxHp), 'mana', Math.round(st.maxMana), 'power', (A.playerPower(st) / 1e9).toFixed(2) + 'G');
}
