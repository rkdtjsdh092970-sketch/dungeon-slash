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
const craidOpen = (sv) => 1 + (sv.craid && sv.craid[1] ? 1 : 0) + (sv.craid && sv.craid[1] && sv.craid[2] ? 1 : 0);   // 레이드 던전 이지 · 노말 · 하드
const wardenOpen = (sv) => !!(sv.spire && sv.spire.best >= 100);   // 새 문지기: 솟아난 탑 100층을 클리어한 뒤 (탑 밖 독립 노드)
const charmOpen = (sv) => !!(sv.craid && sv.craid[3] && (sv.cls | 0) >= 3);   // 참 던전: 하드 클리어 + 3차 전직 (독립 노드)
const tower2Open = (sv) => !!(sv.warden && sv.warden.best > 0 && (sv.cls | 0) >= 3);   // 새 탑: 문지기를 넘고 최종 전직을 마친 뒤

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
  { id: "fang", name: "독니의 맹세", color: "#8aff6a", L: [["중독 중인 적에게 주는 피해 +{v}", [["vsPoison", 0.15]], "p"], ["중독된 적을 공격하면 피해의 {v}를 체력으로 회복", [["cm:leech", 0.03]], "p"]] },
];
const CHARM_BY_ID = {}; for (const c of CHARMS) CHARM_BY_ID[c.id] = c;
const charmUnlocked = (sv) => (sv.cls | 0) >= 3;
// v4.47: 참 = 특수 옵션 1줄 + 기본 옵션 2줄 (이름 없음). 특수 줄은 위 16종 중 하나의 대표 효과, 기본 줄은 아래 풀에서 굴린다.
//   (이전 버전 참은 줄 2개짜리 그대로 동작한다: it.rl 이 있으면 옛 형식)
const CHARM_SP = { blood: 1, mana: 0, gold: 1, luck: 1, stone: 0, phoenix: 0, swift: 1, breaker: 1, focus: 0, bulwark: 1, shadow: 1, swarm: 1, hunter: 1, tidy: 0, horn: 1, fang: 1 };   // 특수 줄로 쓰는 L 번호
const CHARM_BASIC = [
  ["hpPct", "최대 체력 +{v}", 0.08], ["atkPct", "공격력 +{v}", 0.08], ["magPct", "마력 +{v}", 0.08], ["defPct", "방어력 +{v}", 0.10], ["critChance", "치명타 확률 +{v}", 0.03],
  ["critDmg", "치명타 피해 +{v}", 0.12], ["cdr", "쿨타임 감소 +{v}", 0.04], ["dodge", "회피 +{v}", 0.03], ["allDmg", "모든 피해 +{v}", 0.06], ["lifesteal", "생명력 흡수 +{v}", 0.01],
  ["manaPct", "최대 마나 +{v}", 0.08], ["goldFind", "골드 획득 +{v}", 0.12], ["mf", "매직 파운드 +{v}", 0.10], ["ignoreDef", "방어 무시 +{v}", 0.05], ["physDmg", "물리 피해 +{v}", 0.08], ["magDmg", "마법 피해 +{v}", 0.08],
];
const CHARM_BASIC_BY = {}; for (const b of CHARM_BASIC) CHARM_BASIC_BY[b[0]] = b;
function genCharm(sv, id) {
  const C = id ? CHARM_BY_ID[id] : CHARMS[Math.floor(Math.random() * CHARMS.length)], pool = CHARM_BASIC.slice(), b = [];
  for (let n = 0; n < 2; n++) { const k = pool.splice(Math.floor(Math.random() * pool.length), 1)[0]; b.push({ k: k[0], r: 0.8 + Math.random() * 0.4 }); }
  return { uid: sv.nextUid++, sp: C.id, r: 0.85 + Math.random() * 0.30, b };
}
// 줄 목록: [{ key(종류·검색용), txt(문구 {v}), eff([[스탯, 기본값]]), fmt, r(굴림), sp(특수 줄 여부) }]
function charmRows(it) {
  if (it.sp && CHARM_BY_ID[it.sp]) { const C = CHARM_BY_ID[it.sp], L = C.L[CHARM_SP[it.sp] | 0]; return [{ key: "sp:" + C.id, txt: L[0], eff: L[1], fmt: L[2], r: it.r, sp: 1 }].concat((it.b || []).map((x) => { const B = CHARM_BASIC_BY[x.k]; return B ? { key: B[0], txt: B[1], eff: [[B[0], B[2]]], fmt: "p", r: x.r, sp: 0 } : null; }).filter(Boolean)); }
  const C = CHARM_BY_ID[it.charm]; return C ? C.L.map((L, li) => ({ key: "sp:" + C.id + li, txt: L[0], eff: L[1], fmt: L[2], r: it.rl ? it.rl[li] : 1, sp: li === 0 ? 1 : 0 })) : [];
}
const charmKind = (it) => it.sp || it.charm;
const charmRowVal = (R, ei) => { const base = R.eff[ei][1]; if (R.fmt === "f") return base; const v = base * R.r; return R.fmt === "n" ? Math.round(v) : v; };
const charmFmt = (L, v) => ((L === "p" || (L && L[2] === "p")) ? (v * 100).toFixed(v < 0.1 ? 1 : 0).replace(/\.0$/, "") + "%" : String(Math.round(v)));
const charmLines = (it) => charmRows(it).map((R) => R.txt.replace("{v}", charmFmt(R.fmt, charmRowVal(R, 0))));
function charmEffects(sv) { const out = []; if (!charmUnlocked(sv)) return out; for (const it of sv.charms || []) { if (!it) continue; for (const R of charmRows(it)) R.eff.forEach((e, ei) => out.push([e[0], charmRowVal(R, ei)])); } return out; }
const charmVal = (sv, key) => { let v = 0; for (const [k, x] of charmEffects(sv)) if (k === "cm:" + key) v += x; return v; };
const invMax = (sv) => CFG.INV_MAX + Math.round(charmVal(sv, "bag"));
const stoneCap = (sv) => 100 + Math.round(charmVal(sv, "stoneCap"));
function equipCharm(sv, it, slot) { if (!charmUnlocked(sv)) return { ok: false, msg: "3차 전직 후에 쓸 수 있습니다" }; sv.charms = sv.charms || [null, null, null, null]; const i = slot != null ? slot : sv.charms.findIndex((x) => !x); if (i < 0) return { ok: false, msg: "빈 참 칸이 없습니다" }; const old = sv.charms[i]; sv.charms[i] = it; sv.charmInv = (sv.charmInv || []).filter((x) => x !== it); if (old) sv.charmInv.push(old); return { ok: true }; }
function unequipCharm(sv, i) { const it = (sv.charms || [])[i]; if (!it) return false; sv.charms[i] = null; (sv.charmInv = sv.charmInv || []).push(it); return true; }
