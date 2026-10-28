// =========================================================
// 확장 스킬 (상태이상 · 지속형 · 난사형 · 설치형 · 소환형 · 부채꼴)  — 엔진은 battle2.js
// shape: 효과 범위 표시용(skillArea)에도 쓰인다
// =========================================================
Object.assign(CFG, {
  BLEED: { coef: 0.5, dur: 4, cap: 8 },     // 출혈: 타격 피해의 75%를 4초에 걸쳐, 최대 8중첩
  POISON: { coef: 3.0, dur: 5, cap: 20 },   // 중독: 50%를 5초에 걸쳐, 최대 20중첩
  IGNITE: { coef: 0.38, dur: 3, cap: 1 },    // 점화: 90%를 3초에 걸쳐, 가장 강한 1개만 유지
  DOT_BOSS: 0.5, DOT_ELITE: 0.8,             // 보스/정예는 지속 피해를 덜 받는다
});
const STATUS_INFO = { shock: { name: "감전", color: "#ffe45a", st: "light" }, bleed: { name: "출혈", color: "#e03a4a", st: "phys" }, poison: { name: "중독", color: "#6ae04a", st: "poison" }, ignite: { name: "점화", color: "#ff9a30", st: "fire" } };
(function () {
  const S = (o) => Object.assign({ slot: "active", bonus: {}, side: 1 }, o);
  SKILLS.push(
    S({ id: "rend", name: "갈퀴 참격", kind: "cone", cd: 4.0, mult: 1.7, sideM: 0.7, range: 3, unlock: 2, color: "#ff6a6a", icon: "claw", sfx: "claw", dtype: "phys", mana: 12, bleed: 0.5, desc: "전방 부채꼴을 할퀴어 출혈을 일으킨다", shape: "cone" }),
    S({ id: "volley", name: "화살 비", kind: "spray", cd: 6.5, mult: 0.45, count: 10, spread: 0, range: 6, unlock: 3, color: "#e8e0c8", icon: "volley", sfx: "volley", dtype: "phys", mana: 16, proj: "arrow", desc: "약한 화살 10발을 무작위 적에게 쏟아붓는다", shape: "spray" }),
    S({ id: "venom", name: "독침 난사", kind: "spray", cd: 6.0, mult: 0.55, count: 10, range: 5, unlock: 3, color: "#6ae04a", icon: "venom", sfx: "venom", dtype: "phys", mana: 14, poison: 0.6, proj: "dart", desc: "독침 10발을 난사해 중독을 겹쳐 쌓는다", shape: "spray" }),
    S({ id: "iceshard", name: "얼음 파편", kind: "spray", cd: 5.0, mult: 0.5, count: 7, range: 5, unlock: 3, color: "#8ae0ff", icon: "shard", sfx: "shard", dtype: "mag", elem: "cold", mana: 16, chill: 1.0, proj: "shard", desc: "부채꼴로 얼음 파편 7개를 쏜다. 맞은 적은 둔화", shape: "fan" }),
    S({ id: "orbs", name: "비전 구체", kind: "orbit", cd: 14, mult: 1.0, dur: 8, every: 0.45, range: 3, unlock: 4, color: "#c58bff", icon: "orb2", sfx: "orbit", dtype: "mag", mana: 26, desc: "8초 동안 구체 3개가 주위를 돌며 가까운 적을 때린다", shape: "orbit" }),
    S({ id: "whirl", name: "칼날 회오리", kind: "aura", cd: 12, mult: 0.55, dur: 5, every: 0.4, range: 2, unlock: 4, color: "#ffb0a0", icon: "blade", sfx: "whirl", dtype: "phys", mana: 22, bleed: 0.2, desc: "5초 동안 앞줄의 모든 적을 칼날로 갈아낸다", shape: "front" }),
    S({ id: "trap", name: "폭발 지뢰", kind: "trap", cd: 9, mult: 4.2, arm: 0.8, life: 6, range: 4, unlock: 5, color: "#ffd060", icon: "trap", sfx: "trap", dtype: "phys", mana: 18, desc: "적이 모이는 곳에 지뢰를 묻는다. 밟으면 3x3 대폭발", shape: "mine" }),
    S({ id: "blizzard", name: "눈보라", kind: "zone2", zk: "snow", cd: 13, mult: 0.5, dur: 6, every: 0.5, range: 6, unlock: 5, color: "#bfeaff", icon: "snow2", sfx: "blizzard", dtype: "mag", elem: "cold", mana: 32, chill: 1.5, desc: "6초 동안 뒤쪽 넓은 구역에 눈보라가 몰아쳐 적을 둔화시킨다", shape: "wide" }),
    S({ id: "inferno", name: "화염 폭풍", kind: "zone2", zk: "flame", cd: 11, mult: 0.7, dur: 5, every: 0.5, range: 5, unlock: 6, color: "#ff7a30", icon: "inferno", sfx: "inferno", dtype: "mag", elem: "fire", mana: 30, ignite: 0.5, desc: "5초 동안 3x3 구역을 불태우고 점화시킨다", shape: "area3" }),
    S({ id: "plague", name: "역병 구름", kind: "zone2", zk: "cloud", cd: 12, mult: 0.32, dur: 6, every: 0.5, range: 5, unlock: 6, color: "#8ae04a", icon: "plague", sfx: "plague", dtype: "mag", elem: "void", mana: 28, poison: 0.5, desc: "6초 동안 3x3 독구름이 머물며 중독을 겹쳐 쌓는다", shape: "area3" }),
    S({ id: "storm", name: "뇌우", kind: "rain", cd: 12, mult: 1.42, count: 8, over: 3.0, range: 6, unlock: 7, color: "#fff08a", icon: "storm", sfx: "storm", dtype: "mag", elem: "light", mana: 34, desc: "3초 동안 하늘에서 번개 8줄기가 무작위 적을 내리친다", shape: "rain" }),
    S({ id: "spirit", name: "정령 소환", kind: "summon", cd: 15, mult: 1.3, dur: 8, every: 1.0, range: 6, unlock: 7, color: "#8affc8", icon: "spirit", sfx: "summon2", dtype: "phys", mana: 28, desc: "8초 동안 정령이 앞줄의 적을 쉬지 않고 베어낸다", shape: "front" }),
    S({ id: "voidhole", name: "공허의 심연", kind: "hole", cd: 13, mult: 0.5, dur: 3, every: 0.5, range: 5, unlock: 8, color: "#c070ff", icon: "vortex", sfx: "voidhole", dtype: "mag", elem: "void", mana: 30, desc: "3초 동안 적을 빨아들이며 갈아버리는 심연을 연다", shape: "area3" }),
    // ---- 빌드별 보스 전용기: 단일 대상, 보스에게 +100% (일반 몹에게는 평범), 빌드 고유의 상태이상/속성을 확정으로 건다 ----
    S({ id: "gut", name: "심장 도려내기", kind: "single", cd: 8, mult: 9, range: 5, bonus: { boss: 1.0 }, unlock: 5, color: "#ff6a6a", icon: "claw", sfx: "claw", dtype: "phys", mana: 20, bleed: 1.0, desc: "[출혈 빌드 · 보스 전용기] 한 대상을 베어 반드시 출혈을 일으킨다. 보스에게 +100% 피해", shape: "single" }),
    S({ id: "toxcloud", name: "독안개", kind: "zone2", zk: "cloud", cd: 11, mult: 0.5, dur: 6, every: 0.5, range: 5, unlock: 6, color: "#6ae04a", icon: "plague", sfx: "plague", dtype: "phys", mana: 26, poison: 0.6, desc: "[중독 빌드] 6초 동안 3x3 독안개가 머물며 중독을 겹쳐 쌓는다", shape: "area3" }),
    S({ id: "venomburst", name: "맹독 폭발", kind: "single", cd: 9, mult: 10, range: 5, bonus: { boss: 0.8 }, unlock: 8, color: "#8aff6a", icon: "venom", sfx: "venom", dtype: "phys", mana: 30, poison: 1.0, desc: "[중독 빌드 · 보스 전용기] 한 대상에게 맹독을 폭발시켜 반드시 중독시킨다. 보스에게 +80% 피해", shape: "single" }),
    S({ id: "toxin", name: "맹독 주입", kind: "single", cd: 8, mult: 6.5, range: 5, bonus: { boss: 1.0 }, unlock: 5, color: "#6ae04a", icon: "venom", sfx: "venom", dtype: "phys", mana: 20, poison: 1.0, desc: "[중독 빌드 · 보스 전용기] 한 대상에게 맹독을 주입해 반드시 중독시킨다. 보스에게 +100% 피해", shape: "single" }),
    S({ id: "sunbrand", name: "태양의 낙인", kind: "single", cd: 9, mult: 12, range: 6, bonus: { boss: 1.0 }, unlock: 6, color: "#ff8a40", icon: "inferno", sfx: "meteor", dtype: "mag", elem: "fire", mana: 30, ignite: 1.0, desc: "[점화·화염 빌드 · 보스 전용기] 한 대상에 태양의 낙인을 찍어 반드시 점화시킨다. 보스에게 +100% 피해", shape: "single" }),
    S({ id: "zerofrost", name: "절대영도", kind: "single", cd: 9, mult: 14.5, range: 6, bonus: { boss: 1.0 }, unlock: 6, color: "#8ae0ff", icon: "snow2", sfx: "frost", dtype: "mag", elem: "cold", mana: 30, chill: 2.0, desc: "[냉기 빌드 · 보스 전용기] 한 대상을 얼려 붙이고 크게 둔화시킨다. 보스에게 +100% 피해", shape: "single" }),
    S({ id: "judgment", name: "벼락 처형", kind: "single", cd: 8, mult: 8.5, range: 6, bonus: { boss: 1.0 }, unlock: 6, color: "#fff08a", icon: "storm", sfx: "thunder", dtype: "mag", elem: "light", mana: 28, desc: "[번개 빌드 · 보스 전용기] 한 대상에게 벼락을 내리꽂는다. 보스에게 +100% 피해", shape: "single" }),
    S({ id: "manaburst", name: "마력 응축탄", kind: "single", cd: 9, mult: 12, range: 6, bonus: { boss: 1.0 }, unlock: 7, color: "#c58bff", icon: "orb2", sfx: "orbit", dtype: "mag", mana: 55, desc: "[마나·주문 빌드 · 보스 전용기] 마나를 크게 쏟아 한 대상을 폭파한다. 마나 소모가 크다. 보스에게 +100% 피해", shape: "single" }),
    S({ id: "reaper", name: "처형자 소환", kind: "summon", cd: 18, mult: 3.0, dur: 10, every: 1.0, range: 6, bonus: { boss: 1.0 }, unlock: 8, color: "#d0a0ff", icon: "spirit", sfx: "summon2", dtype: "phys", mana: 34, desc: "[소환 빌드 · 보스 전용기] 10초 동안 처형자가 가장 강한 적을 집요하게 벤다. 보스에게 +100% 피해", shape: "front" }),
    // ---- 공허의 군주 전용 스킬 (공허의 군주만 드랍, 매우 낮은 확률): 일반 풀·상점에는 나오지 않는다 ----
    S({ id: "voidmaw", src: "void", name: "공허의 아가리", kind: "hole", cd: 14, mult: 1.1, dur: 4, every: 0.35, range: 6, unlock: 11, voidOnly: true, color: "#b070ff", icon: "voidmaw", sfx: "voidhole", dtype: "mag", elem: "void", mana: 38, bonus: { boss: 0.2, elite: 0.2 }, desc: "4초 동안 거대한 아가리가 열려 주변 적을 끌어당기며 갈아버린다", shape: "area3" }),
    S({ id: "dimslash", src: "void", name: "차원 절단", kind: "pierce", cd: 7, mult: 6.0, range: 7, unlock: 11, voidOnly: true, color: "#e0a0ff", icon: "dimslash", sfx: "pierce", dtype: "mag", elem: "void", mana: 26, ignoreAdd: 0.35, bonus: { boss: 0.35 }, desc: "한 줄을 통째로 갈라 마법저항을 35% 무시하고 보스에게 추가 피해", shape: "line" }),
    S({ id: "doomrain", src: "void", name: "종말의 비", kind: "rain", cd: 12, mult: 1.8, count: 14, over: 4.0, range: 7, unlock: 11, voidOnly: true, color: "#c070ff", icon: "doomrain", sfx: "storm", dtype: "mag", elem: "void", mana: 44, desc: "4초 동안 공허의 빛줄기 14개가 무작위 적을 내리치고 주변을 휩쓴다", shape: "rain" }),
    S({ id: "abyssling", src: "void", name: "심연의 사도", kind: "summon", cd: 16, mult: 5.0, dur: 10, every: 0.6, range: 7, unlock: 11, voidOnly: true, color: "#9a6aff", icon: "abyssling", sfx: "summon2", dtype: "mag", elem: "void", mana: 36, desc: "10초 동안 사도가 앞줄의 적을 쉬지 않고 찢어발긴다", shape: "front" }),
    // ---- 화염 정령왕 전용 스킬 (화염 정령왕만 드랍, 매우 낮은 확률) ----
    S({ id: "magmafall", src: "fire", name: "용암 낙하", kind: "rain", cd: 12, mult: 1.7, count: 12, over: 3.5, range: 7, unlock: 11, voidOnly: true, color: "#ff7a30", icon: "magmafall", sfx: "meteor", dtype: "mag", elem: "fire", mana: 42, ignite: 0.5, desc: "3.5초 동안 용암 덩어리 12개가 무작위 적에게 떨어져 점화시킨다", shape: "rain" }),
    S({ id: "solarflare", src: "fire", name: "태양 폭발", kind: "single", cd: 10, mult: 24, range: 7, bonus: { boss: 0.6 }, unlock: 11, voidOnly: true, color: "#ffd24a", icon: "solarflare", sfx: "meteor", dtype: "mag", elem: "fire", mana: 40, ignite: 1.0, desc: "한 대상을 태양의 불꽃으로 폭파하고 반드시 점화시킨다. 보스에게 +60% 피해", shape: "single" }),
    S({ id: "emberspirit", src: "fire", name: "불꽃 정령", kind: "summon", cd: 16, mult: 4.2, dur: 10, every: 0.6, range: 7, unlock: 11, voidOnly: true, color: "#ff9a30", icon: "emberspirit", sfx: "summon2", dtype: "mag", elem: "fire", mana: 36, ignite: 0.3, desc: "10초 동안 불꽃 정령이 앞줄의 적을 태우며 베어낸다", shape: "front" }),
    S({ id: "burnfield", src: "fire", name: "불바다", kind: "zone2", zk: "flame", cd: 13, mult: 0.85, dur: 6, every: 0.4, range: 6, unlock: 11, voidOnly: true, color: "#ff5a20", icon: "burnfield", sfx: "inferno", dtype: "mag", elem: "fire", mana: 40, ignite: 0.7, desc: "6초 동안 3x3 구역을 불바다로 만들어 맹렬히 점화시킨다", shape: "area3" }),
    // ---- 철갑의 투사 전용 스킬 (물리·출혈 빌드) ----
    S({ id: "earthsplit", src: "phys", name: "대지 가르기", kind: "pierce", cd: 7, mult: 6.0, range: 7, unlock: 11, voidOnly: true, color: "#d8c8a0", icon: "earthsplit", sfx: "pierce", dtype: "phys", mana: 24, ignoreAdd: 0.35, bonus: { boss: 0.35 }, bleed: 0.6, desc: "한 줄을 통째로 갈라 방어력을 35% 무시하고 출혈을 일으킨다. 보스에게 추가 피해", shape: "line" }),
    S({ id: "ironstorm", src: "phys", name: "강철 폭풍", kind: "aura", cd: 13, mult: 0.85, dur: 5, every: 0.35, range: 2, unlock: 11, voidOnly: true, color: "#c8d0e0", icon: "ironstorm", sfx: "whirl", dtype: "phys", mana: 30, bleed: 0.4, desc: "5초 동안 앞줄의 모든 적을 강철 칼날로 갈아내며 출혈을 일으킨다", shape: "front" }),
    S({ id: "titanfist", src: "phys", name: "거신의 주먹", kind: "single", cd: 10, mult: 15, range: 6, bonus: { boss: 0.6 }, unlock: 11, voidOnly: true, color: "#e8e0d0", icon: "titanfist", sfx: "claw", dtype: "phys", mana: 34, ignoreAdd: 0.4, bleed: 1.0, desc: "한 대상을 내려찍어 방어력을 40% 무시하고 반드시 출혈시킨다. 보스에게 +60% 피해", shape: "single" }),
    S({ id: "glacierfall", src: "cold", name: "빙하 낙하", kind: "single", cd: 10, mult: 22, range: 7, bonus: { boss: 0.6 }, unlock: 11, voidOnly: true, color: "#bfeaff", icon: "snow2", sfx: "frost", dtype: "mag", elem: "cold", mana: 40, chill: 2.0, desc: "거대한 빙하 조각을 한 대상에게 떨어뜨리고 크게 둔화시킨다. 보스에게 +60% 피해", shape: "single" }),
    S({ id: "frostspirit", src: "cold", name: "서리 정령", kind: "summon", cd: 16, mult: 4.2, dur: 10, every: 0.6, range: 7, unlock: 11, voidOnly: true, color: "#9ae0ff", icon: "snow", sfx: "summon2", dtype: "mag", elem: "cold", mana: 36, chill: 0.5, desc: "10초 동안 서리 정령이 앞줄의 적을 얼리며 베어낸다", shape: "front" }),
    S({ id: "venomrain", src: "poison", name: "독 가시 비", kind: "rain", cd: 12, mult: 1.7, count: 12, over: 3.5, range: 7, unlock: 11, voidOnly: true, color: "#8aff6a", icon: "venom", sfx: "storm", dtype: "phys", mana: 42, poison: 0.5, desc: "3.5초 동안 독 가시 12개가 무작위 적에게 떨어져 중독시킨다", shape: "rain" }),
    S({ id: "broodling", src: "poison", name: "독니 새끼", kind: "summon", cd: 16, mult: 4.4, dur: 10, every: 0.6, range: 7, unlock: 11, voidOnly: true, color: "#6ae04a", icon: "plague", sfx: "summon2", dtype: "phys", mana: 36, poison: 0.4, desc: "10초 동안 독니 새끼들이 앞줄의 적을 물어 중독시킨다", shape: "front" }),
    S({ id: "legion", src: "phys", name: "철갑 군단", kind: "summon", cd: 16, mult: 4.8, dur: 10, every: 0.6, range: 7, unlock: 11, voidOnly: true, color: "#b8c0d0", icon: "legion", sfx: "summon2", dtype: "phys", mana: 36, bleed: 0.3, desc: "10초 동안 철갑 병사들이 앞줄의 적을 쉬지 않고 찔러 출혈시킨다", shape: "front" }),
    // ---- 뇌제 전용 스킬 (번개 빌드) ----
    S({ id: "thunderlord", src: "light", name: "뇌신의 강림", kind: "rain", cd: 12, mult: 1.85, count: 16, over: 3.5, range: 7, unlock: 11, voidOnly: true, color: "#ffe45a", icon: "thunderlord", sfx: "storm", dtype: "mag", elem: "light", mana: 44, desc: "3.5초 동안 하늘에서 번개 16줄기가 무작위 적을 내리친다", shape: "rain" }),
    S({ id: "railbolt", src: "light", name: "초전도 관통", kind: "pierce", cd: 7, mult: 6.2, range: 7, unlock: 11, voidOnly: true, color: "#fff6b0", icon: "railbolt", sfx: "pierce", dtype: "mag", elem: "light", mana: 26, ignoreAdd: 0.35, bonus: { boss: 0.35 }, desc: "한 줄을 번개로 꿰뚫어 마법저항을 35% 무시하고 보스에게 추가 피해", shape: "line" }),
    S({ id: "stormspirit", src: "light", name: "폭풍의 화신", kind: "summon", cd: 16, mult: 3.2, dur: 10, every: 0.6, range: 7, unlock: 11, voidOnly: true, color: "#8ac8ff", icon: "stormspirit", sfx: "summon2", dtype: "mag", elem: "light", mana: 36, desc: "10초 동안 폭풍의 화신이 앞줄의 적을 번개로 지진다", shape: "front" }),
    S({ id: "heavenstrike", src: "light", name: "천벌", kind: "single", cd: 10, mult: 18, range: 7, bonus: { boss: 0.6 }, unlock: 11, voidOnly: true, color: "#ffe45a", icon: "heavenstrike", sfx: "thunder", dtype: "mag", elem: "light", mana: 40, desc: "한 대상에게 하늘의 벼락을 내리꽂는다. 보스에게 +60% 피해", shape: "single" }),
  );
})();

