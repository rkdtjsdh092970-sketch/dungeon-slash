// =========================================================
// 세이브 / 장비 / 스탯 / 퀘스트 / 대장간
// =========================================================
const SAVE_KEY = "dungeon_slash_v2";
let save = null;
const QDEFS = questDefs();
const MAP = buildMap();

function newSave() {
  const s = { v: 2, level: 1, exp: 0, gold: 0, ore: 5, shards: 0, inv: [], equipped: {}, skills: [], loadout: [null, null, null, null], slots: 1,
    cleared: Array(CFG.ACTS).fill(0), tut: { step: 0, done: false }, q: {}, guild: {}, rift: { best: 0 }, lanesBase: CFG.BASE_LANES, endgame: false,
    nextUid: 1, set: { master: 0.8, bgm: 0.5, sfx: 0.8 }, stats: { kills: 0, clears: 0 }, seen: {},
    hone: 0, runes: [], daily: { day: "" }, lastSeen: 0, rate: { gold: 0, exp: 0 }, pass: {}, atlas: {}, orbC: 0, orbD: 0, keys: 0, presets: [null, null, null], endless: { day: "", used: 0, best: 0, bestKills: 0 }, shop: { slot: -1, bought: [] }, auto: { on: false, sell: -1, equip: true }, uniq: {} };
  for (const slot of ["weapon", "helm", "armor"]) { const it = genItem(s, 1, 0, slot); s.equipped[slot] = it; }
  const sk = genSkill(s, "strike", 0); s.skills.push(sk); s.loadout[0] = { uid: sk.uid, rule: "front" };
  return s;
}
function saveGame() { if (save) save.lastSeen = Date.now(); try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} if (typeof srvQueue === "function") srvQueue(); }
function loadGame() { try { const t = localStorage.getItem(SAVE_KEY); if (!t) return null; const s = JSON.parse(t); if (!s || s.v !== 2) return null; const d = newSave(); for (const k in d) if (!(k in s)) s[k] = d[k]; for (const k in s.pass) if (!PASSIVE_BY_ID[k]) delete s.pass[k]; return s; } catch (e) { return null; } }

// ---- 장비/스킬 생성 ----
function genItem(sv, ilvl, rarity, slot, setId) {
  slot = slot || pick(SLOTS);
  const R = ITEM_RARITY[rarity], g = gScale(ilvl);
  const it = { uid: sv.nextUid++, slot, ilvl, rarity, base: {}, affixes: [], enh: 0 };
  if (setId) it.setId = setId;
  for (const k in SLOT_BASE[slot]) it.base[k] = SLOT_BASE[slot][k] * g * R.mult * rnd(0.9, 1.1);
  const pool = AFFIXES.filter((a) => (!a.minRarity || rarity >= a.minRarity || (a.minRarity === 2 && rarity === 4)) && (!a.slots || a.slots.includes(slot)) && (!a.minIlvl || ilvl >= a.minIlvl) && !(rarity === 4 && a.k === "lanes"));
  const used = new Set();
  for (let i = 0; i < R.affixes; i++) {
    const cand = pool.filter((a) => !used.has(a.k)); if (!cand.length) break;
    const a = wpick(cand, (x) => x.w); used.add(a.k);
    it.affixes.push({ k: a.k, v: rollAffix(a, g, R, rarity) });
  }
  return it;
}
function rollAffix(a, g, R, rarity) {
  let v = rnd(a.range[0], a.range[1]);
  const ilvl = Math.max(1, Math.round(Math.log(g) / Math.log(CFG.G)) + 1);
  if (a.flat) v *= Math.pow(g, a.gp || 1) * R.mult;
  else if (a.pct) v *= (0.72 + 0.05 * Math.min(ilvl, 12)) * (rarity === 3 ? 1.2 : rarity === 2 ? 1.08 : 1);
  else v = Math.round(v);
  return v;
}
function genSkill(sv, id, rarity) { return { uid: sv.nextUid++, id, rarity }; }
function skillOf(inst) {
  const d = SKILLS.find((x) => x.id === inst.id), R = SKILL_RARITY[inst.rarity], lvl = inst.lvl || 1, rn = inst.rune ? RUNES[inst.rune] : null;
  const bonus = {}; for (const k in d.bonus) bonus[k] = d.bonus[k] * R.bonusMul;
  const o = Object.assign({}, d, { def: d, inst, mult: d.mult * R.mult * (1 + 0.05 * (lvl - 1)), cd: d.cd * R.cdMul, side: d.side || 1, bonus, rarity: inst.rarity, lvl, rune: rn, mana: (d.mana || 0) * (1 + 0.02 * (lvl - 1)), power: d.power ? d.power * (1 + (R.mult - 1) * 0.6) : 0 });
  if (rn) {
    if (rn.cd) o.cd *= rn.cd; if (rn.mult) o.mult *= rn.mult; if (rn.mana) o.mana *= rn.mana; if (rn.ignore) o.ignoreAdd = rn.ignore; if (rn.crit) o.critAdd = rn.crit;
    if (rn.lifesteal) o.lifesteal = (o.lifesteal || 0) + rn.lifesteal;
    for (const k of ["bleed", "poison", "ignite"]) if (rn[k]) o[k] = (o[k] || 0) + rn[k];
    if (rn.wide) { if (o.dur) o.dur *= rn.wide; if (o.count) o.count = Math.round(o.count * rn.wide); if (o.jumps) o.jumps += 2; if (o.over) o.over *= rn.wide; }
  }
  return o;
}
const itemName = (it) => it.uniq ? (UNIQUE_BY_ID[it.uniq] ? UNIQUE_BY_ID[it.uniq].name : "고유 장비") : (it.setId ? SETS.find((s) => s.id === it.setId).name + " " + SLOT_NAME[it.slot] : ITEM_RARITY[it.rarity].name + " " + SLOT_NAME[it.slot]);

