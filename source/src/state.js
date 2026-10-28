// =========================================================
// 세이브 / 장비 / 스탯 / 퀘스트 / 대장간
// =========================================================
const SAVE_KEY = "dungeon_slash_v4";   // v4: 구조가 완전히 바뀌어 이전 세이브는 사용하지 않는다 (새로 시작)
let save = null;
const QDEFS = questDefs();
const MAP = buildMap();

function newSave() {
  const s = { v: 3, level: 1, exp: 0, gold: 0, ore: 5, shards: 0, inv: [], equipped: {}, skills: [], loadout: [null, null, null, null], passive: null, stash: { items: [], skills: [], cap: 100 }, slots: 1,
    cleared: Array(CFG.ACTS).fill(0), tut: { step: 0, done: false }, q: {}, guild: {}, rift: { best: 0 }, lanesBase: CFG.BASE_LANES, endgame: false,
    nextUid: 1, set: { master: 0.8, bgm: 0.5, sfx: 0.8 }, opt: { hitflash: 1, shake: 1, autoNext: 0 }, stats: { kills: 0, clears: 0 }, seen: {},
    passRev: 6, rangeRev: 1, stones: [], hone: 0, runes: [], daily: { day: "" }, lastSeen: 0, rate: { gold: 0, exp: 0 }, pass: {}, passPresets: [null, null, null], atlas: {}, skdex: {}, orbC: 0, orbD: 0, dice: 0, keys: 0, keys2: 0, keys3: 0, keys4: 0, presets: [null, null, null], endless: { day: "", used: 0, best: 0, bestKills: 0 }, shop: { slot: -1, bought: [] }, auto: { on: false, sell: -1, equip: true }, uniq: {} };
  for (const slot of ["weapon", "helm", "armor"]) { const it = genItem(s, 1, 0, slot); s.equipped[slot] = it; }
  const sk = genSkill(s, "strike", 0); s.skills.push(sk); s.loadout[0] = { uid: sk.uid, rule: "front" };
  return s;
}
function saveGame() { if (save) { save.lastSeen = Date.now(); const dx = save.skdex || (save.skdex = {}); for (const x of save.skills) dx[x.id] = 1; } try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} if (typeof srvQueue === "function") srvQueue(); }
function loadGame() { try { const t = localStorage.getItem(SAVE_KEY); if (!t) return null; const s = JSON.parse(t); if (!s || s.v !== 3) return null;
  const d = newSave(); for (const k in d) if (!(k in s)) s[k] = d[k]; for (const k in s.pass) if (!PASSIVE_BY_ID[k]) delete s.pass[k];
    purgeClearedQuests(s); clampAll(s);
    if (s.passRev !== 6) { if (Object.keys(s.pass || {}).length) s.passReset = true; s.pass = {}; s.passRev = 6; }   // 패시브 트리 개편: 기존 포인트는 전부 환급
    return s; } catch (e) { return null; } }