// ---- 계열별 핵심 고유 장비 (출혈 · 중독 · 점화 · 마나 · 마법 치명 · 원소) ----
UNIQUES.push(
  U("bloodaxe", "피에 젖은 도끼", "weapon", 1, "common", 3, [["bleedChance", [0.48, 0.64]], ["dotDmg", [0.4, 0.56]], ["atkPct", [-0.112, -0.088]]], "닦아낼 틈이 없다."),
  U("thirst", "핏빛 갈증", "gloves", 2, "common", 5, [["bleedChance", [0.287, 0.365]], ["dotDmg", [0.587, 0.717]], ["dotDur", [0.344, 0.438]], ["hpMore", 0.85], ["physDmg", [0.261, 0.339]], ["atkPct", [0.115, 0.146]]], "상처가 닫히기 전에 다시 연다."),
  U("brand", "학살자의 낙인", "weapon", 3, "hell", 1, [["bleedChance", [0.45, 0.55]], ["dotDmg", [0.9, 1.1]], ["physDmg", 0.4], ["dmgTaken", 0.15]], "피는 마를 틈이 없다."),
  U("viperring", "독사의 이빨", "ring", 1, "common", 3, [["poisonChance", [0.28, 0.35]], ["dotDmg", [0.2, 0.3]], ["hpPct", -0.1]], "물리면 늦는다."),
  U("plaguemask", "역병 의사의 가면", "helm", 2, "tower", 1, [["poisonChance", [0.28, 0.35]], ["dotDmg", [0.45, 0.55]], ["regen", [0.004, 0.004]], ["expFind", [0.264, 0.336]]], "숨을 쉴 때마다 독이 퍼진다."),
  U("venomking", "독왕의 손길", "gloves", 3, "endless", 1, [["poisonChance", [0.45, 0.55]], ["dotDmg", [0.9, 1.1]], ["dotDur", [0.44, 0.56]], ["cdr", [0.088, 0.112]], ["mf", [0.37, 0.47]]], "쌓이고 쌓여 죽음이 된다."),
  U("pyrerobe", "화염술사의 로브", "armor", 2, "common", 6, [["igniteChance", [0.28, 0.35]], ["fireDmg", [0.28, 0.35]], ["manaPct", [0.28, 0.34]]], "불은 마나로 타오른다."),
  U("lavaheart", "용암의 심장", "neck", 3, "hell", 1, [["igniteChance", [0.55, 0.65]], ["dotDmg", [0.7, 0.9]], ["fireDmg", [0.45, 0.55]], ["penElem", 0.1]], "식지 않는 박동."),
  U("plaguebearer", "만병의 근원", "neck", 4, "tower", 1, [["bleedChance", [0.264, 0.336]], ["poisonChance", [0.264, 0.336]], ["igniteChance", [0.264, 0.336]], ["dotDmg", [1.1, 1.3]], ["dotDur", [0.352, 0.448]], ["allDmg", [0.176, 0.224]], ["magPct", [0.246, 0.314]]], "모든 상처는 하나로 이어진다."),
  U("manafall", "마나 폭포", "armor", 1, "common", 3, [["manaPct", [0.873, 1.032]], ["manaRegenFlat", [11.11, 14.284]], ["defMore", 0.8]], "넘쳐흘러 방어를 잊었다."),
  U("archmage", "대마도사의 지팡이", "weapon", 2, "common", 6, [["manaToSpell", [0.34, 0.4]], ["magPct", [0.36, 0.44]], ["manaRegen", 0.02], ["allDmg", 0.1]], "마나의 흐름을 지팡이로 모은다."),
  U("manabarrier", "마력 순환 갑주", "armor", 3, "common", 7, [["manaRegen", [0.039, 0.058]], ["manaPct", [0.877, 1.072]], ["manaCostRed", [0.172, 0.218]], ["hpMore", 0.6], ["magPct", [0.24, 0.306]], ["hpPct", [0.24, 0.306]], ["dmgTaken", [-0.09, -0.07]], ["allDmg", [0.138, 0.174]]], "마나가 흐르는 한 쓰러지지 않는다."),
  U("abyssmind", "마력의 심연", "helm", 3, "endless", 1, [["manaToSpell", [0.32, 0.38]], ["manaPct", [0.5, 0.58]], ["manaCostRed", [0.176, 0.224]], ["dmgPerMana", [0.014, 0.018]], ["goldFind", [0.422, 0.538]]], "들여다볼수록 깊어진다."),
  U("soulreap", "영혼 수확 반지", "ring", 2, "hell", 1, [["manaOnKill", [5, 7]], ["dmgPerMana", [0.011, 0.014]], ["manaRegenFlat", 5]], "죽음이 곧 마나."),
  U("spellblade", "마법검", "weapon", 3, "tower", 1, [["magCrit", 1], ["critChance", [0.16, 0.224]], ["atkPct", [0.64, 0.768]], ["magPct", [0.64, 0.768]]], "벤 자리에 마법이 터진다."),
  U("cycle", "원소 순환", "neck", 2, "common", 5, [["elemDmg", [0.45, 0.55]], ["penElem", [0.13, 0.17]], ["fireDmg", 0.28], ["coldDmg", 0.28], ["lightDmg", 0.28]], "불, 얼음, 번개. 다시 불."),
  U("whistle", "군단장의 호각", "neck", 2, "endless", 1, [["aoeDmg", [0.55, 0.65]], ["normal", [0.35, 0.45]], ["cdr", 0.08]], "한 번 불면 모두 몰려온다."),
);
// ---- 다양성 추가: 처형·처치 회복·보스/원거리 피해 감소·상태이상·골드 계열 등 ----
UNIQUES.push(
  U("butcheraxe", "도살자의 손도끼", "weapon", 1, "common", 1, [["atkPct", [0.24, 0.32]], ["executeDmg", [0.4, 0.56]], ["bleedChance", [0.141, 0.179]]], "끝을 보는 일에 익숙하다."),
  U("huntermark", "사냥꾼의 표식", "ring", 1, "common", 1, [["boss", [0.253, 0.323]], ["ranged", [0.253, 0.323]], ["critChance", [0.056, 0.072]]], "한 번 찍히면 놓치지 않는다."),
  U("bloodhood", "피 묻은 두건", "helm", 1, "common", 2, [["killHeal", [0.001, 0.002]], ["lifesteal", [0.011, 0.014]], ["hpPct", [0.141, 0.179]]], "쓰러진 것의 온기를 마신다."),
  U("stalkerboots", "추적자의 장화", "boots", 2, "common", 3, [["cdr", [0.08, 0.102]], ["dodge", [0.044, 0.056]], ["rangedTaken", [0.092, 0.117]], ["allDmg", [0.114, 0.146]], ["hpPct", [0.13, 0.182]]], "발소리가 없다."),
  U("viperfang", "독사의 송곳니", "weapon", 2, "common", 4, [["poisonChance", 0.15], ["dotDmg", 0.35], ["dotDur", 0.20], ["atkPct", 0.15]], "물린 곳은 오래 아프다."),
  U("frostsigil", "한파의 인장", "ring", 2, "common", 4, [["coldDmg", [0.408, 0.519]], ["penElem", [0.093, 0.119]], ["cdr", [0.035, 0.044]], ["magPct", [0.163, 0.208]], ["spellCrit", [0.07, 0.089]]], "손끝이 시리다."),
  U("stormarbiter", "폭풍의 중재자", "gloves", 2, "common", 5, [["lightDmg", [0.443, 0.564]], ["chainDmg", [0.316, 0.403]], ["chainJumps", 1], ["magPct", [0.177, 0.225]], ["critDmg", [0.253, 0.322]]], "번개가 말을 듣는다."),
  U("bulwarkplate", "철벽의 수호자", "armor", 2, "common", 5, [["defPct", 0.25], ["bossTaken", 0.08], ["hpPct", 0.12]], "거인의 발에도 버틴다."),
  U("greedcharm", "탐욕의 목걸이", "neck", 2, "common", 3, [["goldFind", [0.308, 0.392]], ["mf", [0.106, 0.134]], ["expFind", [0.132, 0.168]], ["allDmg", [0.491, 0.625]], ["hpPct", [0.351, 0.447]]], "금화 소리를 따라 걷는다."),
  U("slaughtergloves", "학살자의 장갑", "gloves", 3, "common", 8, [["executeDmg", [0.999, 1.272]], ["critDmg", [0.777, 0.989]], ["normal", [0.444, 0.565]], ["killHeal", [0.002, 0.003]], ["atkPct", [0.222, 0.283]], ["physDmg", [0.311, 0.396]], ["allDmg", [0.178, 0.226]]], "서 있는 자가 없을 때까지."),
  U("manaleech", "마나 기생충", "neck", 3, "common", 7, [["manaHit", [0.003, 0.003]], ["manaOnKill", [8.8, 11.2]], ["manaCostRed", [0.27, 0.344]], ["magPct", [0.675, 0.859]], ["spellCrit", [0.203, 0.258]], ["allDmg", [0.27, 0.344]]], "주인의 마나를 먹고 자란다."),
  U("phoenixfeather", "불사조의 깃털", "helm", 3, "common", 8, [["revive", 1], ["fireDmg", [0.339, 0.431]], ["regen", [0.007, 0.009]], ["allDmg", [0.113, 0.144]]], "재가 된 뒤에야 날개를 편다."),
  U("shadowcloak", "그림자 외투", "armor", 3, "common", 8, [["dodge", [0.07, 0.09]], ["dodgeCap", 0.6], ["rangedTaken", [0.301, 0.382]], ["cdr", [0.125, 0.159]], ["allDmg", [0.25, 0.318]], ["hpPct", [0.301, 0.382]]], "그림자는 맞지 않는다."),
  U("reaperscythe", "저승사자의 낫", "weapon", 3, "tower", 1, [["executeDmg", [1.178, 1.5]], ["boss", [0.491, 0.625]], ["critChance", [0.157, 0.2]], ["lifesteal", [0.02, 0.025]], ["atkPct", [0.196, 0.25]], ["magPct", [0.196, 0.25]], ["allDmg", [0.157, 0.2]]], "마지막 한 번을 위해 휘두른다."),
  U("executorring", "집행관의 반지", "ring", 2, "endless", 1, [["elite", [0.468, 0.596]], ["aoeDmg", [0.201, 0.255]], ["killHeal", [0.001, 0.002]], ["allDmg", [0.134, 0.17]], ["critDmg", [0.267, 0.34]]], "정예는 줄 세워서."),
  U("endlessboots", "무한의 장화", "boots", 3, "endless", 1, [["cdr", [0.14, 0.179]], ["dodge", [0.053, 0.067]], ["killHeal", [0.002, 0.003]], ["mf", [0.07, 0.09]], ["allDmg", [0.176, 0.223]], ["hpPct", [0.211, 0.269]]], "멈추면 쓰러진다."),
  U("emberheart", "불씨 박힌 심장석", "neck", 2, "hell", 1, [["fireDmg", [0.528, 0.672]], ["igniteChance", [0.211, 0.269]], ["dotDmg", [0.37, 0.47]], ["magPct", [0.106, 0.134]]], "식지 않는 숯."),
  U("hellhound", "지옥견의 두개골", "helm", 3, "hell", 1, [["fireDmg", [0.704, 0.896]], ["killHeal", [0.001, 0.002]], ["normal", [0.493, 0.627]], ["dodge", [0.044, 0.056]], ["hpPct", [0.282, 0.358]]], "짖지 않는다. 물 뿐이다.")
);
UNIQUES.forEach((u) => { u.ico = u.slot; UNIQUE_BY_ID[u.id] = u; });

