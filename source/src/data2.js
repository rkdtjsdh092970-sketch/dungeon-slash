// =========================================================
// 확장 데이터: 지역 몬스터 / 고유장비 / 패시브 / 심연 각인 / 월드 버프 / 엔드게임
// =========================================================
CFG.BASE_DODGE = 0;                // 기본 회피 없음 — 패시브·장비로만 얻는다
CFG.UNIQUE_BASE = 0.0005;          // 고유 장비: 드랍 1개당 기준 확률 (0.05%)
CFG.PROTO_MULT = 2;                // 프로토타입 보정 ×2 (이전 ×20은 너무 후했음, 정식 출시 때 1로)
CFG.RIFT_ATK_EXP = 1.8; CFG.RIFT_ATK_PIVOT = 25;   // 균열·시련·지옥 몹 공격력: 25단계부터는 단계당 상승이 가팔라진다 (체력은 그대로). 장비 성장에 맞춰 높은 단계에서 더 아프게
CFG.LS_BASE = 0.006; CFG.LS_PER = 0.45; CFG.LS_MAX = 0.10;   // 생명력 흡수 회복 상한(초당 최대 체력 비율) = 기본 + 흡수% × 계수, 최대치
CFG.VOID4_ANGELIC_W = 3;   // 공허 4단계: 엔젤릭 가중치(나머지 21)
CFG.VAULT_GOLD = 6; CFG.VAULT_TIER_K = 0.6;   // 황금 보물고: 골드 배율, 난이도 = 내 최고 균열 단계 × 계수
CFG.WARP_CHANCE = 0.03;            // (공허의 열쇠와 정령의 불씨 모두 같은 확률)
CFG._unused = 0;            // 공허의 열쇠(왜곡체) 전투당 등장 확률 — 균열 단계와 무관
CFG.WORLD_MIN = 20;                // 월드 버프/지옥 스테이지 갱신 주기 (분)
CFG.ENDLESS_DAILY = 3;             // 무한 균열 하루 입장 횟수
CFG.ILVL_RIFT_STEP = 20;           // 균열 N단계마다 드랍 아이템 레벨 +1
CFG.PASSIVE_START = 0;             // v4: 레벨 1부터 레벨당 패시브 포인트 (균열 1층 클리어 = 1레벨)
CFG.PASSIVE_PER_LV = 2;            // 레벨당 패시브 포인트
CFG.BOSS_FLOOR_K = 0.8; CFG.FLOOR_G = 1.040; CFG.FLOOR_J = 1.35; CFG.FLOOR_ATKP = 0.85; CFG.BOSS_RIFT_K = 0.4;   // v4 균열 층 난이도 (층당 · 20층 구간 점프 · 공격력 지수 · 보스 보정)
// v4 층별 몬스터 강도 표: 각 20층 구간의 마지막 층(19·39·59·79·99)에서 "그 구간 장비를 충분히 파밍한 캐릭터"가 겨우 클리어하는 값(앵커)을 시뮬레이션으로 맞췄다.
// 구간이 바뀌는 층(20·40·60·80·100, 보스)에서 FLOOR_JUMP배로 한 번에 뛰고, 구간 안에서는 앵커까지 완만하게(지수 보간) 오른다. 100층 이후는 층당 FLOOR_TAIL배.
CFG.FLOOR_ANCH = [15, 34, 230, 380, 700]; CFG.FLOOR_JUMP = 1.10; CFG.FLOOR_START = 0.55; CFG.FLOOR_TAIL = 1.06;
CFG.FLOOR_TAB = (() => { const tab = [], E = [19, 39, 59, 79, 99], A = CFG.FLOOR_ANCH; for (let f = 1; f <= 100; f++) { const T = Math.min(4, Math.floor(f / 20)), s = T === 0 ? CFG.FLOOR_START : CFG.FLOOR_JUMP * A[T - 1], sf = T === 0 ? 1 : 20 * T, w = Math.max(0, Math.min(1, (f - sf) / Math.max(1, E[T] - sf))); tab.push(s * Math.pow(A[T] / s, w)); } return tab; })();

