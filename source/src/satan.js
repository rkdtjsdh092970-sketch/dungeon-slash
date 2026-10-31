// ---- 사탄 장비: 전설 장비 + 부위별 고유 한 줄 (it.sat = 줄 id) ----
// [id, 부위, 체감(0매우좋음~4쓸모없음), 설명, 효과[[스탯, 값]]]  — 스탯 이름 끝이 Pct 인 것은 기본값 대비 비율
const SAT_DEFS = [
  ["w_nocrit", "weapon", 0, "치명타가 발생하지 않는 대신 주문 피해 +60%(more)", [["noCrit", 1], ["magMore", 1.6]]],
  ["w_cdmana", "weapon", 1, "모든 스킬 쿨타임 -15%, 마나 소모 +40%", [["cdr", 0.15], ["manaCostRed", -0.4]]],
  ["w_manaspell", "weapon", 1, "최대 마나의 10%만큼 주문력, 최대 체력 -30%", [["manaToSpell", 0.1], ["hpMore", 0.7]]],
  ["w_status", "weapon", 2, "점화 · 감전 · 출혈 · 중독 확률 +15%, 지속 피해 -30%", [["igniteChance", 0.15], ["shockChance", 0.15], ["bleedChance", 0.15], ["poisonChance", 0.15], ["dotDmg", -0.3]]],
  ["w_trash", "weapon", 3, "모든 스킬 피해 +20%, 쿨타임 +40%", [["allDmg", 0.2], ["cdr", -0.4]]],
  ["h_boss", "helm", 1, "보스에게 받는 피해 -25%", [["bossTaken", 0.25]]],
  ["h_ranged", "helm", 2, "원거리 적에게 받는 피해 -30%", [["rangedTaken", 0.3]]],
  ["h_gold", "helm", 2, "골드 획득 +100%, 주는 피해 -5%", [["goldFind", 1], ["allDmg", -0.05]]],
  ["h_mana", "helm", 3, "최대 마나 +50%, 마나 재생 0", [["manaPct", 0.5], ["manaRegenPct", -1]]],
  ["a_shield", "armor", 1, "받는 피해의 20%를 마나가 흡수", [["manaShield", 0.2]]],
  ["a_revive", "armor", 1, "부활 1회, 최대 체력 -25%", [["revive", 1], ["hpMore", 0.75]]],
  ["a_regen2", "armor", 2, "초당 체력 회복 +0.8%, 마나 재생 -50%", [["regen", 0.008], ["manaRegenPct", -0.5]]],
  ["a_hp", "armor", 2, "최대 체력 +40%, 방어력 -40%", [["hpMore", 1.4], ["defMore", 0.6]]],
  ["a_nols", "armor", 2, "생명력 흡수 불가, 받는 피해 -20%", [["noLife", 1], ["dmgTaken", -0.2]]],
  ["a_regen1", "armor", 2, "초당 체력 회복 +0.4%, 최대 체력 -10%", [["regen", 0.004], ["hpMore", 0.9]]],
  ["a_def", "armor", 3, "방어력 +30%, 받는 피해 +25%", [["defPct", 0.3], ["dmgTaken", 0.25]]],
  ["g_aoe", "gloves", 1, "광역 피해 +50%, 단일 대상 스킬 피해 -30%", [["aoeDmg", 0.5], ["singleDmg", -0.3]]],
  ["g_pen", "gloves", 1, "방어 무시 +25%, 공격력 · 주문력 -10%", [["ignoreDef", 0.25], ["atkMore", 0.9], ["magMore", 0.9]]],
  ["g_ranged", "gloves", 2, "원거리 추가 피해 +40%, 일반 추가 피해 -20%", [["ranged", 0.4], ["normal", -0.2]]],
  ["g_manahit", "gloves", 2, "마나 흡수 +0.3%, 마나 소모 +20%", [["manaHit", 0.003], ["manaCostRed", -0.2]]],
  ["g_ign", "gloves", 2, "점화 · 감전 확률 +20%", [["igniteChance", 0.2], ["shockChance", 0.2]]],
  ["g_crit", "gloves", 3, "치명타 확률 +30%, 치명타 피해 -50%", [["critChance", 0.3], ["critDmg", -0.5]]],
  ["b_cdcap", "boots", 1, "쿨타임 감소 상한 +10%, 마나 소모 +20%", [["cdrCap", 0.6], ["manaCostRed", -0.2]]],
  ["b_kheal", "boots", 1, "처치 시 체력 2% 회복", [["killHeal", 0.02]]],
  ["b_kmana", "boots", 2, "처치 시 마나 +8", [["manaOnKill", 8]]],
  ["b_mregen", "boots", 2, "마나 재생 +100%, 초당 체력 회복 -50%", [["manaRegenPct", 1], ["regenPct", -0.5]]],
  ["b_kheal1", "boots", 2, "처치 시 체력 +1%, 쿨타임 감소 -3%", [["killHeal", 0.01], ["cdr", -0.03]]],
  ["b_trash", "boots", 3, "쿨타임 감소 +10%, 마나 소모 +60%", [["cdr", 0.1], ["manaCostRed", -0.6]]],
  ["r_elite", "ring", 1, "정예 추가 피해 +50%, 일반 추가 피해 -20%", [["elite", 0.5], ["normal", -0.2]]],
  ["r_summon", "ring", 1, "소환 스킬 피해 +50%", [["summonDmg", 0.5]]],
  ["r_dur", "ring", 1, "스킬 지속시간 +25%", [["skillDur", 0.25]]],
  ["r_dens", "ring", 1, "칸당 몹 수 +1, 받는 피해 +10%", [["density", 1], ["dmgTaken", 0.1]]],
  ["r_gold", "ring", 2, "골드 획득 +60%, 주는 피해 -10%", [["goldFind", 0.6], ["allDmg", -0.1]]],
  ["r_mana", "ring", 2, "최대 마나 +30%, 마나 재생 -30%", [["manaPct", 0.3], ["manaRegenPct", -0.3]]],
  ["r_mcost", "ring", 2, "스킬 마나 소모 -15%", [["manaCostRed", 0.15]]],
  ["r_trash", "ring", 3, "생명력 흡수 +3%, 최대 체력 -35%", [["lifesteal", 0.03], ["hpMore", 0.65]]],
  ["n_dpm", "neck", 1, "최대 마나 100당 피해 +1%", [["dpm", 0.01]]],
  ["n_boss", "neck", 1, "보스 추가 피해 +40%, 일반 추가 피해 -30%", [["boss", 0.4], ["normal", -0.3]]],
  ["n_aoe", "neck", 2, "광역 피해 +25%", [["aoeDmg", 0.25]]],
  ["n_manahit", "neck", 2, "마나 흡수 +0.1%", [["manaHit", 0.001]]],
  ["n_dens", "neck", 3, "칸당 몹 수 -1, 주는 피해 +10%", [["density", -1], ["allDmg", 0.1]]],
  ["n_bosstrap", "neck", 3, "보스 추가 피해 +60%, 보스에게 받는 피해 +60%", [["boss", 0.6], ["bossTaken", -0.6]]],
  ["n_normal", "neck", 3, "일반 추가 피해 +50%, 보스 추가 피해 -50%", [["normal", 0.5], ["boss", -0.5]]],
  ["n_exp", "neck", 4, "경험치 획득 +100%", [["expFind", 1]]],
  ["w_proc", "weapon", 0, "적중 시 8% 확률로 쿨타임 · 마나를 무시하고 장착한 스킬 하나 추가 발동", [["f:proc", 1]]],
  ["w_fire", "weapon", 1, "8초 주기 중 5초간 물리 스킬 피해 +40% (화염 변환)", [["f:fire", 1]]],
  ["w_elite", "weapon", 1, "정예 · 보스 처치 시 5초간 주는 피해 +25%", [["f:elite", 1]]],
  ["w_spread", "weapon", 2, "중독된 적을 처치하면 가까운 적 2마리에게 중독 전파", [["f:spread", 1]]],
  ["w_manafull", "weapon", 2, "마나가 가득 찼을 때 주는 피해 +30%, 아니면 -10%", [["f:manafull", 1]]],
  ["w_first", "weapon", 2, "첫 번째 칸 스킬 피해 +40%, 나머지 -10%", [["f:first", 1]]],
  ["w_empty", "weapon", 3, "빈 스킬 칸 하나당 주는 피해 +25%", [["f:empty", 1]]],
  ["w_thunder", "weapon", 4, "적중 시 12% 확률로 장착한 번개 스킬 하나를 마나 없이 발동", [["f:thunder", 1]]],
  ["h_ign", "helm", 2, "점화된 적 처치 시 체력 3% 회복, 점화 지속시간 -30%", [["f:ignheal", 1], ["dotDur", -0.3]]],
  ["h_mkill", "helm", 1, "처치 시 마나 +4% 회복", [["f:mkill", 1]]],
  ["h_lowdef", "helm", 3, "체력 30% 이하일 때 방어력 +300%", [["f:lowdef", 1]]],
  ["h_heal", "helm", 4, "회복 효과 +50%", [["f:healamp", 1]]],
  ["a_dodgedef", "armor", 1, "회피 상한 +20%, 회피 확률의 50%만큼 방어력 증가", [["dodgeCap", 0.7], ["f:dodgedef", 1]]],
  ["a_counter", "armor", 1, "피격 시 8% 확률로 방어력의 300% 반격", [["f:counter", 1]]],
  ["a_stack", "armor", 1, "피격 시 주는 피해 +1%씩 중첩 (5초, 최대 20)", [["f:stack", 1]]],
  ["a_mana0", "armor", 4, "마나가 0일 때 방어력 +200%", [["f:mana0", 1]]],
  ["g_leech", "gloves", 1, "중독 · 출혈이 걸린 적을 공격하면 피해의 4%를 생명력으로 회복", [["f:leech", 1]]],
  ["g_critstack", "gloves", 1, "치명타 시 5초간 치명타 피해 +10%씩 중첩 (최대 6)", [["f:critstack", 1]]],
  ["g_lowhp", "gloves", 3, "체력 40% 이하일 때 주는 피해 +150%, 그 이상은 -60%", [["f:lowhp", 1]]],
  ["g_normal", "gloves", 4, "일반 등급 스킬만 장착했을 때 주는 피해 +100%", [["f:normalonly", 1]]],
  ["g_noelem", "gloves", 0, "원소 피해를 줄 수 없는 대신 공격력 +30%(more), 방어 무시 +15%", [["atkMore", 1.3], ["ignoreDef", 0.15], ["f:noelem", 1]]],
  ["b_shadow", "boots", 0, "6초마다 가장 앞 적에게 보이지 않는 일격(공격력 800%), 회피 상한 +20%", [["dodgeCap", 0.7], ["f:shadow", 1]]],
  ["b_dodgeamp", "boots", 1, "회피 시 다음 스킬 피해 +30%", [["f:dodgeamp", 1]]],
  ["b_start", "boots", 2, "전투 시작 후 3초간 주는 피해 +60%", [["f:start", 1]]],
  ["b_ready", "boots", 4, "모든 스킬이 쿨타임 중이 아닐 때 주는 피해 +50%", [["f:ready", 1]]],
  ["b_vault", "boots", 4, "황금 보물고에서만 주는 피해 +100%", [["f:vault", 1]]],
  ["r_conv", "ring", 2, "마법 피해 -10%, 중독 확률 +10%, 중독 효과 +25%(more)", [["magMore", 0.9], ["poisonChance", 0.1], ["poisonMore", 1.25]]],
  ["n_lanes", "neck", 1, "적이 있는 레인 하나당 주는 피해 +5% (최대 4레인)", [["f:lanes", 1]]],
];
const SAT_BY_ID = {}; for (const d of SAT_DEFS) SAT_BY_ID[d[0]] = { id: d[0], slot: d[1], g: d[2], txt: d[3], fx: d[4] };
const SAT_GRADE = [["매우 좋음", "#ffd24a"], ["좋음", "#8dff9a"], ["애매", "#9ad8ff"], ["쓰레기", "#b0a0a0"], ["쓸모없음", "#807070"]];
const SAT_W = [5, 17, 38, 25, 15];
const SAT_COLOR = "#ff5a4a";
function rollSatan(slot) {
  const pool = SAT_DEFS.filter((d) => d[1] === slot).map((d) => SAT_BY_ID[d[0]]); if (!pool.length) return null;
  const gs = [0, 1, 2, 3, 4].filter((g) => pool.some((p) => p.g === g)), tot = gs.reduce((a, g) => a + SAT_W[g], 0);
  let r = Math.random() * tot, g = gs[gs.length - 1]; for (const x of gs) { r -= SAT_W[x]; if (r <= 0) { g = x; break; } }
  const c = pool.filter((p) => p.g === g); return c[Math.floor(Math.random() * c.length)].id;
}
function satApply(id, apply, s) {
  const d = SAT_BY_ID[id]; if (!d) return;
  for (const [k, v] of d.fx) {
    if (k.startsWith("f:")) { s.sat[k.slice(2)] = v; continue; }
    if (k === "manaRegenPct") apply("manaRegen", v * CFG.MANA_REGEN); else if (k === "regenPct") apply("regen", v * CFG.REGEN);
    else if (k === "dpm") apply("dmgPerMana", v / CFG.DPM_K); else apply(k, v);
  }
}
const satLine = (it) => (it && it.sat && SAT_BY_ID[it.sat] ? SAT_BY_ID[it.sat] : null);
const satHtml = (it) => { const d = satLine(it); return d ? `<div class="aff sat" style="color:${SAT_COLOR}">✦ ${d.txt}</div>` : ""; };
function genSatan(sv, ilvl, slot) {
  slot = slot || pick(SLOTS); const it = genItem(sv, ilvl, 3, slot); const id = rollSatan(slot); if (id) it.sat = id; return it;
}