// ---- 스킬 연마: 레벨(연마석) + 룬(드랍) ----
const SKILL_MAX_LV = 20;
const HONE_RMUL = [1, 2, 4, 8, 16, 32];   // v3.23: 등급이 높은 스킬일수록 레벨업 연마석이 많이 든다 (1→20 합계: 일반 437 · 희귀 874 · 전설 1,748 · 이터널 3,496 · 소버린 6,992 · 엔젤릭 13,984)
const honeCost = (lvl, rarity) => Math.round((3 + 2 * lvl) * (HONE_RMUL[rarity | 0] || 1));
const RUNES = {
  swift: { name: "속사의 룬", color: "#8ad8ff", text: "쿨타임 -15%", cd: 0.85 },
  power: { name: "강타의 룬", color: "#ff8a6a", text: "피해 +25% · 마나 +20%", mult: 1.25, mana: 1.2 },
  thrift: { name: "효율의 룬", color: "#6ad0ff", text: "마나 소모 -40%", mana: 0.6 },
  pierce: { name: "관통의 룬", color: "#ffd24a", text: "방어/마법저항 15% 무시", ignore: 0.15 },
  fang: { name: "흡혈의 룬", color: "#ff6aa0", text: "생명력 흡수 +8%", lifesteal: 0.08 },
  keen: { name: "예리함의 룬", color: "#fff08a", text: "치명타 확률 +15%", crit: 0.15 },
  bleed: { name: "출혈의 룬", color: "#e03a4a", text: "출혈 확률 +25%", bleed: 0.25 },
  venom: { name: "독의 룬", color: "#6ae04a", text: "중독 확률 +25%", poison: 0.25 },
  flame: { name: "점화의 룬", color: "#ff9a30", text: "점화 확률 +25%", ignite: 0.25 },
  wide: { name: "확장의 룬", color: "#c58bff", text: "지속시간·횟수 +30%, 번개 도약 +2", wide: 1.3 },
};
const RUNE_IDS = Object.keys(RUNES);

