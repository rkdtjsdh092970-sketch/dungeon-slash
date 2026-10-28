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
    s: [["비전 입문", { magPct: 0.04 }], ["주문 치명", { spellCrit: 0.02 }], ["마력 집중", { magDmg: 0.08 }], ["주문 증폭", { magPct: 0.08, spellCrit: 0.03, boss: 0.15, elite: 0.12 }, 2], ["마력 폭풍", { magPct: 0.06 }], ["마법 폭주", { magMore: 1.2, hpMore: 0.9 }, 3]],
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
    s: [["마나 샘", { manaPct: 0.06 }], ["마나 재생", { manaRegen: 0.004 }], ["효율", { manaCostRed: 0.04 }], ["마력의 흐름", { manaToSpell: 0.06, manaPct: 0.08 }, 2], ["마나 응축", { manaFlat: 20, manaToHp: 2 }], ["마나의 화신", { manaToSpell: 0.15, manaRegen: 0.012, manaHit: 0.002, hpMore: 0.85 }, 3]],
    L: [["집중", { manaCostRed: 0.03 }], ["마력 순환", { manaRegen: 0.004 }], ["마나 강화", { manaPct: 0.06, manaToHp: 2 }], ["마력의 방패", { manaShield: 0.12, manaPct: 0.10, manaToHp: 3 }, 2]],
    R: [["비전 전환", { manaToSpell: 0.03 }], ["정신력", { manaFlat: 15, manaToHp: 2 }], ["원천", { manaRegen: 0.005 }], ["마나 폭풍", { manaToSpell: 0.06, cdr: 0.03 }, 2]] },
  { id: "util", name: "유틸", color: "#ffd24a",
    s: [["신속", { cdr: 0.015 }], ["수집가", { goldFind: 0.08 }], ["행운", { mf: 0.05 }], ["탐색자", { mf: 0.10, goldFind: 0.12, aoeDmg: 0.05 }, 2], ["학자", { aoeDmg: 0.04 }], ["군집의 지배자", { density: 1, aoeDmg: 0.12 }, 3]],
    L: [["속도", { cdr: 0.015 }], ["탐욕", { goldFind: 0.08 }], ["경험", { aoeDmg: 0.04 }], ["연쇄 반응", { chainJumps: 1, chainDmg: 0.15 }, 2]],
    R: [["광역 훈련", { aoeDmg: 0.06 }], ["행운 훈련", { mf: 0.04 }], ["보물 사냥", { goldFind: 0.08 }], ["대박", { mf: 0.12 }, 2]] },
];
P_ARMS.push({ id: "skill", name: "스킬", color: "#6af0c0",
  s: [["집중 사격", { singleDmg: 0.06 }], ["스킬 숙련", { cdr: 0.015 }], ["지속의 달인", { persistDmg: 0.06 }], ["전용기 입문", { bossSkill: 0.20, boss: 0.06 }, 2], ["소환사의 길", { summonDmg: 0.06 }], ["스킬의 정점", { allDmg: 0.10, cdr: 0.04, skillDur: 0.10 }, 3]],
  L: [["마나 절약", { manaCostRed: 0.03 }], ["지속 연장", { skillDur: 0.08 }], ["확정 일격", { singleDmg: 0.08 }], ["보스 사냥 도구", { bossSkill: 0.25, boss: 0.08 }, 2]],
  R: [["소환 숙련", { summonDmg: 0.06 }], ["장판 숙련", { persistDmg: 0.06 }], ["상태이상 숙련", { dotDmg: 0.10 }], ["전용기 장인", { bossSkill: 0.30, cdr: 0.03 }, 2]] });
