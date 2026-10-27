// =========================================================
// 설정 / 데이터 (밸런스·규칙은 모두 여기 상수로 분리)
// =========================================================
const CFG = {
  COLS: 6, MAX_LANES: 4, BASE_LANES: 2, ENDGAME_LANES: 3,
  STACK_BASE: 2, STACK_MAX: 6, STACK_EXP: 0.7,
  SPAWN_INTERVAL: 0.22, MOVE_TIME: 0.4, FIRST_ATTACK_DELAY: 0.8, JITTER: 0.25,
  WAVE_BASE: 10, WAVE_STAGE: 2.0,
  ACTS: 10, STAGES: 10,
  BASE_ATK: 6, BASE_HP: 100, BASE_DODGE: 0.05, BASE_CRIT: 0.05, BASE_CRITDMG: 0.5,
  LEVEL_STEP: 0.04, LEVEL_CAP: 100,
  G: 1.55, H0: 2.0, A0: 0.75,
  EXP_BASE: 170, EXP_GROWTH: 1.7,
  STAGE_HP: 0.12, STAGE_ATK: 0.06,
  REGEN: 0.004,
  EASE: [0.65, 0.78, 0.88],
  REC_K: 3000, REC_BOSS: 2.5,
  INV_MAX: 150,
  SKILL_DROP: 0.12, SKILL_DROP_BOSS: 0.45,
  SET_DROP: 0.10, SET_DROP_BOSS: 0.45,
  RIFT_SCALE: 1.07, HPX: 1.1, BOSSX: 0.7,
};

const ACTS = [
  { name: "초원",   boss: 0, color: "#7fbf6a", sky: ["#6fa8dc", "#cfe8d0"], ground: "#4c8a3c", hue: 0,    mus: { root: 0, mode: "maj", bpm: 118 } },
  { name: "숲",     boss: 1, color: "#3f9a5a", sky: ["#2c5a44", "#7ab08a"], ground: "#2f6b3a", hue: 30,   mus: { root: 2, mode: "dor", bpm: 112 } },
  { name: "폐광",   boss: 2, color: "#b59a6a", sky: ["#2a2430", "#5a4a56"], ground: "#5a4a3a", hue: 190,  mus: { root: 5, mode: "min", bpm: 104 } },
  { name: "사막",   boss: 3, color: "#e0b060", sky: ["#f0a860", "#f8dca0"], ground: "#c8a060", hue: 60,   mus: { root: 7, mode: "phr", bpm: 124 } },
  { name: "늪지",   boss: 4, color: "#6ab0a0", sky: ["#2a4a44", "#6a8a70"], ground: "#34584a", hue: 120,  mus: { root: 9, mode: "min", bpm: 100 } },
  { name: "설원",   boss: 5, color: "#8fd0ff", sky: ["#a8c8e8", "#eef6ff"], ground: "#d4e4f0", hue: 160,  mus: { root: 4, mode: "dor", bpm: 108 } },
  { name: "화산",   boss: 6, color: "#ff7a4a", sky: ["#3a1410", "#a84a24"], ground: "#4a2a24", hue: -30,  mus: { root: 2, mode: "phr", bpm: 132 } },
  { name: "심연",   boss: 7, color: "#a37fe0", sky: ["#120a24", "#3a2060"], ground: "#241a3c", hue: -90,  mus: { root: 6, mode: "min", bpm: 96 } },
  { name: "천공성", boss: 8, color: "#f0e08a", sky: ["#6a82c8", "#e8e0f8"], ground: "#a8a4c4", hue: 90,   mus: { root: 0, mode: "lyd", bpm: 120 } },
  { name: "마계",   boss: 9, color: "#e05a5a", sky: ["#2a0808", "#7a1818"], ground: "#3a1414", hue: -140, mus: { root: 11, mode: "phr", bpm: 140 } },
];

