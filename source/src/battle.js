// =========================================================
// 전투 엔진 (DOM 비의존 — 시뮬레이션에서도 그대로 사용)
// =========================================================
const LAY = { x0: 196, cw: 124, cy: 292 };
const laneH = (b) => (b.lanes <= 3 ? 116 : 88);
const laneTop = (b) => LAY.cy - (laneH(b) * b.lanes) / 2;
function cellXY(b, lane, col, w, h) {  // 칸(또는 다칸 몸체) 중심 좌표
  w = w || 1; h = h || 1;
  if (b.raid) { if (w > 1 || h > 1) return { x: 480, y: 265 }; return { x: 480 + (lane - (b.lanes - 1) / 2) * 250, y: 372 - (col - 1) * 60 }; }   // 레이드: 보스는 화면 중앙, 결계석은 그 앞에 일렬
  return { x: LAY.x0 + (col - 1 + w / 2) * LAY.cw, y: laneTop(b) + (lane + h / 2) * laneH(b) };
}
const PLAYER_POS = { x: 104, y: LAY.cy + 44 };

const tierOf = (e) => e.tier;
const tagsOf = (e) => (e.def.ranged ? [e.tier, "ranged"] : [e.tier]);
function cellsOf(e) { const o = []; for (let l = e.lane; l < e.lane + e.h; l++) for (let c = e.col; c < e.col + e.w; c++) o.push([l, c]); return o; }
const occupants = (b, lane, col) => b.enemies.filter((e) => !e.dead && lane >= e.lane && lane < e.lane + e.h && col >= e.col && col < e.col + e.w);
const PUSH_MAX = { elite: 4, boss: 8 };
function canPlace(b, e, lane, col, push) {
  if (lane < 0 || lane + e.h > b.lanes || col < 1 || col + e.w - 1 > CFG.COLS) return false;
  let pushed = 0;
  for (let l = lane; l < lane + e.h; l++) for (let c = col; c < col + e.w; c++) {
    const occ = occupants(b, l, c).filter((o) => o !== e);
    if (!occ.length) continue;
    if (e.tier !== "normal") { if (!push || occ.some((o) => o.tier !== "normal")) return false; pushed += occ.length; continue; }
    if (occ.some((o) => o.tier !== "normal")) return false;
    if (occ.length >= b.cap) return false;
  }
  return pushed <= (PUSH_MAX[e.tier] || 0);
}
// 정예/보스가 자리를 차지하면 그 칸의 작은 몹을 뒤/옆으로 밀어낸다
function displace(b, e) {
  const fp = new Set(cellsOf(e).map(([l, c]) => l + "," + c));
  const victims = []; for (const [l, c] of cellsOf(e)) for (const o of occupants(b, l, c)) if (o !== e && o.tier === "normal" && !victims.includes(o)) victims.push(o);
  let n = 0;
  for (const o of victims) {
    const tryCell = (l, c, extra) => { if (l < 0 || l >= b.lanes || c < 1 || c > CFG.COLS || fp.has(l + "," + c)) return false; const oc = occupants(b, l, c); if (oc.some((x) => x.tier !== "normal")) return false; return oc.length < b.cap + extra; };
    let dest = null;
    for (const extra of [0, 1]) {
      for (let c = o.col + 1; c <= CFG.COLS && !dest; c++) for (const l of shuffle([o.lane, o.lane - 1, o.lane + 1])) if (tryCell(l, c, extra)) { dest = [l, c]; break; }
      if (dest) break;
      for (let c = o.col; c >= 1 && !dest; c--) for (const l of shuffle([o.lane - 1, o.lane + 1])) if (tryCell(l, c, extra)) { dest = [l, c]; break; }
      if (dest) break;
    }
    if (!dest) dest = [o.lane, Math.min(CFG.COLS, e.col + e.w)];
    o.lane = dest[0]; o.col = dest[1]; o.moveCd = CFG.MOVE_TIME * 1.5; o.hurtT = 0.25; n++;
  }
  if (n) { sfx(b, "thud"); b.shake = Math.max(b.shake, e.tier === "boss" ? 0.35 : 0.18); const P = cellXY(b, e.lane, e.col, e.w, e.h); fx(b, { kind: "ring", x: P.x, y: P.y, t: 0.3, life: 0.3, color: "#ffd9a0", r: 60 }); }
}
const fx = (b, o) => { if (!b.noFx) b.fx.push(o); };
const sfx = (b, n) => { if (!b.noFx) b.sfxq.push(n); };
const say = (b, text, cls) => { b.banner = { text, t: 3.0, cls: cls || "" }; sfx(b, "alert"); };
function pushText(b, x, y, text, color, big) { if (!b.noFx) b.texts.push({ x: x + rnd(-10, 10), y, text: String(text), color, big: !!big, t: 0.8, life: 0.8 }); }