// ---- 신발 + 부위별 균형 보강 고유 (등급이 높을수록 확실히 강하다) ----
UNIQUES.push(
  // 신발
  U("swiftboots", "질주의 장화", "boots", 1, "common", 2, [["cdr", [0.16, 0.208]], ["hpPct", [-0.112, -0.088]]], "발이 먼저 도착한다."),
  U("thiefshoes", "도둑의 신발", "boots", 1, "common", 3, [["mf", [0.45, 0.6]], ["goldFind", [0.35, 0.45]], ["defMore", 0.8]], "소리 없이, 흔적 없이, 빠짐없이."),
  U("ashboots", "재투성이 장화", "boots", 1, "hell", 1, [["fireDmg", [0.4, 0.56]], ["hpPct", [0.288, 0.384]], ["manaPct", [-0.168, -0.132]]], "아직 따뜻하다."),
  U("windwalk", "바람걸음 장화", "boots", 2, "common", 4, [["dodge", [0.2, 0.25]], ["dodgeCap", 0.6], ["cdr", 0.1], ["manaRegenFlat", 3]], "닿지 않는 곳에서 걷는다."),
  U("riftleap", "균열 도약자의 신발", "boots", 2, "tower", 1, [["cdr", [0.288, 0.352]], ["allDmg", [0.208, 0.272]], ["hpMore", 0.85], ["atkPct", [0.141, 0.179]], ["magPct", [0.141, 0.179]]], "한 걸음에 한 층."),
  U("timestride", "시간을 걷는 신발", "boots", 3, "common", 7, [["cdr", [0.22, 0.26]], ["cdrCap", 0.65], ["manaRegen", 0.02], ["allDmg", [0.16, 0.2]]], "발걸음마다 초침이 멈춘다."),
  U("embertrail", "불길 위의 걸음", "boots", 3, "hell", 1, [["fireDmg", [0.45, 0.55]], ["igniteChance", 0.3], ["regen", 0.008], ["dmgTaken", -0.1]], "지나간 자리에 불이 남는다."),
  U("marchboots", "끝없는 행군의 장화", "boots", 3, "endless", 1, [["regen", [0.012, 0.015]], ["hpPct", [0.4, 0.5]], ["dmgTaken", [-0.134, -0.106]], ["manaRegenFlat", [5.28, 6.72]], ["expFind", [0.317, 0.403]]], "멈추지 않는 발."),
  U("angelstep", "천사의 발자국", "boots", 4, "common", 8, [["cdr", [0.18, 0.22]], ["allDmg", [0.22, 0.26]], ["dodge", 0.15], ["hpPct", 0.35], ["manaRegen", 0.03], ["mf", 0.5]], "밟은 자리마다 빛이 핀다."),
  U("dimshoes", "차원 도약화", "boots", 4, "tower", 1, [["cdr", [0.221, 0.281]], ["allDmg", [0.251, 0.32]], ["mf", [0.9, 1.1]], ["penElem", [0.101, 0.128]], ["manaRegenFlat", [8.04, 10.233]], ["atkPct", [0.07, 0.09]], ["magPct", [0.07, 0.09]], ["hpPct", [0.101, 0.128]]], "여기와 저기의 경계가 없다."),
  // 장갑
  U("minergrip", "광부의 장갑", "gloves", 1, "common", 2, [["hpPct", [0.354, 0.425]], ["atkPct", [0.125, 0.159]], ["magPct", [0.125, 0.159]], ["cdr", [-0.056, -0.044]]], "곡괭이를 놓은 적이 없다."),
  U("ashgrip", "잿빛 손", "gloves", 2, "endless", 1, [["critChance", [0.134, 0.174]], ["critDmg", [0.468, 0.601]], ["lifesteal", [0.035, 0.045]], ["allDmg", [0.118, 0.15]], ["atkPct", [0.118, 0.15]]], "붙잡히면 놓치지 않는다."),
  U("godhand", "신의 손", "gloves", 4, "common", 8, [["critChance", [0.24, 0.305]], ["critDmg", [0.84, 1.067]], ["atkPct", [0.419, 0.534]], ["magPct", [0.419, 0.534]], ["ignoreDef", [0.216, 0.275]], ["ignoreRes", [0.216, 0.275]]], "만지는 순간 결정된다."),
  // 무기
  U("shardblade", "균열의 파편검", "weapon", 1, "tower", 1, [["voidDmg", [0.56, 0.72]], ["atkPct", [0.282, 0.358]], ["magPct", [0.282, 0.358]], ["hpPct", [-0.112, -0.088]]], "베면 베일수록 날이 선다."),
  U("eternalblade", "영겁의 검", "weapon", 2, "endless", 1, [["allDmg", [0.17, 0.21]], ["cdr", 0.1], ["lifesteal", 0.04]], "닳지 않는다."),
  U("hellverdict", "지옥불의 심판자", "weapon", 4, "hell", 1, [["atkMore", 1.45], ["magMore", 1.45], ["fireDmg", 0.55], ["igniteChance", 0.3], ["ignoreRes", 0.2]], "불꽃이 판결문을 읽는다."),
  // 갑옷
  U("riftwatch", "균열 파수꾼의 갑옷", "armor", 1, "tower", 1, [["hpPct", [0.489, 0.629]], ["defPct", [0.559, 0.699]], ["manaPct", [-0.168, -0.132]]], "문 앞에서 영원히 선다."),
  U("everarmor", "영원의 갑주", "armor", 4, "endless", 1, [["hpMore", [1.292, 1.372]], ["regen", [0.007, 0.008]], ["dmgTaken", [-0.224, -0.176]], ["bossTaken", [0.058, 0.074]], ["lifesteal", [0.02, 0.025]], ["hpPct", [0.097, 0.124]], ["mf", [0.431, 0.549]]], "쓰러지는 법을 잊어버렸다."),
  // 목걸이 / 반지
  U("ashnecklace", "재의 목걸이", "neck", 1, "hell", 1, [["fireDmg", [0.405, 0.506]], ["manaPct", [0.254, 0.324]], ["hpPct", [-0.112, -0.088]]], "목에 얹힌 열기."),
  U("startear", "별의 눈물", "neck", 4, "common", 8, [["allDmg", [0.309, 0.393]], ["mf", [0.792, 1.008]], ["critDmg", [0.497, 0.632]], ["cdr", [0.11, 0.14]], ["manaPct", [0.331, 0.421]], ["expFind", [0.352, 0.448]], ["atkPct", [0.077, 0.098]], ["magPct", [0.077, 0.098]]], "하늘이 떨군 단 한 방울."),
  U("soulpact", "영혼의 서약", "ring", 4, "common", 8, [["lifesteal", 0.06], ["allDmg", 0.3], ["critChance", 0.14], ["spellCrit", 0.14], ["cdr", 0.1], ["manaOnKill", 4]], "서약은 피로 쓰이고 빛으로 지켜진다."),
);
// ---- 소버린(고유 3등급) 신규: 히로익 느낌으로 전설 최적 장비보다 확실히 강한 빌드별 장비. 무기를 빌드마다 하나씩 ----
Object.assign(MOD_LABEL, { summonDmg: ["소환 피해", "%"], persistDmg: ["지속형 스킬 피해", "%"], singleDmg: ["단일 대상 스킬 피해", "%"], bossSkill: ["보스 전용기 피해", "%"] });
["summonDmg", "persistDmg", "singleDmg", "bossSkill"].forEach((k) => U_SCALE.add(k));
UNIQUES.push(
  U("heroblade", "영웅의 처형검", "weapon", 3, "common", 8, [["atkPct", [0.27, 0.324]], ["physDmg", [0.45, 0.54]], ["critChance", [0.126, 0.162]], ["critDmg", [0.42, 0.54]], ["ignoreDef", 0.135]], "이름을 새긴 자는 아직 한 번도 지지 않았다."),
  U("serpentfang", "독사왕의 송곳니", "weapon", 3, "common", 8, [["poisonChance", [0.45, 0.55]], ["dotDmg", [0.65, 0.78]], ["physDmg", [0.35, 0.45]], ["dotDur", [0.28, 0.34]], ["magPct", [0.211, 0.269]]], "상처는 작지만 끝나지 않는다."),
  U("pyrescepter", "화염군주의 홀", "weapon", 3, "common", 8, [["fireDmg", [0.8, 0.95]], ["igniteChance", [0.24, 0.304]], ["magPct", [0.32, 0.38]], ["penElem", [0.106, 0.134]], ["allDmg", [0.088, 0.112]], ["goldFind", [0.422, 0.538]]], "손에 쥔 채로 식은 적이 없다."),
  U("frostscepter", "서리군주의 홀", "weapon", 3, "common", 8, [["coldDmg", [0.95, 1.15]], ["magPct", [0.34, 0.4]], ["penElem", 0.15], ["spellCrit", [0.1, 0.13]], ["allDmg", 0.1], ["critDmg", 0.2], ["magMore", 1.12]], "숨결이 닿은 곳은 시간이 멈춘다."),
  U("stormscepter", "폭풍군주의 지팡이", "weapon", 3, "common", 8, [["lightDmg", [0.8, 0.95]], ["chainDmg", [0.44, 0.56]], ["magPct", [0.32, 0.38]], ["spellCrit", [0.08, 0.104]], ["allDmg", 0.1], ["magMore", 1.12]], "천둥은 지팡이가 먼저 안다."),
  U("arcanum", "비전 대마도서", "weapon", 3, "common", 8, [["manaToSpell", [0.26, 0.32]], ["manaPct", [0.36, 0.44]], ["magPct", [0.34, 0.4]], ["manaCostRed", [0.096, 0.128]], ["allDmg", 0.1], ["magMore", 1.14]], "페이지마다 마나가 고여 있다."),
  U("soulchain", "영혼 사슬 지팡이", "weapon", 3, "common", 8, [["summonDmg", [0.8, 1.0]], ["magPct", [0.3, 0.36]], ["atkPct", [0.3, 0.36]], ["persistDmg", [0.45, 0.55]], ["allDmg", 0.08], ["magMore", 1.12], ["atkMore", 1.12]], "사슬에 묶인 것들이 주인을 위해 싸운다."),
  U("doomhammer", "파괴자의 철퇴", "weapon", 3, "common", 8, [["aoeDmg", [0.45, 0.55]], ["atkPct", [0.3, 0.36]], ["physDmg", [0.4, 0.5]], ["critDmg", [0.3, 0.4]]], "내려치면 땅이 대답한다."),
  U("ironheartplate", "철혈의 흉갑", "armor", 3, "common", 8, [["atkPct", [0.2, 0.25]], ["physDmg", [0.3, 0.38]], ["hpPct", [0.3, 0.38]], ["dmgTaken", [-0.112, -0.088]], ["expFind", [0.317, 0.403]]], "피를 흘릴수록 단단해진다."),
  U("archmagerobe", "대마법사의 예복", "armor", 3, "common", 8, [["magPct", [0.28, 0.34]], ["spellCrit", [0.1, 0.13]], ["hpPct", [0.22, 0.28]], ["manaPct", [0.3, 0.4]]], "주문이 옷자락에서 샌다."),
  U("warlordvisor", "전쟁군주의 면갑", "helm", 3, "common", 8, [["atkPct", [0.278, 0.354]], ["critDmg", [0.379, 0.506]], ["hpPct", [0.253, 0.329]], ["boss", [0.253, 0.329]]], "눈구멍 너머로 승리가 보인다."),
  U("sagecirclet", "현자의 보관", "helm", 3, "common", 8, [["magPct", [0.441, 0.535]], ["cdr", [0.094, 0.126]], ["allDmg", [0.189, 0.251]], ["manaRegen", [0.014, 0.018]]], "생각이 빠를수록 쿨타임은 짧아진다."),
);
UNIQUES.forEach((u) => { u.ico = u.slot; UNIQUE_BY_ID[u.id] = u; });