const P_BRIDGES = [   // 계열 사이를 잇는 혼합 노드 2개씩
  [["전투 마술", { atkPct: 0.03 }], ["마검", { magPct: 0.03 }]], [["마법 원소", { magDmg: 0.05 }], ["원소 조율", { elemDmg: 0.05 }]],
  [["원소 보호", { hpPct: 0.04 }], ["저항 단련", { dmgTaken: -0.02 }]], [["마나 정제", { manaCostRed: 0.02 }], ["정신 단련", { manaPct: 0.05 }]],
  [["마력 수집", { manaRegen: 0.004 }], ["마나 효율", { manaCostRed: 0.03 }]], [["사냥 본능", { normal: 0.08 }], ["민첩한 손", { cdr: 0.015 }]],
  [["스킬 연계", { cdr: 0.01, singleDmg: 0.03 }], ["전투 기술", { persistDmg: 0.03, summonDmg: 0.03 }]],
];
const P_EXT = {   // 바깥 줄기 2개씩 (끝 노드는 주요)
  phys: { LL: [["출혈 숙련", { bleedChance: 0.08 }], ["피의 갈증", { dotDmg: 0.20, bleedChance: 0.10 }, 2]], RR: [["강타 숙련", { atkPct: 0.04 }], ["처형인", { critDmg: 0.15, boss: 0.10 }, 2]] },
  mag: { LL: [["점화", { igniteChance: 0.08 }], ["불길", { dotDmg: 0.20, igniteChance: 0.10 }, 2]], RR: [["비전 순환", { manaRegen: 0.004 }], ["마도 공학", { spellCrit: 0.04, magPct: 0.06, boss: 0.10 }, 2]] },
  elem: { LL: [["독 지식", { poisonChance: 0.08 }], ["맹독", { poisonChance: 0.10, dotDmg: 0.20 }, 2]], RR: [["냉기 응결", { coldDmg: 0.06 }], ["원소 해방", { elemDmg: 0.10, penElem: 0.06 }, 2]] },
  def: { LL: [["강철 피부", { defPct: 0.06 }], ["철벽 의지", { dmgTaken: -0.04, hpPct: 0.08 }, 2]], RR: [["끈질긴 생명", { regen: 0.002 }], ["복수", { lifesteal: 0.01, atkPct: 0.06 }, 2]] },
  mana: { LL: [["마나젠", { manaRegenFlat: 3 }], ["샘의 축복", { manaRegenFlat: 5, manaRegen: 0.004 }, 2]], RR: [["마나통", { manaFlat: 25 }], ["마나 물결", { dmgPerMana: 0.01, manaPct: 0.08 }, 2]] },
  util: { LL: [["탐색", { mf: 0.04 }], ["보물 감각", { mf: 0.08, goldFind: 0.10 }, 2]], RR: [["광역 감각", { aoeDmg: 0.06 }], ["전술가", { chainJumps: 1, cdr: 0.02 }, 2]] },
  skill: { LL: [["상처의 기술", { bleedChance: 0.06, dotDmg: 0.08 }], ["상처 벌리기", { dotDur: 0.15, dotDmg: 0.15 }, 2]], RR: [["불씨의 기술", { igniteChance: 0.06, poisonChance: 0.06 }], ["상태이상의 대가", { dotDmg: 0.20, dotDur: 0.10 }, 2]] },
};
const P_OUT = {   // 바깥 확장 구역: 줄기 끝에서 갈라져 핵심(◆)으로 모인다 [이름, 효과, 비용]
  phys: [["격투의 심장", { atkPct: 0.05, critChance: 0.02 }, 1], ["베어내기", { critDmg: 0.15 }, 1], ["급소 사냥", { boss: 0.12, elite: 0.12 }, 2], ["연속 타격", { physDmg: 0.10, cdr: 0.02 }, 2], ["방어 관통", { ignoreDef: 0.06, shredDef: 0.06 }, 2], ["학살의 화신", { atkMore: 1.12, critDmg: 0.25, boss: 0.20 }, 3]],
  mag: [["비전 집중", { magPct: 0.05, spellCrit: 0.02 }, 1], ["마력 쇄도", { magDmg: 0.10 }, 1], ["주문 연쇄", { chainJumps: 1, chainDmg: 0.10, boss: 0.12 }, 2], ["공명", { cdr: 0.02, spellCrit: 0.03 }, 2], ["저항 붕괴", { ignoreRes: 0.06, shredRes: 0.06 }, 2], ["대마법사", { magMore: 1.12, spellCrit: 0.06, aoeDmg: 0.15, boss: 0.20 }, 3]],
  elem: [["화염의 숨결", { fireDmg: 0.08 }, 1], ["서리의 숨결", { coldDmg: 0.08 }, 1], ["폭풍의 숨결", { lightDmg: 0.08 }, 1], ["공허의 숨결", { voidDmg: 0.08, penElem: 0.04 }, 2], ["원소 융합", { elemDmg: 0.12 }, 2], ["원소의 군주", { elemDmg: 0.25, penElem: 0.15, aoeDmg: 0.10 }, 3]],
  def: [["단단한 몸", { hpPct: 0.06 }, 1], ["방패술", { defPct: 0.08 }, 1], ["수호의 맹세", { dmgTaken: -0.04 }, 2], ["재생의 피", { regen: 0.002, lifesteal: 0.005 }, 2], ["회피의 흐름", { dodge: 0.03 }, 2], ["불멸자", { hpMore: 1.12, defMore: 1.10, dmgTaken: -0.06 }, 3]],
  mana: [["마나 흡수", { manaHit: 0.0015 }, 1], ["마력 순환", { manaRegenFlat: 3 }, 1], ["마나 흡수 II", { manaHit: 0.0015, manaPct: 0.05 }, 2], ["비전 갈증", { manaOnKill: 4, manaRegen: 0.004 }, 2], ["마나 방벽", { manaShield: 0.06, manaPct: 0.06 }, 2], ["마력의 대양", { manaHit: 0.003, manaToSpell: 0.05, manaRegen: 0.006 }, 3]],
  util: [["수집의 감각", { goldFind: 0.10 }, 1], ["행운의 손", { mf: 0.08 }, 1], ["학습", { aoeDmg: 0.05 }, 2], ["광역 감각", { aoeDmg: 0.08, cdr: 0.02 }, 2], ["탐험가", { mf: 0.06, goldFind: 0.08 }, 2], ["보물왕", { mf: 0.20, aoeDmg: 0.08, goldFind: 0.20 }, 3]],
};
P_OUT.skill = [["숙련된 손놀림", { cdr: 0.02, singleDmg: 0.06 }, 1], ["대지의 지배", { persistDmg: 0.08, skillDur: 0.06 }, 1], ["군주의 부름", { summonDmg: 0.10 }, 2], ["처형 의식", { bossSkill: 0.30, critDmg: 0.10 }, 2], ["마력 연동", { cdr: 0.03, manaCostRed: 0.04 }, 2], ["스킬 마스터", { singleDmg: 0.15, persistDmg: 0.15, summonDmg: 0.15, bossSkill: 0.30, cdr: 0.03 }, 3]];
const P_OUT_GEO = [[0, 7.0, "s6"], [-0.24, 7.9, "e1"], [0.24, 7.9, "e1"], [-0.24, 8.8, "e2"], [0.24, 8.8, "e3"], [0, 9.7, ["e4", "e5"]]];
const PASSIVES = [], PASSIVE_BY_ID = {};
(function buildPassives() {
  const R = (k) => 62 * k, add = (id, name, per, cost, ang, rad, links, arm, kind) => { const p = { id, name, per, cost: cost || 1, x: Math.cos(ang) * R(rad), y: Math.sin(ang) * R(rad), links: links.slice(), arm, kind: kind || (cost === 3 ? "key" : cost === 2 ? "notable" : "small"), text: "" }; PASSIVES.push(p); PASSIVE_BY_ID[id] = p; return p; };
  const n = P_ARMS.length;
  P_ARMS.forEach((A, i) => {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2, d = 0.40, id = (s) => `${A.id}_${s}`;
    A.s.forEach((t, k) => add(id("s" + (k + 1)), t[0], t[1], t[2], a, k + 1.15, k === 0 ? ["C"] : [id("s" + k)], A.id));
    A.L.forEach((t, k) => add(id("l" + (k + 1)), t[0], t[1], t[2], a - d, 2.9 + k * 0.78, [k === 0 ? id("s2") : id("l" + k)], A.id));
    A.R.forEach((t, k) => add(id("r" + (k + 1)), t[0], t[1], t[2], a + d, 3.4 + k * 0.78, [k === 0 ? id("s3") : id("r" + k)], A.id));
    P_EXT[A.id].LL.forEach((t, k) => add(id("ll" + (k + 1)), t[0], t[1], t[2], a - 0.56, 4.5 + k * 0.7, [k === 0 ? id("l2") : id("ll" + k)], A.id));
    P_EXT[A.id].RR.forEach((t, k) => add(id("rr" + (k + 1)), t[0], t[1], t[2], a + 0.56, 4.7 + k * 0.7, [k === 0 ? id("r2") : id("rr" + k)], A.id));
    P_OUT[A.id].forEach((t, k) => { const g = P_OUT_GEO[k]; add(id("e" + (k + 1)), t[0], t[1], t[2], a + g[0], g[1], (Array.isArray(g[2]) ? g[2] : [g[2]]).map(id), A.id); });
  });
  P_BRIDGES.forEach((B, i) => {
    const A = P_ARMS[i], N = P_ARMS[(i + 1) % n], a0 = (i / n) * Math.PI * 2 - Math.PI / 2, a1 = (((i + 1) % n) / n) * Math.PI * 2 - Math.PI / 2 + (i === n - 1 ? Math.PI * 2 : 0), am = (a0 + a1) / 2;
    add(`b${i}_1`, B[0][0], B[0][1], 1, am - 0.08, 3.5, [`${A.id}_r1`], "bridge", "bridge");
    add(`b${i}_2`, B[1][0], B[1][1], 1, am + 0.08, 3.5, [`b${i}_1`, `${N.id}_l1`], "bridge", "bridge");
  });
  // 양방향 연결표
  PASSIVES.forEach((p) => p.links.forEach((q) => { if (q !== "C" && PASSIVE_BY_ID[q] && !PASSIVE_BY_ID[q].links.includes(p.id)) PASSIVE_BY_ID[q].links.push(p.id); }));
  // ---- 전체를 바깥으로 넓히고, 중요한 노드(주요/핵심) 사이에 흰색 연결 특성을 끼워 넣는다: 좋은 특성은 멀리 있고, 가는 길에 작은 보너스를 먹는다 ----
  const RS = 3.6; PASSIVES.forEach((p) => { p.x *= RS; p.y *= RS; });
  const FIL = {
    phys: [{ atkPct: 0.012 }, { critChance: 0.006 }, { physDmg: 0.02 }], mag: [{ magPct: 0.012 }, { spellCrit: 0.006 }, { magDmg: 0.02 }], elem: [{ elemDmg: 0.025 }, { penElem: 0.01 }, { aoeDmg: 0.015 }],
    def: [{ hpPct: 0.02 }, { defPct: 0.025 }, { dmgTaken: -0.005 }], mana: [{ manaPct: 0.02 }, { manaRegen: 0.0012 }, { manaHit: 0.0003 }], util: [{ cdr: 0.004 }, { goldFind: 0.03 }, { mf: 0.02 }], skill: [{ cdr: 0.004 }, { singleDmg: 0.02 }, { persistDmg: 0.02 }], bridge: [{ hpPct: 0.01, atkPct: 0.006 }, { magPct: 0.006, defPct: 0.01 }, { cdr: 0.003 }],
  };
  { let fid = 0; const seen = new Set();
    for (const A of PASSIVES.slice()) for (const qid of A.links.slice()) {
      if (qid === "C") continue; const B = PASSIVE_BY_ID[qid]; if (!B || B.kind === "filler" || A.kind === "filler") continue;
      const key = A.id < B.id ? A.id + "|" + B.id : B.id + "|" + A.id; if (seen.has(key)) continue; seen.add(key);
      const mc = Math.max(A.cost, B.cost), dd = Math.hypot(A.x - B.x, A.y - B.y), n = Math.min(mc >= 3 ? 2 : mc >= 2 ? 1 : 0, Math.floor(dd / 36) - 1); if (n <= 0) continue;   // 노드 간격이 좁으면 끼워 넣지 않는다
      A.links = A.links.filter((x) => x !== B.id); B.links = B.links.filter((x) => x !== A.id);
      const arm = A.arm === "bridge" ? B.arm : A.arm; let prev = A;
      for (let i = 1; i <= n; i++) {
        const t = i / (n + 1), id = `f${++fid}`, F = { id, name: "연결 특성", per: FIL[arm][fid % 3], cost: 1, x: A.x + (B.x - A.x) * t, y: A.y + (B.y - A.y) * t, links: [prev.id], arm, kind: "filler" };
        PASSIVES.push(F); PASSIVE_BY_ID[id] = F; prev.links.push(id); prev = F;
      }
      prev.links.push(B.id); B.links.push(prev.id);
    }
  }
  // v4: 노드 세분화 — 모든 주요/일반 노드 곁에 작은 위성 노드를 하나씩 더 둔다 (각 계열의 다양한 효과를 조금씩 따로 고를 수 있게). 부모 노드를 먼저 찍어야 한다
  const SAT = {
    phys: [{ atkFlat: 3 }, { critChance: 0.01 }, { critDmg: 0.06 }, { physDmg: 0.04 }, { normal: 0.05 }, { boss: 0.06 }, { ignoreDef: 0.03 }, { bleedChance: 0.04 }],
    mag: [{ magPct: 0.025 }, { spellCrit: 0.01 }, { magDmg: 0.04 }, { cdr: 0.008 }, { ignoreRes: 0.03 }, { aoeDmg: 0.05 }, { manaRegen: 0.002 }, { igniteChance: 0.04 }],
    elem: [{ fireDmg: 0.04 }, { coldDmg: 0.04 }, { lightDmg: 0.04 }, { voidDmg: 0.04 }, { elemDmg: 0.05 }, { penElem: 0.03 }, { dotDmg: 0.06 }, { shockChance: 0.04 }],
    def: [{ hpPct: 0.03 }, { defPct: 0.04 }, { dodge: 0.01 }, { regen: 0.001 }, { dmgTaken: -0.015 }, { hpFlat: 25 }, { defFlat: 3 }, { lifesteal: 0.003 }],
    mana: [{ manaPct: 0.04 }, { manaRegen: 0.003 }, { manaCostRed: 0.02 }, { manaFlat: 12 }, { manaToHp: 1 }, { manaToSpell: 0.02 }, { manaRegenFlat: 2 }, { manaHit: 0.001 }],
    util: [{ cdr: 0.008 }, { goldFind: 0.05 }, { mf: 0.03 }, { aoeDmg: 0.04 }, { chainDmg: 0.05 }, { goldFind: 0.04, mf: 0.02 }, { cdr: 0.006, aoeDmg: 0.02 }, { mf: 0.04 }],
    skill: [{ singleDmg: 0.04 }, { persistDmg: 0.04 }, { summonDmg: 0.04 }, { bossSkill: 0.12 }, { cdr: 0.008 }, { dotDmg: 0.06 }, { dotDur: 0.08 }, { skillDur: 0.06 }],
  };
  { let k = 0; const SN = { phys: "물리", mag: "마법", elem: "원소", def: "방어", mana: "마나", util: "유틸", skill: "스킬" };
    for (const P of PASSIVES.slice()) {
      if (P.kind === "bridge" || P.kind === "filler" || P.kind === "key" || !SAT[P.arm] || P.links.length >= 3 || /_s1$/.test(P.id)) continue;   // 연결이 3개인 노드(갈림길)에는 붙이지 않는다
      const pool = SAT[P.arm], per = pool[(k * 3 + (P.id.length * 7)) % pool.length], ang = Math.atan2(P.y, P.x) + (k % 2 ? 1 : -1) * Math.PI / 2, d = 100 + (P.kind === "notable" ? 10 : 0);
      const id = P.id + "_x", Q = { id, name: `${SN[P.arm]} 세부 ${++k}`, per: Object.assign({}, per), cost: 1, x: P.x + Math.cos(ang) * d, y: P.y + Math.sin(ang) * d, links: [P.id], arm: P.arm, kind: "small" };
      PASSIVES.push(Q); PASSIVE_BY_ID[id] = Q; P.links.push(id);
    } }
  // v4: 줄기마다 정해진 기하 구조로 배치한다 — 선이 서로 겹치지 않고, 한 노드에서 최대 3갈래까지만 뻗는다
  {
    const NA = P_ARMS.length, LAY = { s: [400, 800, 1200, 1600, 2000, 2400], l: [[1250, -340], [1650, -470], [2050, -500], [2450, -440]], r: [[1550, 340], [1950, 470], [2350, 500], [2750, 440]],
      ll: [[2000, -780], [2400, -820]], rr: [[2300, 780], [2700, 820]], e: [[2800, 0], [3100, -260], [3100, 260], [3400, -300], [3400, 300], [3700, 0]] };
    const place = (p, th, u, v) => { p.x = u * Math.cos(th) - v * Math.sin(th); p.y = u * Math.sin(th) + v * Math.cos(th); };
    P_ARMS.forEach((A, i) => {
      const th = (i / NA) * Math.PI * 2 - Math.PI / 2, g = (id) => PASSIVE_BY_ID[`${A.id}_${id}`];
      LAY.s.forEach((u, k) => place(g("s" + (k + 1)), th, u, 0));
      LAY.l.forEach(([u, v], k) => place(g("l" + (k + 1)), th, u, v)); LAY.r.forEach(([u, v], k) => place(g("r" + (k + 1)), th, u, v));
      LAY.ll.forEach(([u, v], k) => place(g("ll" + (k + 1)), th, u, v)); LAY.rr.forEach(([u, v], k) => place(g("rr" + (k + 1)), th, u, v));
      LAY.e.forEach(([u, v], k) => place(g("e" + (k + 1)), th, u, v));
      A._th = th;
    });
    for (let i = 0; i < NA; i++) { const a1 = PASSIVE_BY_ID[`${P_ARMS[i].id}_r1`], a2 = PASSIVE_BY_ID[`${P_ARMS[(i + 1) % NA].id}_l1`], b1 = PASSIVE_BY_ID[`b${i}_1`], b2 = PASSIVE_BY_ID[`b${i}_2`];
      b1.x = a1.x + (a2.x - a1.x) * 0.34; b1.y = a1.y + (a2.y - a1.y) * 0.34; b2.x = a1.x + (a2.x - a1.x) * 0.68; b2.y = a1.y + (a2.y - a1.y) * 0.68; }
    // 연결 특성(필러): 양 끝 노드 사이를 균등 분할
    const isF = (p) => p.kind === "filler";
    for (const A of PASSIVES) { if (isF(A)) continue; for (const q of A.links) { let c = PASSIVE_BY_ID[q]; if (!c || !isF(c)) continue; const chain = []; let prev = A; while (c && isF(c)) { chain.push(c); const nx = c.links.map((x) => PASSIVE_BY_ID[x]).find((o) => o && o !== prev); prev = c; c = nx; } if (!c || c.id < A.id) continue;
      chain.forEach((f, k) => { const t = (k + 1) / (chain.length + 1); f.x = A.x + (c.x - A.x) * t; f.y = A.y + (c.y - A.y) * t; }); } }
    // 위성 노드: 부모에서 바깥쪽(줄기 반대편)으로 짧게 튀어나온다
    PASSIVES.forEach((q) => { if (!q.id.endsWith("_x")) return; const par = PASSIVE_BY_ID[q.id.slice(0, -2)], A = P_ARMS.find((z) => z.id === par.arm), th = A ? A._th : Math.atan2(par.y, par.x), lat = -Math.sin(th) * par.x + Math.cos(th) * par.y, sg = lat > 40 ? 1 : lat < -40 ? -1 : (par.id.length % 2 ? 1 : -1);
      q.x = par.x - Math.sin(th) * 190 * sg; q.y = par.y + Math.cos(th) * 190 * sg; });
    PASSIVES.forEach((p) => { p.x = Math.round(p.x); p.y = Math.round(p.y); });
  }
  const LBL = { atkPct: "공격력", magPct: "주문력", critChance: "물리 치명타 확률", critDmg: "치명타 피해", spellCrit: "주문 치명타 확률", physDmg: "물리 피해", magDmg: "마법 피해", boss: "보스 추가 피해", elite: "정예 추가 피해", normal: "일반 추가 피해",
    allDmg: "주는 피해", cdr: "쿨타임 감소", lifesteal: "생명력 흡수", hpPct: "체력", defPct: "방어력", dodge: "회피", regen: "초당 체력 회복", dmgTaken: "받는 피해", goldFind: "골드 획득", expFind: "경험치 획득", mf: "MF", aoeDmg: "광역 피해", chainDmg: "번개 피해",
    fireDmg: "화염 피해", coldDmg: "냉기 피해", lightDmg: "번개 피해", voidDmg: "공허 피해", elemDmg: "원소 피해", penElem: "속성 저항 관통", ignoreDef: "방어 무시", ignoreRes: "마법저항 무시", shredDef: "대상 방어력 감소", shredRes: "대상 마법저항 감소",
    manaPct: "마나", manaHit: "적중 시 마나 흡수(최대 마나)", manaRegen: "초당 마나 재생", manaCostRed: "마나 소모 감소", dodgeCap: "회피 상한", singleDmg: "단일 대상 스킬 피해", persistDmg: "지속·장판 스킬 피해", summonDmg: "소환 스킬 피해", bossSkill: "보스 전용기 피해", skillDur: "스킬 지속시간", bleedChance: "출혈 확률", poisonChance: "중독 확률", igniteChance: "점화 확률", dotDmg: "지속 피해", dotDur: "지속 시간", dmgPerMana: "최대 마나 100당 피해" };
  PASSIVES.forEach((p) => {
    p.text = Object.keys(p.per).map((k) => { const v = p.per[k];
      if (k === "manaToHp") return `최대 마나 1당 체력 +${v}`; if (k === "manaRegenFlat") return `초당 마나 재생 +${v}`; if (k === "atkFlat") return `공격력 +${v}`; if (k === "hpFlat") return `체력 +${v}`; if (k === "defFlat") return `방어력 +${v}`; if (k === "manaFlat") return `마나 +${v}`;
      if (k === "chainJumps") return `번개 도약 +${v}`; if (k === "density") return `칸당 몹 수 +${v}`; if (k === "revive") return "전투당 1회 부활";
      if (k === "atkMore" || k === "magMore" || k === "hpMore") return `${{ atkMore: "공격력", magMore: "주문력", hpMore: "체력" }[k]} ${v >= 1 ? "+" : ""}${Math.round((v - 1) * 100)}%`;
      if (k === "manaToSpell") return `최대 마나의 ${Math.round(v * 100)}%만큼 주문력`; if (k === "manaShield") return `받는 피해의 ${Math.round(v * 100)}%를 마나가 흡수`;
      return `${LBL[k] || k} ${v > 0 ? "+" : ""}${(v * 100).toFixed(Math.abs(v) < 0.005 ? 2 : Math.abs(v) < 0.01 ? 1 : 0).replace(/\.0$/, "")}%`; }).join(" · ");
  });
})();
const passivePoints = (sv) => Math.max(0, sv.level - 1) * CFG.PASSIVE_PER_LV;   // v4: 레벨마다 포인트 (균열 1층 첫 클리어 = 1레벨)
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
// 먼 노드를 눌렀을 때: 이미 찍은 노드(또는 시작점)에서 그 노드까지 가장 포인트가 적게 드는 경로 (찍지 않은 노드들, 순서대로)
function passivePath(sv, id) {
  const T = PASSIVE_BY_ID[id]; if (!T || passiveHas(sv, id)) return null;
  const dist = {}, prev = {}, todo = new Set();
  for (const p of PASSIVES) if (!passiveHas(sv, p.id) && p.links.some((q) => q === "C" || passiveHas(sv, q))) { dist[p.id] = p.cost; prev[p.id] = null; todo.add(p.id); }
  while (todo.size) {
    let cur = null; for (const k of todo) if (cur === null || dist[k] < dist[cur]) cur = k; todo.delete(cur);
    if (cur === id) break;
    for (const q of PASSIVE_BY_ID[cur].links) { if (q === "C" || passiveHas(sv, q)) continue; const nd = dist[cur] + PASSIVE_BY_ID[q].cost; if (dist[q] === undefined || nd < dist[q]) { dist[q] = nd; prev[q] = cur; todo.add(q); } }
  }
  if (dist[id] === undefined) return null;
  const path = []; for (let c = id; c; c = prev[c]) path.unshift(c);
  return { ids: path, cost: dist[id] };
}
function addPassivePath(sv, id) {
  const P = passivePath(sv, id); if (!P || P.cost > passivePoints(sv) - passiveSpent(sv)) return 0;
  for (const k of P.ids) sv.pass[k] = 1; return P.ids.length;
}
function addPassive(sv, id) { if (!canAddPassive(sv, id)) return false; sv.pass[id] = 1; return true; }
function removePassive(sv, id) { if (!canRemovePassive(sv, id)) return false; delete sv.pass[id]; return true; }
function resetPassives(sv) { sv.pass = {}; }
// 패시브 프리셋: 찍은 노드 구성을 저장했다가 한 번에 적용한다 (포인트가 모자라면 중심에서 가까운 순서로 가능한 만큼만 적용)
function applyPassPreset(sv, p) {
  const ids = Object.keys(p.pass || {}).filter((k) => PASSIVE_BY_ID[k]), want = new Set(ids), out = {}; let left = passivePoints(sv), n = 0;
  const frontier = () => ids.filter((k) => !out[k] && PASSIVE_BY_ID[k].links.some((q) => q === "C" || out[q]));
  for (let f = frontier(); f.length; f = frontier()) { for (const k of f) { const c = PASSIVE_BY_ID[k].cost; if (c <= left) { out[k] = 1; left -= c; n++; } else want.delete(k); } if (f.every((k) => !out[k])) break; }
  sv.pass = out; return { applied: n, total: ids.length };
}