// ---------------- 생성 ----------------
const RIFTLIKE = { rift: 1, hell: 1, endless: 1, void: 1, trial: 1, hive: 1, titan: 1, storm: 1, vault: 1, raid: 1 };
const specDef = (va) => Object.assign({ tier: "normal", ranged: ACT_SPECIAL[va].range >= 3, proj: va === 7 ? "orb" : null }, ACT_SPECIAL[va]);
function wavePool(act, stage, mods) {
  const w = actWeights(act); w.spec = SPEC_W(act, stage);
  if (mods && mods.some((m) => m.ranged)) { w.archer = (w.archer + 10) * 2; w.mage = (w.mage + 6) * 2.5; }
  return w;
}
// 가중치대로 정확히 같은 비율이 되도록 고르게 섞는다 (smooth weighted round-robin): 매번 같은 구성, 랜덤 편차 없음
function smoothSeq(w, n, st) {
  const keys = Object.keys(w).filter((k) => w[k] > 0), W = keys.reduce((a, k) => a + w[k], 0), out = []; st = st || {};
  for (let i = 0; i < n; i++) { let best = null; for (const k of keys) { st[k] = (st[k] || 0) + w[k] / W; if (best === null || st[k] > st[best]) best = k; } st[best] -= 1; out.push(best); }
  return out;
}
function extendPlan(b, n) {
  const w = wavePool(10, 5, b.mods); b.rr = b.rr || {};
  for (const t of smoothSeq(w, n, b.rr)) b.plan.push(t);
  for (let i = 0; i < Math.ceil(n / 12); i++) b.plan.splice(Math.floor(b.plan.length * (i + 0.5) / Math.ceil(n / 12)), 0, "brute");
}
function planFor(node) {
  if (node.kind === "tutorial") return TUTORIAL[node.step].plan.slice();
  const act = Math.min(10, node.act), stage = node.stage || 10, mods = node.mods || [];
  if (isEB(node.kind)) { const hw = wavePool(7, 5, mods), pl = smoothSeq(hw, 70); for (let i = 0; i < 5; i++) pl.splice(8 + i * 14, 0, "brute"); pl.splice(4, 0, "boss"); return pl; }   // 화염 정령왕: 왕 + 불꽃 정령 대군
  const w = wavePool(act, stage, mods), types = Object.keys(w);
  if (node.kind === "void") { const pl = smoothSeq(w, 5); pl.push("boss"); pl.push(...smoothSeq(w, 8)); return pl; }   // 공허의 군주: 군주는 한 마리, 체력이 4단계로 나뉜다 (잡몹은 계속 등장)
  let nNormal = CFG.WAVE_BASE + CFG.WAVE_STAGE * stage, elites = eliteCount(stage), boss = false;
  if (node.kind === "boss") { nNormal = Math.round(nNormal * 0.55); boss = true; }
  else if (node.kind === "elite") { nNormal = 45; elites = 10 + act; }
  else if (node.kind === "treasure") { nNormal = 95; elites = 0; }
  else if (node.kind === "vault") { nNormal = 110; elites = 0; }
  else if (node.kind === "rift" || node.kind === "hell" || node.kind === "trial") { const t = node.tier; nNormal = Math.min(110, Math.round(34 + 0.8 * t)); elites = 2 + Math.min(12, Math.floor(t / 7)); boss = (node.kind === "rift" || node.kind === "trial") && t % 5 === 0; if (mods.some((m) => m.elites)) elites *= 3; }
  else if (node.kind === "endless") { nNormal = 40; elites = 3; }
  else if (node.kind === "void") { nNormal = 22; elites = 3; boss = true; }
  const plan = smoothSeq(w, nNormal);   // 구성 비율 고정
  if ((node.kind === "rift" || node.kind === "trial") && node.tier >= 50) { const ns = Math.min(8, 2 + Math.floor((node.tier - 50) / 12)); for (let i = 0; i < ns; i++) plan.splice(Math.floor(plan.length * (0.1 + 0.85 * (i + 0.5) / ns)), 0, "sniper"); }   // 저격수: 50단계부터, 이후 12단계마다 +1 (최대 8)
  for (let i = 0; i < elites; i++) plan.splice(Math.floor(plan.length * (0.15 + 0.8 * (i + 0.5) / elites)), 0, "brute");   // 정예는 일정 간격
  if (RIFTLIKE[node.kind] && node.kind !== "void" && !isEB(node.kind) && node.kind !== "vault" && Math.random() < CFG.WARP_CHANCE) plan[Math.floor(plan.length * rnd(0.1, 0.9))] = "warp";   // 공허의 열쇠
  if ((node.kind === "rift" || node.kind === "hell") && Math.random() < CFG.WARP_CHANCE) plan[Math.floor(plan.length * rnd(0.1, 0.9))] = "hwarp";   // 정령의 불씨 (공허의 열쇠와 같은 확률)   // 열쇠: 단계와 무관하게 전투당 고정 확률
  if (node.kind === "rift" || node.kind === "hell") for (const wt of ["twarp", "swarp"]) if (Math.random() < CFG.WARP_CHANCE) plan[Math.floor(plan.length * rnd(0.1, 0.9))] = wt;   // 철갑의 징표 · 뇌전의 징표 (같은 확률)
  if (boss) plan.splice(Math.floor(plan.length * 0.65), 0, "boss");
  return plan;
}
// v4 균열 층 난이도: 한 구간(20층) 안에서는 완만하게 오르다가, 구간이 바뀌는 층(20 · 40 · 60 · 80 · 100)에서 계단식으로 점프한다.
// 각 구간의 끝(15~19층)에서 그 구간 장비를 제대로 파밍해야 다음 구간 첫 층(보스)을 넘길 수 있게 맞춘다.
const floorMult = (f) => {
  f = Math.max(1, f); const T = CFG.FLOOR_TAB;
  if (T && T.length) { if (f <= T.length) return T[f - 1]; return T[T.length - 1] * Math.pow(CFG.FLOOR_TAIL || 1.04, f - T.length); }   // 층별 난이도 표 (시뮬레이션으로 맞춘 값)
  return Math.pow(CFG.FLOOR_G, f - 1) * Math.pow(CFG.FLOOR_J, Math.floor(f / 20));
};
const riftMult = (base, tier) => floorMult(tier);   // 호환용
const bossRiftMult = (t) => floorMult(t) * CFG.BOSS_RIFT_K;
const riftAtkExtra = (node) => Math.pow(floorMult(node.tier || 1), CFG.FLOOR_ATKP - 1);   // 공격력은 체력보다 천천히 오른다
function createBattle(sv, node) {
  const st = computeStats(sv), mods = node.mods || [];
  const act = Math.max(1, Math.min(10, node.act)), stage = RIFTLIKE[node.kind] ? 4 : node.stage || CFG.STAGES;
  const floorKind = !!node.tier || RIFTLIKE[node.kind], scAct = floorKind ? 1 : act;   // 균열류는 몬스터 외형만 지역(act)을 따르고, 강도는 층 배율이 정한다
  if (node.kind === "raid") { PLAYER_POS.x = 480; PLAYER_POS.y = 478; } else { PLAYER_POS.x = 104; PLAYER_POS.y = LAY.cy + 44; }
  let riftMul = node.kind === "raid" ? floorMult(CFG.RIFT_END) : node.tier ? (node.kind === "void" || isEB(node.kind) ? bossRiftMult(node.tier) : floorMult(node.tier)) : floorKind ? floorMult(CFG.RIFT_END) : 1;
  if (node.kind === "rift" && node.tier % 5 === 0 && node.tier % 20 !== 0) riftMul *= CFG.BOSS_FLOOR_K;   // 5층마다 나오는 중간 보스 층은 몬스터 강도를 조금 낮춰 갑작스러운 벽이 되지 않게 한다 (20층 단위 보스는 그대로)
  const b = { node, act, stage, kind: node.kind, tier: node.tier || 0, mods, stats: st, time: 0, over: false, win: false, enemies: [], fx: [], texts: [], zones: [], persist: [], dmgBy: {}, events: [], corpses: [], sfxq: [], nextId: 1,
    hp: st.maxHp, maxHp: st.maxHp, mana: st.maxMana, maxMana: st.maxMana, lanes: st.lanes, cap: Math.min(CFG.STACK_MAX, st.stackCap + (mods.some((m) => m.cap) ? 1 : 0)), spawnCd: 0.3, kills: 0, eliteKills: 0, bossKills: 0, exp: 0, gold: 0,
    dodges: 0, taken: 0, dealt: 0, designated: null, debuffs: {}, buffs: {}, shake: 0, flash: 0, banner: null, bossRef: null, poisonCd: 8,
    hpM: CFG.H0 * Math.pow(CFG.HPX, scAct - 1) * actScale(scAct) * (1 + CFG.STAGE_HP * (stage - 1)) * riftMul * (mods.reduce((a, m) => a * (m.hp || 1), 1)),
    atkM: CFG.A0 * actScale(scAct) * (1 + CFG.STAGE_ATK * (stage - 1)) * (node.kind === "rift" || node.kind === "hell" || node.kind === "raid" ? riftMul * riftAtkExtra(node) : riftMul) * (mods.reduce((a, m) => a * (m.atk || 1), 1)),
    haste: mods.reduce((a, m) => a * (m.haste || 1), 1), noFx: false, endless: node.kind === "endless", revive: st.revive, inv: 0, keys: 0, keys2: 0, keys3: 0, keys4: 0 };
  b.lsRate = b.maxHp * Math.min(CFG.LS_MAX, CFG.LS_BASE + st.lifesteal * CFG.LS_PER); b.lsTok = b.lsRate * 2;   // 흡혈 회복 상한(초당)
  b.plan = node.kind === "dummy" || node.kind === "raid" ? [] : planFor(node);
  b.bossDef = node.kind === "dummy" ? BOSSES[0] : node.kind === "raid" ? RAID_BOSS : node.kind === "void" ? VOID_BOSS : isEB(node.kind) ? EB[node.kind].boss : node.kind === "boss" ? BOSSES[ACTS[act - 1].boss] : (node.kind === "rift" || node.kind === "trial") ? BOSSES[(node.tier / 5 - 1 + 10) % 10 | 0] : null;
  if (node.kind === "tutorial") { b.hpM *= 0.5; b.atkM *= 0.5; b.lanes = Math.max(2, b.lanes); }
  b.skills = sv.loadout.map((l, i) => {
    if (!l || i >= sv.slots) return null; const inst = sv.skills.find((x) => x.uid === l.uid); if (!inst) return null;
    const sk = skillOf(inst); if (sk.dur && st.skillDur) sk.dur *= 1 + st.skillDur; sk.rule = l.rule || "front"; sk.cdLeft = sk.cd * 0.4; sk.idx = i; return sk;
  });
  if (mods.some((m) => m.slow)) b.slowMod = 0.8;
  if (node.kind === "dummy") spawnDummies(b, node);
  if (node.kind === "raid") { b.hpM *= CFG.RAID.K; b.atkM *= CFG.RAID.ATK; spawnRaid(b); }
  b.maxReach = Math.max(0, ...b.skills.filter((k) => k && k.dtype !== "buff" && k.dtype !== "heal" && k.kind !== "buff" && k.kind !== "heal").map((k) => k.range || 0)); b.lastDealT = 0;
  return b;
}

// ---------------- 레이드: 심연의 문지기 ----------------
function spawnRaid(b) {
  b.raid = true; b.spawnCd = 1e9; const e = spawnAt(b, "boss", 0, 2); e.h = b.lanes; e.w = 3; e.range = 99; e.label = RAID_BOSS.name;
  e.raid = { limit: CFG.RAID.THR[0] * e.maxHp, idx: 0, sealed: false, t: 0, vuln: 0, blast: 0, cap: e.maxHp, prev: e.maxHp, fails: 0 };
  e.crystalHp = CFG.RAID.CRYSTAL * b.hpM * 1000;   // 결계석 총 체력(레인에 나눠 가진다)
}
function spawnCrystals(b, e) {
  const n = b.lanes, hp = e.crystalHp / n;
  for (let lane = 0; lane < n; lane++) {
    const c = makeEnemy(b, "imp", lane, 1); c.crystal = true; c.hp = c.maxHp = hp; c.atk = 0; c.atkCd = 1e9; c.range = 99; c.traits = []; c.eres = [0, 0, 0, 0]; c.label = "결계석"; c.def = Object.assign({}, c.def, { name: "결계석", exp: 0, gold: 0 }); b.enemies.push(c);
  }
}
function raidTick(b, e, dt) {
  const R = e.raid, K = CFG.RAID; if (!R) return; if (R.vuln > 0) R.vuln -= dt;
  if (!R.sealed) {
    if (R.limit > 0 && e.hp <= R.limit + 1) {
      R.sealed = true; R.t = 0; R.blast = K.BLAST; R.cap = R.prev; spawnCrystals(b, e); R.fails = 0;
      say(b, "문지기가 결계를 펼친다! 결계석을 부숴라 — 부수지 못하면 체력이 되살아난다!", "boss"); sfx(b, "roar"); b.shake = 0.7;
    }
    return;
  }
  R.t += dt;
  if (!b.enemies.some((x) => !x.dead && x.crystal)) {   // 결계 파괴: 다음 구간까지 피해를 줄 수 있다
    R.sealed = false; R.prev = R.limit; R.idx++; R.limit = K.THR[R.idx] != null ? K.THR[R.idx] * e.maxHp : 0; R.vuln = K.VULN; e.stun = Math.max(e.stun || 0, 2.2);
    say(b, "결계가 부서졌다! 문지기가 무방비 상태다!", "good"); sfx(b, "shatter"); b.shake = 0.9; return;
  }
  e.hp = Math.min(R.cap, e.hp + e.maxHp * K.REGEN * dt);   // 결계석이 살아 있는 동안 체력이 되살아난다
  R.blast -= dt; if (R.blast <= 0) { R.blast = K.BLAST; say(b, "결계 폭발!", "boss"); sfx(b, "boom"); damagePlayer(b, e.atk * K.BLASTM * (1 + R.t / 60), { shake: 0.4, boss: true }); }
}