// ---- 스탯 ----
const expNeed = (level) => CFG.EXP_BASE * Math.pow(CFG.EXP_GROWTH, (level - 1) / 10);
function setCounts(sv) { const c = {}; for (const slot of SLOTS) { const it = sv.equipped[slot]; if (it && it.setId) c[it.setId] = (c[it.setId] || 0) + 1; } return c; }
const mfEff = (mf) => { mf = Math.max(0, mf); return mf / (1 + mf / CFG.MF_HALF); };   // MF 체감
const towerMf = (tier) => (tier ? CFG.MF_TOWER_STEP * tier + CFG.MF_TOWER_20 * Math.floor(tier / 20) : 0);
function computeStats(sv) {
  const lm = 1 + CFG.LEVEL_STEP * (sv.level - 1), ml = 1 + CFG.MANA_LV * (sv.level - 1);
  const s = { lm, atkFlat: CFG.BASE_ATK, magFlat: CFG.BASE_ATK, hpFlat: CFG.BASE_HP, def: 0, atkPct: 0, magPct: 0, hpPct: 0, dodge: CFG.BASE_DODGE, cdr: 0, critChance: CFG.BASE_CRIT, critDmg: CFG.BASE_CRITDMG,
    add: { boss: 0, elite: 0, ranged: 0, normal: 0 }, lifesteal: 0, goldFind: 0, chainJumps: 0, chainDmg: 0, aoeDmg: 0, allDmg: 0, density: 0, laneBonus: 0,
    defPct: 0, hpMore: 1, atkMore: 1, magMore: 1, defMore: 1, dmgTaken: 0, regen: 0, revive: 0, dodgeCap: 0.5, cdrCap: 0.5, noDodge: 0, mf: 0, expFind: 0,
    physDmg: 0, magDmg: 0, elemDmg: 0, fireDmg: 0, coldDmg: 0, lightDmg: 0, voidDmg: 0, ignoreDef: 0, ignoreRes: 0, shredDef: 0, shredRes: 0, penElem: 0,
    spellCrit: 0, magCrit: 0, manaFlat: 0, manaPct: 0, manaRegen: 0, manaCostRed: 0, manaToSpell: 0, manaShield: 0,
    manaRegenFlat: 0, manaOnKill: 0, dmgPerMana: 0, bleedChance: 0, poisonChance: 0, igniteChance: 0, dotDmg: 0, dotDur: 0 };
  const apply = (k, v) => {
    switch (k) {
      case "atkFlat": s.atkFlat += v; break; case "hpFlat": s.hpFlat += v; break; case "defFlat": s.def += v; break;
      case "boss": case "elite": case "ranged": case "normal": s.add[k] += v; break;
      case "lanes": s.laneBonus += v; break;
      case "hpMore": case "atkMore": case "magMore": case "defMore": s[k] *= v; break;
      case "dodgeCap": case "cdrCap": s[k] = Math.max(s[k], v); break;
      case "magCrit": case "noDodge": s[k] = 1; break;
      default: if (k in s) s[k] += v;
    }
  };
  let ilvlSum = 0, ilvlCnt = 0;
  for (const slot of SLOTS) {
    const it = sv.equipped[slot]; if (!it) continue;
    ilvlSum += it.ilvl; ilvlCnt++;
    const ef = 1 + 0.08 * (it.enh || 0), pf = 1 + 0.04 * (it.enh || 0);
    if (it.base.atk) s.atkFlat += it.base.atk * ef; if (it.base.mag) s.magFlat += it.base.mag * ef; if (it.base.hp) s.hpFlat += it.base.hp * ef; if (it.base.def) s.def += it.base.def * ef;
    for (const a of it.affixes) { const d = AFFIXES.find((x) => x.k === a.k); if (!d) continue; apply(a.k, d.flat ? a.v * ef : d.pct ? a.v * pf : a.v); }
    if (it.umods) for (const m of it.umods) apply(m.k, m.v);
  }
  for (const id in (sv.pass || {})) { const p = PASSIVE_BY_ID[id]; if (p) for (const k in p.per) apply(k, p.per[k] * sv.pass[id]); }
  const sc = setCounts(sv);
  for (const set of SETS) { const n = sc[set.id] || 0; for (const th of [2, 4, 6]) if (n >= th && set.bonus[th]) for (const k in set.bonus[th]) apply(k, set.bonus[th][k]); }
  s.maxMana = Math.max(10, (CFG.BASE_MANA + s.manaFlat) * (1 + s.manaPct) * ml);
  s.allDmg += s.dmgPerMana * s.maxMana / 100; s.manaFlatRegen = s.manaRegenFlat * ml; s.manaKill = s.manaOnKill * ml;
  s.manaRate = CFG.MANA_REGEN + s.manaRegen; s.manaCostMul = ml * (1 - Math.min(0.6, s.manaCostRed)); s.manaShield = Math.min(0.8, s.manaShield);
  s.atk = s.atkFlat * (1 + s.atkPct) * lm * s.atkMore;
  s.mag = (s.magFlat * lm + s.manaToSpell * s.maxMana) * (1 + s.magPct) * s.magMore;
  s.maxHp = Math.max(10, s.hpFlat * (1 + Math.max(-0.9, s.hpPct)) * lm * s.hpMore); s.def = s.def * lm * (1 + s.defPct) * s.defMore;
  s.dodge = s.noDodge ? 0 : Math.max(0, Math.min(s.dodgeCap, s.dodge)); s.cdr = Math.min(s.cdrCap, s.cdr); s.critChance = Math.min(0.8, s.critChance); s.spellCrit = Math.min(0.8, s.spellCrit);
  s.ignoreDef = Math.min(0.8, s.ignoreDef); s.ignoreRes = Math.min(0.8, s.ignoreRes); s.shredDef = Math.min(0.5, s.shredDef); s.shredRes = Math.min(0.5, s.shredRes);
  s.stackCap = Math.min(CFG.STACK_MAX, CFG.STACK_BASE + s.density);
  s.lanes = Math.min(CFG.MAX_LANES, sv.lanesBase + s.laneBonus);
  s.avgIlvl = ilvlCnt ? ilvlSum / ilvlCnt : 1; s.sets = sc;
  // 장착 스킬의 물리/마법 비중과 필요 마나 (전투력 추정용)
  let wm = 0, wt = 0, mps = 0;
  for (const l of sv.loadout || []) { if (!l) continue; const inst = sv.skills.find((x) => x.uid === l.uid); if (!inst) continue; const k = skillOf(inst); if (k.dtype === "buff" || k.dtype === "heal") { mps += k.mana * s.manaCostMul / k.cd; continue; } const w = k.mult / k.cd; wt += w; if (k.dtype === "mag") wm += w; mps += k.mana * s.manaCostMul / (k.cd * (1 - Math.min(0.5, s.cdr))); }
  s.mix = wt ? wm / wt : 0.5; s.manaNeed = mps;
  return s;
}
function playerPower(s) {
  const refAtk = 6 * CFG.A0 * actScale(Math.max(1, s.avgIlvl));
  const mit = 1 + s.def / (s.def + 5 * refAtk);
  const ccP = s.critChance, ccM = s.magCrit ? s.critChance + s.spellCrit : s.spellCrit;
  const eAvg = s.elemDmg + (s.fireDmg + s.coldDmg + s.lightDmg + s.voidDmg) / 2.5;
  const phys = s.atk * CFG.PHYS_BASE * (1 + s.physDmg) * (1 + Math.min(1, ccP) * s.critDmg) * (1 + 0.5 * s.ignoreDef + 0.4 * s.shredDef);
  const mag = s.mag * CFG.MAG_BASE * (1 + s.magDmg + eAvg) * (1 + Math.min(1, ccM) * s.critDmg) * (1 + 0.5 * s.ignoreRes + 0.4 * s.shredRes + 0.4 * s.penElem);
  const dmg = (1 - s.mix) * phys + s.mix * mag;
  const mf = s.maxMana * s.manaRate + s.maxMana / 15, mfac = s.manaNeed > 0 ? Math.min(1, Math.max(0.35, mf / s.manaNeed)) : 1;
  const surv = s.maxHp * mit * (1 / Math.max(0.2, 1 + s.dmgTaken)) * (1 + 0.25 * s.manaShield) / (1 - s.dodge);
  return dmg * Math.sqrt(mfac) * surv * (1 + s.allDmg) * (1 + 0.15 * (s.add.boss + s.add.elite + s.add.ranged + s.add.normal)) / (1 - s.cdr * 0.7) * (1 + 0.05 * s.chainJumps + s.aoeDmg * 0.3);
}
const enemyIndex = (act, stage) => CFG.H0 * CFG.A0 * actScale(act) * actScale(act) * (1 + CFG.STAGE_HP * (stage - 1)) * (1 + CFG.STAGE_ATK * (stage - 1));
const recPower = (act, stage) => CFG.REC_K * (stage === CFG.STAGES ? CFG.REC_BOSS : 1) * enemyIndex(act, stage);
function powerWith(sv, slot, item) { const old = sv.equipped[slot]; sv.equipped[slot] = item; const p = playerPower(computeStats(sv)); sv.equipped[slot] = old; return p; }