// ---- 장비/스킬 생성 ----
// 화염 정령왕 드랍: 화염·점화·지속 피해 계열 옵션이 잘 붙는다
const FIRE_BIAS = { vsIgnite: 4, fireDmg: 6, igniteChance: 6, dotDmg: 5, elemDmg: 4, penElem: 4, magPct: 2, dotDur: 3 };
const PHYS_BIAS = { vsBleed: 4, vsPoison: 3, physDmg: 6, atkPct: 4, critChance: 4, critDmg: 4, bleedChance: 6, poisonChance: 4, dotDmg: 4, ignoreDef: 5, shredDef: 4, dotDur: 3 };
const LIGHT_BIAS = { vsShock: 4, shockChance: 4, lightDmg: 7, elemDmg: 4, penElem: 4, magPct: 4, spellCrit: 4, chainDmg: 5, critDmg: 2, ignoreRes: 4, shredRes: 3 };
EB.hive.bias = FIRE_BIAS; EB.titan.bias = PHYS_BIAS; EB.storm.bias = LIGHT_BIAS;
// =====================================================================
// v4 장비: 일반 · 매직 · 레어 · 전설. 전설은 옵션 5개(각 1~6티어) + 소켓 1~3개.
// 아이템 레벨 = T1~T5 (균열 20층마다 한 단계). 옵션 티어는 1티어가 최고(드묾), 6티어가 최저(흔함).
// =====================================================================
const wtOk = (a, it) => !(it.slot === "weapon" && it.wt && WTYPES[it.wt] && ((a.k === "atkFlat" && !WTYPES[it.wt].atk) || (a.k === "magFlat" && !WTYPES[it.wt].mag)));
const itemTier = (it) => Math.max(1, Math.min(5, it.ilvl | 0 || 1));
// 이 장비에 붙을 수 있는 옵션 풀 (exceptIdx: 그 줄은 제외하고 계산 — 재굴림용). 소켓 옵션과도 겹치지 않는다
function affixPool(it, exceptIdx) {
  const used = new Set(); (it.affixes || []).forEach((x, i) => { if (i !== exceptIdx) used.add(x.k); }); for (const s of it.sock || []) if (s) used.add(s.k);
  return AFFIXES.filter((a) => !used.has(a.k) && (!a.minRarity || it.rarity >= a.minRarity) && (!a.slots || a.slots.includes(it.slot)) && (!a.minIlvl || it.ilvl >= a.minIlvl) && a.k !== "lanes" && wtOk(a, it));
}
function affixScaleV(a, ilvl, rarity) {
  if (a.count) return 1;
  if (a.flat) return Math.pow(gAff(ilvl), a.gp || 1) * rarMul(rarity, ilvl);
  if (a.pct) return pctScale(ilvl);
  return 1;
}
// 옵션 한 줄을 만든다. tier(인덱스 0=1티어)를 주지 않으면 드랍 확률대로 뽑는다. 수치는 그 티어 안에서 균등하게
function mkAff(a, ilvl, rarity, crafted, tier) {
  const t = a.count ? null : (tier != null ? tier : atPick(ilvl)), u = Math.random();
  const v = a.count ? Math.round(a.range[0] + (a.range[1] - a.range[0]) * u) : (a.range[0] + (a.range[1] - a.range[0]) * u) * affixScaleV(a, ilvl, rarity) * atMul(a, t);
  const o = { k: a.k, v }; if (t != null) o.t = t; return o;
}
function affixRange(a, ilvl, rarity, t) {   // t(티어 인덱스)를 주면 그 티어의 범위, 없으면 이 아이템 T에서 나올 수 있는 전체 범위
  if (a.count) return [a.range[0], a.range[1]];
  const sc = affixScaleV(a, ilvl, rarity), av = atAvail(ilvl), lo = t != null ? t : av[av.length - 1], hi = t != null ? t : av[0];
  return [a.range[0] * sc * atMul(a, lo), a.range[1] * sc * atMul(a, hi)];
}
const SOCKET_W = [50, 35, 15];   // 전설의 소켓 수 1 / 2 / 3개 확률 가중치
function genItem(sv, ilvl, rarity, slot, _legacy, bias) {
  slot = slot || pick(SLOTS); ilvl = Math.max(1, Math.min(5, ilvl | 0)); rarity = Math.max(0, Math.min(3, rarity | 0));
  const R = ITEM_RARITY[rarity], it = { uid: sv.nextUid++, slot, ilvl, rarity, base: {}, affixes: [], enh: 0, gv: 4 }, f = gBase(ilvl) * rarMul(rarity, ilvl);
  if (slot === "weapon") { it.wt = wpick(WT_IDS, (x) => WTYPES[x].w); const T = WTYPES[it.wt]; if (T.atk) it.base.atk = T.atk * f * rnd(0.9, 1.1); if (T.mag) it.base.mag = T.mag * f * rnd(0.9, 1.1); }
  for (const k in SLOT_BASE[slot]) it.base[k] = SLOT_BASE[slot][k] * f * rnd(0.9, 1.1);
  for (let i = 0; i < R.affixes; i++) {
    const cand = affixPool(it); if (!cand.length) break;
    const a = wpick(cand, (x) => x.w * (bias && bias[x.k] || 1)); it.affixes.push(mkAff(a, ilvl, rarity, false));
  }
  if (rarity === 3) { const n = wpick([1, 2, 3], (x) => SOCKET_W[x - 1]); it.sock = Array(n).fill(null); }
  return it;
}
// 소켓: 미확인의 돌에서 나온 옵션(고정 수치)을 끼운다. 장비의 기존 옵션 · 다른 소켓과 같은 종류는 끼울 수 없다
const socketFree = (it) => (it.sock || []).findIndex((x) => !x);
const socketUsable = (it, k) => !(it.affixes || []).some((a) => a.k === k) && !(it.sock || []).some((s) => s && s.k === k);
function socketItem(sv, it, stone, idx) {
  if (!it || !it.sock || !stone || !stone.rev) return { ok: false, msg: "끼울 수 없습니다" };
  if (!socketUsable(it, stone.rev.k) && !(it.sock[idx] && it.sock[idx].k === stone.rev.k)) return { ok: false, msg: "이미 같은 옵션이 있어 끼울 수 없습니다" };
  if (idx < 0 || idx >= it.sock.length) return { ok: false, msg: "소켓이 없습니다" };
  it.sock[idx] = { k: stone.rev.k, v: stone.rev.v }; sv.stones = sv.stones.filter((x) => x !== stone); return { ok: true, msg: "소켓에 끼웠습니다" };
}
// 이전 세이브/경매 등에서 온 장비의 범위 밖 수치를 현재 범위 안으로 맞춘다
function clampItem(it) {
  if (!it) return 0; let n = 0; it.rarity = Math.max(0, Math.min(3, it.rarity | 0)); it.ilvl = Math.max(1, Math.min(5, it.ilvl | 0 || 1));
  for (const a of it.affixes || []) { const d = AFFIXES.find((x) => x.k === a.k); if (!d) continue; const [lo, hi] = affixRange(d, it.ilvl, it.rarity, a.t); const v = Math.min(hi, Math.max(lo, a.v)); if (v !== a.v) { a.v = v; n++; } }
  return n;
}
// 장착 스킬의 물리/마법 비중: 이전 버전의 무기에 종류가 없을 때, 쓰던 스킬에 맞는 종류(검/지팡이/낫/마도서)를 고르는 데 쓴다
function physFrac(sv) { let p = 0, m = 0; for (const l of sv.loadout || []) { if (!l) continue; const inst = (sv.skills || []).find((x) => x.uid === l.uid); if (!inst) continue; const k = skillOf(inst); if (k.dtype === "buff" || k.dtype === "heal") continue; const w = k.mult / k.cd; if (k.dtype === "mag") m += w; else p += w; } return p + m > 0 ? p / (p + m) : 0.5; }
function clampAll(sv) { let n = 0; if (!sv.stash || !Array.isArray(sv.stash.items)) sv.stash = { items: [], skills: [], cap: 100 }; if (!Array.isArray(sv.stash.skills)) sv.stash.skills = []; sv.stash.cap = Math.max(100, Math.min(500, Math.round((+sv.stash.cap || 100) / 10) * 10)); if (!Array.isArray(sv.stones)) sv.stones = []; for (const it of sv.stash.items) n += clampItem(it); for (const it of sv.inv || []) n += clampItem(it); for (const k in sv.equipped || {}) n += clampItem(sv.equipped[k]); return n; }
function diceItem(sv, it) {
  if ((sv.dice || 0) < 1) return false;
  if (!it.affixes.length) return false;
  it.affixes = it.affixes.map((a) => { const d = AFFIXES.find((x) => x.k === a.k); if (!d) return a; const [lo, hi] = affixRange(d, it.ilvl, it.rarity, a.t); const o = { k: a.k, v: d.count ? Math.round(rnd(lo, hi)) : rnd(lo, hi) }; if (a.t != null) o.t = a.t; return o; });
  sv.dice--; return true;
}
const diceChance = (kind, node) => ({ titan: [0.02, 0.03, 0.06, 0.12][(node.vsel || 1) - 1], storm: [0.02, 0.03, 0.06, 0.12][(node.vsel || 1) - 1], rift: 0.006 + 0.0004 * (node.tier || 1), hell: 0.012, endless: 0.01 + 0.002 * (node.waves || 0), trial: 0.004, hive: [0.02, 0.03, 0.06, 0.12][(node.vsel || 1) - 1], void: [0.02, 0.04, 0.07, 0.15][(node.vsel || 1) - 1] }[kind] || 0);
// 전설이 나왔을 때만 아주 낮은 확률로 이터널 → 소버린 → 엔젤릭 순으로 한 단계씩 더 올라간다 (chance는 첫 단계 확률, 이후 단계마다 ×0.4)
function skillTierUp(r, chance) { let c = chance || 0; while (r >= 2 && r < SKILL_RARITY.length - 1 && Math.random() < c) { r++; c *= 0.4; } return r; }
function genSkill(sv, id, rarity, tierUp) {
  const d0 = SKILLS.find((x) => x.id === id);
  if (d0 && d0.slot === "passive") return { uid: sv.nextUid++, id, rarity: d0.pt };   // 패시브 스킬은 이름마다 등급이 정해져 있다
  return { uid: sv.nextUid++, id, rarity: tierUp ? skillTierUp(rarity, tierUp) : rarity };
}
function skillOf(inst) {
  const d = SKILLS.find((x) => x.id === inst.id), R = SKILL_RARITY[inst.rarity], lvl = inst.lvl || 1, rn = inst.rune ? RUNES[inst.rune] : null;
  const bonus = {}; for (const k in d.bonus) bonus[k] = d.bonus[k] * R.bonusMul;
  const o = Object.assign({}, d, { def: d, inst, mult: d.mult * R.mult * (1 + 0.05 * (lvl - 1)), cd: d.cd * R.cdMul, side: d.side || 1, bonus, rarity: inst.rarity, lvl, rune: rn, mana: (d.mana || 0) * (1 + 0.02 * (lvl - 1)), power: d.power ? d.power * (1 + (R.mult - 1) * 0.6) : 0 });
  if (d.kind === "bounce") o.count = d.count + Math.floor((inst.rarity | 0) / 2);   // 등급이 오를수록 튕기는 횟수가 조금씩 늘어난다 (희귀·전설 +0~1, 사탄·종말 +2)
  if (d.kind === "single" && d.dtype !== "buff" && d.dtype !== "heal") { const h = SINGLE_HITS[inst.rarity] || 1; o.hits = h; o.hitMul = (SINGLE_HIT_BONUS[inst.rarity] || 1) / h; if (h > 1) o.desc = d.desc + ` (${h}연타)`; }
  if (rn) {
    if (rn.cd) o.cd *= rn.cd; if (rn.mult) o.mult *= rn.mult; if (rn.mana) o.mana *= rn.mana; if (rn.ignore) o.ignoreAdd = rn.ignore; if (rn.crit) o.critAdd = rn.crit;
    if (rn.lifesteal) o.lifesteal = (o.lifesteal || 0) + rn.lifesteal;
    for (const k of ["bleed", "poison", "ignite"]) if (rn[k]) o[k] = (o[k] || 0) + rn[k];
    if (rn.wide) { if (o.dur) o.dur *= rn.wide; if (o.count) o.count = Math.round(o.count * rn.wide); if (o.jumps) o.jumps += 2; if (o.over) o.over *= rn.wide; }
  }
  return o;
}
const itemName = (it) => ITEM_RARITY[Math.min(3, it.rarity)].name + " " + slotLabel(it);