// ---- 전투 훅 (코드형 줄) ----
function satInit(b) {
  b._si = 1; const sk = b.skills || [], act = sk.filter((x) => x && x.slot === "active" && x.dtype !== "buff" && x.dtype !== "heal");
  b.satEmpty = sk.filter((x) => !x).length; b.satNormal = act.length > 0 && act.every((x) => !x.rarity);
}
const satFront = (b) => b.enemies.filter((e) => !e.dead).sort((a, c) => a.col - c.col)[0];
function satMult(b, e, sk) {
  const S = b.stats.sat; let m = 1; if (!S) return m;
  if (S.noelem && sk.elem) return 0;
  if (S.manafull) m *= b.mana >= b.maxMana * 0.99 ? 1.3 : 0.9;
  if (S.first) m *= sk.idx === 0 ? 1.4 : 0.9;
  if (S.empty) m *= 1 + 0.25 * (b.satEmpty || 0);
  if (S.fire && sk.dtype !== "mag" && b.time % 8 >= 3) m *= 1.4;
  if (S.elite && b.time < (b.sEliteT || 0)) m *= 1.25;
  if (S.lowhp) m *= b.hp <= b.maxHp * 0.4 ? 2.5 : 0.4;
  if (S.normalonly && b.satNormal) m *= 2;
  if (S.start && b.time < 3) m *= 1.6;
  if (S.ready && b.skills.every((x) => !x || x.cdLeft <= 0)) m *= 1.5;
  if (S.vault && b.kind === "vault") m *= 2;
  if (S.lanes) m *= 1 + 0.05 * new Set(b.enemies.filter((x) => !x.dead).map((x) => x.lane)).size;
  if (S.stack && b.time < (b.hurtT2 || 0)) m *= 1 + 0.01 * (b.hurtStack || 0);
  if (S.dodgeamp && b.dodgeBoost) m *= 1.3;
  return m;
}
function satCrit(b) {
  const S = b.stats.sat; if (!S || !S.critstack) return 0;
  if (b.time > (b.csT || 0)) b.cs = 0; const v = 0.1 * (b.cs || 0); b.cs = Math.min(6, (b.cs || 0) + 1); b.csT = b.time + 5; return v;
}
function satOnHit(b, e, sk, dealt) {
  const S = b.stats.sat; if (!S) return;
  b.dodgeBoost = 0;
  if (S.leech && e.dots && e.dots.some((d) => d.k === "poison" || d.k === "bleed")) { const want = Math.min(dealt * 0.04, b.lsTok), h0 = b.hp; b.hp = Math.min(b.maxHp, b.hp + want); b.lsTok -= want; b.healLS = (b.healLS || 0) + (b.hp - h0); }
  if ((S.proc || S.thunder) && !b._inProc && b.time >= (b.procT || 0)) {
    const act = b.skills.filter((x) => x && x.slot === "active" && x.dtype !== "buff" && x.dtype !== "heal" && x !== sk);
    const roll = (ch, pool) => { if (pool.length && Math.random() < ch) { b._inProc = 1; b.procT = b.time + 0.4; try { castSkillRaw(b, pool[Math.floor(Math.random() * pool.length)]); } finally { b._inProc = 0; } return true; } return false; };
    if (!(S.proc && roll(0.08, act)) && S.thunder) roll(0.12, act.filter((x) => x.elem === "light"));
  }
}
function satOnKill(b, e) {
  const S = b.stats.sat; if (!S) return;
  if (S.elite && (e.tier === "elite" || e.tier === "boss")) b.sEliteT = b.time + 5;
  if (S.mkill) b.mana = Math.min(b.maxMana, b.mana + b.maxMana * 0.04);
  const dots = e.dots || [];
  if (S.ignheal && dots.some((d) => d.k === "ignite")) healPlayer(b, b.maxHp * 0.03);
  if (S.spread) { const pd = dots.find((d) => d.k === "poison"); if (pd) for (const x of b.enemies.filter((y) => !y.dead && y !== e).sort((a, c) => Math.abs(a.col - e.col) - Math.abs(c.col - e.col)).slice(0, 2)) x.dots.push({ k: "poison", dps: pd.dps, t: Math.max(2, pd.t) }); }
}
function satOnHurt(b) {
  const S = b.stats.sat; if (!S) return;
  if (S.stack) { b.hurtStack = b.time < (b.hurtT2 || 0) ? Math.min(20, (b.hurtStack || 0) + 1) : 1; b.hurtT2 = b.time + 5; }
  if (S.counter && Math.random() < 0.08) { const f = satFront(b); if (f) applyDamage(b, f, b.stats.def * 3, { src: "counter", color: "#ffb060" }); }
}
function satTick(b, dt) {
  if (!b._si) satInit(b);
  const S = b.stats.sat; if (!S) return;
  if (S.shadow) { b.shT = (b.shT || 0) + dt; if (b.shT >= 6) { const f = satFront(b); if (f) { b.shT = 0; applyDamage(b, f, b.stats.atk * CFG.PHYS_BASE * 8, { src: "shadow", color: "#b0a0ff" }); } else b.shT = 5.9; } }
}
const satDefMul = (b) => { const S = b.stats.sat; if (!S) return 1; let m = 1; if (S.lowdef && b.hp <= b.maxHp * 0.3) m *= 4; if (S.mana0 && b.mana <= 0) m *= 3; return m; };
const rarName = (it) => (it.sat ? "사탄" : ITEM_RARITY[Math.min(3, it.rarity)].name);
