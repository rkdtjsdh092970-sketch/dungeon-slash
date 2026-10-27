// =========================================================
// 패시브 트리 (PoE식 방사형 그래프): 중앙에서 6개 계열이 뻗어나간다
// 노드는 인접한 노드가 활성화돼 있어야 찍을 수 있고, 회수는 연결이 끊기지 않을 때만 가능하다.
// 소형 1점 / 주요(★) 2점 / 핵심(◆) 3점
// =========================================================
const P_ARMS = [
  { id: "phys", name: "물리", color: "#ff7a6a",
    s: [["날카로운 일격", { atkPct: 0.04 }], ["치명 훈련", { critChance: 0.02 }], ["급소 노리기", { critDmg: 0.12 }], ["사냥꾼의 눈", { boss: 0.15, elite: 0.15 }, 2], ["연타", { physDmg: 0.08 }], ["학살의 정점", { allDmg: 0.12, critChance: 0.06, atkMore: 1.1 }, 3]],
    L: [["균열 찾기", { shredDef: 0.05 }], ["관통", { ignoreDef: 0.05 }], ["백전노장", { normal: 0.10 }], ["방어 파괴자", { ignoreDef: 0.08, shredDef: 0.08 }, 2]],
    R: [["흡혈 본능", { lifesteal: 0.005 }], ["숙련된 손", { cdr: 0.015 }], ["무기술", { atkFlat: 4 }], ["칼날 춤", { cdr: 0.03, critChance: 0.03 }, 2]] },
  { id: "mag", name: "마법", color: "#c58bff",
    s: [["비전 입문", { magPct: 0.04 }], ["주문 치명", { spellCrit: 0.02 }], ["마력 집중", { magDmg: 0.08 }], ["주문 증폭", { magPct: 0.08, spellCrit: 0.03 }, 2], ["마력 폭풍", { magPct: 0.06 }], ["마법 폭주", { magMore: 1.2, hpMore: 0.9 }, 3]],
    L: [["저항 약화", { shredRes: 0.05 }], ["저항 무시", { ignoreRes: 0.05 }], ["연쇄 번개", { chainJumps: 1 }], ["마법 관통", { ignoreRes: 0.08, shredRes: 0.08 }, 2]],
    R: [["비전 장력", { spellCrit: 0.02 }], ["치명 마술", { critDmg: 0.10 }], ["주문 가속", { cdr: 0.015 }], ["마력 폭발", { aoeDmg: 0.15, magDmg: 0.08 }, 2]] },
  { id: "elem", name: "원소", color: "#ff9a4a",
    s: [["불꽃", { fireDmg: 0.06 }], ["서리", { coldDmg: 0.06 }], ["번개", { lightDmg: 0.06 }], ["원소 공명", { elemDmg: 0.12 }, 2], ["공허의 속삭임", { voidDmg: 0.08 }], ["원소 지배", { elemDmg: 0.30, penElem: 0.10, hpMore: 0.9 }, 3]],
    L: [["화염 숙련", { fireDmg: 0.08 }], ["냉기 숙련", { coldDmg: 0.08 }], ["번개 숙련", { lightDmg: 0.08 }], ["저항 관통", { penElem: 0.12 }, 2]],
    R: [["공허 숙련", { voidDmg: 0.08 }], ["원소 관통", { penElem: 0.05 }], ["마력 조율", { magPct: 0.05 }], ["원소 폭발", { elemDmg: 0.10, aoeDmg: 0.10 }, 2]] },
  { id: "def", name: "방어", color: "#6ab4ff",
    s: [["강인한 육체", { hpPct: 0.05 }], ["단련된 피부", { defPct: 0.06 }], ["회피 감각", { dodge: 0.02 }], ["불굴의 의지", { hpPct: 0.12, dmgTaken: -0.05 }, 2], ["재생", { regen: 0.002 }], ["불굴", { revive: 1, hpPct: 0.12, dmgTaken: -0.05 }, 3]],
    L: [["두꺼운 가죽", { defFlat: 4 }], ["방어 숙련", { defPct: 0.06 }], ["생명력", { hpFlat: 40 }], ["철벽", { defPct: 0.15, hpPct: 0.08 }, 2]],
    R: [["회피 훈련", { dodge: 0.02 }], ["그림자 걸음", { dodge: 0.02 }], ["흡혈 본능", { lifesteal: 0.006 }], ["유령 걸음", { dodge: 0.05, dodgeCap: 0.6, regen: 0.002 }, 2]] },
  { id: "mana", name: "마나", color: "#5ad0ff",
    s: [["마나 샘", { manaPct: 0.06 }], ["마나 재생", { manaRegen: 0.004 }], ["효율", { manaCostRed: 0.04 }], ["마력의 흐름", { manaToSpell: 0.06, manaPct: 0.08 }, 2], ["마나 응축", { manaFlat: 20 }], ["마나의 화신", { manaToSpell: 0.15, manaShield: 0.2, hpMore: 0.85 }, 3]],
    L: [["집중", { manaCostRed: 0.03 }], ["마력 순환", { manaRegen: 0.004 }], ["마나 강화", { manaPct: 0.06 }], ["마력의 방패", { manaShield: 0.12, manaPct: 0.10 }, 2]],
    R: [["비전 전환", { manaToSpell: 0.03 }], ["정신력", { manaFlat: 15 }], ["원천", { manaRegen: 0.005 }], ["마나 폭풍", { manaToSpell: 0.06, cdr: 0.03 }, 2]] },
  { id: "util", name: "유틸", color: "#ffd24a",
    s: [["신속", { cdr: 0.015 }], ["수집가", { goldFind: 0.08 }], ["행운", { mf: 0.05 }], ["탐색자", { mf: 0.10, goldFind: 0.12, expFind: 0.10 }, 2], ["학자", { expFind: 0.08 }], ["군집의 지배자", { density: 1, aoeDmg: 0.12 }, 3]],
    L: [["속도", { cdr: 0.015 }], ["탐욕", { goldFind: 0.08 }], ["경험", { expFind: 0.08 }], ["연쇄 반응", { chainJumps: 1, chainDmg: 0.15 }, 2]],
    R: [["광역 훈련", { aoeDmg: 0.06 }], ["행운 훈련", { mf: 0.04 }], ["보물 사냥", { goldFind: 0.08 }], ["대박", { mf: 0.12 }, 2]] },
];
const P_BRIDGES = [   // 계열 사이를 잇는 혼합 노드 2개씩
  [["전투 마술", { atkPct: 0.03 }], ["마검", { magPct: 0.03 }]], [["마법 원소", { magDmg: 0.05 }], ["원소 조율", { elemDmg: 0.05 }]],
  [["원소 보호", { hpPct: 0.04 }], ["저항 단련", { dmgTaken: -0.02 }]], [["마나 방벽", { manaShield: 0.06 }], ["정신 단련", { manaPct: 0.05 }]],
  [["마력 수집", { manaRegen: 0.004 }], ["마나 효율", { manaCostRed: 0.03 }]], [["사냥 본능", { normal: 0.08 }], ["민첩한 손", { cdr: 0.015 }]],
];
const P_EXT = {   // 바깥 줄기 2개씩 (끝 노드는 주요)
  phys: { LL: [["출혈 숙련", { bleedChance: 0.08 }], ["피의 갈증", { dotDmg: 0.20, bleedChance: 0.10 }, 2]], RR: [["강타 숙련", { atkPct: 0.04 }], ["처형인", { critDmg: 0.15, boss: 0.10 }, 2]] },
  mag: { LL: [["점화", { igniteChance: 0.08 }], ["불길", { dotDmg: 0.20, igniteChance: 0.10 }, 2]], RR: [["비전 순환", { manaRegen: 0.004 }], ["마도 공학", { spellCrit: 0.04, magPct: 0.06 }, 2]] },
  elem: { LL: [["독 지식", { poisonChance: 0.08 }], ["맹독", { poisonChance: 0.10, dotDmg: 0.20 }, 2]], RR: [["냉기 응결", { coldDmg: 0.06 }], ["원소 해방", { elemDmg: 0.10, penElem: 0.06 }, 2]] },
  def: { LL: [["강철 피부", { defPct: 0.06 }], ["철벽 의지", { dmgTaken: -0.04, hpPct: 0.08 }, 2]], RR: [["끈질긴 생명", { regen: 0.002 }], ["복수", { lifesteal: 0.01, atkPct: 0.06 }, 2]] },
  mana: { LL: [["마나젠", { manaRegenFlat: 3 }], ["샘의 축복", { manaRegenFlat: 5, manaRegen: 0.004 }, 2]], RR: [["마나통", { manaFlat: 25 }], ["마나 물결", { dmgPerMana: 0.01, manaPct: 0.08 }, 2]] },
  util: { LL: [["탐색", { mf: 0.04 }], ["보물 감각", { mf: 0.08, goldFind: 0.10 }, 2]], RR: [["광역 감각", { aoeDmg: 0.06 }], ["전술가", { chainJumps: 1, cdr: 0.02 }, 2]] },
};
const PASSIVES = [], PASSIVE_BY_ID = {};
(function buildPassives() {
  const R = (k) => 62 * k, add = (id, name, per, cost, ang, rad, links, arm, kind) => { const p = { id, name, per, cost: cost || 1, x: Math.cos(ang) * R(rad), y: Math.sin(ang) * R(rad), links: links.slice(), arm, kind: kind || (cost === 3 ? "key" : cost === 2 ? "notable" : "small"), text: "" }; PASSIVES.push(p); PASSIVE_BY_ID[id] = p; return p; };
  const n = P_ARMS.length;
  P_ARMS.forEach((A, i) => {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2, d = 0.26, id = (s) => `${A.id}_${s}`;
    A.s.forEach((t, k) => add(id("s" + (k + 1)), t[0], t[1], t[2], a, k + 1.15, k === 0 ? ["C"] : [id("s" + k)], A.id));
    A.L.forEach((t, k) => add(id("l" + (k + 1)), t[0], t[1], t[2], a - d, 2.9 + k * 0.78, [k === 0 ? id("s2") : id("l" + k)], A.id));
    A.R.forEach((t, k) => add(id("r" + (k + 1)), t[0], t[1], t[2], a + d, 3.4 + k * 0.78, [k === 0 ? id("s3") : id("r" + k)], A.id));
    P_EXT[A.id].LL.forEach((t, k) => add(id("ll" + (k + 1)), t[0], t[1], t[2], a - 0.38, 4.5 + k * 0.7, [k === 0 ? id("l2") : id("ll" + k)], A.id));
    P_EXT[A.id].RR.forEach((t, k) => add(id("rr" + (k + 1)), t[0], t[1], t[2], a + 0.38, 4.7 + k * 0.7, [k === 0 ? id("r2") : id("rr" + k)], A.id));
  });
  P_BRIDGES.forEach((B, i) => {
    const A = P_ARMS[i], N = P_ARMS[(i + 1) % n], a0 = (i / n) * Math.PI * 2 - Math.PI / 2, a1 = (((i + 1) % n) / n) * Math.PI * 2 - Math.PI / 2 + (i === n - 1 ? Math.PI * 2 : 0), am = (a0 + a1) / 2;
    add(`b${i}_1`, B[0][0], B[0][1], 1, am - 0.08, 3.5, [`${A.id}_r1`], "bridge", "bridge");
    add(`b${i}_2`, B[1][0], B[1][1], 1, am + 0.08, 3.5, [`b${i}_1`, `${N.id}_l1`], "bridge", "bridge");
  });
  // 양방향 연결표
  PASSIVES.forEach((p) => p.links.forEach((q) => { if (q !== "C" && PASSIVE_BY_ID[q] && !PASSIVE_BY_ID[q].links.includes(p.id)) PASSIVE_BY_ID[q].links.push(p.id); }));
  const LBL = { atkPct: "공격력 +%", magPct: "주문력 +%", critChance: "물리 치명타 확률", critDmg: "치명타 피해", spellCrit: "주문 치명타 확률", physDmg: "물리 피해", magDmg: "마법 피해", boss: "보스 추가 피해", elite: "정예 추가 피해", normal: "일반 추가 피해",
    allDmg: "주는 피해", cdr: "쿨타임 감소", lifesteal: "생명력 흡수", hpPct: "체력", defPct: "방어력", dodge: "회피", regen: "초당 체력 회복", dmgTaken: "받는 피해", goldFind: "골드 획득", expFind: "경험치 획득", mf: "MF", aoeDmg: "광역 피해", chainDmg: "번개 피해",
    fireDmg: "화염 피해", coldDmg: "냉기 피해", lightDmg: "번개 피해", voidDmg: "공허 피해", elemDmg: "원소 피해", penElem: "속성 저항 관통", ignoreDef: "방어 무시", ignoreRes: "마법저항 무시", shredDef: "대상 방어력 감소", shredRes: "대상 마법저항 감소",
    manaPct: "마나", manaRegen: "초당 마나 재생", manaCostRed: "마나 소모 감소", dodgeCap: "회피 상한", bleedChance: "출혈 확률", poisonChance: "중독 확률", igniteChance: "점화 확률", dotDmg: "지속 피해", dotDur: "지속 시간", dmgPerMana: "최대 마나 100당 피해" };
  PASSIVES.forEach((p) => {
    p.text = Object.keys(p.per).map((k) => { const v = p.per[k];
      if (k === "manaRegenFlat") return `초당 마나 재생 +${v}`; if (k === "atkFlat") return `공격력 +${v}`; if (k === "hpFlat") return `체력 +${v}`; if (k === "defFlat") return `방어력 +${v}`; if (k === "manaFlat") return `마나 +${v}`;
      if (k === "chainJumps") return `번개 도약 +${v}`; if (k === "density") return `칸당 몹 수 +${v}`; if (k === "revive") return "전투당 1회 부활";
      if (k === "atkMore" || k === "magMore" || k === "hpMore") return `${{ atkMore: "공격력", magMore: "주문력", hpMore: "체력" }[k]} ${v >= 1 ? "+" : ""}${Math.round((v - 1) * 100)}%`;
      if (k === "manaToSpell") return `최대 마나의 ${Math.round(v * 100)}%만큼 주문력`; if (k === "manaShield") return `받는 피해의 ${Math.round(v * 100)}%를 마나가 흡수`;
      return `${LBL[k] || k} ${v > 0 ? "+" : ""}${(v * 100).toFixed(Math.abs(v) < 0.01 ? 1 : 0).replace(/\.0$/, "")}%`; }).join(" · ");
  });
})();
const passivePoints = (sv) => Math.max(0, sv.level - CFG.PASSIVE_START);
const passiveSpent = (sv) => { let n = 0; for (const id in (sv.pass || {})) if (PASSIVE_BY_ID[id]) n += PASSIVE_BY_ID[id].cost; return n; };
const passiveHas = (sv, id) => !!(sv.pass && sv.pass[id] && PASSIVE_BY_ID[id]);
function canAddPassive(sv, id) {
  const p = PASSIVE_BY_ID[id]; if (!p || passiveHas(sv, id)) return false;
  if (passivePoints(sv) - passiveSpent(sv) < p.cost) return false;
  return p.links.some((q) => q === "C" || passiveHas(sv, q));
}
function canRemovePassive(sv, id) {   // 제거 후에도 남은 노드가 모두 중앙과 이어져 있어야 한다
  if (!passiveHas(sv, id)) return false;
  const keep = Object.keys(sv.pass).filter((k) => k !== id && PASSIVE_BY_ID[k]), seen = new Set(), st = keep.filter((k) => PASSIVE_BY_ID[k].links.includes("C"));
  st.forEach((k) => seen.add(k));
  while (st.length) { const c = st.pop(); for (const q of PASSIVE_BY_ID[c].links) if (q !== "C" && !seen.has(q) && keep.includes(q)) { seen.add(q); st.push(q); } }
  return keep.every((k) => seen.has(k));
}
function addPassive(sv, id) { if (!canAddPassive(sv, id)) return false; sv.pass[id] = 1; return true; }
function removePassive(sv, id) { if (!canRemovePassive(sv, id)) return false; delete sv.pass[id]; return true; }
function resetPassives(sv) { sv.pass = {}; }