// ---- 스탯 ----
const expNeed = (level) => 1;   // v4: 경험치 없음 (레벨 = 균열 최고 층 + 1)
function setCounts(sv) { const c = {}; for (const slot of EQ_SLOTS) { const it = sv.equipped[slot]; if (it && it.setId) c[it.setId] = (c[it.setId] || 0) + 1; } return c; }
const mfEff = (mf) => { mf = Math.max(0, mf); return mf / (1 + mf / CFG.MF_HALF); };   // MF 체감
const towerMf = (tier) => (tier ? CFG.MF_TOWER_STEP * tier + CFG.MF_TOWER_20 * Math.floor(tier / 20) : 0);
// 상태이상 대상 추가 피해: 해당 상태가 걸려 있을 확률(가동률)을 확률 스탯에서 어림해 전투력에 반영한다
function statusPow(s) {
  const up = (c) => Math.min(0.85, (c || 0) * 1.2);
  let f = 1;
  for (const [ch, v, m] of [[s.bleedChance, s.vsBleed, s.bleedMore], [s.poisonChance, s.vsPoison, s.poisonMore], [s.igniteChance, s.vsIgnite, s.igniteMore], [s.shockChance, s.vsShock, s.shockMore], [s.coldDmg > 0.3 ? 0.5 : 0, s.vsChill, s.chillMore]]) f *= 1 + up(ch) * ((1 + v) * m - 1);
  return f;
}
function computeStats(sv) {
  const lm = 1 + CFG.LEVEL_STEP * (sv.level - 1), ml = 1 + CFG.MANA_LV * (sv.level - 1);
  const s = { lm, wAtk: 0, wMag: 0, atkFlat: CFG.BASE_ATK, magFlat: CFG.BASE_ATK, hpFlat: CFG.BASE_HP, def: 0, atkPct: 0, magPct: 0, hpPct: 0, dodge: CFG.BASE_DODGE, cdr: 0, critChance: CFG.BASE_CRIT, critDmg: CFG.BASE_CRITDMG,
    add: { boss: 0, elite: 0, ranged: 0, normal: 0 }, lifesteal: 0, goldFind: 0, chainJumps: 0, chainDmg: 0, aoeDmg: 0, allDmg: 0, density: 0, laneBonus: 0,
    defPct: 0, hpMore: 1, atkMore: 1, magMore: 1, defMore: 1, dmgTaken: 0, regen: 0, revive: 0, dodgeCap: 0.5, cdrCap: 0.5, noDodge: 0, mf: 0, expFind: 0,
    physDmg: 0, magDmg: 0, elemDmg: 0, fireDmg: 0, coldDmg: 0, lightDmg: 0, voidDmg: 0, ignoreDef: 0, ignoreRes: 0, shredDef: 0, shredRes: 0, penElem: 0,
    spellCrit: 0, magCrit: 0, manaFlat: 0, manaPct: 0, manaRegen: 0, manaCostRed: 0, manaToSpell: 0, manaShield: 0,
    manaRegenFlat: 0, manaOnKill: 0, manaHit: 0, dmgPerMana: 0, bleedChance: 0, poisonChance: 0, igniteChance: 0, dotDmg: 0, dotDur: 0,
    vsBleed: 0, vsPoison: 0, vsIgnite: 0, vsChill: 0, vsShock: 0, bleedMore: 1, poisonMore: 1, igniteMore: 1, chillMore: 1, shockMore: 1, shockChance: 0,
    singleDmg: 0, persistDmg: 0, summonDmg: 0, bossSkill: 0, skillDur: 0, executeDmg: 0, killHeal: 0, bossTaken: 0, rangedTaken: 0, manaToHp: 0 };   // 스킬 종류별 피해 · 보스 전용기 피해 · 지속시간 (패시브 스킬 계열)
  const apply = (k, v) => {
    switch (k) {
      case "atkFlat": s.atkFlat += v; break; case "hpFlat": s.hpFlat += v; break; case "defFlat": s.def += v; break;
      case "boss": case "elite": case "ranged": case "normal": s.add[k] += v; break;
      case "lanes": s.laneBonus += v; break;
      case "hpMore": case "atkMore": case "magMore": case "defMore": case "bleedMore": case "poisonMore": case "igniteMore": case "chillMore": case "shockMore": s[k] *= v; break;
      case "dodgeCap": case "cdrCap": s[k] = Math.max(s[k], v); break;
      case "magCrit": case "noDodge": s[k] = 1; break;
      default: if (k in s) s[k] += v;
    }
  };
  let ilvlSum = 0, ilvlCnt = 0;
  for (const slot of EQ_SLOTS) {
    const it = sv.equipped[slot]; if (!it) continue;
    ilvlSum += it.ilvl; ilvlCnt++;
    const em = enhMul(it), ef = 1 + 0.08 * em * (it.enh || 0), pf = 1 + 0.04 * em * (it.enh || 0);
    if (slot === "weapon") { s.wAtk += (it.base.atk || 0) * ef; s.wMag += (it.base.mag || 0) * ef; } else { if (it.base.atk) s.atkFlat += it.base.atk * ef; if (it.base.mag) s.magFlat += it.base.mag * ef; }
    if (it.base.hp) s.hpFlat += it.base.hp * ef; if (it.base.def) s.def += it.base.def * ef;
    for (const a of it.affixes) { const d = AFFIXES.find((x) => x.k === a.k); if (!d) continue; if (slot === "weapon" && (a.k === "atkFlat" || a.k === "magFlat")) { s[a.k === "atkFlat" ? "wAtk" : "wMag"] += a.v * ef * CFG.WFLAT; continue; } apply(a.k, d.flat ? a.v * ef : d.pct ? a.v * pf : a.v); }
    for (const m of it.sock || []) { if (!m) continue; if (slot === "weapon" && (m.k === "atkFlat" || m.k === "magFlat")) s[m.k === "atkFlat" ? "wAtk" : "wMag"] += m.v * CFG.WFLAT; else apply(m.k, m.v); }   // 소켓 옵션은 고정 수치 (강화 영향 없음)
  }
  if (sv.passive) { const pi = (sv.skills || []).find((x) => x.uid === sv.passive), pd = pi && SKILLS.find((x) => x.id === pi.id); if (pd && pd.per) for (const k in pd.per) { const base = pd.per[k], lv = 1 + 0.05 * ((pi.lvl || 1) - 1); apply(k, k.endsWith("More") ? 1 + (base - 1) * lv : base * lv); } }   // 패시브 스킬 칸
  for (const id in (sv.pass || {})) { const p = PASSIVE_BY_ID[id]; if (p) for (const k in p.per) apply(k, p.per[k] * sv.pass[id]); }
  if (sv.guildLv) for (const gp of GUILD_PASSIVES) if (sv.guildLv >= gp.lv) for (const k in gp.per) apply(k, gp.per[k]);   // 길드 패시브
  const sc = {};
  s.maxMana = Math.max(10, (CFG.BASE_MANA + s.manaFlat) * (1 + s.manaPct) * ml);
  s.allDmg += s.dmgPerMana * s.maxMana / 100 * CFG.DPM_K; s.manaFlatRegen = s.manaRegenFlat * ml; s.manaKill = s.manaOnKill * ml;
  s.manaRate = CFG.MANA_REGEN + s.manaRegen; s.manaCostMul = ml * (1 - Math.min(0.6, s.manaCostRed)); s.manaShield = Math.min(0.8, s.manaShield);
  s.atk = (s.wAtk * (1 + s.atkPct) + s.atkFlat) * lm * s.atkMore;   // 공격력% 는 무기(기본값 + 무기 고정 옵션)에만 곱해지고, 나머지 부위의 플랫은 그대로 더해진다
  s.mag = ((s.wMag * lm + s.manaToSpell * s.maxMana) * (1 + s.magPct) + s.magFlat * lm) * s.magMore;
  s.maxHp = Math.max(10, (s.hpFlat + s.manaToHp * s.maxMana) * (1 + Math.max(-0.9, s.hpPct)) * lm * s.hpMore); s.def = s.def * lm * (1 + s.defPct) * s.defMore;
  s.dodge = s.noDodge ? 0 : Math.max(0, Math.min(s.dodgeCap, s.dodge)); s.cdr = Math.min(s.cdrCap, s.cdr); s.critChance = Math.min(0.8, s.critChance); s.spellCrit = Math.min(0.8, s.spellCrit);
  s.ignoreDef = Math.min(0.8, s.ignoreDef); s.ignoreRes = Math.min(0.8, s.ignoreRes); s.shredDef = Math.min(0.5, s.shredDef); s.shredRes = Math.min(0.5, s.shredRes);
  s.bossTaken = Math.min(0.6, s.bossTaken); s.rangedTaken = Math.min(0.6, s.rangedTaken); s.killHeal = Math.min(0.02, s.killHeal);
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
    case "pierce": return m * (k.all ? 4.5 : k.adj ? 2.6 + 3 * k.adj : 2.6);
    case "bounce": return m * k.count;
    case "shuri": return m * (k.dur / k.every) * 3 * (1 + s.aoeDmg);
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
const PERSIST_KINDS = ["zone", "zone2", "hole", "aura", "orbit", "rain", "trap", "shuri"];   // 지속·장판형 스킬
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
  return POWER_K * d.dps * d.ehp * statusPow(s) * (1 + 0.35 * (s.revive || 0)) * (1 + s.laneBonus * 0.05) * (1 + 0.04 * (s.density || 0)) * (1 + s.lifesteal * 2);
}
const enemyIndex = (act, stage) => CFG.H0 * CFG.A0 * actScale(act) * actScale(act) * (1 + CFG.STAGE_HP * (stage - 1)) * (1 + CFG.STAGE_ATK * (stage - 1));
const recPower = (act, stage) => CFG.REC_K * (stage === CFG.STAGES ? CFG.REC_BOSS : 1) * enemyIndex(act, stage);
function powerWith(sv, slot, item, fn) { const old = sv.equipped[slot]; sv.equipped[slot] = item; const p = (fn || playerPower)(computeStats(sv)); sv.equipped[slot] = old; return p; }

