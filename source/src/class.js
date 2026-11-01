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
const craidOpen = (sv) => 1 + (sv.craid && sv.craid[1] ? 1 : 0) + (sv.craid && sv.craid[1] && sv.craid[2] ? 1 : 0);   // 이지 → 노말 → 하드 순서로 열린다
