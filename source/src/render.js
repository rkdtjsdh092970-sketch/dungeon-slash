// =========================================================
// 렌더링: 전투 / 월드맵 / 마을 / 타이틀 (960x540 캔버스, 도트 스프라이트는 정수 배율)
// =========================================================
const CW = 960, CH = 540;
const ROLE_IDX = { imp: 0, grunt: 1, archer: 2, mage: 3, brute: 4, spec: 5 };
function spriteOf(b, e) {
  if (e.type === "warp") return ["eye", 270];
  const va = e.va != null ? e.va : Math.min(10, b.act) - 1, r = ROSTER[va][ROLE_IDX[e.type]]; return [r[0], r[1] || 0];
}
function bossArt(D) { return D.art != null ? D.art : BOSSES.indexOf(D); }

function unitPos(b, e, dt) {
  let tx, ty; const lh = laneH(b), c = cellXY(b, e.lane, e.col, e.w, e.h);
  if (e.tier === "normal") {
    const us = occupants(b, e.lane, e.col).filter((u) => u.tier === "normal"); const i = us.indexOf(e), n = us.length;
    const row = Math.floor(i / 3), rows = Math.ceil(n / 3), colI = i % 3, inRow = row === rows - 1 ? n - row * 3 : 3, dx = Math.min(40, LAY.cw / 3.2);
    tx = c.x + (colI - (inRow - 1) / 2) * dx; ty = c.y + lh * 0.3 + (row - (rows - 1) / 2) * 16;
  } else if (e.tier === "elite") { tx = c.x; ty = c.y + lh * 0.32; }
  else { tx = c.x; ty = c.y + (e.h * lh) / 2 - 14; }
  if (e.vx == null) { e.vx = tx + (e.tier === "normal" ? 40 : 0); e.vy = ty - 30; }
  const k = Math.min(1, dt * 11); e.vx += (tx - e.vx) * k; e.vy += (ty - e.vy) * k;
}
function drawEnemy(ctx, b, e, time) {
  const D = e.def, x = Math.round(e.vx), y = Math.round(e.vy), appear = Math.min(1, e.age / 0.25);
  if (e.tier === "boss") {
    const bob = Math.sin(time * 2.2 + e.id) * 3, p = e.winding > 0 ? 1 - e.winding / e.windup : 0;
    const opt = { alpha: appear, sy: 1 + Math.sin(time * 2.2 + e.id) * 0.012 + p * 0.05, sx: 1 - p * 0.02 };
    let tint = null; if (e.flash > 0) tint = "rgba(255,255,255,.65)"; else if (e.charge) tint = `rgba(255,${60 + Math.sin(time * 18) * 40},40,${0.35 + 0.2 * Math.sin(time * 18)})`; else if (e.chill > 0) tint = "rgba(120,200,255,.35)";
    const off = e.charge ? Math.sin(time * 40) * 3 : 0;
    ctx.save(); ctx.fillStyle = "rgba(0,0,0,.28)"; ctx.beginPath(); ctx.ellipse(x, y - 2, D.w * 50, 14, 0, 0, 7); ctx.fill(); ctx.restore();
    drawBossSprite(ctx, bossArt(D), x + off - p * 10, y + bob * 0.3, D.sc, Object.assign(opt, { tint, hue: D.hue }));
    if (e.shield) { ctx.save(); ctx.strokeStyle = `rgba(140,220,255,${0.5 + 0.3 * Math.sin(time * 6)})`; ctx.lineWidth = 6; ctx.beginPath(); ctx.ellipse(x, y - D.sc * 30, D.sc * 34, D.sc * 34, 0, 0, 7); ctx.stroke(); ctx.fillStyle = "rgba(120,200,255,.12)"; ctx.fill(); ctx.restore(); }
    if (e.reflect) { ctx.save(); ctx.strokeStyle = `rgba(255,120,220,${0.5 + 0.3 * Math.sin(time * 8)})`; ctx.setLineDash([10, 8]); ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(x, y - D.sc * 30, D.sc * 34, D.sc * 34, 0, 0, 7); ctx.stroke(); ctx.restore(); }
    if (e.stun > 0) { for (let i = 0; i < 3; i++) { const a = time * 5 + i * 2.1; ctx.fillStyle = "#ffe45a"; ctx.fillRect(x + Math.cos(a) * 30 - 4, y - D.sc * 62 + Math.sin(a) * 8, 8, 8); } }
    if (e.charge) { const f = 1 - e.charge.t / (e.charge.t + 0.001); ctx.fillStyle = "#ff5a3a"; drawPx(ctx, "!", x - 6, y - D.sc * 66, "#ff5a3a", 4); }
    return;
  }
  const [skey, shue] = spriteOf(b, e), meta = SPR_META[skey], sheet = getSheet(skey, shue), sc = e.tier === "elite" && meta.cell === 48 ? 2.5 : D.sc, kind = skey, top = y - meta.h * sc - 6;
  if (e.type === "warp") { const g = ctx.createRadialGradient(x, y - 40, 4, x, y - 40, 60 + Math.sin(time * 6) * 8); g.addColorStop(0, "rgba(210,140,255,.55)"); g.addColorStop(1, "rgba(210,140,255,0)"); ctx.fillStyle = g; ctx.fillRect(x - 70, y - 110, 140, 140); for (let i = 0; i < 5; i++) { const a = time * 3 + i * 1.26; ctx.fillStyle = "#f0d8ff"; ctx.fillRect(x + Math.cos(a) * 36 - 2, y - 44 + Math.sin(a) * 26 - 2, 4, 4); } }
  let anim = "idle", t = e.age + e.id * 0.37;
  if (e.hurtT > 0) { anim = "hurt"; t = 0; } else if (e.winding > 0) { anim = "attack"; t = (1 - e.winding / e.windup) * 0.49; } else if (e.col > e.range) { anim = "walk"; t = e.age; }
  const af = animFrame(kind, anim, t);
  ctx.save(); ctx.globalAlpha = 0.3; ctx.fillStyle = "#000"; ctx.beginPath(); ctx.ellipse(x, y, 13 * sc / 2 + 6, 4, 0, 0, 7); ctx.fill(); ctx.restore();
  let tint = null; if (e.flash > 0) tint = "rgba(255,255,255,.6)"; else if (e.chill > 0) tint = "rgba(120,200,255,.35)";
  drawSprite(ctx, sheet, af.row, af.frame, x, y + (appear < 1 ? (1 - appear) * 12 : 0), sc, true, appear, tint);
  if (e.tier === "elite") { ctx.fillStyle = "#000"; ctx.fillRect(x - 24, top, 48, 5); ctx.fillStyle = "#e8564a"; ctx.fillRect(x - 24, top, 48 * Math.max(0, e.hp / e.maxHp), 5); ctx.strokeStyle = "#ffb04a"; ctx.lineWidth = 2; ctx.strokeRect(x - 25, top - 1, 50, 7); }
  else if (e.hp < e.maxHp) { ctx.fillStyle = "#000"; ctx.fillRect(x - 14, top, 28, 4); ctx.fillStyle = "#e8564a"; ctx.fillRect(x - 14, top, 28 * Math.max(0, e.hp / e.maxHp), 4); }
  if (e.winding > 0) drawPx(ctx, "!", x - 4, top - 8, "#ff5a5a", 3);
}