// ---- 드랍 ----
// 보너스 합산: 장비 MF + 패시브 + 심연 각인 + 월드 버프(엔드게임)
function dropBonus(sv, now) {
  const st = computeStats(sv), B = { mf: st.mf, qty: 1, orb: 1, exp: 1, gold: 1, unique: 1, stone: 1, key: 1, ore: 1, shard: 1, hell: 1 };
  B.mf += atlasVal(sv, "mf"); B.exp += st.expFind + atlasVal(sv, "exp"); B.gold += atlasVal(sv, "gold"); B.ore += atlasVal(sv, "ore"); B.orb += atlasVal(sv, "orb"); B.shard += atlasVal(sv, "shard"); B.key += atlasVal(sv, "key"); B.hell += atlasVal(sv, "hell");
  B.buffs = []; { const gl = sv.guildLv || 0; B.gold += 0.02 * gl; B.exp += 0.02 * gl; B.mf += 0.01 * gl; }
  if (sv.endgame) for (const w of worldBuffs(now)) { B.buffs.push(w); B.mf += w.mf || 0; B.exp *= w.exp || 1; B.gold *= w.gold || 1; B.qty *= w.qty || 1; B.orb *= w.orb || 1; B.unique *= w.unique || 1; B.stone *= w.stone || 1; B.key *= w.key || 1; }
  return B;
}
// =====================================================================
// v4 드랍: 균열 층 = 아이템 T (1~19층 T1 · 20~39층 T2 · 40~59층 T3 · 60~79층 T4 · 80층~ T5).
// 스킬은 필드에서 나오지 않는다 (균열 100층 졸업 후 기존 보스에서만). 균열에서는 장비와 미확인의 돌을 파밍한다.
// =====================================================================
const floorTier = (f) => Math.max(1, Math.min(5, 1 + Math.floor((Math.max(1, f) - 1 + 1) / 20)));   // 1~19 → T1, 20~39 → T2 ...
const riftRegion = (f) => Math.max(1, Math.min(10, Math.ceil(Math.max(1, f) / 10)));   // 몬스터 지역(외형·저항): 10층마다
const GRADUATED = (sv) => (sv.rift && sv.rift.best >= CFG.RIFT_END);
// 미확인의 돌에서 나올 수 있는 옵션 — 수치는 티어 없이 고정 (장비 옵션과 달리 단계 구분이 없다)
const STONE_POOL = [
  { k: "atkFlat", v: 22 }, { k: "magFlat", v: 22 }, { k: "hpFlat", v: 240 }, { k: "defFlat", v: 22 },
  { k: "atkPct", v: 0.10 }, { k: "magPct", v: 0.10 }, { k: "hpPct", v: 0.10 }, { k: "critChance", v: 0.04 }, { k: "critDmg", v: 0.22 }, { k: "spellCrit", v: 0.04 },
  { k: "cdr", v: 0.05 }, { k: "dodge", v: 0.04 }, { k: "lifesteal", v: 0.015 }, { k: "boss", v: 0.25 }, { k: "elite", v: 0.25 }, { k: "normal", v: 0.18 }, { k: "ranged", v: 0.25 },
  { k: "physDmg", v: 0.12 }, { k: "magDmg", v: 0.12 }, { k: "fireDmg", v: 0.14 }, { k: "coldDmg", v: 0.14 }, { k: "lightDmg", v: 0.14 }, { k: "voidDmg", v: 0.14 },
  { k: "ignoreDef", v: 0.06 }, { k: "ignoreRes", v: 0.06 }, { k: "bleedChance", v: 0.10 }, { k: "poisonChance", v: 0.10 }, { k: "igniteChance", v: 0.10 }, { k: "dotDmg", v: 0.16 },
  { k: "goldFind", v: 0.15 }, { k: "mf", v: 0.12 }, { k: "manaPct", v: 0.10 }, { k: "manaRegen", v: 0.4 }, { k: "allDmg", v: 0.06 },
];
const stoneLabel = (m) => { const d = AFFIXES.find((x) => x.k === m.k); const nm = d ? d.name : (typeof MOD_LABEL !== "undefined" && MOD_LABEL[m.k] ? MOD_LABEL[m.k][0] : m.k); return `${nm} +${d && d.pct || /Pct|Chance|Dmg|crit|cdr|dodge|lifesteal|boss|elite|normal|ranged|ignore|goldFind|mf|Regen/.test(m.k) && m.v < 5 ? (m.v * 100).toFixed(m.v < 0.1 ? 1 : 0).replace(/\.0$/, "") + "%" : Math.round(m.v)}`; };
function newStone(sv) { return { uid: sv.nextUid++, rev: null }; }
function revealStone(sv, st) { const c = stoneRevealCost(sv); if (sv.gold < c) return false; if (st.rev) return false; sv.gold -= c; const p = pick(STONE_POOL); st.rev = { k: p.k, v: p.v }; questEvent(sv, { type: "stone" }); return true; }
const stoneRevealCost = (sv) => Math.round(120 * Math.pow(1.45, riftRegion(Math.max(1, sv.rift ? sv.rift.best : 1)) - 1));   // 균열 1층 골드 수입의 약 1.2배
// 보스 스킬 드랍 (졸업 후): 모든 스킬이 속성/성격에 따라 네 보스 중 한 곳에 배정된다. 희귀 이상은 그 보스에게서만 나온다.
//  공허의 군주: 냉기·공허·마나·버프·회복·소환 계열 / 화염 정령왕: 화염·점화 / 철갑의 투사: 물리·출혈·중독 / 뇌제: 번개·감전
const BOSS_POOLKEY = { void: "void", hive: "fire", titan: "phys", storm: "light" }, BOSS_NAMES = { void: "공허의 군주", hive: "화염 정령왕", titan: "철갑의 투사", storm: "뇌제" };
function bossOfSkill(d) {
  if (d.slot === "passive") return null;
  if (d.src) return { void: "void", fire: "hive", phys: "titan", light: "storm" }[d.src] || "void";
  if (d.mythOnly) return { angelfall: "void", verdict: "void", dragonbreath: "hive", starfall: "storm", skysword: "titan", quake: "titan" }[d.id] || "void";
  if (d.elem === "fire" || d.ignite >= 0.35) return "hive";
  if (d.elem === "light" || d.shock) return "storm";
  if (d.elem === "cold" || d.elem === "void") return "void";
  if (d.dtype === "buff" || d.dtype === "heal" || d.kind === "summon") return "void";
  if (d.dtype === "mag") return "void";
  if (d.poison >= 0.3) return "void";   // 독 계열은 공허의 군주
  if (d.kind === "pierce" || d.kind === "spray" || d.kind === "bounce" || d.kind === "shuri" || d.kind === "boomer") return "storm";   // 관통·난사·투척 계열은 뇌제
  return "titan";
}
const BOSS_SKILL_RW = [[0, 40, 50, 10, 0, 0], [0, 20, 50, 26, 4, 0], [0, 0, 40, 45, 14, 1], [0, 0, 20, 45, 28, 7]];   // 단계(1~4)별 스킬 등급 가중치 (일반·희귀·전설·신화·사탄·종말)
const BOSS_SKILL_CH = [0.12, 0.18, 0.28, 0.45];
function bossSkillList(kind) { return SKILLS.filter((d) => d.slot !== "passive" && bossOfSkill(d) === kind); }
function rollBossSkills(sv, kind, K) {
  const out = []; if (!GRADUATED(sv)) return out; K = Math.max(1, Math.min(4, K | 1));
  if (Math.random() >= BOSS_SKILL_CH[K - 1]) return out;
  const w = BOSS_SKILL_RW[K - 1], r = wpick(SKILL_RARITY.map((x, i) => ({ i, w: w[i] || 0 })).filter((x) => x.w > 0), (x) => x.w).i;
  if (Math.random() < 0.3) { const ps = PASSIVE_SKILLS.filter((p) => p.pt >= Math.max(1, r - 1) && p.pt <= r); if (ps.length) { out.push(genSkill(sv, pick(ps).id, 0)); return out; } }
  const all = bossSkillList(kind), myth = all.filter((d) => d.mythOnly), reg = all.filter((d) => !d.mythOnly && (r < 3 || !d.voidOnly || true));
  const pool = r >= 3 && myth.length && Math.random() < 0.4 ? myth : reg; if (!pool.length) return out;
  out.push({ uid: sv.nextUid++, id: pick(pool).id, rarity: r }); return out;
}
// 균열 층별 드랍 수치 (도감의 확률 표도 같은 함수를 쓴다)
const riftItemN = (tier, boss) => 4 + Math.min(8, Math.floor((tier || 1) / 6)) + (boss ? 3 : 0);
const riftRW = (tier, boss) => [30, 40, 25, 5];   // 일반·매직·레어·전설 가중치 — 모든 층 균일 (높은 층은 장비 T와 옵션 티어가 좋아질 뿐)
const riftLegendShare = (tier, boss) => { const w = riftRW(tier, boss); return w[3] / (w[0] + w[1] + w[2] + w[3]); };
const stoneChanceAt = (tier) => Math.min(0.75, 0.30 + 0.004 * tier);
function rollDrops(sv, node, boss, B) {
  B = B || dropBonus(sv);
  const kind = node.kind, endlessWaves = node.waves || 0;
  const late = kind === "rift" || kind === "hell" || kind === "endless" || kind === "void" || isEB(kind) || kind === "vault";
  const ilvl = kind === "rift" || kind === "hell" ? floorTier(node.tier || 1) : late ? 5 : 1;
  const out = { items: [], skills: [], ore: 0, shards: 0, orbC: 0, orbD: 0, dice: 0, uniques: 0, hone: 0, runes: [], stones: 0 };
  let n = boss ? 4 : 2 + ((node.stage || 0) >= 3 ? 1 : 0);
  if (kind === "elite") n = 4; if (kind === "treasure") n = 5;
  if (kind === "rift" || kind === "hell") n = riftItemN(node.tier, boss) + (kind === "hell" ? 3 : 0);
  if (kind === "endless") n = 4 + Math.floor(endlessWaves * 1.2);
  if (kind === "void") n = 2 + Math.max(1, node.vsel || 1);
  if (isEB(kind)) n = 3 + 2 * (node.vsel || 1);
  if (kind === "vault") n = 2;
  n = Math.max(1, Math.round(n * B.qty * (kind === "hell" ? B.hell : 1)));
  const mfv = mfEff(B.mf), mfw = 1 + mfv;
  for (let i = 0; i < n; i++) {
    // 균열·보스: 일반 장비는 거의 안 나온다. 전설은 층이 높을수록 조금씩 더 잘 나온다
    const RW = late ? riftRW(node.tier, boss) : null;
    const r = wpick(ITEM_RARITY.map((x, idx) => ({ idx, w: (RW ? RW[idx] : boss ? Math.max(x.bossDrop, x.drop * 0.5) : x.drop) * (idx >= 1 ? Math.pow(mfw, 0.3 + idx * 0.2) : 1) })), (x) => x.w).idx;
    out.items.push(genItem(sv, ilvl, r, undefined, undefined, isEB(kind) ? EB[kind].bias : null));
  }
  // 미확인의 돌: 균열에서 드랍 (보스 층은 확정). 제련소에서 옵션을 확인한 뒤 소켓에 끼운다
  if (kind === "rift" || kind === "hell" || kind === "endless" || kind === "void" || isEB(kind)) {
    const T = node.tier || 1, chance = (kind === "rift" || kind === "hell") ? stoneChanceAt(T) * Math.pow(mfw, 0.3) * (B.stone || 1) : 1.2;
    let c = boss && (kind === "rift" || kind === "hell") ? 1 : 0; for (let k = 0; k < 1 + (chance > 1 ? 1 : 0); k++) if (Math.random() < Math.min(1, chance)) c++;
    for (let k = 0; k < c; k++) sv.stones.push(newStone(sv)); out.stones = c;
  }
  // 스킬: 필드·균열에서는 나오지 않는다. 졸업(균열 100층) 후 공허의 군주 · 속성 보스에서만
  if (kind === "void") for (const s of rollBossSkills(sv, "void", node.vsel || 1)) out.skills.push(s);
  else if (isEB(kind)) for (const s of rollBossSkills(sv, kind, node.vsel || 1)) out.skills.push(s);
  out.ore = Math.round((rint(1, 2) + (boss ? 4 : 0) + (kind === "treasure" ? 8 : 0) + (kind === "elite" ? 3 : 0) + Math.floor((node.tier || 0) / 3) + endlessWaves * 2) * B.ore);
  if (kind === "rift") { out.hone = Math.max(1, Math.round((1 + (node.tier || 1) / 8) * B.ore * (boss ? 2 : 1))); if (boss && Math.random() < 0.2) out.runes.push(pick(RUNE_IDS)); }   // 스킬 레벨업 재료: 균열에서
  if (late) out.shards = Math.round((2 + Math.floor((node.tier || 1) / 2) + (boss ? 5 : 0) + endlessWaves * 3 + (kind === "void" ? 3 * (node.vsel || 1) : 0)) * B.shard * (kind === "hell" ? B.hell : 1));
  // 구슬: 장비에 옵션을 더하는 재화
  const oc = { vault: 0.15, hive: 1.5 * (node.vsel || 1), titan: 1.5 * (node.vsel || 1), storm: 1.5 * (node.vsel || 1), stage: 0.03, treasure: 0.25, elite: 0.18, boss: 0.4, rift: 0.4 + (node.tier || 1) / 30, hell: 1 + (node.tier || 1) / 15, endless: 3 + endlessWaves * 1.4, void: 1.5 * (node.vsel || 1) }[kind] || 0.03;
  const ocE = (boss && kind === "stage" ? 0.4 : oc) * B.orb;
  out.orbC = Math.floor(ocE) + (Math.random() < ocE - Math.floor(ocE) ? 1 : 0);
  out.dice = Math.random() < diceChance(kind, node) * Math.min(2, B.orb) ? 1 : 0;   // 공허의 주사위: 아주 낮은 확률
  const odE = ocE * 0.25; out.orbD = Math.floor(odE) + (Math.random() < odE - Math.floor(odE) ? 1 : 0);
  return out;
}

