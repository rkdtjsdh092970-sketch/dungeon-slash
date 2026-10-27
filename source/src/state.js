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
    passRev: 4, rangeRev: 1, hone: 0, runes: [], daily: { day: "" }, lastSeen: 0, rate: { gold: 0, exp: 0 }, pass: {}, passPresets: [null, null, null], atlas: {}, skdex: {}, orbC: 0, orbD: 0, dice: 0, keys: 0, keys2: 0, presets: [null, null, null], endless: { day: "", used: 0, best: 0, bestKills: 0 }, shop: { slot: -1, bought: [] }, auto: { on: false, sell: -1, equip: true }, uniq: {} };
  for (const slot of ["weapon", "helm", "armor"]) { const it = genItem(s, 1, 0, slot); s.equipped[slot] = it; }
  const sk = genSkill(s, "strike", 0); s.skills.push(sk); s.loadout[0] = { uid: sk.uid, rule: "front" };
  return s;
}
function saveGame() { if (save) { save.lastSeen = Date.now(); const dx = save.skdex || (save.skdex = {}); for (const x of save.skills) dx[x.id] = 1; } try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} if (typeof srvQueue === "function") srvQueue(); }
function loadGame() { try { const t = localStorage.getItem(SAVE_KEY); if (!t) return null; const s = JSON.parse(t); if (!s || s.v !== 2) return null; const d = newSave(); for (const k in d) if (!(k in s)) s[k] = d[k]; for (const k in s.pass) if (!PASSIVE_BY_ID[k]) delete s.pass[k];
    if (s.rangeRev !== 1) { clampAll(s); s.rangeRev = 1; }   // v2.9: 범위 밖 수치 보정
    if (s.passRev !== 4) { if (Object.keys(s.pass || {}).length) s.passReset = true; s.pass = {}; s.passRev = 4; }   // 패시브 트리 개편(v2.4 / v3.2 스킬 계열 추가): 기존 포인트는 전부 환급
    return s; } catch (e) { return null; } }

