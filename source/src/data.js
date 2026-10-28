// =========================================================
// 설정 / 데이터 (밸런스·규칙은 모두 여기 상수로 분리)
// =========================================================
const CFG = {
  COLS: 6, MAX_LANES: 4, BASE_LANES: 2, ENDGAME_LANES: 3,
  STACK_BASE: 2, STACK_MAX: 6, STACK_EXP: 0.7,
  SPAWN_INTERVAL: 0.22, MOVE_TIME: 0.4, FIRST_ATTACK_DELAY: 0.8, JITTER: 0.25,
  WAVE_BASE: 10, WAVE_STAGE: 2.0,
  ACTS: 1, STAGES: 5, RIFT_END: 100,   // v4: 스테이지는 1~5뿐, 이후 곧바로 균열(100층 졸업)
  BASE_ATK: 6, BASE_HP: 100, BASE_DODGE: 0.05, BASE_CRIT: 0.05, BASE_CRITDMG: 0.5,
  LEVEL_STEP: 0.04, LEVEL_CAP: 100,
  G: 1.55, H0: 2.0, A0: 0.75,
  EXP_BASE: 170, EXP_GROWTH: 1.7,
  STAGE_HP: 0.12, STAGE_ATK: 0.06,
  REGEN: 0.004,
  EASE: [0.65, 0.78, 0.88],
  REC_K: 3000, REC_BOSS: 2.5,
  INV_MAX: 150,
  SKILL_DROP: 0.28, SKILL_DROP_BOSS: 0.7,
  SET_DROP: 0.10, SET_DROP_BOSS: 0.45,
  RIFT_SCALE: 1.07, HPX: 1.1, BOSSX: 0.7,
  ACT_UNIQ: { stage: 0.016, boss: 0.04, elite: 0.03, treasure: 0.02 }, WFLAT: 1.6, RIFT_J: 1.06, RIFT_S: 1.0008, RIFT_RAMP: 0.25,   // WFLAT: 무기에 붙은 공격력/주문력 고정 옵션은 이 배율로 더 크게 들어간다
   RIFT_T0: 30, RIFT_K: 0.05,   // 균열 28단계부터는 단계당 적 성장의 로그를 RIFT_K배로 줄인다 (장비 성장 완만화에 맞춤: 1.07 → 약 1.031)
  ROLL_SKEW: 1.2,   // 엔드게임 드랍 옵션 수치의 쏠림(클수록 낮은 수치가 잘 나온다). 대장간 재굴림은 항상 균등
  BASE_END: 1.08, AFF_END: 1.30, PCT_END: 0.03,   // 엔드게임 레벨당 성장: 기본 옵션 ×1.08 · 고정값 추가옵션 ×1.30 · %옵션 범위 +0.03/레벨(ilvl 12~40)
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
  sniper: { name: "포격 저격수", tier: "elite",  ranged: true,  range: 6, hp: 150, atk: 26, interval: 2.4, windup: 0.6,  exp: 18, gold: 10, sprite: "archer", sc: 3, proj: "orb", sniper: true },   // 균열·시련 50단계+: 사거리 최대, 평타가 아픈 원거리 유닛 (공격 투사체가 크고 선명함)
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
  { id: "spark",   name: "번개 찌르기",   slot: "basic",  kind: "chain",  cd: 0.9,  mult: 1.08,  jumps: 2, decay: 0.6, range: 4, bonus: {}, unlock: 2, color: "#aee8ff", icon: "bolt", sfx: "zap", desc: "맞힌 적 뒤로 번개가 2번 튄다" },
  { id: "smash",   name: "강타",         slot: "active", kind: "single", cd: 3.0,  mult: 3.2,  range: 5, bonus: { elite: 0.3 }, unlock: 1, color: "#ffe08a", icon: "fist", sfx: "thud", desc: "강한 단일 공격, 정예에게 추가 피해" },
  { id: "bomb",    name: "폭열탄",       slot: "active", kind: "multi",  cd: 5.0,  mult: 2.0,  side: 0.8, range: 5, bonus: {}, unlock: 1, color: "#ff9a50", icon: "bomb", sfx: "boom", desc: "대상 주변 3x3 폭발" },
  { id: "lance",   name: "관통창",       slot: "active", kind: "pierce", cd: 6.0,  mult: 1.7,  range: 6, bonus: {}, unlock: 1, color: "#9dffb0", icon: "spear", sfx: "pierce", desc: "같은 줄의 적을 모두 꿰뚫는다" },
  { id: "chain",   name: "체인 라이트닝", slot: "active", kind: "chain",  cd: 5.5,  mult: 2.57,  jumps: 5, decay: 0.88, range: 5, bonus: {}, unlock: 2, color: "#9ad8ff", icon: "bolt", sfx: "zap", desc: "맞힌 적 뒤의 대각선 위·대각선 아래·바로 뒤로 무작위로 번개가 뻗는다" },
  { id: "snipe",   name: "저격",         slot: "active", kind: "single", cd: 4.0,  mult: 4.0,  range: 6, bonus: { ranged: 0.6 }, unlock: 2, color: "#d0b0ff", icon: "arrow", sfx: "snipe", desc: "원거리 유닛에게 추가 피해, 사거리 6" },
  { id: "firewall", name: "화염 벽",     slot: "active", kind: "zone",   cd: 10.0, mult: 1.4,  dur: 5, range: 5, bonus: {}, unlock: 3, color: "#ff7a30", icon: "flame", sfx: "fire", desc: "대상 줄 3칸을 5초간 불태운다" },
  { id: "sweep",   name: "소탕",         slot: "active", kind: "multi",  cd: 6.0,  mult: 1.6,  side: 0.9, range: 4, bonus: { normal: 0.4 }, unlock: 3, color: "#c0ffc0", icon: "sweep", sfx: "slash", desc: "일반 몹에게 추가 피해를 주는 광역" },
  { id: "cry",     name: "전투 함성",     slot: "active", kind: "buff",   cd: 18.0, mult: 0, dur: 8, power: 0.3, range: 6, bonus: {}, unlock: 3, color: "#ffd24a", icon: "horn", sfx: "buff", desc: "8초 동안 주는 피해 +30%" },
  { id: "execute", name: "처형",         slot: "active", kind: "single", cd: 7.0,  mult: 8,  range: 5, bonus: { boss: 0.8 }, unlock: 4, color: "#ff6a6a", icon: "skull", sfx: "snipe", desc: "보스에게 큰 추가 피해" },
  { id: "frost",   name: "빙결 파동",     slot: "active", kind: "nova",   cd: 9.0,  mult: 1.2,  range: 5, chill: 2.0, bonus: {}, unlock: 4, color: "#a8e8ff", icon: "snow", sfx: "frost", desc: "사거리 안의 모든 적에게 피해, 공격이 느려진다" },
  { id: "vamp",    name: "흡혈 참격",     slot: "active", kind: "single", cd: 4.5,  mult: 2.8,  range: 4, lifesteal: 0.25, bonus: {}, unlock: 4, color: "#ff6aa0", icon: "fang", sfx: "slash", desc: "피해의 25%를 체력으로 회복" },
  { id: "heal",    name: "치유의 빛",     slot: "active", kind: "heal",   cd: 16.0, mult: 0, power: 0.25, range: 6, bonus: {}, unlock: 4, color: "#9dffb0", icon: "heart", sfx: "heal", desc: "체력이 낮을 때 최대 체력의 25% 회복" },
  { id: "thunder", name: "낙뢰",         slot: "active", kind: "multi",  cd: 8.0,  mult: 4.32,  side: 1.0, range: 6, bonus: {}, unlock: 5, color: "#fff0a0", icon: "cloud", sfx: "boom", desc: "강력한 3x3 낙뢰" },
  { id: "boomer",  name: "회전 도끼",     slot: "active", kind: "boomer", cd: 6.0,  mult: 1.5,  range: 6, back: 0.8, bonus: {}, unlock: 5, color: "#e0e8ff", icon: "axe", sfx: "pierce", desc: "줄을 꿰뚫고 돌아오며 한 번 더 벤다" },
  { id: "pierce2", name: "섬광 관통",     slot: "active", kind: "pierce", cd: 7.0,  mult: 2.8,  range: 6, bonus: { ranged: 0.3 }, unlock: 6, color: "#fff", icon: "spear", sfx: "pierce", desc: "원거리에 추가 피해를 주는 관통" },
  { id: "meteor",  name: "유성",         slot: "active", kind: "meteor", cd: 12.0, mult: 1.6,  side: 1.0, range: 6, count: 3, bonus: { elite: 0.3, boss: 0.3 }, unlock: 7, color: "#ff8a4a", icon: "meteor", sfx: "meteor", desc: "유성 3개가 무작위 적 위에 떨어진다" },
];
const SKILL_RARITY = [   // v4: 등급이 높아도 격차가 너무 크지 않게 — 초당 피해(배율÷쿨타임) 기준 희귀 ×1.13 · 전설 ×1.28 · 신화 ×1.41 · 사탄 ×1.58 · 종말 ×1.76
  { name: "일반", mult: 1.0,  cdMul: 1.0,  bonusMul: 1.0, w: 70, cls: "r0" },
  { name: "희귀", mult: 1.10, cdMul: 0.97, bonusMul: 1.2, w: 25, cls: "r2" },
  { name: "전설", mult: 1.20, cdMul: 0.94, bonusMul: 1.4, w: 5,  cls: "r3" },
  { name: "신화", mult: 1.30, cdMul: 0.92, bonusMul: 1.55, w: 0, cls: "sk3" },
  { name: "사탄", mult: 1.42, cdMul: 0.90, bonusMul: 1.7, w: 0, cls: "sk4" },
  { name: "종말", mult: 1.55, cdMul: 0.88, bonusMul: 1.9, w: 0, cls: "sk5" },
];
// v3.23 단일 스킬은 전설부터 연타가 된다 (등급: 일반·희귀 1타 / 전설 2 / 이터널 3 / 소버린 4 / 엔젤릭 5). 총피해는 연타 수에 비례하지 않고 등급 배율 위에 작은 보너스만 붙는다 — 한 번의 피해를 연타 수만큼 나눈다
const SINGLE_HITS = [1, 1, 2, 3, 4, 5], SINGLE_HIT_BONUS = [1, 1, 1.04, 1.06, 1.08, 1.10];
const RULES = { front: "앞열(기본)", auto: "오토", boss: "보스 우선", ranged: "원거리 우선", elite: "정예 우선", normal: "일반 우선" };
const RULE_ORDER = ["front", "auto", "boss", "ranged", "elite", "normal"];

