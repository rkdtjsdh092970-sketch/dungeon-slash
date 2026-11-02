// =========================================================
// 5.0 전투력 (로블록스판 Power.lua 이식): 장착 스킬마다 계산한 초당 피해 × 버티는 힘. 화면 전투력 = 몬스터 강함에 정비례 (균열 1층 권장 = 100)
// SKILL_TM: 스킬 1회 시전당 실측 피해 배율 (로블록스 전투 엔진에서 측정, roblox/data/SkillTM.lua 변환)
// =========================================================
const SKILL_TM5 = {abyssling: 104.48, angelfall: 58.03, arcbarrage: 1.47, arcbolt: 0.97, arcburst: 10.35, arcchain: 9.66, arclance: 24.68, arcmissiles: 3.51, arcnova: 75.40, arcrain: 61.01, arcward: 17.49, bigshuriken: 13.17, blizzard: 53.60, bloodclaw: 0.88, bloodmoon: 55.64, bomb: 8.23, boomer: 16.60, broodling: 56.40, burnfield: 41.97, butcher: 7.28, chain: 7.62, clusterbomb: 24.91, cometbolt: 5.28, crimsonstorm: 30.61, crush: 1.69, dimslash: 93.29, discharge: 7.20, doomrain: 205.56, dragonbreath: 68.86, dragoon: 29.42, earthsplit: 43.14, ember: 0.66, emberspirit: 37.08, eternalwinter: 32.79, execute: 3.80, fanghail: 4.33, fireball: 2.52, firecarpet: 23.87, firemark: 4.20, firewall: 10.85, frost: 39.21, frostbolt: 0.94, frostlance: 20.52, frostmark: 5.13, frostspirit: 52.73, galeshot: 0.49, giantmaul: 28.09, glacierfall: 20.06, groundslam: 14.35, gut: 6.00, heavensplit: 3.30, heavenstrike: 12.03, hydra: 33.32, icecage: 78.49, iceshard: 3.53, inferno: 16.80, ironstorm: 31.09, judgment: 5.32, lance: 12.75, legion: 61.53, magmafall: 70.25, manaburst: 8.30, meteor: 34.81, orbs: 13.71, phoenix: 22.64, pierce2: 22.63, plague: 19.64, quake: 11.03, railbolt: 42.83, rapid: 0.42, reaper: 14.43, rend: 4.94, riftsplit: 55.42, rip: 0.82, scorchbrand: 5.72, shatter: 7.97, shockspray: 3.34, shuriken: 2.93, singularity: 62.56, skycleave: 1.37, skypierce: 45.18, skysword: 41.03, smash: 2.80, smite: 4.00, snipe: 2.70, solarflare: 12.35, spark: 1.72, spirit: 6.76, starfall: 67.84, storm: 45.82, stormdance: 6.78, stormmark: 3.88, stormspear: 24.49, stormspirit: 30.09, strike: 0.87, sunbrand: 5.84, suncore: 81.28, sweep: 7.84, thunder: 18.14, thunderhead: 60.58, thunderlord: 116.11, titanfist: 11.20, toxcloud: 10.09, toxin: 4.13, trap: 28.88, twinfang: 1.01, twinlance: 20.52, vamp: 1.70, venom: 0.68, venomburst: 4.31, venomrain: 37.00, verdict: 10.32, voidbolt: 2.45, voideye: 90.38, voidhole: 36.75, voidmaw: 231.07, voidorb: 40.02, volley: 3.95, voltlash: 2.52, whirl: 22.14, zerofrost: 9.97};
const PW5 = { K: 0.25, RAW: 6, FIT_A: 9.085, FIT_G: 2.25 };
const PW_AOE = { multi: 1, nova: 1, meteor: 1, cone: 1, zone: 1, trap: 1, zone2: 1, rain: 1, aura: 1, hole: 1 }, PW_SQ = { orbit: 1, aura: 1, zone2: 1, hole: 1 }, PW_PERSIST = { zone: 1, zone2: 1, hole: 1, aura: 1, orbit: 1, rain: 1, trap: 1, shuri: 1 };
const pwActScale = (a) => { a = Math.max(1, Math.min(10, Math.round(a))); return (CFG.EASE[a - 1] || 1) * Math.pow(CFG.G, Math.min(a, 10) - 1) * (1 + CFG.LEVEL_STEP * (10 * Math.min(a, 10) - 5)) / (1 + CFG.LEVEL_STEP * 5); };
function pwCastMult(k, s) {
  if (SKILL_TM5[k.id] != null) { const dm = k.def && k.def.mult || k.mult, r = dm > 0 ? k.mult / dm : 1; return SKILL_TM5[k.id] * Math.pow(r, PW_SQ[k.kind] ? 2 : 1) * (k.kind === "chain" ? 1 + 0.12 * (s.chainJumps || 0) : 1) * (PW_AOE[k.kind] ? 1 + s.aoeDmg : 1); }
  const m = k.mult, side = k.side == null ? 1 : k.side;
  if (k.kind === "single") return m; if (k.kind === "multi") return m * (1 + side * 2) * (1 + s.aoeDmg);
  if (k.kind === "pierce") return m * (k.all ? 4.5 : k.adj ? 2.6 + 3 * k.adj : 2.6); if (k.kind === "bounce") return m * (k.count || 1);
  if (k.kind === "chain") { let t = 1; for (let j = 1; j <= (k.jumps || 0) + (s.chainJumps || 0); j++) t += Math.pow(k.decay || 0.7, j); return m * t * (1 + (s.chainDmg || 0)); }
  if (k.kind === "nova") return m * 5.5 * (1 + s.aoeDmg); if (k.kind === "meteor") return m * (k.count || 1) * (1 + side * 3) * (1 + s.aoeDmg);
  return m;
}
function pwKindMul(k, s) { let m = 1; if (k.kind === "single") m *= 1 + (s.singleDmg || 0); if (PW_PERSIST[k.kind]) m *= 1 + (s.persistDmg || 0); if (k.kind === "summon") m *= 1 + (s.summonDmg || 0); if (k.bonus && (k.bonus.boss || 0) >= 0.8) m *= 1 + (s.bossSkill || 0) * 0.5; return m; }
function pwBaseCast(k, s, act, sc) {
  const mag = k.dtype === "mag", base = mag ? s.mag * CFG.MAG_BASE : s.atk * CFG.PHYS_BASE;
  let inc = 1 + s.allDmg + (mag ? s.magDmg : s.physDmg); if (k.elem) inc += s.elemDmg + (s[k.elem + "Dmg"] || 0);
  const ig = Math.min(0.9, (mag ? s.ignoreRes : s.ignoreDef) + (k.ignoreAdd || 0)), sh = (mag ? s.shredRes : s.shredDef) * 0.7, X = 1.1 * sc * (1 - ig) * (1 - sh), red = 1 - Math.min(CFG.DEF_CAP, X / (X + CFG.DEF_C));
  let er = 1; if (k.elem) { const ei = ELEMS.indexOf(k.elem); er = 1 - Math.max(-0.5, Math.min(CFG.RES_CAP, (ACT_ELEM[act - 1] || ACT_ELEM[0])[ei] - s.penElem)); }
  const cc = Math.min(0.9, (mag ? (s.magCrit ? s.critChance + s.spellCrit : s.spellCrit) : s.critChance) + (k.critAdd || 0));
  let bsum = s.add.boss + s.add.elite + s.add.ranged + s.add.normal; for (const v of Object.values(k.bonus || {})) bsum += v;
  return base * inc * red * er * (1 + cc * s.critDmg) * (1 + 0.15 * bsum) * pwKindMul(k, s);
}
function pwSatExp(s, k, idx, empty, lanes) {
  const S = s.sat || {}, C = s.cm || {}; let m = 1; if (S.noelem && k.elem) return 0;
  if (C.first && idx === 0) m *= 1 + C.first; if (C.full) m *= 1 + C.full * 0.6; if (C.start) m *= 1 + C.start * 0.05; if (C.elite) m *= 1 + C.elite * 0.2;
  if (S.manafull) m *= 1.1; if (S.first) m *= idx === 0 ? 1.4 : 0.9; if (S.empty) m *= 1 + 0.25 * empty; if (S.fire && k.dtype !== "mag") m *= 1.25; if (S.elite) m *= 1.05; if (S.lowhp) m *= 0.6;
  if (S.normalonly) m *= 1.5; if (S.start) m *= 1.05; if (S.ready) m *= 1.1; if (S.lanes) m *= 1 + 0.05 * lanes; if (S.stack) m *= 1.1; if (S.dodgeamp) m *= 1 + 0.3 * (s.dodge || 0); return m;
}
function pwStatus(s) { const up = (c) => Math.min(0.85, (c || 0) * 1.2); let f = 1; for (const [c, v, m] of [[s.bleedChance, s.vsBleed, s.bleedMore], [s.poisonChance, s.vsPoison, s.poisonMore], [s.igniteChance, s.vsIgnite, s.igniteMore], [s.shockChance, s.vsShock, s.shockMore], [(s.coldDmg || 0) > 0.3 ? 0.5 : 0, s.vsChill, s.chillMore]]) f *= 1 + up(c) * ((1 + (v || 0)) * (m || 1) - 1); return f; }
function pwDetail(s, skl, slots) {
  const ref = s.refIlvl || s.avgIlvl, act = Math.max(1, Math.min(10, Math.round(ref))), sc = 1 + CFG.DEF_ACT * (act - 1);
  const refAtk = PW5.RAW * 6 * CFG.A0 * pwActScale(Math.max(1, ref)), mit = 1 + s.def / (5 * refAtk);
  const out = { skills: [], dps: 0, manaFactor: 1, buff: 1 }; let demand = 0, buffMul = 1; const cdMul = 1 - s.cdr, rows = [], empty = Math.max(0, (slots || skl.length) - skl.length);
  skl.forEach((k, idx) => {
    const cd = Math.max(0.2, (k.cd || 1) * cdMul), cost = (k.mana || 0) * s.manaCostMul / cd;
    if (k.dtype === "buff") { buffMul *= 1 + (k.power || 0) * Math.min(1, (k.dur || 0) / cd); demand += cost; }
    else if (k.dtype === "heal") demand += cost;
    else { const mag = k.dtype === "mag"; let cast = pwCastMult(k, s) * pwBaseCast(k, s, act, sc) * pwSatExp(s, k, idx, empty, s.lanes || 2), dot = 0;
      for (const st of ["bleed", "poison", "ignite"]) { const q = st === "ignite" ? k.elem === "fire" : !mag, ch = Math.min(1, (k[st] || 0) + (q ? s[st + "Chance"] || 0 : 0)); if (ch > 0) { const C = CFG[st.toUpperCase()]; dot += ch * (C ? C.coef : 0) * (1 + (s.dotDmg || 0)) * (1 + 0.3 * (s.dotDur || 0)) * 0.85; } }
      cast *= 1 + dot; demand += cost; rows.push({ k, dps: cast / cd, paid: cost > 0 }); }
  });
  const supply = s.maxMana * s.manaRate + (s.manaFlatRegen || 0) + (s.manaKill || 0) * 1.2 + s.maxMana / 25 + s.maxMana * (s.manaHit || 0) * 5, mf = demand > 0 ? Math.min(1, supply / demand) : 1; out.manaFactor = mf;
  for (const r of rows) { const e = r.dps * (r.paid ? mf : 1); out.dps += e; out.skills.push({ id: r.k.id, dps: e }); }
  out.dps *= buffMul; out.buff = buffMul;
  const f = s.manaShield || 0, msh = f > 0 ? Math.min(s.maxMana * (1 - CFG.MANA_SHIELD_KEEP) / CFG.MANA_SHIELD_COST, s.maxHp * f / (1 - f)) : 0;
  out.ehp = (s.maxHp * (1 + 20 * (s.regen || 0)) + msh) * mit * (1 / Math.max(CFG.TAKEN_FLOOR, 1 + s.dmgTaken)) / (1 - s.dodge);
  return out;
}
function powerOf5(sv) {   // 원전투력 (봇 · 장비 비교용)
  const s = computeStats(sv), skl = (sv.loadout || []).filter(Boolean).map((l) => sv.skills.find((x) => x.uid === l.uid)).filter(Boolean).map(skillOf), d = pwDetail(s, skl, sv.slots);
  return PW5.K * d.dps * d.ehp * pwStatus(s) * (1 + 0.35 * (s.revive || 0)) * (1 + s.laneBonus * 0.05) * (1 + 0.04 * (s.density || 0)) * (1 + s.lifesteal * 2);
}
const pwD = (f) => floorMult(f);
const powerDisplay = (P) => P <= 0 ? 0 : Math.floor(100 * Math.exp((Math.log(P) - PW5.FIT_A) / PW5.FIT_G) / pwD(1) + 0.5);   // 화면 전투력
const powerScore5 = (sv) => powerDisplay(powerOf5(sv));
const recRift5 = (n) => Math.floor(100 * pwD(n) / pwD(1) + 0.5), recTier5 = (tier, tower) => Math.floor(100 * pwD(tier) / pwD(1) * (tower ? 1.3 : 1) + 0.5);
