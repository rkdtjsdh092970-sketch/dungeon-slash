// =========================================================
// 전투 계산 · 마나 · 옵션 풀 · 고유 장비(등급/출처) 데이터
// =========================================================
// ---- 계산식 상수 (한곳에서 조정) ----
Object.assign(CFG, {
  MAG_BASE: 0.95, PHYS_BASE: 1.22,          // 마법 스킬 기본 배율 (마법은 치명타가 기본으로 터지지 않는 대신 높게 시작)
  DEF_C: 8,                // 방어 감소율 = X / (X + DEF_C),  X = 몬스터 방어 계수 × 액트/단계 보정
  DEF_ACT: 0.18,           // 액트마다 방어/저항 계수 +18%
  DEF_TIER: 0.03,          // 균열류 단계마다 +3%
  DEF_CAP: 0.80,           // 방어/저항 피해 감소 최대
  RES_CAP: 0.80,           // 속성 저항 상한(관통으로 낮출 수 있음), 하한 -0.5
  BASE_MANA: 100, MANA_LV: 0.02, MANA_REGEN: 0.08,   // 마나 풀 (레벨 보정), 초당 재생(최대치 비율)
  MF_HALF: 6,              // MF 체감: 유효 MF = mf / (1 + mf / MF_HALF)  → 최대 약 MF_HALF
  MF_TOWER_STEP: 0.012, MF_TOWER_20: 0.15,   // 균열 탑: 층당 MF, 20층마다 추가
  QTY_MF: 0.0,             // MF는 드랍 '수량'에 기여하지 않는다 (등급/고유 확률에만)
  UNIQ_MF_EXP: 0.6,        // 고유 확률의 MF 지수
});

// 몬스터 방어 / 마법저항 계수 [물리, 마법]
const ENEMY_DEF = { imp: [0.15, 0.15], grunt: [0.8, 0.3], archer: [0.3, 0.6], mage: [0.3, 1.0], brute: [1.4, 0.8], spec: [0.9, 0.7], warp: [0.5, 2.0], boss: [1.6, 1.6] };
const TRAIT_DEF = { tank: [1.0, 0.5], regen: [0.3, 0.3], fast: [-0.3, -0.2] };
// 지역별 속성 저항 [화염, 냉기, 번개, 공허]
const ACT_ELEM = [[0, 0, 0, 0], [-0.1, 0.1, 0, 0], [0.1, 0, 0.3, 0], [0.4, -0.3, 0, 0], [-0.2, 0, 0.3, 0.1], [-0.3, 0.5, 0, 0], [0.6, -0.4, 0.1, 0], [0, 0, 0, 0.5], [0, 0.1, 0.5, -0.2], [0.5, 0, 0, 0.2]];
const ELEMS = ["fire", "cold", "light", "void"], ELEM_NAME = { fire: "화염", cold: "냉기", light: "번개", void: "공허" }, ELEM_COLOR = { fire: "#ff8a40", cold: "#8ae0ff", light: "#ffe45a", void: "#c070ff" };

// ---- 스킬 분류: 물리/마법, 속성, 마나 소모 ----
const SKILL_META = {
  strike: { dtype: "phys", mana: 0 }, rapid: { dtype: "phys", mana: 0 }, crush: { dtype: "phys", mana: 0 }, spark: { dtype: "mag", elem: "light", mana: 0 },
  smash: { dtype: "phys", mana: 10 }, bomb: { dtype: "mag", elem: "fire", mana: 14 }, lance: { dtype: "phys", mana: 12 }, chain: { dtype: "mag", elem: "light", mana: 15 },
  snipe: { dtype: "phys", mana: 12 }, firewall: { dtype: "mag", elem: "fire", mana: 20 }, sweep: { dtype: "phys", mana: 13 }, cry: { dtype: "buff", mana: 16 },
  execute: { dtype: "phys", mana: 18 }, frost: { dtype: "mag", elem: "cold", mana: 18 }, vamp: { dtype: "phys", mana: 13 }, heal: { dtype: "heal", mana: 20 },
  thunder: { dtype: "mag", elem: "light", mana: 20 }, boomer: { dtype: "phys", mana: 14 }, pierce2: { dtype: "phys", mana: 17 }, meteor: { dtype: "mag", elem: "fire", mana: 28 },
};
SKILLS.forEach((s) => Object.assign(s, SKILL_META[s.id] || { dtype: "phys", mana: 10 }));