function drawFx(ctx, b, f, time) {
  const prog = clamp((f.life - f.t - (f.delay || 0)) / f.life, 0, 1), el = f.life - f.t - (f.delay || 0); if (el < 0) return;
  const a = 1 - prog, col = f.color || "#fff", PX = PLAYER_POS.x + 36, PY = PLAYER_POS.y - 68;
  ctx.save();
  switch (f.kind) {
    case "slash": { ctx.fillStyle = hexA(col, a); for (let i = 0; i < 4; i++) { const k = prog * 6 + i; ctx.fillRect(f.x - 22 + k * 8, f.y - 22 + k * 6, 10, 6); } break; }
    case "shot": { const e = f.e; if (e.vx == null) break; ctx.fillStyle = hexA(col, a); pxLine(ctx, PX, PY, PX + (e.vx - PX) * Math.min(1, prog * 2.4), PY + ((e.vy - 34) - PY) * Math.min(1, prog * 2.4), 6); ctx.fillStyle = hexA("#ffffff", a); pxLine(ctx, PX, PY, PX + (e.vx - PX) * Math.min(1, prog * 2.4), PY + ((e.vy - 34) - PY) * Math.min(1, prog * 2.4), 2); break; }
    case "boom": { const r = f.r * (0.25 + prog * 0.85); ctx.fillStyle = hexA(col, a * 0.35); ctx.fillRect(f.x - r, f.y - r * 0.55, r * 2, r * 1.1); ctx.fillStyle = hexA("#fff", a * 0.8); const w = r * 0.6; ctx.fillRect(f.x - w, f.y - w * 0.35, w * 2, w * 0.7);
      const sd = seeded(Math.floor(f.x * 7 + f.y)); for (let i = 0; i < 16; i++) { const an = sd() * 6.28, d = r * (0.5 + sd() * 0.7) * (0.4 + prog); ctx.fillStyle = hexA(col, a); ctx.fillRect(f.x + Math.cos(an) * d - 3, f.y + Math.sin(an) * d * 0.55 - 3, 6, 6); } break; }
    case "beam": { const lane = f.lane, yy = laneTop(b) + (lane + 0.62) * laneH(b) - 26, x1 = LAY.x0 + (f.col) * LAY.cw; ctx.fillStyle = hexA(col, a * 0.4); ctx.fillRect(PX, yy - 14, x1 - PX, 28); ctx.fillStyle = hexA(col, a * 0.9); ctx.fillRect(PX, yy - 6, x1 - PX, 12); ctx.fillStyle = hexA("#fff", a); ctx.fillRect(PX, yy - 2, x1 - PX, 4); break; }
    case "bolt": { const sd = seeded(Math.floor(f.pts[0][0] * 13 + f.pts[0][3] * 7 + (f.delay || 0) * 100)); const flick = Math.floor(time * 30) % 3;
      for (const [x0, y0, x1, y1] of f.pts) { const seg = 8, pts = [[x0, y0]]; for (let i = 1; i < seg; i++) { const t = i / seg, jx = (sd() - 0.5) * 36 + (flick - 1) * 3, jy = (sd() - 0.5) * 36; pts.push([x0 + (x1 - x0) * t + jx, y0 + (y1 - y0) * t + jy]); } pts.push([x1, y1]);
        for (const [w, c, al] of [[12, hexA(col, a * 0.25), 1], [7, hexA(col, a * 0.7), 1], [3, hexA("#ffffff", a), 1]]) { ctx.fillStyle = c; for (let i = 0; i < pts.length - 1; i++) pxLine(ctx, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], w); } ctx.fillStyle = hexA("#fff", a); ctx.fillRect(x1 - 9, y1 - 9, 18, 18); } break; }
    case "nova": { const r = 40 + prog * 620; ctx.strokeStyle = hexA(col, a); ctx.lineWidth = 12; ctx.beginPath(); ctx.ellipse(PLAYER_POS.x, PLAYER_POS.y - 30, r, r * 0.42, 0, 0, 7); ctx.stroke(); ctx.strokeStyle = hexA("#fff", a * 0.8); ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(PLAYER_POS.x, PLAYER_POS.y - 30, r - 8, (r - 8) * 0.42, 0, 0, 7); ctx.stroke(); break; }
    case "axe": { const yy = laneTop(b) + (f.lane + 0.62) * laneH(b) - 30, x1 = LAY.x0 + f.col * LAY.cw, k = prog < 0.5 ? prog * 2 : 2 - prog * 2, x = PX + (x1 - PX) * k; ctx.translate(x, yy); ctx.rotate(time * 22); ctx.imageSmoothingEnabled = false; const ic = iconCanvas("axe", 3); ctx.drawImage(ic, -24, -24); break; }
    case "meteor": { const x = f.x + (1 - prog) * 260, y = f.y - (1 - prog) * 520; ctx.fillStyle = hexA("#ff7a30", 0.5); pxLine(ctx, x, y, x + 90, y - 180, 14); ctx.fillStyle = "#ffb060"; ctx.beginPath(); ctx.arc(x, y, 18, 0, 7); ctx.fill(); ctx.fillStyle = "#fff0c0"; ctx.beginPath(); ctx.arc(x - 3, y - 3, 8, 0, 7); ctx.fill(); break; }
    case "proj": { const x = f.x0 + (f.x1 - f.x0) * prog, y = f.y0 + (f.y1 - f.y0) * prog; if (f.sprite === "arrow") { ctx.fillStyle = "#e8e0c8"; pxLine(ctx, x, y, x - 22, y - (f.y1 - f.y0) / (f.x1 - f.x0 || 1) * -22, 4); ctx.fillStyle = "#fff"; ctx.fillRect(x - 4, y - 4, 8, 8); }
      else if (f.sprite === "orb") { ctx.fillStyle = "rgba(160,120,255,.45)"; ctx.beginPath(); ctx.arc(x, y, 16, 0, 7); ctx.fill(); ctx.fillStyle = "#c8a0ff"; ctx.beginPath(); ctx.arc(x, y, 9, 0, 7); ctx.fill(); ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(x - 2, y - 2, 4, 0, 7); ctx.fill(); }
      else { ctx.fillStyle = hexA("#ffd0a0", a); ctx.fillRect(f.x1 - 20 + prog * 30, f.y1 - 12, 10, 6); ctx.fillRect(f.x1 - 14 + prog * 30, f.y1 - 4, 10, 6); } break; }
    case "ring": { const r = f.r * (0.3 + prog * 0.9); ctx.strokeStyle = hexA(col, a); ctx.lineWidth = 6; ctx.beginPath(); ctx.ellipse(f.x, f.y, r, r * 0.5, 0, 0, 7); ctx.stroke(); break; }
    case "claw": case "proj2": case "skybolt": drawFx2(ctx, b, f, prog, a, col, time); break;
    case "aura": { ctx.fillStyle = hexA(col, 0.35 * a); ctx.beginPath(); ctx.ellipse(PLAYER_POS.x, PLAYER_POS.y - 44, 70 - prog * 10, 90 - prog * 20, 0, 0, 7); ctx.fill(); for (let i = 0; i < 8; i++) { const an = i * 0.8 + prog * 4; ctx.fillStyle = hexA(col, a); ctx.fillRect(PLAYER_POS.x + Math.cos(an) * 50 - 3, PLAYER_POS.y - 44 - prog * 60 + Math.sin(an) * 20, 6, 6); } break; }
  }
  ctx.restore();
}

