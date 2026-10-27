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
const STATUS_INFO = { bleed: { name: "출혈", color: "#e03a4a", st: "phys" }, poison: { name: "중독", color: "#6ae04a", st: "poison" }, ignite: { name: "점화", color: "#ff9a30", st: "fire" } };
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
    S({ id: "blizzard", name: "눈보라", kind: "zone2", zk: "snow", cd: 13, mult: 0.42, dur: 6, every: 0.5, range: 6, unlock: 5, color: "#bfeaff", icon: "snow2", sfx: "blizzard", dtype: "mag", elem: "cold", mana: 32, chill: 1.5, desc: "6초 동안 뒤쪽 넓은 구역에 눈보라가 몰아쳐 적을 둔화시킨다", shape: "wide" }),
    S({ id: "inferno", name: "화염 폭풍", kind: "zone2", zk: "flame", cd: 11, mult: 0.55, dur: 5, every: 0.5, range: 5, unlock: 6, color: "#ff7a30", icon: "inferno", sfx: "inferno", dtype: "mag", elem: "fire", mana: 30, ignite: 0.35, desc: "5초 동안 3x3 구역을 불태우고 점화시킨다", shape: "area3" }),
    S({ id: "plague", name: "역병 구름", kind: "zone2", zk: "cloud", cd: 12, mult: 0.42, dur: 6, every: 0.5, range: 5, unlock: 6, color: "#8ae04a", icon: "plague", sfx: "plague", dtype: "mag", elem: "void", mana: 28, poison: 0.5, desc: "6초 동안 3x3 독구름이 머물며 중독을 겹쳐 쌓는다", shape: "area3" }),
    S({ id: "storm", name: "뇌우", kind: "rain", cd: 12, mult: 1.42, count: 8, over: 3.0, range: 6, unlock: 7, color: "#fff08a", icon: "storm", sfx: "storm", dtype: "mag", elem: "light", mana: 34, desc: "3초 동안 하늘에서 번개 8줄기가 무작위 적을 내리친다", shape: "rain" }),
    S({ id: "spirit", name: "정령 소환", kind: "summon", cd: 15, mult: 1.3, dur: 8, every: 1.0, range: 6, unlock: 7, color: "#8affc8", icon: "spirit", sfx: "summon2", dtype: "phys", mana: 28, desc: "8초 동안 정령이 앞줄의 적을 쉬지 않고 베어낸다", shape: "front" }),
    S({ id: "voidhole", name: "공허의 심연", kind: "hole", cd: 13, mult: 0.6, dur: 3, every: 0.5, range: 5, unlock: 8, color: "#c070ff", icon: "vortex", sfx: "voidhole", dtype: "mag", elem: "void", mana: 30, desc: "3초 동안 적을 빨아들이며 갈아버리는 심연을 연다", shape: "area3" }),
    // ---- 빌드별 보스 전용기: 단일 대상, 보스에게 +100% (일반 몹에게는 평범), 빌드 고유의 상태이상/속성을 확정으로 건다 ----
    S({ id: "gut", name: "심장 도려내기", kind: "single", cd: 8, mult: 7, range: 5, bonus: { boss: 1.0 }, unlock: 5, color: "#ff6a6a", icon: "claw", sfx: "claw", dtype: "phys", mana: 20, bleed: 1.0, desc: "[출혈 빌드 · 보스 전용기] 한 대상을 베어 반드시 출혈을 일으킨다. 보스에게 +100% 피해", shape: "single" }),
    S({ id: "toxin", name: "맹독 주입", kind: "single", cd: 8, mult: 6.5, range: 5, bonus: { boss: 1.0 }, unlock: 5, color: "#6ae04a", icon: "venom", sfx: "venom", dtype: "phys", mana: 20, poison: 1.0, desc: "[중독 빌드 · 보스 전용기] 한 대상에게 맹독을 주입해 반드시 중독시킨다. 보스에게 +100% 피해", shape: "single" }),
    S({ id: "sunbrand", name: "태양의 낙인", kind: "single", cd: 9, mult: 11, range: 6, bonus: { boss: 1.0 }, unlock: 6, color: "#ff8a40", icon: "inferno", sfx: "meteor", dtype: "mag", elem: "fire", mana: 30, ignite: 1.0, desc: "[점화·화염 빌드 · 보스 전용기] 한 대상에 태양의 낙인을 찍어 반드시 점화시킨다. 보스에게 +100% 피해", shape: "single" }),
    S({ id: "zerofrost", name: "절대영도", kind: "single", cd: 9, mult: 13, range: 6, bonus: { boss: 1.0 }, unlock: 6, color: "#8ae0ff", icon: "snow2", sfx: "frost", dtype: "mag", elem: "cold", mana: 30, chill: 2.0, desc: "[냉기 빌드 · 보스 전용기] 한 대상을 얼려 붙이고 크게 둔화시킨다. 보스에게 +100% 피해", shape: "single" }),
    S({ id: "judgment", name: "벼락 처형", kind: "single", cd: 8, mult: 9, range: 6, bonus: { boss: 1.0 }, unlock: 6, color: "#fff08a", icon: "storm", sfx: "thunder", dtype: "mag", elem: "light", mana: 28, desc: "[번개 빌드 · 보스 전용기] 한 대상에게 벼락을 내리꽂는다. 보스에게 +100% 피해", shape: "single" }),
    S({ id: "manaburst", name: "마력 응축탄", kind: "single", cd: 9, mult: 9.5, range: 6, bonus: { boss: 1.0 }, unlock: 7, color: "#c58bff", icon: "orb2", sfx: "orbit", dtype: "mag", mana: 55, desc: "[마나·주문 빌드 · 보스 전용기] 마나를 크게 쏟아 한 대상을 폭파한다. 마나 소모가 크다. 보스에게 +100% 피해", shape: "single" }),
    S({ id: "reaper", name: "처형자 소환", kind: "summon", cd: 18, mult: 2.2, dur: 10, every: 1.0, range: 6, bonus: { boss: 1.0 }, unlock: 8, color: "#d0a0ff", icon: "spirit", sfx: "summon2", dtype: "phys", mana: 34, desc: "[소환 빌드 · 보스 전용기] 10초 동안 처형자가 가장 강한 적을 집요하게 벤다. 보스에게 +100% 피해", shape: "front" }),
    // ---- 공허의 군주 전용 스킬 (공허의 군주만 드랍, 매우 낮은 확률): 일반 풀·상점에는 나오지 않는다 ----
    S({ id: "voidmaw", name: "공허의 아가리", kind: "hole", cd: 14, mult: 1.1, dur: 4, every: 0.35, range: 6, unlock: 11, voidOnly: true, color: "#b070ff", icon: "voidmaw", sfx: "voidhole", dtype: "mag", elem: "void", mana: 38, bonus: { boss: 0.2, elite: 0.2 }, desc: "4초 동안 거대한 아가리가 열려 주변 적을 끌어당기며 갈아버린다", shape: "area3" }),
    S({ id: "dimslash", name: "차원 절단", kind: "pierce", cd: 7, mult: 6.0, range: 7, unlock: 11, voidOnly: true, color: "#e0a0ff", icon: "dimslash", sfx: "pierce", dtype: "mag", elem: "void", mana: 26, ignoreAdd: 0.35, bonus: { boss: 0.35 }, desc: "한 줄을 통째로 갈라 마법저항을 35% 무시하고 보스에게 추가 피해", shape: "line" }),
    S({ id: "doomrain", name: "종말의 비", kind: "rain", cd: 12, mult: 1.8, count: 14, over: 4.0, range: 7, unlock: 11, voidOnly: true, color: "#c070ff", icon: "doomrain", sfx: "storm", dtype: "mag", elem: "void", mana: 44, desc: "4초 동안 공허의 빛줄기 14개가 무작위 적을 내리치고 주변을 휩쓴다", shape: "rain" }),
    S({ id: "abyssling", name: "심연의 사도", kind: "summon", cd: 16, mult: 5.5, dur: 10, every: 0.6, range: 7, unlock: 11, voidOnly: true, color: "#9a6aff", icon: "abyssling", sfx: "summon2", dtype: "mag", elem: "void", mana: 36, desc: "10초 동안 사도가 앞줄의 적을 쉬지 않고 찢어발긴다", shape: "front" }),
  );
})();