// ---- 장비 옵션 (부위별 풀 · 아이템 레벨 해금 · 수치 단계) ----
// slots: 나올 수 있는 부위 / minIlvl: 이 레벨 미만 장비에서는 나오지 않음 / minRarity: 희귀도 제한 / gp: 고정값 성장 지수
const W6 = ["weapon", "helm", "armor", "gloves", "boots", "ring", "neck"], ATKS = ["weapon", "gloves", "neck"], DEFS = ["helm", "armor", "boots"];
AFFIXES.length = 0;
AFFIXES.push(
  // 공격 (무기/장갑/목걸이)
  { k: "atkFlat", name: "공격력", flat: true, range: [2, 4], w: 10, slots: ATKS },
  { k: "magFlat", name: "주문력", flat: true, range: [2, 4], w: 10, slots: ATKS },
  { k: "atkPct", name: "공격력 %", pct: true, range: [0.06, 0.12], w: 9, slots: ATKS },
  { k: "magPct", name: "주문력 %", pct: true, range: [0.06, 0.12], w: 9, slots: ATKS },
  { k: "physDmg", name: "물리 피해 %", pct: true, range: [0.06, 0.14], w: 7, slots: ATKS, minIlvl: 2 },
  { k: "magDmg", name: "마법 피해 %", pct: true, range: [0.06, 0.14], w: 7, slots: ATKS, minIlvl: 2 },
  { k: "critChance", name: "물리 치명타 확률", pct: true, range: [0.02, 0.05], w: 6, slots: ["weapon", "gloves", "ring"] },
  { k: "critDmg", name: "치명타 피해", pct: true, range: [0.10, 0.25], w: 6, slots: ATKS },
  { k: "spellCrit", name: "주문 치명타 확률", pct: true, range: [0.02, 0.05], w: 5, slots: ["weapon", "gloves", "ring"], minIlvl: 3 },
  { k: "boss", name: "보스 추가 피해", pct: true, range: [0.12, 0.30], w: 6, slots: ATKS },
  { k: "elite", name: "정예 추가 피해", pct: true, range: [0.12, 0.30], w: 6, slots: ATKS },
  { k: "ranged", name: "원거리 추가 피해", pct: true, range: [0.12, 0.30], w: 5, slots: ATKS },
  { k: "normal", name: "일반 추가 피해", pct: true, range: [0.08, 0.20], w: 6, slots: ATKS },
  { k: "fireDmg", name: "화염 피해 %", pct: true, range: [0.08, 0.18], w: 5, slots: ["weapon", "gloves", "ring", "neck"], minIlvl: 2 },
  { k: "coldDmg", name: "냉기 피해 %", pct: true, range: [0.08, 0.18], w: 5, slots: ["weapon", "gloves", "ring", "neck"], minIlvl: 2 },
  { k: "lightDmg", name: "번개 피해 %", pct: true, range: [0.08, 0.18], w: 5, slots: ["weapon", "gloves", "ring", "neck"], minIlvl: 2 },
  { k: "voidDmg", name: "공허 피해 %", pct: true, range: [0.08, 0.18], w: 4, slots: ["weapon", "gloves", "ring", "neck"], minIlvl: 5 },
  { k: "elemDmg", name: "원소 피해 %", pct: true, range: [0.05, 0.10], w: 4, slots: ["ring", "neck"], minIlvl: 3 },
  { k: "allDmg", name: "주는 피해 %", pct: true, range: [0.04, 0.08], w: 3, slots: ["ring", "neck"], minIlvl: 4, minRarity: 2 },
  { k: "cdr", name: "쿨타임 감소", pct: true, range: [0.03, 0.06], w: 6, slots: ["weapon", "gloves", "boots", "ring", "neck"] },
  { k: "lifesteal", name: "생명력 흡수", pct: true, range: [0.01, 0.02], w: 3, slots: ["weapon", "gloves", "ring"], minRarity: 2, minIlvl: 2 },
  // 방어 관통 / 약화 (후반 해금)
  { k: "shredDef", name: "대상 방어력 감소", pct: true, range: [0.04, 0.08], w: 3.5, slots: ["weapon", "gloves"], minIlvl: 3 },
  { k: "shredRes", name: "대상 마법저항 감소", pct: true, range: [0.04, 0.08], w: 3.5, slots: ["weapon", "gloves"], minIlvl: 3 },
  { k: "ignoreDef", name: "방어 무시", pct: true, range: [0.04, 0.08], w: 3, slots: ATKS, minIlvl: 6, minRarity: 2 },
  { k: "ignoreRes", name: "마법저항 무시", pct: true, range: [0.04, 0.08], w: 3, slots: ATKS, minIlvl: 6, minRarity: 2 },
  { k: "penElem", name: "속성 저항 관통", pct: true, range: [0.04, 0.08], w: 2.5, slots: ["weapon", "ring", "neck"], minIlvl: 7, minRarity: 2 },
  // 마나
  { k: "manaCostRed", name: "마나 소모 감소", pct: true, range: [0.03, 0.06], w: 4, slots: ["weapon", "ring", "neck"], minIlvl: 2 },
  { k: "manaFlat", name: "마나", flat: true, gp: 0.55, range: [8, 16], w: 8, slots: ["helm", "armor", "ring", "neck"] },
  { k: "manaPct", name: "마나 %", pct: true, range: [0.06, 0.12], w: 7, slots: ["helm", "armor", "neck"] },
  { k: "manaRegen", name: "마나 재생", pct: true, range: [0.004, 0.008], w: 5, slots: ["helm", "armor", "ring"], minIlvl: 2, unit: "/s" },
  { k: "manaRegenFlat", name: "초당 마나 재생(고정)", flat: true, gp: 0.5, range: [1.2, 2.4], w: 5, slots: ["helm", "armor", "ring", "neck"], minIlvl: 2 },
  { k: "manaOnKill", name: "처치 시 마나 회복", flat: true, gp: 0.5, range: [0.6, 1.4], w: 3, slots: ["ring", "neck", "weapon"], minIlvl: 3 },
  { k: "dmgPerMana", name: "최대 마나 100당 피해", pct: true, range: [0.003, 0.006], w: 2.5, slots: ["ring", "neck"], minIlvl: 5, minRarity: 2 },
  // 상태이상 (출혈·중독·점화)
  { k: "bleedChance", name: "출혈 확률", pct: true, range: [0.05, 0.10], w: 4, slots: ["weapon", "gloves", "ring"], minIlvl: 2 },
  { k: "poisonChance", name: "중독 확률", pct: true, range: [0.05, 0.10], w: 4, slots: ["weapon", "gloves", "ring"], minIlvl: 2 },
  { k: "igniteChance", name: "점화 확률", pct: true, range: [0.05, 0.10], w: 4, slots: ["weapon", "gloves", "ring"], minIlvl: 2 },
  { k: "dotDmg", name: "지속 피해 %", pct: true, range: [0.08, 0.18], w: 4, slots: ["weapon", "gloves", "neck"], minIlvl: 3 },
  // 방어 (투구/갑옷)
  { k: "hpFlat", name: "체력", flat: true, range: [15, 30], w: 10, slots: DEFS },
  { k: "hpPct", name: "체력 %", pct: true, range: [0.06, 0.12], w: 9, slots: DEFS },
  { k: "defFlat", name: "방어력", flat: true, range: [2, 4], w: 9, slots: DEFS },
  { k: "defPct", name: "방어력 %", pct: true, range: [0.06, 0.12], w: 8, slots: DEFS },
  { k: "dodge", name: "회피", pct: true, range: [0.02, 0.04], w: 6, slots: DEFS },
  { k: "regen", name: "초당 체력 회복", pct: true, range: [0.001, 0.003], w: 3, slots: DEFS, minIlvl: 4, unit: "/s" },
  { k: "dmgTaken", name: "받는 피해", pct: true, neg: true, range: [-0.06, -0.03], w: 3, slots: DEFS, minIlvl: 5, minRarity: 2 },
  // 유틸 (장신구)
  { k: "goldFind", name: "골드 획득", pct: true, range: [0.08, 0.20], w: 4, slots: ["boots", "ring", "neck"] },
  { k: "expFind", name: "경험치 획득", pct: true, range: [0.05, 0.12], w: 3, slots: ["boots", "ring", "neck"] },
  { k: "mf", name: "매직 파운드", pct: true, range: [0.03, 0.07], w: 2.5, slots: ["boots", "ring", "neck"], minIlvl: 2, minRarity: 2 },
  { k: "chainJumps", name: "번개 도약 +", count: true, range: [1, 1], w: 2.2, slots: ["ring", "neck", "weapon"], minRarity: 2, minIlvl: 3 },
  { k: "density", name: "칸당 몹 수 +", count: true, range: [1, 1], w: 1.8, slots: ["ring", "neck"], minRarity: 2, minIlvl: 3 },
  { k: "lanes", name: "레인 확장 +", count: true, range: [1, 1], w: 0, slots: [] },   // 구버전 세이브 호환용 (새로 나오지 않음)
);
// 장비 기본 능력치: 무기·장갑·목걸이는 공격력(물리)과 주문력(마법)을 함께 가진다
SLOT_BASE.boots = { hp: 22, def: 2 }; SLOT_BASE.weapon = { atk: 6, mag: 6 }; SLOT_BASE.gloves = { atk: 2, mag: 2, def: 1.5 }; SLOT_BASE.neck = { atk: 1.5, mag: 1.5 };
// 세트: 레인 보너스 제거
SETS.find((s) => s.id === "abyss").bonus[6] = { allDmg: 0.4, elemDmg: 0.3 };
SETS.find((s) => s.id === "abyss").text[6] = "모든 피해 +40%, 원소 피해 +30%";