// ---- 적 정의 (액트 1 스테이지 1 기준 수치) ----
const ENEMIES = {
  imp:    { name: "임프",     tier: "normal", ranged: false, range: 1, hp: 14,  atk: 3,  interval: 1.8, windup: 0.35, exp: 1,  gold: 1, sprite: "imp",    sc: 2 },
  grunt:  { name: "고블린",   tier: "normal", ranged: false, range: 1, hp: 30,  atk: 6,  interval: 2.0, windup: 0.5,  exp: 2,  gold: 1, sprite: "goblin", sc: 2 },
  archer: { name: "궁수",     tier: "normal", ranged: true,  range: 4, hp: 20,  atk: 6,  interval: 2.2, windup: 0.6,  exp: 2,  gold: 1, sprite: "archer", sc: 2, proj: "arrow" },
  mage:   { name: "주술사",   tier: "normal", ranged: true,  range: 5, hp: 32,  atk: 9,  interval: 3.2, windup: 0.9,  exp: 3,  gold: 2, sprite: "shaman", sc: 2, proj: "orb" },
  brute:  { name: "정예 오크", tier: "elite",  ranged: false, range: 1, hp: 140, atk: 14, interval: 2.8, windup: 0.8,  exp: 12, gold: 8, sprite: "brute",  sc: 3 },
};
function actWeights(a) {
  const t = (a - 1) / 9;
  return { imp: 60 - 40 * t, grunt: 40 - 10 * t, archer: 0 + 30 * t + (a >= 2 ? 8 : 0), mage: a >= 3 ? 8 + 22 * t : 0 };
}

// ---- 보스 (여러 칸 차지 + 기믹) ----
const BOSSES = [
  { id: "groom",   name: "들판의 군주 그룸",    w: 2, h: 2, hp: 520, atk: 16, range: 3, interval: 2.6, windup: 1.0, exp: 60, gold: 60, sc: 3,
    abilities: [{ id: "summon", every: 11, count: 4, type: "imp", text: "졸개를 불러낸다!" }, { id: "enrage", at: 0.3, text: "그룸이 분노한다!" }], desc: "졸개 소환 · 체력 30% 이하 분노" },
  { id: "treant",  name: "고목 수호자",         w: 2, h: 2, hp: 680, atk: 15, range: 3, interval: 2.8, windup: 1.0, exp: 70, gold: 70, sc: 3,
    abilities: [{ id: "heal", every: 12, pct: 0.05, text: "나무가 체력을 회복한다!" }, { id: "root", every: 14, dur: 5, mult: 0.6, text: "뿌리가 속박한다! (쿨타임 느려짐)" }], desc: "자가 회복 · 속박" },
  { id: "golem",   name: "광산 감독관 볼트",    w: 2, h: 2, hp: 760, atk: 17, range: 3, interval: 3.0, windup: 1.0, exp: 80, gold: 80, sc: 3,
    abilities: [{ id: "charge", every: 12, windup: 2.4, mult: 3.2, interrupt: 0.07, text: "볼트가 힘을 모은다! (큰 피해를 주면 저지)" }, { id: "summon", every: 16, count: 3, type: "grunt", text: "광부들이 나타난다!" }], desc: "강타 충전(저지 가능) · 광부 소환" },
  { id: "sultan",  name: "모래폭풍의 술탄",     w: 3, h: 1, hp: 700, atk: 18, range: 3, interval: 2.5, windup: 0.9, exp: 90, gold: 90, sc: 3,
    abilities: [{ id: "shield", every: 18, dur: 8, adds: 4, text: "모래 장막! 졸개를 처치해야 한다!" }, { id: "poison", every: 10, dps: 0.012, dur: 6, text: "독침에 맞았다!" }, { id: "wound", every: 15, dur: 6, mult: 0.5, text: "저주받은 상처! 생명력 흡수·회복이 반감된다!" }], desc: "방어막(졸개 처치로 해제) · 독" },
  { id: "hydra",   name: "독안개 마녀 히드라",   w: 2, h: 2, hp: 800, atk: 16, range: 3, interval: 2.4, windup: 0.9, exp: 100, gold: 100, sc: 3,
    abilities: [{ id: "poison", every: 8, dps: 0.015, dur: 7, text: "독안개가 퍼진다!" }, { id: "summon", every: 14, count: 5, type: "imp", text: "새끼들이 몰려온다!" }, { id: "heal", every: 15, pct: 0.04, text: "머리가 재생한다!" }], desc: "독안개 · 소환 · 재생" },
  { id: "frost",   name: "서리 거인 요툰",      w: 2, h: 2, hp: 900, atk: 19, range: 3, interval: 3.0, windup: 1.0, exp: 110, gold: 110, sc: 3,
    abilities: [{ id: "freeze", every: 14, dur: 2.5, text: "서리 숨결! 스킬이 얼어붙는다!" }, { id: "charge", every: 15, windup: 2.4, mult: 3.4, interrupt: 0.06, text: "거인이 도끼를 치켜든다!" }], desc: "빙결(스킬 정지) · 강타 충전" },
  { id: "ignis",   name: "용암 군주 이그니스",   w: 2, h: 2, hp: 950, atk: 20, range: 3, interval: 2.6, windup: 0.9, exp: 120, gold: 120, sc: 3,
    abilities: [{ id: "rain", every: 9, hits: 4, mult: 0.55, text: "불덩이가 쏟아진다!" }, { id: "enrage", at: 0.35, text: "이그니스가 폭주한다!" }], desc: "불비 · 체력 35% 이하 폭주" },
  { id: "eye",     name: "심연의 눈 아가론",     w: 2, h: 2, hp: 1000, atk: 20, range: 3, interval: 2.8, windup: 1.0, exp: 130, gold: 130, sc: 3,
    abilities: [{ id: "reflect", every: 16, dur: 5, pct: 0.35, text: "반사 막! 공격하면 피해를 입는다!" }, { id: "curse", every: 13, dur: 6, mult: 0.3, text: "저주! 받는 피해가 늘어난다!" }, { id: "wound", every: 15, dur: 6, mult: 0.5, text: "저주받은 상처! 생명력 흡수·회복이 반감된다!" }], desc: "피해 반사 · 저주" },
  { id: "angel",   name: "폐허의 대천사",       w: 2, h: 2, hp: 1050, atk: 21, range: 3, interval: 2.6, windup: 0.9, exp: 140, gold: 140, sc: 3,
    abilities: [{ id: "shield", every: 20, dur: 8, adds: 5, text: "성스러운 방어막!" }, { id: "heal", every: 12, pct: 0.05, text: "천사가 치유한다!" }, { id: "summon", every: 18, count: 4, type: "archer", text: "성가대가 나타난다!" }, { id: "wound", every: 15, dur: 6, mult: 0.5, text: "저주받은 상처! 생명력 흡수·회복이 반감된다!" }], desc: "방어막 · 치유 · 소환" },
  { id: "demon",   name: "마왕 바알제뷔트",     w: 3, h: 2, hp: 1400, atk: 23, range: 4, interval: 2.4, windup: 0.9, exp: 220, gold: 220, sc: 4,
    abilities: [{ id: "summon", every: 12, count: 5, type: "imp", text: "마왕이 군단을 부른다!" }, { id: "charge", every: 16, windup: 2.4, mult: 3.6, interrupt: 0.05, text: "마왕이 종말의 일격을 준비한다!" }, { id: "curse", every: 15, dur: 6, mult: 0.3, text: "마왕의 저주!" }, { id: "enrage", at: 0.3, text: "마왕이 진정한 힘을 드러낸다!" }, { id: "wound", every: 15, dur: 6, mult: 0.5, text: "저주받은 상처! 생명력 흡수·회복이 반감된다!" }], desc: "소환 · 일격 충전 · 저주 · 분노" },
];

