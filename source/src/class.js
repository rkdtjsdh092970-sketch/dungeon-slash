// ---- 전직 (v4.41): 레이드 던전에서 얻는 전직의 서로 1~3차 전직. 전직마다 전직 포인트 2점을 받아 7개 전직 패시브 트리에 찍는다 ----
// 트리마다 뿌리(r) 하나와 두 갈래(a1→a2, b1→b2). 포인트가 적은 만큼 노드 하나하나가 강하다.
const C_CLASS_NAMES = ["", "각성자", "초월자", "지배자"];
const C_TREES = [
  { id: "fire", name: "화염", color: "#ff7a3a", n: {
    r: ["불씨의 각성", { fireDmg: 0.15, igniteChance: 0.10 }, 1], a1: ["연소", { dotDmg: 0.25 }, 1], a2: ["지옥불", { igniteMore: 1.30, fireDmg: 0.15 }, 2], b1: ["화염 확산", { aoeDmg: 0.20 }, 1], b2: ["태양의 심장", { magMore: 1.10, penElem: 0.12, fireDmg: 0.12 }, 2] } },
  { id: "cold", name: "냉기", color: "#6ad0ff", n: {
    r: ["얼어붙은 숨결", { coldDmg: 0.15, shredRes: 0.04 }, 1], a1: ["동결", { dotDur: 0.15, coldDmg: 0.10 }, 1], a2: ["영원한 겨울", { chillMore: 1.30, coldDmg: 0.15 }, 2], b1: ["서리 파편", { aoeDmg: 0.15, spellCrit: 0.04 }, 1], b2: ["절대영도", { magMore: 1.10, penElem: 0.12, coldDmg: 0.12 }, 2] } },
  { id: "light", name: "번개", color: "#ffe45a", n: {
    r: ["대전", { lightDmg: 0.15, shockChance: 0.10 }, 1], a1: ["연쇄", { chainJumps: 1, chainDmg: 0.20 }, 1], a2: ["폭풍의 눈", { shockMore: 1.30, lightDmg: 0.15 }, 2], b1: ["가속", { cdr: 0.05, spellCrit: 0.04 }, 1], b2: ["뇌제의 혈통", { magMore: 1.10, penElem: 0.12, lightDmg: 0.12 }, 2] } },
  { id: "void", name: "공허", color: "#c070ff", n: {
    r: ["공허의 속삭임", { voidDmg: 0.15, ignoreRes: 0.06 }, 1], a1: ["잠식", { poisonChance: 0.10, dotDmg: 0.20 }, 1], a2: ["심연의 손길", { poisonMore: 1.30, voidDmg: 0.15 }, 2], b1: ["저항 붕괴", { shredRes: 0.08, ignoreRes: 0.06 }, 1], b2: ["공허의 군주", { magMore: 1.10, penElem: 0.12, voidDmg: 0.12 }, 2] } },
  { id: "phys", name: "물리 · 독", color: "#ff6a8a", n: {
    r: ["날 선 본능", { atkPct: 0.12, ignoreDef: 0.06 }, 1], a1: ["맹독 도포", { poisonChance: 0.10, dotDmg: 0.25 }, 1], a2: ["치명 독", { poisonMore: 1.30, vsPoison: 0.20 }, 2], b1: ["철갑 파쇄", { shredDef: 0.08, ignoreDef: 0.06 }, 1], b2: ["학살자", { atkMore: 1.12, critDmg: 0.25, ignoreDef: 0.08 }, 2] } },
  { id: "def", name: "방어", color: "#6ab4ff", n: {
    r: ["단련", { hpPct: 0.12, defPct: 0.12 }, 1], a1: ["강철 의지", { dmgTaken: -0.06, regen: 0.002 }, 1], a2: ["불굴", { hpMore: 1.15, bossTaken: 0.10 }, 2], b1: ["회피 감각", { dodge: 0.04, dodgeCap: 0.6 }, 1], b2: ["유령", { dodge: 0.05, lifesteal: 0.01, regen: 0.003 }, 2] } },
  { id: "farm", name: "파밍", color: "#8dff9a", n: {
    r: ["탐색자", { mf: 0.15, goldFind: 0.20 }, 1], a1: ["수집가", { goldFind: 0.25 }, 1], a2: ["보물왕", { mf: 0.30, goldFind: 0.30 }, 2], b1: ["군집", { density: 1 }, 1], b2: ["사냥 효율", { aoeDmg: 0.20, cdr: 0.04, density: 1 }, 2] } },
];
const C_NODES = [], C_BY_ID = {};
for (const T of C_TREES) for (const k of ["r", "a1", "a2", "b1", "b2"]) { const d = T.n[k], id = `${T.id}_${k}`, from = k === "r" ? null : k === "a1" || k === "b1" ? `${T.id}_r` : `${T.id}_${k[0]}1`; const N = { id, tree: T.id, k, name: d[0], per: d[1], cost: d[2], from }; C_NODES.push(N); C_BY_ID[id] = N; }
const classPoints = (sv) => 2 * Math.max(0, Math.min(3, sv.cls | 0));
const classSpent = (sv) => { let n = 0; for (const id in (sv.cpass || {})) if (C_BY_ID[id]) n += C_BY_ID[id].cost; return n; };
const classHas = (sv, id) => !!(sv.cpass && sv.cpass[id] && C_BY_ID[id]);
const canTakeClass = (sv, id) => { const n = C_BY_ID[id]; return !!n && !classHas(sv, id) && classPoints(sv) - classSpent(sv) >= n.cost && (!n.from || classHas(sv, n.from)); };
function takeClass(sv, id) { if (!canTakeClass(sv, id)) return false; (sv.cpass = sv.cpass || {})[id] = 1; return true; }
function dropClass(sv, id) { if (!classHas(sv, id)) return false; if (C_NODES.some((n) => n.from === id && classHas(sv, n.id))) return false; delete sv.cpass[id]; return true; }
const resetClass = (sv) => { sv.cpass = {}; };
// 전직: 전직의 서(sv.cbook[n]) 1권을 써서 n차 전직. 이전 차수를 먼저 해야 한다
function advanceClass(sv) { const n = (sv.cls | 0) + 1; if (n > 3) return { ok: false, msg: "이미 최종 전직입니다" }; if (!sv.cbook || !(sv.cbook[n] > 0)) return { ok: false, msg: `${n}차 전직의 서가 없습니다` }; sv.cbook[n]--; sv.cls = n; return { ok: true, n, msg: `${n}차 전직 — ${C_CLASS_NAMES[n]}! 전직 포인트 2점을 얻었습니다` }; }
const craidOpen = (sv) => 1 + (sv.craid && sv.craid[1] ? 1 : 0) + (sv.craid && sv.craid[1] && sv.craid[2] ? 1 : 0) + (sv.craid && sv.craid[1] && sv.craid[2] && sv.craid[3] && (sv.cls | 0) >= 3 ? 2 : 0);   // 4 = 새 문지기 · 5 = 참 던전 (하드 클리어 + 3차 전직)   // 이지 → 노말 → 하드 순서로 열린다