// ---------------- 허수아비 (마을: 1분 DPS 측정) ----------------
const DUMMY_SEC = 60;
function spawnDummies(b, node) {
  b.dummy = node.sub === "normal" ? "normal" : "boss"; b.spawnCd = 1e9;
  const REF = (1 + CFG.DEF_ACT * 5) * (1 + CFG.DEF_TIER * 50);   // 표준 방어: 중반 지역 · 균열 50층 수준 (누구에게나 같은 조건)
  const inert = (e, label) => { e.dummy = true; e.hp = e.maxHp = 1e18; e.atk = 0; e.atkCd = 1e9; e.range = 99; e.abil = []; e.traits = []; e.dots = []; e.eres = [0, 0, 0, 0]; e.label = label; return e; };
  if (b.dummy === "boss") { const e = inert(spawnAt(b, "boss", 0, 4), "보스 허수아비"); e.dm = ENEMY_DEF.boss[0] * REF; e.rm = ENEMY_DEF.boss[1] * REF; }
  else for (let lane = 0; lane < b.lanes; lane++) for (const col of [3, 4, 5]) { const e = inert(spawnAt(b, "grunt", lane, col), "일반 허수아비"); e.dm = ENEMY_DEF.grunt[0] * REF; e.rm = ENEMY_DEF.grunt[1] * REF; }
}
function finishDummy(sv, b) {
  const total = b.dealt, dps = total / DUMMY_SEC, key = b.dummy, rec = (sv.dummy = sv.dummy || {}), old = rec[key] || { dps: 0 }, isBest = dps > old.dps;
  if (isBest) rec[key] = { dps, total, ts: Date.now() };
  return { win: true, dummy: { mode: key, total, dps, best: rec[key], isBest, prev: old.dps, by: Object.assign({}, b.dmgBy) } };
}

// ---------------- 출현 (빈자리 채우기) ----------------
function spawnCells(b, D, w, h) {
  const out = [];
  const isNormal = (D.tier || "boss") === "normal";
  for (let lane = 0; lane + h <= b.lanes; lane++) for (let col = 1; col + w - 1 <= CFG.COLS; col++) {
    if (isNormal) {
      const n = occupants(b, lane, col).length; if (!canPlace(b, { tier: "normal", w: 1, h: 1 }, lane, col)) continue;
      out.push({ lane, col, w: Math.pow(col, 1.5) * (1 + (b.cap - n) * 0.2) * (col === 1 ? 0.3 : 1) });
    } else {
      if (col < Math.max(D.range || 3, 2)) continue;
      if (!canPlace(b, { tier: D.tier || "boss", w, h }, lane, col, true)) continue;
      out.push({ lane, col, w: col * col });
    }
  }
  return out;
}
const VOID_TIER = [100, 112, 128, 150], VOID_HP = VOID_TIER.map((t) => bossRiftMult(t) / bossRiftMult(100)), VOID_ATK = VOID_HP;   // 단계별 난이도 = 균열 30/40/55/75단계 수준 (4단계는 막바지 세팅이 있어야 잡힘)
function makeEnemy(b, type, lane, col) {
  const isBoss = type === "boss", va = isEB(b.kind) ? 6 : RIFTLIKE[b.kind] && b.kind !== "hell" ? rint(6, 9) : Math.min(10, b.act) - 1;
  const D = isBoss ? b.bossDef : type === "spec" ? specDef(va) : WARPS[type] || ENEMIES[type];
  const dd = b.ddt || 0, gh = b.endless ? Math.pow(1.06, dd / 20) : 1, ga = b.endless ? Math.pow(1.045, dd / 20) : 1, bx = isBoss ? CFG.BOSSX : 1;
  const e = { id: b.nextId++, type, def: D, tier: isBoss ? "boss" : D.tier, w: isBoss ? D.w : 1, h: isBoss ? D.h : 1, lane, col, va, traits: D.traits || [],
    hp: D.hp * b.hpM * bx * gh, maxHp: D.hp * b.hpM * bx * gh, atk: D.atk * b.atkM * ga, range: D.range, interval: D.interval / b.haste, windup: D.windup,
    moveCd: CFG.MOVE_TIME, atkCd: null, winding: 0, flash: 0, hurtT: 0, chill: 0, shock: 0, vx: null, vy: null, age: 0, dead: false };
  e.moveT = CFG.MOVE_TIME * (e.traits.includes("fast") ? 0.55 : 1); e.moveCd = e.moveT;
  e.dots = []; e.dotMul = isBoss ? CFG.DOT_BOSS : e.tier === "elite" ? CFG.DOT_ELITE : 1;
  { const dd = (isBoss ? ENEMY_DEF.boss : ENEMY_DEF[type] || ENEMY_DEF.grunt).slice(); for (const t of e.traits) if (TRAIT_DEF[t]) { dd[0] += TRAIT_DEF[t][0]; dd[1] += TRAIT_DEF[t][1]; }
    const sc = (1 + CFG.DEF_ACT * (Math.min(10, b.act) - 1)) * (1 + CFG.DEF_TIER * (b.tier || 0)); e.dm = Math.max(0, dd[0] * sc); e.rm = Math.max(0, dd[1] * sc); e.shD = 0; e.shR = 0; e.eres = isEB(b.kind) ? [0, 0, 0, 0] : ACT_ELEM[Math.min(9, Math.max(0, va))]; }   // 화염 정령왕: 화염 저항 없음 (화염 빌드가 통한다)
  if (isBoss) {
    if (b.kind === "void") { e.vbaseHp = e.maxHp; e.vbaseAtk = e.atk; voidPhase(b, e, Math.max(1, Math.min(4, b.node.vsel || 1))); }   // 입장할 때 고른 단계의 군주 한 마리
    if (isEB(b.kind)) e.label = `${D.name} · ${b.node.vsel || 1}단계`;
    e.hp *= 1; e.abil = D.abilities.map((a) => ({ d: a, t: (a.every || 0) * rnd(0.55, 0.9), done: false })); e.dmgBase = e.atk;
    b.bossRef = e;
  }
  return e;
}
function spawnNear(b, type, lane, col) {
  for (const [dl, dc] of [[0, 0], [0, 1], [1, 0], [-1, 0], [0, -1], [1, 1], [-1, 1]]) { const l = lane + dl, c = col + dc; if (canPlace(b, { tier: "normal", w: 1, h: 1 }, l, c)) return spawnAt(b, type, l, c); }
  return null;
}
function spawnAt(b, type, lane, col) { const e = makeEnemy(b, type, lane, col); b.enemies.push(e); if (e.tier !== "normal") displace(b, e); return e; }
function trySpawn(b) {
  const type = b.plan[0], isBoss = type === "boss", D = isBoss ? b.bossDef : type === "spec" ? specDef(Math.min(10, b.act) - 1) : WARPS[type] || ENEMIES[type];
  const w = isBoss ? D.w : 1, h = isBoss ? Math.min(D.h, b.lanes) : 1;
  const cells = spawnCells(b, D, w, h);
  if (cells.length) {
    const c = wpick(cells, (x) => x.w); const e = spawnAt(b, type, c.lane, c.col); b.plan.shift();
    if (isBoss) { say(b, `${D.name} 출현!`, "boss"); sfx(b, "roar"); b.shake = 0.5; }
    b.spawnCd = CFG.SPAWN_INTERVAL * (e.tier === "normal" ? 1 : 3); return;
  }
  b.spawnCd = 0.15;
}
function summonAdds(b, type, count, owner) {
  const D = ENEMIES[type]; let n = 0;
  for (let i = 0; i < count; i++) {
    const cells = spawnCells(b, D, 1, 1); if (!cells.length) break;
    const c = wpick(cells, (x) => x.w); const e = spawnAt(b, type, c.lane, c.col); e.owner = owner ? owner.id : 0; e.summoned = true; n++;
    fx(b, { kind: "ring", x: cellXY(b, c.lane, c.col).x, y: cellXY(b, c.lane, c.col).y, t: 0.4, life: 0.4, color: "#c070ff", r: 40 });
  }
  return n;
}