// ---- 퀘스트 ----
const getQDef = (id) => QDEFS.find((q) => q.id === id) || GUILD_BOUNTIES.find((q) => q.id === id);
function maxActUnlocked(sv) { let a = 1; for (let i = 1; i < CFG.ACTS; i++) if (sv.cleared[i - 1] >= CFG.STAGES) a = i + 1; return a; }
const actCleared = (sv, a) => (sv.cleared[a - 1] || 0) >= CFG.STAGES;
// 클리어한 액트의 퀘스트는 사라진다 (수락 전 · 진행 중). 이미 완료해서 보상만 남은 퀘스트는 받을 때까지 유지한다
function availableQuests(sv) { const m = maxActUnlocked(sv); return QDEFS.filter((q) => q.act <= m && !sv.q[q.id] && !actCleared(sv, q.act)); }
function purgeClearedQuests(sv) { let n = 0; for (const id in sv.q) { const st = sv.q[id], d = QDEFS.find((x) => x.id === id); if (d && st.state === "active" && actCleared(sv, d.act)) { delete sv.q[id]; n++; } } return n; }
// 퀘스트 게시판 느낌표: 이 마을(액트)의 수락 가능한 퀘스트가 있거나, 완료해서 보상을 받을 퀘스트가 있을 때
function questBang(act) { if (!save || !save.tut || !save.tut.done) return false; return Object.keys(save.q || {}).some((id) => save.q[id].state === "done") || availableQuests(save).some((q) => q.act === act); }
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
    else if (g.type === "stone" && ev.type === "stone") add = 1;
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
function addExp(sv, amount) { sv.exp = 0; return 0; }   // v4: 경험치 없음