// ---- 고유 장비 등급 ----
const U_TIERS = [
  null,
  { id: 1, name: "미스틱", color: "#8ec5ff", w: 60, mult: 1.0 },
  { id: 2, name: "이터널", color: "#c58bff", w: 28, mult: 1.2 },
  { id: 3, name: "소버린", color: "#ffcc4a", w: 10, mult: 1.5 },
  { id: 4, name: "엔젤릭", color: "#ffffff", w: 2, mult: 2.0 },
];
// 출처 풀: common(공용: 어디서나) / hell(지옥 스테이지) / tower(균열 탑) / endless(무한 균열) / void(공허의 군주)
const U_POOLS = { common: "공용", hell: "지옥", tower: "균열 탑", endless: "무한 균열", void: "공허의 군주" };
// mods: [키, 값 또는 [최소,최대]]   act: 이 액트 이상에서 드랍(공용)
const U = (id, name, slot, tier, pool, act, mods, flavor, text) => ({ id, name, slot, tier, pool, act, mods, flavor, text: text || null, w: 1 });
const UNIQUES = [
  // ===== 공용 · 미스틱 =====
  U("ironwall", "철벽의 갑주", "armor", 1, "common", 3, [["defPct", [1.4, 1.8]], ["hpPct", [0.15, 0.2]], ["noDodge", 1]], "맞아도 아프지 않다면 피할 필요가 없다."),
  U("glasscannon", "유리 대포", "weapon", 1, "common", 2, [["atkMore", [1.8, 2.1]], ["magMore", [1.8, 2.1]], ["hpMore", 0.5]], "한 방이면 끝난다. 둘 다."),
  U("fang", "흡혈귀의 송곳니", "weapon", 1, "common", 3, [["lifesteal", [0.11, 0.14]], ["dmgTaken", 0.25]], "피로 피를 씻는다."),
  U("greedring", "탐욕의 반지", "ring", 1, "common", 1, [["mf", [0.7, 0.9]], ["goldFind", [0.5, 0.7]], ["atkPct", -0.15], ["magPct", -0.15]], "더, 더, 더."),
  U("luckycharm", "행운아의 부적", "neck", 1, "common", 2, [["mf", [1.3, 1.7]], ["hpPct", -0.2]], "운이 좋은 자는 죽지 않는다. 대개는."),
  U("goldhand", "황금손 장갑", "gloves", 1, "common", 2, [["goldFind", [0.9, 1.1]], ["mf", [0.35, 0.45]], ["atkMore", 0.8], ["magMore", 0.8]], "손대는 곳마다 금이 된다. 칼도 포함해서."),
  U("harvest", "수확자의 부적", "neck", 1, "common", 3, [["expFind", [0.7, 0.9]], ["goldFind", [0.4, 0.6]], ["mf", [0.3, 0.5]]], "거두는 자가 부유하다."),
  U("warlord", "군주의 투구", "helm", 1, "common", 4, [["density", 2], ["normal", [0.2, 0.3]], ["defMore", 0.7]], "더 많이 모일수록 더 많이 벤다."),
  U("manaspring", "마나 샘의 목걸이", "neck", 1, "common", 2, [["manaPct", [0.5, 0.7]], ["manaRegen", [0.025, 0.035]], ["hpPct", -0.1]], "마르지 않는 샘은 없다. 아직은."),
  U("apprentice", "견습 마법사의 반지", "ring", 1, "common", 1, [["manaToSpell", [0.08, 0.12]], ["manaPct", 0.2], ["hpPct", -0.1]], "마나가 곧 힘이라고 배웠다."),
  // ===== 공용 · 이터널 =====
  U("immortal", "불멸의 심장", "armor", 2, "common", 3, [["hpPct", [0.5, 0.7]], ["regen", [0.01, 0.014]], ["revive", 1]], "두 번째 심장이 뛰기 시작한다."),
  U("phoenix", "불사조의 깃털", "helm", 2, "common", 5, [["revive", 1], ["hpPct", [0.25, 0.35]], ["lifesteal", 0.03]], "재에서 일어서라."),
  U("stormeye", "폭풍의 눈", "neck", 2, "common", 4, [["chainJumps", 4], ["chainDmg", [0.7, 0.9]], ["hpPct", -0.1]], "번개는 두 번 떨어지지 않는다. 네 번은 떨어진다."),
  U("timering", "시간의 반지", "ring", 2, "common", 5, [["cdr", [0.28, 0.32]], ["cdrCap", 0.7], ["dmgTaken", 0.1]], "초침이 달아난다."),
  U("bladestorm", "칼날 폭풍 장갑", "gloves", 2, "common", 4, [["cdr", [0.18, 0.22]], ["atkPct", [0.22, 0.28]], ["magPct", [0.22, 0.28]], ["hpMore", 0.7]], "손이 보이지 않는다."),
  U("reaper", "수확자의 낫", "weapon", 2, "common", 5, [["boss", [1.4, 1.8]], ["elite", [0.5, 0.7]], ["normal", -0.3]], "큰 것만 벤다."),
  U("manaheart", "마력의 중심", "helm", 2, "common", 4, [["manaToSpell", [0.22, 0.28]], ["manaPct", [0.28, 0.34]], ["manaRegen", [0.015, 0.02]]], "머리 위에서 마나가 소용돌이친다."),
  U("sharpmind", "예리한 정신", "ring", 2, "common", 5, [["spellCrit", [0.2, 0.25]], ["critDmg", [0.3, 0.4]], ["manaCostRed", 0.1]], "생각의 속도로 급소를 찌른다."),
  // ===== 공용 · 소버린 =====
  U("ghostdance", "유령의 춤", "armor", 3, "common", 4, [["hpMore", 0.2], ["dodge", 0.95], ["dodgeCap", 0.95]], "죽은 자는 맞지 않는다."),
  U("dragonhelm", "용기사의 투구", "helm", 3, "common", 6, [["allDmg", [0.28, 0.34]], ["aoeDmg", [0.45, 0.55]], ["hpMore", 0.8]], "용은 홀로 싸우지 않는다. 모든 것을 불태운다."),
  U("voidgrip", "공허를 쥔 손", "gloves", 3, "common", 7, [["critChance", [0.22, 0.28]], ["critDmg", [1.1, 1.3]], ["defMore", 0]], "쥐는 순간 모든 방패가 사라진다."),
  U("tome", "점멸하는 마도서", "weapon", 3, "common", 6, [["magCrit", 1], ["spellCrit", 0.1], ["magPct", [0.25, 0.3]], ["manaCostRed", 0.12]], "마법도 급소를 노린다. 계속해서."),
  // ===== 공용 · 엔젤릭 =====
  U("halo", "대천사의 후광", "helm", 4, "common", 8, [["allDmg", [0.35, 0.4]], ["cdr", 0.1], ["revive", 1], ["hpPct", 0.5], ["manaRegen", 0.03], ["lifesteal", 0.03]], "빛이 내려앉는다."),
  U("judgment", "신의 심판", "weapon", 4, "common", 8, [["atkMore", [1.45, 1.55]], ["magMore", [1.45, 1.55]], ["ignoreDef", 0.3], ["ignoreRes", 0.3], ["critDmg", 0.6], ["magCrit", 1]], "판결은 한 번이면 충분하다."),
  // ===== 지옥 스테이지 전용 =====
  U("hellplate", "불지옥의 갑주", "armor", 1, "hell", 1, [["hpPct", [0.25, 0.3]], ["fireDmg", [0.2, 0.28]]], "아직 식지 않았다."),
  U("cinder", "재의 손길", "gloves", 1, "hell", 1, [["fireDmg", [0.4, 0.5]], ["penElem", 0.15], ["hpPct", -0.1]], "닿은 것은 모두 재가 된다."),
  U("emberband", "불씨의 반지", "ring", 2, "hell", 1, [["fireDmg", [0.45, 0.55]], ["magPct", [0.15, 0.2]], ["manaRegen", 0.015]], "꺼지지 않는 불씨."),
  U("hellhound", "지옥견의 송곳니", "weapon", 2, "hell", 1, [["atkPct", [0.3, 0.4]], ["critChance", [0.1, 0.14]], ["lifesteal", 0.05]], "사냥감의 냄새를 놓치지 않는다."),
  U("brandhelm", "낙인의 투구", "helm", 2, "hell", 1, [["shredDef", [0.2, 0.25]], ["shredRes", [0.2, 0.25]], ["boss", 0.25]], "낙인이 찍힌 자는 약해진다."),
  U("infernoheart", "연옥의 심장", "neck", 3, "hell", 1, [["fireDmg", [0.8, 1.0]], ["penElem", 0.3], ["magCrit", 1], ["spellCrit", 0.1]], "심장이 타오를수록 마법도 날카로워진다."),
  U("hellcrown", "지옥 군주의 왕관", "helm", 4, "hell", 1, [["allDmg", [0.4, 0.45]], ["ignoreDef", 0.25], ["ignoreRes", 0.25], ["fireDmg", 0.6], ["hpMore", 1.6]], "지옥도 그 앞에선 무릎을 꿇는다."),
  // ===== 균열 탑 전용 =====
  U("riftshard", "균열 파편의 목걸이", "neck", 1, "tower", 1, [["mf", [0.6, 0.8]], ["voidDmg", [0.3, 0.4]], ["hpPct", -0.1]], "조각마다 다른 세계가 비친다."),
  U("riftwalker", "균열 도보자의 장화", "gloves", 1, "tower", 1, [["cdr", [0.12, 0.16]], ["dodge", [0.1, 0.14]], ["allDmg", 0.1]], "한 발은 이곳, 한 발은 저곳."),
  U("towerseal", "탑의 인장", "ring", 2, "tower", 1, [["mf", [0.9, 1.1]], ["boss", [0.3, 0.4]], ["elite", [0.3, 0.4]]], "오를수록 눈이 밝아진다."),
  U("voidlens", "공허의 렌즈", "helm", 2, "tower", 1, [["voidDmg", [0.5, 0.6]], ["penElem", 0.2], ["manaToSpell", 0.18], ["manaPct", 0.25]], "공허를 들여다보는 눈."),
  U("stormcaller", "폭풍을 부르는 자", "weapon", 2, "tower", 1, [["lightDmg", [0.5, 0.6]], ["chainJumps", 3], ["chainDmg", 0.5], ["magPct", 0.2]], "구름이 먼저 알아챈다."),
  U("riftmantle", "균열의 외투", "armor", 3, "tower", 1, [["hpMore", [1.7, 1.9]], ["dmgTaken", -0.2], ["regen", 0.008], ["manaShield", 0.3]], "마나가 먼저 맞는다."),
  U("apex", "정점의 인장", "ring", 4, "tower", 1, [["mf", [2.2, 2.6]], ["allDmg", 0.3], ["critDmg", 0.5], ["cdr", 0.1], ["penElem", 0.15]], "끝없는 탑의 끝에서 빛나는 것."),
  // ===== 무한 균열 전용 =====
  U("endlessloop", "끝없는 고리", "ring", 2, "endless", 1, [["regen", [0.006, 0.008]], ["manaRegen", [0.02, 0.025]], ["cdr", 0.1]], "끝이 없으니 멈출 이유도 없다."),
  U("marathon", "마라토너의 갑옷", "armor", 2, "endless", 1, [["hpPct", [0.5, 0.6]], ["regen", [0.012, 0.016]], ["dmgTaken", -0.1]], "오래 서 있는 자가 이긴다."),
  U("hourglass", "모래시계 목걸이", "neck", 3, "endless", 1, [["cdr", [0.2, 0.25]], ["cdrCap", 0.65], ["allDmg", [0.2, 0.25]], ["manaCostRed", 0.15]], "시간은 우리 편이다."),
  U("legion", "군단 학살자", "gloves", 3, "endless", 1, [["aoeDmg", [0.6, 0.8]], ["normal", [0.4, 0.5]], ["chainJumps", 2], ["density", 1]], "밀려오는 것은 쓸려 나간다."),
  U("eternity", "영원의 왕관", "helm", 4, "endless", 1, [["revive", 1], ["regen", 0.015], ["lifesteal", 0.05], ["allDmg", 0.35], ["manaRegen", 0.04], ["hpMore", 1.5]], "영원히 쓰러지지 않는 자의 머리 위에."),
  // ===== 공허의 군주 (6개 중 1개, 2개는 엔젤릭) =====
  U("voidblade", "공허의 검", "weapon", 2, "void", 1, [["atkPct", [0.45, 0.55]], ["magPct", [0.45, 0.55]], ["critDmg", [0.7, 0.9]], ["ignoreDef", 0.15]], "베인 자리가 다시 닫히지 않는다."),
  U("voidplate", "공허의 흉갑", "armor", 2, "void", 1, [["hpPct", [0.45, 0.55]], ["defPct", [0.9, 1.1]], ["dmgTaken", -0.15], ["manaShield", 0.2]], "공허는 무엇도 되돌려 주지 않는다."),
  U("voidcrest", "공허의 문장", "helm", 3, "void", 1, [["cdr", [0.13, 0.17]], ["allDmg", [0.18, 0.22]], ["mf", [0.25, 0.35]], ["voidDmg", 0.4]], "눈을 감아도 보인다."),
  U("voidwhisper", "공허의 속삭임", "neck", 3, "void", 1, [["manaToSpell", [0.3, 0.35]], ["magCrit", 1], ["spellCrit", 0.12], ["voidDmg", 0.3]], "마나가 속삭이면 마법이 대답한다."),
  U("abyssalcrown", "심연의 왕관", "helm", 4, "void", 1, [["atkMore", [1.5, 1.7]], ["magMore", [1.5, 1.7]], ["hpMore", [1.5, 1.7]], ["allDmg", [0.55, 0.65]], ["cdr", 0.2], ["lanes", 1], ["revive", 1]], "왕관을 쓴 자는 무릎 꿇지 않는다."),
  U("voidheart", "공허의 심장", "armor", 4, "void", 1, [["hpMore", [2.2, 2.6]], ["lifesteal", 0.06], ["regen", 0.01], ["dmgTaken", -0.3], ["boss", 0.6], ["manaShield", 0.25]], "심장이 두 개라면 어느 쪽이 먼저 멈출까."),
];
const UNIQUE_BY_ID = Object.fromEntries(UNIQUES.map((u) => [u.id, u]));
UNIQUES.forEach((u) => { u.ico = u.slot; });
const uniqTier = (id) => (UNIQUE_BY_ID[id] ? U_TIERS[UNIQUE_BY_ID[id].tier] : U_TIERS[1]);
// 등급 보정: 높은 등급일수록 유리한 수치가 커진다 (페널티·플래그·상한은 그대로)
const U_SCALE = new Set(["atkPct", "magPct", "hpPct", "defPct", "cdr", "critChance", "critDmg", "spellCrit", "allDmg", "aoeDmg", "lifesteal", "boss", "elite", "normal", "ranged", "fireDmg", "coldDmg", "lightDmg", "voidDmg", "elemDmg", "physDmg", "magDmg", "dotDmg", "penElem", "ignoreDef", "ignoreRes", "shredDef", "shredRes", "manaPct", "manaToSpell", "dmgPerMana", "bleedChance", "poisonChance", "igniteChance", "chainDmg", "manaCostRed", "regen", "manaRegen", "manaRegenFlat", "manaShield", "mf", "goldFind", "expFind", "dotDur"]);
const U_MORE = new Set(["atkMore", "magMore", "hpMore"]);
function umodScale(def, k, v) {
  const f = U_TIERS[def.tier].mult; if (f === 1) return v;
  if (U_SCALE.has(k) && v > 0) return v * f; if (k === "dmgTaken" && v < 0) return v * Math.min(1.8, f);
  if (U_MORE.has(k) && v > 1) return 1 + (v - 1) * f; return v;
}
// 드랍 풀에서의 가중치: 등급별 기본 가중치 / 같은 등급 내 아이템 수
function uniquePool(pool, act) {
  const list = UNIQUES.filter((u) => u.pool === pool && u.act <= Math.max(1, act));
  const cnt = {}; list.forEach((u) => (cnt[u.tier] = (cnt[u.tier] || 0) + 1));
  return list.map((u) => ({ u, w: U_TIERS[u.tier].w / cnt[u.tier] }));
}
// 효과 텍스트 (표시용): 수치가 범위인 항목은 범위로 보여준다
const MOD_LABEL = {
  atkPct: ["공격력", "%"], magPct: ["주문력", "%"], atkMore: ["공격력", "more"], magMore: ["주문력", "more"], hpPct: ["체력", "%"], hpMore: ["체력", "more"], defPct: ["방어력", "%"], defMore: ["방어력", "more"],
  dodge: ["회피", "%"], cdr: ["쿨타임 감소", "%"], critChance: ["물리 치명타 확률", "%"], critDmg: ["치명타 피해", "%"], spellCrit: ["주문 치명타 확률", "%"],
  boss: ["보스 추가 피해", "%"], elite: ["정예 추가 피해", "%"], ranged: ["원거리 추가 피해", "%"], normal: ["일반 추가 피해", "%"],
  lifesteal: ["생명력 흡수", "%"], goldFind: ["골드 획득", "%"], expFind: ["경험치 획득", "%"], mf: ["매직 파운드", "%"], chainJumps: ["번개 도약", "+"], chainDmg: ["번개 피해", "%"],
  aoeDmg: ["광역 피해", "%"], allDmg: ["주는 피해", "%"], density: ["칸당 몹 수", "+"], lanes: ["레인", "+"], dmgTaken: ["받는 피해", "%"], regen: ["초당 체력 회복", "%"],
  manaRegenFlat: ["초당 마나 재생", "+"], manaOnKill: ["처치 시 마나", "+"], dmgPerMana: ["최대 마나 100당 피해", "%"], bleedChance: ["출혈 확률", "%"], poisonChance: ["중독 확률", "%"], igniteChance: ["점화 확률", "%"], dotDmg: ["지속 피해", "%"], dotDur: ["지속 시간", "%"],
  manaPct: ["마나", "%"], manaRegen: ["초당 마나 재생", "%"], manaCostRed: ["마나 소모 감소", "%"], manaToSpell: ["최대 마나의", "mts"], manaShield: ["받는 피해의", "ms"],
  fireDmg: ["화염 피해", "%"], coldDmg: ["냉기 피해", "%"], lightDmg: ["번개 피해", "%"], voidDmg: ["공허 피해", "%"], elemDmg: ["원소 피해", "%"], physDmg: ["물리 피해", "%"], magDmg: ["마법 피해", "%"],
  ignoreDef: ["방어 무시", "%"], ignoreRes: ["마법저항 무시", "%"], shredDef: ["대상 방어력 감소", "%"], shredRes: ["대상 마법저항 감소", "%"], penElem: ["속성 저항 관통", "%"],
};
function uniqueLines(def, mods) {   // mods: 실제 굴려진 값(없으면 정의의 범위)
  const out = [], P = (v) => Math.round(v * 100);
  for (const m of (mods || def.mods.map((x) => ({ k: x[0], v: umodScale(def, x[0], Array.isArray(x[1]) ? (x[1][0] + x[1][1]) / 2 : x[1]) })))) {
    const k = m.k, v = m.v, L = MOD_LABEL[k];
    if (k === "revive") out.push("전투당 1회 부활 (체력 50%)");
    else if (k === "noDodge") out.push("회피할 수 없다");
    else if (k === "magCrit") out.push("마법 스킬도 물리 치명타 확률로 치명타가 터진다");
    else if (k === "cdrCap") out.push(`쿨타임 감소 상한 ${P(v)}%`);
    else if (k === "dodgeCap") out.push(`회피 상한 ${P(v)}%`);
    else if (k === "hpMore" && v < 1) out.push(`최대 체력이 ${P(v)}%가 된다`);
    else if (k === "defMore" && v === 0) out.push("방어력이 0이 된다");
    else if (L && L[1] === "more") { const d = P(v - 1); out.push(`${L[0]} ${d >= 0 ? "+" : ""}${d}%`.replace("more", "")); }
    else if (k === "hpMore") out.push(`체력 ${v >= 1 ? "+" + P(v - 1) : P(v - 1)}%`);
    else if (k === "manaToSpell") out.push(`최대 마나의 ${P(v)}%만큼 주문력 증가`);
    else if (k === "manaShield") out.push(`받는 피해의 ${P(v)}%를 마나가 대신 받는다`);
    else if (k === "dodge") out.push(`회피 ${v >= 0 ? "+" : ""}${P(v)}%`);
    else if (L && L[1] === "+") out.push(`${L[0]} ${v >= 0 ? "+" : ""}${Math.round(v)}`);
    else if (L) out.push(`${L[0]} ${v >= 0 ? "+" : ""}${(v * 100).toFixed(Math.abs(v) < 0.1 ? 1 : 0)}%`);
  }
  return out;
}