// ---------------- 대상 선택 ----------------
function vsMult(sk, stats, e) {
  let sb = 0, gb = 0;
  for (const t of tagsOf(e)) { sb += sk.bonus[t] || 0; gb += stats.add[t] || 0; }
  return (1 + sb) * (1 + gb);
}
function statusMul(st, sk, e) {   // 출혈·중독·점화·둔화·감전 중인 적에게 주는 추가 피해 (곱연산 · 스킬 자체 보너스 + 장비 보너스)
  let m = 1; const has = (k) => e.dots.some((d) => d.k === k), v = sk.vs;
  if (has("bleed")) m *= (1 + st.vsBleed + (v && v.bleed || 0)) * st.bleedMore;
  if (has("poison")) m *= (1 + st.vsPoison + (v && v.poison || 0)) * st.poisonMore;
  if (has("ignite")) m *= (1 + st.vsIgnite + (v && v.ignite || 0)) * st.igniteMore;
  if (e.chill > 0) m *= (1 + st.vsChill + (v && v.chill || 0)) * st.chillMore;
  if (e.shock > 0) m *= (1 + st.vsShock + (v && v.shock || 0)) * st.shockMore;
  return m;
}
function pickPrimary(b, sk) {
  let cand = b.enemies.filter((e) => !e.dead && e.lane < b.lanes && e.col <= sk.range && e.hp > 0);
  if (!cand.length) return null;
  { const open = cand.filter((e) => !e.guard); if (open.length) cand = open; }   // 정령이 남아 있어 무적인 보스는 (다른 대상이 있으면) 겨냥하지 않는다: 우선순위 규칙 때문에 교착되는 것을 막는다
  if (b.designated && !b.designated.dead && cand.includes(b.designated)) return b.designated;
  const r = sk.rule;
  if (r === "auto") {
    const ms = cand.map((e) => vsMult(sk, b.stats, e)), best = Math.max(...ms), worst = Math.min(...ms);
    if (best - worst > 1e-9) cand = cand.filter((e, i) => ms[i] >= best - 1e-9);
  } else if (r !== "front") {
    const f = cand.filter((e) => (r === "boss" ? e.tier === "boss" : r === "elite" ? e.tier === "elite" : r === "normal" ? e.tier === "normal" : e.def.ranged));
    if (f.length) cand = f;
  }
  const front = Math.min(...cand.map((e) => e.col));
  const cells = [...new Set(cand.filter((e) => e.col === front).map((e) => e.lane))];
  const lane = pick(cells);
  return pick(cand.filter((e) => e.col === front && e.lane === lane));
}

// ---------------- 피해 ----------------
function damagePlayer(b, raw, opt) {
  opt = opt || {};
  if (b.inv > 0) return;
  if (!opt.undodgeable && Math.random() < b.stats.dodge) { b.dodges++; if (!b.noFx) b.texts.push({ x: PLAYER_POS.x, y: PLAYER_POS.y - 110, text: "MISS", color: "#8fd0ff", big: false, t: 0.8, life: 0.8, word: true }); sfx(b, "dodge"); return; }
  let d = raw * (1 - b.stats.def / (b.stats.def + 5 * raw));
  if (b.debuffs.curse) d *= 1 + b.debuffs.curse.mult;
  d *= Math.max(0.2, 1 + b.stats.dmgTaken); if (opt.boss) d *= 1 - b.stats.bossTaken; if (opt.ranged) d *= 1 - b.stats.rangedTaken;
  d = Math.max(1, d);
  if (b.stats.manaShield && b.mana > 0) { const keep = b.maxMana * CFG.MANA_SHIELD_KEEP, avail = Math.max(0, b.mana - keep), ab = Math.min(d * b.stats.manaShield, avail / CFG.MANA_SHIELD_COST); b.mana -= ab * CFG.MANA_SHIELD_COST; d -= ab; }   // 방벽은 마나가 일정 비율 이하면 멈춘다 (스킬을 쓸 마나를 남긴다)
  b.hp -= d; b.taken += d;
  pushText(b, PLAYER_POS.x, PLAYER_POS.y - 110, "-" + fmtN(d), "#ff8a8a", false);
  b.flash = 0.18; b.pHurt = 0.2; sfx(b, "hurt"); if (opt.shake) b.shake = Math.max(b.shake, opt.shake);
}
function voidPhase(b, e, si) {   // 공허의 군주 단계 설정: 단계마다 체력·공격력이 크게 오른다
  const hm = VOID_HP[si - 1], am = VOID_ATK[si - 1];
  e.vstage = si; e.maxHp = e.vbaseHp * hm; e.hp = e.maxHp; e.atk = e.vbaseAtk * am; e.dmgBase = e.atk; e.label = `${e.def.name} · ${si}단계`;
}
function applyDamage(b, e, dmg, o) {
  if (e.dead) return 0;
  o = o || {};
  if (e.shield) dmg *= 0.1;
  if (e.plate && !o.dot) { dmg *= 1 - e.plate.red; if (!b.noFx && (e.plateTxt || 0) < b.time) { e.plateTxt = b.time + 0.8; b.texts.push({ x: (e.vx != null ? e.vx : cellXY(b, e.lane, e.col, e.w, e.h).x), y: 120, text: "철갑!", color: "#c8d0d8", big: false, t: 0.9, life: 0.9 }); } }   // 철갑 태세: 직접 타격 대폭 감소 (지속 피해는 그대로)
  if (e.def && e.def.hive && (b.plan.length || b.enemies.some((x) => !x.dead && x !== e))) {   // 정령이 남아 있는 동안 왕은 피해를 받지 않는다
    if (!b.noFx && (e.guardTxt || 0) < b.time) { e.guardTxt = b.time + 0.7; b.texts.push({ x: (e.vx != null ? e.vx : cellXY(b, e.lane, e.col, e.w, e.h).x), y: 120, text: "정령을 먼저 처치!", color: "#ffb060", big: false, t: 0.9, life: 0.9 }); }
    return 0;
  }
  if (e.def && e.def.raid && e.raid) { const R = e.raid; if (R.sealed) dmg *= 0.03; else if (R.limit > 0) dmg = Math.min(dmg, Math.max(0, e.hp - R.limit)); if (R.vuln > 0) dmg *= CFG.RAID.VULNM; }   // 결계 중에는 거의 통하지 않고, 구간 끝에서는 더 깎이지 않는다
  e.hp -= dmg; e.flash = 0.1; e.hurtT = 0.22; b.dealt += dmg; b.lastDealT = b.time;
  const p = e.vx != null ? { x: e.vx, y: e.vy } : cellXY(b, e.lane, e.col, e.w, e.h);
  if (!b.noFx && !o.noText) b.texts.push({ x: p.x + rnd(-14, 14), y: p.y - (e.tier === "boss" ? 120 : 52) - rnd(0, 10), text: fmtN(dmg), color: o.crit ? "#ffe45a" : o.color || "#ffffff", big: !!o.crit, t: 0.8, life: 0.8 });
  if (e.charge) e.charge.dealt += dmg;
  if (e.reflect && o.src === "skill") damagePlayer(b, dmg * e.reflect.pct, { undodgeable: true });
  const ls = ((o.lifesteal || 0) + b.stats.lifesteal) * (b.debuffs.wound ? b.debuffs.wound.mult : 1);   // 작열의 낙인: 흡수 반감
  if (ls && o.src === "skill") {   // 흡수 회복은 초당 상한(토큰 버킷)을 넘지 못한다: 피해가 아무리 커져도 흡혈만으로 불사가 되지 않게
    const want = Math.min(dmg * ls, b.lsTok), h0 = b.hp; b.hp = Math.min(b.maxHp, b.hp + want); b.lsTok -= want; b.healLS = (b.healLS || 0) + (b.hp - h0);
  }
  if (e.hp <= 0) killEnemy(b, e);
  return dmg;
}
function hitEnemy(b, e, mult, sk, o) {
  o = o || {}; const st = b.stats, mag = sk.dtype === "mag";
  let inc = 1 + st.allDmg + (mag ? st.magDmg : st.physDmg); if (sk.elem) inc += st.elemDmg + st[sk.elem + "Dmg"];
  let dmg = (mag ? st.mag * CFG.MAG_BASE : st.atk * CFG.PHYS_BASE) * sk.mult * mult * inc * vsMult(sk, st, e) * statusMul(st, sk, e) * (b.buffs.cry ? 1 + b.buffs.cry.power : 1) * rnd(0.92, 1.08);
  if (o.chain) dmg *= 1 + st.chainDmg; if (o.aoe) dmg *= 1 + st.aoeDmg;
  { const kd = sk.kind; if (kd === "single") dmg *= 1 + st.singleDmg; if (PERSIST_KINDS.includes(kd)) dmg *= 1 + st.persistDmg; if (kd === "summon") dmg *= 1 + st.summonDmg; if (sk.bonus && sk.bonus.boss >= 0.8 && e.tier === "boss") dmg *= 1 + st.bossSkill; if (st.executeDmg && e.hp < e.maxHp * 0.3) dmg *= 1 + st.executeDmg; }   // 스킬 종류 패시브
  // 방어력(물리) / 마법저항(마법): 감소 후 무시 → 피해 감소율 = X / (X + C)
  const ig = Math.min(0.9, (mag ? st.ignoreRes : st.ignoreDef) + (sk.ignoreAdd || 0)), X = Math.max(0, (mag ? e.rm * (1 - e.shR) : e.dm * (1 - e.shD)) * (1 - ig));
  dmg *= 1 - Math.min(CFG.DEF_CAP, X / (X + CFG.DEF_C));
  if (sk.elem) dmg *= 1 - clamp(e.eres[ELEMS.indexOf(sk.elem)] - st.penElem, -0.5, CFG.RES_CAP);
  const cc = mag ? (st.magCrit ? st.critChance + st.spellCrit : st.spellCrit) : st.critChance;
  const crit = Math.random() < Math.min(0.9, cc + (sk.critAdd || 0)); if (crit) dmg *= 1 + st.critDmg;
  if (mag) { if (st.shredRes) e.shR = Math.min(st.shredRes, e.shR + st.shredRes * 0.34); } else if (st.shredDef) e.shD = Math.min(st.shredDef, e.shD + st.shredDef * 0.34);
  const dealt = applyDamage(b, e, dmg, { crit, src: "skill", lifesteal: sk.lifesteal, color: o.color || (sk.elem ? ELEM_COLOR[sk.elem] : null) });
  b.dmgBy[sk.id] = (b.dmgBy[sk.id] || 0) + dealt; applyStatus(b, e, sk, dealt);
  if (st.manaHit && b.time >= (b.leechT || 0)) { b.mana = Math.min(b.maxMana, b.mana + b.maxMana * st.manaHit); b.leechT = b.time + 0.1; }   // 마나 흡수: 적중 시 최대 마나의 일정 %를 회복 (초당 10회까지)
  return dealt;
}
function killEnemy(b, e) {
  if (e.dead) return; e.dead = true;
  const p = e.vx != null ? { x: e.vx, y: e.vy } : cellXY(b, e.lane, e.col, e.w, e.h);
  b.corpses.push({ x: p.x, y: p.y, def: e.def, type: e.type, tier: e.tier, t: 0, w: e.w, h: e.h, boss: e.tier === "boss", flip: true, va: e.va });
  if (e.traits && e.traits.includes("split") && !e.exploded) for (let i = 0; i < 2; i++) spawnNear(b, "imp", e.lane, e.col);
  if (e.type === "warp") { b.keys++; say(b, "공허의 열쇠를 얻었다!", "good"); sfx(b, "key"); }
  if (e.type === "hwarp") { b.keys2++; say(b, "정령의 불씨를 얻었다!", "good"); sfx(b, "key"); }
  if (e.type === "twarp") { b.keys3++; say(b, "철갑의 징표를 얻었다!", "good"); sfx(b, "key"); }
  if (e.type === "swarp") { b.keys4++; say(b, "뇌전의 징표를 얻었다!", "good"); sfx(b, "key"); }
  if (e.def && (e.def.titan || e.def.storm)) for (const x of b.enemies.slice()) if (x !== e && !x.dead && x.pylon) { x.hp = 0; killEnemy(b, x); }   // 보스가 쓰러지면 피뢰침도 사라진다
  if (e.def && e.def.raid) for (const x of b.enemies.slice()) if (x !== e && !x.dead && x.crystal) { x.hp = 0; killEnemy(b, x); }   // 문지기가 쓰러지면 결계석도 사라진다
  if (e.def && e.def.hive) { b.plan.length = 0; for (const x of b.enemies.slice()) if (x !== e && !x.dead) { x.hp = 0; killEnemy(b, x); } }   // 왕이 쓰러지면 정령들도 사라진다
  if (b.stats.manaKill) b.mana = Math.min(b.maxMana, b.mana + b.stats.manaKill);
  if (b.stats.killHeal && !b.over) b.hp = Math.min(b.maxHp, b.hp + b.maxHp * b.stats.killHeal * (b.debuffs.wound ? b.debuffs.wound.mult : 1));   // 처치 시 체력 회복
  if (b.endless) b.ddt = (b.ddt || 0) + 0.5;   // 빨리 잡을수록 위험도 시계가 빠르게 흐른다
  if (e.vstage) b.voidCleared = e.vstage;
  b.kills++; if (e.tier === "elite") b.eliteKills++; if (e.tier === "boss") { b.bossKills++; b.shake = 0.8; say(b, `${e.def.name} 처치!`, "boss"); }
  const ex = e.def.exp * Math.pow(1.5, b.act - 1) * (1 + 0.05 * (b.stage - 1)) * (b.kind === "rift" ? 1 + b.tier * 0.08 : 1);
  b.exp += ex; b.gold += e.def.gold * Math.pow(1.45, b.act - 1) * (b.kind === "treasure" ? 3 : b.kind === "vault" ? CFG.VAULT_GOLD : 1) * (1 + b.stats.goldFind) * rnd(0.8, 1.3);
  if (b.designated === e) b.designated = null;
  sfx(b, e.tier === "boss" ? "bossdie" : e.tier === "elite" ? "kill2" : "kill");
  if (e.summoned && e.owner) { const o = b.enemies.find((x) => x.id === e.owner); if (o && o.shield) { o.shield.need--; if (o.shield.need <= 0) { o.shield = null; say(b, "방어막이 깨졌다!"); sfx(b, "shatter"); } } }
  if (e.shield) e.shield = null;
}
function healPlayer(b, amt) { if (b.debuffs.wound) amt *= b.debuffs.wound.mult; b.hp = Math.min(b.maxHp, b.hp + amt); pushText(b, PLAYER_POS.x, PLAYER_POS.y - 110, "+" + fmtN(amt), "#8dff9a", false); }

