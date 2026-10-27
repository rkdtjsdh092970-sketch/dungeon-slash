const A = require('./simlib.js');
const sv = A.newSave(); sv.tut.done = true; sv.level = 70; sv.slots = 4; sv.endgame = true; sv.lanesBase = 3;
const mk = (slot) => { const it = A.genItem(sv, 10, 2, slot); return it; };
for (const s of A.SLOTS) sv.equipped[s] = mk(s);
['phys_s1','phys_s2','phys_s3','def_s1','def_s2','mana_s1'].forEach((id) => A.addPassive(sv, id));
for (const id of ['smash','lance','chain','bomb']) { const k = A.genSkill(sv, id, 1); sv.skills.push(k); }
sv.loadout = [0,1,2,3].map((i) => sv.skills[i] ? { uid: sv.skills[i].uid, rule: 'auto' } : null);
const base = A.playerPower(A.computeStats(sv));
const rows = [], bySlot = {};
for (const u of A.UNIQUES) { bySlot[u.slot] = (bySlot[u.slot] || 0) + 1; const old = sv.equipped[u.slot]; sv.equipped[u.slot] = A.genUnique(sv, u, 12); const st = A.computeStats(sv); const r = A.playerPower(st) / base; sv.equipped[u.slot] = old; rows.push([u.tier, u.id, u.slot, r.toFixed(2)]); }
rows.sort((a, b) => a[0] - b[0] || a[3] - b[3]);
const tiers = {}; rows.forEach((r) => (tiers[r[0]] = tiers[r[0]] || []).push(+r[3]));
for (const t in tiers) { const v = tiers[t].sort((a, b) => a - b); console.log('tier', t, 'n', v.length, 'min', v[0], 'median', v[v.length >> 1], 'max', v[v.length - 1]); }
console.log('slots', JSON.stringify(bySlot));
console.log(rows.map((r) => r.join(':')).join('  '));
