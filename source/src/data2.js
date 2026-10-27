// =========================================================
// 확장 데이터: 지역 몬스터 / 고유장비 / 패시브 / 심연 각인 / 월드 버프 / 엔드게임
// =========================================================
CFG.BASE_DODGE = 0;                // 기본 회피 없음 — 패시브·장비로만 얻는다
CFG.UNIQUE_BASE = 0.0005;          // 고유 장비: 드랍 1개당 기준 확률 (0.05%)
CFG.PROTO_MULT = 2;                // 프로토타입 보정 ×2 (이전 ×20은 너무 후했음, 정식 출시 때 1로)
CFG.WARP_CHANCE = 0.12;            // (공허의 열쇠와 정령의 불씨 모두 같은 확률)
CFG._unused = 0;            // 공허의 열쇠(왜곡체) 전투당 등장 확률 — 균열 단계와 무관
CFG.WORLD_MIN = 20;                // 월드 버프/지옥 스테이지 갱신 주기 (분)
CFG.ENDLESS_DAILY = 3;             // 무한 균열 하루 입장 횟수
CFG.ILVL_RIFT_STEP = 8;            // 균열 N단계마다 드랍 아이템 레벨 +1
CFG.PASSIVE_START = 4;             // 레벨 5부터 레벨당 패시브 포인트 1

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
ITEM_RARITY.push({ name: "고유", mult: 1.7, affixes: 0, cls: "r5", drop: 0, bossDrop: 0 });
// (고유 장비는 data3.js 에서 정의)


// ---------------------------------------------------------------
// 심연 각인 (엔드게임 재화 트리) — 한 단계는 소폭, 다 찍으면 큰 효과
// ---------------------------------------------------------------
const ATLAS = [
  { id: "gold", name: "황금의 인장", max: 10, per: 0.03, unit: "%", text: "골드 획득 +3%", cost: 6 },
  { id: "exp", name: "지혜의 인장", max: 10, per: 0.03, unit: "%", text: "경험치 +3%", cost: 6 },
  { id: "ore", name: "단조의 인장", max: 10, per: 0.04, unit: "%", text: "강화석 획득 +4%", cost: 6 },
  { id: "orb", name: "혼돈의 인장", max: 10, per: 0.04, unit: "%", text: "구슬 획득 +4%", cost: 8 },
  { id: "shard", name: "균열의 인장", max: 10, per: 0.04, unit: "%", text: "균열 조각 +4%", cost: 8 },
  { id: "key", name: "열쇠의 인장", max: 10, per: 0.05, unit: "%", text: "공허의 열쇠 획득 +5%", cost: 10 },
  { id: "mf", name: "행운의 인장", max: 10, per: 0.02, unit: "%", text: "MF +2%", cost: 10 },
  { id: "hell", name: "지옥의 인장", max: 10, per: 0.05, unit: "%", text: "지옥 스테이지 보상 +5%", cost: 12 },
  { id: "endless", name: "무한의 인장", max: 2, per: 1, unit: "회", text: "무한 균열 하루 입장 +1", cost: 60, grow: 2.5 },
];
const atlasCost = (n, rank) => Math.round(n.cost * (1 + rank * (n.grow || 0.55)) * (n.max > 5 ? 1 : 1));
const atlasVal = (sv, id) => { const n = ATLAS.find((x) => x.id === id); return n ? ((sv.atlas && sv.atlas[id]) || 0) * n.per : 0; };

