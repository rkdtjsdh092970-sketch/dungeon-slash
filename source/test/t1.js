const A = require('./simlib.js');
const sv = A.newSave();
// 튜토리얼 통과
for (let s = 0; s < 3; s++) { const b = A.createBattle(sv, { kind: 'tutorial', act: 1, stage: 1, step: s }); b.noFx = true; while (!b.over) A.stepBattle(b, 0.05); console.log('tut', s, b.win, b.time.toFixed(0)); const r = A.finishBattle(sv, b); }
console.log('tut done', sv.tut.done, 'slots', sv.slots, 'loadout', JSON.stringify(sv.loadout));
A.botEquip(sv);
const run = (node) => { const b = A.createBattle(sv, node); b.noFx = true; while (!b.over) A.stepBattle(b, 0.05); const r = A.finishBattle(sv, b); return { b, r }; };
for (const s of [1, 5, 9, 10]) { const { b, r } = run({ kind: s === 10 ? 'boss' : 'stage', act: 1, stage: s }); console.log('act1 stage', s, b.win, b.time.toFixed(0), 'kills', b.kills, 'hp', Math.round(b.hp), '/', Math.round(b.maxHp)); }
console.log('power', Math.round(A.playerPower(A.computeStats(sv))), 'level', sv.level, 'cleared', sv.cleared.join(','));