// ---- 이터널 이상 고유 보강 (v3.16): 전설 최적 장비보다 약하던 고유에 옵션을 더한다. 이미 가진 장비도 불러올 때 같은 옵션이 붙는다 (clampItem) ----
const UX_PATCH = {
  gorecleaver: [["allDmg", 0.12], ["atkPct", 0.08]], moltenblade: [["allDmg", 0.12], ["magPct", 0.08]], stormstaff: [["allDmg", 0.1], ["magPct", 0.08]], stormcaller: [["allDmg", 0.1], ["magPct", 0.08]],
  stormeye: [["lightDmg", [0.14, 0.18]], ["magPct", 0.1], ["allDmg", 0.08]], bladestorm: [["physDmg", [0.1, 0.14]], ["critDmg", 0.2]], manaheart: [["magPct", [0.14, 0.18]], ["spellCrit", 0.07]],
  brandhelm: [["allDmg", [0.14, 0.18]], ["hpPct", 0.1]], towerseal: [["allDmg", 0.1], ["critDmg", 0.2]], thirst: [["physDmg", [0.2, 0.26]], ["atkPct", 0.1]],
  pyrerobe: [["magPct", [0.14, 0.18]], ["hpPct", 0.1]], soulreap: [["magPct", 0.14], ["spellCrit", 0.06]], stalkerboots: [["allDmg", 0.1], ["hpPct", [0.1, 0.14]]],
  frostsigil: [["magPct", 0.14], ["spellCrit", 0.06]], stormarbiter: [["magPct", 0.14], ["critDmg", 0.2]], bulwarkplate: [["hpPct", 0.12], ["dmgTaken", -0.06]],
  greedcharm: [["allDmg", 0.14], ["hpPct", 0.1]], executorring: [["allDmg", 0.1], ["critDmg", 0.2]], riftleap: [["atkPct", 0.1], ["magPct", 0.1]], ashgrip: [["allDmg", 0.1], ["atkPct", 0.1]],
  dragonhelm: [["atkPct", 0.1], ["magPct", 0.1]], voidgrip: [["atkPct", 0.14], ["physDmg", 0.2], ["hpPct", 0.12]], voidcrest: [["magPct", 0.14], ["spellCrit", 0.06]],
  voidwhisper: [["elemDmg", 0.1], ["magPct", 0.14], ["allDmg", 0.08]], manabarrier: [["magPct", 0.14], ["hpPct", 0.14], ["dmgTaken", -0.08], ["allDmg", 0.08]], slaughtergloves: [["atkPct", 0.1], ["physDmg", 0.14], ["allDmg", 0.08]],
  manaleech: [["magPct", 0.14], ["spellCrit", 0.06], ["allDmg", 0.08]], shadowcloak: [["allDmg", 0.1], ["hpPct", 0.12]], reaperscythe: [["atkPct", 0.1], ["magPct", 0.1], ["allDmg", 0.08]], endlessboots: [["allDmg", 0.1], ["hpPct", 0.12]],
  apex: [["atkPct", 0.07], ["magPct", 0.07]], dimshoes: [["atkPct", 0.07], ["magPct", 0.07], ["hpPct", 0.1]], startear: [["atkPct", 0.07], ["magPct", 0.07]], soulpact: [["atkPct", 0.07], ["magPct", 0.07]],
};
for (const id in UX_PATCH) { const u = UNIQUE_BY_ID[id]; if (u) for (const [k, v] of UX_PATCH[id]) if (!u.mods.some((m) => m[0] === k)) u.mods.push([k, uRoll(k, v)]); }