// ---------------- 스킬 ----------------
function castSkill(b, sk) {
  const cost = (sk.mana || 0) * b.stats.manaCostMul; if (b.mana < cost) return false;
  const ok = castSkillRaw(b, sk); if (ok) { b.mana -= cost; if (sk.mythOnly && !b.noFx && !(typeof save !== "undefined" && save && save.opt && save.opt.grand === 0)) { b.grand = { name: sk.name, t: 1.5, life: 1.5, color: sk.color }; b.shake = Math.max(b.shake, 0.45); } } return ok;
}
function castSkillRaw(b, sk) {
  const K = sk.kind; if (SKILL_KINDS2[K]) return SKILL_KINDS2[K](b, sk);
  if (K === "buff") { if (!b.enemies.some((e) => !e.dead && e.col <= sk.range)) return false; b.buffs.cry = { t: sk.dur, power: sk.power }; fx(b, { kind: "aura", t: 0.7, life: 0.7, color: sk.color }); sfx(b, "buff"); return true; }
  if (K === "heal") { if (b.hp > b.maxHp * 0.7) return false; healPlayer(b, b.maxHp * sk.power); fx(b, { kind: "aura", t: 0.8, life: 0.8, color: sk.color }); sfx(b, "heal"); return true; }
  const p = pickPrimary(b, sk); if (!p) return false;
  b.pAtk = 0.42;
  const ctr = (e) => ({ lane: e.lane + (e.h > 1 ? rint(0, e.h - 1) : 0), col: e.col });
  const col = sk.color;
  if (K === "single") {
    hitEnemy(b, p, sk.hitMul || 1, sk); if (sk.chill) p.chill = Math.max(p.chill, sk.chill);
    for (let hi = 1; hi < (sk.hits || 1); hi++) b.events.push({ t: 0.11 * hi, fn: () => { if (!p.dead && p.hp > 0) { hitEnemy(b, p, sk.hitMul, sk); const P2 = cellXY(b, p.lane, p.col, p.w, p.h); fx(b, { kind: "slash", x: p.vx != null ? p.vx : P2.x, y: (p.vy != null ? p.vy : P2.y) - 30 + rnd(-8, 8), t: 0.16, life: 0.16, color: sk.color }); } } });
    const P = cellXY(b, p.lane, p.col, p.w, p.h);   // (위: 연타)
    fx(b, { kind: "slash", x: p.vx != null ? p.vx : P.x, y: (p.vy != null ? p.vy : P.y) - 30, t: 0.2, life: 0.2, color: col }); fx(b, { kind: "shot", t: 0.14, life: 0.14, e: p, color: col });
  } else if (K === "multi") {
    const c = ctr(p), cx = cellXY(b, c.lane, c.col); const box = [c.lane - 1, c.lane + 1, c.col - 1, c.col + 1];
    const hits = b.enemies.filter((e) => !e.dead && cellsOf(e).some(([l, cc]) => l >= box[0] && l <= box[1] && cc >= box[2] && cc <= box[3]));
    for (const e of hits) hitEnemy(b, e, cellsOf(e).some(([l, cc]) => l === c.lane && cc === c.col) ? 1 : sk.side, sk, { aoe: true });
    fx(b, { kind: "boom", x: cx.x, y: cx.y, t: 0.45, life: 0.45, color: col, r: 100 }); fx(b, { kind: "shot", t: 0.16, life: 0.16, e: p, color: col });
  } else if (K === "pierce") {
    const lane = ctr(p).lane; const hits = b.enemies.filter((e) => !e.dead && (sk.all ? e.lane < b.lanes : lane >= e.lane && lane < e.lane + e.h) && e.col <= sk.range);
    for (const e of hits) hitEnemy(b, e, 1, sk);
    if (sk.adj) for (const e of b.enemies.filter((e) => !e.dead && !hits.includes(e) && e.col <= sk.range && cellsOf(e).some(([l]) => Math.abs(l - lane) === 1))) hitEnemy(b, e, sk.adj, sk, { aoe: true });
    const far = Math.max(...hits.map((e) => e.col + e.w - 1)); fx(b, { kind: "beam", lane, col: far, t: 0.28, life: 0.28, color: col });
  } else if (K === "chain") {
    const jumps = sk.jumps + b.stats.chainJumps; const seen = new Set([p.id]);
    hitEnemy(b, p, 1, sk, { chain: true, color: "#bff0ff" });
    let cur = ctr(p), prev = { x: PLAYER_POS.x + 30, y: PLAYER_POS.y - 60 }; let pos = cellXY(b, cur.lane, cur.col); fx(b, { kind: "bolt", pts: [[prev.x, prev.y, pos.x, pos.y - 30]], t: 0.35, life: 0.35, color: col }); prev = { x: pos.x, y: pos.y - 30 };
    for (let j = 1; j <= jumps; j++) {
      const dirs = shuffle([[-1, 1], [1, 1], [0, 1]]); let tgt = null, cell = null;
      for (const d of dirs) {
        const l = cur.lane + d[0], c = cur.col + d[1]; if (l < 0 || l >= b.lanes || c > CFG.COLS) continue;
        const occ = occupants(b, l, c).filter((e) => !seen.has(e.id));
        if (occ.length) { tgt = pick(occ); cell = { lane: l, col: c }; break; }
      }
      if (!tgt) break;
      seen.add(tgt.id);
      const dmgMul = Math.pow(sk.decay, j); hitEnemy(b, tgt, dmgMul, sk, { chain: true, color: "#bff0ff" });
      const np = cellXY(b, cell.lane, cell.col); fx(b, { kind: "bolt", pts: [[prev.x, prev.y, np.x, np.y - 30]], t: 0.35, life: 0.35, color: col, delay: j * 0.05 }); prev = { x: np.x, y: np.y - 30 }; cur = cell;
    }
  } else if (K === "nova") {
    const hits = b.enemies.filter((e) => !e.dead && e.lane < b.lanes && e.col <= sk.range);
    for (const e of hits) { hitEnemy(b, e, 1, sk, { aoe: true }); e.chill = Math.max(e.chill, sk.chill || 0); }
    if (sk.healPct) healPlayer(b, b.maxHp * sk.healPct);
    fx(b, { kind: "nova", t: 0.6, life: 0.6, color: col });
  } else if (K === "zone") {
    const c = ctr(p);
    for (const dc of [-1, 0, 1]) { const cc = c.col + dc; if (cc >= 1 && cc <= CFG.COLS) b.zones.push({ lane: c.lane, col: cc, t: sk.dur, tick: 0.15, sk, mult: sk.mult }); }
  } else if (K === "boomer") {
    const lane = ctr(p).lane; const hits = b.enemies.filter((e) => !e.dead && lane >= e.lane && lane < e.lane + e.h && e.col <= sk.range);
    for (const e of hits) hitEnemy(b, e, 1, sk);
    const far = Math.max(...hits.map((e) => e.col + e.w - 1)); fx(b, { kind: "axe", lane, col: far, t: 0.8, life: 0.8, color: col });
    b.events.push({ t: 0.42, fn: () => { for (const e of b.enemies.filter((e) => !e.dead && lane >= e.lane && lane < e.lane + e.h && e.col <= sk.range)) hitEnemy(b, e, sk.back, sk); } });
  } else if (K === "meteor") {
    const pool = shuffle(b.enemies.filter((e) => !e.dead && e.col <= sk.range));
    for (let i = 0; i < Math.min(sk.count, pool.length); i++) {
      const tgt = pool[i];
      b.events.push({ t: 0.35 + i * 0.28, fn: () => {
        const c = ctr(tgt), cx = cellXY(b, c.lane, c.col); const box = [c.lane - 1, c.lane + 1, c.col - 1, c.col + 1];
        for (const e of b.enemies.filter((e) => !e.dead && cellsOf(e).some(([l, cc]) => l >= box[0] && l <= box[1] && cc >= box[2] && cc <= box[3]))) hitEnemy(b, e, cellsOf(e).some(([l, cc]) => l === c.lane && cc === c.col) ? 1 : sk.side, sk, { aoe: true });
        fx(b, { kind: "boom", x: cx.x, y: cx.y, t: 0.5, life: 0.5, color: col, r: 120 }); sfx(b, "boom"); b.shake = Math.max(b.shake, 0.25);
      } });
      const c0 = ctr(tgt), p0 = cellXY(b, c0.lane, c0.col); fx(b, { kind: "meteor", x: p0.x, y: p0.y, t: 0.35 + i * 0.28, life: 0.35 + i * 0.28, color: col });
    }
  }
  sfx(b, sk.sfx);
  return true;
}

