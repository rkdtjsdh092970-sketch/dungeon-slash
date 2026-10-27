const A = require('./simlib.js'); const fs = require('fs');
const S = JSON.parse(fs.readFileSync(__dirname + '/sam.json', 'utf8'));
function build(ls) { const sv = A.newSave(); Object.assign(sv, { level: S.level, slots: S.slots, lanesBase: S.lanesBase, endgame: true, rift: { best: 60 }, cleared: Array(10).fill(10) }); sv.tut.done = true;
  sv.equipped = JSON.parse(JSON.stringify(S.equipped)); sv.skills = JSON.parse(JSON.stringify(S.skills)); sv.loadout = JSON.parse(JSON.stringify(S.loadout)); sv.pass = {}; for (const id of S.pass) if (/^(phys|def)_|^b\d_/.test(id)) sv.pass[id] = 1;
  if (ls) sv.equipped.ring = Object.assign(JSON.parse(JSON.stringify(sv.equipped.ring)), { affixes: [{ k: 'lifesteal', v: ls }] }); return sv; }
function run(sv, tier) { const b = A.createBattle(sv, { kind: 'rift', act: 11, tier, mods: [], name: 'r' }); b.noFx = true; let t = 0, hmin = b.maxHp; while (!b.over && t < 400) { A.stepBattle(b, 0.05); t += 0.05; hmin = Math.min(hmin, b.hp); }
  return { win: b.win, time: Math.round(b.time), minHp: Math.round(hmin / b.maxHp * 100) + '%', taken: Math.round(b.taken / b.maxHp * 100) + '%maxHp', healLS: Math.round((b.healLS || 0) / b.maxHp * 100) + '%', healRegen: Math.round((b.healRg || 0) / b.maxHp * 100) + '%' }; }
for (const tier of (process.env.TR || '45,60,75').split(',').map(Number)) { console.log('\nrift tier', tier);
  for (const ls of [0, 0.08]) { const sv = build(ls); console.log('  lifesteal+', ls, '(총', A.computeStats(sv).lifesteal.toFixed(3) + ')', JSON.stringify(run(sv, tier))); } }