// ---- 드랍 ----
// 보너스 합산: 장비 MF + 패시브 + 심연 각인 + 월드 버프(엔드게임)
function dropBonus(sv, now) {
  const st = computeStats(sv), B = { mf: st.mf, qty: 1, orb: 1, exp: 1, gold: 1, unique: 1, key: 1, ore: 1, shard: 1, hell: 1 };
  B.mf += atlasVal(sv, "mf"); B.exp += st.expFind + atlasVal(sv, "exp"); B.gold += atlasVal(sv, "gold"); B.ore += atlasVal(sv, "ore"); B.orb += atlasVal(sv, "orb"); B.shard += atlasVal(sv, "shard"); B.key += atlasVal(sv, "key"); B.hell += atlasVal(sv, "hell");
  B.buffs = []; { const gl = sv.guildLv || 0; B.gold += 0.02 * gl; B.exp += 0.02 * gl; B.mf += 0.01 * gl; }
  if (sv.endgame) for (const w of worldBuffs(now)) { B.buffs.push(w); B.mf += w.mf || 0; B.exp *= w.exp || 1; B.gold *= w.gold || 1; B.qty *= w.qty || 1; B.orb *= w.orb || 1; B.unique *= w.unique || 1; B.key *= w.key || 1; }
  return B;
}
const UNIQUE_SRC = { boss: 4, elite: 2, treasure: 1.5, rift: 3, hell: 3.5, endless: 5, stage: 1, trial: 1.5 };
function genUnique(sv, def, ilvl) {
  const R = ITEM_RARITY[5], g = gScale(ilvl), it = { uid: sv.nextUid++, slot: def.slot, ilvl, rarity: 5, uniq: def.id, utier: def.tier, base: {}, affixes: [], umods: [], enh: 0 };
  for (const k in SLOT_BASE[def.slot]) it.base[k] = SLOT_BASE[def.slot][k] * g * R.mult * rnd(0.95, 1.05);
  for (const [k, v] of def.mods) it.umods.push({ k, v: umodScale(def, k, Array.isArray(v) ? rnd(v[0], v[1]) : v) });
  return it;
}
// 출처별 고유 롤: 해당 출처 전용 풀 + 공용 풀을 합쳐 등급 가중치로 뽑는다
function rollUnique(sv, act, ilvl, pools) {
  const list = [];
  for (const p of pools) for (const x of uniquePool(p, act)) list.push(x);
  if (!list.length) return null; return genUnique(sv, wpick(list, (x) => x.w).u, ilvl);
}
const U_POOLS_OF = { trial: ["tower", "common"], stage: ["common"], boss: ["common"], elite: ["common"], treasure: ["common"], hell: ["hell", "common"], rift: ["tower", "common"], endless: ["endless", "common"] };
function rollDrops(sv, node, boss, B) {
  B = B || dropBonus(sv);
  const act = Math.min(10, node.act), kind = node.kind, endlessWaves = node.waves || 0;
  const late = kind === "rift" || kind === "hell" || kind === "endless" || kind === "void" || kind === "trial";
  const ilvl = late ? 10 + Math.floor((node.tier || 1) / CFG.ILVL_RIFT_STEP) : node.act;
  const out = { items: [], skills: [], ore: 0, shards: 0, orbC: 0, orbD: 0, uniques: 0, hone: 0, runes: [] };
  let n = boss ? 4 : 2 + ((node.stage || 0) >= 6 ? 1 : 0);
  if (kind === "elite") n = 4; if (kind === "treasure") n = 5;
  if (kind === "rift" || kind === "hell") n = 3 + Math.floor(node.tier / 5) + (boss ? 3 : 0) + (kind === "hell" ? 3 : 0);
  if (kind === "endless") n = 4 + Math.floor(endlessWaves * 1.2);
  if (kind === "void") n = 3;
  if (kind === "trial") n = 2 + Math.floor((node.tier || 1) / 8);
  n = Math.max(1, Math.round(n * B.qty * (kind === "hell" ? B.hell : 1)));
  const rare = kind === "elite" || late || boss;
  const mfv = mfEff(B.mf + (kind === "rift" ? towerMf(node.tier || 1) : 0)), mfw = 1 + mfv;   // MF 체감 적용
  for (let i = 0; i < n; i++) {
    const r = wpick(ITEM_RARITY.slice(0, 4).map((x, idx) => ({ idx, w: (rare ? Math.max(x.bossDrop, x.drop * 0.5) : x.drop) * (idx >= 1 ? Math.pow(mfw, 0.3 + idx * 0.2) : 1) })), (x) => x.w).idx;
    out.items.push(genItem(sv, ilvl, r));
  }
  const sc = (boss ? CFG.SET_DROP_BOSS : kind === "rift" || kind === "hell" || kind === "endless" ? 0.3 : kind === "elite" ? 0.25 : CFG.SET_DROP) * Math.min(2.5, Math.pow(mfw, 0.4));
  const sets = SETS.filter((s) => ilvl >= s.acts[0] && ilvl <= s.acts[1]);
  for (let i = 0; i < (boss ? 2 : 1); i++) if (sets.length && Math.random() < sc) { const set = pick(sets); out.items.push(genItem(sv, ilvl, 4, pick(set.pieces), set.id)); }
  // 고유 장비: 지독하게 낮은 확률 (프로토타입은 PROTO_MULT 보정). 출처별 전용 풀 + 공용 풀
  if (kind === "void") {   // 공허의 군주: 6개 중 1개
    const list = uniquePool("void", 10).map((x) => ({ u: x.u, w: x.u.tier === 4 ? 8 : 21 })), pk = wpick(list, (x) => x.w).u;
    out.items.push(genUnique(sv, pk, ilvl)); out.uniques++;
  } else {
    const per = CFG.UNIQUE_BASE * CFG.PROTO_MULT * (UNIQUE_SRC[kind] || 1) * Math.pow(mfw, CFG.UNIQ_MF_EXP) * B.unique, rolls = n + (boss ? 2 : 0);
    for (let i = 0; i < rolls; i++) if (Math.random() < per) { const u = rollUnique(sv, late ? 10 : act, ilvl, U_POOLS_OF[kind] || ["common"]); if (u) { out.items.push(u); out.uniques++; } }
  }
  // 스킬: 보스 첫 클리어 확정 1개, 일반 확률, 균열 탑에서 낮은 확률로 강한 스킬
  const poolFor = (min) => SKILLS.filter((d) => d.unlock <= Math.max(act, kind === "rift" ? 10 : 0) && d.unlock >= min);
  const rr = (w) => wpick(SKILL_RARITY.map((x, i) => ({ i, w: x.w * w[i] })), (x) => x.w).i;
  if (node.firstClear && kind === "boss") { const d = wpick(SKILLS.filter((x) => x.unlock <= act && x.slot === "active"), (x) => (x.unlock >= act - 1 ? 2 : 1)); out.skills.push(genSkill(sv, d.id, rr([1, 1, 0.3]))); }
  else if (kind === "trial") { const T = node.tier || 1; if (Math.random() < Math.min(0.6, 0.18 + 0.01 * T)) { const d = pick(poolFor(3).filter((x) => x.slot === "active")); if (d) out.skills.push(genSkill(sv, d.id, rr([0.4, 1.2, 1 + T / 15]))); }
    out.hone = Math.round((4 + Math.floor(T * 0.8)) * (T > (sv.trialBest || 0) ? 2 : 1) * B.ore); const rn = Math.min(0.9, 0.25 + 0.02 * T); if (Math.random() < rn) out.runes.push(pick(RUNE_IDS)); if (Math.random() < rn * 0.4) out.runes.push(pick(RUNE_IDS)); }
  else if (kind === "rift") { if (Math.random() < Math.min(0.12, 0.015 + 0.002 * (node.tier || 1))) { const d = pick(poolFor(5).filter((x) => x.slot === "active")); if (d) out.skills.push(genSkill(sv, d.id, rr([0.2, 1, 2]))); } }
  else if (Math.random() < (boss ? CFG.SKILL_DROP_BOSS : CFG.SKILL_DROP * (kind === "elite" ? 2 : 1))) {
    const pool = SKILLS.filter((d) => d.unlock <= act);
    const d = wpick(pool, (x) => (x.unlock >= act - 1 ? 2.0 : 1.0));
    out.skills.push(genSkill(sv, d.id, rr([1, 1, 1])));
  }
  out.ore = Math.round((rint(1, 2) + (boss ? 4 : 0) + (kind === "treasure" ? 8 : 0) + (kind === "elite" ? 3 : 0) + Math.floor((node.tier || 0) / 2) + endlessWaves * 2) * B.ore);
  if (late) out.shards = Math.round((2 + Math.floor((node.tier || 1) / 2) + (boss ? 5 : 0) + endlessWaves * 3 + (kind === "void" ? 12 : 0)) * B.shard * (kind === "hell" ? B.hell : 1));
  // 구슬: 장비에 옵션을 더하는 재화
  const oc = { stage: 0.03, treasure: 0.25, elite: 0.18, boss: 0.4, rift: 1 + (node.tier || 1) / 7, hell: 2 + (node.tier || 1) / 5, endless: 3 + endlessWaves * 1.4, void: 6 }[kind] || 0.03;
  const ocE = (boss && kind === "stage" ? 0.4 : oc) * B.orb;
  out.orbC = Math.floor(ocE) + (Math.random() < ocE - Math.floor(ocE) ? 1 : 0);
  const odE = ocE * 0.25; out.orbD = Math.floor(odE) + (Math.random() < odE - Math.floor(odE) ? 1 : 0);
  return out;
}