// ---- 스킬 ----
// kind: single / multi(3x3) / pierce / chain / nova / zone / boomer / meteor / buff / heal
const SKILLS = [
  { id: "strike",  name: "일격",         slot: "basic",  kind: "single", cd: 0.8,  mult: 1.0,  range: 3, bonus: {}, unlock: 1, color: "#cfe4ff", icon: "sword", sfx: "slash", desc: "기본 단일 공격" },
  { id: "rapid",   name: "연사",         slot: "basic",  kind: "single", cd: 0.45, mult: 0.55, range: 4, bonus: {}, unlock: 1, color: "#cfe4ff", icon: "dagger", sfx: "slash", desc: "빠른 단일 공격" },
  { id: "crush",   name: "파쇄타",       slot: "basic",  kind: "multi",  cd: 1.1,  mult: 0.5,  side: 0.6, range: 3, bonus: {}, unlock: 2, color: "#ffd9a0", icon: "hammer", sfx: "thud", desc: "대상 주변 3x3 타격" },
  { id: "spark",   name: "번개 찌르기",   slot: "basic",  kind: "chain",  cd: 0.9,  mult: 0.8,  jumps: 2, decay: 0.6, range: 4, bonus: {}, unlock: 2, color: "#aee8ff", icon: "bolt", sfx: "zap", desc: "맞힌 적 뒤로 번개가 2번 튄다" },
  { id: "smash",   name: "강타",         slot: "active", kind: "single", cd: 3.0,  mult: 3.2,  range: 5, bonus: { elite: 0.3 }, unlock: 1, color: "#ffe08a", icon: "fist", sfx: "thud", desc: "강한 단일 공격, 정예에게 추가 피해" },
  { id: "bomb",    name: "폭열탄",       slot: "active", kind: "multi",  cd: 5.0,  mult: 2.0,  side: 0.8, range: 5, bonus: {}, unlock: 1, color: "#ff9a50", icon: "bomb", sfx: "boom", desc: "대상 주변 3x3 폭발" },
  { id: "lance",   name: "관통창",       slot: "active", kind: "pierce", cd: 6.0,  mult: 1.7,  range: 6, bonus: {}, unlock: 1, color: "#9dffb0", icon: "spear", sfx: "pierce", desc: "같은 줄의 적을 모두 꿰뚫는다" },
  { id: "chain",   name: "체인 라이트닝", slot: "active", kind: "chain",  cd: 5.5,  mult: 1.9,  jumps: 5, decay: 0.88, range: 5, bonus: {}, unlock: 2, color: "#9ad8ff", icon: "bolt", sfx: "zap", desc: "맞힌 적 뒤의 대각선 위·대각선 아래·바로 뒤로 무작위로 번개가 뻗는다" },
  { id: "snipe",   name: "저격",         slot: "active", kind: "single", cd: 4.0,  mult: 4.0,  range: 6, bonus: { ranged: 0.6 }, unlock: 2, color: "#d0b0ff", icon: "arrow", sfx: "snipe", desc: "원거리 유닛에게 추가 피해, 사거리 6" },
  { id: "firewall", name: "화염 벽",     slot: "active", kind: "zone",   cd: 10.0, mult: 0.7,  dur: 5, range: 5, bonus: {}, unlock: 3, color: "#ff7a30", icon: "flame", sfx: "fire", desc: "대상 줄 3칸을 5초간 불태운다" },
  { id: "sweep",   name: "소탕",         slot: "active", kind: "multi",  cd: 6.0,  mult: 1.6,  side: 0.9, range: 4, bonus: { normal: 0.4 }, unlock: 3, color: "#c0ffc0", icon: "sweep", sfx: "slash", desc: "일반 몹에게 추가 피해를 주는 광역" },
  { id: "cry",     name: "전투 함성",     slot: "active", kind: "buff",   cd: 18.0, mult: 0, dur: 8, power: 0.3, range: 6, bonus: {}, unlock: 3, color: "#ffd24a", icon: "horn", sfx: "buff", desc: "8초 동안 주는 피해 +30%" },
  { id: "execute", name: "처형",         slot: "active", kind: "single", cd: 7.0,  mult: 9.0,  range: 5, bonus: { boss: 0.8 }, unlock: 4, color: "#ff6a6a", icon: "skull", sfx: "snipe", desc: "보스에게 큰 추가 피해" },
  { id: "frost",   name: "빙결 파동",     slot: "active", kind: "nova",   cd: 9.0,  mult: 1.2,  range: 5, chill: 2.0, bonus: {}, unlock: 4, color: "#a8e8ff", icon: "snow", sfx: "frost", desc: "사거리 안의 모든 적에게 피해, 공격이 느려진다" },
  { id: "vamp",    name: "흡혈 참격",     slot: "active", kind: "single", cd: 4.5,  mult: 2.8,  range: 4, lifesteal: 0.25, bonus: {}, unlock: 4, color: "#ff6aa0", icon: "fang", sfx: "slash", desc: "피해의 25%를 체력으로 회복" },
  { id: "heal",    name: "치유의 빛",     slot: "active", kind: "heal",   cd: 16.0, mult: 0, power: 0.25, range: 6, bonus: {}, unlock: 4, color: "#9dffb0", icon: "heart", sfx: "heal", desc: "체력이 낮을 때 최대 체력의 25% 회복" },
  { id: "thunder", name: "낙뢰",         slot: "active", kind: "multi",  cd: 8.0,  mult: 3.2,  side: 1.0, range: 6, bonus: {}, unlock: 5, color: "#fff0a0", icon: "cloud", sfx: "boom", desc: "강력한 3x3 낙뢰" },
  { id: "boomer",  name: "회전 도끼",     slot: "active", kind: "boomer", cd: 6.0,  mult: 1.5,  range: 6, back: 0.8, bonus: {}, unlock: 5, color: "#e0e8ff", icon: "axe", sfx: "pierce", desc: "줄을 꿰뚫고 돌아오며 한 번 더 벤다" },
  { id: "pierce2", name: "섬광 관통",     slot: "active", kind: "pierce", cd: 7.0,  mult: 2.8,  range: 6, bonus: { ranged: 0.3 }, unlock: 6, color: "#fff", icon: "spear", sfx: "pierce", desc: "원거리에 추가 피해를 주는 관통" },
  { id: "meteor",  name: "유성",         slot: "active", kind: "meteor", cd: 12.0, mult: 1.9,  side: 1.0, range: 6, count: 3, bonus: { elite: 0.3, boss: 0.3 }, unlock: 7, color: "#ff8a4a", icon: "meteor", sfx: "meteor", desc: "유성 3개가 무작위 적 위에 떨어진다" },
];
const SKILL_RARITY = [
  { name: "일반", mult: 1.0,  cdMul: 1.0,  bonusMul: 1.0, w: 70, cls: "r0" },
  { name: "희귀", mult: 1.25, cdMul: 0.95, bonusMul: 1.3, w: 25, cls: "r2" },
  { name: "전설", mult: 1.6,  cdMul: 0.9,  bonusMul: 1.7, w: 5,  cls: "r3" },
  // 전설 위 등급: 일반 드랍 풀에는 없고, 엔드게임(스킬 시련·공허의 군주)에서 전설이 나왔을 때 아주 낮은 확률로 한 단계씩 더 올라간다. 승급으로는 얻을 수 없다
  { name: "이터널", mult: 1.9, cdMul: 0.87, bonusMul: 2.0, w: 0, cls: "tn2" },
  { name: "소버린", mult: 2.3, cdMul: 0.84, bonusMul: 2.4, w: 0, cls: "tn3" },
  { name: "엔젤릭", mult: 3.0, cdMul: 0.80, bonusMul: 3.0, w: 0, cls: "tn4" },
];
const RULES = { front: "앞열(기본)", auto: "오토", boss: "보스 우선", ranged: "원거리 우선", elite: "정예 우선", normal: "일반 우선" };
const RULE_ORDER = ["front", "auto", "boss", "ranged", "elite", "normal"];