// ---- 장비 ----
const SLOTS = ["weapon", "helm", "armor", "gloves", "boots", "ring", "neck"];
const SLOT_NAME = { weapon: "무기", helm: "투구", armor: "갑옷", gloves: "장갑", ring: "반지", ring2: "반지 2", neck: "목걸이", boots: "신발" };
const EQ_SLOTS = [...SLOTS, "ring2"];   // 장비 칸: 반지는 2칸 (아이템 종류는 SLOTS, 착용 칸은 EQ_SLOTS)
const slotType = (k) => (k === "ring2" ? "ring" : k);
const slotKeys = (type) => (type === "ring" ? ["ring", "ring2"] : [type]);
const SLOT_BASE = { weapon: { atk: 6 }, helm: { def: 3, hp: 20 }, armor: { hp: 55, def: 4 }, gloves: { atk: 2, def: 1.5 }, ring: { hp: 15 }, neck: { atk: 1.5 }, boots: { hp: 22, def: 2 } };
const ITEM_RARITY = [   // v4: 일반 · 매직 · 레어 · 전설 4단계 (전설은 옵션 5개 + 소켓 1~3개)
  { name: "일반", mult: 1.0,  affixes: 0, cls: "r0", drop: 55, bossDrop: 0 },
  { name: "매직", mult: 1.15, affixes: 2, cls: "r1", drop: 30, bossDrop: 35 },
  { name: "레어", mult: 1.3,  affixes: 4, cls: "r2", drop: 13, bossDrop: 50 },
  { name: "전설", mult: 1.55, affixes: 5, cls: "r3", drop: 2,  bossDrop: 15 },
];
// 엔드게임(아이템 레벨 11+) 드랍은 일반 장비 가치가 낮다. 액트(1~10) 드랍은 그대로.
const END_RMUL = [1.0, 1.15, 1.15, 1.45, 1.3];
const rarMul = (rarity, ilvl) => ITEM_RARITY[Math.min(3, rarity)].mult;
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
// v4: 세트 장비는 삭제됨 (장비 등급은 일반·매직·레어·전설)
const SETS = [];

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
const REGION = [[520, 700], [470, 990], [740, 930], [690, 720], [440, 690], [250, 520], [420, 360], [700, 330], [980, 240], [1280, 190]];   // v4: 지역은 초원 하나뿐
const RIFT_POS = [1180, 470];
const TOWER_POS = [1560, 250];   // 문지기를 처음 쓰러뜨리면 이곳에 탑이 솟아오른다
function buildMap() {
  const nodes = [], edges = [];
  const add = (n) => { nodes.push(n); return n; };
  for (let a = 1; a <= CFG.ACTS; a++) {
    const [cx, cy] = REGION[a - 1];
    const rot = (a * 0.9) % 6.28;
    const town = add({ id: `T${a}`, kind: "town", act: a, x: cx, y: cy, name: `${ACTS[a - 1].name} 마을`, level: (a - 1) * 10 + 1 });
    const ring = [];
    for (let s = 1; s <= CFG.STAGES; s++) {
      const ang = rot + 0.55 + (s - 1) * 0.9, r = 90 + ((s % 2) ? 8 : -6);
      const n = add({ id: `S${a}-${s}`, kind: s === CFG.STAGES ? "boss" : "stage", act: a, stage: s, x: Math.round(cx + Math.cos(ang) * r * 1.35), y: Math.round(cy + Math.sin(ang) * r), name: s === CFG.STAGES ? BOSSES[ACTS[a - 1].boss].name : `${ACTS[a - 1].name} ${s}`, level: (a - 1) * 10 + s });
      ring.push(n);
    }
    edges.push([town.id, ring[0].id]);
    for (let i = 0; i < CFG.STAGES - 1; i++) edges.push([ring[i].id, ring[i + 1].id]);
    ring.last = ring[ring.length - 1];
  }
  const rift = add({ id: "R", kind: "rift", act: 11, x: RIFT_POS[0], y: RIFT_POS[1], name: "심연의 균열", level: 100 });
  edges.push([`S${CFG.ACTS}-${CFG.STAGES}`, rift.id]);
  const endless = add({ id: "RE", kind: "endless", act: 11, x: RIFT_POS[0] - 20, y: RIFT_POS[1] + 120, name: "무한 균열", level: 100 });
  const voidn = add({ id: "RV", kind: "void", act: 11, x: RIFT_POS[0] + 130, y: RIFT_POS[1] + 40, name: "공허의 군주", level: 100 });
  const flame = add({ id: "RH", kind: "hive", act: 11, x: RIFT_POS[0] + 120, y: RIFT_POS[1] - 110, name: "화염 정령왕", level: 100 });
  const titan = add({ id: "RT", kind: "titan", act: 11, x: RIFT_POS[0] + 10, y: RIFT_POS[1] - 175, name: "철갑의 투사", level: 100 });
  const stormn = add({ id: "RS", kind: "storm", act: 11, x: RIFT_POS[0] + 125, y: RIFT_POS[1] + 160, name: "뇌제", level: 100 });
  const vault = add({ id: "RG", kind: "vault", act: 11, x: RIFT_POS[0] - 160, y: RIFT_POS[1] + 50, name: "황금 보물고", level: 100 });
  const gate = add({ id: "RX", kind: "raid", act: 11, x: RIFT_POS[0] - 150, y: RIFT_POS[1] - 150, name: "심연의 문", level: 100 });
  const tower = add({ id: "RTW", kind: "tower", act: 11, x: TOWER_POS[0], y: TOWER_POS[1], name: "솟아난 탑", level: 100 });
  edges.push([rift.id, gate.id]); edges.push([gate.id, tower.id]);
  edges.push([rift.id, endless.id]); edges.push([rift.id, voidn.id]); edges.push([rift.id, flame.id]); edges.push([rift.id, titan.id]); edges.push([rift.id, stormn.id]); edges.push([rift.id, vault.id]);
  // 겹치는 노드를 서로 밀어낸다 (마을/균열 입구는 고정)
  const fixed = (n) => n.kind === "town" || n.kind === "rift" || n.kind === "tower";
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
  q.push({ id: "f2", act: 1, title: "소켓의 비밀", desc: "미확인의 돌을 제련소에서 확인한다.", goal: { type: "stone", n: 1 }, reward: { exp: 0, gold: 400, ore: 6 } });
  q.push({ id: "r1", act: 1, title: "균열의 도전자", desc: "심연의 균열에서 3층을 클리어한다.", goal: { type: "rift", n: 3 }, reward: { exp: 0, gold: 300, ore: 10, shards: 3 } });
  return q;
}
// 길드 패시브: 길드 레벨이 오르면 누적으로 열린다 (길드 기본 혜택 골드·경험치·MF와 별도)
const GUILD_PASSIVES = [
  { lv: 1, text: "공격력 +2%", per: { atkPct: 0.02 } }, { lv: 2, text: "체력 +3%", per: { hpPct: 0.03 } }, { lv: 3, text: "쿨타임 감소 +2%", per: { cdr: 0.02 } },
  { lv: 4, text: "방어력 +4%", per: { defPct: 0.04 } }, { lv: 5, text: "주문력 +3%", per: { magPct: 0.03 } }, { lv: 6, text: "보스 추가 피해 +5%", per: { boss: 0.05 } },
  { lv: 7, text: "생명력 흡수 +0.5%", per: { lifesteal: 0.005 } }, { lv: 8, text: "치명타 피해 +10%", per: { critDmg: 0.10 } }, { lv: 9, text: "주는 피해 +4%", per: { allDmg: 0.04 } },
  { lv: 10, text: "체력 +5% · 공격력/주문력 +4%", per: { hpPct: 0.05, atkPct: 0.04, magPct: 0.04 } },
];
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
// v4: 아이템 레벨은 T1~T5 (균열 20층마다 한 단계). 단계별 성장 배율 표
const TIER_SCALE = [1, 1.5, 2.2, 3.2, 4.6];
const gScale = (ilvl) => TIER_SCALE[Math.max(0, Math.min(4, ilvl - 1))];
// v3.23 엔드게임(아이템 레벨 11+) 성장 완만화: 기본 옵션은 레벨당 조금만 오르고, 아래쪽 추가 옵션(고정값·%)의 범위가 더 크게 오른다.
// 아주 좋은 전설은 아이템 레벨이 한두 단계 올라도 계속 쓸 수 있어야 한다. 액트(1~10) 장비는 그대로.
const gBase = (ilvl) => gScale(ilvl);
const gAff = (ilvl) => gScale(ilvl);
// v3.23 옵션 티어 (PoE식, 엔드게임 아이템 레벨 11+): 옵션마다 T1(최고)~T5가 있고, 아이템 레벨이 오를수록 더 높은 티어가 "나올 수 있게" 열린다.
// 높은 티어일수록 뽑힐 가중치가 훨씬 낮아서, 아이템 레벨이 높아도 최고 티어는 드물다. 티어 수치 범위는 서로 겹친다. (인덱스 0 = T1)
// v4: 옵션 티어 1~6 (인덱스 0 = 1티어 = 최고, 5 = 6티어 = 최저). 6티어가 가장 잘 나오고 1티어가 가장 드물다. 높은 티어는 아이템 T가 높아야 나올 수 있다
const AT = { unlock: [5, 4, 3, 2, 1, 1], w: [1, 3, 8, 18, 30, 40], flat: [3.0, 2.3, 1.75, 1.35, 1.05, 0.8], pct: [1.7, 1.5, 1.3, 1.15, 1.0, 0.85] };
const atAvail = (ilvl) => [0, 1, 2, 3, 4, 5].filter((i) => ilvl >= AT.unlock[i]);
const atPick = (ilvl) => wpick(atAvail(ilvl), (i) => AT.w[i]);
const atMul = (a, t) => (a.count ? 1 : a.flat ? AT.flat[t] : a.pct ? AT.pct[t] : 1);
const pctScale = (ilvl) => 0.80 + 0.04 * Math.min(ilvl, 5);
const actScale = (a) => (CFG.EASE[a - 1] || 1) * Math.pow(CFG.G, Math.min(a, 10) - 1) * (1 + CFG.LEVEL_STEP * (10 * Math.min(a, 10) - 5)) / (1 + CFG.LEVEL_STEP * 5);
const nodeLevel = (n) => n.level;
const eliteCount = (stage) => (stage >= 2 ? 1 + Math.floor(stage / 2) : 0);
const planSize = (stage) => CFG.WAVE_BASE + CFG.WAVE_STAGE * stage + eliteCount(stage) + (stage === CFG.STAGES ? 1 : 0);