// ---- 퀘스트 ----
const getQDef = (id) => QDEFS.find((q) => q.id === id) || GUILD_BOUNTIES.find((q) => q.id === id);
function maxActUnlocked(sv) { let a = 1; for (let i = 1; i < CFG.ACTS; i++) if (sv.cleared[i - 1] >= CFG.STAGES) a = i + 1; return a; }
function availableQuests(sv) { const m = maxActUnlocked(sv); return QDEFS.filter((q) => q.act <= m && !sv.q[q.id]); }
function acceptQuest(sv, id) { if (!sv.q[id]) sv.q[id] = { state: "active", p: 0 }; }
function questEvent(sv, ev) {
  const done = [];
  const store = Object.assign({}, sv.q);
  for (const id in store) {
    const st = sv.q[id]; if (st.state !== "active") continue;
    const d = getQDef(id); if (!d) continue; const g = d.goal;
    let add = 0;
    if (g.type === "kill" && ev.type === "kill" && (!g.act || g.act === ev.act)) add = ev.n || 1;
    else if (g.type === "elite" && ev.type === "kill" && ev.tier === "elite" && (!g.act || g.act === ev.act)) add = ev.n || 1;
    else if (g.type === "boss" && ev.type === "boss") add = 1;
    else if (g.type === "bossAct" && ev.type === "boss" && ev.act === g.act) add = 1;
    else if (g.type === "clear" && ev.type === "clear") add = 1;
    else if (g.type === "enhance" && ev.type === "enhance") add = 1;
    else if (g.type === "setDrop" && ev.type === "setDrop") add = ev.n || 1;
    else if (g.type === "rift" && ev.type === "rift") add = 1;
    if (add) { st.p = Math.min(g.n, st.p + add); if (st.p >= g.n) { st.state = "done"; done.push(d); } }
  }
  return done;
}
function claimQuest(sv, id, notes) {
  const st = sv.q[id]; if (!st || st.state !== "done") return null;
  const d = getQDef(id), r = d.reward; st.state = "claimed";
  if (r.gold) sv.gold += r.gold; if (r.ore) sv.ore += r.ore; if (r.shards) sv.shards += r.shards;
  if (r.exp) addExp(sv, r.exp);
  let item = null; if (r.item) { item = genItem(sv, Math.max(1, Math.min(10, d.act || maxActUnlocked(sv))), 2); sv.inv.push(item); }
  return { reward: r, item };
}
// 길드 의뢰는 완료 후 다시 받을 수 있음
function guildList(sv) { return GUILD_BOUNTIES.map((g) => ({ def: g, st: sv.guild[g.id] || null })); }
function guildAccept(sv, id) { if (!sv.guild[id]) { sv.guild[id] = { state: "active", p: 0 }; sv.q[id] = sv.guild[id]; } }
function guildClaim(sv, id) { const r = claimQuest(sv, id); if (r) { delete sv.guild[id]; delete sv.q[id]; } return r; }