// ---- 장비/스킬 생성 ----
// 화염 정령왕 드랍: 화염·점화·지속 피해 계열 옵션이 잘 붙는다
const FIRE_BIAS = { fireDmg: 6, igniteChance: 6, dotDmg: 5, elemDmg: 4, penElem: 4, magPct: 2, dotDur: 3 };
function genItem(sv, ilvl, rarity, slot, setId, bias) {
  slot = slot || pick(SLOTS);
  const R = ITEM_RARITY[rarity], g = gScale(ilvl);
  const it = { uid: sv.nextUid++, slot, ilvl, rarity, base: {}, affixes: [], enh: 0 };
  if (setId) it.setId = setId;
  for (const k in SLOT_BASE[slot]) it.base[k] = SLOT_BASE[slot][k] * g * rarMul(rarity, ilvl) * rnd(0.9, 1.1);
  const pool = AFFIXES.filter((a) => (!a.minRarity || rarity >= a.minRarity || (a.minRarity === 2 && rarity === 4)) && (!a.slots || a.slots.includes(slot)) && (!a.minIlvl || ilvl >= a.minIlvl) && !(rarity === 4 && a.k === "lanes"));
  const used = new Set();
  for (let i = 0; i < R.affixes; i++) {
    const cand = pool.filter((a) => !used.has(a.k)); if (!cand.length) break;
    const a = wpick(cand, (x) => x.w * (bias && bias[x.k] || 1)); used.add(a.k);
    it.affixes.push({ k: a.k, v: rollAffix(a, g, R, rarity) });
  }
  return it;
}
// 옵션 수치 = (범위에서 뽑은 값) × 배율. 드랍은 낮은 수치가 잘 나오고, 재굴림/구슬로 직접 뽑을 때만 높은 수치가 잘 나온다
function affixScale(a, g, rarity) {
  const ilvl = Math.max(1, Math.round(Math.log(g) / Math.log(CFG.G)) + 1), end = ilvl > 10;
  if (a.flat) return Math.pow(g, a.gp || 1) * (end ? rarMul(rarity, ilvl) : ITEM_RARITY[Math.min(rarity, 4)].mult);
  if (a.pct) return 0.72 + 0.05 * Math.min(ilvl, 12);
  return 1;
}
function rollAffix(a, g, R, rarity, crafted) {
  const end = Math.max(1, Math.round(Math.log(g) / Math.log(CFG.G)) + 1) > 10;
  const u = Math.random(), t = crafted ? Math.pow(u, end ? 0.55 : 0.8) : (end ? Math.pow(u, 1.2) : u);
  const v = a.range[0] + (a.range[1] - a.range[0]) * t;
  return a.count ? Math.round(v) : v * affixScale(a, g, rarity);
}
function affixRange(a, ilvl, rarity) { const g = gScale(ilvl), sc = a.count ? 1 : affixScale(a, g, rarity); return [a.range[0] * sc, a.range[1] * sc]; }
// 공허의 주사위: 옵션/고유 능력의 수치를 범위 안에서 균등하게 다시 굴린다 (고유 장비도 가능)
// 범위 밖으로 튄 옵션을 현재 범위 안으로 맞춘다 (이전 버전의 보정 배율로 만들어진 장비, 경매에서 사 온 장비 등)
function clampItem(it) {
  if (!it) return 0; let n = 0;
  if (it.uniq) {
    const D = UNIQUE_BY_ID[it.uniq]; if (!D || !it.umods) return 0;
    for (const m of it.umods) { const def = D.mods.find((x) => x[0] === m.k); if (!def || !Array.isArray(def[1])) continue; const a = umodScale(D, m.k, def[1][0]), b = umodScale(D, m.k, def[1][1]), lo = Math.min(a, b), hi = Math.max(a, b); const v = Math.min(hi, Math.max(lo, m.v)); if (v !== m.v) { m.v = v; n++; } }
  } else if (it.affixes) {
    for (const a of it.affixes) { const d = AFFIXES.find((x) => x.k === a.k); if (!d) continue; const [lo, hi] = affixRange(d, it.ilvl, Math.min(it.rarity, 4)); const v = Math.min(hi, Math.max(lo, a.v)); if (v !== a.v) { a.v = v; n++; } }
  }
  return n;
}
function clampAll(sv) { let n = 0; for (const it of sv.inv || []) n += clampItem(it); for (const k in sv.equipped || {}) n += clampItem(sv.equipped[k]); return n; }
function diceItem(sv, it) {
  if ((sv.dice || 0) < 1) return false;
  if (it.uniq) {
    const D = UNIQUE_BY_ID[it.uniq]; if (!D || !it.umods) return false;
    if (!D.mods.some((m) => Array.isArray(m[1]))) return false;
    it.umods = D.mods.map(([k, v]) => ({ k, v: umodScale(D, k, Array.isArray(v) ? rnd(v[0], v[1]) : v) }));
  } else {
    if (!it.affixes.length) return false;
    const g = gScale(it.ilvl);
    it.affixes = it.affixes.map((a) => { const d = AFFIXES.find((x) => x.k === a.k); if (!d) return a; const [lo, hi] = affixRange(d, it.ilvl, it.rarity); return { k: a.k, v: d.count ? Math.round(rnd(lo, hi)) : rnd(lo, hi) }; });
  }
  sv.dice--; return true;
}
const diceChance = (kind, node) => ({ rift: 0.006 + 0.0004 * (node.tier || 1), hell: 0.012, endless: 0.01 + 0.002 * (node.waves || 0), trial: 0.004, hive: [0.02, 0.03, 0.06, 0.12][(node.vsel || 1) - 1], void: [0.02, 0.04, 0.07, 0.15][(node.vsel || 1) - 1] }[kind] || 0);
// 전설이 나왔을 때만 아주 낮은 확률로 이터널 → 소버린 → 엔젤릭 순으로 한 단계씩 더 올라간다 (chance는 첫 단계 확률, 이후 단계마다 ×0.4)
function skillTierUp(r, chance) { let c = chance || 0; while (r >= 2 && r < SKILL_RARITY.length - 1 && Math.random() < c) { r++; c *= 0.4; } return r; }
function genSkill(sv, id, rarity, tierUp) { return { uid: sv.nextUid++, id, rarity: tierUp ? skillTierUp(rarity, tierUp) : rarity }; }
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
function setCounts(sv) { const c = {}; for (const slot of EQ_SLOTS) { const it = sv.equipped[slot]; if (it && it.setId) c[it.setId] = (c[it.setId] || 0) + 1; } return c; }
const mfEff = (mf) => { mf = Math.max(0, mf); return mf / (1 + mf / CFG.MF_HALF); };   // MF 체감
const towerMf = (tier) => (tier ? CFG.MF_TOWER_STEP * tier + CFG.MF_TOWER_20 * Math.floor(tier / 20) : 0);
function computeStats(sv) {
  const lm = 1 + CFG.LEVEL_STEP * (sv.level - 1), ml = 1 + CFG.MANA_LV * (sv.level - 1);
  const s = { lm, atkFlat: CFG.BASE_ATK, magFlat: CFG.BASE_ATK, hpFlat: CFG.BASE_HP, def: 0, atkPct: 0, magPct: 0, hpPct: 0, dodge: CFG.BASE_DODGE, cdr: 0, critChance: CFG.BASE_CRIT, critDmg: CFG.BASE_CRITDMG,
    add: { boss: 0, elite: 0, ranged: 0, normal: 0 }, lifesteal: 0, goldFind: 0, chainJumps: 0, chainDmg: 0, aoeDmg: 0, allDmg: 0, density: 0, laneBonus: 0,
    defPct: 0, hpMore: 1, atkMore: 1, magMore: 1, defMore: 1, dmgTaken: 0, regen: 0, revive: 0, dodgeCap: 0.5, cdrCap: 0.5, noDodge: 0, mf: 0, expFind: 0,
    physDmg: 0, magDmg: 0, elemDmg: 0, fireDmg: 0, coldDmg: 0, lightDmg: 0, voidDmg: 0, ignoreDef: 0, ignoreRes: 0, shredDef: 0, shredRes: 0, penElem: 0,
    spellCrit: 0, magCrit: 0, manaFlat: 0, manaPct: 0, manaRegen: 0, manaCostRed: 0, manaToSpell: 0, manaShield: 0,
    manaRegenFlat: 0, manaOnKill: 0, manaHit: 0, dmgPerMana: 0, bleedChance: 0, poisonChance: 0, igniteChance: 0, dotDmg: 0, dotDur: 0,
    singleDmg: 0, persistDmg: 0, summonDmg: 0, bossSkill: 0, skillDur: 0 };   // 스킬 종류별 피해 · 보스 전용기 피해 · 지속시간 (패시브 스킬 계열)
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
  for (const slot of EQ_SLOTS) {
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
  s.allDmg += s.dmgPerMana * s.maxMana / 100 * 2.2; s.manaFlatRegen = s.manaRegenFlat * ml; s.manaKill = s.manaOnKill * ml;
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
  let wm = 0, wt = 0, mps = 0; s.skl = [];
  for (const l of sv.loadout || []) { if (!l) continue; const inst = sv.skills.find((x) => x.uid === l.uid); if (!inst) continue; const k = skillOf(inst); s.skl.push(k); if (k.dtype === "buff" || k.dtype === "heal") { mps += k.mana * s.manaCostMul / k.cd; continue; } const w = k.mult / k.cd; wt += w; if (k.dtype === "mag") wm += w; mps += k.mana * s.manaCostMul / (k.cd * (1 - Math.min(0.5, s.cdr))); }
  s.mix = wt ? wm / wt : 0.5; s.manaNeed = mps;
  return s;
}
function playerPowerOld(s) {
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

// ---- 전투력: 실제로 장착한 스킬(물리/마법/원소/상태이상/마나)을 하나씩 계산해서 합친다 ----
// 스킬 1회 시전의 "기본 피해 배율 합" (대상 수를 평균 몇 마리로 보는지 포함). 지속형은 sk.mult가 한 번 더 곱해지는 엔진 동작을 그대로 반영.
const POWER_TARGETS = 3.5;
function castMult(k, s) {
  if (typeof SKILL_TM !== "undefined" && SKILL_TM[k.id] != null) { const r = k.mult / (k.def ? k.def.mult : k.mult) || 1, sq = { orbit: 1, aura: 1, zone2: 1, hole: 1 }[k.kind] ? 2 : 1; return SKILL_TM[k.id] * Math.pow(r, sq) * (k.kind === "chain" ? 1 + 0.12 * s.chainJumps : 1) * ((k.kind === "multi" || k.kind === "nova" || k.kind === "meteor" || k.kind === "cone" || k.kind === "zone" || k.kind === "trap" || k.kind === "zone2" || k.kind === "rain" || k.kind === "aura" || k.kind === "hole") ? 1 + s.aoeDmg : 1); }
  const m = k.mult, side = k.side || 1;
  switch (k.kind) {
    case "single": return m;
    case "multi": return m * (1 + side * 2) * (1 + s.aoeDmg);
    case "pierce": return m * 2.6;
    case "chain": { let t = 1; for (let j = 1; j <= k.jumps + s.chainJumps; j++) t += Math.pow(k.decay, j); return m * t * (1 + s.chainDmg); }
    case "nova": return m * 5.5 * (1 + s.aoeDmg);
    case "zone": return m * 3 * (k.dur / 0.5) * 0.45 * 1.8 * (1 + s.aoeDmg);
    case "boomer": return m * (1 + k.back) * 2;
    case "meteor": return m * k.count * (1 + side * 3) * (1 + s.aoeDmg);
    case "cone": return m * (1 + (k.sideM || 0.7) * 3) * (1 + s.aoeDmg);
    case "spray": return m * k.count * (1 + s.aoeDmg * 0.3);
    case "orbit": return m * m * (k.dur / k.every);
    case "aura": return m * m * (k.dur / k.every) * 4 * (1 + s.aoeDmg);
    case "trap": return m * (1 + 0.7 * 3) * (1 + s.aoeDmg);
    case "zone2": return m * m * (k.dur / k.every) * 4.5 * (1 + s.aoeDmg);
    case "rain": return m * k.count * 2.2 * (1 + s.aoeDmg);
    case "summon": return m * (k.dur / k.every);
    case "hole": return m * m * (k.dur / k.every) * 4 * (1 + s.aoeDmg);
  }
  return m;
}
const PERSIST_KINDS = ["zone", "zone2", "hole", "aura", "orbit", "rain", "trap"];   // 지속·장판형 스킬
function skillKindMul(k, s) {   // 스킬 종류별 패시브 보너스 (단일 / 지속·장판 / 소환 / 보스 전용기)
  let m = 1; if (k.kind === "single") m *= 1 + s.singleDmg; if (PERSIST_KINDS.includes(k.kind)) m *= 1 + s.persistDmg; if (k.kind === "summon") m *= 1 + s.summonDmg;
  if (k.bonus && k.bonus.boss >= 0.8) m *= 1 + s.bossSkill * 0.5;   // 전투력 계산에서는 보스 전용기 보너스를 절반만 반영 (보스전에서만 적용되므로)
  return m;
}
function baseCastOf(k, s, act, sc) {   // 스킬 배율 1.0 기준 1타 피해: 공격력/주문력 × 피해증가 × 방어/저항 × 속성저항 × 치명 × 대상 보너스
  act = act || Math.max(1, Math.min(10, Math.round(s.avgIlvl))); sc = sc || 1 + CFG.DEF_ACT * (act - 1);
  const mag = k.dtype === "mag", base = mag ? s.mag * CFG.MAG_BASE : s.atk * CFG.PHYS_BASE;
  let inc = 1 + s.allDmg + (mag ? s.magDmg : s.physDmg); if (k.elem) inc += s.elemDmg + s[k.elem + "Dmg"];
  const ig = Math.min(0.9, (mag ? s.ignoreRes : s.ignoreDef) + (k.ignoreAdd || 0)), sh = (mag ? s.shredRes : s.shredDef) * 0.7, X = 1.1 * sc * (1 - ig) * (1 - sh), red = 1 - Math.min(CFG.DEF_CAP, X / (X + CFG.DEF_C));
  const er = k.elem ? 1 - clamp(ACT_ELEM[act - 1][ELEMS.indexOf(k.elem)] - s.penElem, -0.5, CFG.RES_CAP) : 1;
  const cc = Math.min(0.9, (mag ? (s.magCrit ? s.critChance + s.spellCrit : s.spellCrit) : s.critChance) + (k.critAdd || 0)), crit = 1 + cc * s.critDmg;
  const bonus = 1 + 0.15 * (Object.values(k.bonus || {}).reduce((a, b) => a + b, 0) + s.add.boss + s.add.elite + s.add.ranged + s.add.normal);
  return base * inc * red * er * crit * bonus * skillKindMul(k, s);
}
function powerDetail(s) {
  const act = Math.max(1, Math.min(10, Math.round(s.avgIlvl))), sc = 1 + CFG.DEF_ACT * (act - 1);
  const refAtk = POWER_RAW * 6 * CFG.A0 * actScale(Math.max(1, s.avgIlvl)), mit = 1 + s.def / (5 * refAtk);   // 받는 피해 = 원피해 × 5r/(def+5r) → 유효 체력 배율 = 1 + def/(5r) (제한 없이 방어력만큼 커짐)
  const out = { skills: [], dps: 0, manaFactor: 1, buff: 1 };
  let demand = 0, buffMul = 1, hasPaid = false;
  const cdMul = 1 - s.cdr;
  const rows = [];
  for (const k of s.skl || []) {
    const cd = Math.max(0.2, k.cd * cdMul), cost = (k.mana || 0) * s.manaCostMul / cd;
    if (k.dtype === "buff") { buffMul *= 1 + (k.power || 0) * Math.min(1, k.dur / cd); demand += cost; continue; }
    if (k.dtype === "heal") { demand += cost; continue; }
    const mag = k.dtype === "mag", bc = baseCastOf(k, s, act, sc);
    let cast = castMult(k, s) * bc;
    // 상태이상: 적중마다 확률로 지속 피해가 붙는다 (계수 × 지속피해 보너스)
    let dot = 0;
    for (const st of ["bleed", "poison", "ignite"]) { const q = st === "bleed" ? !mag : st === "poison" ? !mag || k.elem === "void" : k.elem === "fire", ch = Math.min(1, (k[st] || 0) + (q ? s[st + "Chance"] : 0)); if (ch > 0) dot += ch * CFG[st.toUpperCase()].coef * (1 + s.dotDmg) * (1 + 0.3 * s.dotDur) * 0.85; }
    cast *= 1 + dot;
    const paid = cost > 0; if (paid) hasPaid = true; demand += cost;
    rows.push({ k, dps: cast / cd, paid, cost, mag, dot });
  }
  // 마나 지속: 재생(초당) + 처치 회복 + 풀 마나를 오래 쓰는 몫. 부족하면 마나를 쓰는 스킬의 가동률이 떨어진다
  const supply = s.maxMana * s.manaRate + (s.manaFlatRegen || 0) + (s.manaKill || 0) * 1.2 + s.maxMana / 25 + s.maxMana * (s.manaHit || 0) * 5;   // 마나 흡수: 초당 약 5회 적중(0.1초 간격 제한) 가정
  const mf = demand > 0 ? Math.min(1, supply / demand) : 1; out.manaFactor = mf; out.demand = demand; out.supply = supply;
  for (const r of rows) { r.eff = r.dps * (r.paid ? mf : 1); out.dps += r.eff; out.skills.push({ id: r.k.id, name: r.k.name, dps: r.eff, mag: r.mag, paid: r.paid, dot: r.dot }); }
  out.dps *= buffMul; out.buff = buffMul;
  const M = s.maxMana, f = s.manaShield || 0, mshield = f > 0 ? Math.min(M, s.maxHp * f / (1 - f)) : 0;
  out.ehp = (s.maxHp * (1 + 20 * (s.regen || 0)) + mshield) * mit * (1 / Math.max(0.2, 1 + s.dmgTaken)) / (1 - s.dodge);
  out.mit = mit; out.revive = s.revive;
  return out;
}
const POWER_RAW = 6;   // 방어 효과 계산에 쓰는 "실제로 맞는 평균 한 방" 배율 (스테이지 스케일·몹 겹침·정예 포함)
let POWER_K = 0.25;   // 전투력 눈금 보정: 봇 진행(액트 클리어 시점)에서 예전 눈금과 비슷한 추천 전투력 대비 비율이 나오도록 맞춤
function playerPower(s) {
  const d = powerDetail(s);
  return POWER_K * d.dps * d.ehp * (1 + 0.35 * (s.revive || 0)) * (1 + s.laneBonus * 0.05) * (1 + 0.04 * (s.density || 0)) * (1 + s.lifesteal * 2);
}
const enemyIndex = (act, stage) => CFG.H0 * CFG.A0 * actScale(act) * actScale(act) * (1 + CFG.STAGE_HP * (stage - 1)) * (1 + CFG.STAGE_ATK * (stage - 1));
const recPower = (act, stage) => CFG.REC_K * (stage === CFG.STAGES ? CFG.REC_BOSS : 1) * enemyIndex(act, stage);
function powerWith(sv, slot, item, fn) { const old = sv.equipped[slot]; sv.equipped[slot] = item; const p = (fn || playerPower)(computeStats(sv)); sv.equipped[slot] = old; return p; }

// ---- 드랍 ----
// 보너스 합산: 장비 MF + 패시브 + 심연 각인 + 월드 버프(엔드게임)
function dropBonus(sv, now) {
  const st = computeStats(sv), B = { mf: st.mf, qty: 1, orb: 1, exp: 1, gold: 1, unique: 1, key: 1, ore: 1, shard: 1, hell: 1 };
  B.mf += atlasVal(sv, "mf"); B.exp += st.expFind + atlasVal(sv, "exp"); B.gold += atlasVal(sv, "gold"); B.ore += atlasVal(sv, "ore"); B.orb += atlasVal(sv, "orb"); B.shard += atlasVal(sv, "shard"); B.key += atlasVal(sv, "key"); B.hell += atlasVal(sv, "hell");
  B.buffs = []; { const gl = sv.guildLv || 0; B.gold += 0.02 * gl; B.exp += 0.02 * gl; B.mf += 0.01 * gl; }
  if (sv.endgame) for (const w of worldBuffs(now)) { B.buffs.push(w); B.mf += w.mf || 0; B.exp *= w.exp || 1; B.gold *= w.gold || 1; B.qty *= w.qty || 1; B.orb *= w.orb || 1; B.unique *= w.unique || 1; B.key *= w.key || 1; }
  return B;
}
const trialSkillChance = (T) => Math.min(0.95, 0.06 + 0.009 * T);   // 시련 단계가 오를수록 스킬 확률 증가 (100단계 95%)
const UNIQUE_SRC = { vault: 0.3, hive: 5, boss: 4, elite: 2, treasure: 1.5, rift: 3, hell: 3.5, endless: 5, stage: 1, trial: 1.5 };
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
const U_POOLS_OF = { trial: ["tower", "common"], stage: ["common"], boss: ["common"], elite: ["common"], treasure: ["common"], hell: ["hell", "common"], rift: ["tower", "common"], endless: ["endless", "common"], hive: ["fire", "common"] };
function rollDrops(sv, node, boss, B) {
  B = B || dropBonus(sv);
  const act = Math.min(10, node.act), kind = node.kind, endlessWaves = node.waves || 0;
  const late = kind === "rift" || kind === "hell" || kind === "endless" || kind === "void" || kind === "trial" || kind === "hive" || kind === "vault";
  const ilvl = late ? 10 + Math.floor((node.tier || 1) / CFG.ILVL_RIFT_STEP) : node.act;
  const out = { items: [], skills: [], ore: 0, shards: 0, orbC: 0, orbD: 0, dice: 0, uniques: 0, hone: 0, runes: [] };
  let n = boss ? 4 : 2 + ((node.stage || 0) >= 6 ? 1 : 0);
  if (kind === "elite") n = 4; if (kind === "treasure") n = 5;
  if (kind === "rift" || kind === "hell") n = 3 + Math.floor(node.tier / 5) + (boss ? 3 : 0) + (kind === "hell" ? 3 : 0);
  if (kind === "endless") n = 4 + Math.floor(endlessWaves * 1.2);
  if (kind === "void") n = Math.max(1, node.vsel || 1);
  if (kind === "hive") n = 3 + 2 * (node.vsel || 1);
  if (kind === "vault") n = 2;   // 골드 전용: 장비는 적게
  if (kind === "trial") n = 2 + Math.floor((node.tier || 1) / 8);
  n = Math.max(1, Math.round(n * B.qty * (kind === "hell" ? B.hell : 1)));
  const rare = kind === "elite" || late || boss;
  const mfv = mfEff(B.mf + (kind === "rift" ? towerMf(node.tier || 1) : 0)), mfw = 1 + mfv;   // MF 체감 적용
  for (let i = 0; i < n; i++) {
    const r = wpick(ITEM_RARITY.slice(0, 4).map((x, idx) => ({ idx, w: (rare ? Math.max(x.bossDrop, x.drop * 0.5) : x.drop) * (idx >= 1 ? Math.pow(mfw, 0.3 + idx * 0.2) : 1) })), (x) => x.w).idx;
    out.items.push(genItem(sv, ilvl, r, undefined, undefined, kind === "hive" ? FIRE_BIAS : null));
  }
  const sc = (boss ? CFG.SET_DROP_BOSS : kind === "rift" || kind === "hell" || kind === "endless" ? 0.3 : kind === "elite" ? 0.25 : CFG.SET_DROP) * Math.min(2.5, Math.pow(mfw, 0.4));
  const sets = SETS.filter((s) => ilvl >= s.acts[0] && ilvl <= s.acts[1]);
  for (let i = 0; i < (boss ? 2 : 1); i++) if (sets.length && Math.random() < sc) { const set = pick(sets); out.items.push(genItem(sv, ilvl, 4, pick(set.pieces), set.id)); }
  // 고유 장비: 지독하게 낮은 확률 (프로토타입은 PROTO_MULT 보정). 출처별 전용 풀 + 공용 풀
  if (kind === "void") {   // 공허의 군주: 1~3단계는 확률(33/66/100%)로 상대적으로 약한 고유, 4단계는 확정으로 좋은 고유 풀(최상급 확률은 낮춤)
    const K = node.vsel || 1, pool = uniquePool("void", 10), CH = [0.33, 0.66, 1.0];   // 고른 단계의 보상만 받는다
    if (K <= 3 && Math.random() < CH[K - 1]) {
      const list = pool.filter((x) => x.u.tier < 4).map((x) => ({ u: x.u, w: x.u.tier <= 2 ? (K === 1 ? 30 : K === 2 ? 20 : 8) : (K === 1 ? 4 : K === 2 ? 12 : 22) }));
      if (list.length) { out.items.push(genUnique(sv, wpick(list, (x) => x.w).u, ilvl)); out.uniques++; }
    }
    const VS = SKILLS.filter((d) => d.voidOnly), SC = [0.02, 0.03, 0.05, 0.12];   // 공허 전용 스킬: 매우 낮은 확률 (단계별)
    if (VS.length && Math.random() < SC[K - 1]) out.skills.push(genSkill(sv, pick(VS).id, wpick(SKILL_RARITY.map((x, i) => ({ i, w: x.w * ([0.3, 1, 1.6][i] || 0) })), (x) => x.w).i, [0.04, 0.06, 0.10, 0.20][K - 1]));
    if (K >= 4) { const list = pool.map((x) => ({ u: x.u, w: x.u.tier === 4 ? 5 : 21 })); out.items.push(genUnique(sv, wpick(list, (x) => x.w).u, ilvl)); out.uniques++; }
  } else {
    const per = CFG.UNIQUE_BASE * CFG.PROTO_MULT * (UNIQUE_SRC[kind] || 1) * Math.pow(mfw, CFG.UNIQ_MF_EXP) * B.unique, rolls = n + (boss ? 2 : 0);
    for (let i = 0; i < rolls; i++) if (Math.random() < per) { const u = rollUnique(sv, late ? 10 : act, ilvl, U_POOLS_OF[kind] || ["common"]); if (u) { out.items.push(u); out.uniques++; } }
  }
  if (kind === "hive" && Math.random() < [0.15, 0.3, 0.5, 0.8][(node.vsel || 1) - 1] * Math.min(2, Math.pow(mfw, 0.4))) { const u = rollUnique(sv, 10, ilvl, ["fire"]); if (u) { out.items.push(u); out.uniques++; } }   // 화염 정령왕 전용 고유 (40%)
  // 스킬: 보스 첫 클리어 확정 1개, 일반 확률, 균열 탑에서 낮은 확률로 강한 스킬
  const poolFor = (min) => SKILLS.filter((d) => d.unlock <= Math.max(act, kind === "rift" ? 10 : 0) && d.unlock >= min);
  const rr = (w) => wpick(SKILL_RARITY.map((x, i) => ({ i, w: x.w * (w[i] || 0) })), (x) => x.w).i;
  if (node.firstClear && kind === "boss") { const d = wpick(SKILLS.filter((x) => x.unlock <= act && x.slot === "active"), (x) => (x.unlock >= act - 1 ? 2 : 1)); out.skills.push(genSkill(sv, d.id, rr([1, 1, 0.3]))); }
  else if (kind === "trial") { const T = node.tier || 1;
    for (let k = 0; k < (T >= 50 ? 2 : 1); k++) if (Math.random() < trialSkillChance(T) * (k ? 0.5 : 1)) { const d = pick(poolFor(3).filter((x) => x.slot === "active")); if (d) out.skills.push(genSkill(sv, d.id, rr([Math.max(0.05, 0.5 - T / 200), 1.2, 0.6 + T / 25]), 0.12 * T / 100)); }
    out.hone = Math.round((4 + Math.floor(T * 0.9)) * (T > (sv.trialBest || 0) ? 2 : 1) * B.ore); const rn = Math.min(0.9, 0.25 + 0.02 * T); if (Math.random() < rn) out.runes.push(pick(RUNE_IDS)); if (Math.random() < rn * 0.5) out.runes.push(pick(RUNE_IDS)); if (T >= 60 && Math.random() < 0.3) out.runes.push(pick(RUNE_IDS)); }
  else if (kind === "rift") { if (Math.random() < Math.min(0.12, 0.015 + 0.002 * (node.tier || 1))) { const d = pick(poolFor(5).filter((x) => x.slot === "active")); if (d) out.skills.push(genSkill(sv, d.id, rr([0.2, 1, 2]))); } }
  else if (Math.random() < (boss ? CFG.SKILL_DROP_BOSS : CFG.SKILL_DROP * (kind === "elite" ? 2 : 1))) {
    const pool = SKILLS.filter((d) => d.unlock <= act);
    const d = wpick(pool, (x) => (x.unlock >= act - 1 ? 2.0 : 1.0));
    out.skills.push(genSkill(sv, d.id, rr([1, 1, 1])));
  }
  out.ore = Math.round((rint(1, 2) + (boss ? 4 : 0) + (kind === "treasure" ? 8 : 0) + (kind === "elite" ? 3 : 0) + Math.floor((node.tier || 0) / 2) + endlessWaves * 2) * B.ore);
  if (late) out.shards = Math.round((2 + Math.floor((node.tier || 1) / 2) + (boss ? 5 : 0) + endlessWaves * 3 + (kind === "void" ? 3 * (node.vsel || 1) : 0)) * B.shard * (kind === "hell" ? B.hell : 1));
  // 구슬: 장비에 옵션을 더하는 재화
  const oc = { vault: 0.15, hive: 1.5 * (node.vsel || 1), stage: 0.03, treasure: 0.25, elite: 0.18, boss: 0.4, rift: 1 + (node.tier || 1) / 7, hell: 2 + (node.tier || 1) / 5, endless: 3 + endlessWaves * 1.4, void: 1.5 * (node.vsel || 1) }[kind] || 0.03;
  const ocE = (boss && kind === "stage" ? 0.4 : oc) * B.orb;
  out.orbC = Math.floor(ocE) + (Math.random() < ocE - Math.floor(ocE) ? 1 : 0);
  out.dice = Math.random() < diceChance(kind, node) * Math.min(2, B.orb) ? 1 : 0;   // 공허의 주사위: 아주 낮은 확률
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
// 장착 레벨: 아이템 레벨이 높을수록 높은 캐릭터 레벨이 필요하다 (액트 진행 속도에 맞춘 표)
const REQ_LV = [1, 3, 8, 16, 26, 36, 46, 56, 66, 76];
const reqLevel = (ilvl) => (ilvl <= 10 ? REQ_LV[Math.max(0, ilvl - 1)] : Math.min(CFG.LEVEL_CAP, 76 + 2 * (ilvl - 10)));
const canEquip = (sv, it) => sv.level >= reqLevel(it.ilvl);
const SELL_R = [1, 1.7, 3.2, 6, 9, 15];   // 등급별 판매 배율: 희귀 이상일수록 확실히 비싸다
const itemValue = (it) => Math.max(1, Math.round(7 * gScale(it.ilvl) * SELL_R[Math.min(5, it.rarity)] * (1 + (it.enh || 0) * 0.5)));
function dismantleYield(it) { return { gold: Math.round(itemValue(it) * 0.5), ore: Math.max(1, Math.round((it.rarity + 1) * 0.9 + (it.enh || 0) * 0.6)) }; }
function removeItem(sv, it) { sv.inv = sv.inv.filter((x) => x !== it); for (const s of EQ_SLOTS) if (sv.equipped[s] === it) delete sv.equipped[s]; }
function sellItem(sv, it) { sv.gold += itemValue(it); removeItem(sv, it); }
function dismantleItem(sv, it) { const y = dismantleYield(it); sv.gold += y.gold; sv.ore += y.ore; removeItem(sv, it); return y; }
const rerollCost = (it) => ({ gold: Math.round(itemValue(it) * 2.5), ore: 3 });
function rerollAffix(sv, it, idx) {
  const c = rerollCost(it); if (sv.gold < c.gold || sv.ore < c.ore) return false;
  const old = it.affixes[idx]; if (!old) return false;
  const pool = AFFIXES.filter((a) => !it.affixes.some((x, i) => i !== idx && x.k === a.k) && (!a.minRarity || it.rarity >= a.minRarity || (a.minRarity === 2 && it.rarity === 4)) && (!a.slots || a.slots.includes(it.slot)) && (!a.minIlvl || it.ilvl >= a.minIlvl) && a.k !== "lanes");
  if (!pool.length) return false;
  const a = wpick(pool, (x) => x.w); it.affixes[idx] = { k: a.k, v: rollAffix(a, gScale(it.ilvl), ITEM_RARITY[it.rarity], it.rarity, true) };
  sv.gold -= c.gold; sv.ore -= c.ore; return true;
}

// ---- 노드 개방 ----
function townUnlocked(sv, act) { return sv.tut.done && (act === 1 || sv.cleared[act - 2] >= CFG.STAGES); }
function nodeUnlocked(sv, n) {
  if (!sv.tut.done) return false;
  if (n.kind === "town") return townUnlocked(sv, n.act);
  if (n.kind === "rift" || n.kind === "endless" || n.kind === "void" || n.kind === "trial" || n.kind === "hive" || n.kind === "vault") return sv.cleared[CFG.ACTS - 1] >= CFG.STAGES;
  if (!townUnlocked(sv, n.act)) return false;
  if (n.kind === "elite" || n.kind === "treasure") return sv.cleared[n.act - 1] >= n.need;
  return n.stage <= sv.cleared[n.act - 1] + 1;
}
const nodeCleared = (sv, n) => (n.kind === "stage" || n.kind === "boss") && sv.cleared[n.act - 1] >= n.stage;

// ---- 봇 (밸런스 시뮬레이션 전용) ----
function botEquip(sv) {
  for (let pass = 0; pass < 2; pass++) for (const slot of EQ_SLOTS) {
    let best = sv.equipped[slot] || null, bp = powerWith(sv, slot, best, playerPowerOld);
    for (const it of sv.inv) if (it.slot === slotType(slot) && canEquip(sv, it)) { const p = powerWith(sv, slot, it, playerPowerOld); if (p > bp) { bp = p; best = it; } }
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
function isUpgrade(sv, it, ignoreLv) {   // 반지는 두 칸 중 하나라도 더 좋아지면 업그레이드 (장착 레벨이 모자라면 제외, ignoreLv면 레벨 무시)
  if (!ignoreLv && !canEquip(sv, it)) return false;
  for (const k of slotKeys(it.slot)) { const cur = sv.equipped[k]; if (cur === it) return false; }
  for (const k of slotKeys(it.slot)) { const cur = sv.equipped[k], base = powerWith(sv, k, cur || null), p = powerWith(sv, k, it); if (p > base * 1.0005) return true; }
  return false;
}
function recommendEquip(sv) {
  const changed = [];
  for (let pass = 0; pass < 2; pass++) for (const slot of EQ_SLOTS) {
    const cur = sv.equipped[slot] || null; let best = cur, bp = powerWith(sv, slot, cur);
    for (const it of sv.inv) if (it.slot === slotType(slot) && canEquip(sv, it)) { const p = powerWith(sv, slot, it); if (p > bp * 1.0005) { bp = p; best = it; } }
    if (best && best !== cur) { if (cur) sv.inv.push(cur); sv.inv = sv.inv.filter((x) => x !== best); sv.equipped[slot] = best; changed.push(slot); }
  }
  return changed;
}
function hasAnyUpgrade(sv) { for (const it of sv.inv) if (isUpgrade(sv, it)) return true; return false; }
function savePreset(sv, i) {
  sv.presets[i] = { equip: Object.fromEntries(EQ_SLOTS.filter((s) => sv.equipped[s]).map((s) => [s, sv.equipped[s].uid])), loadout: JSON.parse(JSON.stringify(sv.loadout)) };
}
function loadPreset(sv, i) {
  const p = sv.presets[i]; if (!p) return false;
  for (const s of EQ_SLOTS) if (sv.equipped[s]) { sv.inv.push(sv.equipped[s]); delete sv.equipped[s]; }
  for (const s of EQ_SLOTS) { const u = p.equip[s]; if (u == null) continue; const it = sv.inv.find((x) => x.uid === u); if (it) { sv.inv = sv.inv.filter((x) => x !== it); sv.equipped[s] = it; } }
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
  if (!pool.length) return false;   // 붙일 수 있는 옵션이 더 없다
  const a = wpick(pool, (x) => x.w); const R = ITEM_RARITY[Math.min(it.rarity, 4)];
  it.affixes.push({ k: a.k, v: rollAffix(a, g, R, it.rarity, true) }); sv.orbC--; return a;
}
function divineItem(sv, it) {  // 신성한 구슬: 옵션 수치 재굴림
  if (it.uniq || !it.affixes.length || sv.orbD < 1) return false;
  const g = gScale(it.ilvl), R = ITEM_RARITY[Math.min(it.rarity, 4)];
  it.affixes = it.affixes.map((a) => ({ k: a.k, v: rollAffix(AFFIXES.find((x) => x.k === a.k), g, R, it.rarity, true) })); sv.orbD--; return true;
}
function buyAtlas(sv, id) {
  const n = ATLAS.find((x) => x.id === id), r = (sv.atlas[id] || 0); if (r >= n.max) return false;
  const c = atlasCost(n, r); if (sv.shards < c) return false; sv.shards -= c; sv.atlas[id] = r + 1; return true;
}
const SHOP_MIN = 20;
const skillPrice = (d, rarity) => Math.round(70 * Math.pow(1.55, d.unlock - 1) * [1, 3.5, 12, 40, 130, 500][rarity] * (d.slot === "basic" ? 0.6 : 1));
const skillSellValue = (inst) => { const d = SKILLS.find((x) => x.id === inst.id); return Math.max(5, Math.round(skillPrice(d, inst.rarity) * 0.4 * (1 + 0.25 * ((inst.lvl || 1) - 1)))); };
const skillInPreset = (sv, inst) => (sv.presets || []).some((p) => p && p.loadout.some((l) => l && l.uid === inst.uid));
function sellSkill(sv, inst) {
  if (sv.loadout.some((l) => l && l.uid === inst.uid) || skillInPreset(sv, inst)) return null;
  const v = skillSellValue(inst); sv.gold += v; if (inst.rune) sv.runes.push({ uid: sv.nextUid++, id: inst.rune });   // 장착한 룬은 돌려준다
  sv.skills = sv.skills.filter((x) => x !== inst); return v;
}
// 특수 스킬(공허 전용 · 빌드별 보스 전용기)은 상점에서 팔지 않는다 — 드랍·시련·공허의 군주로만 얻는다 (기본 보스 스킬 '처형'은 상점 판매 유지)
const isSpecialSkill = (d) => !!d.voidOnly || (d.bonus && d.bonus.boss >= 0.8 && d.id !== "execute");
function shopStock(sv, now) {
  now = now || Date.now(); const slot = Math.floor(now / (SHOP_MIN * 60000)), act = maxActUnlocked(sv);
  if (!sv.shop || sv.shop.slot !== slot) sv.shop = { slot, bought: [] };
  const r = seeded(slot * 31 + act * 7), pool = SKILLS.filter((d) => d.unlock <= act && !isSpecialSkill(d)), out = [];
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
  if (it.lock || EQ_SLOTS.some((k) => sv.equipped[k] === it)) return true;
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

// ---- 자동 전투 후 장비 처리: 등급별로 유지/판매/분해, 전투력이 오르는 장비는 건드리지 않는 옵션 ----
function autoRules(sv) {
  const A = sv.auto; if (!A.rules) { A.rules = {}; for (let r = 0; r < 5; r++) A.rules[r] = A.sell >= 0 && r <= A.sell && r <= 2 ? "sell" : "keep"; }
  if (A.keepUp == null) A.keepUp = true; return A;
}
function autoProcess(sv) {
  const A = autoRules(sv), res = { sold: 0, dis: 0, gold: 0, ore: 0 };
  for (const it of sv.inv.slice()) {
    const rule = A.rules[it.rarity]; if (!rule || rule === "keep" || it.uniq || protectedItem(sv, it)) continue;
    if (A.keepUp && isUpgrade(sv, it, true)) continue;
    if (rule === "sell") { const v = itemValue(it); sv.gold += v; res.gold += v; removeItem(sv, it); res.sold++; } else { const y = dismantleItem(sv, it); res.gold += y.gold; res.ore += y.ore; res.dis++; }
  }
  return res;
}
