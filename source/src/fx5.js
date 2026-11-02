// =========================================================
// 5.0 스킬 연출 (로블록스판 BattleFx.lua 이식): 마법진 · 투사체 · 번개 · 폭발 · 솟구침 · 전용 연출 22종 · 영웅 동작
// 로블록스 ImageLabel + Tween 을 캔버스 위 "그림 조각 + 트윈"으로 흉내 낸다. 그림은 webart/fx_*.webp (흰 그림은 색을 입힘)
// =========================================================
const FX5 = (() => {
  const W5 = "#ffffff", MAX = 180;
  const C3 = (r, g, b) => `rgb(${r},${g},${b})`;
  const hexRgb = (c) => { if (c[0] === "#") { let h = c.slice(1); if (h.length === 3) h = h.split("").map((x) => x + x).join(""); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; } const m = c.match(/\d+/g); return m ? m.slice(0, 3).map(Number) : [255, 255, 255]; };
  const lerp = (a, b, t) => { const A = hexRgb(a), B = hexRgb(b); return C3(...A.map((x, i) => Math.round(x + (B[i] - x) * t))); };
  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const EASE = { Linear: (t) => t, Quad: (t) => 1 - (1 - t) * (1 - t), Back: (t) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); }, Sine: (t) => -(Math.cos(Math.PI * t) - 1) / 2 };
  // ---- 무대 (전투마다 하나) ----
  function stage(b) {
    if (b.fx5) return b.fx5;
    const S = b.fx5 = { b, objs: [], tws: [], timers: [], now: 0, u: 0.85, W: CW, H: CH, shakeV: 0 };
    Object.defineProperty(S, "plX", { get: () => PLAYER_POS.x }); Object.defineProperty(S, "plY", { get: () => PLAYER_POS.y });
    Object.defineProperty(S, "shake", { get: () => b.shake || 0, set: (v) => { if (!(save && save.opt && save.opt.shake === 0)) b.shake = v; } });
    Object.defineProperty(S, "hitstop", { get: () => b.hitstop || 0, set: (v) => { b.hitstop = Math.max(b.hitstop || 0, v); } });
    S.delay = (t, fn) => S.timers.push({ at: S.now + t, fn });
    S.heroPose = (name, arg) => { const tx = typeof arg === "number" ? arg : null; b.pose = { name, t: 0, reach: tx != null ? Math.max(30, Math.min(100, (tx - PLAYER_POS.x) * 0.22)) * S.u : 45 * S.u, big: arg === true }; if (name === "lunge" || name === "slam") b.ghost = 0.3; };
    return S;
  }
  // 그림 조각: p = { x, y, w, h, ax, ay, rot, tr(투명도 0~1), col, z, rect:[프레임 수] }
  function img(S, key, p) {
    if (S.objs.length > MAX || !artGet(key)) { artGet(key); return null; }
    const o = Object.assign({ key, x: 0, y: 0, w: 10, h: 10, ax: 0.5, ay: 0.5, rot: 0, tr: 0, col: null, z: 13, fi: 0, fn: 0 }, p); S.objs.push(o); return o;
  }
  function tw(S, o, dur, goal, ease, kill) {
    const done = []; const ret = { Completed: { Connect: (f) => done.push(f) } };
    if (!o) return ret;
    const from = {}; for (const k in goal) from[k] = o[k];
    S.tws.push({ o, t0: S.now, dur: Math.max(0.001, dur), from, goal, ease: EASE[ease] || EASE.Quad, kill: kill !== false, done });
    return ret;
  }
  // ---- 매 프레임 ----
  function update(b, dt) {
    const S = b.fx5; if (!S) return; S.now += dt;
    if (S.timers.length) { const due = S.timers.filter((t) => t.at <= S.now); if (due.length) { S.timers = S.timers.filter((t) => t.at > S.now); for (const t of due) try { t.fn(); } catch (e) {} } }
    const keep = [];
    for (const T of S.tws) {
      const p = Math.min(1, (S.now - T.t0) / T.dur), e = T.ease(p);
      for (const k in T.goal) T.o[k] = T.from[k] + (T.goal[k] - T.from[k]) * e;
      if (p >= 1) { if (T.kill) T.o.dead = true; for (const f of T.done) try { f(); } catch (e2) {} } else keep.push(T);
    }
    S.tws = keep; S.objs = S.objs.filter((o) => !o.dead);
    if (b.pose) { b.pose.t += dt; }
    if (b.ghost) b.ghost = Math.max(0, b.ghost - dt);
  }
  const _tc = document.createElement("canvas"), _tg = _tc.getContext("2d"), TINT = {};
  function tinted(im, key, col, fi, fn) {   // 흰 그림에 색 입히기 (같은 그림 · 색 · 프레임은 저장해 둔다)
    const k = key + col + fi; let c = TINT[k]; if (c) return c;
    const fw = fn ? im.width / fn : im.width; c = document.createElement("canvas"); c.width = fw; c.height = im.height; const g = c.getContext("2d");
    g.drawImage(im, fn ? fi * fw : 0, 0, fw, im.height, 0, 0, fw, im.height); g.globalCompositeOperation = "source-atop"; g.fillStyle = col; g.globalAlpha = 0.85; g.fillRect(0, 0, fw, im.height);
    if (Object.keys(TINT).length > 600) for (const q in TINT) delete TINT[q]; TINT[k] = c; return c;
  }
  function draw(ctx, b, layer) {   // layer 0 = 영웅 · 몹 뒤 (z < 8), 1 = 앞
    const S = b.fx5; if (!S) return;
    const list = S.objs.filter((o) => (layer === 0 ? o.z < 8 : o.z >= 8)).sort((a, c) => a.z - c.z);
    for (const o of list) {
      if (o.tr >= 0.99 || o.w < 0.5 || o.h < 0.5) continue; const im = artGet(o.key); if (!im) continue;
      ctx.save(); ctx.globalAlpha = Math.max(0, 1 - o.tr); ctx.translate(o.x, o.y); if (o.rot) ctx.rotate(o.rot * Math.PI / 180); ctx.imageSmoothingEnabled = true;
      if (o.screen) { ctx.globalCompositeOperation = "source-over"; }
      const fi = o.fn ? Math.floor(o.fi) % o.fn : 0;
      if (o.col && o.col !== W5) ctx.drawImage(tinted(im, o.key, o.col, fi, o.fn), -o.ax * o.w, -o.ay * o.h, o.w, o.h);
      else if (o.fn) { const fw = im.width / o.fn; ctx.drawImage(im, fi * fw, 0, fw, im.height, -o.ax * o.w, -o.ay * o.h, o.w, o.h); }
      else ctx.drawImage(im, -o.ax * o.w, -o.ay * o.h, o.w, o.h);
      ctx.restore();
    }
    if (layer === 1 && S.flash) { for (const f of S.flash) { const a = 1 - Math.min(1, (S.now - f.t0) / f.dur); if (a > 0) { ctx.save(); ctx.globalAlpha = (1 - f.tr) * a; ctx.fillStyle = f.col; ctx.fillRect(0, 0, CW, CH); ctx.restore(); } } S.flash = S.flash.filter((f) => S.now - f.t0 < f.dur); }
  }
  // ---- 기본 조각 (BattleFx.lua 와 같은 이름 · 같은 수치) ----
  const M = {};
  M.glow = (S, x, y, r, col, t, tr) => { const o = img(S, "fx_glow", { x, y, w: r * 0.5, h: r * 0.5, col, tr: tr == null ? 0.15 : tr, z: 12 }); tw(S, o, t || 0.35, { w: r * 2, h: r * 2, tr: 1 }); };
  M.ring = (S, x, y, r, col, t, flat) => { const f = flat || 0.45, o = img(S, "fx_ring", { x, y, w: r * 0.2, h: r * 0.2 * f, col, tr: 0 }); tw(S, o, t || 0.45, { w: r * 2, h: r * 2 * f, tr: 1 }); };
  M.sparks = (S, x, y, col, n, spread) => { for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, d = (spread || 50) * S.u * (0.5 + Math.random()), s = (6 + Math.random() * 8) * S.u; const o = img(S, "fx_spark", { x, y, w: s, h: s, col: Math.random() < 0.4 ? W5 : col, rot: rnd(0, 90), z: 14 }); tw(S, o, 0.3 + Math.random() * 0.2, { x: x + Math.cos(a) * d, y: y + Math.sin(a) * d * 0.7, w: s * 0.3, h: s * 0.3, tr: 1 }); } };
  M.slash = (S, x, y, w, col, rot, t) => { const o = img(S, "fx_slash", { x, y, w: w * 0.7, h: w * 0.35, col, rot: rot - 25, z: 14 }); tw(S, o, t || 0.28, { w: w * 1.15, h: w * 0.58, rot: rot + 20, tr: 1 }); const c = img(S, "fx_slash", { x, y, w: w * 0.6, h: w * 0.22, col: W5, rot: rot - 25, z: 15 }); tw(S, c, (t || 0.28) * 0.8, { w: w, h: w * 0.36, rot: rot + 20, tr: 1 }); };
  M.claw = (S, x, y, w, col) => { const o = img(S, "fx_claw", { x, y, w: w * 0.6, h: w * 0.6, col, z: 14 }); tw(S, o, 0.32, { w: w * 1.1, h: w * 1.1, tr: 1 }); };
  M.burst = (S, x, y, r, col, t) => { const o = img(S, "fx_burst", { x, y, w: r * 2, h: r * 2, col, fn: 8, z: 14 }); tw(S, o, t || 0.5, { fi: 8 }, "Linear"); M.glow(S, x, y, r * 0.9, W5, 0.18, 0.1); M.glow(S, x, y, r * 1.6, col, 0.45, 0.35); };
  M.bolt = (S, x1, y1, x2, y2, col, t) => { const len = Math.hypot(x2 - x1, y2 - y1); if (len < 4) return; const ang = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI - 90, w = Math.max(28 * S.u, len * 0.22);
    const o = img(S, "fx_bolt", { x: (x1 + x2) / 2, y: (y1 + y2) / 2, w, h: len, rot: ang, col, fn: 4, fi: rnd(0, 3), z: 14 }), c = img(S, "fx_bolt", { x: (x1 + x2) / 2, y: (y1 + y2) / 2, w: w * 0.6, h: len, rot: ang, col: W5, fn: 4, fi: rnd(0, 3), z: 15 });
    tw(S, o, t || 0.25, { fi: (o ? o.fi : 0) + 5 }, "Linear", false).Completed.Connect(() => tw(S, o, 0.12, { tr: 1 })); tw(S, c, t || 0.25, { fi: (c ? c.fi : 0) + 5 }, "Linear", false).Completed.Connect(() => tw(S, c, 0.1, { tr: 1 })); };
  M.beam = (S, x1, y, x2, h, col) => { const o = img(S, "fx_beam", { x: x1, y, ax: 0, w: 0, h, col, z: 14 }), c = img(S, "fx_beam", { x: x1, y, ax: 0, w: 0, h: h * 0.4, col: W5, z: 15 });
    tw(S, o, 0.12, { w: x2 - x1 }, null, false).Completed.Connect(() => tw(S, o, 0.25, { h: h * 0.1, tr: 1 })); tw(S, c, 0.12, { w: x2 - x1 }, null, false).Completed.Connect(() => tw(S, c, 0.2, { tr: 1 })); };
  function colorCircle(col) { const [r, g, bb] = hexRgb(col).map((v) => v / 255), mx = Math.max(r, g, bb), mn = Math.min(r, g, bb), d = mx - mn, s = mx ? d / mx : 0; let h = 0; if (d) h = (mx === r ? ((g - bb) / d) % 6 : mx === g ? (bb - r) / d + 2 : (r - g) / d + 4) / 6; if (h < 0) h += 1;
    const k = s < 0.25 ? "arcane" : h < 0.11 || h > 0.93 ? "fire" : h < 0.2 ? "light" : h < 0.6 ? "cold" : h < 0.68 ? "arcane" : "void"; return ART_SET.has("fx_mc_" + k) ? "fx_mc_" + k : null; }
  M.circle = (S, x, y, r, col, t) => { const o = img(S, "fx_circle", { x, y, w: r * 0.3, h: r * 0.3 * 0.38, col, tr: 0.1, z: 4 }); if (!o) return; tw(S, o, 0.18, { w: r * 2, h: r * 2 * 0.38 }, null, false); S.delay(t || 0.5, () => tw(S, o, 0.25, { tr: 1, w: r * 2.3, h: r * 2.3 * 0.38 })); };
  M.magicCircle = (S, x, y, r, col, t, z) => { z = z || 4; t = t || 0.6; const cc = colorCircle(col);
    const L = cc ? [[cc, 1, 40, true], ["fx_mc_runes", 1.12, -70]] : [["fx_mc_main", 1, 40], ["fx_mc_runes", 1.18, -70], ["fx_mc_inner", 0.45, 120]]; let any = false;
    L.forEach((l, i) => { const o = img(S, l[0], { x, y, w: r * 0.4 * l[1], h: r * 0.4 * l[1], col: l[3] ? W5 : (i === 2 || cc) ? lerp(W5, col, 0.4) : col, tr: l[3] ? (z >= 10 ? 0 : 0.15) : cc ? 0.55 : z >= 10 ? 0.05 : 0.35, rot: rnd(0, 360), z });
      if (o) { any = true; tw(S, o, 0.2, { w: r * 2 * l[1], h: r * 2 * l[1] }, "Back", false); tw(S, o, t + 0.3, { rot: o.rot + l[2] * (t + 0.3) }, "Linear", false); S.delay(t, () => tw(S, o, 0.3, { tr: 1, w: r * 2.25 * l[1], h: r * 2.25 * l[1] })); } });
    if (!any) M.circle(S, x, y, r, col, t);
    if (z >= 10) M.glow(S, x, y, r * 1.4, col, t, 0.55); else { const g = img(S, "fx_glow", { x, y, w: r * 0.7, h: r * 0.7, col, tr: 0.5, z: 3 }); tw(S, g, t, { w: r * 2.4, h: r * 2.4, tr: 1 }); } };
  M.sigil = (S, x, y, r, col, t) => { const cc = colorCircle(col), o = img(S, cc || "fx_mc_sigil", { x, y, w: r * 2, h: r * 2 * 0.36, col: cc ? W5 : col, tr: 1, z: 4 }); if (!o) return M.circle(S, x, y, r, col, t); tw(S, o, 0.15, { tr: 0.05 }, null, false); S.delay(t || 0.5, () => tw(S, o, 0.3, { tr: 1, w: r * 2.3, h: r * 2.3 * 0.36 })); };
  M.skyCircle = (S, x, y, r, col, t) => { t = t || 0.9; y += 80;   // 웹: 위 HUD 아래로 const cc = colorCircle(col);
    [[cc || "fx_mc_main", 1], ["fx_mc_runes", 1.15]].forEach((l, i) => { const o = img(S, l[0], { x, y, w: r * 0.3 * l[1], h: r * 0.3 * l[1] * 0.42, col: cc && i === 0 ? W5 : cc ? lerp(W5, col, 0.4) : col, tr: cc && i === 1 ? 0.5 : 0.05, z: 12 });
      if (o) { tw(S, o, 0.22, { w: r * 2 * l[1], h: r * 2 * l[1] * 0.42 }, "Back", false); S.delay(t, () => tw(S, o, 0.3, { tr: 1 })); } else if (i === 0) M.ring(S, x, y, r * 2, col, t, 0.42); });
    M.glow(S, x, y, r * 1.6, col, t, 0.5); };
  M.erupt = (S, x, y, col, style, h) => { const u = S.u; h = (h || 120) * u;
    if (style === "bubble") { for (let i = 1; i <= 6; i++) S.delay(i * 0.04, () => { const r = rnd(10, 22) * u, bx = x + rnd(-30, 30) * u, o = img(S, "fx_glow", { x: bx, y, w: r, h: r, col, tr: 0.15, z: 14 }); tw(S, o, 0.5 + Math.random() * 0.3, { x: bx + rnd(-10, 10) * u, y: y - h * (0.5 + Math.random() * 0.6), w: r * 1.6, h: r * 1.6, tr: 1 }); }); return; }
    const n = style === "lava" ? 3 : 4;
    for (let i = 1; i <= n; i++) S.delay((i - 1) * 0.05, () => {
      const px = x + (i - (n + 1) / 2) * 22 * u + rnd(-6, 6) * u, key = style === "lava" ? "fx_glow" : style === "rock" ? "fx_rockspike" : style === "ice" ? "fx_icespike" : "fx_shard"; let w = (style === "lava" ? 26 : 16) * u; const hh = h * (0.6 + Math.random() * 0.5);
      const own = (style === "rock" || style === "ice") && ART_SET.has(key); if (own) w *= 2.2;
      const o = img(S, key, { x: px, y, ay: 1, w, h: 2 * u, rot: rnd(-12, 12), col: own ? W5 : style === "rock" ? C3(150, 120, 90) : col, z: 14 });
      const core = style === "lava" ? img(S, "fx_glow", { x: px, y, ay: 1, w: w * 0.45, h: 2 * u, col: C3(255, 240, 180), z: 15 }) : null;
      tw(S, o, 0.1, { h: hh }, "Back", false).Completed.Connect(() => tw(S, o, 0.35, { w: w * 0.6, h: hh * 0.3, tr: 1 }));
      if (core) tw(S, core, 0.1, { h: hh * 0.9 }, "Back", false).Completed.Connect(() => tw(S, core, 0.3, { tr: 1 }));
      if (style === "lava") for (let k = 0; k < 3; k++) { const d = img(S, "fx_glow", { x: px, y: y - hh * 0.8, w: 8 * u, h: 8 * u, col, z: 15 }); tw(S, d, 0.45, { x: px + rnd(-50, 50) * u, y: y - rnd(0, 20) * u, tr: 1 }); }
    });
    M.ring(S, x, y, 70 * u, col, 0.35); };
  M.screen = (S, col, tr, t) => { (S.flash = S.flash || []).push({ col, tr: tr == null ? 0.7 : tr, dur: t || 0.25, t0: S.now }); };
  M.proj = (S, x1, y1, x2, y2, col, t, kind, onHit) => { const r = (kind === "big" ? 46 : 26) * S.u, key = kind === "shard" ? "fx_shard" : "fx_glow", rot = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI + (kind === "shard" ? 90 : 0);
    const o = img(S, key, kind === "shard" ? { x: x1, y: y1, w: r * 0.5, h: r, rot, col, z: 14 } : { x: x1, y: y1, w: r * 1.6, h: r * 1.6, rot, col, z: 14 }), c = kind !== "shard" ? img(S, "fx_glow", { x: x1, y: y1, w: r * 0.7, h: r * 0.7, col: W5, z: 15 }) : null;
    if (!o) { if (onHit) onHit(); return; } const dur = t || 0.22;
    tw(S, o, dur, { x: x2, y: y2 }, "Linear", false); if (c) tw(S, c, dur, { x: x2, y: y2 }, "Linear", false);
    for (let k = 0; k * 0.03 < dur; k++) S.delay(k * 0.03, () => { if (o.dead) return; const g = img(S, "fx_glow", { x: o.x, y: o.y, w: r * 0.9, h: r * 0.9, col, tr: 0.45, z: 13 }); tw(S, g, 0.22, { w: r * 0.2, h: r * 0.2, tr: 1 }); });
    S.delay(dur, () => { o.dead = true; if (c) c.dead = true; if (onHit) onHit(); }); };
  M.fall = (S, x, y, col, kind, onHit) => M.proj(S, x + 140 * S.u, -40 * S.u, x, y, col, 0.32, kind === "shard" ? "shard" : "big", onHit);
  M.blink = (S, list, col, fin) => {   // 전사 순보: 잔상으로 몹 곁에 차례로 나타나 벤다
    const b = S.b; if ((b.blinking || 0) > S.now) return false; const u = S.u, n = Math.min(5, list.length); if (!n) return false;
    b.blinking = S.now + 0.25 + n * 0.09; b.blink = { until: S.now + 0.1 + n * 0.09 + 0.08 }; M.sparks(S, S.plX, S.plY - 50 * u, col, 8, 50); M.glow(S, S.plX, S.plY - 50 * u, 110 * u, W5, 0.2, 0.2);
    let px = S.plX, py = S.plY - 50 * u;
    for (let i = 1; i <= n; i++) { const h = list[i - 1]; S.delay(0.05 + i * 0.09, () => { const x = h.tx - 40 * u, y = h.ty, qy = y - 50 * u; (b.blinkGhosts = b.blinkGhosts || []).push({ x, y, t0: S.now, rot: i % 2 ? -10 : 12, col });
      const L = img(S, "fx_beam", { x: px, y: py, ax: 0, w: Math.hypot(x - px, qy - py), h: 10 * u, rot: Math.atan2(qy - py, x - px) * 180 / Math.PI, col, tr: 0.2, z: 15 }); tw(S, L, 0.18, { tr: 1, h: 2 * u });
      M.slash(S, h.tx, h.ty - h.size * 0.45, 120 * u, col, i % 2 === 0 ? 40 : -40); M.sparks(S, h.tx, h.ty - h.size * 0.45, col, 4, 40); S.hitstop = 0.03; S.shake = Math.max(S.shake, 0.1); px = x; py = qy; }); }
    S.delay(0.1 + n * 0.09 + 0.08, () => { M.ring(S, S.plX, S.plY, 90 * u, col, 0.35); M.sparks(S, S.plX, S.plY - 40 * u, col, 6, 40); if (fin) fin(); });
    return true;
  };
  // ---- 영웅 위치 · 대상 ----
  const heroTip = (S) => [S.plX + 34 * S.u, S.plY - 62 * S.u];
  const uy = (h) => h.ty - h.size * 0.45, hy = uy;
  const BLINK = { whirl: 1, crimsonstorm: 1, ironstorm: 1, butcher: 1, rend: 1, bloodmoon: 1 }, HEAVY = { smash: 1, execute: 1, titanfist: 1, verdict: 1, gut: 1, crush: 1 };
  function flourish(S, tier, col, tx, ty) { const u = S.u;
    if (tier >= 2) { M.sparks(S, tx, ty, col, 6 + tier * 3, 70); M.glow(S, tx, ty, 120 * u, col, 0.4, 0.35); }
    if (tier >= 3) { M.screen(S, col, 0.8, 0.3); M.ring(S, S.plX, S.plY, 130 * u, col, 0.5); M.ring(S, S.plX, S.plY, 90 * u, W5, 0.4); const p = img(S, "fx_beam", { x: tx, y: ty, ax: 0, w: 10 * u, h: 40 * u, rot: -90, col, z: 15 }); tw(S, p, 0.15, { w: ty + 40 * u, h: 60 * u }, null, false).Completed.Connect(() => tw(S, p, 0.3, { tr: 1, h: 6 * u })); }
    if (tier >= 4) { M.screen(S, C3(120, 0, 10), 0.6, 0.45); S.shake = Math.max(S.shake, 0.35); S.hitstop = 0.06; M.glow(S, S.plX, S.plY - 50 * u, 200 * u, C3(255, 40, 30), 0.6, 0.3); } }
  // ---- 전용 연출 (22종) ----
  const SIG = {};
  const each = (S, X, n, gap, f) => X.list.slice(0, n).forEach((h, i) => S.delay(i * gap, () => f(h, i)));
  function vslash(S, x, y, len, col, w) {
    const v = img(S, "fx_vslash", { x, y: y - len, ay: 0, w: w * 2.4, h: 4, col, z: 17 }); tw(S, v, 0.1, { h: len * 2 }, null, false).Completed.Connect(() => tw(S, v, 0.3, { tr: 1 }));
    const o = img(S, "fx_beam", { x, y: y - len, ax: 0, w: 4, h: w, rot: 90, col, z: 16 }); tw(S, o, 0.1, { w: len * 2 }, null, false).Completed.Connect(() => tw(S, o, 0.3, { tr: 1, h: w * 0.2 }));
    const c = img(S, "fx_beam", { x, y: y - len, ax: 0, w: 4, h: w * 0.35, rot: 90, col: W5, z: 17 }); tw(S, c, 0.1, { w: len * 2 }, null, false).Completed.Connect(() => tw(S, c, 0.25, { tr: 1 }));
  }
  const gy = (X) => (X.tg ? X.tg.ty : X.ty);
  SIG.twinfang = (S, X) => { const u = X.u; S.heroPose("lunge", X.tx); S.delay(0.08, () => { const o = img(S, "fx_xslash", { x: X.tx, y: X.ty, w: 40 * u, h: 40 * u, col: X.col, z: 16 }); if (o) tw(S, o, 0.12, { w: 140 * u, h: 140 * u }, null, false).Completed.Connect(() => tw(S, o, 0.25, { tr: 1, w: 160 * u, h: 160 * u })); else { M.slash(S, X.tx, X.ty, 120 * u, X.col, 40); M.slash(S, X.tx, X.ty, 120 * u, W5, -40); } M.sparks(S, X.tx, X.ty, X.col, 6, 40); S.hitstop = 0.03; }); };
  SIG.skycleave = (S, X) => { const u = X.u; S.heroPose("lunge", X.tx); S.delay(0.08, () => { vslash(S, X.tx, X.ty, 140 * u, X.col, 26 * u); M.ring(S, X.tx, gy(X), 80 * u, X.col, 0.3); S.hitstop = 0.04; }); };
  SIG.heavensplit = (S, X) => { const u = X.u; S.heroPose("slam", X.tx); S.delay(0.14, () => { vslash(S, X.tx, X.ty, S.H * 0.45, lerp(W5, X.col, 0.3), 46 * u); M.screen(S, W5, 0.7, 0.2); M.ring(S, X.tx, gy(X), 200 * u, X.col, 0.5); M.erupt(S, X.tx, gy(X), C3(200, 200, 210), "rock", 90); S.shake = Math.max(S.shake, 0.3); S.hitstop = 0.08; }); };
  SIG.galeshot = (S, X) => { const u = X.u; S.heroPose("attack");
    for (let k = 0; k <= 1; k++) { const wb = img(S, "fx_windblade", { x: S.plX + 40 * u, y: X.ty + (k - 0.5) * 14 * u, w: 70 * u, h: 35 * u, col: C3(190, 255, 210), z: 16 }); tw(S, wb, 0.16, { x: X.tx }, "Linear"); }
    for (let k = 0; k <= 1; k++) S.delay(k * 0.06, () => { const o = img(S, "fx_beam", { x: S.plX + 30 * u, y: X.ty + (k - 0.5) * 14 * u, ax: 0, w: 10, h: 8 * u, col: C3(170, 255, 190), z: 15 }); tw(S, o, 0.12, { w: X.tx - S.plX }, null, false).Completed.Connect(() => tw(S, o, 0.2, { tr: 1 })); M.slash(S, X.tx, X.ty, 70 * u, X.col, rnd(-30, 30)); }); };
  SIG.stormdance = (S, X) => { const u = X.u; S.heroPose("throw"); M.ring(S, S.plX + 40 * u, S.plY - 40 * u, 110 * u, C3(190, 210, 230), 0.5, 1); each(S, X, 12, 0.03, (h) => M.proj(S, S.plX + 30 * u, S.plY - 60 * u, h.tx, hy(h), X.col, 0.14, "shard", () => M.slash(S, h.tx, hy(h), 60 * u, X.col, rnd(-60, 60)))); };
  SIG.bloodclaw = (S, X) => { const u = X.u; S.heroPose("lunge", X.tx); S.delay(0.08, () => { for (let k = -1; k <= 1; k++) M.slash(S, X.tx + k * 10 * u, X.ty + k * 8 * u, 90 * u, C3(255, 70, 90), 60); M.glow(S, X.tx, X.ty, 60 * u, C3(255, 60, 80), 0.3, 0.3); }); };
  SIG.fanghail = (S, X) => { const u = X.u; S.heroPose("throw"); let px = S.plX + 30 * u, py = S.plY - 60 * u; X.list.slice(0, 5).forEach((h, i) => S.delay(i * 0.07, () => { const qx = h.tx, qy = hy(h); M.proj(S, px, py, qx, qy, X.col, 0.08, "shard", () => M.erupt(S, qx, h.ty, X.col, "bubble", 60)); px = qx; py = qy; })); };
  SIG.hydra = (S, X) => { const u = X.u; S.heroPose("cast"); M.sigil(S, X.tx, gy(X), 110 * u, X.col, 0.9);
    for (let k = 1; k <= 3; k++) S.delay(k * 0.12, () => { const h = X.list[(k - 1) % Math.max(1, X.list.length)] || X.tg; if (!h) return; const hd = img(S, "fx_hydra", { x: h.tx - 160 * u, y: hy(h) - 70 * u, w: 90 * u, h: 90 * u, z: 16 });
      if (hd) tw(S, hd, 0.18, { x: h.tx - 30 * u, y: hy(h), w: 130 * u, h: 130 * u }, "Back", false).Completed.Connect(() => { M.claw(S, h.tx, hy(h), 80 * u, X.col); M.erupt(S, h.tx, h.ty, X.col, "bubble", 70); tw(S, hd, 0.25, { tr: 1 }); });
      else M.proj(S, h.tx - 60 * u + k * 40 * u, -20 * u, h.tx, hy(h), X.col, 0.22, "big", () => M.claw(S, h.tx, hy(h), 80 * u, X.col)); }); };
  SIG.twinlance = (S, X) => { const u = X.u; S.heroPose("lunge", X.tx); S.delay(0.08, () => { for (const k of [-1, 1]) M.beam(S, S.plX + 40 * u, X.ty + k * 10 * u, S.W, 24 * u, X.col); for (const h of X.list) M.sparks(S, h.tx, hy(h), X.col, 3, 30); S.hitstop = 0.04; }); };
  SIG.dragoon = (S, X) => { const u = X.u; S.heroPose("slam", X.tx); S.delay(0.16, () => { M.beam(S, S.plX + 40 * u, X.ty, S.W, 54 * u, X.col); for (const k of [-1, 1]) M.beam(S, S.plX + 60 * u, X.ty + k * 70 * u, S.W, 16 * u, X.col); for (const h of X.list) M.slash(S, h.tx, hy(h), 90 * u, X.col, 0); S.shake = Math.max(S.shake, 0.2); S.hitstop = 0.06; }); };
  SIG.skypierce = (S, X) => { const u = X.u; S.heroPose("cast", true); M.skyCircle(S, X.tx, 60 * u, 120 * u, X.col, 0.8);
    S.delay(0.2, () => { const sp = ART_SET.has("fx_spear"), o = img(S, sp ? "fx_spear" : "fx_shard", { x: X.tx, y: 40 * u + 80, w: sp ? 60 * u : 40 * u, h: 240 * u, col: sp ? W5 : lerp(W5, X.col, 0.3), z: 16 });
      if (o) tw(S, o, 0.16, { y: X.ty }, "Quad", false).Completed.Connect(() => { o.dead = true; M.beam(S, S.plX + 40 * u, X.ty, S.W, 60 * u, X.col); M.ring(S, X.tx, gy(X), 220 * u, W5, 0.5); M.screen(S, W5, 0.7, 0.2); S.shake = Math.max(S.shake, 0.35); S.hitstop = 0.08; }); }); };
  SIG.groundslam = (S, X) => { const u = X.u; S.heroPose("slam", X.tx); S.delay(0.16, () => { M.ring(S, X.tx, gy(X), 160 * u, C3(210, 170, 110), 0.45); each(S, X, 6, 0.03, (h) => M.erupt(S, h.tx, h.ty, C3(170, 130, 90), "rock", 90)); S.shake = Math.max(S.shake, 0.25); S.hitstop = 0.06; }); };
  SIG.giantmaul = (S, X) => { const u = X.u; S.heroPose("slam", X.tx); S.delay(0.16, () => { for (let k = 0; k <= 2; k++) S.delay(k * 0.08, () => M.ring(S, X.tx, gy(X), (150 + k * 70) * u, k === 1 ? W5 : C3(230, 180, 90), 0.5)); each(S, X, 9, 0.02, (h) => M.erupt(S, h.tx, h.ty, C3(180, 140, 90), "rock", 120)); M.screen(S, W5, 0.8, 0.15); S.shake = Math.max(S.shake, 0.4); S.hitstop = 0.1; }); };
  SIG.phoenix = (S, X) => { const u = X.u; S.heroPose("cast", true); const x0 = S.plX + 30 * u, y0 = X.ty;
    const bird = img(S, "fx_phoenix", { x: x0, y: y0 - 10 * u, w: 200 * u, h: 100 * u, z: 17 }); if (bird) tw(S, bird, 0.5, { x: S.W + 120 * u }, "Quad");
    for (let k = 1; k <= 12; k++) S.delay(k * 0.035, () => { const x = x0 + (S.W - x0) * k / 12; for (const s of [-1, 1]) { const w = img(S, "fx_glow", { x, y: y0 + s * 20 * u, w: 70 * u, h: 30 * u, rot: s * 25, col: C3(255, 140, 40), tr: 0.2, z: 15 }); tw(S, w, 0.4, { tr: 1, x: x - 30 * u, y: y0 + s * 40 * u }); } });
    for (const h of X.list) S.delay(0.15 + (h.tx - x0) / S.W * 0.4, () => M.burst(S, h.tx, hy(h), 60 * u, X.col)); };
  SIG.suncore = (S, X) => { const u = X.u; S.heroPose("cast", true); M.skyCircle(S, X.tx, 60 * u, 170 * u, C3(255, 220, 120), 1.2); M.screen(S, C3(255, 230, 160), 0.8, 0.3);
    each(S, X, 4, 0.14, (h) => { const sx = X.tx + rnd(-60, 60) * u, sun = img(S, "fx_sun", { x: sx, y: 60 * u + 80, w: 70 * u, h: 70 * u, z: 16 }); tw(S, sun, 0.26, { x: h.tx, y: hy(h), w: 90 * u, h: 90 * u, rot: 90 }, "Quad");
      M.proj(S, sx, 60 * u + 80, h.tx, hy(h), C3(255, 230, 140), 0.26, "orb", () => { M.burst(S, h.tx, hy(h), 110 * u, C3(255, 200, 80)); M.ring(S, h.tx, h.ty, 140 * u, W5, 0.4); M.erupt(S, h.tx, h.ty, X.col, "lava", 90); S.shake = Math.max(S.shake, 0.25); }); }); };
  SIG.icecage = (S, X) => { const u = X.u; S.heroPose("cast", true); M.ring(S, S.plX, S.plY, 380 * u, X.col, 0.55); each(S, X, 9, 0.03, (h) => { for (const k of [-1, 1]) M.erupt(S, h.tx + k * 18 * u, h.ty, X.col, "ice", 120); M.glow(S, h.tx, hy(h), 70 * u, W5, 0.4, 0.4); }); };
  SIG.voideye = (S, X) => { const u = X.u; S.heroPose("cast", true); const ex = S.W * 0.6, ey = 90 * u + 80, eye = img(S, "fx_voideye", { x: ex, y: ey, w: 300 * u, h: 8 * u, z: 13 });
    if (eye) { tw(S, eye, 0.3, { h: 150 * u }, "Back", false); S.delay(0.9, () => tw(S, eye, 0.25, { h: 6 * u, tr: 1 })); }
    M.screen(S, C3(60, 0, 90), 0.6, 0.6); each(S, X, 8, 0.05, (h) => S.delay(0.3, () => { M.bolt(S, ex, ey, h.tx, hy(h), X.col, 0.25); M.burst(S, h.tx, hy(h), 50 * u, X.col); })); };
  SIG.cometbolt = (S, X) => { const u = X.u; S.heroPose("cast"); const cm = img(S, "fx_comet", { x: X.tx + 140 * u, y: -40 * u, w: 90 * u, h: 90 * u, z: 16 });
    if (cm) tw(S, cm, 0.32, { x: X.tx, y: X.ty }, "Quad", false).Completed.Connect(() => { cm.dead = true; M.burst(S, X.tx, X.ty, 60 * u, X.col); M.ring(S, X.tx, gy(X), 80 * u, X.col, 0.3); }); else M.fall(S, X.tx, X.ty, C3(170, 220, 255), "big", () => M.burst(S, X.tx, X.ty, 60 * u, X.col)); };
  SIG.arcbarrage = (S, X) => { const u = X.u; S.heroPose("cast"); for (let k = 0; k <= 2; k++) S.delay(k * 0.05, () => M.proj(S, X.hx, X.hy + (k - 1) * 8 * u, X.tx, X.ty, X.col, 0.12, "orb", () => M.sparks(S, X.tx, X.ty, X.col, 2, 20))); };
  SIG.voidorb = (S, X) => { const u = X.u; S.heroPose("cast");
    for (let k = 1; k <= 3; k++) { const o = img(S, "fx_glow", { x: S.plX, y: S.plY - 50 * u, w: 36 * u, h: 36 * u, col: X.col, z: 14 }); if (o) { const t0 = S.now; for (let s = 0; s < 48; s++) S.delay(s * 0.05, () => { const a = (S.now - t0) * 4 + k * 2.09; o.x = S.plX + Math.cos(a) * 70 * u; o.y = S.plY - 50 * u + Math.sin(a) * 30 * u; }); S.delay(2.4, () => tw(S, o, 0.2, { tr: 1 })); } }
    each(S, X, 3, 0.15, (h) => M.proj(S, S.plX, S.plY - 50 * u, h.tx, hy(h), X.col, 0.2, "orb", () => M.burst(S, h.tx, hy(h), 30 * u, X.col))); };
  SIG.riftsplit = (S, X) => { const u = X.u; S.heroPose("cast", true); const g = gy(X); M.sigil(S, X.tx, g, 140 * u, X.col, 1); for (let k = 1; k <= 4; k++) S.delay(k * 0.06, () => M.bolt(S, X.tx + rnd(-80, 80) * u, g, X.tx + rnd(-80, 80) * u, g - rnd(10, 40) * u, X.col, 0.3)); each(S, X, 9, 0.04, (h) => M.erupt(S, h.tx, h.ty, X.col, "bubble", 110)); };
  SIG.eternalwinter = (S, X) => { const u = X.u; S.heroPose("cast", true); M.screen(S, C3(220, 240, 255), 0.6, 0.8); M.skyCircle(S, X.tx, 60 * u, 180 * u, X.col, 1.2); each(S, X, 9, 0.06, (h) => { M.erupt(S, h.tx, h.ty, X.col, "ice", 150); M.fall(S, h.tx, hy(h), W5, "shard"); }); };
  // 5.24: 설명과 연출이 어긋나던 아르카나
  const novaFx = (S, X, light) => { const u = X.u; S.heroPose("cast", true); M.ring(S, S.plX, S.plY, 380 * u, X.col, 0.55); M.ring(S, S.plX, S.plY, 250 * u, W5, 0.45); M.glow(S, S.plX, S.plY - 50 * u, 160 * u, X.col, 0.5, 0.2); if (light) M.screen(S, W5, 0.7, 0.25);
    each(S, X, 10, 0.03, (h) => { M.burst(S, h.tx, hy(h), 46 * u, X.col); M.sparks(S, h.tx, hy(h), X.col, 3, 30); }); };
  SIG.arcnova = (S, X) => novaFx(S, X, false);
  SIG.angelfall = (S, X) => { novaFx(S, X, true); const u = X.u; for (const s of [-1, 1]) { const w = img(S, "fx_beam", { x: S.plX, y: S.plY - 70 * u, ax: 0, w: 10, h: 40 * u, rot: s > 0 ? -25 : 205, col: W5, z: 15 }); tw(S, w, 0.25, { w: 260 * u }, null, false).Completed.Connect(() => tw(S, w, 0.4, { tr: 1 })); } };
  SIG.trap = (S, X) => { const u = X.u; S.heroPose("throw"); M.proj(S, S.plX + 30 * u, S.plY - 50 * u, X.tx, X.tg ? X.tg.ty : X.ty, X.col, 0.25, "orb", () => { M.sigil(S, X.tx, X.tg ? X.tg.ty : X.ty, 60 * u, X.col, 0.5); M.sparks(S, X.tx, X.tg ? X.tg.ty : X.ty, X.col, 4, 24); }); };
  const shuriFx = (S, X, n, big) => { const u = X.u; S.heroPose("throw"); X.list.slice(0, n).forEach((h, i) => S.delay(i * 0.06, () => { const o = img(S, "fx_xslash", { x: S.plX + 30 * u, y: S.plY - 50 * u, w: (big ? 110 : 44) * u, h: (big ? 110 : 44) * u, col: C3(220, 230, 255), z: 16 });
    tw(S, o, big ? 0.3 : 0.16, { x: h.tx, y: hy(h), rot: 720 }, "Linear", false).Completed.Connect(() => { if (o) o.dead = true; M.slash(S, h.tx, hy(h), (big ? 120 : 70) * u, X.col, rnd(-40, 40)); M.sparks(S, h.tx, hy(h), W5, 3, 30); }); })); };
  SIG.shuriken = (S, X) => shuriFx(S, X, 6, false);
  SIG.bigshuriken = (S, X) => shuriFx(S, X, 1, true);
  SIG.skysword = (S, X) => SIG.skypierce(S, X);
  SIG.venomrain = (S, X) => { const u = X.u; S.heroPose("throw"); each(S, X, 9, 0.06, (h) => M.fall(S, h.tx, hy(h), X.col, "shard", () => { M.erupt(S, h.tx, h.ty, X.col, "bubble", 80); M.sparks(S, h.tx, hy(h), X.col, 2, 24); })); };
  SIG.volley = (S, X) => { const u = X.u; S.heroPose("throw"); X.list.slice(0, 10).forEach((h, i) => S.delay(i * 0.035, () => M.proj(S, S.plX + 30 * u, S.plY - 60 * u, h.tx, hy(h), X.col, 0.16, "shard", () => M.sparks(S, h.tx, hy(h), X.col, 2, 20)))); };
  SIG.venom = SIG.volley;
  // ---- 스킬 시전 연출 (BattleFx.cast 와 같은 분기) ----
  function cast(b, sk, hits) {
    const S = stage(b), d = sk.def || sk, col = sk.color || "#ffffff", elem = sk.elem, kind = sk.kind, tier = typeof skillTier === "function" ? skillTier(d) : 0, u = S.u * (1 + 0.12 * tier);
    const list = hits.filter((e) => e.vx != null).map((e) => ({ tx: e.vx, ty: e.vy, size: e._sz || 60, e }));
    const tg = list[0], tx = tg ? tg.tx : S.W * 0.7, ty = tg ? uy(tg) : S.plY - 50 * u, mag = d.dtype === "mag", big = (d.cd || 0) >= 8 || (d.mult || 0) >= 6 || tier >= 3;
    if (d.slot !== "basic" && tier >= 2) S.delay(0.12, () => flourish(S, tier, col, tx, ty));
    if (SIG[d.id]) { const [hx0, hy0] = heroTip(S); if (mag && d.slot !== "basic") { M.magicCircle(S, S.plX - 10 * u, S.plY - 62 * u, (big ? 80 : 58) * u, col, big ? 0.8 : 0.5, 4); M.sigil(S, S.plX, S.plY + 4 * u, (big ? 100 : 70) * u, col, big ? 0.8 : 0.5); } SIG[d.id](S, { u, col, tx, ty, list, tg, hx: hx0, hy: hy0, big }); return; }
    if (d.dtype === "buff" || d.dtype === "heal" || kind === "buff" || kind === "heal") { M.ring(S, S.plX, S.plY, 90 * u, col, 0.6); M.glow(S, S.plX, S.plY - 50 * u, 120 * u, col, 0.6, 0.3); for (let i = 1; i <= 6; i++) S.delay(i * 0.05, () => M.sparks(S, S.plX + rnd(-30, 30) * u, S.plY - rnd(0, 80) * u, col, 1, 30)); S.heroPose("cast"); return; }
    if (mag) {
      const [hx, hy2] = heroTip(S);
      if (d.slot === "basic") M.sigil(S, S.plX, S.plY + 4 * u, 50 * u, col, 0.3);
      else { M.magicCircle(S, S.plX - 10 * u, S.plY - 62 * u, (big ? 80 : 58) * u, col, big ? 0.8 : 0.5, 4); M.sigil(S, S.plX, S.plY + 4 * u, (big ? 100 : 70) * u, col, big ? 0.8 : 0.5);
        if (big) { M.magicCircle(S, hx + 30 * u, hy2, 46 * u, col, 0.6, 16); if (tg) S.delay(0.12, () => M.sigil(S, tx, tg.ty, 120 * u, col, 0.7)); } }
      M.glow(S, hx, hy2, (big ? 70 : 40) * u, col, 0.3, 0.1); S.heroPose("cast", big); if (big) M.screen(S, col, 0.82, 0.35);
      const boom = (x, y, r) => { M.burst(S, x, y, r, col); M.sparks(S, x, y, col, 4, 40); };
      if (elem === "light") {
        if (kind === "chain") { let px = hx, py = hy2; list.slice(0, 7).forEach((h, i) => { const qx = h.tx, qy = uy(h), ax = px, ay = py; S.delay(i * 0.06, () => { M.bolt(S, ax, ay, qx, qy, col, 0.25); M.glow(S, qx, qy, 40 * u, col, 0.25); }); px = qx; py = qy; }); }
        else if (kind === "pierce") { M.beam(S, hx, hy2, S.W, 40 * u, col); for (const h of list) boom(h.tx, uy(h), 30 * u); }
        else if (kind === "spray") list.slice(0, 8).forEach((h, i) => S.delay(i * 0.04, () => M.proj(S, hx, hy2, h.tx, uy(h), col, 0.18, "orb", () => boom(h.tx, uy(h), 22 * u))));
        else { M.screen(S, W5, big ? 0.55 : 0.8, 0.2); let skyY = 40;
          if (kind === "rain") { const cx = list.slice(0, 8).reduce((a, h) => a + h.tx, 0) / Math.max(1, Math.min(8, list.length)); M.skyCircle(S, cx, 70 * u, 150 * u, col, 1.1); skyY = 70 * u + 80; }
          list.slice(0, 8).forEach((h, i) => S.delay(kind === "rain" ? 0.2 + (i + 1) * 0.09 : 0, () => { const x = h.tx, y = h.ty; M.bolt(S, x + rnd(-20, 20) * u, skyY, x, y - 10 * u, col, 0.3); M.ring(S, x, y, 60 * u, col, 0.4); M.glow(S, x, y - 20 * u, 70 * u, W5, 0.25, 0.2); M.sparks(S, x, y - 10 * u, col, 5, 50); }));
          S.shake = Math.max(S.shake, big ? 0.3 : 0.15); }
      } else if (elem === "cold") {
        if (kind === "nova") { M.ring(S, S.plX, S.plY, 380 * u, col, 0.55); M.ring(S, S.plX, S.plY, 260 * u, W5, 0.45); for (const h of list) M.sparks(S, h.tx, uy(h), col, 3, 30); }
        else if (kind === "zone2" || kind === "rain") list.slice(0, 8).forEach((h, i) => S.delay((i + 1) * 0.07, () => { M.erupt(S, h.tx, h.ty, col, "ice", big ? 140 : 100); M.fall(S, h.tx, uy(h), col, "shard", () => { M.ring(S, h.tx, h.ty, 40 * u, col, 0.3); M.sparks(S, h.tx, uy(h), W5, 3, 30); }); }));
        else if (big) M.fall(S, tx, ty, col, "shard", () => { M.burst(S, tx, ty, 90 * u, col); M.ring(S, tx, tg ? tg.ty : ty, 140 * u, W5, 0.5); S.shake = Math.max(S.shake, 0.3); S.hitstop = 0.07; });
        else { const n = kind === "spray" ? Math.min(7, list.length) : 1; for (let i = 1; i <= Math.max(1, n); i++) { const h = list[i - 1] || tg; if (h) S.delay(i * 0.035, () => M.proj(S, hx, hy2, h.tx, uy(h), col, 0.2, "shard", () => { M.sparks(S, h.tx, uy(h), col, 4, 34); M.glow(S, h.tx, uy(h), 36 * u, col, 0.25); })); } }
      } else if (kind === "meteor" || (kind === "rain" && elem !== "light")) {
        const cx = list.slice(0, 8).reduce((a, h) => a + h.tx, 0) / Math.max(1, Math.min(8, list.length)); M.skyCircle(S, cx || tx, 60 * u, 170 * u, col, 1.2);
        list.slice(0, 8).forEach((h, i) => S.delay(0.22 + (i + 1) * 0.1, () => M.proj(S, cx + rnd(-60, 60) * u, 60 * u + 80, h.tx, uy(h), col, 0.26, "big", () => { M.burst(S, h.tx, uy(h), 70 * u, col); M.ring(S, h.tx, h.ty, 100 * u, col, 0.45); S.shake = Math.max(S.shake, 0.22); if (elem === "fire") M.erupt(S, h.tx, h.ty, col, "lava", 90); })));
      } else if (kind === "hole") { M.circle(S, tx, tg ? tg.ty : ty, 110 * u, col, 0.9); for (let k = 0; k <= 3; k++) S.delay(k * 0.15, () => { const o = img(S, "fx_ring", { x: tx, y: ty, w: 240 * u, h: 120 * u, col, tr: 0.2 }); tw(S, o, 0.4, { w: 10 * u, h: 10 * u, tr: 1 }); }); }
      else if (kind === "zone" || kind === "zone2") { if (tg) M.sigil(S, tx, tg.ty, 130 * u, col, 0.8); list.slice(0, 9).forEach((h, i) => S.delay((i + 1) * 0.05, () => { if (elem === "fire") { M.erupt(S, h.tx, h.ty, col, "lava", big ? 150 : 110); M.sparks(S, h.tx, uy(h), col, 3, 30); } else { M.erupt(S, h.tx, h.ty, col, "bubble", 110); boom(h.tx, uy(h), 30 * u); } })); }
      else if (kind === "pierce") { M.beam(S, hx, hy2, S.W, 46 * u, col); for (const h of list) boom(h.tx, uy(h), 30 * u); }
      else if (kind === "multi" || kind === "nova") M.proj(S, hx, hy2, tx, ty, col, 0.24, "big", () => { M.burst(S, tx, ty, (big ? 110 : 80) * u, col); M.ring(S, tx, tg ? tg.ty : ty, 120 * u, col, 0.4); for (const h of list) M.sparks(S, h.tx, uy(h), col, 2, 30); });
      else if (kind === "spray") list.slice(0, 8).forEach((h, i) => S.delay((i + 1) * 0.04, () => M.proj(S, hx, hy2, h.tx, uy(h), col, 0.18, "orb", () => boom(h.tx, uy(h), 22 * u))));
      else if (kind === "orbit" || kind === "summon") list.slice(0, 6).forEach((h, i) => S.delay((i + 1) * 0.05, () => M.proj(S, S.plX, S.plY - 40 * u, h.tx, uy(h), col, 0.2, "orb", () => boom(h.tx, uy(h), 26 * u))));
      else M.proj(S, hx, hy2, tx, ty, col, big ? 0.3 : 0.18, big ? "big" : "orb", () => { boom(tx, ty, (big ? 100 : 42) * u); if (big) { M.ring(S, tx, tg ? tg.ty : ty, 150 * u, col, 0.5); M.screen(S, col, 0.75, 0.3); S.shake = Math.max(S.shake, 0.3); S.hitstop = 0.08; } });
      return;
    }
    // ── 물리: 몸으로 친다 ──
    const heavy = HEAVY[d.id] || (d.mult || 0) >= 6;
    if (BLINK[d.id] && M.blink(S, list, col, d.id === "bloodmoon" ? () => { const mn = img(S, "fx_moon", { x: S.W * 0.62, y: S.H * 0.22, w: 60 * u, h: 60 * u, tr: 0.2, z: 11 }); if (mn) { tw(S, mn, 0.35, { w: 200 * u, h: 200 * u }, "Back", false); S.delay(0.9, () => tw(S, mn, 0.3, { tr: 1 })); } M.glow(S, S.W * 0.62, S.H * 0.22, 260 * u, col, 0.6, 0.4); M.screen(S, col, 0.8, 0.35); for (const h of list) M.claw(S, h.tx, uy(h), 70 * u, col); } : null)) return;
    if (kind === "spray" || kind === "bounce" || kind === "boomer" || d.proj) { S.heroPose("throw"); const [hx, hy2] = heroTip(S); list.slice(0, 10).forEach((h, i) => S.delay((i + 1) * 0.035, () => M.proj(S, hx, hy2, h.tx, uy(h), col, 0.16, "orb", () => { M.sparks(S, h.tx, uy(h), col, 3, 26); M.claw(S, h.tx, uy(h), 50 * u, col); }))); return; }
    if (kind === "pierce") { S.heroPose("lunge", tx); S.delay(0.08, () => { M.beam(S, S.plX + 40 * u, ty, S.W, (big ? 60 : 40) * u, col); for (const h of list) { M.slash(S, h.tx, uy(h), 90 * u, col, 0); M.sparks(S, h.tx, uy(h), col, 3, 40); } S.shake = Math.max(S.shake, 0.12); S.hitstop = 0.05; }); return; }
    if (kind === "zone2" || kind === "rain") { S.heroPose("slam", tx); const rock = d.id === "quake";
      if (!rock && kind === "rain") M.skyCircle(S, list.slice(0, 8).reduce((a, h) => a + h.tx, 0) / Math.max(1, Math.min(8, list.length)), 70 * u, 150 * u, col, 1);
      list.slice(0, 9).forEach((h, i) => S.delay(0.12 + (i + 1) * 0.05, () => { if (rock) { M.erupt(S, h.tx, h.ty, col, "rock", 130); S.shake = Math.max(S.shake, 0.2); } else { M.erupt(S, h.tx, h.ty, col, "bubble", 100); if (kind === "rain") M.fall(S, h.tx, uy(h), col, "shard"); } })); return; }
    if (kind === "aura" || kind === "summon" || kind === "shuri" || kind === "trap") { list.slice(0, 6).forEach((h, i) => S.delay((i + 1) * 0.05, () => { M.slash(S, h.tx, uy(h), 80 * u, col, rnd(-60, 60)); M.sparks(S, h.tx, uy(h), col, 2, 26); })); if (kind === "trap") { M.burst(S, tx, ty, 90 * u, col); S.shake = Math.max(S.shake, 0.2); } return; }
    if (heavy) { S.heroPose("slam", tx); S.delay(0.16, () => { M.slash(S, tx, ty, (big ? 200 : 160) * u, col, 70); M.ring(S, tx, tg ? tg.ty : ty, 170 * u, col, 0.45); M.ring(S, tx, tg ? tg.ty : ty, 110 * u, W5, 0.35); M.glow(S, tx, ty, 100 * u, W5, 0.2, 0.1); M.sparks(S, tx, ty, col, 10, 70); S.shake = Math.max(S.shake, 0.35); S.hitstop = 0.09; if (big) M.screen(S, W5, 0.8, 0.15); }); return; }
    S.heroPose("lunge", tx);
    S.delay(0.08, () => { const wide = kind === "cone" || kind === "multi";
      if (wide) { M.slash(S, tx - 10 * u, ty, 220 * u, col, -10); for (const h of list) { M.claw(S, h.tx, uy(h), 70 * u, col); M.sparks(S, h.tx, uy(h), col, 2, 30); } S.shake = Math.max(S.shake, 0.14); }
      else { M.slash(S, tx, ty, 130 * u, col, rnd(-25, 25)); M.sparks(S, tx, ty, col, 5, 44); S.shake = Math.max(S.shake, 0.08); }
      S.hitstop = wide ? 0.05 : 0.035; });
  }
  // 영웅 동작 (Stage.artPose 와 같은 수치): 돌아오는 값 = { dx, dy, rot, pk(동작 그림) }
  function heroPose(b, u) {
    const a = b.pose; if (!a) return { dx: 0, dy: 0, rot: 0, pk: null }; let dx = 0, dy = 0, rot = 0; const t = a.t, R = a.reach || 60 * u;
    if (a.name === "attack" || a.name === "throw") { if (t < 0.08) { const k = t / 0.08; dx = -8 * u * k; rot = -4 * k; } else if (t < 0.15) { const k = (t - 0.08) / 0.07; dx = -8 * u + 34 * u * k; rot = -4 + 12 * k; } else if (t < 0.4) { const k = (t - 0.15) / 0.25; dx = 26 * u * (1 - k) ** 2; rot = 8 * (1 - k); } else b.pose = null; }
    else if (a.name === "lunge") { if (t < 0.07) { const k = t / 0.07; dx = -14 * u * k; dy = 3 * u * k; rot = -8 * k; } else if (t < 0.13) { const k = (t - 0.07) / 0.06; dx = -14 * u + (R + 14 * u) * k; dy = 3 * u * (1 - k); rot = -8 + 22 * k; } else if (t < 0.22) { dx = R; rot = 14 - 6 * (t - 0.13) / 0.09; } else if (t < 0.5) { const k = (t - 0.22) / 0.28; dx = R * (1 - k) ** 2; rot = 8 * (1 - k); } else b.pose = null; }
    else if (a.name === "slam") { if (t < 0.08) { const k = t / 0.08; dy = 6 * u * k; rot = -6 * k; } else if (t < 0.17) { const k = (t - 0.08) / 0.09; dx = R * k; dy = 6 * u - 70 * u * Math.sin(k * Math.PI * 0.5); rot = -6 - 14 * k; } else if (t < 0.22) { const k = (t - 0.17) / 0.05; dx = R; dy = -64 * u + 70 * u * k; rot = -20 + 45 * k; } else if (t < 0.32) { dx = R; dy = 6 * u * (1 - (t - 0.22) / 0.1); rot = 25 - 10 * (t - 0.22) / 0.1; } else if (t < 0.62) { const k = (t - 0.32) / 0.3; dx = R * (1 - k) ** 2; rot = 15 * (1 - k); } else b.pose = null; }
    else if (a.name === "cast") { const hold = a.big ? 0.22 : 0.12; if (t < hold) { const k = t / hold; dx = -6 * u * k; dy = -(a.big ? 10 : 5) * u * k; rot = -7 * k; } else if (t < hold + 0.08) { const k = (t - hold) / 0.08; dx = -6 * u + 18 * u * k; dy = -(a.big ? 10 : 5) * u * (1 - k); rot = -7 + 13 * k; } else if (t < hold + 0.4) { const k = (t - hold - 0.08) / 0.32; dx = 12 * u * (1 - k) ** 2; rot = 6 * (1 - k); } else b.pose = null; }
    let pk = null; if (a) { if (a.name === "attack" || a.name === "throw") pk = t < 0.08 ? "windup" : t < 0.3 ? "slash" : null; else if (a.name === "lunge") pk = t < 0.07 ? "windup" : t < 0.32 ? "slash" : null; else if (a.name === "slam") pk = t < 0.17 ? "overhead" : t < 0.42 ? "slash" : null; else if (a.name === "cast") { const hold = a.big ? 0.22 : 0.12; pk = t < hold ? "raise" : t < hold + 0.3 ? "cast" : null; } }
    return { dx, dy, rot: rot * (pk ? 0.4 : 1) * Math.PI / 180, pk };
  }
  return { stage, cast, update, draw, heroPose, M };
})();