// ---- 계열별 핵심 고유 장비 (출혈 · 중독 · 점화 · 마나 · 마법 치명 · 원소) ----
UNIQUES.push(
  U("bloodaxe", "피에 젖은 도끼", "weapon", 1, "common", 3, [["bleedChance", [0.3, 0.4]], ["dotDmg", [0.25, 0.35]], ["atkPct", -0.1]], "닦아낼 틈이 없다."),
  U("thirst", "핏빛 갈증", "gloves", 2, "common", 5, [["bleedChance", [0.22, 0.28]], ["dotDmg", [0.45, 0.55]], ["dotDur", 0.3], ["hpMore", 0.85]], "상처가 닫히기 전에 다시 연다."),
  U("brand", "학살자의 낙인", "weapon", 3, "hell", 1, [["bleedChance", [0.45, 0.55]], ["dotDmg", [0.9, 1.1]], ["physDmg", 0.4], ["dmgTaken", 0.15]], "피는 마를 틈이 없다."),
  U("viperfang", "독사의 이빨", "ring", 1, "common", 3, [["poisonChance", [0.28, 0.35]], ["dotDmg", [0.2, 0.3]], ["hpPct", -0.1]], "물리면 늦는다."),
  U("plaguemask", "역병 의사의 가면", "helm", 2, "tower", 1, [["poisonChance", [0.28, 0.35]], ["dotDmg", [0.45, 0.55]], ["regen", 0.004]], "숨을 쉴 때마다 독이 퍼진다."),
  U("venomking", "독왕의 손길", "gloves", 3, "endless", 1, [["poisonChance", [0.45, 0.55]], ["dotDmg", [0.9, 1.1]], ["dotDur", 0.5], ["cdr", 0.1]], "쌓이고 쌓여 죽음이 된다."),
  U("pyrerobe", "화염술사의 로브", "armor", 2, "common", 6, [["igniteChance", [0.28, 0.35]], ["fireDmg", [0.28, 0.35]], ["manaPct", [0.28, 0.34]]], "불은 마나로 타오른다."),
  U("lavaheart", "용암의 심장", "neck", 3, "hell", 1, [["igniteChance", [0.55, 0.65]], ["dotDmg", [0.7, 0.9]], ["fireDmg", [0.45, 0.55]], ["penElem", 0.1]], "식지 않는 박동."),
  U("plaguebearer", "만병의 근원", "neck", 4, "tower", 1, [["bleedChance", 0.3], ["poisonChance", 0.3], ["igniteChance", 0.3], ["dotDmg", [1.1, 1.3]], ["dotDur", 0.4], ["allDmg", 0.2]], "모든 상처는 하나로 이어진다."),
  U("manafall", "마나 폭포", "armor", 1, "common", 3, [["manaPct", [0.55, 0.65]], ["manaRegenFlat", [7, 9]], ["defMore", 0.8]], "넘쳐흘러 방어를 잊었다."),
  U("archmage", "대마도사의 지팡이", "weapon", 2, "common", 6, [["manaToSpell", [0.28, 0.34]], ["magPct", [0.28, 0.34]], ["manaRegen", 0.02]], "마나의 흐름을 지팡이로 모은다."),
  U("manabarrier", "마력 순환 갑주", "armor", 3, "common", 7, [["manaRegen", [0.02, 0.03]], ["manaPct", [0.45, 0.55]], ["manaCostRed", 0.10], ["hpMore", 0.6]], "마나가 흐르는 한 쓰러지지 않는다."),
  U("abyssmind", "마력의 심연", "helm", 3, "endless", 1, [["manaToSpell", [0.38, 0.45]], ["manaPct", [0.55, 0.65]], ["manaCostRed", 0.2], ["dmgPerMana", 0.02]], "들여다볼수록 깊어진다."),
  U("soulreap", "영혼 수확 반지", "ring", 2, "hell", 1, [["manaOnKill", [5, 7]], ["dmgPerMana", [0.011, 0.014]], ["manaRegenFlat", 5]], "죽음이 곧 마나."),
  U("spellblade", "마법검", "weapon", 3, "tower", 1, [["magCrit", 1], ["critChance", [0.1, 0.14]], ["atkPct", [0.28, 0.34]], ["magPct", [0.28, 0.34]]], "벤 자리에 마법이 터진다."),
  U("cycle", "원소 순환", "neck", 2, "common", 5, [["elemDmg", [0.45, 0.55]], ["penElem", [0.13, 0.17]], ["fireDmg", 0.28], ["coldDmg", 0.28], ["lightDmg", 0.28]], "불, 얼음, 번개. 다시 불."),
  U("whistle", "군단장의 호각", "neck", 2, "endless", 1, [["aoeDmg", [0.55, 0.65]], ["normal", [0.35, 0.45]], ["cdr", 0.08]], "한 번 불면 모두 몰려온다."),
);
// ---- 다양성 추가: 처형·처치 회복·보스/원거리 피해 감소·상태이상·골드 계열 등 ----
UNIQUES.push(
  U("butcheraxe", "도살자의 손도끼", "weapon", 1, "common", 1, [["atkPct", [0.15, 0.2]], ["executeDmg", [0.25, 0.35]], ["bleedChance", 0.10]], "끝을 보는 일에 익숙하다."),
  U("huntermark", "사냥꾼의 표식", "ring", 1, "common", 1, [["boss", 0.18], ["ranged", 0.18], ["critChance", 0.04]], "한 번 찍히면 놓치지 않는다."),
  U("bloodhood", "피 묻은 두건", "helm", 1, "common", 2, [["killHeal", 0.001], ["lifesteal", 0.008], ["hpPct", 0.10]], "쓰러진 것의 온기를 마신다."),
  U("stalkerboots", "추적자의 장화", "boots", 2, "common", 3, [["cdr", 0.05], ["dodge", 0.05], ["rangedTaken", 0.08]], "발소리가 없다."),
  U("viperfang", "독사의 송곳니", "weapon", 2, "common", 4, [["poisonChance", 0.15], ["dotDmg", 0.35], ["dotDur", 0.20], ["atkPct", 0.15]], "물린 곳은 오래 아프다."),
  U("frostsigil", "한파의 인장", "ring", 2, "common", 4, [["coldDmg", 0.35], ["penElem", 0.08], ["cdr", 0.03]], "손끝이 시리다."),
  U("stormarbiter", "폭풍의 중재자", "gloves", 2, "common", 5, [["lightDmg", 0.35], ["chainDmg", 0.25], ["chainJumps", 1]], "번개가 말을 듣는다."),
  U("bulwarkplate", "철벽의 수호자", "armor", 2, "common", 5, [["defPct", 0.25], ["bossTaken", 0.08], ["hpPct", 0.12]], "거인의 발에도 버틴다."),
  U("greedcharm", "탐욕의 목걸이", "neck", 2, "common", 3, [["goldFind", 0.35], ["mf", 0.12], ["expFind", 0.15]], "금화 소리를 따라 걷는다."),
  U("slaughtergloves", "학살자의 장갑", "gloves", 3, "common", 8, [["executeDmg", 0.45], ["critDmg", 0.35], ["normal", 0.20], ["killHeal", 0.001]], "서 있는 자가 없을 때까지."),
  U("manaleech", "마나 기생충", "neck", 3, "common", 7, [["manaHit", 0.003], ["manaOnKill", 10], ["manaCostRed", 0.08], ["magPct", 0.12]], "주인의 마나를 먹고 자란다."),
  U("phoenixfeather", "불사조의 깃털", "helm", 3, "common", 8, [["revive", 1], ["fireDmg", 0.30], ["regen", 0.004]], "재가 된 뒤에야 날개를 편다."),
  U("shadowcloak", "그림자 외투", "armor", 3, "common", 8, [["dodge", 0.08], ["dodgeCap", 0.6], ["rangedTaken", 0.12], ["cdr", 0.05]], "그림자는 맞지 않는다."),
  U("reaperscythe", "저승사자의 낫", "weapon", 3, "tower", 1, [["executeDmg", 0.6], ["boss", 0.25], ["critChance", 0.08], ["lifesteal", 0.01]], "마지막 한 번을 위해 휘두른다."),
  U("executorring", "집행관의 반지", "ring", 2, "endless", 1, [["elite", 0.35], ["aoeDmg", 0.15], ["killHeal", 0.001]], "정예는 줄 세워서."),
  U("endlessboots", "무한의 장화", "boots", 3, "endless", 1, [["cdr", 0.08], ["dodge", 0.06], ["killHeal", 0.0012], ["mf", 0.08]], "멈추면 쓰러진다."),
  U("emberheart", "불씨 박힌 심장석", "neck", 2, "hell", 1, [["fireDmg", 0.40], ["igniteChance", 0.15], ["dotDmg", 0.25]], "식지 않는 숯."),
  U("hellhound", "지옥견의 두개골", "helm", 3, "hell", 1, [["fireDmg", 0.35], ["killHeal", 0.001], ["normal", 0.25], ["dodge", 0.05]], "짖지 않는다. 물 뿐이다.")
);
UNIQUES.forEach((u) => { u.ico = u.slot; UNIQUE_BY_ID[u.id] = u; });