// ---- 경험치 ----
function addExp(sv, amount) {
  let ups = 0; if (sv.level >= CFG.LEVEL_CAP) return 0;
  sv.exp += amount;
  while (sv.level < CFG.LEVEL_CAP && sv.exp >= expNeed(sv.level)) { sv.exp -= expNeed(sv.level); sv.level++; ups++; }
  if (sv.level >= CFG.LEVEL_CAP) sv.exp = 0;
  return ups;
}

// ---- 대장간 ----
const ENH_RATE = [1, 1, 1, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3];
const enhCost = (it) => ({ gold: Math.round(40 * gScale(it.ilvl) * (1 + (it.enh || 0) * 0.6)), ore: 2 + (it.enh || 0) });
function enhance(sv, it) {
  if ((it.enh || 0) >= 10) return { ok: false, msg: "최대 강화입니다" };
  const c = enhCost(it); if (sv.gold < c.gold || sv.ore < c.ore) return { ok: false, msg: "재료가 부족합니다" };
  sv.gold -= c.gold; const rate = ENH_RATE[it.enh || 0];
  if (Math.random() < rate) { sv.ore -= c.ore; it.enh = (it.enh || 0) + 1; questEvent(sv, { type: "enhance" }); return { ok: true, success: true, msg: `+${it.enh} 강화 성공!` }; }
  sv.ore -= Math.ceil(c.ore / 2); return { ok: true, success: false, msg: "강화 실패 (강화석 일부만 소모)" };
}
const itemValue = (it) => Math.round(8 * gScale(it.ilvl) * (1 + it.rarity * 1.1 + (it.enh || 0) * 0.5));
function dismantleYield(it) { return { gold: Math.round(itemValue(it) * 0.5), ore: Math.max(1, Math.round((it.rarity + 1) * 0.9 + (it.enh || 0) * 0.6)) }; }
function removeItem(sv, it) { sv.inv = sv.inv.filter((x) => x !== it); for (const s of SLOTS) if (sv.equipped[s] === it) delete sv.equipped[s]; }
function sellItem(sv, it) { sv.gold += itemValue(it); removeItem(sv, it); }
function dismantleItem(sv, it) { const y = dismantleYield(it); sv.gold += y.gold; sv.ore += y.ore; removeItem(sv, it); return y; }
const rerollCost = (it) => ({ gold: Math.round(itemValue(it) * 2.5), ore: 3 });
function rerollAffix(sv, it, idx) {
  const c = rerollCost(it); if (sv.gold < c.gold || sv.ore < c.ore) return false;
  const old = it.affixes[idx]; if (!old) return false;
  const pool = AFFIXES.filter((a) => !it.affixes.some((x, i) => i !== idx && x.k === a.k) && (!a.minRarity || it.rarity >= a.minRarity || (a.minRarity === 2 && it.rarity === 4)) && (!a.slots || a.slots.includes(it.slot)) && (!a.minIlvl || it.ilvl >= a.minIlvl) && a.k !== "lanes");
  const a = wpick(pool, (x) => x.w); it.affixes[idx] = { k: a.k, v: rollAffix(a, gScale(it.ilvl), ITEM_RARITY[it.rarity], it.rarity) };
  sv.gold -= c.gold; sv.ore -= c.ore; return true;
}

