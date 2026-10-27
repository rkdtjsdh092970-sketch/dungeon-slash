// =========================================================
// 상태이상(출혈·중독·점화) + 확장 스킬 엔진 (지속형/난사/설치/소환/부채꼴)
// =========================================================
function applyStatus(b, e, sk, dealt) {
  if (e.dead || !(dealt > 0)) return; const st = b.stats, qual = { bleed: sk.dtype === "phys", poison: sk.dtype === "phys" || sk.elem === "void", ignite: sk.elem === "fire" };
  for (const k of ["bleed", "poison", "ignite"]) {
    const chance = (sk[k] || 0) + (qual[k] ? st[k + "Chance"] : 0); if (chance <= 0 || Math.random() >= chance) continue;
    const C = CFG[k.toUpperCase()], dur = C.dur * (1 + st.dotDur), dps = (dealt * C.coef * (1 + st.dotDmg) * e.dotMul) / dur;
    const list = e.dots.filter((d) => d.k === k);
    if (list.length >= C.cap) { const w = list.reduce((a, d) => (d.dps < a.dps ? d : a)); if (w.dps >= dps) { w.t = Math.max(w.t, dur); continue; } e.dots.splice(e.dots.indexOf(w), 1); }
    e.dots.push({ k, dps, t: dur });
  }
}
function tickDots(b, e, dt) {
  let sum = 0; const col = {};
  for (const d of e.dots) { sum += d.dps; d.t -= dt; col[d.k] = 1; }
  if (e.dots.some((d) => d.t <= 0)) e.dots = e.dots.filter((d) => d.t > 0);
  if (sum > 0) { e.dotAcc = (e.dotAcc || 0) + sum * dt; e.dotT = (e.dotT || 0) + dt; applyDamage(b, e, sum * dt, { dot: true, noText: true }); b.dmgBy.dot = (b.dmgBy.dot || 0) + sum * dt;
    if (e.dotT >= 0.7 && !b.noFx) { b.texts.push({ x: (e.vx != null ? e.vx : 600) + rnd(-10, 10), y: (e.vy != null ? e.vy : 300) - 50, text: fmtN(e.dotAcc), color: col.ignite ? "#ffa050" : col.poison ? "#8aff6a" : "#ff6a7a", big: false, t: 0.7, life: 0.7 }); e.dotAcc = 0; e.dotT = 0; } }
}
const aliveIn = (b, range) => b.enemies.filter((e) => !e.dead && e.lane < b.lanes && e.col <= range);
const centerLane = (e) => e.lane + (e.h > 1 ? rint(0, e.h - 1) : 0);
const boxHits = (b, lane, col, r) => b.enemies.filter((e) => !e.dead && cellsOf(e).some(([l, c]) => Math.abs(l - lane) <= r && Math.abs(c - col) <= r));
const pushFx = (b, o) => fx(b, o);