// ---- 장비 ----
const SLOTS = ["weapon", "helm", "armor", "gloves", "boots", "ring", "neck"];
const SLOT_NAME = { weapon: "무기", helm: "투구", armor: "갑옷", gloves: "장갑", ring: "반지", ring2: "반지 2", neck: "목걸이", boots: "신발" };
const EQ_SLOTS = [...SLOTS, "ring2"];   // 장비 칸: 반지는 2칸 (아이템 종류는 SLOTS, 착용 칸은 EQ_SLOTS)
const slotType = (k) => (k === "ring2" ? "ring" : k);
const slotKeys = (type) => (type === "ring" ? ["ring", "ring2"] : [type]);
const SLOT_BASE = { weapon: { atk: 6 }, helm: { def: 3, hp: 20 }, armor: { hp: 55, def: 4 }, gloves: { atk: 2, def: 1.5 }, ring: { hp: 15 }, neck: { atk: 1.5 }, boots: { hp: 22, def: 2 } };
const ITEM_RARITY = [
  { name: "일반", mult: 1.0,  affixes: 0, cls: "r0", drop: 55, bossDrop: 0 },
  { name: "마법", mult: 1.15, affixes: 2, cls: "r1", drop: 30, bossDrop: 35 },
  { name: "희귀", mult: 1.3,  affixes: 4, cls: "r2", drop: 13, bossDrop: 50 },
  { name: "전설", mult: 1.55, affixes: 5, cls: "r3", drop: 2,  bossDrop: 15 },
  { name: "세트", mult: 1.4, affixes: 3, cls: "r4", drop: 0,  bossDrop: 0 },
];
// 엔드게임(아이템 레벨 11+) 드랍은 일반 장비 가치가 낮다. 액트(1~10) 드랍은 그대로.
const END_RMUL = [1.0, 1.15, 1.15, 1.45, 1.3];
const rarMul = (rarity, ilvl) => (ilvl > 10 && END_RMUL[rarity] ? END_RMUL[rarity] : ITEM_RARITY[rarity].mult);
const AFFIXES = [
  { k: "atkFlat", name: "공격력",          flat: true, range: [2, 4],    w: 10 },
  { k: "hpFlat",  name: "체력",            flat: true, range: [15, 30],  w: 10 },
  { k: "defFlat", name: "방어력",          flat: true, range: [2, 4],    w: 8 },
  { k: "atkPct",  name: "공격력 %",        pct: true,  range: [0.06, 0.12], w: 9 },
  { k: "hpPct",   name: "체력 %",          pct: true,  range: [0.06, 0.12], w: 9 },
  { k: "dodge",   name: "회피",            pct: true,  range: [0.02, 0.04], w: 6 },
  { k: "cdr",     name: "쿨타임 감소",     pct: true,  range: [0.03, 0.06], w: 6 },
  { k: "critChance", name: "치명타 확률",   pct: true,  range: [0.02, 0.05], w: 6 },
  { k: "critDmg", name: "치명타 피해",      pct: true,  range: [0.10, 0.25], w: 6 },
  { k: "boss",    name: "보스 추가 피해",  pct: true,  range: [0.12, 0.30], w: 6 },
  { k: "elite",   name: "정예 추가 피해",  pct: true,  range: [0.12, 0.30], w: 6 },
  { k: "ranged",  name: "원거리 추가 피해", pct: true, range: [0.12, 0.30], w: 6 },
  { k: "normal",  name: "일반 추가 피해",  pct: true,  range: [0.08, 0.20], w: 6 },
  { k: "lifesteal", name: "생명력 흡수",    pct: true,  range: [0.01, 0.02], w: 3, minRarity: 2 },
  { k: "goldFind", name: "골드 획득",       pct: true,  range: [0.08, 0.20], w: 4 },
  { k: "chainJumps", name: "번개 도약 +",   count: true, range: [1, 1], w: 2.5, minRarity: 2, slots: ["ring", "neck", "weapon"], minIlvl: 3 },
  { k: "density", name: "칸당 몹 수",    count: true, range: [1, 1], w: 2.5, minRarity: 2, slots: ["ring", "neck"], minIlvl: 3 },
  { k: "lanes",   name: "레인 확장 +",     count: true, range: [1, 1], w: 1.2, minRarity: 3, slots: ["neck"], minIlvl: 6 },
];
// 세트: acts = 드랍 액트 범위, bonus = 착용 수별 효과
const SETS = [
  { id: "guardian", name: "초원의 수호자", acts: [1, 4], pieces: ["helm", "armor", "gloves", "boots", "neck"], color: "#7fe08a",
    bonus: { 2: { hpPct: 0.15 }, 4: { cdr: 0.10, dodge: 0.05 } }, text: { 2: "체력 +15%", 4: "쿨타임 감소 +10%, 회피 +5%" } },
  { id: "storm", name: "폭풍술사의 정수", acts: [2, 7], pieces: ["weapon", "helm", "boots", "ring", "neck"], color: "#8ad8ff",
    bonus: { 2: { chainJumps: 2 }, 4: { chainDmg: 0.5 } }, text: { 2: "번개 도약 +2", 4: "번개 피해 +50%" } },
  { id: "legion", name: "군단 파괴자", acts: [4, 9], pieces: ["weapon", "armor", "gloves", "boots", "ring"], color: "#ffb060",
    bonus: { 2: { density: 1 }, 4: { aoeDmg: 0.35, normal: 0.3 } }, text: { 2: "칸당 몹 수 +1", 4: "광역 피해 +35%, 일반 추가 피해 +30%" } },
  { id: "slayer", name: "처형인의 맹세", acts: [5, 10], pieces: ["weapon", "helm", "armor", "boots", "neck"], color: "#ff7a8a",
    bonus: { 2: { boss: 0.3, elite: 0.2 }, 4: { critDmg: 0.5, boss: 0.3 } }, text: { 2: "보스 +30%, 정예 +20%", 4: "치명타 피해 +50%, 보스 +30%" } },
  { id: "abyss", name: "심연의 군주", acts: [8, 99], pieces: ["weapon", "helm", "armor", "gloves", "boots", "ring", "neck"], color: "#c8a0ff",
    bonus: { 2: { atkPct: 0.08 }, 4: { lifesteal: 0.03, critChance: 0.06 }, 6: { allDmg: 0.25, lanes: 1 } }, text: { 2: "공격력 +8%", 4: "생명력 흡수 +3%, 치명타 확률 +6%", 6: "모든 피해 +25%, 레인 +1" } },
];

