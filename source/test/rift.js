const A = require('./simlib.js'); const sv = A.newSave(); sv.tut.done = true; sv.slots = 4; sv.level = 100; sv.endgame = true; sv.lanesBase = 3;
for (const s of A.SLOTS) { const it = A.genItem(sv, 10, 3, s); it.enh = 6; sv.equipped[s] = it; }
for (const id of ['chain', 'smash', 'lance', 'meteor', 'sweep', 'snipe', 'execute', 'rapid', 'crush', 'frost']) sv.skills.push(A.genSkill(sv, id, 1));
A.botEquip(sv);
const seeded = null;
for (const tier of [1, 3, 5, 8, 10, 15, 20]) { const mods = A.RIFT_MODS.slice(0, Math.min(3, 1 + Math.floor(tier / 4))); const b = A.createBattle(sv, { kind: 'rift', act: 11, tier, mods, name: 'r', level: 100 }); b.noFx = true; while (!b.over) A.stepBattle(b, 0.05); A.finishBattle(sv, b); console.log('tier', tier, b.win ? 'WIN' : 'LOSE', b.time.toFixed(0) + 's', 'kills', b.kills, 'bossKills', b.bossKills, 'power', Math.round(A.playerPower(A.computeStats(sv)))); }