const SKILL_KINDS2 = {
  cone(b, sk) {
    const p = pickPrimary(b, sk); if (!p) return false; b.pAtk = 0.42; const lane = centerLane(p);
    const hits = b.enemies.filter((e) => !e.dead && e.col >= p.col && e.col <= p.col + 1 && cellsOf(e).some(([l]) => Math.abs(l - lane) <= 1));
    for (const e of hits) hitEnemy(b, e, e === p ? 1 : sk.sideM, sk, { aoe: true });
    const P = cellXY(b, lane, p.col); pushFx(b, { kind: "claw", x: P.x, y: P.y - 20, t: 0.35, life: 0.35, color: sk.color }); sfx(b, sk.sfx); return true;
  },
  spray(b, sk) {
    const first = aliveIn(b, sk.range); if (!first.length) return false; b.pAtk = 0.6;
    for (let i = 0; i < sk.count; i++) b.events.push({ t: 0.05 + i * 0.07, fn: () => {
      const c = aliveIn(b, sk.range); if (!c.length) return; const e = pick(c), x1 = e.vx != null ? e.vx : cellXY(b, e.lane, e.col).x, y1 = (e.vy != null ? e.vy : cellXY(b, e.lane, e.col).y) - 30;
      pushFx(b, { kind: "proj2", x0: PLAYER_POS.x + 40, y0: PLAYER_POS.y - 70 + rnd(-8, 8), x1, y1, t: 0.2, life: 0.2, sprite: sk.proj, color: sk.color, fan: (i - (sk.count - 1) / 2) * 6 });
      hitEnemy(b, e, 1, sk); if (sk.chill) e.chill = Math.max(e.chill, sk.chill); if (i % 3 === 0) sfx(b, sk.sfx); } });
    return true;
  },
  orbit(b, sk) { if (!aliveIn(b, 3).length) return false; b.pAtk = 0.42; b.persist.push({ kind: "orbs", t: sk.dur, tick: 0.1, every: sk.every, sk, rot: 0 }); sfx(b, sk.sfx); pushFx(b, { kind: "aura", t: 0.6, life: 0.6, color: sk.color }); return true; },
  aura(b, sk) { if (!aliveIn(b, sk.range + 1).length) return false; b.pAtk = 0.42; b.persist.push({ kind: "blades", t: sk.dur, tick: 0.1, every: sk.every, sk, rot: 0 }); sfx(b, sk.sfx); return true; },
  trap(b, sk) {
    const cand = aliveIn(b, sk.range).filter((e) => e.col >= 2); if (!cand.length) return false; b.pAtk = 0.42;
    let best = null, bn = -1; for (const e of cand) { const n = boxHits(b, e.lane, e.col, 1).length; if (n > bn) { bn = n; best = e; } }
    b.persist.push({ kind: "mine", lane: best.lane, col: best.col, arm: sk.arm, t: sk.life, tick: 0.1, every: 0.1, sk }); sfx(b, sk.sfx); return true;
  },
  zone2(b, sk) {
    const p = pickPrimary(b, sk); if (!p) return false; b.pAtk = 0.42; const c = { lane: centerLane(p), col: p.col };
    const cells = []; if (sk.shape === "wide") { for (let l = 0; l < b.lanes; l++) for (let cc = 3; cc <= CFG.COLS; cc++) cells.push([l, cc]); } else for (let dl = -1; dl <= 1; dl++) for (let dc = -1; dc <= 1; dc++) { const l = c.lane + dl, cc = c.col + dc; if (l >= 0 && l < b.lanes && cc >= 1 && cc <= CFG.COLS) cells.push([l, cc]); }
    for (const [l, cc] of cells) b.zones.push({ lane: l, col: cc, t: sk.dur, tick: 0.05 + Math.random() * 0.1, every: sk.every, sk, m: sk.mult, chill: sk.chill || 0, fxk: sk.zk, life: sk.dur });
    sfx(b, sk.sfx); const P = cellXY(b, c.lane, c.col); pushFx(b, { kind: "ring", x: P.x, y: P.y, t: 0.4, life: 0.4, color: sk.color, r: 90 }); return true;
  },
  rain(b, sk) {
    if (!aliveIn(b, sk.range).length) return false; b.pAtk = 0.42; b.persist.push({ kind: "rain", t: sk.over + 0.5, tick: 0.2, every: sk.over / sk.count, left: sk.count, sk }); sfx(b, sk.sfx); return true;
  },
  summon(b, sk) { if (!aliveIn(b, sk.range).length) return false; b.pAtk = 0.42; b.persist = b.persist.filter((p) => p.kind !== "spirit"); b.persist.push({ kind: "spirit", t: sk.dur, tick: 0.3, every: sk.every, sk, bob: 0 }); sfx(b, sk.sfx); pushFx(b, { kind: "ring", x: PLAYER_POS.x + 90, y: PLAYER_POS.y - 20, t: 0.5, life: 0.5, color: sk.color, r: 60 }); return true; },
  hole(b, sk) { const p = pickPrimary(b, sk); if (!p) return false; b.pAtk = 0.42; b.persist.push({ kind: "hole", lane: centerLane(p), col: Math.max(2, p.col), t: sk.dur, tick: 0.1, every: sk.every, sk }); sfx(b, sk.sfx); return true; },
};
function runPersist(b, p) {
  const sk = p.sk;
  if (p.kind === "blades") { for (const e of b.enemies.filter((e) => !e.dead && e.lane < b.lanes && e.col <= sk.range)) hitEnemy(b, e, sk.mult, sk, { aoe: true }); }
  else if (p.kind === "orbs") { const c = aliveIn(b, 3); if (c.length) { const e = pick(c), P = e.vx != null ? { x: e.vx, y: e.vy - 30 } : { x: 400, y: 300 }; hitEnemy(b, e, sk.mult, sk); pushFx(b, { kind: "boom", x: P.x, y: P.y + 30, t: 0.25, life: 0.25, color: sk.color, r: 40 }); } }
  else if (p.kind === "rain") { if (p.left <= 0) return; const c = aliveIn(b, sk.range); if (!c.length) return; p.left--; const e = pick(c), P = e.vx != null ? { x: e.vx, y: e.vy } : cellXY(b, e.lane, e.col); pushFx(b, { kind: "skybolt", x: P.x, y: P.y, t: 0.3, life: 0.3, color: sk.color }); for (const o of boxHits(b, e.lane, e.col, 1)) hitEnemy(b, o, o === e ? 1 : 0.4, sk, { aoe: true }); sfx(b, "zap"); }
  else if (p.kind === "spirit") { const t = pickPrimary(b, Object.assign({}, sk, { rule: "front" })); if (t) { hitEnemy(b, t, 1, sk); const P = t.vx != null ? { x: t.vx, y: t.vy - 30 } : { x: 500, y: 300 }; pushFx(b, { kind: "slash", x: P.x, y: P.y, t: 0.2, life: 0.2, color: sk.color }); sfx(b, "slash"); } }
  else if (p.kind === "hole") {
    for (const e of boxHits(b, p.lane, p.col, 1)) { hitEnemy(b, e, sk.mult, sk, { aoe: true });
      if (e.tier === "normal" && !e.dead) { if (e.col > p.col && canPlace(b, e, e.lane, e.col - 1, false)) e.col--; else if (e.lane !== p.lane) { const nl = e.lane + Math.sign(p.lane - e.lane); if (canPlace(b, e, nl, e.col, false)) e.lane = nl; } } }
  } else if (p.kind === "mine") {
    if (p.arm > 0) { p.arm -= p.every; return; }
    const hit = b.enemies.some((e) => !e.dead && cellsOf(e).some(([l, c]) => l === p.lane && c === p.col));
    if (hit || p.t <= p.every) { for (const e of boxHits(b, p.lane, p.col, 1)) hitEnemy(b, e, cellsOf(e).some(([l, c]) => l === p.lane && c === p.col) ? 1 : 0.7, sk, { aoe: true }); const P = cellXY(b, p.lane, p.col); pushFx(b, { kind: "boom", x: P.x, y: P.y + 20, t: 0.5, life: 0.5, color: sk.color, r: 130 }); sfx(b, "boom"); b.shake = Math.max(b.shake, 0.3); p.t = 0; }
  }
}
function tickExtra(b, dt) {
  for (const p of b.persist) { p.t -= dt; p.tick -= dt; if (p.rot != null) p.rot += dt; if (p.tick <= 0 && p.t > -0.2) { p.tick += p.every; runPersist(b, p); } }
  if (b.persist.some((p) => p.t <= 0)) b.persist = b.persist.filter((p) => p.t > 0);
  for (const e of b.enemies) if (e.dots.length && !e.dead) tickDots(b, e, dt);
}
