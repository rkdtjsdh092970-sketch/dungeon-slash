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
    if (k === "manaRegenPct") apply("manaRegen", v * CFG.MANA_REGEN); else if (k === "regenPct") apply("regen", v * CFG.REGEN);
    else if (k === "dpm") apply("dmgPerMana", v / CFG.DPM_K); else apply(k, v);
  }
}
const satLine = (it) => (it && it.sat && SAT_BY_ID[it.sat] ? SAT_BY_ID[it.sat] : null);
const satHtml = (it) => { const d = satLine(it); return d ? `<div class="aff sat" style="color:${SAT_COLOR}">✦ ${d.txt} <small style="color:${SAT_GRADE[d.g][1]}">(${SAT_GRADE[d.g][0]})</small></div>` : ""; };
function genSatan(sv, ilvl, slot) {
  slot = slot || pick(SLOTS); const it = genItem(sv, ilvl, 3, slot); const id = rollSatan(slot); if (id) it.sat = id; return it;
}