// ---- 대장간 ----
// 강화 효율: 희귀·전설을 대충 주워 강화만으로 최상급이 되지 않도록 등급별로 다르다 (일반·마법·희귀 60% · 전설 75% · 세트 90% · 고유 100%)
const ENH_EFF = [0.6, 0.6, 0.6, 0.75, 0.9, 1.0];
const enhMul = (it) => 1;   // 액트(아이템 레벨 10 이하) 장비는 그대로 — 엔드게임 장비에만 적용
const ENH_RATE = [1, 1, 1, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3];
const ENH_DROP = [0, 0, 0, 0, 0, 0, 0, 0.3, 0.4, 0.5];   // v3.23: +8 · +9 · +10 강화에 실패하면 이 확률로 강화 단계가 1 내려간다 (시도하는 단계 기준)
const gGold = (ilvl) => Math.pow(gScale(ilvl), 0.8);   // 골드 비용은 아이템 레벨에 따라 장비 능력치(1.55배씩)보다 완만하게 오른다 — 엔드게임에서 골드가 모자라 강화·재굴림이 막히지 않게
const enhCost = (it) => ({ gold: Math.round(40 * gGold(it.ilvl) * (1 + (it.enh || 0) * 0.6)), ore: 2 + (it.enh || 0) });
function enhance(sv, it) {
  if ((it.enh || 0) >= 10) return { ok: false, msg: "최대 강화입니다" };
  const c = enhCost(it); if (sv.gold < c.gold || sv.ore < c.ore) return { ok: false, msg: "재료가 부족합니다" };
  sv.gold -= c.gold; const rate = ENH_RATE[it.enh || 0];
  if (Math.random() < rate) { sv.ore -= c.ore; it.enh = (it.enh || 0) + 1; questEvent(sv, { type: "enhance" }); return { ok: true, success: true, msg: `+${it.enh} 강화 성공!` }; }
  sv.ore -= Math.ceil(c.ore / 2);
  if ((it.enh || 0) > 0 && Math.random() < ENH_DROP[it.enh || 0]) { it.enh--; return { ok: true, success: false, msg: `강화 실패 — +${it.enh + 1}에서 +${it.enh}로 하락했습니다` }; }
  return { ok: true, success: false, msg: "강화 실패 (강화석 일부만 소모)" };
}
// 장착 레벨: 아이템 레벨이 높을수록 높은 캐릭터 레벨이 필요하다 (액트 진행 속도에 맞춘 표)
const REQ_LV = [1, 20, 40, 60, 80];   // v4: 아이템 T1~T5 (균열 20층마다)
const reqLevel = (ilvl) => (ilvl <= 10 ? REQ_LV[Math.max(0, ilvl - 1)] : Math.min(CFG.LEVEL_CAP, 76 + 2 * (ilvl - 10)));
const canEquip = (sv, it) => sv.level >= reqLevel(it.ilvl);
const SELL_R = [1, 1.7, 3.2, 6, 9, 15];   // 등급별 판매 배율: 희귀 이상일수록 확실히 비싸다
const itemValue = (it) => Math.max(1, Math.round(7 * gScale(it.ilvl) * SELL_R[Math.min(5, it.rarity)] * (1 + (it.enh || 0) * 0.5)));
function dismantleYield(it) { return { gold: Math.round(itemValue(it) * 0.5), ore: Math.max(1, Math.round((it.rarity + 1) * 0.9 + (it.enh || 0) * 0.6)) }; }
function removeItem(sv, it) { sv.inv = sv.inv.filter((x) => x !== it); for (const s of EQ_SLOTS) if (sv.equipped[s] === it) delete sv.equipped[s]; }
function sellItem(sv, it) { sv.gold += itemValue(it); removeItem(sv, it); }
function dismantleItem(sv, it) { const y = dismantleYield(it); sv.gold += y.gold; sv.ore += y.ore; removeItem(sv, it); return y; }
const rerollCost = (it) => { const n = Math.min(14, it.rr || 0), m = Math.pow(1.45, n); return { gold: Math.round(7 * gGold(it.ilvl) * SELL_R[Math.min(5, it.rarity)] * (1 + (it.enh || 0) * 0.5) * 2.5 * m), ore: Math.round((3 + n) * (it.ilvl > 10 ? 1.5 : 1)) }; };   // 같은 장비를 거듭 재굴림할수록 비싸진다
// v3.23: 한 장비에서 재굴림할 수 있는 줄은 하나뿐이다. 한 줄을 굴리면(rrIdx) 나머지 줄은 잠긴다 — 같은 줄은 계속 굴릴 수 있다.
const rerollLocked = (it, idx) => it.rrIdx != null && it.rrIdx !== idx;
function rerollAffix(sv, it, idx) {
  if (rerollLocked(it, idx)) return false;
  const c = rerollCost(it); if (sv.gold < c.gold || sv.ore < c.ore) return false;
  const old = it.affixes[idx]; if (!old) return false;
  const pool = AFFIXES.filter((a) => !it.affixes.some((x, i) => i !== idx && x.k === a.k) && (!a.minRarity || it.rarity >= a.minRarity || (a.minRarity === 2 && it.rarity === 4)) && (!a.slots || a.slots.includes(it.slot)) && (!a.minIlvl || it.ilvl >= a.minIlvl) && a.k !== "lanes" && wtOk(a, it));
  if (!pool.length) return false;
  const a = wpick(pool, (x) => x.w); it.affixes[idx] = mkAff(a, gScale(it.ilvl), ITEM_RARITY[it.uniq ? 3 : it.rarity], it.uniq ? 3 : it.rarity, false); it.rr = (it.rr || 0) + 1; it.rrIdx = idx;   // 재굴림 수치는 드랍과 같은 확률 (높은 수치는 신성한 구슬로)
  sv.gold -= c.gold; sv.ore -= c.ore; return true;
}