// ---- v3.23 쿨타임 고유 (쿨타임 감소 상한을 올리는 대신 단점이 있다) ----
UNIQUES.push(
);
UNIQUES.forEach((u) => { u.ico = u.slot; UNIQUE_BY_ID[u.id] = u; });

// ---- v3.23 쿨타임 고유 (쿨타임 감소 상한을 올리는 대신 단점이 있다) ----
UNIQUES.push(
);
UNIQUES.forEach((u) => { u.ico = u.slot; UNIQUE_BY_ID[u.id] = u; });

// ---- v3.23 쿨타임 고유 (쿨타임 감소 상한을 올리는 대신 단점이 있다) ----
UNIQUES.push(
);
UNIQUES.forEach((u) => { u.ico = u.slot; UNIQUE_BY_ID[u.id] = u; });

// ---- 상태이상 대상 추가 피해 (v3.17): 출혈·중독·점화(화상)·둔화·감전 중인 적을 더 세게 때리는 스킬 · 옵션 · 핵심 고유 ----
Object.assign(MOD_LABEL, {
  bleedMore: ["출혈 중인 적에게 주는 피해 (곱연산)", "more"], poisonMore: ["중독 중인 적에게 주는 피해 (곱연산)", "more"], igniteMore: ["점화 중인 적에게 주는 피해 (곱연산)", "more"], chillMore: ["둔화 중인 적에게 주는 피해 (곱연산)", "more"], shockMore: ["감전 중인 적에게 주는 피해 (곱연산)", "more"],
  vsBleed: ["출혈 중인 적 추가 피해", "%"], vsPoison: ["중독 중인 적 추가 피해", "%"], vsIgnite: ["점화 중인 적 추가 피해", "%"], vsChill: ["둔화 중인 적 추가 피해", "%"], vsShock: ["감전 중인 적 추가 피해", "%"], shockChance: ["감전 확률", "%"],
});
["vsBleed", "vsPoison", "vsIgnite", "vsChill", "vsShock", "shockChance"].forEach((k) => U_SCALE.add(k));
{
  const A4 = ["weapon", "gloves", "ring", "neck"];
  AFFIXES.push(
    { k: "vsBleed", name: "출혈 중인 적에게 피해 %", pct: true, range: [0.06, 0.12], w: 3, slots: A4, minIlvl: 6 }, { k: "vsPoison", name: "중독 중인 적에게 피해 %", pct: true, range: [0.06, 0.12], w: 3, slots: A4, minIlvl: 6 },
    { k: "vsIgnite", name: "점화 중인 적에게 피해 %", pct: true, range: [0.06, 0.12], w: 3, slots: A4, minIlvl: 6 }, { k: "vsChill", name: "둔화 중인 적에게 피해 %", pct: true, range: [0.06, 0.12], w: 3, slots: A4, minIlvl: 6 },
    { k: "vsShock", name: "감전 중인 적에게 피해 %", pct: true, range: [0.06, 0.12], w: 3, slots: A4, minIlvl: 6 }, { k: "shockChance", name: "감전 확률", pct: true, range: [0.05, 0.1], w: 4, slots: ["weapon", "gloves", "ring"], minIlvl: 4 },
  );
  const T = (o) => Object.assign({ slot: "active", bonus: {}, side: 1, unlock: 6 }, o);
  SKILLS.push(
    T({ id: "butcher", name: "도살의 낫질", kind: "cone", cd: 5, mult: 2.2, sideM: 0.8, range: 3, unlock: 5, color: "#ff6a6a", icon: "butcher", sfx: "claw", dtype: "phys", mana: 16, bleed: 0.4, vs: { bleed: 0.9 }, desc: "[출혈 연계] 부채꼴로 베어 출혈을 일으킨다. 이미 출혈 중인 적에게는 +90% 피해", shape: "cone" }),
    T({ id: "venomburst", name: "독 폭발", kind: "single", cd: 8, mult: 6, range: 5, unlock: 6, color: "#8aff6a", icon: "venomburst", sfx: "venom", dtype: "phys", mana: 20, poison: 0.6, vs: { poison: 1.0 }, desc: "[중독 연계] 한 대상에 독을 터뜨려 중독시킨다. 이미 중독된 적에게는 +100% 피해", shape: "single" }),
    T({ id: "scorchbrand", name: "작열 낙인", kind: "single", cd: 8, mult: 8, range: 6, unlock: 6, color: "#ff9a30", icon: "scorchbrand", sfx: "meteor", dtype: "mag", elem: "fire", mana: 28, ignite: 0.8, vs: { ignite: 1.0 }, desc: "[점화 연계] 한 대상에 낙인을 찍어 점화시킨다. 이미 점화된 적에게는 +100% 피해", shape: "single" }),
    T({ id: "shatter", name: "빙결 파쇄", kind: "single", cd: 8, mult: 8, range: 6, unlock: 6, color: "#8ae0ff", icon: "shatter", sfx: "frost", dtype: "mag", elem: "cold", mana: 28, chill: 1.0, vs: { chill: 1.2 }, desc: "[냉기 연계] 한 대상을 얼려 둔화시킨다. 이미 둔화된 적은 산산이 부서져 +120% 피해", shape: "single" }),
    T({ id: "shockspray", name: "전자기 난사", kind: "spray", cd: 6, mult: 0.55, count: 8, range: 5, unlock: 7, color: "#ffe45a", icon: "shockspray", sfx: "shard", dtype: "mag", elem: "light", mana: 24, shock: 0.5, proj: "shard", desc: "[감전 연계] 번개 구슬 8발을 난사한다. 맞은 적은 감전되어 4초간 25% 느려진다", shape: "spray" }),
    T({ id: "discharge", name: "방전 처형", kind: "single", cd: 8, mult: 9, range: 6, unlock: 7, color: "#fff6b0", icon: "discharge", sfx: "thunder", dtype: "mag", elem: "light", mana: 30, shock: 1.0, vs: { shock: 1.0 }, desc: "[감전 연계] 한 대상에 벼락을 내리꽂아 반드시 감전시킨다. 이미 감전된 적에게는 +100% 피해", shape: "single" }),
  );
  // ---- 핵심 고유 (소버린): 상태이상 중인 적에게 곱연산으로 큰 피해. 두 부위를 모두 갖추면 확실히 강하다 ----
  UNIQUES.push(
    U("hookblade", "도살자의 갈고리", "weapon", 3, "common", 8, [["bleedChance", [0.38, 0.45]], ["bleedMore", [1.308, 1.392]], ["dotDmg", [0.45, 0.55]], ["physDmg", [0.3, 0.38]], ["mf", [0.37, 0.47]]], "한 번 걸리면 놓아주지 않는다."),
    U("bloodbrand", "붉은 낙인 장갑", "gloves", 3, "common", 8, [["bleedMore", [1.252, 1.321]], ["vsBleed", [0.43, 0.573]], ["bleedChance", [0.358, 0.43]], ["dotDur", [0.358, 0.43]]], "피 묻은 자국이 낙인이 된다."),
    U("toxheart", "맹독의 심장", "neck", 3, "common", 8, [["poisonChance", [0.38, 0.45]], ["poisonMore", [1.308, 1.392]], ["dotDmg", [0.5, 0.6]], ["dotDur", [0.264, 0.336]], ["magPct", [0.211, 0.269]]], "뛸 때마다 독이 돈다."),
    U("fangseal", "독니 인장", "ring", 3, "common", 8, [["poisonMore", [1.176, 1.224]], ["vsPoison", [0.3, 0.4]], ["poisonChance", [0.25, 0.3]], ["physDmg", [0.2, 0.25]], ["goldFind", [0.422, 0.538]]], "물린 곳에서 번진다."),
    U("cinderstaff", "작열의 불씨 지팡이", "weapon", 3, "common", 8, [["igniteChance", [0.38, 0.45]], ["igniteMore", [1.308, 1.392]], ["fireDmg", [0.6, 0.75]], ["magPct", [0.25, 0.3]], ["expFind", [0.317, 0.403]]], "불붙은 것은 더 잘 탄다."),
    U("scorchrobe", "화상의 예복", "armor", 3, "common", 8, [["igniteMore", 1.2], ["vsIgnite", [0.3, 0.4]], ["igniteChance", [0.28, 0.34]], ["fireDmg", [0.35, 0.45]], ["hpPct", [0.2, 0.26]]], "입은 자도 데이지 않는 불길."),
    U("rimescepter", "서리결정 홀", "weapon", 3, "common", 8, [["chillMore", [1.44, 1.56]], ["coldDmg", [0.95, 1.15]], ["magPct", [0.32, 0.38]], ["spellCrit", [0.1, 0.12]], ["allDmg", [0.123, 0.157]], ["magMore", [1.141, 1.179]], ["mf", [0.37, 0.47]]], "얼어붙은 것은 부서지기 쉽다."),
    U("shatterglove", "빙결 쇄도의 장갑", "gloves", 3, "common", 8, [["chillMore", 1.2], ["vsChill", [0.3, 0.4]], ["coldDmg", [0.35, 0.45]], ["penElem", 0.12]], "쥐면 소리 없이 금이 간다."),
    U("arcspear", "뇌전의 심판창", "weapon", 3, "common", 8, [["shockChance", [0.4, 0.5]], ["shockMore", 1.35], ["lightDmg", [0.6, 0.75]], ["chainDmg", [0.4, 0.5]]], "번개는 이미 흔들리는 것을 노린다."),
    U("shockcrown", "감전의 왕관", "helm", 3, "common", 8, [["shockChance", [0.28, 0.34]], ["shockMore", 1.2], ["vsShock", [0.3, 0.4]], ["spellCrit", [0.1, 0.13]], ["magPct", [0.2, 0.25]]], "머리카락이 곤두서는 순간 승부가 난다."),
  );
  UNIQUES.forEach((u) => { u.ico = u.slot; UNIQUE_BY_ID[u.id] = u; });
}