// ---------------------------------------------------------------
// 스프라이트 메타: file=시트 키, cell=칸 크기(px), h=머리 위 표시용 높이
// ---------------------------------------------------------------
const SPR_META = {
  c_imp: { cell: 32, h: 26 }, c_goblin: { cell: 32, h: 28 }, c_archer: { cell: 32, h: 28 }, c_shaman: { cell: 32, h: 30 }, c_brute: { cell: 32, h: 28 },
  ghoul: { cell: 48, h: 40 }, skel: { cell: 48, h: 42 }, necro: { cell: 48, h: 44 }, brute: { cell: 48, h: 42 }, fiend: { cell: 48, h: 40 },
  slime: { cell: 48, h: 24 }, slimeT: { cell: 48, h: 24 }, slimeL: { cell: 48, h: 24 }, mush: { cell: 48, h: 40 }, mushT: { cell: 48, h: 40 },
  bat: { cell: 48, h: 36 }, batC: { cell: 48, h: 36 }, scorp: { cell: 48, h: 34 }, wolf: { cell: 48, h: 36 }, wolfH: { cell: 48, h: 36 },
  eye: { cell: 48, h: 40 }, golem: { cell: 48, h: 42 }, golemI: { cell: 48, h: 42 }, golemM: { cell: 48, h: 42 }, frog: { cell: 48, h: 32 },
};
// 지역별 로스터: [무리, 근접, 궁수, 주술사, 정예, 특수]  (sprite 키 / 색조)
const ROSTER = [
  [["c_imp"], ["c_goblin"], ["c_archer"], ["c_shaman"], ["c_brute"], ["slime"]],                    // 1 초원: 평화롭고 귀여운
  [["batC"], ["c_goblin", 45], ["c_archer", 45], ["c_shaman", 20], ["c_brute", 40], ["mush"]],      // 2 숲
  [["bat"], ["ghoul"], ["skel"], ["necro"], ["golem"], ["ghoul", 20]],                              // 3 폐광: 어두워지기 시작
  [["bat", 40], ["ghoul", 55], ["skel", 30], ["necro", 40], ["brute", 20], ["scorp"]],              // 4 사막
  [["slimeT"], ["ghoul", 85], ["skel", 100], ["necro", 100], ["brute", 100], ["frog"]],             // 5 늪지
  [["bat", 170], ["ghoul", 150], ["skel", 160], ["necro", 160], ["golemI"], ["wolf"]],              // 6 설원
  [["fiend"], ["ghoul", -35], ["skel", -30], ["necro", -70], ["golemM"], ["slimeL"]],               // 7 화산
  [["bat", -80], ["ghoul", 250], ["skel", 270], ["necro", 280], ["brute", -90], ["eye"]],           // 8 심연
  [["batC", 55], ["ghoul", 50], ["skel", 55], ["necro", 55], ["brute", 55], ["golem"]],             // 9 천공성
  [["fiend"], ["ghoul", -60], ["skel", -20], ["necro", -30], ["brute", -20], ["wolfH"]],            // 10 마계
];
// 지역 특수 몬스터 (무리/근접과 달리 고유한 성질)
// traits: split(죽으면 분열) poison chill curse explode(자폭) fast tank regen
const ACT_SPECIAL = [
  { name: "분열 슬라임", hp: 26, atk: 5, interval: 2.2, windup: 0.5, range: 1, exp: 2, gold: 2, sc: 2, traits: ["split"], desc: "죽으면 작은 슬라임 둘로 갈라진다" },
  { name: "독버섯", hp: 60, atk: 6, interval: 2.4, windup: 0.6, range: 1, exp: 3, gold: 2, sc: 2, traits: ["poison", "tank"], desc: "맞으면 중독된다" },
  { name: "폭탄 구울", hp: 34, atk: 8, interval: 1.2, windup: 0.5, range: 1, exp: 3, gold: 2, sc: 2, traits: ["explode"], desc: "다가와 자폭한다" },
  { name: "모래 전갈", hp: 40, atk: 8, interval: 1.4, windup: 0.4, range: 1, exp: 3, gold: 2, sc: 2, traits: ["poison", "fast"], desc: "재빠르고 독이 있다" },
  { name: "늪 두꺼비", hp: 90, atk: 7, interval: 2.4, windup: 0.7, range: 3, exp: 4, gold: 3, sc: 2, traits: ["regen", "tank"], desc: "단단하고 스스로 회복한다" },
  { name: "서리 늑대", hp: 55, atk: 9, interval: 1.3, windup: 0.4, range: 1, exp: 4, gold: 3, sc: 2, traits: ["chill", "fast"], desc: "빠르고 공격이 느려지게 한다" },
  { name: "용암 슬라임", hp: 70, atk: 10, interval: 2.4, windup: 0.6, range: 2, exp: 4, gold: 3, sc: 2, traits: ["explode", "tank"], desc: "단단하고 터지며 화상을 입힌다" },
  { name: "심연의 눈", hp: 60, atk: 11, interval: 2.8, windup: 0.9, range: 5, exp: 5, gold: 3, sc: 2, traits: ["curse"], desc: "저주를 걸어 받는 피해를 늘린다" },
  { name: "석상 수호자", hp: 130, atk: 11, interval: 2.8, windup: 0.9, range: 2, exp: 6, gold: 4, sc: 2, traits: ["tank", "regen"], desc: "매우 단단하다" },
  { name: "지옥견", hp: 70, atk: 14, interval: 1.1, windup: 0.4, range: 1, exp: 6, gold: 4, sc: 2, traits: ["fast"], desc: "엄청난 속도로 물어뜯는다" },
];
const SPEC_W = (act, stage) => (stage >= 2 ? 11 + act : 0);    // 특수 몹 출현 가중치

