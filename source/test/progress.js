// 웹판 성장 시뮬 (로블록스 sim/progress.lua 이식): node progress.js <seed> <battles>
const fs = require('fs'); const D = 'C:/Users/kaseo/dungeon-slash/source/src/';
const src = ['util','data','data2','data3','data4','data5','data6','data7','data8','satan','class','state','power5','battle','battle2'].map(f => fs.readFileSync(D + f + '.js', 'utf8')).join('\n');
global.localStorage = { getItem: () => null, setItem() {} }; global.document = { createElement: () => ({ getContext: () => ({}) }) }; global.window = {};
const seed = +process.argv[2] || 1, BUDGET = +process.argv[3] || 720, CLS = process.argv[4] || 'warrior';
let s0 = seed * 9301 + 49297; Math.random = () => { s0 = (s0 * 16807) % 2147483647; return (s0 - 1) / 2147483646; };
const A = new Function(src + `;return { newSave, createBattle, stepBattle, finishBattle, botEquip, enhance, gachaPull, autoPassives, computeStats, playerPower, SKILLS, MAP, RIFT_MODS, seeded, TUTORIAL, EQ_SLOTS, CFG, riftRegion, skillTier, pickStart, rerollAffix, affixPool, availableQuests, acceptQuest, claimQuest, revealStone, socketItem, socketUsable, mkAff, powerOf5, slotType: typeof slotType !== 'undefined' ? slotType : null };`)();
const riftMods = (tier) => { const r = A.seeded(tier * 131 + 7), n = tier < 10 ? 0 : tier < 30 ? 1 : tier < 60 ? 2 : 3, pool = A.RIFT_MODS.slice(), out = []; for (let i = 0; i < n; i++) out.push(pool.splice(Math.floor(r() * pool.length), 1)[0]); return out; };
const sv = A.newSave();
const run = (node) => { const b = A.createBattle(sv, node); b.noFx = true; let n = 0; while (!b.over && n < 30000) { A.stepBattle(b, 0.05); n++; } const r = A.finishBattle(sv, b); return b.win; };
const power = () => A.powerOf5(sv);   // 로블록스 봇과 같은 전투력 (Power.of)
function bestLoadout() {   // 로블록스 bestLoadout: 칸마다 욕심쟁이 (1번 칸 = 평타, 2~4 = 아르카나)
  const seen = {}; for (const k of sv.skills) if (!seen[k.id] || (k.rarity || 0) > (seen[k.id].rarity || 0)) seen[k.id] = k;
  const ids = Object.values(seen), used = new Set(); sv.loadout = [null, null, null, null];
  for (let i = 0; i < (sv.slots || 4); i++) { let best = -1, bk = null;
    for (const k of ids) { if (used.has(k.uid)) continue; const d = A.SKILLS.find((x) => x.id === k.id); if (!d || (d.slot === 'basic') !== (i === 0) || d.slot === 'passive') continue;
      sv.loadout[i] = { uid: k.uid, rule: 'front' }; const p = power(); if (p > best) { best = p; bk = k; } }
    if (bk) { sv.loadout[i] = { uid: bk.uid, rule: 'front' }; used.add(bk.uid); } else sv.loadout[i] = null; }
}
const VALID = {
  phys: { weapon: ['atkFlat','atkPct','physDmg','critDmg','critChance','cdr'], gloves: ['atkFlat','atkPct','physDmg','critChance','critDmg','cdr'], neck: ['atkFlat','atkPct','physDmg','critDmg','allDmg','cdr'], ring: ['critChance','allDmg','cdr','lifesteal','manaRegen','manaFlat'] },
  mag: { weapon: ['magFlat','magPct','magDmg','fireDmg','spellCrit','critDmg'], gloves: ['magFlat','magPct','magDmg','fireDmg','spellCrit','critDmg'], neck: ['magFlat','magPct','magDmg','fireDmg','critDmg','elemDmg'], ring: ['fireDmg','spellCrit','elemDmg','allDmg','cdr','penElem'] } };