// ---- 균열(엔드게임) 변이 ----
const RIFT_MODS = [
  { id: "fury",   name: "광폭",     text: "적 공격력 +30%", atk: 1.3 },
  { id: "armor",  name: "철갑",     text: "적 체력 +40%", hp: 1.4 },
  { id: "swarm",  name: "밀집",     text: "칸당 적 수 +1", cap: 1 },
  { id: "archers", name: "원거리 부대", text: "원거리 적 비중 증가", ranged: true },
  { id: "elites", name: "정예 군단", text: "정예가 3배 등장", elites: 3 },
  { id: "poison", name: "독안개",    text: "주기적으로 독에 중독", poison: true },
  { id: "bind",   name: "속박",     text: "스킬 쿨타임 +25%", slow: 0.8 },
  { id: "haste",  name: "질주",     text: "적 공격 속도 +30%", haste: 1.3 },
];

// ---- 월드맵 ----
// 지역(액트) 중심 좌표 (월드 1800x1100)
const MAP_W = 1800, MAP_H = 1100;
const REGION = [[210, 960], [470, 990], [740, 930], [690, 720], [440, 690], [250, 520], [420, 360], [700, 330], [980, 240], [1280, 190]];
const RIFT_POS = [1560, 330];
function buildMap() {
  const nodes = [], edges = [];
  const add = (n) => { nodes.push(n); return n; };
  for (let a = 1; a <= 10; a++) {
    const [cx, cy] = REGION[a - 1];
    const rot = (a * 0.9) % 6.28;
    const town = add({ id: `T${a}`, kind: "town", act: a, x: cx, y: cy, name: `${ACTS[a - 1].name} 마을`, level: (a - 1) * 10 + 1 });
    const ring = [];
    for (let s = 1; s <= 10; s++) {
      const ang = rot + 0.55 + (s - 1) * 0.55, r = 74 + ((s % 2) ? 8 : -6) + (s > 5 ? 12 : 0);
      const n = add({ id: `S${a}-${s}`, kind: s === 10 ? "boss" : "stage", act: a, stage: s, x: Math.round(cx + Math.cos(ang) * r * 1.35), y: Math.round(cy + Math.sin(ang) * r), name: s === 10 ? BOSSES[ACTS[a - 1].boss].name : `${ACTS[a - 1].name} ${s}`, level: (a - 1) * 10 + s });
      ring.push(n);
    }
    edges.push([town.id, ring[0].id]);
    for (let i = 0; i < 9; i++) edges.push([ring[i].id, ring[i + 1].id]);
    // 추가 노드: 엘리트 사냥터(스테이지 5 이후), 보물 던전(스테이지 8 이후)
    const e5 = ring[4], v8 = ring[7];
    const out = (n, k) => { const dx = n.x - cx, dy = n.y - cy, L = Math.hypot(dx, dy) || 1; return [Math.round(n.x + (dx / L) * k), Math.round(n.y + (dy / L) * k)]; }; const eo = out(e5, 52), vo = out(v8, 52);
    const el = add({ id: `E${a}`, kind: "elite", act: a, x: eo[0], y: eo[1], name: `${ACTS[a - 1].name} 정예 사냥터`, level: (a - 1) * 10 + 6, need: 5 });
    const tr = add({ id: `V${a}`, kind: "treasure", act: a, x: vo[0], y: vo[1], name: `${ACTS[a - 1].name} 보물 지하실`, level: (a - 1) * 10 + 8, need: 8 });
    edges.push([e5.id, el.id]); edges.push([v8.id, tr.id]);
    if (a > 1) edges.push([`S${a - 1}-10`, town.id]);
  }
  const rift = add({ id: "R", kind: "rift", act: 11, x: RIFT_POS[0], y: RIFT_POS[1], name: "심연의 균열", level: 100 });
  edges.push(["S10-10", rift.id]);
  const endless = add({ id: "RE", kind: "endless", act: 11, x: RIFT_POS[0] - 20, y: RIFT_POS[1] + 120, name: "무한 균열", level: 100 });
  const voidn = add({ id: "RV", kind: "void", act: 11, x: RIFT_POS[0] + 130, y: RIFT_POS[1] + 40, name: "공허의 군주", level: 100 });
  const flame = add({ id: "RH", kind: "hive", act: 11, x: RIFT_POS[0] + 120, y: RIFT_POS[1] - 110, name: "화염 정령왕", level: 100 });
  const vault = add({ id: "RG", kind: "vault", act: 11, x: RIFT_POS[0] - 160, y: RIFT_POS[1] + 50, name: "황금 보물고", level: 100 });
  const trial = add({ id: "TR", kind: "trial", act: 11, x: RIFT_POS[0] - 140, y: RIFT_POS[1] - 100, name: "스킬 시련", level: 100 });
  edges.push([rift.id, endless.id]); edges.push([rift.id, voidn.id]); edges.push([rift.id, trial.id]); edges.push([rift.id, flame.id]); edges.push([rift.id, vault.id]);
  // 겹치는 노드를 서로 밀어낸다 (마을/균열 입구는 고정)
  const fixed = (n) => n.kind === "town" || n.kind === "rift";
  for (let it = 0; it < 80; it++) {
    let moved = false;
    for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
      const A = nodes[i], B = nodes[j], dx = B.x - A.x, dy = B.y - A.y, dd = Math.hypot(dx, dy), MIN = 60;
      if (dd >= MIN) continue; moved = true; const L = dd || 1, push = (MIN - dd) / 2 + 0.5, ux = dx / L || 1, uy = dy / L;
      if (!fixed(A)) { A.x -= ux * push * (fixed(B) ? 2 : 1); A.y -= uy * push * (fixed(B) ? 2 : 1); } if (!fixed(B)) { B.x += ux * push * (fixed(A) ? 2 : 1); B.y += uy * push * (fixed(A) ? 2 : 1); }
    }
    if (!moved) break;
  }
  nodes.forEach((n) => { n.x = Math.round(n.x); n.y = Math.round(n.y); });
  return { nodes, edges, byId: Object.fromEntries(nodes.map((n) => [n.id, n])) };
}