// ---------------------------------------------------------------
// 고유 장비 — 확률은 지독하게 낮지만 게임의 규칙을 바꾸는 옵션
// mods: [키, 값 또는 [최소,최대]]
// ---------------------------------------------------------------
// (고유 장비는 data3.js 에서 정의)


// ---------------------------------------------------------------
// 심연 각인 (엔드게임 재화 트리) — 한 단계는 소폭, 다 찍으면 큰 효과
// ---------------------------------------------------------------
const ATLAS = [
  { id: "gold", name: "황금의 인장", max: 10, per: 0.03, unit: "%", text: "골드 획득 +3%", cost: 6 },
  { id: "conq", name: "정복자의 인장", max: 10, per: 0.02, unit: "%", text: "보스 추가 피해 +2%", cost: 14 },
  { id: "ore", name: "단조의 인장", max: 10, per: 0.04, unit: "%", text: "강화석 획득 +4%", cost: 6 },
  { id: "orb", name: "혼돈의 인장", max: 10, per: 0.04, unit: "%", text: "구슬 획득 +4%", cost: 8 },
  { id: "shard", name: "균열의 인장", max: 10, per: 0.04, unit: "%", text: "균열 조각 +4%", cost: 8 },
  { id: "key", name: "열쇠의 인장", max: 10, per: 0.05, unit: "%", text: "공허의 열쇠 획득 +5%", cost: 10 },
  { id: "mf", name: "행운의 인장", max: 10, per: 0.02, unit: "%", text: "MF +2%", cost: 10 },
  { id: "guard", name: "수호의 인장", max: 10, per: 0.01, unit: "%", text: "받는 피해 −1%", cost: 14 },
  { id: "endless", name: "무한의 인장", max: 2, per: 1, unit: "회", text: "무한 균열 하루 입장 +1", cost: 60, grow: 2.5 },
];
const atlasCost = (n, rank) => Math.round(n.cost * 1.6 * (1 + rank * (n.grow || 0.6)));   // 조각 수급을 줄이고 단가를 올려 천천히 올린다
const atlasVal = (sv, id) => { const n = ATLAS.find((x) => x.id === id); return n ? ((sv.atlas && sv.atlas[id]) || 0) * n.per : 0; };