// ---------------------------------------------------------------
// 월드 버프 (엔드게임: 일정 시간마다 무작위로 바뀐다) + 지옥 스테이지
// ---------------------------------------------------------------
const WORLD_BUFFS = [
  { id: "alch", name: "연금술사의 축복", text: "구슬 드랍 ×3", orb: 3, ico: "orb" },
  { id: "wisdom", name: "현자의 축복", text: "경험치 ×2", exp: 2, ico: "shard" },
  { id: "plunder", name: "약탈자의 축복", text: "장비 드랍 ×2", qty: 2, ico: "weapon" },
  { id: "gold", name: "황금의 축복", text: "골드 ×2", gold: 2, ico: "gold" },
  { id: "luck", name: "행운의 축복", text: "MF +100%", mf: 1.0, ico: "ring" },
  { id: "call", name: "고유의 부름", text: "고유 장비 확률 ×2", unique: 2, ico: "neck" },
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
BOSSES.push({ id: "void", name: "공허의 군주 모르가스", w: 3, h: 2, hp: 2100, atk: 28, range: 4, interval: 2.2, windup: 0.9, exp: 400, gold: 400, sc: 4, hue: 250, art: 9,
  abilities: [{ id: "summon", every: 11, count: 5, type: "imp", text: "공허의 졸개가 몰려온다!" }, { id: "shield", every: 22, dur: 9, adds: 5, text: "공허의 장막! 졸개를 처치하라!" }, { id: "charge", every: 15, windup: 2.4, mult: 3.8, interrupt: 0.05, text: "공허의 일격을 모은다!" },
    { id: "curse", every: 14, dur: 6, mult: 0.35, text: "공허의 저주!" }, { id: "rain", every: 10, hits: 5, mult: 0.5, text: "공허의 별이 쏟아진다!" }, { id: "enrage", at: 0.3, text: "모르가스가 공허를 해방한다!" }, { id: "wound", every: 15, dur: 6, mult: 0.5, text: "저주받은 상처! 생명력 흡수·회복이 반감된다!" }], desc: "소환 · 방어막 · 충전 · 저주 · 불비 · 분노 · 치유 감소" });
const VOID_BOSS = BOSSES[BOSSES.length - 1];
// 화염 정령왕: 불꽃 정령이 끝없이 몰려오고, 정령을 모두 처치해야만 왕에게 피해를 줄 수 있다. 화염 빌드 장비를 준다.
BOSSES.push({ id: "flame", name: "화염 정령왕 아스카", w: 3, h: 2, hp: 2000, atk: 26, range: 4, interval: 2.2, windup: 0.9, exp: 300, gold: 300, sc: 4, hue: 330, art: 6, hive: true,
  abilities: [{ id: "summon", every: 12, count: 9, type: "imp", text: "불꽃 정령이 몰려온다! 모두 처치해야 왕을 벨 수 있다!" }, { id: "wound", every: 13, dur: 7, mult: 0.5, text: "작열의 낙인! 생명력 흡수·회복이 반감된다!" }, { id: "rain", every: 11, hits: 5, mult: 0.5, text: "불씨가 쏟아진다!" },
    { id: "charge", every: 17, windup: 2.4, mult: 3.4, interrupt: 0.05, text: "아스카가 불길을 모은다!" }, { id: "enrage", at: 0.3, text: "아스카가 타오른다!" }], desc: "불꽃 정령 대군 · 정령을 모두 처치해야 피해를 줄 수 있음 · 치유 감소 · 불비" });
const HIVE_BOSS = BOSSES[BOSSES.length - 1];
const HWARP = { name: "정령의 불씨", tier: "elite", ranged: false, range: 1, hp: 50, atk: 6, interval: 3, windup: 0.8, exp: 30, gold: 20, sprite: "eye", sc: 2, warp: true, hwarp: true };
const HIVE_TIERS = [22, 32, 45, 60], HIVE_NEED = [15, 22, 32, 45], HIVE_TIER = HIVE_TIERS[0], HIVE_MIN_RIFT = HIVE_NEED[0];   // 단계별 난이도(균열 단계 수준)와 입장 조건(균열 최고 단계)
const WARP = { name: "왜곡체", tier: "elite", ranged: false, range: 1, hp: 50, atk: 6, interval: 3, windup: 0.8, exp: 30, gold: 20, sprite: "eye", sc: 2, warp: true };

const VOID_MIN_RIFT = 25;   // 공허의 군주 입장: 균열을 어느 정도 돌아 장비를 맞춘 뒤에
const MAX_TRIAL = 100;   // 스킬 시련 최대 단계
CFG.TRIAL_SCALE = 1.085;    // 시련은 균열(1.07)보다 단계당 더 가파르게 강해진다