function drawRoads(ctx, b, time) {
  const lh = laneH(b), lt = laneTop(b), A = ACTS[(b.kind === "hell" ? 6 : RIFTLIKE[b.kind] ? 7 : Math.min(10, b.act) - 1)];
  const base = b.kind === "hell" ? "#2a1010" : mixc(A.ground, "#000000", 0.3), edge = b.kind === "hell" ? "#5a2418" : mixc(A.ground, "#ffffff", 0.1), dark = mixc(A.ground, "#000000", 0.5);
  for (let l = 0; l < b.lanes; l++) {
    const yc = lt + (l + 0.78) * lh - 8, hh = 22, x0 = LAY.x0 - 60, r = seeded(l * 97 + (b.act | 0) * 13 + 5);
    const top = (x) => yc - hh + Math.sin(x * 0.021 + l) * 3 + Math.sin(x * 0.007 + l * 2) * 2, bot = (x) => yc + hh + Math.sin(x * 0.017 + l * 3) * 3;
    const g = ctx.createLinearGradient(x0, 0, x0 + 120, 0); g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,0,0,1)");
    ctx.save(); ctx.beginPath(); ctx.moveTo(x0, top(x0)); for (let x = x0; x <= CW + 10; x += 12) ctx.lineTo(x, top(x)); for (let x = CW + 10; x >= x0; x -= 12) ctx.lineTo(x, bot(x)); ctx.closePath(); ctx.clip();
    ctx.fillStyle = base; ctx.fillRect(x0, yc - hh - 6, CW - x0, hh * 2 + 12);
    ctx.fillStyle = edge; ctx.globalAlpha = 0.5; ctx.fillRect(x0, yc - hh - 6, CW - x0, 6); ctx.globalAlpha = 1;
    ctx.fillStyle = dark; ctx.globalAlpha = 0.55; for (let x = x0; x < CW; x += 6) { ctx.fillRect(x, bot(x) - 7, 6, 8); } ctx.globalAlpha = 1;
    ctx.fillStyle = dark; ctx.globalAlpha = 0.35; ctx.fillRect(x0, yc - 6, CW - x0, 2); ctx.fillRect(x0, yc + 8, CW - x0, 2); ctx.globalAlpha = 1;
    for (let i = 0; i < 70; i++) { const x = x0 + r() * (CW - x0), y = yc - hh + 4 + r() * (hh * 2 - 8), w = 2 + r() * 5; ctx.fillStyle = r() > 0.5 ? edge : dark; ctx.globalAlpha = 0.5; ctx.fillRect(Math.round(x), Math.round(y), w, 2); ctx.globalAlpha = 1; }
    if (RIFTLIKE[b.kind]) { ctx.fillStyle = "rgba(190,120,255,.35)"; for (let x = x0 + 20; x < CW; x += 60) ctx.fillRect(x, yc - 1, 18, 2); }
    if (b.kind === "hell") { ctx.fillStyle = "rgba(255,120,40,.5)"; for (let x = x0 + 10; x < CW; x += 44) ctx.fillRect(x + ((Math.sin(time * 3 + x) * 4) | 0), yc - 2, 10, 3); }
    ctx.restore();
    // 칸 위치를 암시하는 희미한 발판 (격자 대신)
    ctx.fillStyle = "rgba(255,255,255,.06)"; for (let c = 1; c <= CFG.COLS; c++) { ctx.beginPath(); ctx.ellipse(LAY.x0 + (c - 0.5) * LAY.cw, yc + 4, 44, 9, 0, 0, 7); ctx.fill(); }
  }
}
function drawBattle(ctx, b, dt, time) {
  ctx.save(); ctx.imageSmoothingEnabled = false;
  const sk = b.shake > 0 ? [rnd(-1, 1) * b.shake * 12, rnd(-1, 1) * b.shake * 8] : [0, 0]; ctx.translate(sk[0], sk[1]);
  ctx.drawImage(makeBackground(b.kind === "hell" ? 12 : RIFTLIKE[b.kind] ? 11 : Math.min(10, b.act)), 0, 0);
  const lh = laneH(b), lt = laneTop(b);
  drawRoads(ctx, b, time);
  // 장판 (화염 벽)
  for (const z of b.zones) drawZone(ctx, b, z, time);
  drawPersist(ctx, b, time);
  // 플레이어
  const P = PLAYER_POS; let pa = "idle", pt = time; if (b.over && !b.win) { pa = "death"; pt = Math.min(0.5, b.time - (b.deadAt || (b.deadAt = b.time))); } else if (b.pHurt > 0) { pa = "hurt"; pt = 0; } else if (b.pAtk > 0) { pa = "attack"; pt = 0.42 - b.pAtk; }
  const paf = animFrame("warrior", pa, pt); ctx.save(); ctx.globalAlpha = 0.35; ctx.fillStyle = "#000"; ctx.beginPath(); ctx.ellipse(P.x, P.y + 2, 38, 8, 0, 0, 7); ctx.fill(); ctx.restore();
  if (b.buffs.cry) { ctx.fillStyle = `rgba(255,210,70,${0.18 + 0.1 * Math.sin(time * 8)})`; ctx.beginPath(); ctx.ellipse(P.x, P.y - 40, 58, 70, 0, 0, 7); ctx.fill(); }
  drawSprite(ctx, getSheet("warrior", 0), paf.row, paf.frame, P.x, P.y, 3, false, 1, b.debuffs.freeze ? "rgba(140,210,255,.5)" : b.debuffs.poison ? "rgba(120,255,120,.3)" : null);
  // 적
  for (const e of b.enemies) unitPos(b, e, dt);
  const list = b.enemies.slice().sort((a, c) => a.vy - c.vy || a.vx - c.vx);
  for (const e of list) { drawEnemy(ctx, b, e, time); if (b.designated === e) { ctx.strokeStyle = "#ffd24a"; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(e.vx, e.vy, 30 + e.def.sc * 6, 10 + e.def.sc * 2, 0, 0, 7); ctx.stroke(); drawPx(ctx, "!", e.vx - 3, e.vy - (e.tier === "boss" ? 200 : 100), "#ffd24a", 3); } }
  // 시체(사망 연출)
  for (const c of b.corpses) {
    if (c.boss) { const a = clamp(1 - (c.t - 0.2) / 1.2, 0, 1); drawBossSprite(ctx, bossArt(c.def), c.x, c.y, c.def.sc, { alpha: a, sy: 1 - c.t * 0.35, sx: 1 + c.t * 0.1, tint: c.t < 0.3 ? "rgba(255,255,255,.7)" : null, hue: c.def.hue }); continue; }
    const [ck, ch] = spriteOf(b, c), cm = SPR_META[ck], sheet = getSheet(ck, ch), af = animFrame(ck, "death", c.t), a = clamp(1.3 - c.t, 0, 1);
    drawSprite(ctx, sheet, af.row, af.frame, c.x, c.y, c.tier === "elite" && cm.cell === 48 ? 2.5 : c.def.sc, true, a);
  }
  for (const f of b.fx) drawFx(ctx, b, f, time);
  for (const t of b.texts) { const a = clamp(t.t / (t.life * 0.5), 0, 1); ctx.globalAlpha = a; if (t.word) { ctx.font = "bold 22px sans-serif"; ctx.textAlign = "center"; ctx.fillStyle = "#000"; ctx.fillText(t.text, t.x + 2, t.y + 2); ctx.fillStyle = t.color; ctx.fillText(t.text, t.x, t.y); } else drawPx(ctx, t.text, t.x - pxWidth(t.text, t.big ? 4 : 3) / 2, t.y, t.color, t.big ? 4 : 3); ctx.globalAlpha = 1; }
  ctx.restore();
  if (b.flash > 0) { ctx.fillStyle = `rgba(255,30,30,${0.22 * b.flash / 0.18})`; ctx.fillRect(0, 0, CW, CH); }
  if (b.debuffs.freeze) { ctx.fillStyle = "rgba(120,200,255,.14)"; ctx.fillRect(0, 0, CW, CH); }
  if (b.debuffs.curse) { ctx.fillStyle = "rgba(160,40,200,.10)"; ctx.fillRect(0, 0, CW, CH); }
  if (b.debuffs.poison) { ctx.fillStyle = "rgba(60,200,60,.08)"; ctx.fillRect(0, 0, CW, CH); }
}