// ---- 노드 개방 ----
function townUnlocked(sv, act) { return sv.tut.done && (act === 1 || sv.cleared[act - 2] >= CFG.STAGES); }
function nodeUnlocked(sv, n) {
  if (!sv.tut.done) return false;
  if (n.kind === "town") return townUnlocked(sv, n.act);
  if (n.kind === "rift" || n.kind === "endless" || n.kind === "void" || n.kind === "trial") return sv.cleared[CFG.ACTS - 1] >= CFG.STAGES;
  if (!townUnlocked(sv, n.act)) return false;
  if (n.kind === "elite" || n.kind === "treasure") return sv.cleared[n.act - 1] >= n.need;
  return n.stage <= sv.cleared[n.act - 1] + 1;
}
const nodeCleared = (sv, n) => (n.kind === "stage" || n.kind === "boss") && sv.cleared[n.act - 1] >= n.stage;

// ---- 봇 (밸런스 시뮬레이션 전용) ----
function botEquip(sv) {
  for (let pass = 0; pass < 2; pass++) for (const slot of SLOTS) {
    let best = sv.equipped[slot] || null, bp = powerWith(sv, slot, best);
    for (const it of sv.inv) if (it.slot === slot) { const p = powerWith(sv, slot, it); if (p > bp) { bp = p; best = it; } }
    const cur = sv.equipped[slot] || null;
    if (best && best !== cur) { if (cur) sv.inv.push(cur); sv.inv = sv.inv.filter((x) => x !== best); sv.equipped[slot] = best; }
  }
  const sc = (inst) => { const k = skillOf(inst); const w = { single: 1, multi: 1.9, pierce: 1.7, chain: 2.2, nova: 1.5, zone: 1.4, boomer: 1.8, meteor: 2.0, buff: 0.5, heal: 0.4 }[k.kind] || 1; return k.mult / k.cd * w * (1 + 0.3 * Object.values(k.bonus).reduce((a, b) => a + b, 0)); };
  const defOf = (i) => SKILLS.find((d) => d.id === i.id);
  const basics = sv.skills.filter((s) => defOf(s).slot === "basic").sort((a, b) => sc(b) - sc(a));
  const actives = sv.skills.filter((s) => defOf(s).slot === "active").sort((a, b) => sc(b) - sc(a));
  const far = actives.find((x) => skillOf(x).range >= 6);
  const rest = actives.filter((x) => x !== far);
  const load = [basics[0], ...(far ? [far] : []), ...rest].slice(0, 4);
  sv.loadout = [0, 1, 2, 3].map((i) => (i < sv.slots && load[i] ? { uid: load[i].uid, rule: "auto" } : null));
}

