const A = require('./simlib.js');
const ids = ['gut','toxin','sunbrand','zerofrost','judgment','manaburst','reaper','execute'];
for (const id of ids) {
  const sv = A.newSave(); sv.tut.done = true; sv.level = 90; sv.slots = 2; sv.endgame = true; sv.lanesBase = 3; sv.cleared = Array(10).fill(10);
  for (const s of A.SLOTS) sv.equipped[s] = A.genItem(sv, 10, 3, s);
  const k = A.genSkill(sv, id, 0); sv.skills.push(k); sv.loadout[1] = { uid: k.uid, rule: 'front' };
  const out = {};
  for (const [tag, node] of [['boss', { kind: 'boss', act: 10, stage: 10, name: 'b' }], ['stage', { kind: 'stage', act: 10, stage: 5, name: 's' }]]) {
    const b = A.createBattle(sv, node); b.noFx = true; b.inv = 1e9; b.hp = b.maxHp = 1e15; b.mana = b.maxMana = 1e9; let t = 0; while (!b.over && t < 200) { A.stepBattle(b, 0.05); t += 0.05; b.mana = b.maxMana; }
    out[tag] = Math.round(b.dmgBy[id] || 0);
  }
  console.log(id.padEnd(10), 'dmg on boss fight', out.boss, ' on normal stage', out.stage);
}