// ---- 노드 개방 ----
function townUnlocked(sv, act) { return sv.tut.done && (act === 1 || sv.cleared[act - 2] >= CFG.STAGES); }
function nodeUnlocked(sv, n) {
  if (!sv.tut.done) return false;
  if (n.kind === "town") return townUnlocked(sv, n.act);
  if (n.kind === "rift") return sv.cleared[CFG.ACTS - 1] >= CFG.STAGES;
  if (n.kind === "endless" || n.kind === "void" || isEB(n.kind) || n.kind === "vault") return GRADUATED(sv);   // v4: 균열 100층을 졸업한 뒤 열린다
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
  if (it.uniq || it.affixes.length >= (it.ilvl > 10 ? 5 : 6) || sv.orbC < 1) return false;
  const used = new Set(it.affixes.map((a) => a.k)), g = gScale(it.ilvl);
  const pool = AFFIXES.filter((a) => !used.has(a.k) && a.k !== "lanes" && (!a.slots || a.slots.includes(it.slot)) && (!a.minIlvl || it.ilvl >= a.minIlvl) && wtOk(a, it));
  if (!pool.length) return false;   // 붙일 수 있는 옵션이 더 없다
  const a = wpick(pool, (x) => x.w); const R = ITEM_RARITY[Math.min(it.rarity, 4)];
  it.affixes.push(mkAff(a, g, R, it.rarity, true)); sv.orbC--; return a;
}
function divineItem(sv, it) {  // 신성한 구슬: 옵션 수치 재굴림
  if (it.uniq || !it.affixes.length || sv.orbD < 1) return false;
  const g = gScale(it.ilvl), R = ITEM_RARITY[Math.min(it.rarity, 4)];
  it.affixes = it.affixes.map((a) => mkAff(AFFIXES.find((x) => x.k === a.k), g, R, it.rarity, true, a.t)); sv.orbD--; return true;   // 신성한 구슬: 티어는 그대로, 그 티어 범위 안에서 수치만 다시
}
function buyAtlas(sv, id) {
  const n = ATLAS.find((x) => x.id === id), r = (sv.atlas[id] || 0); if (r >= n.max) return false;
  const c = atlasCost(n, r); if (sv.shards < c) return false; sv.shards -= c; sv.atlas[id] = r + 1; return true;
}
const SHOP_MIN = 20;
const skillPrice = (d, rarity) => d.slot === "passive" ? 300 * [1, 3, 10, 30, 90, 300][rarity] : Math.round(70 * Math.pow(1.55, d.unlock - 1) * [1, 3.5, 12, 40, 130, 500][rarity] * (d.slot === "basic" ? 0.6 : 1));
const skillSellValue = (inst) => { const d = SKILLS.find((x) => x.id === inst.id); return Math.max(5, Math.round(skillPrice(d, inst.rarity) * 0.4 * (1 + 0.25 * ((inst.lvl || 1) - 1)))); };
const skillInPreset = (sv, inst) => (sv.presets || []).some((p) => p && p.loadout.some((l) => l && l.uid === inst.uid));
const save_dexHas = (sv, id) => !!(sv.skdex && sv.skdex[id]) || sv.skills.some((x) => x.id === id);
// 스킬 분해: 연마석을 준다 (등급이 높을수록 많이). 장착 중·프리셋 스킬은 못 한다
const skillDisYield = (inst) => Math.max(1, Math.round([1, 3, 8, 20, 45, 100][inst.rarity] * (1 + 0.5 * ((inst.lvl || 1) - 1))));
function dismantleSkill(sv, inst) {
  if (sv.passive === inst.uid || sv.loadout.some((l) => l && l.uid === inst.uid) || skillInPreset(sv, inst)) return null;
  const h = skillDisYield(inst); sv.hone += h; if (inst.rune) sv.runes.push({ uid: sv.nextUid++, id: inst.rune }); sv.skills = sv.skills.filter((x) => x !== inst); return h;
}
function sellSkill(sv, inst) {
  if (sv.passive === inst.uid || sv.loadout.some((l) => l && l.uid === inst.uid) || skillInPreset(sv, inst)) return null;
  const v = skillSellValue(inst); sv.gold += v; if (inst.rune) sv.runes.push({ uid: sv.nextUid++, id: inst.rune });   // 장착한 룬은 돌려준다
  sv.skills = sv.skills.filter((x) => x !== inst); return v;
}
// 특수 스킬(공허 전용 · 빌드별 보스 전용기)은 상점에서 팔지 않는다 — 드랍·시련·공허의 군주로만 얻는다 (기본 보스 스킬 '처형'은 상점 판매 유지)
const isSpecialSkill = (d) => !!d.voidOnly || (d.slot === "passive" && d.pt > 0) || !!d.mythOnly || (d.bonus && d.bonus.boss >= 0.8 && d.id !== "execute");
// v4: 스킬 해금 단계는 캐릭터 레벨(= 균열 최고 층 + 1)을 따른다
const skillAct = (sv) => Math.max(1, Math.min(8, 1 + Math.floor(sv.level / 10)));
function shopStock(sv, now) {
  // v4.1: 상점은 일반 등급 스킬 전부를 상시 판매한다 (골라서 구매, 수량 제한 없음). 높은 등급은 졸업 후 보스 드랍
  if (!sv.shop) sv.shop = { slot: 0, bought: [] };
  return SKILLS.filter((d) => !isSpecialSkill(d) && d.id !== "p_none").sort((a, b) => (a.slot === "basic" ? 0 : 1) - (b.slot === "basic" ? 0 : 1) || a.unlock - b.unlock).map((d) => ({ id: d.id, rarity: 0, price: skillPrice(d, 0) }));
}
function buySkill(sv, idx) {
  const stock = shopStock(sv), o = stock[idx]; if (!o || sv.gold < o.price) return false;
  sv.gold -= o.price; sv.skills.push(genSkill(sv, o.id, o.rarity)); return true;
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
  if (A.keepUp == null) A.keepUp = true; if (!A.srules) A.srules = { 0: "keep", 1: "keep", 2: "keep" }; if (A.sBest == null) A.sBest = true; if (A.minQ == null) A.minQ = 0; if (A.maxIlvl == null) A.maxIlvl = 0; if (A.always == null) A.always = false; return A;
}
// 옵션 품질: 옵션 수치가 범위의 어디쯤인지 평균 (0~1). 옵션이 없는 장비는 0
function itemQuality(it) {
  let n = 0, s = 0; for (const a of it.affixes || []) { const d = AFFIXES.find((x) => x.k === a.k); if (!d || d.count) continue; const [lo, hi] = affixRange(d, it.ilvl, Math.min(it.rarity, 4)); if (hi > lo) { s += clamp((a.v - lo) / (hi - lo), 0, 1); n++; } }   // 품질은 지금 아이템 레벨의 전체 범위 기준 (높은 티어일수록 높다)
  return n ? s / n : 0;
}
function autoProcess(sv) {
  const A = autoRules(sv), res = { sold: 0, dis: 0, gold: 0, ore: 0 };
  for (const it of sv.inv.slice()) {
    const rule = A.rules[it.rarity]; if (!rule || rule === "keep" || it.uniq || protectedItem(sv, it)) continue;
    if (A.keepUp && isUpgrade(sv, it, true)) continue;
    if (A.maxIlvl && it.ilvl > A.maxIlvl) continue;   // 아이템 레벨 상한: 이보다 높은 장비는 처리하지 않는다
    if (A.minQ && itemQuality(it) >= A.minQ) continue;   // 옵션 품질이 기준 이상이면 유지
    if (rule === "sell") { const v = itemValue(it); sv.gold += v; res.gold += v; removeItem(sv, it); res.sold++; } else { const y = dismantleItem(sv, it); res.gold += y.gold; res.ore += y.ore; res.dis++; }
  }
  { const sr = autoProcessSkills(sv); res.sSold = sr.sold; res.sDis = sr.dis; res.gold += sr.gold; res.hone = sr.hone; }
  return res;
}
// 스킬 자동 정리: 등급별 유지/판매/분해. 같은 스킬의 가장 좋은 1개는 남기고, 장착·프리셋·룬·레벨업한 스킬과 특수 스킬(전용기·보스 전용)·이터널 이상은 건드리지 않는다
function autoProcessSkills(sv) {
  const A = autoRules(sv), res = { sold: 0, dis: 0, gold: 0, hone: 0 }, best = {};
  if (A.sBest) for (const k of sv.skills) { const b = best[k.id]; if (!b || k.rarity > b.rarity || (k.rarity === b.rarity && (k.lvl || 1) > (b.lvl || 1))) best[k.id] = k; }
  for (const k of sv.skills.slice()) {
    const rule = A.srules[k.rarity]; if (!rule || rule === "keep" || k.rarity > 2) continue;
    const d = SKILLS.find((x) => x.id === k.id); if (!d || isSpecialSkill(d) || k.rune || (k.lvl || 1) > 1 || sv.passive === k.uid || sv.loadout.some((l) => l && l.uid === k.uid) || skillInPreset(sv, k)) continue;
    if (A.sBest && best[k.id] === k) continue;
    if (rule === "sell") { const v = sellSkill(sv, k); if (v != null) { res.sold++; res.gold += v; } } else { const h = dismantleSkill(sv, k); if (h != null) { res.dis++; res.hone += h; } }
  }
  return res;
}

// v4: 균열 탑 돌파 보상(고유 장비 우편)은 삭제됨 — 호환용 빈 정의
const RIFT_TN = {}; const genRiftReward = () => null; const riftRewardTier = () => 2;