// ---- 스킬 연마: 레벨(연마석) + 룬(드랍) ----
const SKILL_MAX_LV = 20;
const honeCost = (lvl) => 3 + 2 * lvl;
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
  U("swiftboots", "질주의 장화", "boots", 1, "common", 2, [["cdr", [0.10, 0.13]], ["hpPct", -0.1]], "발이 먼저 도착한다."),
  U("thiefshoes", "도둑의 신발", "boots", 1, "common", 3, [["mf", [0.45, 0.6]], ["goldFind", [0.35, 0.45]], ["defMore", 0.8]], "소리 없이, 흔적 없이, 빠짐없이."),
  U("ashboots", "재투성이 장화", "boots", 1, "hell", 1, [["fireDmg", [0.25, 0.35]], ["hpPct", [0.18, 0.24]], ["manaPct", -0.15]], "아직 따뜻하다."),
  U("windwalk", "바람걸음 장화", "boots", 2, "common", 4, [["dodge", [0.2, 0.25]], ["dodgeCap", 0.6], ["cdr", 0.1], ["manaRegenFlat", 3]], "닿지 않는 곳에서 걷는다."),
  U("riftleap", "균열 도약자의 신발", "boots", 2, "tower", 1, [["cdr", [0.18, 0.22]], ["allDmg", [0.13, 0.17]], ["hpMore", 0.85]], "한 걸음에 한 층."),
  U("timestride", "시간을 걷는 신발", "boots", 3, "common", 7, [["cdr", [0.22, 0.26]], ["cdrCap", 0.65], ["manaRegen", 0.02], ["allDmg", [0.16, 0.2]]], "발걸음마다 초침이 멈춘다."),
  U("embertrail", "불길 위의 걸음", "boots", 3, "hell", 1, [["fireDmg", [0.45, 0.55]], ["igniteChance", 0.3], ["regen", 0.008], ["dmgTaken", -0.1]], "지나간 자리에 불이 남는다."),
  U("marchboots", "끝없는 행군의 장화", "boots", 3, "endless", 1, [["regen", [0.012, 0.015]], ["hpPct", [0.4, 0.5]], ["dmgTaken", -0.12], ["manaRegenFlat", 6]], "멈추지 않는 발."),
  U("angelstep", "천사의 발자국", "boots", 4, "common", 8, [["cdr", [0.18, 0.22]], ["allDmg", [0.22, 0.26]], ["dodge", 0.15], ["hpPct", 0.35], ["manaRegen", 0.03], ["mf", 0.5]], "밟은 자리마다 빛이 핀다."),
  U("dimshoes", "차원 도약화", "boots", 4, "tower", 1, [["cdr", 0.22], ["allDmg", 0.25], ["mf", [0.9, 1.1]], ["penElem", 0.1], ["manaRegenFlat", 8]], "여기와 저기의 경계가 없다."),
  // 장갑
  U("minergrip", "광부의 장갑", "gloves", 1, "common", 2, [["hpPct", [0.25, 0.3]], ["atkPct", 0.1], ["magPct", 0.1], ["cdr", -0.05]], "곡괭이를 놓은 적이 없다."),
  U("ashgrip", "잿빛 손", "gloves", 2, "endless", 1, [["critChance", [0.1, 0.13]], ["critDmg", [0.35, 0.45]], ["lifesteal", 0.03]], "붙잡히면 놓치지 않는다."),
  U("godhand", "신의 손", "gloves", 4, "common", 8, [["critChance", 0.2], ["critDmg", 0.7], ["atkPct", 0.35], ["magPct", 0.35], ["ignoreDef", 0.18], ["ignoreRes", 0.18]], "만지는 순간 결정된다."),
  // 무기
  U("shardblade", "균열의 파편검", "weapon", 1, "tower", 1, [["voidDmg", [0.35, 0.45]], ["atkPct", 0.2], ["magPct", 0.2], ["hpPct", -0.1]], "베면 베일수록 날이 선다."),
  U("eternalblade", "영겁의 검", "weapon", 2, "endless", 1, [["allDmg", [0.17, 0.21]], ["cdr", 0.1], ["lifesteal", 0.04]], "닳지 않는다."),
  U("hellverdict", "지옥불의 심판자", "weapon", 4, "hell", 1, [["atkMore", 1.45], ["magMore", 1.45], ["fireDmg", 0.55], ["igniteChance", 0.3], ["ignoreRes", 0.2]], "불꽃이 판결문을 읽는다."),
  // 갑옷
  U("riftwatch", "균열 파수꾼의 갑옷", "armor", 1, "tower", 1, [["hpPct", [0.35, 0.45]], ["defPct", [0.4, 0.5]], ["manaPct", -0.15]], "문 앞에서 영원히 선다."),
  U("everarmor", "영원의 갑주", "armor", 4, "endless", 1, [["hpMore", 1.9], ["regen", 0.02], ["dmgTaken", -0.25], ["bossTaken", 0.12], ["lifesteal", 0.04], ["hpPct", 0.3]], "쓰러지는 법을 잊어버렸다."),
  // 목걸이 / 반지
  U("ashnecklace", "재의 목걸이", "neck", 1, "hell", 1, [["fireDmg", [0.28, 0.35]], ["manaPct", 0.2], ["hpPct", -0.1]], "목에 얹힌 열기."),
  U("startear", "별의 눈물", "neck", 4, "common", 8, [["allDmg", 0.28], ["mf", 0.9], ["critDmg", 0.45], ["cdr", 0.1], ["manaPct", 0.3], ["expFind", 0.4]], "하늘이 떨군 단 한 방울."),
  U("soulpact", "영혼의 서약", "ring", 4, "common", 8, [["lifesteal", 0.06], ["allDmg", 0.22], ["critChance", 0.14], ["spellCrit", 0.14], ["cdr", 0.1], ["manaOnKill", 4]], "서약은 피로 쓰이고 빛으로 지켜진다."),
);
UNIQUES.forEach((u) => { u.ico = u.slot; UNIQUE_BY_ID[u.id] = u; });