// ---------------------------------------------------------------
// 월드 버프 (엔드게임: 일정 시간마다 무작위로 바뀐다) + 지옥 스테이지
// ---------------------------------------------------------------
const WORLD_BUFFS = [
  { id: "alch", name: "연금술사의 축복", text: "구슬 드랍 ×3", orb: 3, ico: "orb" },
  { id: "wisdom", name: "탐구자의 축복", text: "미확인의 돌 드랍 ×2", stone: 2, ico: "shard" },
  { id: "plunder", name: "약탈자의 축복", text: "장비 드랍 ×2", qty: 2, ico: "weapon" },
  { id: "gold", name: "황금의 축복", text: "골드 ×2", gold: 2, ico: "gold" },
  { id: "luck", name: "행운의 축복", text: "MF +100%", mf: 1.0, ico: "ring" },
  { id: "keys", name: "공허의 속삭임", text: "열쇠 ×2", key: 2, ico: "skull" },
];
const worldSlot = (now) => Math.floor((now || Date.now()) / (CFG.WORLD_MIN * 60000));
const worldLeft = (now) => { now = now || Date.now(); return (worldSlot(now) + 1) * CFG.WORLD_MIN * 60000 - now; };
function worldBuffs(now) {
  const r = seeded(worldSlot(now) * 7919 + 101), pool = WORLD_BUFFS.slice(), out = [];
  for (let i = 0; i < 2; i++) out.push(pool.splice(Math.floor(r() * pool.length), 1)[0]);
  return out;
}
function hellNodes(now) {
  const r = seeded(worldSlot(now) * 104729 + 7), ids = new Set();
  while (ids.size < 6) ids.add(`S${1 + Math.floor(r() * 10)}-${1 + Math.floor(r() * 9)}`);
  return ids;
}

// ---------------------------------------------------------------
// 엔드게임 보스 / 특수 몹
// ---------------------------------------------------------------
BOSSES.push({ id: "void", name: "공허의 군주 모르가스", w: 3, h: 2, hp: 2100, atk: 28, range: 4, interval: 2.2, windup: 0.9, exp: 400, gold: 400, sc: 4, hue: 0, art: 10,
  abilities: [{ id: "summon", every: 11, count: 5, type: "imp", text: "공허의 졸개가 몰려온다!" }, { id: "shield", every: 22, dur: 9, adds: 5, text: "공허의 장막! 졸개를 처치하라!" }, { id: "charge", every: 15, windup: 2.4, mult: 3.8, interrupt: 0.05, text: "공허의 일격을 모은다!" },
    { id: "curse", every: 14, dur: 6, mult: 0.35, text: "공허의 저주!" }, { id: "rain", every: 10, hits: 5, mult: 0.5, text: "공허의 별이 쏟아진다!" }, { id: "enrage", at: 0.3, text: "모르가스가 공허를 해방한다!" }, { id: "wound", every: 15, dur: 6, mult: 0.5, text: "저주받은 상처! 생명력 흡수·회복이 반감된다!" }], desc: "소환 · 방어막 · 충전 · 저주 · 불비 · 분노 · 치유 감소" });
const VOID_BOSS = BOSSES[BOSSES.length - 1];
// 화염 정령왕: 불꽃 정령이 끝없이 몰려오고, 정령을 모두 처치해야만 왕에게 피해를 줄 수 있다. 화염 빌드 장비를 준다.
BOSSES.push({ id: "flame", name: "화염 정령왕 아스카", w: 3, h: 2, hp: 2000, atk: 26, range: 4, interval: 2.2, windup: 0.9, exp: 300, gold: 300, sc: 4, hue: 0, art: 11, hive: true,
  abilities: [{ id: "summon", every: 12, count: 9, type: "imp", text: "불꽃 정령이 몰려온다! 모두 처치해야 왕을 벨 수 있다!" }, { id: "wound", every: 13, dur: 7, mult: 0.5, text: "작열의 낙인! 생명력 흡수·회복이 반감된다!" }, { id: "rain", every: 11, hits: 5, mult: 0.5, text: "불씨가 쏟아진다!" },
    { id: "charge", every: 17, windup: 2.4, mult: 3.4, interrupt: 0.05, text: "아스카가 불길을 모은다!" }, { id: "enrage", at: 0.3, text: "아스카가 타오른다!" }], desc: "불꽃 정령 대군 · 정령을 모두 처치해야 피해를 줄 수 있음 · 치유 감소 · 불비" });