// ---------------- 보스 기믹 ----------------
function bossAbility(b, e, a) {
  const d = a.d; if (d.text) say(b, d.text, "boss");
  switch (d.id) {
    case "summon": summonAdds(b, d.type, d.count, e); sfx(b, "summon"); break;
    case "heal": e.hp = Math.min(e.maxHp, e.hp + e.maxHp * d.pct); fx(b, { kind: "ring", x: e.vx || 600, y: (e.vy || 300) - 40, t: 0.7, life: 0.7, color: "#80ff90", r: 90 }); sfx(b, "heal"); break;
    case "root": b.debuffs.slow = { t: d.dur, mult: d.mult }; sfx(b, "debuff"); break;
    case "freeze": b.debuffs.freeze = { t: d.dur }; sfx(b, "frost"); break;
    case "curse": b.debuffs.curse = { t: d.dur, mult: d.mult }; sfx(b, "debuff"); break;
    case "poison": b.debuffs.poison = { t: d.dur, dps: d.dps }; sfx(b, "debuff"); break;
    case "wound": b.debuffs.wound = { t: d.dur, mult: d.mult }; sfx(b, "debuff"); break;
    case "reflect": e.reflect = { t: d.dur, pct: d.pct }; sfx(b, "buff"); break;
    case "shield": { e.shield = { t: d.dur, need: d.adds }; const n = summonAdds(b, "grunt", d.adds, e); e.shield.need = Math.max(1, n); sfx(b, "buff"); break; }
    case "plate": e.plate = { t: d.dur, red: d.red }; sfx(b, "buff"); fx(b, { kind: "ring", x: e.vx || 600, y: (e.vy || 300) - 40, t: 0.6, life: 0.6, color: "#c8d0d8", r: 100 }); break;
    case "pylon": { const before = new Set(b.enemies); summonAdds(b, "imp", d.count, e); for (const x of b.enemies) if (!before.has(x) && !x.dead) { x.pylon = true; x.hp = x.maxHp = x.maxHp * 14; } sfx(b, "summon"); break; }
    case "chainbolt": for (let i = 0; i < d.hits; i++) b.events.push({ t: 0.6 + i * 0.28, fn: () => { damagePlayer(b, e.atk * d.mult, { shake: 0.15, boss: true }); fx(b, { kind: "boom", x: PLAYER_POS.x + rnd(-24, 40), y: PLAYER_POS.y - 20, t: 0.3, life: 0.3, color: "#ffe45a", r: 56 }); sfx(b, "thunder"); } }); break;
    case "charge": e.charge = { t: d.windup, dealt: 0, mult: d.mult, interrupt: d.interrupt }; sfx(b, "charge"); break;
    case "rain": for (let i = 0; i < d.hits; i++) b.events.push({ t: 0.8 + i * 0.45, fn: () => { damagePlayer(b, e.atk * d.mult, { shake: 0.2, boss: true }); fx(b, { kind: "boom", x: PLAYER_POS.x + rnd(-30, 60), y: PLAYER_POS.y - 20, t: 0.4, life: 0.4, color: "#ff8030", r: 70 }); sfx(b, "boom"); } }); break;
  }
}
function bossTick(b, e, dt) {
  if (e.def.raid) raidTick(b, e, dt);
  if (e.plate) { e.plate.t -= dt; if (e.plate.t <= 0) { e.plate = null; say(b, "철갑이 풀렸다."); } }
  if (e.def.storm) { const np = b.enemies.filter((x) => x.pylon && !x.dead).length; if (np) { const m = 0.1 * np; b.debuffs.curse = { t: 1.0, mult: Math.max(m, b.debuffs.curse && b.debuffs.curse.t > 0.5 ? b.debuffs.curse.mult : 0) }; } }   // 피뢰침이 살아 있는 동안 감전: 받는 피해 +10%/개
  if (e.def.hive) e.guard = !!(b.plan.length || b.enemies.some((x) => !x.dead && x !== e));
  for (const a of e.abil) {
    if (a.d.id === "enrage") { if (!e.enraged && e.hp <= e.maxHp * a.d.at) { e.enraged = true; e.atk *= 1.4; e.interval *= 0.7; say(b, a.d.text, "boss"); sfx(b, "roar"); b.shake = 0.6; } continue; }
    a.t -= dt; if (a.t <= 0 && !e.charge && !e.stun) { bossAbility(b, e, a); a.t = a.d.every; }
  }
  if (e.shield) { e.shield.t -= dt; if (e.shield.t <= 0) { e.shield = null; say(b, "방어막이 사라졌다."); } }
  if (e.reflect) { e.reflect.t -= dt; if (e.reflect.t <= 0) e.reflect = null; }
  if (e.stun) { e.stun -= dt; if (e.stun <= 0) e.stun = 0; }
  if (e.charge) {
    e.charge.t -= dt;
    if (e.charge.dealt >= e.charge.interrupt * e.maxHp) { e.charge = null; e.stun = 2.5; say(b, "저지 성공!", "good"); sfx(b, "shatter"); }
    else if (e.charge.t <= 0) { damagePlayer(b, e.atk * e.charge.mult, { undodgeable: false, shake: 0.7, boss: true }); e.charge = null; sfx(b, "boom"); fx(b, { kind: "boom", x: PLAYER_POS.x + 10, y: PLAYER_POS.y - 30, t: 0.5, life: 0.5, color: "#ff5030", r: 120 }); }
  }
}