// =========================================================
// 월드맵
// =========================================================
let HELL_SET = null;
const MapView = {
  pulse: null, cv: null, g: null, cam: { x: 0, y: 0 }, world: null, sel: null, hover: null, drag: null, moved: false, t: 0,
  build() {
    if (this.world) return;
    const sc = 3, W = Math.ceil(MAP_W / sc), H = Math.ceil(MAP_H / sc), c = document.createElement("canvas"); c.width = W; c.height = H; const g = c.getContext("2d"), r = seeded(777);
    const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, "#241a3a"); gr.addColorStop(1, "#33264a"); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "255,255,255" : "0,0,0"},${0.03 + r() * 0.05})`; g.fillRect(r() * W, r() * H, 2 + r() * 5, 1 + r() * 2); }
    REGION.forEach(([cx, cy], i) => { const A = ACTS[i], X = cx / sc, Y = cy / sc; const rg = g.createRadialGradient(X, Y, 8, X, Y, 78); rg.addColorStop(0, hexA(A.color, 0.34)); rg.addColorStop(1, hexA(A.color, 0)); g.fillStyle = rg; g.fillRect(X - 80, Y - 80, 160, 160);
      for (let k = 0; k < 26; k++) { const an = r() * 6.28, d = 20 + r() * 58, x = X + Math.cos(an) * d * 1.3, y = Y + Math.sin(an) * d; deco(g, i + 1, x, y, r); } });
    deco(g, 11, RIFT_POS[0] / sc, RIFT_POS[1] / sc, r);
    const w = document.createElement("canvas"); w.width = MAP_W; w.height = MAP_H; const wg = w.getContext("2d"); wg.imageSmoothingEnabled = false; wg.drawImage(c, 0, 0, W, H, 0, 0, W * sc, H * sc); this.world = w;
  },
  nodeIcon(g, n, st, time, hot) {
    const x = n.x - this.cam.x, y = n.y - this.cam.y, pulse = 1 + 0.12 * Math.sin(time * 3 + n.x);
    const orb = (col, hi, rad) => { g.fillStyle = "rgba(0,0,0,.35)"; g.beginPath(); g.ellipse(x, y + rad * 0.7, rad, rad * 0.4, 0, 0, 7); g.fill(); g.fillStyle = col; g.beginPath(); g.arc(x, y, rad, 0, 7); g.fill(); g.fillStyle = hi; g.beginPath(); g.arc(x - rad * 0.3, y - rad * 0.3, rad * 0.4, 0, 7); g.fill(); };
    if (st === "locked") { orb("#4a4458", "#6a647a", 11); g.fillStyle = "#2a2430"; g.fillRect(x - 5, y - 1, 10, 8); g.strokeStyle = "#2a2430"; g.lineWidth = 2.5; g.beginPath(); g.arc(x, y - 3, 4, Math.PI, 0); g.stroke(); return; }
    if (n.kind === "town") { g.fillStyle = "rgba(0,0,0,.35)"; g.beginPath(); g.ellipse(x, y + 10, 16, 5, 0, 0, 7); g.fill(); g.fillStyle = "#e8d8a0"; g.fillRect(x - 11, y - 6, 22, 14); g.fillStyle = "#c0503a"; g.beginPath(); g.moveTo(x - 14, y - 6); g.lineTo(x, y - 18); g.lineTo(x + 14, y - 6); g.fill(); g.fillStyle = "#4a3020"; g.fillRect(x - 3, y, 6, 8); return; }
    if (n.kind === "boss") { orb("#a02a3a", "#e86a7a", 14 * pulse); g.fillStyle = "#f4f0e0"; g.fillRect(x - 6, y - 7, 12, 10); g.fillRect(x - 4, y + 2, 8, 4); g.fillStyle = "#2a1020"; g.fillRect(x - 4, y - 4, 3, 3); g.fillRect(x + 1, y - 4, 3, 3); return; }
    if (n.kind === "elite") { orb("#d8782a", "#ffc070", 12); g.fillStyle = "#fff3d0"; for (const [dx, dy] of [[-6, -8], [6, -8]]) g.fillRect(x + dx - 2, y + dy, 4, 8); g.fillRect(x - 5, y - 2, 10, 8); return; }
    if (n.kind === "treasure") { orb("#c8a02a", "#ffe880", 12); g.fillStyle = "#6a3a1a"; g.fillRect(x - 8, y - 4, 16, 10); g.fillStyle = "#e8b83a"; g.fillRect(x - 8, y - 6, 16, 4); g.fillStyle = "#fff"; g.fillRect(x - 2, y - 1, 4, 4); return; }
    if (st === "hell") { orb("#6a1010", "#ff6a30", 13 * pulse); g.fillStyle = "#ffb040"; for (let i = 0; i < 4; i++) g.fillRect(x - 6 + i * 4, y - 8 - ((Math.sin(time * 9 + i * 1.7) * 3) | 0), 3, 9); g.fillStyle = "#fff0b0"; g.fillRect(x - 1, y - 2, 3, 5); return; }
    if (n.kind === "endless") { for (let i = 0; i < 3; i++) { g.strokeStyle = `rgba(120,230,255,${0.9 - i * 0.25})`; g.lineWidth = 3; g.beginPath(); g.arc(x, y, 7 + i * 5, -time * 2 + i, -time * 2 + i + 4.2); g.stroke(); } g.fillStyle = "#06141c"; g.beginPath(); g.arc(x, y, 6, 0, 7); g.fill(); g.fillStyle = "#bff4ff"; g.font = "bold 12px sans-serif"; g.textAlign = "center"; g.fillText("∞", x, y + 4); return; }
    if (n.kind === "void") { orb("#3a1068", "#c070ff", 14 * pulse); g.fillStyle = "#e8d0ff"; g.fillRect(x - 6, y - 7, 12, 10); g.fillRect(x - 4, y + 2, 8, 4); g.fillStyle = "#1a0830"; g.fillRect(x - 4, y - 4, 3, 3); g.fillRect(x + 1, y - 4, 3, 3); g.fillStyle = "#ff6af0"; g.fillRect(x - 3, y - 3, 1, 1); g.fillRect(x + 2, y - 3, 1, 1); return; }
    if (n.kind === "trial") { orb("#8a6a10", "#ffd24a", 13 * pulse); g.strokeStyle = "#fff6c0"; g.lineWidth = 3; g.beginPath(); g.moveTo(x - 7, y + 7); g.lineTo(x + 7, y - 7); g.moveTo(x + 7, y + 7); g.lineTo(x - 7, y - 7); g.stroke(); return; }
    if (n.kind === "rift") { for (let i = 0; i < 4; i++) { g.strokeStyle = `rgba(200,140,255,${0.9 - i * 0.2})`; g.lineWidth = 3; g.beginPath(); g.arc(x, y, 8 + i * 5 + Math.sin(time * 2 + i) * 2, time + i, time + i + 4); g.stroke(); } g.fillStyle = "#1a0830"; g.beginPath(); g.arc(x, y, 8, 0, 7); g.fill(); return; }
    const cleared = st === "cleared"; orb(cleared ? "#3a6a98" : "#3a8aff", cleared ? "#8ac0e8" : "#b8dcff", 11 * (cleared ? 1 : pulse));
    if (cleared) { g.fillStyle = "#e8fff0"; g.fillRect(x - 5, y, 3, 3); g.fillRect(x - 2, y + 3, 3, 3); g.fillRect(x + 1, y, 3, 3); g.fillRect(x + 4, y - 4, 3, 3); }
  },
  draw(sv, time, dt) {
    this.build(); const g = this.g; g.imageSmoothingEnabled = false; this.t = time;
    HELL_SET = sv.endgame ? hellNodes(Date.now()) : null;
    g.drawImage(this.world, this.cam.x, this.cam.y, CW, CH, 0, 0, CW, CH);
    // 길
    g.lineWidth = 4; g.setLineDash([2, 10]); g.lineCap = "round";
    for (const [a, b2] of MAP.edges) { const A = MAP.byId[a], B = MAP.byId[b2]; if (!A || !B) continue; const open = nodeUnlocked(sv, B) && nodeUnlocked(sv, A) || (A.kind === "town" && nodeUnlocked(sv, A)); g.strokeStyle = open ? "rgba(255,255,255,.7)" : "rgba(255,255,255,.22)"; g.beginPath(); g.moveTo(A.x - this.cam.x, A.y - this.cam.y); g.lineTo(B.x - this.cam.x, B.y - this.cam.y); g.stroke(); }
    g.setLineDash([]);
    // 지역 이름
    g.textAlign = "center"; g.font = "bold 15px sans-serif";
    REGION.forEach(([cx, cy], i) => { const x = cx - this.cam.x, y = cy - this.cam.y + 112; if (x < -80 || x > CW + 80 || y < -20 || y > CH + 20) return; g.fillStyle = "#000"; g.fillText(`${i + 1} · ${ACTS[i].name}`, x + 1, y + 1); g.fillStyle = ACTS[i].color; g.fillText(`${i + 1} · ${ACTS[i].name}`, x, y); });
    { const x = RIFT_POS[0] - this.cam.x, y = RIFT_POS[1] - this.cam.y - 30; g.fillStyle = "#000"; g.fillText("심연의 균열", x + 1, y + 1); g.fillStyle = "#c8a0ff"; g.fillText("심연의 균열", x, y); }
    // 노드
    const vis = MAP.nodes.filter((n) => n.x - this.cam.x > -40 && n.x - this.cam.x < CW + 40 && n.y - this.cam.y > -40 && n.y - this.cam.y < CH + 40);
    for (const n of vis) {
      const un = nodeUnlocked(sv, n), hell = un && sv.endgame && (n.kind === "stage") && HELL_SET && HELL_SET.has(n.id), st = !un ? "locked" : hell ? "hell" : nodeCleared(sv, n) ? "cleared" : "open";
      if (n.kind === "elite" || n.kind === "treasure") { if (!un && sv.cleared[n.act - 1] < n.need - 2) continue; }
      this.nodeIcon(g, n, st, time);
      if (un && n.kind !== "town" && n.kind !== "rift" && n.kind !== "endless" && n.kind !== "void" && n.kind !== "trial") drawPx(g, n.level, n.x - this.cam.x + 14, n.y - this.cam.y - 4, "#ffffff", 2);
      if (this.hover === n || this.sel === n) { const x = n.x - this.cam.x, y = n.y - this.cam.y; g.strokeStyle = this.sel === n ? "#ff3a3a" : "#ffffff"; g.lineWidth = 3; g.strokeRect(x - 18, y - 18, 36 + (n.kind === "town" || n.kind === "rift" ? 0 : 26), 36); }
    }
    if (this.pulse) { const n = this.pulse, x = n.x - this.cam.x, y = n.y - this.cam.y, k = (time * 1.4) % 1; g.strokeStyle = `rgba(255,240,120,${1 - k})`; g.lineWidth = 4; g.beginPath(); g.arc(x, y, 14 + k * 30, 0, 7); g.stroke(); g.strokeStyle = "rgba(255,240,120,.9)"; g.lineWidth = 3; g.strokeRect(x - 20, y - 20, 40, 40); }
    // 레이블
    const lab = this.sel || this.hover; if (lab) { const x = lab.x - this.cam.x, y = lab.y - this.cam.y - 28; g.font = "bold 13px sans-serif"; const w = g.measureText(lab.name).width + 12; g.fillStyle = "rgba(20,14,30,.9)"; g.fillRect(x - w / 2, y - 14, w, 20); g.strokeStyle = "#8a7ab0"; g.lineWidth = 2; g.strokeRect(x - w / 2, y - 14, w, 20); g.fillStyle = "#fff"; g.fillText(lab.name, x, y + 1); }
    // 미니 방향 표시: 현재 진행 지역
  },
  focusAct(a) { const [cx, cy] = REGION[Math.min(a, 10) - 1]; this.cam.x = clamp(cx - CW / 2, 0, MAP_W - CW); this.cam.y = clamp(cy - CH / 2 + 40, 0, MAP_H - CH); },
  pick(mx, my) { let best = null, bd = 22; for (const n of MAP.nodes) { const d = Math.hypot(n.x - this.cam.x - mx, n.y - this.cam.y - my); if (d < bd) { bd = d; best = n; } } return best; },
};
function deco(g, act, x, y, r) {
  const k = r();
  if (act === 11) { for (let i = 0; i < 24; i++) { g.fillStyle = `rgba(190,120,255,${0.12 + r() * 0.1})`; g.fillRect(x + (r() - 0.5) * 90, y + (r() - 0.5) * 50, 3, 1); } return; }
  const tree = (c1, c2) => { g.fillStyle = c1; g.fillRect(x, y, 1, 3); g.fillStyle = c2; g.fillRect(x - 2, y - 4, 5, 5); g.fillRect(x - 1, y - 6, 3, 3); };
  const mount = (c1, c2) => { g.fillStyle = c1; g.beginPath(); g.moveTo(x - 6, y); g.lineTo(x, y - 9); g.lineTo(x + 6, y); g.fill(); g.fillStyle = c2; g.fillRect(x - 1, y - 8, 2, 2); };
  if (act === 1 || act === 2 || act === 5) tree("#3a2a1a", act === 5 ? "#3a5a48" : "#3a8a4a");
  else if (act === 3 || act === 8) mount("#4a4258", "#8a82a0");
  else if (act === 4) { g.fillStyle = "#c8a060"; g.fillRect(x, y, 6, 2); g.fillRect(x + 1, y - 2, 3, 2); }
  else if (act === 6) mount("#a8c0d8", "#fff");
  else if (act === 7 || act === 10) { mount("#4a1a14", "#ff7a30"); }
  else if (act === 9) { g.fillStyle = "#d8d4ec"; g.fillRect(x, y - 6, 4, 8); g.fillRect(x - 1, y - 8, 6, 2); }
}

// =========================================================
// 마을
// =========================================================
const TOWN_SPOTS = [
  { id: "skill",     name: "스킬 정비소", x: 105, y: 452, need: 1, desc: "스킬 장착 · 타겟 규칙 설정" },
  { id: "forge",     name: "대장간",     x: 235, y: 458, need: 1, desc: "강화 · 분해 · 옵션 재굴림 · 구슬" },
  { id: "board",     name: "퀘스트 게시판", x: 365, y: 466, need: 1, desc: "퀘스트 수락과 보상" },
  { id: "shop",      name: "상점 · 창고",  x: 495, y: 454, need: 1, desc: "장비 판매 · 정리" },
  { id: "skillshop", name: "스킬 상점",   x: 625, y: 462, need: 1, desc: "골드로 스킬 구매 (주기적으로 갱신)" },
  { id: "guild",     name: "길드",       x: 755, y: 452, need: 2, desc: "반복 의뢰(현상금)" },
  { id: "auction",   name: "경매소",     x: 885, y: 458, need: 1, desc: "다른 유저와 골드로 장비 거래" },
  { id: "trainer",   name: "훈련소",     x: 905, y: 335, need: 1, desc: "패시브 트리", back: true },
];
const TownView = {
  cv: null, g: null, hover: null, act: 1,
  draw(sv, time) {
    const g = this.g; g.imageSmoothingEnabled = false; g.drawImage(makeBackground(this.act), 0, 0);
    const A = ACTS[this.act - 1]; g.fillStyle = "rgba(0,0,0,.18)"; g.fillRect(0, 380, CW, 160);
    g.fillStyle = hexA("#d8c8a0", 0.16); g.fillRect(0, 466, CW, 12);
    const theme = ["#4a8a3a", "#2f6a4a", "#7a5a3a", "#c8884a", "#3a6a5a", "#6a8ab8", "#a8402a", "#6a4aa8", "#c8b86a", "#a82a3a"][this.act - 1];
    for (const s of TOWN_SPOTS.slice().sort((p, q) => p.y - q.y)) {
      const open = this.act >= s.need && !s.soon, hot = this.hover === s && open;
      g.save(); if (!open) g.globalAlpha = 0.45;
      drawBuilding(g, s.id, s.x, s.y, theme, hot);
      g.restore();
      if (hot) { g.strokeStyle = "#fff6b0"; g.lineWidth = 3; g.setLineDash([6, 4]); g.strokeRect(s.x - 55, s.y - (s.id === "skillshop" ? 250 : 150), 110, (s.id === "skillshop" ? 256 : 156)); g.setLineDash([]); }
      g.font = "bold 13px sans-serif"; g.textAlign = "center"; g.fillStyle = "#000"; g.fillText(s.name, s.x + 1, s.y + 22); g.fillStyle = open ? (hot ? "#fff6b0" : "#fff") : "#a09ab0"; g.fillText(s.name, s.x, s.y + 21);
      if (!open) { g.font = "11px sans-serif"; g.fillStyle = "#c8c0d8"; g.fillText(s.soon ? "준비 중" : `액트 ${s.need}에서 개방`, s.x, s.y + 36); }
    }
    // 수호 NPC 느낌: 전사
    const af = animFrame("warrior", "idle", time); drawSprite(g, getSheet("warrior", 0), af.row, af.frame, 70, 480, 3, false, 1);
    g.fillStyle = "#fff"; g.font = "bold 22px sans-serif"; g.textAlign = "left"; g.fillStyle = "#000"; g.fillText(`${A.name} 마을`, 22, 82); g.fillStyle = A.color; g.fillText(`${A.name} 마을`, 20, 80);
  },
  pick(mx, my) { for (const s of TOWN_SPOTS.slice().sort((p, q) => q.y - p.y)) if (mx > s.x - 55 && mx < s.x + 55 && my > s.y - (s.id === "skillshop" ? 250 : 150) && my < s.y + 40) return s; return null; },
};

// =========================================================
// 타이틀 배경
// =========================================================
function drawTitle(g, time) {
  g.imageSmoothingEnabled = false; g.drawImage(makeBackground(8), 0, 0); g.fillStyle = "rgba(10,6,24,.45)"; g.fillRect(0, 0, CW, CH);
  const r = seeded(5); for (let i = 0; i < 50; i++) { const x = r() * CW, y = r() * 220, tw = 0.5 + 0.5 * Math.sin(time * 2 + i); g.fillStyle = `rgba(255,255,255,${0.3 + tw * 0.5})`; g.fillRect(x, y, 3, 3); }
  const wf = animFrame("warrior", "idle", time); drawSprite(g, getSheet("warrior", 0), wf.row, wf.frame, 250, 470, 6, false, 1);
  const kinds = ["ghoul", "skel", "brute", "fiend"]; kinds.forEach((k, i) => { const af = animFrame(k, "idle", time + i * 0.3); drawSprite(g, getSheet(k, 0), af.row, af.frame, 570 + i * 82, 470 - (k === "fiend" ? 14 : 0), k === "brute" ? 3.5 : 3, true, 1); });
  drawBossSprite(g, 9, 800, 330, 3, { alpha: 0.5 });
}