const HIVE_BOSS = BOSSES[BOSSES.length - 1];
// 철갑의 투사 그라크 (물리 전용): 철갑 태세 중에는 직접 타격이 거의 통하지 않아 출혈·중독 같은 지속 피해가 필요하다. 가시 갑옷은 스킬 피해를 되돌려준다. 물리 빌드 장비를 준다.
BOSSES.push({ id: "titan", name: "철갑의 투사 그라크", w: 3, h: 2, hp: 2200, atk: 27, range: 4, interval: 2.2, windup: 0.9, exp: 320, gold: 320, sc: 4, hue: 0, art: 12, titan: true,
  abilities: [{ id: "plate", every: 19, dur: 7, red: 0.85, text: "철갑 태세! 직접 타격이 거의 통하지 않는다 — 출혈·중독 같은 지속 피해로 뚫어라!" }, { id: "reflect", every: 24, dur: 6, pct: 0.18, text: "가시 갑옷! 스킬로 때릴수록 피해가 되돌아온다!" },
    { id: "summon", every: 14, count: 7, type: "grunt", text: "철갑 병사들이 몰려온다!" }, { id: "wound", every: 15, dur: 6, mult: 0.5, text: "분쇄된 뼈! 생명력 흡수·회복이 반감된다!" },
    { id: "rain", every: 12, hits: 4, mult: 0.7, text: "대지가 갈라진다!" }, { id: "charge", every: 18, windup: 2.6, mult: 3.8, interrupt: 0.05, text: "그라크가 도끼를 높이 치켜든다!" }, { id: "enrage", at: 0.3, text: "그라크가 광란한다!" }], desc: "철갑 태세(직접 타격 감소) · 가시 갑옷(반사) · 병사 소환 · 치유 감소 · 대지 가르기" });
const TITAN_BOSS = BOSSES[BOSSES.length - 1];
// 뇌제 라이곤 (번개 전용): 피뢰침이 살아 있는 동안 계속 감전되어 받는 피해가 커지고, 연쇄 번개와 감전 마비가 몰아친다. 번개 빌드 장비를 준다.
BOSSES.push({ id: "storm", name: "뇌제 라이곤", w: 3, h: 2, hp: 2000, atk: 26, range: 4, interval: 2.0, windup: 0.8, exp: 320, gold: 320, sc: 4, hue: 0, art: 13, storm: true,
  abilities: [{ id: "pylon", every: 17, count: 3, text: "피뢰침이 솟는다! 살아 있는 동안 감전되어 받는 피해가 커진다 — 부숴라!" }, { id: "chainbolt", every: 11, hits: 8, mult: 0.32, text: "연쇄 번개!" },
    { id: "freeze", every: 21, dur: 1.5, text: "감전! 몸이 굳는다!" }, { id: "charge", every: 17, windup: 2.4, mult: 3.6, interrupt: 0.05, text: "라이곤이 번개를 모은다!" },
    { id: "summon", every: 15, count: 6, type: "imp", text: "스파크가 튄다!" }, { id: "enrage", at: 0.3, text: "라이곤이 폭풍을 해방한다!" }], desc: "피뢰침(감전 누적) · 연쇄 번개 · 감전 마비 · 과부하 방전" });
