// =========================================================
// 확장 스킬 연출: 스킬마다 모양이 다른 이펙트 / 장판 / 지속형 표현
// =========================================================
function drawFx2(ctx, b, f, prog, a, col, time) {
  switch (f.kind) {
    case "claw": {   // 갈퀴: 세 줄기가 차례로 그어진다
      for (let i = 0; i < 3; i++) { const k = clamp(prog * 2.2 - i * 0.18, 0, 1); if (!k) continue; const x0 = f.x - 40 + i * 22, y0 = f.y - 36, x1 = x0 + 28 * k, y1 = y0 + 76 * k; ctx.strokeStyle = hexA(col, a); ctx.lineWidth = 9; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); ctx.strokeStyle = hexA("#ffffff", a); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); }
      break; }
    case "proj2": {   // 난사: 화살/독침/얼음 파편이 각각 날아간다
      const k = Math.min(1, prog * 1.2), x = f.x0 + (f.x1 - f.x0) * k, y = f.y0 + (f.y1 - f.y0) * k + Math.sin(k * 3.14) * (f.fan || 0), ang = Math.atan2(f.y1 - f.y0, f.x1 - f.x0);
      ctx.translate(x, y); ctx.rotate(ang);
      if (f.sprite === "arrow") { ctx.fillStyle = "#d8d0b8"; ctx.fillRect(-18, -1, 22, 3); ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(0, -4); ctx.lineTo(0, 4); ctx.fill(); ctx.fillStyle = "#c04a3a"; ctx.fillRect(-20, -3, 5, 6); }
      else if (f.sprite === "dart") { ctx.fillStyle = "#6ae04a"; ctx.fillRect(-10, -1.5, 14, 3); ctx.fillStyle = "#d8ffc0"; ctx.fillRect(2, -1, 5, 2); ctx.fillStyle = "rgba(106,224,74,.35)"; ctx.fillRect(-22, -2, 12, 4); }
      else { ctx.fillStyle = "#8ae0ff"; ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-4, -6); ctx.lineTo(-10, 0); ctx.lineTo(-4, 6); ctx.fill(); ctx.fillStyle = "#e8fbff"; ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(-2, -2); ctx.lineTo(-2, 2); ctx.fill(); }
      break; }
    case "skybolt": {   // 뇌우: 하늘에서 지그재그 번개가 내리친다
      const sd = seeded(Math.floor(f.x * 3 + f.y)); ctx.lineCap = "round"; let px = f.x + rnd(-30, 30), py = -10; const pts = [[px, py]];
      for (let i = 1; i < 8; i++) { pts.push([f.x + (sd() - 0.5) * 50 * (1 - i / 8), -10 + (f.y + 10) * (i / 8)]); } pts.push([f.x, f.y]);
      for (const [w, c] of [[14, hexA(col, a * 0.3)], [7, hexA(col, a * 0.8)], [3, hexA("#ffffff", a)]]) { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (const q of pts) ctx.lineTo(q[0], q[1]); ctx.stroke(); }
      ctx.fillStyle = hexA("#fff", a * 0.8); ctx.beginPath(); ctx.ellipse(f.x, f.y + 6, 36 * (1 - prog * 0.5), 10, 0, 0, 7); ctx.fill();
      break; }
  }
}
function drawZone(ctx, b, z, time) {
  const c = cellXY(b, z.lane, z.col), lh = laneH(b), y = c.y + lh * 0.34, fade = Math.min(1, z.t / 0.6, (z.life ? (z.life - z.t) / 0.25 + 0.3 : 1));
  ctx.save(); ctx.globalAlpha = Math.max(0.15, fade);
  if (z.fxk === "snow") {
    ctx.fillStyle = "rgba(150,210,255,.16)"; ctx.fillRect(c.x - 60, y - 70, 120, 74);
    const sd = seeded(z.col * 31 + z.lane * 7); for (let i = 0; i < 9; i++) { const sx = c.x - 56 + sd() * 112, sp = 40 + sd() * 40, yy = ((time * sp + sd() * 80) % 74); ctx.fillStyle = "#f4fcff"; ctx.fillRect(sx + Math.sin(time * 3 + i) * 5, y - 70 + yy, 3, 3); }
  } else if (z.fxk === "cloud") {
    for (let i = 0; i < 4; i++) { const ox = Math.sin(time * 1.2 + i * 1.7 + z.col) * 14, oy = Math.cos(time * 1.5 + i) * 6; const g = ctx.createRadialGradient(c.x - 36 + i * 24 + ox, y - 26 + oy, 4, c.x - 36 + i * 24 + ox, y - 26 + oy, 34); g.addColorStop(0, "rgba(120,220,60,.5)"); g.addColorStop(1, "rgba(60,140,30,0)"); ctx.fillStyle = g; ctx.fillRect(c.x - 80, y - 80, 160, 90); }
  } else {
    for (let i = 0; i < 5; i++) { const fx_ = c.x - 50 + i * 25, h = 20 + Math.sin(time * 9 + i * 1.7 + z.col) * 10; ctx.fillStyle = "rgba(255,90,20,.8)"; ctx.fillRect(fx_ - 7, y - h, 14, h); ctx.fillStyle = "rgba(255,200,60,.9)"; ctx.fillRect(fx_ - 4, y - h * 0.62, 8, h * 0.62); ctx.fillStyle = "#fff0b0"; ctx.fillRect(fx_ - 2, y - h * 0.3, 4, h * 0.3); }
  }
  ctx.restore();
}
function drawPersist(ctx, b, time) {
  const lh = laneH(b);
  for (const p of b.persist) {
    ctx.save();
    if (p.kind === "blades") {   // 칼날 회오리: 앞줄 레인마다 칼날이 빙글 돈다
      for (let l = 0; l < b.lanes; l++) { const c = cellXY(b, l, 1), cy = c.y + lh * 0.3, cx = LAY.x0 + 40; for (let i = 0; i < 4; i++) { const a = p.rot * 9 + i * 1.571; ctx.strokeStyle = i % 2 ? "#ffb0a0" : "#fff"; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(cx, cy - 24, 60, 24, 0, a, a + 0.9); ctx.stroke(); } ctx.fillStyle = "rgba(255,120,100,.18)"; ctx.beginPath(); ctx.ellipse(cx, cy - 24, 64, 26, 0, 0, 7); ctx.fill(); }
    } else if (p.kind === "orbs") {
      for (let i = 0; i < 3; i++) { const a = p.rot * 4.5 + i * 2.094, x = PLAYER_POS.x + 40 + Math.cos(a) * 62, y = PLAYER_POS.y - 60 + Math.sin(a) * 30; ctx.fillStyle = "rgba(190,140,255,.35)"; ctx.beginPath(); ctx.arc(x, y, 15, 0, 7); ctx.fill(); ctx.fillStyle = "#c58bff"; ctx.beginPath(); ctx.arc(x, y, 8, 0, 7); ctx.fill(); ctx.fillStyle = "#fff"; ctx.fillRect(x - 3, y - 3, 3, 3); }
    } else if (p.kind === "spirit") {
      const t = pickPrimaryLoose(b), ly = t ? cellXY(b, t.lane, 1).y : PLAYER_POS.y - 40, x = PLAYER_POS.x + 100 + Math.sin(time * 3) * 8, y = ly - 20 + Math.sin(time * 4) * 6;
      ctx.globalAlpha = 0.85; const g = ctx.createRadialGradient(x, y, 4, x, y, 40); g.addColorStop(0, "rgba(140,255,200,.7)"); g.addColorStop(1, "rgba(140,255,200,0)"); ctx.fillStyle = g; ctx.fillRect(x - 42, y - 42, 84, 84);
      ctx.fillStyle = "#8affc8"; ctx.beginPath(); ctx.arc(x, y - 6, 15, Math.PI, 0); ctx.lineTo(x + 15, y + 14); for (let i = 0; i < 4; i++) ctx.lineTo(x + 15 - (i + 0.5) * 7.5, y + (i % 2 ? 14 : 22)); ctx.lineTo(x - 15, y + 14); ctx.fill(); ctx.fillStyle = "#103a2a"; ctx.fillRect(x - 7, y - 8, 4, 6); ctx.fillRect(x + 3, y - 8, 4, 6);
    } else if (p.kind === "mine") {
      const c = cellXY(b, p.lane, p.col), x = c.x, y = c.y + lh * 0.32; ctx.fillStyle = "rgba(0,0,0,.35)"; ctx.beginPath(); ctx.ellipse(x, y, 20, 7, 0, 0, 7); ctx.fill(); ctx.fillStyle = "#6a5a3a"; ctx.beginPath(); ctx.ellipse(x, y - 4, 18, 8, 0, 0, 7); ctx.fill(); ctx.fillStyle = p.arm > 0 ? "#8a8a8a" : (Math.sin(time * 16) > 0 ? "#ff3a2a" : "#7a1a14"); ctx.fillRect(x - 4, y - 14, 8, 8);
    } else if (p.kind === "hole") {
      const c = cellXY(b, p.lane, p.col), x = c.x, y = c.y + lh * 0.22; for (let i = 0; i < 5; i++) { const r0 = 18 + i * 14; ctx.strokeStyle = `rgba(${150 + i * 18},80,255,${0.8 - i * 0.14})`; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(x, y, r0 * 1.5, r0 * 0.6, 0, p.rot * (5 - i) + i, p.rot * (5 - i) + i + 4); ctx.stroke(); } ctx.fillStyle = "#0a0414"; ctx.beginPath(); ctx.ellipse(x, y, 16, 8, 0, 0, 7); ctx.fill();
    } else if (p.kind === "rain") {
      ctx.fillStyle = "rgba(40,44,70,.8)"; for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.arc(80 + i * 130 + Math.sin(time + i) * 8, 40 + (i % 2) * 12, 38, 0, 7); ctx.fill(); }
    }
    ctx.restore();
  }
}
const pickPrimaryLoose = (b) => b.enemies.find((e) => !e.dead && e.col === Math.min(...b.enemies.filter((x) => !x.dead).map((x) => x.col)));