// =========================================================
// 추천 장비 / ▲ 표시 / 프리셋
// =========================================================
function isUpgrade(sv, it) {
  const cur = sv.equipped[it.slot]; if (cur === it) return false;
  const base = powerWith(sv, it.slot, cur || null), p = powerWith(sv, it.slot, it);
  return p > base * 1.0005;
}
function recommendEquip(sv) {
  const changed = [];
  for (let pass = 0; pass < 2; pass++) for (const slot of SLOTS) {
    const cur = sv.equipped[slot] || null; let best = cur, bp = powerWith(sv, slot, cur);
    for (const it of sv.inv) if (it.slot === slot) { const p = powerWith(sv, slot, it); if (p > bp * 1.0005) { bp = p; best = it; } }
    if (best && best !== cur) { if (cur) sv.inv.push(cur); sv.inv = sv.inv.filter((x) => x !== best); sv.equipped[slot] = best; changed.push(slot); }
  }
  return changed;
}
function hasAnyUpgrade(sv) { for (const it of sv.inv) if (isUpgrade(sv, it)) return true; return false; }
function savePreset(sv, i) {
  sv.presets[i] = { equip: Object.fromEntries(SLOTS.filter((s) => sv.equipped[s]).map((s) => [s, sv.equipped[s].uid])), loadout: JSON.parse(JSON.stringify(sv.loadout)) };
}
function loadPreset(sv, i) {
  const p = sv.presets[i]; if (!p) return false;
  for (const s of SLOTS) if (sv.equipped[s]) { sv.inv.push(sv.equipped[s]); delete sv.equipped[s]; }
  for (const s of SLOTS) { const u = p.equip[s]; if (u == null) continue; const it = sv.inv.find((x) => x.uid === u); if (it) { sv.inv = sv.inv.filter((x) => x !== it); sv.equipped[s] = it; } }
  sv.loadout = [0, 1, 2, 3].map((k) => { const l = p.loadout[k]; return l && sv.skills.some((x) => x.uid === l.uid) ? { uid: l.uid, rule: l.rule } : null; });
  return true;
}