const STORM_BOSS = BOSSES[BOSSES.length - 1];
const TWARP = { name: "철갑의 징표", tier: "elite", ranged: false, range: 1, hp: 50, atk: 6, interval: 3, windup: 0.8, exp: 30, gold: 20, sprite: "eye", sc: 2, warp: true, twarp: true };
const SWARP = { name: "뇌전의 징표", tier: "elite", ranged: false, range: 1, hp: 50, atk: 6, interval: 3, windup: 0.8, exp: 30, gold: 20, sprite: "eye", sc: 2, warp: true, swarp: true };
// 속성 보스 공통 표: 열쇠 종류·저장 필드·입장 조건·난이도 (화염=hive, 물리=titan, 번개=storm)
const EB = {
  hive: { boss: HIVE_BOSS, pool: "fire", name: "화염 정령왕", key: "keys2", wtype: "hwarp", keyName: "정령의 불씨", stage: "hiveStage", sm: "hsm", sp: "hsp", icon: "🔥", color: "#ffb070", angel: "화염 정령왕의 관" },
  titan: { boss: TITAN_BOSS, pool: "phys", name: "철갑의 투사", key: "keys3", wtype: "twarp", keyName: "철갑의 징표", stage: "titanStage", sm: "tsm", sp: "tsp", icon: "⚔", color: "#d8c8b0", angel: "거신의 대검" },
  storm: { boss: STORM_BOSS, pool: "light", name: "뇌제", key: "keys4", wtype: "swarp", keyName: "뇌전의 징표", stage: "stormStage", sm: "ssm", sp: "ssp", icon: "⚡", color: "#ffe45a", angel: "뇌제의 심장" },
};
const isEB = (k) => !!EB[k];
const HWARP = { name: "정령의 불씨", tier: "elite", ranged: false, range: 1, hp: 50, atk: 6, interval: 3, windup: 0.8, exp: 30, gold: 20, sprite: "eye", sc: 2, warp: true, hwarp: true };
const HIVE_TIERS = [100, 108, 116, 124], HIVE_NEED = [100, 100, 100, 100], HIVE_TIER = HIVE_TIERS[0], HIVE_MIN_RIFT = HIVE_NEED[0];
EB.hive.tiers = HIVE_TIERS; EB.hive.need = HIVE_NEED; EB.titan.tiers = [102, 110, 118, 126]; EB.titan.need = [100, 100, 100, 100]; EB.storm.tiers = [102, 110, 118, 126]; EB.storm.need = [100, 100, 100, 100];   // 물리·번개는 화염보다 살짝 어렵게   // 단계별 난이도(균열 단계 수준)와 입장 조건(균열 최고 단계)
const WARP = { name: "왜곡체", tier: "elite", ranged: false, range: 1, hp: 50, atk: 6, interval: 3, windup: 0.8, exp: 30, gold: 20, sprite: "eye", sc: 2, warp: true };
const WARPS = { warp: WARP, hwarp: HWARP, twarp: TWARP, swarp: SWARP };   // 열쇠 몹 종류 → 정의

const VOID_NEED = [100, 100, 100, 100];   // 공허의 군주 단계별 입장 조건: 심연의 균열 최고 단계 (4단계는 아이템 레벨 18 장비를 균열에서 충분히 파밍한 뒤)
const VOID_MIN_RIFT = VOID_NEED[0];   // 공허의 군주 입장: 균열을 어느 정도 돌아 장비를 맞춘 뒤에
const MAX_TRIAL = 100;   // 스킬 시련 최대 단계
CFG.TRIAL_SCALE = 1.085;    // 시련은 균열(1.07)보다 단계당 더 가파르게 강해진다

// 심연의 문지기 (레이드): 거의 최종 스펙으로 파밍한 뒤에야 잡도록 설계한 딜 체크 보스. 체력 구간(75% · 50% · 25%)마다 결계가 펼쳐지고, 결계석을 부수지 못하면 체력이 되살아난다.
BOSSES.push({ id: "gate", name: "심연의 문지기 모르가스", w: 3, h: 2, hp: 2600, atk: 30, range: 99, interval: 2.6, windup: 1.0, exp: 0, gold: 0, sc: 6, hue: 0, art: 0, raid: true,
  abilities: [{ id: "rain", every: 11, hits: 6, mult: 0.5, text: "문지기가 심연의 불을 쏟아붓는다!" }, { id: "wound", every: 19, dur: 6, mult: 0.5, text: "저주받은 낙인! 생명력 흡수·회복이 반감된다!" },
    { id: "charge", every: 27, windup: 3.0, mult: 4.5, interrupt: 0.01, text: "문지기가 대지를 내려찍을 준비를 한다!" }, { id: "enrage", at: 0.15, text: "문지기가 마지막 힘을 쥐어짠다!" }], desc: "결계석 · 체력 되살아남 · 심연의 불 · 대지 강타" });
const RAID_BOSS = BOSSES[BOSSES.length - 1];
CFG.RAID = { ATK: 5, K: 15, CRYSTAL: 1.0, REGEN: 0.012, BLAST: 14, BLASTM: 2.0, VULN: 8, VULNM: 1.3, LIMIT: 720, THR: [0.75, 0.5, 0.25] };