const DEF = ['hpPct','hpFlat','defPct','dodge','dmgTaken','defFlat','regen'];
const validOf = (slot) => { const t = slot === 'ring2' ? 'ring' : slot; return new Set(VALID[CLS === 'mage' ? 'mag' : 'phys'][t] || (t === 'boots' ? ['hpPct','hpFlat','defPct','dodge','cdr','dmgTaken','defFlat'] : DEF)); };
// 로블록스 봇 smartEquip: 바꾸면 다시 강화한다고 치고(강화 수치 이어받음), 무효 줄 하나를 유효 옵션 평균값으로 돌렸다고 친 예상 전투력이 가장 높은 장비
function smartEquip() {
  for (const slot of A.EQ_SLOTS) { const V = validOf(slot), type = slot === 'ring2' ? 'ring' : slot, cur0 = sv.equipped[slot];
    const fits = (it) => it.slot === type && (slot !== 'weapon' || it.wt === (CLS === 'mage' ? 'staff' : 'sword'));
    const proj = (it) => { const old = sv.equipped[slot]; sv.equipped[slot] = it; const e0 = it.enh; if (cur0 && it !== cur0) it.enh = Math.max(it.enh || 0, cur0.enh || 0);
      let i = it.uniq ? -1 : it.affixes.findIndex((a) => !V.has(a.k)), keep = null;
      if (i >= 0) { const best = A.affixPool(it, i).filter((a) => V.has(a.k))[0]; if (best) { keep = it.affixes[i]; const r0 = Math.random; Math.random = () => 0.5; it.affixes[i] = A.mkAff(best, it.ilvl, it.rarity, false); Math.random = r0; } }
      const p = power(); if (keep) it.affixes[i] = keep; it.enh = e0; sv.equipped[slot] = old; return p; };
    let best = cur0 ? proj(cur0) : -1, pick = null;
    for (const it of sv.inv) if (fits(it)) { const p = proj(it); if (p > best * 1.0005) { best = p; pick = it; } }
    if (pick) { sv.equipped[slot] = pick; sv.inv = sv.inv.filter((x) => x !== pick); if (cur0) sv.inv.push(cur0); }
  }
}
function tuneGear() {
  for (const slot of A.EQ_SLOTS) { const it = sv.equipped[slot]; if (!it || it.uniq) continue; const V = validOf(slot);
    for (let n = 0; n < 40; n++) { let i = it.rrIdx != null ? (V.has((it.affixes[it.rrIdx] || {}).k) ? -1 : it.rrIdx) : it.affixes.findIndex((a) => !V.has(a.k)); if (i < 0) break; if (!A.rerollAffix(sv, it, i)) break; } }
}
function extras() {
  for (const q of A.availableQuests(sv)) A.acceptQuest(sv, q.id);
  for (const id in sv.q) if (sv.q[id].state === 'done') A.claimQuest(sv, id, []);
  for (const st of (sv.stones || []).slice()) if (!st.rev) { const r = A.revealStone(sv, st); if (r && r.ok === false) break; }
  for (const k of A.EQ_SLOTS) { const it = sv.equipped[k]; if (!it || !it.sock) continue;
    for (let idx = 0; idx < it.sock.length; idx++) { const cur = it.sock[idx], base = power(); let best = base * 1.001, bs = null;
      for (const st of sv.stones || []) if (st.rev && (A.socketUsable(it, st.rev.k) || (cur && cur.k === st.rev.k))) { it.sock[idx] = { k: st.rev.k, v: st.rev.v }; const p = power(); if (p > best) { best = p; bs = st; } }
      it.sock[idx] = cur; if (bs) A.socketItem(sv, it, bs, idx); } }
}
function upkeep() {
  while ((sv.hone || 0) >= 10) A.gachaPull(sv, sv.hone >= 90 ? 10 : 1);
  sv.inv = sv.inv.filter((it) => !(it.slot === 'weapon' && it.wt !== (CLS === 'mage' ? 'staff' : 'sword')));   // 계열에 맞는 무기만
  smartEquip(); tuneGear(); sv.pass = {}; A.autoPassives(sv); bestLoadout();
  for (let i = 0; i < 40; i++) { let low = null; for (const k of A.EQ_SLOTS) { const it = sv.equipped[k]; if (it && (it.enh || 0) < 10 && (!low || (it.enh || 0) < (low.enh || 0))) low = it; } if (!low) break; const r = A.enhance(sv, low); if (!r || r.ok === false) break; }
  if (sv.inv.length > 150) sv.inv.splice(60);
}
// 튜토리얼 → 스테이지 1~5 → 균열
A.pickStart(sv, CLS); sv.tut.done = true;
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
  upkeep(); if (battles % 10 === 0) extras();
  if (battles % 120 === 0) marks.push(sv.rift.best);
}
const sk = sv.loadout.filter(Boolean).map((l) => { const k = sv.skills.find((x) => x.uid === l.uid); return k.id + 'r' + k.rarity + 'L' + (k.lvl || 1); });
const enh = A.EQ_SLOTS.map((k) => sv.equipped[k] ? 'T' + sv.equipped[k].ilvl + '+' + (sv.equipped[k].enh || 0) : '-').join(' ');
console.log(JSON.stringify({ cls: CLS, seed, marks, lv: sv.level, sk: sk.join('/'), enh }));