// ---- v3.23 쿨타임 고유 (쿨타임 감소 상한을 올리는 대신 단점이 있다) ----
UNIQUES.push(
  U("hourboots", "시침의 장화", "boots", 2, "common", 3, [["cdr", [0.187, 0.238]], ["cdrCap", 0.6], ["dodge", [0.044, 0.056]], ["hpMore", 0.9]], "느리게 걷는 자만이 시간을 앞지른다."),
  U("timethief", "시간 도둑의 장갑", "gloves", 3, "common", 7, [["cdr", [0.208, 0.265]], ["cdrCap", 0.7], ["critDmg", [0.313, 0.398]], ["atkPct", [0.125, 0.159]], ["magPct", [0.125, 0.159]], ["hpMore", 0.85]], "훔친 시간은 이자가 붙는다."),
  U("clockvisor", "시계탑의 면갑", "helm", 3, "tower", 1, [["cdr", [0.261, 0.333]], ["cdrCap", 0.7], ["manaCostRed", [0.145, 0.184]], ["atkPct", [0.291, 0.37]], ["magPct", [0.291, 0.37]], ["defMore", 0.8]], "종소리는 늘 한 박자 빠르다."),
  U("loopring", "무한 회귀의 반지", "ring", 4, "common", 8, [["cdr", [0.264, 0.336]], ["cdrCap", 0.8], ["allDmg", [0.176, 0.224]], ["critChance", [0.088, 0.112]], ["hpMore", 0.85]], "끝나기 전에 이미 다시 시작되어 있다."),
  U("eonstride", "영겁의 질주", "boots", 4, "tower", 1, [["cdr", [0.264, 0.336]], ["cdrCap", 0.8], ["dodge", [0.088, 0.112]], ["allDmg", [0.132, 0.168]], ["dmgTaken", [0.106, 0.134]]], "발이 땅에 닿기 전에 다음 걸음이 있다."),
);
UNIQUES.forEach((u) => { u.ico = u.slot; UNIQUE_BY_ID[u.id] = u; });

// ---- v3.23 고유 무기의 종류 (검=공격력 · 지팡이=주문력 · 낫=공격 우세 하이브리드 · 마도서=주문 우세 하이브리드) ----
const UWT = {
  sword: ["fang", "bloodaxe", "butcheraxe", "brand", "heroblade", "doomhammer", "hookblade", "hellhoundfang", "viperfang", "titanblade", "serpentfang", "gorecleaver"],
  staff: ["stormcaller", "stormstaff", "pyrescepter", "frostscepter", "stormscepter", "cinderstaff", "rimescepter", "arcspear", "soulchain"],
  grimoire: ["tome", "arcanum", "archmage", "hellverdict"],
  scythe: ["reaper", "reaperscythe", "spellblade", "voidblade", "moltenblade", "eternalblade", "glasscannon", "judgment", "shardblade"],
};
for (const t in UWT) for (const id of UWT[t]) if (UNIQUE_BY_ID[id]) UNIQUE_BY_ID[id].wt = t;
UNIQUES.forEach((u) => { if (u.slot === "weapon" && !u.wt) u.wt = "scythe"; });