// ---- 참 (v4.45): 3차 전직 후 장비칸 아래 4칸. 하드 난이도 참 던전에서 얻는다. 참 하나에 2줄 (수치는 0.85~1.15배로 굴린다) ----
// 줄 = [문구({v}에 첫 효과 수치), 효과[[스탯, 기본값]], 표시형식 p=% n=정수 f=고정(굴림 없음)]. 스탯 이름이 cm: 으로 시작하면 전투 · 드랍 코드가 읽는 값
const CHARMS = [
  { id: "blood", name: "피의 약속", color: "#ff6a6a", L: [["처치 시 체력 {v} 회복", [["killHeal", 0.015]], "p"], ["체력 50% 이하일 때 받는 피해 -{v}", [["cm:low50", 0.10]], "p"]] },
  { id: "mana", name: "마나의 샘", color: "#5ad0ff", L: [["처치 시 마나 {v} 회복", [["cm:mkill", 0.03]], "p"], ["마나 소모 -{v}", [["manaCostRed", 0.08]], "p"]] },
  { id: "gold", name: "탐욕의 동전", color: "#ffd24a", L: [["골드 획득 +{v}", [["goldFind", 0.25]], "p"], ["처치 시 {v} 확률로 골드 5배", [["cm:goldx", 0.05]], "p"]] },
  { id: "luck", name: "행운의 부적", color: "#8dff9a", L: [["매직 파운드 +{v}", [["mf", 0.15]], "p"], ["보스 열쇠 드랍 확률 +{v}", [["cm:keyFind", 0.30]], "p"]] },
  { id: "stone", name: "돌 수집가", color: "#c58bff", L: [["돌 드랍 확률 +{v}", [["cm:stoneFind", 0.20]], "p"], ["돌 보관 한도 +{v}", [["cm:stoneCap", 30]], "n"]] },
  { id: "phoenix", name: "불사조의 깃털", color: "#ffb060", L: [["전투당 1회 부활", [["revive", 1]], "f"], ["부활 직후 3초간 받는 피해 -{v}", [["cm:reviveShield", 0.50]], "p"]] },
  { id: "swift", name: "쾌속의 징표", color: "#6af0c0", L: [["쿨타임 감소 +{v}", [["cdr", 0.05]], "p"], ["스킬 지속시간 +{v}", [["skillDur", 0.10]], "p"]] },
  { id: "breaker", name: "파쇄자의 눈", color: "#ff4a8a", L: [["방어 무시 +{v}", [["ignoreDef", 0.08]], "p"], ["보스 추가 피해 +{v}", [["boss", 0.10]], "p"]] },
  { id: "focus", name: "집중의 부적", color: "#ffe45a", L: [["첫 번째 칸 스킬 피해 +{v}", [["cm:first", 0.20]], "p"], ["마나가 가득 찼을 때 피해 +{v}", [["cm:full", 0.10]], "p"]] },
  { id: "bulwark", name: "철벽의 부적", color: "#6ab4ff", L: [["방어력 +{v}", [["defPct", 0.15]], "p"], ["원거리 적에게 받는 피해 -{v}", [["rangedTaken", 0.10]], "p"]] },
  { id: "shadow", name: "그림자 장막", color: "#a0a0d0", L: [["회피 +{v}", [["dodge", 0.04]], "p"], ["회피 시 다음 스킬 피해 +{v}", [["cm:dodge", 0.15]], "p"]] },
  { id: "swarm", name: "군집의 인장", color: "#ff9a30", L: [["광역 피해 +{v}", [["aoeDmg", 0.12]], "p"], ["칸당 몹 수 +1", [["density", 1]], "f"]] },
  { id: "hunter", name: "사냥꾼의 직감", color: "#d8c8b0", L: [["정예 추가 피해 +{v}", [["elite", 0.15]], "p"], ["정예 · 보스 처치 시 5초간 주는 피해 +{v}", [["cm:elite", 0.10]], "p"]] },
  { id: "tidy", name: "정리의 인장", color: "#9ad8ff", L: [["가방 칸 +{v}", [["cm:bag", 25]], "n"], ["장비 분해 시 강화석 +{v}", [["cm:ore", 0.20]], "p"]] },
  { id: "horn", name: "개전의 나팔", color: "#ff7a3a", L: [["전투 시작 후 3초간 주는 피해 +{v}", [["cm:start", 0.25]], "p"], ["전투 시작 시 모든 스킬을 바로 쓸 수 있다", [["cm:cdStart", 1]], "f"]] },
  { id: "fang", name: "독니의 맹세", color: "#8aff6a", L: [["중독 확률 +{v}", [["poisonChance", 0.10]], "p"], ["중독된 적을 공격하면 피해의 {v}를 체력으로 회복", [["cm:leech", 0.03]], "p"]] },
];
const CHARM_BY_ID = {}; for (const c of CHARMS) CHARM_BY_ID[c.id] = c;
const charmUnlocked = (sv) => (sv.cls | 0) >= 3;
function genCharm(sv, id) { const c = id ? CHARM_BY_ID[id] : CHARMS[Math.floor(Math.random() * CHARMS.length)]; return { uid: sv.nextUid++, charm: c.id, rl: [0.85 + Math.random() * 0.30, 0.85 + Math.random() * 0.30] }; }
const charmLineVal = (it, li, ei) => { const L = CHARM_BY_ID[it.charm].L[li], base = L[1][ei][1]; if (L[2] === "f") return base; const v = base * (it.rl ? it.rl[li] : 1); return L[2] === "n" ? Math.round(v) : v; };
const charmFmt = (L, v) => (L[2] === "p" ? (v * 100).toFixed(v < 0.1 ? 1 : 0).replace(/\.0$/, "") + "%" : String(Math.round(v)));
function charmLines(it) { const C = CHARM_BY_ID[it.charm]; if (!C) return []; return C.L.map((L, li) => L[0].replace("{v}", charmFmt(L, charmLineVal(it, li, 0)))); }
function charmEffects(sv) { const out = []; if (!charmUnlocked(sv)) return out; for (const it of sv.charms || []) { if (!it || !CHARM_BY_ID[it.charm]) continue; CHARM_BY_ID[it.charm].L.forEach((L, li) => L[1].forEach((e, ei) => out.push([e[0], charmLineVal(it, li, ei)]))); } return out; }
const charmVal = (sv, key) => { let v = 0; for (const [k, x] of charmEffects(sv)) if (k === "cm:" + key) v += x; return v; };
const invMax = (sv) => CFG.INV_MAX + Math.round(charmVal(sv, "bag"));
const stoneCap = (sv) => 100 + Math.round(charmVal(sv, "stoneCap"));
function equipCharm(sv, it, slot) { if (!charmUnlocked(sv)) return { ok: false, msg: "3차 전직 후에 쓸 수 있습니다" }; sv.charms = sv.charms || [null, null, null, null]; const i = slot != null ? slot : sv.charms.findIndex((x) => !x); if (i < 0) return { ok: false, msg: "빈 참 칸이 없습니다" }; const old = sv.charms[i]; sv.charms[i] = it; sv.charmInv = (sv.charmInv || []).filter((x) => x !== it); if (old) sv.charmInv.push(old); return { ok: true }; }
function unequipCharm(sv, i) { const it = (sv.charms || [])[i]; if (!it) return false; sv.charms[i] = null; (sv.charmInv = sv.charmInv || []).push(it); return true; }