// ---------------- 한 프레임 진행 ----------------
function traitHit(b, e) {
  const T = e.traits;
  if (T.includes("poison") && (!b.debuffs.poison || b.debuffs.poison.t < 2)) b.debuffs.poison = { t: 4, dps: 0.009 };
  if (T.includes("chill") && (!b.debuffs.slow || b.debuffs.slow.t < 1.5)) b.debuffs.slow = { t: 3, mult: 0.7 };
  if (T.includes("curse") && (!b.debuffs.curse || b.debuffs.curse.t < 2)) b.debuffs.curse = { t: 4, mult: 0.2 };
}
function stepBattle(b, dt) {
  if (b.over) return;
  b.time += dt; if (b.endless) b.ddt = (b.ddt || 0) + dt;
  b.lsTok = Math.min(b.lsRate * 2, b.lsTok + b.lsRate * dt);
  { const h0 = b.hp; b.hp = Math.min(b.maxHp, b.hp + b.maxHp * (CFG.REGEN + b.stats.regen) * (b.debuffs.wound ? b.debuffs.wound.mult : 1) * dt); b.healRg = (b.healRg || 0) + (b.hp - h0); } if (b.inv > 0) b.inv -= dt;
  b.mana = Math.min(b.maxMana, b.mana + (b.maxMana * b.stats.manaRate + b.stats.manaFlatRegen) * dt);
  if (b.endless && b.plan.length < 10) extendPlan(b, 40);
  if (b.kind === "void" && b.bossRef && !b.bossRef.dead && b.plan.length < 2 && b.enemies.length < 5) extendPlan(b, 6);   // 군주가 살아 있는 동안 잡몹이 계속 나온다
  b.pAtk = Math.max(0, (b.pAtk || 0) - dt); b.pHurt = Math.max(0, (b.pHurt || 0) - dt);
  b.shake = Math.max(0, b.shake - dt); b.flash = Math.max(0, b.flash - dt);
  if (b.banner) { b.banner.t -= dt; if (b.banner.t <= 0) b.banner = null; }
  // 디버프
  for (const k of ["slow", "freeze", "curse", "poison", "wound"]) { const d = b.debuffs[k]; if (d) { d.t -= dt; if (d.t <= 0) delete b.debuffs[k]; } }
  if (b.buffs.cry) { b.buffs.cry.t -= dt; if (b.buffs.cry.t <= 0) delete b.buffs.cry; }
  if (b.debuffs.poison) { b.hp -= b.maxHp * b.debuffs.poison.dps * dt; b.taken += b.maxHp * b.debuffs.poison.dps * dt; }
  if (b.mods.some((m) => m.poison)) { b.poisonCd -= dt; if (b.poisonCd <= 0) { b.debuffs.poison = { t: 5, dps: 0.012 }; b.poisonCd = 14; } }
  // 지연 이벤트
  for (const ev of b.events) ev.t -= dt;
  const due = b.events.filter((e) => e.t <= 0); if (due.length) { b.events = b.events.filter((e) => e.t > 0); for (const ev of due) ev.fn(); }
  // 출현
  b.spawnCd -= dt; if (b.spawnCd <= 0 && b.plan.length) trySpawn(b);
  // 적 행동
  for (const e of b.enemies.slice()) {
    if (e.dead) continue;
    e.flash = Math.max(0, e.flash - dt); e.hurtT = Math.max(0, e.hurtT - dt); e.age += dt;
    const sp = (e.chill > 0 ? 0.5 : 1) * (e.shock > 0 ? 0.75 : 1); if (e.chill > 0) e.chill -= dt; if (e.shock > 0) e.shock -= dt; const d2 = dt * sp;
    if (e.tier === "boss") bossTick(b, e, dt);
    if (e.traits.length && e.traits.includes("regen")) e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.025 * dt);
    if (e.stun > 0) continue;
    const stalled = b.time - b.lastDealT > 8 && e.col > b.maxReach;   // 사거리 밖에 멈춘 적 때문에 전투가 끝나지 않는 경우: 8초간 피해가 없으면 앞으로 다가온다
    if (e.col > e.range || stalled || (e.tier === "normal" && e.col === 2 && e.range <= 2 && !occupants(b, e.lane, 1).length && !e.charge)) {   // 앞줄이 비면 근거리 유닛이 채운다
      e.moveCd -= d2;
      if (e.moveCd <= 0) {
        if (canPlace(b, e, e.lane, e.col - 1, true)) { e.col -= 1; e.moveCd = e.moveT; if (e.tier !== "normal") displace(b, e); }
        else if (e.h === 1) {
          let moved = false;
          for (const l of shuffle([e.lane - 1, e.lane + 1])) if (canPlace(b, e, l, e.col - 1, true)) { e.lane = l; e.col -= 1; if (e.tier !== "normal") displace(b, e); e.moveCd = e.moveT; moved = true; break; }
          if (!moved) e.moveCd = 0.1;
        } else e.moveCd = 0.1;
      }
      continue;
    }
    if (e.charge) continue;
    if (e.atkCd === null) e.atkCd = CFG.FIRST_ATTACK_DELAY * rnd(0.8, 1.2);
    if (e.winding > 0) {
      e.winding -= d2;
      if (e.winding <= 0) {
        let dmg = e.atk;
        if (e.tier === "normal") { const n = occupants(b, e.lane, e.col).filter((x) => x.tier === "normal").length; dmg *= Math.pow(Math.max(1, n), CFG.STACK_EXP - 1); }
        const P = cellXY(b, e.lane, e.col, e.w, e.h);
        if (e.def.sniper) { fx(b, { kind: "snipe", x0: e.vx != null ? e.vx : P.x, y0: (e.vy != null ? e.vy : P.y) - 40, x1: PLAYER_POS.x + 10, y1: PLAYER_POS.y - 52, t: 0.3, life: 0.3, color: "#ff7a4a" }); }
        fx(b, { kind: "proj", x0: e.vx != null ? e.vx : P.x, y0: (e.vy != null ? e.vy : P.y) - (e.tier === "boss" ? 70 : 30), x1: PLAYER_POS.x, y1: PLAYER_POS.y - 50, t: 0.25, life: 0.25, sprite: e.def.proj || (e.tier === "boss" ? "orb" : "hit"), color: e.def.color });
        if (e.traits.includes("explode")) { dmg *= 3; fx(b, { kind: "boom", x: PLAYER_POS.x + 20, y: PLAYER_POS.y - 30, t: 0.4, life: 0.4, color: "#ff8a40", r: 70 }); e.exploded = true; }
        damagePlayer(b, dmg, { shake: e.tier === "boss" || e.exploded ? 0.25 : 0, boss: e.tier === "boss", ranged: !!e.def.ranged }); sfx(b, e.def.ranged ? "arrow" : "ehit");
        if (e.traits.length) traitHit(b, e);
        if (e.exploded) { killEnemy(b, e); continue; }
        e.atkCd = e.interval * rnd(1 - CFG.JITTER, 1 + CFG.JITTER);
      }
    } else { e.atkCd -= d2; if (e.atkCd <= 0) e.winding = e.windup; }
  }
  if (b.enemies.some((e) => e.dead)) b.enemies = b.enemies.filter((e) => !e.dead);
  // 장판
  for (const z of b.zones) {
    z.t -= dt; z.tick -= dt;
    if (z.tick <= 0) { z.tick = z.every || 0.5; for (const e of occupants(b, z.lane, z.col)) { hitEnemy(b, e, z.m || 0.45, z.sk, { aoe: true, color: z.fxk ? z.sk.color : "#ffb060" }); if (z.chill) e.chill = Math.max(e.chill, z.chill); } }
  }
  tickExtra(b, dt);
  b.zones = b.zones.filter((z) => z.t > 0);
  // 스킬 (자동 발동)
  if (!b.debuffs.freeze) {
    const rate = (b.debuffs.slow ? b.debuffs.slow.mult : 1) * (b.slowMod || 1);
    for (const sk of b.skills) {
      if (!sk) continue;
      sk.cdLeft = Math.max(0, sk.cdLeft - dt * rate);
      if (sk.cdLeft <= 0 && castSkill(b, sk)) sk.cdLeft = sk.cd * (1 - b.stats.cdr);
    }
  }
  if (b.enemies.some((e) => e.dead)) b.enemies = b.enemies.filter((e) => !e.dead);
  // 이펙트
  if (!b.noFx) {
    for (const f of b.fx) f.t -= dt; b.fx = b.fx.filter((f) => f.t > -(f.delay || 0));
    for (const t of b.texts) { t.t -= dt; t.y -= 26 * dt; } b.texts = b.texts.filter((t) => t.t > 0);
    for (const c of b.corpses) c.t += dt; b.corpses = b.corpses.filter((c) => c.t < 1.6);
  } else b.corpses.length = 0;
  if (b.hp <= 0 && b.revive > 0) { b.revive--; b.hp = b.maxHp * 0.5; b.inv = 1.5; b.flash = 0.4; b.shake = 0.5; say(b, "부활!", "good"); sfx(b, "revive"); fx(b, { kind: "aura", t: 1, life: 1, color: "#ffe9a0" }); }
  if (b.dummy) { if (b.time >= DUMMY_SEC) { b.over = true; b.win = true; } }
  else if (b.hp <= 0) { b.hp = 0; b.over = true; b.win = false; }
  else if (!b.plan.length && !b.enemies.length && !b.events.length) { b.over = true; b.win = true; }
  else if (b.endless ? b.time > 1200 : b.time > (b.kind === "void" ? 1800 : b.kind === "raid" ? CFG.RAID.LIMIT : 900)) { b.over = true; b.win = !!b.endless; }
}