// ---- v3.23 신규 스킬: 수리검 · 대형 수리검 (물리) + 신화 등급 이상에서만 나오는 전용 스킬 6종 (장엄한 연출, 쿨타임 7~10초) ----
(function () {
  const S = (o) => Object.assign({ slot: "active", bonus: {}, side: 1 }, o), M = (o) => S(Object.assign({ mythOnly: true, unlock: 12 }, o));
  SKILLS.push(
    S({ id: "shuriken", name: "수리검", kind: "bounce", cd: 5, mult: 0.8, count: 4, range: 6, unlock: 3, color: "#cfd8e8", icon: "shuriken", sfx: "slash", dtype: "phys", mana: 16, bleed: 0.25, desc: "수리검을 던진다. 화면 안의 적 사이를 무작위로 튕기며 여러 번 벤다 (등급이 오를수록 튕기는 횟수가 늘어난다)" }),
    S({ id: "bigshuriken", name: "대형 수리검", kind: "shuri", cd: 11, mult: 0.4, dur: 7, every: 0.45, range: 6, unlock: 5, color: "#ffb0a0", icon: "bigshuri", sfx: "whirl", dtype: "phys", mana: 26, bleed: 0.2, desc: "거대한 수리검을 한 구간에 박아 7초 동안 그 구간(앞뒤 3열) 전체를 모든 줄에서 베어낸다" }),
    M({ id: "skysword", name: "천공검", kind: "pierce", cd: 7, mult: 4.8, adj: 0.5, range: 6, bonus: { boss: 0.3 }, color: "#bfe8ff", icon: "skysword", sfx: "pierce", dtype: "phys", mana: 40, desc: "[신화 이상 전용] 하늘에서 거대한 검이 내려와 한 줄을 꿰뚫고, 충격파가 위아래 줄까지 번진다" }),
    M({ id: "starfall", name: "별의 심판", kind: "rain", cd: 9, mult: 1.3, count: 14, over: 2.4, range: 6, color: "#fff0a0", icon: "starfall", sfx: "meteor", dtype: "mag", elem: "light", mana: 55, desc: "[신화 이상 전용] 화면 가득 별이 쏟아져 무작위 적에게 연속으로 떨어진다" }),
    M({ id: "quake", name: "대지 붕괴", kind: "zone2", zk: "quake", shape: "wide", cd: 10, mult: 0.26, dur: 6, every: 0.5, range: 6, color: "#c8a070", icon: "quake", sfx: "boom", dtype: "phys", mana: 50, desc: "[신화 이상 전용] 땅이 갈라지며 뒤쪽 넓은 구역에 6초 동안 균열이 번져 지속 피해를 준다" }),
    M({ id: "dragonbreath", name: "용의 숨결", kind: "pierce", all: true, cd: 8, mult: 3.4, range: 6, color: "#ff8a40", icon: "dragon", sfx: "fire", dtype: "mag", elem: "fire", mana: 48, ignite: 0.5, desc: "[신화 이상 전용] 용의 숨결이 모든 줄을 한꺼번에 휩쓸고 불태운다" }),
    M({ id: "angelfall", name: "천사의 강림", kind: "nova", cd: 10, mult: 2.4, chill: 0, healPct: 0.08, range: 6, color: "#fff6c0", icon: "angel", sfx: "heal", dtype: "mag", elem: "light", mana: 45, desc: "[신화 이상 전용] 날개가 펼쳐지며 사거리 안의 모든 적을 빛으로 태우고 체력을 8% 회복한다" }),
    M({ id: "verdict", name: "단죄", kind: "single", cd: 9, mult: 13.5, range: 6, bonus: { elite: 0.4, boss: 0.4 }, color: "#ffdada", icon: "verdict", sfx: "snipe", dtype: "phys", mana: 50, desc: "[신화 이상 전용] 정예와 보스를 단죄하는 일격 (등급이 오를수록 연타가 늘어난다)" }),
  );
})();
const MYTH_IDS = SKILLS.filter((d) => d.mythOnly).map((d) => d.id);

// ---- v3.23 패시브 스킬 (패시브 칸 1개): 등급마다 이름과 효과가 완전히 다르다 ----
const PASSIVE_SKILLS = [
  { id: "p_steel", pt: 0, name: "강철 피부", per: { defPct: 0.10, hpPct: 0.06 }, desc: "[패시브] 피부가 단단해진다 — 방어력 +10%, 최대 체력 +6%" },
  { id: "p_fort", pt: 1, name: "요새", per: { defPct: 0.16, hpPct: 0.12, dmgTaken: -0.04 }, desc: "[패시브] 흔들리지 않는 요새 — 방어력 +16%, 체력 +12%, 받는 피해 -4%" },
  { id: "p_will", pt: 2, name: "전장의 의지", per: { atkPct: 0.07, magPct: 0.07, cdr: 0.05, lifesteal: 0.004 }, desc: "[패시브] 싸울수록 강해진다 — 공격력·주문력 +7%, 쿨타임 -5%, 흡혈 +0.4%" },
  { id: "p_halo", pt: 3, name: "천상의 가호", per: { ignoreDef: 0.10, ignoreRes: 0.10, allDmg: 0.08, cdr: 0.04 }, desc: "[패시브] 방어·저항 10% 관통, 모든 피해 +8%, 쿨타임 -4%" },
  { id: "p_pact", pt: 4, name: "심연의 계약", per: { chainJumps: 1, allDmg: 0.10, critChance: 0.06, shredDef: 0.06 }, desc: "[패시브] 연쇄 +1회(번개·연쇄 스킬), 모든 피해 +10%, 치명타 +6%, 방어 감소 +6%" },
  { id: "p_end", pt: 5, name: "종말의 서약", per: { allDmg: 0.14, atkMore: 1.05, magMore: 1.05, cdr: 0.06, ignoreDef: 0.10, ignoreRes: 0.10, chainJumps: 1 }, desc: "[패시브] 모든 피해 +14%, 공격·주문 5% 추가 증가, 쿨타임 -6%, 방어·저항 10% 관통, 연쇄 +1" },
];
for (const p of PASSIVE_SKILLS) SKILLS.push({ id: p.id, name: p.name, slot: "passive", kind: "passive", pt: p.pt, cd: 99, mult: 0, unlock: p.pt === 0 ? 2 : 99, color: ["#b8c4d8", "#9ad0ff", "#ffd27a", "#bfe8ff", "#c06aff", "#ff5a5a"][p.pt], icon: "passive" + p.pt, dtype: "buff", mana: 0, bonus: {}, side: 1, per: p.per, desc: p.desc });

// ---- v4: 고유 · 세트 장비 삭제. 장비 등급은 일반 · 매직 · 레어 · 전설 4단계뿐이다 (전설 = 옵션 5개 + 소켓 1~3개). 도감 데이터는 비워 둔다 ----
UNIQUES.length = 0; for (const k of Object.keys(UNIQUE_BY_ID)) delete UNIQUE_BY_ID[k];

// ---- v4: 옵션이 열리는 아이템 레벨(minIlvl)은 이전의 1~10 기준이라 T1~T5로 환산한다 (1~2 → T1, 3~4 → T2, 5~6 → T3, 7~8 → T4) ----
AFFIXES.forEach((a) => { if (a.minIlvl) a.minIlvl = Math.max(1, Math.min(5, Math.ceil(a.minIlvl / 2))); });

// ---- v4: 속성별 기본 공격 (기본 스킬 칸 전용, 마나 0): 화염 · 냉기 · 공허 · 출혈 · 중독 + 기존 물리(일격) · 번개(번개 찌르기) ----
SKILLS.push(
  { id: "ember", name: "불씨 탄", slot: "basic", kind: "single", cd: 0.85, mult: 1.0, range: 4, bonus: {}, unlock: 1, color: "#ff9a50", icon: "flame", sfx: "boom", dtype: "mag", elem: "fire", mana: 0, ignite: 0.2, side: 1, desc: "기본 화염 공격. 일정 확률로 점화시킨다" },
  { id: "rip", name: "찢기", slot: "basic", kind: "single", cd: 0.8, mult: 0.95, range: 3, bonus: {}, unlock: 1, color: "#ff7a7a", icon: "claw", sfx: "slash", dtype: "phys", mana: 0, bleed: 0.25, side: 1, desc: "기본 물리 공격. 일정 확률로 출혈시킨다" },
  { id: "frostbolt", name: "서리 화살", slot: "basic", kind: "single", cd: 0.9, mult: 1.05, range: 4, bonus: {}, unlock: 2, color: "#a8e8ff", icon: "snow", sfx: "frost", dtype: "mag", elem: "cold", mana: 0, side: 1, desc: "기본 냉기 공격. 냉기 피해 · 둔화 연계 빌드용" },
  { id: "venom", name: "독침", slot: "basic", kind: "single", cd: 0.75, mult: 0.9, range: 4, bonus: {}, unlock: 2, color: "#8aff6a", icon: "dagger", sfx: "slash", dtype: "phys", mana: 0, poison: 0.25, side: 1, desc: "기본 물리 공격. 일정 확률로 중독시킨다" },
  { id: "voidbolt", name: "공허 탄", slot: "basic", kind: "single", cd: 1.0, mult: 1.1, range: 4, bonus: {}, unlock: 3, color: "#c070ff", icon: "vortex", sfx: "zap", dtype: "mag", elem: "void", mana: 0, side: 1, desc: "기본 공허 공격. 공허 피해 빌드용" },
);