// =========================================================
// 구슬 / 패시브 / 심연 각인 / 스킬 상점 / 무한 균열 횟수
// =========================================================
function addAffix(sv, it) {   // 혼돈 구슬: 옵션 1개 추가 (최대 6)
  if (it.uniq || it.affixes.length >= 6 || sv.orbC < 1) return false;
  const used = new Set(it.affixes.map((a) => a.k)), g = gScale(it.ilvl);
  const pool = AFFIXES.filter((a) => !used.has(a.k) && a.k !== "lanes" && (!a.slots || a.slots.includes(it.slot)) && (!a.minIlvl || it.ilvl >= a.minIlvl));
  const a = wpick(pool, (x) => x.w); const R = ITEM_RARITY[Math.min(it.rarity, 4)];
  it.affixes.push({ k: a.k, v: rollAffix(a, g, R, it.rarity) }); sv.orbC--; return a;
}
function divineItem(sv, it) {  // 신성한 구슬: 옵션 수치 재굴림
  if (it.uniq || !it.affixes.length || sv.orbD < 1) return false;
  const g = gScale(it.ilvl), R = ITEM_RARITY[Math.min(it.rarity, 4)];
  it.affixes = it.affixes.map((a) => ({ k: a.k, v: rollAffix(AFFIXES.find((x) => x.k === a.k), g, R, it.rarity) })); sv.orbD--; return true;
}
function buyAtlas(sv, id) {
  const n = ATLAS.find((x) => x.id === id), r = (sv.atlas[id] || 0); if (r >= n.max) return false;
  const c = atlasCost(n, r); if (sv.shards < c) return false; sv.shards -= c; sv.atlas[id] = r + 1; return true;
}
const SHOP_MIN = 20;
const skillPrice = (d, rarity) => Math.round(70 * Math.pow(1.55, d.unlock - 1) * [1, 3.5, 12][rarity] * (d.slot === "basic" ? 0.6 : 1));
function shopStock(sv, now) {
  now = now || Date.now(); const slot = Math.floor(now / (SHOP_MIN * 60000)), act = maxActUnlocked(sv);
  if (!sv.shop || sv.shop.slot !== slot) sv.shop = { slot, bought: [] };
  const r = seeded(slot * 31 + act * 7), pool = SKILLS.filter((d) => d.unlock <= act), out = [];
  for (let i = 0; i < 6 && pool.length; i++) {
    const d = pool.splice(Math.floor(r() * pool.length), 1)[0], rr = r(), rarity = rr < 0.68 ? 0 : rr < 0.93 ? 1 : 2;
    out.push({ id: d.id, rarity, price: skillPrice(d, rarity) });
  }
  return out;
}
function buySkill(sv, idx) {
  const stock = shopStock(sv), o = stock[idx]; if (!o || sv.shop.bought.includes(idx) || sv.gold < o.price) return false;
  sv.gold -= o.price; sv.shop.bought.push(idx); sv.skills.push(genSkill(sv, o.id, o.rarity)); return true;
}
const localDay = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
function endlessInfo(sv) {
  if (!sv.endless) sv.endless = { day: "", used: 0, best: 0, bestKills: 0 };
  if (sv.endless.day !== localDay()) { sv.endless.day = localDay(); sv.endless.used = 0; }
  const max = CFG.ENDLESS_DAILY + atlasVal(sv, "endless"); return { max, used: sv.endless.used, left: Math.max(0, max - sv.endless.used) };
}

// 잠금/프리셋/착용 중인 장비는 판매·분해·자동 삭제에서 보호된다
function protectedItem(sv, it) {
  if (it.lock || sv.equipped[it.slot] === it) return true;
  for (const p of sv.presets || []) if (p) for (const k in p.equip) if (p.equip[k] === it.uid) return true;
  return false;
}

// ---- 일일 목표 / 오프라인 보상 / 기록 ----
const DAILY_TASKS = [
  { id: "kill", name: "몬스터 처치", n: 300, key: "kills", reward: { hone: 5, gold: 800 }, text: "연마석 5 · 800G" },
  { id: "clear", name: "스테이지 클리어", n: 8, key: "clears", reward: { ore: 12 }, text: "강화석 12" },
  { id: "boss", name: "보스 처치", n: 3, key: "bosses", reward: { orbC: 1 }, text: "혼돈 구슬 1" },
  { id: "rift", name: "균열 클리어 (엔드게임)", n: 3, key: "rifts", reward: { orbD: 1, shards: 5 }, text: "신성한 구슬 1 · 균열 조각 5", endgame: true },
];
function dailyState(sv) { const d = localDay(); if (!sv.daily || sv.daily.day !== d) sv.daily = { day: d, kills: 0, clears: 0, bosses: 0, rifts: 0, claimed: {}, bonus: false }; return sv.daily; }
function dailyAdd(sv, key, n) { const D = dailyState(sv); D[key] = (D[key] || 0) + (n || 1); }
function dailyClaim(sv, id) {
  const D = dailyState(sv), t = DAILY_TASKS.find((x) => x.id === id); if (!t || D.claimed[id] || D[t.key] < t.n) return null;
  D.claimed[id] = 1; const r = t.reward; if (r.hone) sv.hone += r.hone; if (r.gold) sv.gold += r.gold; if (r.ore) sv.ore += r.ore; if (r.orbC) sv.orbC += r.orbC; if (r.orbD) sv.orbD += r.orbD; if (r.shards) sv.shards += r.shards; return r;
}
function offlineReward(sv) {
  if (!sv.tut.done || !sv.lastSeen) return null; const away = (Date.now() - sv.lastSeen) / 60000; if (away < 10) return null;
  const mins = Math.min(away, 480), g = Math.round((sv.rate.gold || 0) * mins * 0.35), e = Math.round((sv.rate.exp || 0) * mins * 0.35), ore = Math.floor(mins / 20);
  if (g + e + ore <= 0) return null; return { away, mins, gold: g, exp: e, ore };
}