// ---------------- 종료 처리 ----------------
function finishBattle(sv, b) {
  const node = b.node, endless = node.kind === "endless", win = b.win || endless, waves = endless ? Math.floor((b.ddt || 0) / 30) : 0;
  const B = dropBonus(sv);
  const res = { win, exp: 0, gold: Math.round(b.gold * B.gold), kills: b.kills, levelUps: 0, items: [], skills: [], ore: 0, shards: 0, orbC: 0, orbD: 0, dice: 0, keys: 0, uniques: 0, notes: [], time: b.time, endgameStart: false, quests: [], tutorialStep: -1, waves, buffs: B.buffs };
  if (!win) { res.gold = Math.round(res.gold * 0.5); }
  // v4: 경험치는 없다. 균열 층을 처음 클리어할 때마다 레벨이 1 오른다 (100층 = 100레벨)
  sv.gold += res.gold; sv.stats.kills += b.kills; dailyAdd(sv, "kills", b.kills); if (b.time > 12 && node.kind !== "tutorial" && win) { const k = Math.min(1, 0.3 * 1); sv.rate.gold = sv.rate.gold ? sv.rate.gold * 0.7 + (res.gold / (b.time / 60)) * 0.3 : res.gold / (b.time / 60); sv.rate.exp = 0; }
  const kf = b.keys * B.key; res.keys = Math.floor(kf) + (Math.random() < kf - Math.floor(kf) ? 1 : 0); sv.keys += res.keys; { const k2 = b.keys2 * B.key; res.keys2 = Math.floor(k2) + (Math.random() < k2 - Math.floor(k2) ? 1 : 0); sv.keys2 = (sv.keys2 || 0) + res.keys2; }
  for (const [f, bf] of [["keys3", b.keys3], ["keys4", b.keys4]]) { const kk = (bf || 0) * B.key; res[f] = Math.floor(kk) + (Math.random() < kk - Math.floor(kk) ? 1 : 0); sv[f] = (sv[f] || 0) + res[f]; }
  const qd = [];
  if (b.kills) qd.push(...questEvent(sv, { type: "kill", act: node.act, n: b.kills, tier: "normal" }));
  if (b.eliteKills) qd.push(...questEvent(sv, { type: "kill", act: node.act, n: b.eliteKills, tier: "elite" }));
  for (let i = 0; i < b.bossKills; i++) { qd.push(...questEvent(sv, { type: "boss", act: node.act })); }
  if (win) {
    sv.stats.clears++; dailyAdd(sv, "clears", 1); if (b.bossKills) dailyAdd(sv, "bosses", b.bossKills); if (node.kind === "rift") dailyAdd(sv, "rifts", 1); qd.push(...questEvent(sv, { type: "clear" }));
    if (node.kind === "tutorial") {
      res.tutorialStep = node.step;
      if (node.step === TUTORIAL.length - 1) {
        sv.tut.done = true; sv.slots = 2;
        const sm = genSkill(sv, "smash", 0); sv.skills.push(sm); sv.loadout[1] = { uid: sm.uid, rule: "front" };
        res.notes.push("튜토리얼 완료! 2번 스킬 칸이 열렸습니다. (강타 지급)");
      }
    } else {
      const d = rollDrops(sv, Object.assign({}, node, { waves, voidCleared: b.voidCleared || 0, firstClear: node.kind === "boss" && sv.cleared[node.act - 1] < node.stage }), b.bossKills > 0 || node.kind === "boss", B);
      res.hone = d.hone; res.runes = d.runes; res.items = d.items; res.skills = d.skills; res.stones = d.stones || 0; res.ore = d.ore; res.shards = d.shards; res.orbC = d.orbC; res.orbD = d.orbD; res.uniques = d.uniques;
      sv.inv.push(...d.items); sv.skills.push(...d.skills); sv.hone += d.hone; for (const r of d.runes) sv.runes.push({ uid: sv.nextUid++, id: r }); sv.ore += d.ore; sv.shards += d.shards; sv.orbC += d.orbC; sv.orbD += d.orbD; sv.dice = (sv.dice || 0) + (d.dice || 0); res.dice = d.dice || 0;
      if ((node.kind === "stage" || node.kind === "boss") && sv.cleared[node.act - 1] < node.stage) {
        sv.cleared[node.act - 1] = node.stage;
        if (node.stage >= 3 && sv.slots < 3) { sv.slots = 3; res.notes.push("3번 스킬 칸이 열렸습니다!"); }
        if (node.kind === "boss") {
          if (sv.slots < 4) { sv.slots = 4; res.notes.push("4번 스킬 칸이 열렸습니다!"); }
          if (node.act === CFG.ACTS && !sv.endgame) { sv.endgame = true; sv.lanesBase = CFG.ENDGAME_LANES; res.endgameStart = true; res.notes.push("스테이지 클리어! 영구 3레인이 열리고 '심연의 균열'이 개방됩니다. 균열을 한 층 깰 때마다 레벨이 1 오릅니다 — 100층이 목표입니다."); }
        }
      }
      if (node.kind === "raid") { const R = (sv.raid = sv.raid || { cleared: 0, best: 0 }); const first = !R.cleared; R.cleared++; if (!R.best || b.time < R.best) R.best = Math.round(b.time); if (first) res.notes.push("🏆 심연의 문지기를 처음으로 쓰러뜨렸습니다!"); res.raid = { first, time: b.time, best: R.best }; }
      if (node.kind === "rift") { if (node.tier > sv.rift.best) { const gain = Math.max(0, Math.min(CFG.LEVEL_CAP, 1 + node.tier) - sv.level); sv.rift.best = node.tier; if (gain > 0) { sv.level += gain; res.levelUps = gain; } if (sv.rift.best >= CFG.RIFT_END && !sv.graduated) { sv.graduated = 1; res.notes.push("🎓 균열 100층 졸업! 공허의 군주와 속성 보스에서 높은 등급의 스킬을 얻을 수 있습니다."); } } qd.push(...questEvent(sv, { type: "rift" })); }
      if (endless) { const E = sv.endless; if (b.time > E.best) E.best = Math.round(b.time); if (b.kills > E.bestKills) E.bestKills = b.kills; res.notes.push(`무한 균열: ${Math.round(b.time)}초 생존, ${b.kills}마리 처치 (${waves}웨이브)`); }
    }
    while (sv.inv.length > CFG.INV_MAX) { let wi = 0, ws = 1e9; sv.inv.forEach((it, i) => { const sc = protectedItem(sv, it) ? 1e12 : it.rarity * 1000 + it.ilvl * 10 + (it.enh || 0) + i * 0.001; if (sc < ws) { ws = sc; wi = i; } }); sv.inv.splice(wi, 1); }
  }
  purgeClearedQuests(sv);   // 방금 액트를 클리어했다면 그 액트의 남은 퀘스트를 정리
  res.voidCleared = b.voidCleared || 0;
  res.quests = qd;
  return res;
}