// ---- 퀘스트 ----
// goal: {type:kill|elite|boss|clear|enhance|setDrop|rift, n, act?}
function questDefs() {
  const q = [];
  for (let a = 1; a <= 10; a++) {
    const A = ACTS[a - 1].name;
    q.push({ id: `m${a}`, act: a, main: true, title: `${A}의 군주를 쓰러뜨려라`, desc: `${A} 지역의 보스 ${BOSSES[ACTS[a - 1].boss].name}를 처치한다.`, goal: { type: "bossAct", act: a, n: 1 }, reward: { exp: 40 * a, gold: 60 * a, ore: 3 + a } });
    q.push({ id: `k${a}`, act: a, title: `${A} 소탕`, desc: `${A} 지역에서 적을 150마리 처치한다.`, goal: { type: "kill", act: a, n: 150 }, reward: { exp: 20 * a, gold: 40 * a, ore: 2 } });
    q.push({ id: `e${a}`, act: a, title: `${A} 정예 사냥`, desc: `${A} 지역에서 정예를 8마리 처치한다.`, goal: { type: "elite", act: a, n: 8 }, reward: { exp: 25 * a, gold: 50 * a, ore: 3, item: true } });
  }
  q.push({ id: "f1", act: 1, title: "대장장이의 부탁", desc: "장비를 2번 강화한다.", goal: { type: "enhance", n: 2 }, reward: { exp: 40, gold: 80, ore: 4 } });
  q.push({ id: "f2", act: 3, title: "세트를 모아라", desc: "세트 장비를 2개 획득한다.", goal: { type: "setDrop", n: 2 }, reward: { exp: 120, gold: 300, ore: 8 } });
  q.push({ id: "r1", act: 10, title: "균열의 도전자", desc: "심연의 균열에서 3단계를 클리어한다.", goal: { type: "rift", n: 3 }, reward: { exp: 0, gold: 3000, ore: 30, shards: 10 } });
  return q;
}
const GUILD_BOUNTIES = [
  { id: "g_kill", title: "현상금: 몹 사냥", desc: "적 200마리를 처치한다.", goal: { type: "kill", n: 200 }, reward: { gold: 150, ore: 3 } },
  { id: "g_clear", title: "현상금: 전투 의뢰", desc: "스테이지를 6번 클리어한다.", goal: { type: "clear", n: 6 }, reward: { gold: 200, ore: 4 } },
  { id: "g_elite", title: "현상금: 정예 토벌", desc: "정예를 10마리 처치한다.", goal: { type: "elite", n: 10 }, reward: { gold: 260, ore: 5 } },
  { id: "g_boss", title: "현상금: 보스 사냥", desc: "보스를 2번 처치한다.", goal: { type: "boss", n: 2 }, reward: { gold: 400, ore: 8 } },
];

const TUTORIAL = [
  { title: "훈련 1 · 자동 전투", text: "캐릭터는 제자리에서 자동으로 싸웁니다. 스킬은 쿨타임이 차면 알아서 발동합니다.", plan: Array(10).fill("imp") },
  { title: "훈련 2 · 적을 직접 지정", text: "적을 클릭하면 모든 스킬이 그 적을 우선 공격합니다. 다시 클릭하면 해제됩니다.", plan: ["grunt", "grunt", "grunt", "grunt", "grunt", "grunt", "brute", "grunt", "grunt", "grunt"] },
  { title: "훈련 3 · 무리와 정예", text: "한 칸에 여러 마리가 쌓입니다. 정예는 칸을 혼자 차지합니다. 마지막 훈련입니다.", plan: ["imp", "imp", "imp", "imp", "grunt", "grunt", "grunt", "imp", "imp", "imp", "brute", "grunt", "grunt", "imp", "imp"] },
];

// 액트 · 노드 기본 헬퍼
const gScale = (ilvl) => Math.pow(CFG.G, ilvl - 1);
const actScale = (a) => (CFG.EASE[a - 1] || 1) * Math.pow(CFG.G, Math.min(a, 10) - 1) * (1 + CFG.LEVEL_STEP * (10 * Math.min(a, 10) - 5)) / (1 + CFG.LEVEL_STEP * 5);
const nodeLevel = (n) => n.level;
const eliteCount = (stage) => (stage >= 2 ? 1 + Math.floor(stage / 2) : 0);
const planSize = (stage) => CFG.WAVE_BASE + CFG.WAVE_STAGE * stage + eliteCount(stage) + (stage === CFG.STAGES ? 1 : 0);
